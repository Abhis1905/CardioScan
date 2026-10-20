import logging
import os
from typing import List, Optional, Union
from pydantic_settings import BaseSettings, SettingsConfigDict

logger = logging.getLogger(__name__)


class Settings(BaseSettings):
    PROJECT_NAME: str = "CardioScan API"
    VERSION: str = "2.0.0"
    ENVIRONMENT: str = "development"
    DEBUG: bool = False

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT.lower().strip() == "production"

    # Database
    DATABASE_URL: str = "sqlite:///./cardioscan.db"

    @property
    def sync_database_url(self) -> str:
        url = self.DATABASE_URL
        if url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql://", 1)
        elif url.startswith("postgresql://"):
            # Ensure using psycopg2
            if not url.startswith("postgresql+psycopg2://"):
                url = url.replace("postgresql://", "postgresql+psycopg2://", 1)
        return url

    # Security & Auth
    JWT_SECRET: str = "cardioscan-dev-secret-key-change-in-production-min32chars"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours

    # Token Lifespans
    VERIFY_TOKEN_TTL_HOURS: int = 24
    RESET_TOKEN_TTL_MINUTES: int = 60
    RESEND_COOLDOWN_MINUTES: int = 2

    # CORS
    ALLOWED_ORIGINS: str = (
        "http://localhost:3000,http://127.0.0.1:3000,https://cardio-scan-lac.vercel.app"
    )

    @property
    def cors_origins(self) -> List[str]:
        if not self.ALLOWED_ORIGINS:
            return ["*"]
        origins = [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",") if origin.strip()]
        if not self.is_production:
            for port in [3000, 3001, 3002, 3003, 3004, 3005, 5173]:
                for host in ["localhost", "127.0.0.1"]:
                    origin = f"http://{host}:{port}"
                    if origin not in origins:
                        origins.append(origin)
        return origins

    # Email
    EMAIL_PROVIDER: str = "console"  # 'resend', 'smtp', 'console', 'mock', 'disabled'
    RESEND_API_KEY: Optional[str] = None
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 465
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_USE_SSL: bool = True
    SMTP_USE_TLS: bool = False
    EMAIL_FROM: str = "CardioScan <onboarding@resend.dev>"
    FRONTEND_URL: str = "http://localhost:3000"

    # External APIs
    GROQ_API_KEY: Optional[str] = None
    GROQ_MODEL: str = "openai/gpt-oss-120b"
    GOOGLE_CLIENT_ID: Optional[str] = None

    # Firebase Authentication
    FIREBASE_PROJECT_ID: str = "cardioscan-app"
    FIREBASE_SERVICE_ACCOUNT_PATH: Optional[str] = None
    FIREBASE_SERVICE_ACCOUNT_JSON: Optional[str] = None

    # Cloudflare Turnstile Bot Protection
    TURNSTILE_SECRET_KEY: Optional[str] = None
    TURNSTILE_VERIFY_URL: str = "https://challenges.cloudflare.com/turnstile/v0/siteverify"
    TURNSTILE_TIMEOUT_SECONDS: float = 8.0

    # Admin Management
    ADMIN_EMAIL: Optional[str] = None

    # Reverse Proxy & Client IP Resolution
    # On Render, 1 trusted reverse proxy hop sits in front of the application.
    TRUSTED_PROXY_HOPS: int = 1

    # Rate Limiting & Abuse Prevention
    RATE_LIMIT_ENABLED: bool = True
    RATE_LIMIT_LOGIN: int = 10          # Max attempts per window
    RATE_LIMIT_LOGIN_WINDOW: int = 60   # Seconds
    RATE_LIMIT_REGISTER: int = 5
    RATE_LIMIT_REGISTER_WINDOW: int = 60
    RATE_LIMIT_PREDICT: int = 30
    RATE_LIMIT_PREDICT_WINDOW: int = 60
    RATE_LIMIT_WHATIF: int = 60
    RATE_LIMIT_WHATIF_WINDOW: int = 60
    RATE_LIMIT_CHAT: int = 10
    RATE_LIMIT_CHAT_WINDOW: int = 60
    RATE_LIMIT_FORGOT_PASSWORD: int = 5
    RATE_LIMIT_FORGOT_PASSWORD_WINDOW: int = 60
    RATE_LIMIT_RESET_PASSWORD: int = 5
    RATE_LIMIT_RESET_PASSWORD_WINDOW: int = 60
    RATE_LIMIT_GOOGLE: int = 10
    RATE_LIMIT_GOOGLE_WINDOW: int = 60
    RATE_LIMIT_TURNSTILE: int = 30
    RATE_LIMIT_TURNSTILE_WINDOW: int = 60

    # ML Training Data Path
    HEART_CSV_PATH: str = os.path.join(
        os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
        "heart.csv",
    )

    def validate_production_safety(self) -> None:
        """Enforce production configuration safety and fail-fast if requirements are not met."""
        if not self.is_production:
            return

        errors: List[str] = []

        # 1. Database URL safety
        db_url = (self.DATABASE_URL or "").strip()
        if not db_url:
            errors.append("DATABASE_URL is missing. Production requires a PostgreSQL connection string.")
        elif db_url.startswith("sqlite") or "cardioscan.db" in db_url:
            errors.append(
                "DATABASE_URL is using SQLite. Production requires a PostgreSQL connection string (postgresql://...)."
            )
        elif not (
            db_url.startswith("postgresql://")
            or db_url.startswith("postgres://")
            or db_url.startswith("postgresql+psycopg2://")
        ):
            errors.append(
                "DATABASE_URL format is unsupported for production. Expected a PostgreSQL connection string."
            )

        # 2. JWT Secret safety
        jwt_sec = (self.JWT_SECRET or "").strip()
        dev_default_secret = "cardioscan-dev-secret-key-change-in-production-min32chars"
        if not jwt_sec:
            errors.append("JWT_SECRET is missing. Production requires a secure cryptographic secret.")
        elif jwt_sec == dev_default_secret:
            errors.append(
                "JWT_SECRET is using the insecure default development secret. A unique random secret must be configured."
            )
        elif len(jwt_sec) < 32:
            errors.append(
                f"JWT_SECRET is too short ({len(jwt_sec)} characters). Minimum length for production is 32 characters."
            )
        elif jwt_sec.lower() in ("secret", "changeme", "password", "supersecret", "admin"):
            errors.append("JWT_SECRET is using a trivial, known insecure value.")

        # 3. Email safety
        provider = (self.EMAIL_PROVIDER or "").lower().strip()
        if provider in ("mock", "console"):
            errors.append(
                f"EMAIL_PROVIDER='{provider}' is disallowed in production. Configure a verified 'resend' or 'smtp' provider, or set 'disabled'."
            )
        elif provider == "resend" and not (self.RESEND_API_KEY or "").strip():
            errors.append("RESEND_API_KEY is missing while EMAIL_PROVIDER is set to 'resend'.")

        # 4. Admin safety notice
        if not (self.ADMIN_EMAIL or "").strip():
            logger.warning(
                "ADMIN_EMAIL is not configured. Administrative routes will fail closed (HTTP 403) until an admin email is configured in environment."
            )

        if errors:
            error_msg = "Production configuration validation failed:\n - " + "\n - ".join(errors)
            logger.critical(error_msg)
            raise RuntimeError(error_msg)

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
