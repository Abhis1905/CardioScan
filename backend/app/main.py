import asyncio
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api import admin, analytics, auth, chat, history, predictions, profile, reports
from app.core.config import settings
from app.db.base import Base
from app.db.session import SessionLocal, engine
from app.services.firebase_auth import firebase_auth_service
from app.services.ml import ml_service

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
    except Exception as e:
        logger.error("ML model initialization warning: %s", str(e))

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

    cleanup_task.cancel()
    try:
        await cleanup_task
    except asyncio.CancelledError:
        pass

    logger.info("Shutting down CardioScan FastAPI backend.")


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS Middleware
origins = settings.cors_origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins if origins else ["*"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)


@app.exception_handler(RequestValidationError)
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


@app.exception_handler(Exception)
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
app.include_router(analytics.router)
app.include_router(auth.router)
app.include_router(predictions.router)
app.include_router(history.router)
app.include_router(admin.router)
app.include_router(chat.router)
app.include_router(profile.router)
app.include_router(reports.router)


if __name__ == "__main__":
    import uvicorn
    import os

    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("app.main:app", host="0.0.0.0", port=port, reload=False)
