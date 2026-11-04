import logging
import math
import os
import re
from typing import Any, List, Optional, Union
from urllib.parse import urlparse
from pydantic import field_validator, model_validator, ValidationInfo
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
            url = url.replace("postgres://", "postgresql+psycopg2://", 1)
        elif url.startswith("postgresql://") and not url.startswith("postgresql+psycopg2://"):
            url = url.replace("postgresql://", "postgresql+psycopg2://", 1)
        return url

    # Security & Auth
    JWT_SECRET: str = "cardioscan-dev-secret-key-change-in-production-min32chars"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 120  # 2 hours (hardened from 24h)

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
    RATE_LIMIT_REPORTS: int = 30
    RATE_LIMIT_REPORTS_WINDOW: int = 60
    RATE_LIMIT_LOGOUT: int = 20
    RATE_LIMIT_LOGOUT_WINDOW: int = 60
    RATE_LIMIT_CHANGE_PASSWORD: int = 5
    RATE_LIMIT_CHANGE_PASSWORD_WINDOW: int = 60

    # Distributed Rate Limiting via Redis (SEC-05)
    REDIS_URL: Optional[str] = None
    REDIS_MAX_CONNECTIONS: int = 50
    REDIS_SOCKET_TIMEOUT: float = 1.0
    REDIS_CONNECT_TIMEOUT: float = 1.0

    @field_validator(
        "REDIS_MAX_CONNECTIONS",
        "REDIS_SOCKET_TIMEOUT",
        "REDIS_CONNECT_TIMEOUT",
        mode="before",
    )
    @classmethod
    def _reject_redis_booleans(cls, v: Any, info: ValidationInfo) -> Any:
        if isinstance(v, bool):
            raise ValueError(f"{info.field_name} must not be a boolean")
        return v

    # ML Training Data Path
    HEART_CSV_PATH: str = os.path.join(
        os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
        "heart.csv",
    )

    # ML Model Artifact Integrity (SEC-03 / SEC-03.1)
    # Trusted SHA-256 digest of models_bundle.joblib.
    # In development, falls back to DEV_DEFAULT_MODEL_BUNDLE_SHA256 if not explicitly provided.
    # In production, must be explicitly supplied in the deployment environment.
    DEV_DEFAULT_MODEL_BUNDLE_SHA256: str = (
        "feb976cd9f101e12ef869d08c52d6d456ee666314866ae9a062fedccf688ce56"
    )
    MODEL_BUNDLE_SHA256: Optional[str] = None

    @model_validator(mode="after")
    def _populate_dev_model_sha(self) -> "Settings":
        """
        Populate default digest in development/test if not explicitly configured.
        In production, never silently substitute a development default.
        """
        if self.ENVIRONMENT.lower().strip() != "production":
            if self.MODEL_BUNDLE_SHA256 is None:
                self.MODEL_BUNDLE_SHA256 = self.DEV_DEFAULT_MODEL_BUNDLE_SHA256
        return self

    def validate_production_safety(self) -> None:
        """Enforce production configuration safety and fail-fast if requirements are not met."""
        if not self.is_production:
            return

        errors: List[str] = []

        # 1. Database URL & TLS safety
        db_url = (self.DATABASE_URL or "").strip()
        if not db_url:
            errors.append("DATABASE_URL is missing. Production requires a PostgreSQL connection string.")
        elif db_url.startswith("sqlite") or "cardioscan.db" in db_url:
            errors.append(
                "DATABASE_URL is using SQLite. Production requires a PostgreSQL connection string (postgresql://...)."
            )
        else:
            try:
                from sqlalchemy.engine import make_url

                # Normalize postgres:// to postgresql:// so make_url parses standard SQLAlchemy dialects
                parse_target = db_url
                if parse_target.startswith("postgres://"):
                    parse_target = parse_target.replace("postgres://", "postgresql://", 1)

                parsed = make_url(parse_target)
                driver = parsed.drivername.lower()
                if not (driver == "postgresql" or driver.startswith("postgresql+")):
                    errors.append(
                        f"DATABASE_URL dialect '{driver}' is unsupported for production. Expected a PostgreSQL connection string."
                    )
                else:
                    # Enforce strict secure TLS configuration (verify-full required in production)
                    ssl_mode = parsed.query.get("sslmode")
                    if isinstance(ssl_mode, tuple):
                        all_modes = [m.lower().strip() for m in ssl_mode if m]
                        if not all(m == "verify-full" for m in all_modes):
                            errors.append(
                                "Production DATABASE_URL contains conflicting or insufficient sslmode parameters. Full certificate and hostname verification ('sslmode=verify-full') is required."
                            )
                        ssl_mode_clean = all_modes[-1] if all_modes else ""
                    else:
                        ssl_mode_clean = (ssl_mode or "").lower().strip()

                    allowed_ssl_modes = {"verify-full"}
                    insufficient_or_insecure_modes = {"disable", "allow", "prefer", "require", "verify-ca"}

                    if not ssl_mode_clean:
                        errors.append(
                            "Production DATABASE_URL must explicitly enforce full TLS certificate and hostname verification by setting 'sslmode=verify-full'."
                        )
                    elif ssl_mode_clean in insufficient_or_insecure_modes:
                        errors.append(
                            f"PostgreSQL sslmode='{ssl_mode_clean}' is insufficient or insecure in production. Full certificate and hostname verification ('sslmode=verify-full') is required."
                        )
                    elif ssl_mode_clean not in allowed_ssl_modes:
                        errors.append(
                            f"Unrecognized PostgreSQL sslmode='{ssl_mode_clean}' in production DATABASE_URL. Production requires 'sslmode=verify-full'."
                        )
            except Exception:
                # Do not leak raw credentials in validation error
                errors.append(
                    "DATABASE_URL is malformed and could not be parsed as a valid database connection string."
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

        # 5. ML Model Artifact Integrity (SEC-03 / SEC-03.1)
        model_sha = (self.MODEL_BUNDLE_SHA256 or "").strip().lower()
        if not model_sha:
            errors.append(
                "MODEL_BUNDLE_SHA256 is missing. Production requires an explicitly configured "
                "64-character hex SHA-256 digest in the deployment environment."
            )
        elif not re.match(r"^[0-9a-f]{64}$", model_sha):
            errors.append(
                f"MODEL_BUNDLE_SHA256 is malformed ({len(model_sha)} chars, invalid hex). "
                "Expected 64-character lowercase hex string."
            )

        # 6. Distributed Rate Limiting (SEC-05 / SEC-05.1 / F-02)
        if self.RATE_LIMIT_ENABLED:
            redis_url = (self.REDIS_URL or "").strip()
            if not redis_url:
                errors.append(
                    "REDIS_URL is missing. Production requires an explicitly configured Redis connection URL "
                    "(e.g. redis:// or rediss://) when RATE_LIMIT_ENABLED=True to enforce distributed rate limiting."
                )
            else:
                try:
                    parsed_redis = urlparse(redis_url)
                    scheme = (parsed_redis.scheme or "").lower()
                    if scheme in ("redis", "rediss"):
                        if any(c.isspace() for c in (parsed_redis.netloc or "")):
                            errors.append(
                                "REDIS_URL is invalid. Redis network address must not contain whitespace."
                            )
                        elif not parsed_redis.hostname:
                            errors.append(
                                "REDIS_URL is invalid. Network Redis connection URL (redis:// or rediss://) must specify a valid host."
                            )
                        elif any(c.isspace() for c in parsed_redis.hostname):
                            errors.append(
                                "REDIS_URL is invalid. Redis hostname must not contain whitespace."
                            )

                        try:
                            port = parsed_redis.port
                            if port is not None and not (1 <= port <= 65535):
                                errors.append(
                                    "REDIS_URL is invalid. Redis port must be an integer between 1 and 65535."
                                )
                        except ValueError:
                            errors.append(
                                "REDIS_URL is invalid. Redis port must be a valid integer between 1 and 65535."
                            )

                    elif scheme == "unix":
                        if not parsed_redis.path or not parsed_redis.path.strip():
                            errors.append(
                                "REDIS_URL is invalid. Unix domain socket Redis connection URL (unix://) must specify a socket path."
                            )
                        elif any(c.isspace() for c in parsed_redis.path):
                            errors.append(
                                "REDIS_URL is invalid. Unix domain socket path must not contain whitespace."
                            )
                    else:
                        errors.append(
                            "REDIS_URL is invalid. Production requires a Redis connection URL starting with redis://, rediss://, or unix://."
                        )
                except Exception:
                    errors.append(
                        "REDIS_URL is malformed. Production requires a valid Redis connection URL."
                    )

        if (
            isinstance(self.REDIS_MAX_CONNECTIONS, bool)
            or not isinstance(self.REDIS_MAX_CONNECTIONS, int)
            or self.REDIS_MAX_CONNECTIONS <= 0
        ):
            errors.append(
                f"REDIS_MAX_CONNECTIONS must be a positive integer greater than zero (got {self.REDIS_MAX_CONNECTIONS})."
            )
        if (
            isinstance(self.REDIS_SOCKET_TIMEOUT, bool)
            or not isinstance(self.REDIS_SOCKET_TIMEOUT, (int, float))
            or not math.isfinite(self.REDIS_SOCKET_TIMEOUT)
            or self.REDIS_SOCKET_TIMEOUT <= 0
        ):
            errors.append(
                f"REDIS_SOCKET_TIMEOUT must be a positive finite float greater than zero (got {self.REDIS_SOCKET_TIMEOUT})."
            )
        if (
            isinstance(self.REDIS_CONNECT_TIMEOUT, bool)
            or not isinstance(self.REDIS_CONNECT_TIMEOUT, (int, float))
            or not math.isfinite(self.REDIS_CONNECT_TIMEOUT)
            or self.REDIS_CONNECT_TIMEOUT <= 0
        ):
            errors.append(
                f"REDIS_CONNECT_TIMEOUT must be a positive finite float greater than zero (got {self.REDIS_CONNECT_TIMEOUT})."
            )

        # 7. Cloudflare Turnstile Bot Protection (F-01)
        turnstile_key = (self.TURNSTILE_SECRET_KEY or "").strip()
        cloudflare_test_secrets = {
            "1x0000000000000000000000000000000aa",
            "2x0000000000000000000000000000000aa",
            "3x0000000000000000000000000000000aa",
        }
        if not turnstile_key:
            errors.append(
                "TURNSTILE_SECRET_KEY is missing. Production requires an explicitly configured "
                "Cloudflare Turnstile secret key."
            )
        elif turnstile_key.lower() in cloudflare_test_secrets:
            errors.append(
                "TURNSTILE_SECRET_KEY is configured with a Cloudflare published testing secret in production. "
                "A genuine production secret key is required."
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
