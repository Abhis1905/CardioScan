import asyncio
import logging
from contextlib import asynccontextmanager
from typing import Optional
from fastapi import FastAPI, Request, Response, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from app.api import admin, analytics, auth, chat, history, predictions, profile, reports
from app.core.config import settings
from app.core.rate_limiter import rate_limiter_storage
from app.db.base import Base
from app.db.session import SessionLocal, engine
from app.services.firebase_auth import firebase_auth_service
from app.services.ml import ml_service, ModelIntegrityError

# Configure structured logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("cardioscan")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle events for startup and shutdown."""
    logger.info("Starting up CardioScan FastAPI v%s (environment: %s)", settings.VERSION, settings.ENVIRONMENT)

    # Fail fast if production requirements are not satisfied
    settings.validate_production_safety()

    cleanup_task: Optional[asyncio.Task] = None
    redis_initialized = False

    # Eagerly verify distributed rate limiter connectivity (SEC-05 / SEC-05.1 / F-02)
    try:
        rate_limiter_storage.startup_check()
        redis_initialized = True
        if settings.is_production and settings.RATE_LIMIT_ENABLED:
            logger.info("Production Redis rate limiter verified successfully via PING.")
    except Exception as rl_startup_err:
        logger.critical("FATAL: Distributed rate limiter startup verification failed: %s", rl_startup_err)
        try:
            rate_limiter_storage.close()
        except Exception:
            pass
        raise

    try:
        # Schema management: avoid redundant or unsafe auto-creation in production
        if settings.is_production:
            logger.info("Production mode: database schema is managed via Alembic migrations.")
        else:
            try:
                Base.metadata.create_all(bind=engine)
                logger.info("Database schema initialized successfully.")
            except Exception as e:
                logger.warning("Database schema initialization note: %s", str(e))

        # Load or train ML models
        try:
            logger.info("Initializing ML models...")
            ml_service.load_or_train()
            logger.info("ML models ready.")
        except ModelIntegrityError as err:
            logger.critical("FATAL: ML model integrity check failed during startup: %s", err)
            raise
        except Exception as e:
            logger.error("ML model initialization warning: %s", str(e))
            if settings.is_production:
                raise

        # Process pending Firebase cleanups surviving from previous process execution
        try:
            with SessionLocal() as db:
                resolved, remaining = firebase_auth_service.process_pending_cleanups(db)
                if resolved > 0 or remaining > 0:
                    logger.info(
                        "Startup pending Firebase cleanups processed: %d resolved, %d remaining",
                        resolved,
                        remaining,
                    )
        except Exception as cleanup_err:
            logger.warning("Startup pending Firebase cleanup check notice: %s", str(cleanup_err))

        # Background worker for periodic cleanup retry
        async def periodic_cleanup_worker():
            while True:
                try:
                    await asyncio.sleep(1800)  # Check every 30 minutes
                    with SessionLocal() as db:
                        firebase_auth_service.process_pending_cleanups(db)
                except asyncio.CancelledError:
                    break
                except Exception as worker_err:
                    logger.warning("Periodic Firebase cleanup worker error: %s", str(worker_err))

        cleanup_task = asyncio.create_task(periodic_cleanup_worker())

        yield

    finally:
        # 1. Cancel and await background task if running
        if cleanup_task is not None and not cleanup_task.done():
            cleanup_task.cancel()
            try:
                await cleanup_task
            except asyncio.CancelledError:
                pass
            except Exception as task_err:
                logger.warning("Error awaiting cleanup worker during shutdown [%s]", type(task_err).__name__)

        # 2. Independent chat HTTP client cleanup
        try:
            if hasattr(chat, "close_chat_client"):
                await chat.close_chat_client()
        except Exception as chat_close_err:
            logger.warning("Error closing chat HTTP client [%s]", type(chat_close_err).__name__)

        # 3. Independent Redis storage cleanup
        if redis_initialized:
            try:
                rate_limiter_storage.close()
                redis_initialized = False
            except Exception as rl_err:
                logger.warning("Error closing rate limiter storage [%s]", type(rl_err).__name__)

        logger.info("Shutting down CardioScan FastAPI backend.")


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Injects defensible HTTP security headers across all API responses:
    - X-Content-Type-Options: nosniff
    - X-Frame-Options: DENY
    - Referrer-Policy: strict-origin-when-cross-origin
    - Content-Security-Policy (API & frame restriction)
    - Strict-Transport-Security (HSTS) in production over HTTPS
    """
    async def dispatch(self, request: Request, call_next):
        response: Response = await call_next(request)

        # 1. MIME-type sniffing defense
        response.headers["X-Content-Type-Options"] = "nosniff"

        # 2. Clickjacking defense for API endpoints
        response.headers["X-Frame-Options"] = "DENY"

        # 3. Referrer policy
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"

        # 4. Content-Security-Policy (API and frame restriction)
        if settings.is_production:
            response.headers["Content-Security-Policy"] = "default-src 'none'; frame-ancestors 'none'"
        else:
            # In development, permit Swagger UI/ReDoc CDN assets while restricting frames
            response.headers["Content-Security-Policy"] = (
                "default-src 'self'; "
                "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; "
                "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; "
                "img-src 'self' data: https://fastapi.tiangolo.com; "
                "frame-ancestors 'none'"
            )

        # 5. Strict-Transport-Security (HSTS)
        # Enforced ONLY in production when accessed over HTTPS or behind trusted proxy with HTTPS
        if settings.is_production:
            forwarded_proto = request.headers.get("x-forwarded-proto", "").lower().strip()
            is_https = request.url.scheme == "https" or forwarded_proto == "https"
            if is_https:
                response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"

        return response


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""
    # Public API documentation is disabled in production environments
    docs_url = None if settings.is_production else "/docs"
    redoc_url = None if settings.is_production else "/redoc"
    openapi_url = None if settings.is_production else "/openapi.json"

    application = FastAPI(
        title=settings.PROJECT_NAME,
        version=settings.VERSION,
        lifespan=lifespan,
        docs_url=docs_url,
        redoc_url=redoc_url,
        openapi_url=openapi_url,
    )

    # CORS Middleware
    origins = settings.cors_origins
    application.add_middleware(
        CORSMiddleware,
        allow_origins=origins if origins else ["*"],
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allow_headers=["*"],
    )
    # Security Headers Middleware wraps around CORS and application routes
    application.add_middleware(SecurityHeadersMiddleware)

    @application.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
        """Format Pydantic validation errors matching frontend expectations."""
        errors = []
        for error in exc.errors():
            loc = " -> ".join(str(l) for l in error.get("loc", []))
            msg = error.get("msg", "Invalid field")
            errors.append(f"{loc}: {msg}")
        error_summary = "; ".join(errors)
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={"detail": error_summary, "error": error_summary},
        )

    @application.exception_handler(Exception)
    async def global_exception_handler(request: Request, exc: Exception):
        """Handle unhandled server exceptions, ensuring CORS headers are preserved."""
        logger.error("Unhandled server exception on %s: %s", request.url.path, exc, exc_info=True)
        origin = request.headers.get("origin")
        headers = {}
        if origin and (origin in settings.cors_origins or "*" in settings.cors_origins):
            headers["Access-Control-Allow-Origin"] = origin
            headers["Access-Control-Allow-Credentials"] = "true"
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"error": "An internal server error occurred. Please try again later."},
            headers=headers,
        )

    # Register all routers
    application.include_router(analytics.router)
    application.include_router(auth.router)
    application.include_router(predictions.router)
    application.include_router(history.router)
    application.include_router(admin.router)
    application.include_router(chat.router)
    application.include_router(profile.router)
    application.include_router(reports.router)

    return application


app = create_app()


if __name__ == "__main__":
    import uvicorn
    import os

    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("app.main:app", host="0.0.0.0", port=port, reload=False)
