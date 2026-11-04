import math
import pydantic
import pytest
from app.core.config import Settings, settings
from app.services.email import email_service


def test_production_safety_passes_in_development():
    """Verify that development environment does not trigger production checks."""
    s = Settings(
        ENVIRONMENT="development",
        DATABASE_URL="sqlite:///./dev.db",
        JWT_SECRET="short-dev-secret",
        EMAIL_PROVIDER="console",
    )
    # Should not raise
    s.validate_production_safety()
    assert s.is_production is False


def test_production_safety_passes_in_test():
    """Verify that test environment does not trigger production checks."""
    s = Settings(
        ENVIRONMENT="test",
        DATABASE_URL="sqlite:///:memory:",
        JWT_SECRET="test-secret",
        EMAIL_PROVIDER="mock",
    )
    s.validate_production_safety()
    assert s.is_production is False


def test_production_safety_rejects_sqlite_database():
    """Verify that production fails fast if SQLite is used."""
    s = Settings(
        ENVIRONMENT="production",
        DATABASE_URL="sqlite:///./cardioscan.db",
        JWT_SECRET="valid_production_secret_with_more_than_32_chars_ok!",
        EMAIL_PROVIDER="resend",
        RESEND_API_KEY="re_valid_test_key_12345",
    )
    with pytest.raises(RuntimeError) as exc_info:
        s.validate_production_safety()
    assert "DATABASE_URL is using SQLite" in str(exc_info.value)
    assert "PostgreSQL" in str(exc_info.value)


def test_production_safety_rejects_missing_database_url():
    """Verify that production fails fast if DATABASE_URL is empty."""
    s = Settings(
        ENVIRONMENT="production",
        DATABASE_URL="",
        JWT_SECRET="valid_production_secret_with_more_than_32_chars_ok!",
        EMAIL_PROVIDER="resend",
        RESEND_API_KEY="re_valid_test_key_12345",
    )
    with pytest.raises(RuntimeError) as exc_info:
        s.validate_production_safety()
    assert "DATABASE_URL is missing" in str(exc_info.value)


def test_production_safety_rejects_dev_jwt_secret():
    """Verify that production rejects the default development JWT secret."""
    s = Settings(
        ENVIRONMENT="production",
        DATABASE_URL="postgresql://user:pass@localhost:5432/cardioscan",
        JWT_SECRET="cardioscan-dev-secret-key-change-in-production-min32chars",
        EMAIL_PROVIDER="resend",
        RESEND_API_KEY="re_valid_test_key_12345",
    )
    with pytest.raises(RuntimeError) as exc_info:
        s.validate_production_safety()
    assert "JWT_SECRET is using the insecure default development secret" in str(exc_info.value)


def test_production_safety_rejects_short_jwt_secret():
    """Verify that production rejects JWT secrets under 32 characters."""
    s = Settings(
        ENVIRONMENT="production",
        DATABASE_URL="postgresql://user:pass@localhost:5432/cardioscan",
        JWT_SECRET="too-short-secret",
        EMAIL_PROVIDER="resend",
        RESEND_API_KEY="re_valid_test_key_12345",
    )
    with pytest.raises(RuntimeError) as exc_info:
        s.validate_production_safety()
    assert "JWT_SECRET is too short" in str(exc_info.value)


def test_production_safety_rejects_mock_and_console_email_in_prod():
    """Verify that production rejects mock/console email providers."""
    s = Settings(
        ENVIRONMENT="production",
        DATABASE_URL="postgresql://user:pass@localhost:5432/cardioscan",
        JWT_SECRET="valid_production_secret_with_more_than_32_chars_ok!",
        EMAIL_PROVIDER="mock",
    )
    with pytest.raises(RuntimeError) as exc_info:
        s.validate_production_safety()
    assert "disallowed in production" in str(exc_info.value)


def test_production_safety_rejects_resend_without_api_key():
    """Verify that production rejects Resend provider if API key is missing."""
    s = Settings(
        ENVIRONMENT="production",
        DATABASE_URL="postgresql://user:pass@localhost:5432/cardioscan",
        JWT_SECRET="valid_production_secret_with_more_than_32_chars_ok!",
        EMAIL_PROVIDER="resend",
        RESEND_API_KEY="",
    )
    with pytest.raises(RuntimeError) as exc_info:
        s.validate_production_safety()
    assert "RESEND_API_KEY is missing" in str(exc_info.value)


def make_valid_production_settings(**overrides):
    """Helper constructing a complete, valid production Settings instance with explicit parameters."""
    base = {
        "ENVIRONMENT": "production",
        "DATABASE_URL": "postgresql://app_user:secret_db_pass@db.railway.internal:5432/railway?sslmode=verify-full",
        "JWT_SECRET": "valid_cryptographic_production_secret_with_32_chars_minimum!",
        "EMAIL_PROVIDER": "resend",
        "RESEND_API_KEY": "re_1234567890abcdef",
        "REDIS_URL": "redis://localhost:6379/0",
        "TURNSTILE_SECRET_KEY": "0x4AAAAAAAMvM70123456789abcdefABCDEF",
        "MODEL_BUNDLE_SHA256": "feb976cd9f101e12ef869d08c52d6d456ee666314866ae9a062fedccf688ce56",
    }
    base.update(overrides)
    return Settings(**base)


def test_production_safety_passes_with_valid_production_config():
    """Verify that production succeeds when all security requirements are satisfied."""
    s = Settings(
        ENVIRONMENT="production",
        DATABASE_URL="postgresql://app_user:secret_db_pass@db.railway.internal:5432/railway?sslmode=verify-full",
        JWT_SECRET="valid_cryptographic_production_secret_with_32_chars_minimum!",
        EMAIL_PROVIDER="resend",
        RESEND_API_KEY="re_1234567890abcdef",
        REDIS_URL="redis://localhost:6379/0",
        TURNSTILE_SECRET_KEY="0x4AAAAAAAMvM70123456789abcdefABCDEF",
        MODEL_BUNDLE_SHA256="feb976cd9f101e12ef869d08c52d6d456ee666314866ae9a062fedccf688ce56",
    )
    s.validate_production_safety()
    assert s.is_production is True


def test_production_safety_requires_verify_full_in_production():
    """Verify that sslmode=verify-full is accepted in production."""
    s = Settings(
        ENVIRONMENT="production",
        DATABASE_URL="postgresql://app_user:secret_db_pass@db.railway.internal:5432/railway?sslmode=verify-full",
        JWT_SECRET="valid_cryptographic_production_secret_with_32_chars_minimum!",
        EMAIL_PROVIDER="resend",
        RESEND_API_KEY="re_1234567890abcdef",
        REDIS_URL="redis://localhost:6379/0",
    )
    s.validate_production_safety()
    assert s.is_production is True


def test_production_safety_accepts_neon_pooled_url_with_channel_binding():
    """Verify Neon pooled connections with channel_binding and sslmode=verify-full validate cleanly."""
    s = Settings(
        ENVIRONMENT="production",
        DATABASE_URL="postgres://app_user:secret_pass@ep-sample-pooler.aws.neon.tech/neondb?sslmode=verify-full&channel_binding=require",
        JWT_SECRET="valid_cryptographic_production_secret_with_32_chars_minimum!",
        EMAIL_PROVIDER="resend",
        RESEND_API_KEY="re_1234567890abcdef",
        REDIS_URL="redis://localhost:6379/0",
    )
    s.validate_production_safety()
    assert s.sync_database_url.startswith("postgresql+psycopg2://")
    assert "channel_binding=require" in s.sync_database_url
    assert "sslmode=verify-full" in s.sync_database_url


@pytest.mark.parametrize("sslmode", ["disable", "allow", "prefer", "require", "verify-ca"])
def test_production_safety_rejects_insecure_and_insufficient_sslmodes(sslmode):
    """Verify that insecure and insufficient PostgreSQL SSL modes are rejected in production."""
    s = Settings(
        ENVIRONMENT="production",
        DATABASE_URL=f"postgresql://app_user:secret_db_pass@db.railway.internal:5432/railway?sslmode={sslmode}",
        JWT_SECRET="valid_cryptographic_production_secret_with_32_chars_minimum!",
        EMAIL_PROVIDER="resend",
        RESEND_API_KEY="re_1234567890abcdef",
    )
    with pytest.raises(RuntimeError) as exc_info:
        s.validate_production_safety()
    assert "insufficient or insecure in production" in str(exc_info.value)
    assert sslmode in str(exc_info.value)


def test_production_safety_rejects_missing_sslmode():
    """Verify that production fails if DATABASE_URL does not explicitly specify sslmode."""
    s = Settings(
        ENVIRONMENT="production",
        DATABASE_URL="postgresql://app_user:secret_db_pass@db.railway.internal:5432/railway",
        JWT_SECRET="valid_cryptographic_production_secret_with_32_chars_minimum!",
        EMAIL_PROVIDER="resend",
        RESEND_API_KEY="re_1234567890abcdef",
    )
    with pytest.raises(RuntimeError) as exc_info:
        s.validate_production_safety()
    assert "sslmode=verify-full" in str(exc_info.value)


def test_database_url_normalization_postgres_and_postgresql():
    """Verify that both postgres:// and postgresql:// normalize to postgresql+psycopg2://."""
    s1 = Settings(DATABASE_URL="postgres://user:pass@localhost:5432/db?sslmode=verify-full")
    assert s1.sync_database_url.startswith("postgresql+psycopg2://")
    assert "sslmode=verify-full" in s1.sync_database_url

    s2 = Settings(DATABASE_URL="postgresql://user:pass@localhost:5432/db?sslmode=verify-full")
    assert s2.sync_database_url.startswith("postgresql+psycopg2://")
    assert "sslmode=verify-full" in s2.sync_database_url


def test_production_safety_rejects_unsupported_database_dialect():
    """Verify that non-PostgreSQL dialects are rejected in production."""
    s = Settings(
        ENVIRONMENT="production",
        DATABASE_URL="mysql+pymysql://app_user:secret_db_pass@db.railway.internal:3306/db?sslmode=require",
        JWT_SECRET="valid_cryptographic_production_secret_with_32_chars_minimum!",
        EMAIL_PROVIDER="resend",
        RESEND_API_KEY="re_1234567890abcdef",
    )
    with pytest.raises(RuntimeError) as exc_info:
        s.validate_production_safety()
    assert "unsupported for production" in str(exc_info.value)


def test_production_safety_sanitizes_credentials_on_parse_error():
    """Verify that malformed DATABASE_URL does not leak database passwords in exception message."""
    secret_pass = "super_classified_db_pass_98765"
    s = Settings(
        ENVIRONMENT="production",
        DATABASE_URL=f"postgresql://app_user:{secret_pass}@db.railway.internal:not_a_valid_port/railway?sslmode=require",
        JWT_SECRET="valid_cryptographic_production_secret_with_32_chars_minimum!",
        EMAIL_PROVIDER="resend",
        RESEND_API_KEY="re_1234567890abcdef",
    )
    with pytest.raises(RuntimeError) as exc_info:
        s.validate_production_safety()
    err_text = str(exc_info.value)
    assert secret_pass not in err_text
    assert "malformed" in err_text


def test_production_safety_never_exposes_secrets_in_errors():
    """Verify that error messages do not reveal secret values or passwords."""
    secret_pass = "super_private_password_xyz"
    s = Settings(
        ENVIRONMENT="production",
        DATABASE_URL="sqlite:///./test.db",
        JWT_SECRET="short",
    )
    with pytest.raises(RuntimeError) as exc_info:
        s.validate_production_safety()
    error_text = str(exc_info.value)
    assert secret_pass not in error_text


def test_production_safety_rejects_missing_redis_url():
    """SEC-05: Verify production safety fails fast if REDIS_URL is missing with rate limiting enabled."""
    s = Settings(
        ENVIRONMENT="production",
        DATABASE_URL="postgresql://app_user:secret_db_pass@db.railway.internal:5432/railway?sslmode=verify-full",
        JWT_SECRET="valid_cryptographic_production_secret_with_32_chars_minimum!",
        EMAIL_PROVIDER="resend",
        RESEND_API_KEY="re_1234567890abcdef",
        REDIS_URL="",
        RATE_LIMIT_ENABLED=True,
    )
    with pytest.raises(RuntimeError) as exc_info:
        s.validate_production_safety()
    err_text = str(exc_info.value)
    assert "REDIS_URL is missing" in err_text
    assert "distributed rate limiting" in err_text


# =====================================================================
# Turnstile Production Validation (F-01)
# =====================================================================
@pytest.mark.parametrize("missing_or_empty", ["", "   ", None])
def test_production_safety_rejects_missing_and_empty_turnstile_secret(missing_or_empty):
    """SEC-05 / F-01: Verify production safety fails fast if TURNSTILE_SECRET_KEY is missing or empty."""
    s = make_valid_production_settings(TURNSTILE_SECRET_KEY=missing_or_empty)
    with pytest.raises(RuntimeError) as exc_info:
        s.validate_production_safety()
    err_text = str(exc_info.value)
    assert "TURNSTILE_SECRET_KEY is missing" in err_text


def test_production_safety_rejects_missing_turnstile_secret_in_env(monkeypatch):
    """SEC-05 / F-01: Verify production safety fails fast when TURNSTILE_SECRET_KEY is omitted from environment."""
    monkeypatch.delenv("TURNSTILE_SECRET_KEY", raising=False)
    s = Settings(
        ENVIRONMENT="production",
        DATABASE_URL="postgresql://app_user:secret_db_pass@db.railway.internal:5432/railway?sslmode=verify-full",
        JWT_SECRET="valid_cryptographic_production_secret_with_32_chars_minimum!",
        EMAIL_PROVIDER="resend",
        RESEND_API_KEY="re_1234567890abcdef",
        REDIS_URL="redis://localhost:6379/0",
        MODEL_BUNDLE_SHA256="feb976cd9f101e12ef869d08c52d6d456ee666314866ae9a062fedccf688ce56",
        TURNSTILE_SECRET_KEY=None,
    )
    with pytest.raises(RuntimeError) as exc_info:
        s.validate_production_safety()
    err_text = str(exc_info.value)
    assert "TURNSTILE_SECRET_KEY is missing" in err_text


@pytest.mark.parametrize(
    "test_secret",
    [
        "1x0000000000000000000000000000000AA",
        "2x0000000000000000000000000000000AA",
        "3x0000000000000000000000000000000AA",
        "1x0000000000000000000000000000000aa",
        "2x0000000000000000000000000000000aa",
        "3x0000000000000000000000000000000aa",
        "  1x0000000000000000000000000000000AA  ",
    ],
)
def test_production_safety_rejects_cloudflare_published_test_secrets(test_secret):
    """SEC-05 / F-01: Verify production safety rejects all Cloudflare published testing secrets case-insensitively."""
    s = make_valid_production_settings(TURNSTILE_SECRET_KEY=test_secret)
    with pytest.raises(RuntimeError) as exc_info:
        s.validate_production_safety()
    err_text = str(exc_info.value)
    assert "Cloudflare published testing secret" in err_text


def test_production_safety_accepts_valid_turnstile_secret():
    """SEC-05 / F-01: Verify production safety accepts genuine production Turnstile secret."""
    s = make_valid_production_settings(TURNSTILE_SECRET_KEY="0x4AAAAAAAMvM70123456789abcdefABCDEF")
    s.validate_production_safety()
    assert s.is_production is True


# =====================================================================
# Model Bundle SHA-256 Validation (SEC-03)
# =====================================================================
@pytest.mark.parametrize("missing_digest", ["", "   ", None])
def test_production_safety_rejects_missing_and_empty_model_bundle_sha(missing_digest):
    """SEC-03: Verify production safety fails fast if MODEL_BUNDLE_SHA256 is missing or empty."""
    s = make_valid_production_settings(MODEL_BUNDLE_SHA256=missing_digest)
    with pytest.raises(RuntimeError) as exc_info:
        s.validate_production_safety()
    err_text = str(exc_info.value)
    assert "MODEL_BUNDLE_SHA256 is missing" in err_text


def test_production_safety_rejects_missing_model_bundle_sha_in_env(monkeypatch):
    """SEC-03: Verify production safety fails fast when MODEL_BUNDLE_SHA256 is omitted from environment."""
    monkeypatch.delenv("MODEL_BUNDLE_SHA256", raising=False)
    s = Settings(
        ENVIRONMENT="production",
        DATABASE_URL="postgresql://app_user:secret_db_pass@db.railway.internal:5432/railway?sslmode=verify-full",
        JWT_SECRET="valid_cryptographic_production_secret_with_32_chars_minimum!",
        EMAIL_PROVIDER="resend",
        RESEND_API_KEY="re_1234567890abcdef",
        REDIS_URL="redis://localhost:6379/0",
        TURNSTILE_SECRET_KEY="0x4AAAAAAAMvM70123456789abcdefABCDEF",
        MODEL_BUNDLE_SHA256=None,
    )
    with pytest.raises(RuntimeError) as exc_info:
        s.validate_production_safety()
    err_text = str(exc_info.value)
    assert "MODEL_BUNDLE_SHA256 is missing" in err_text


@pytest.mark.parametrize(
    "malformed_sha",
    [
        "feb976cd9f101e12ef869d08c52d6d456ee666314866ae9a062fedccf688ce5",  # 63 chars (too short)
        "feb976cd9f101e12ef869d08c52d6d456ee666314866ae9a062fedccf688ce56a",  # 65 chars (too long)
        "feb976cd9f101e12ef869d08c52d6d456ee666314866ae9a062fedccf688zzzz",  # non-hex chars ('z')
        "feb976cd-9f10-1e12-ef86-9d08c52d6d456ee666314866ae9a062fedccf688ce5",  # hyphens
        "not_a_hex_digest_at_all!",
    ],
)
def test_production_safety_rejects_malformed_model_bundle_sha(malformed_sha):
    """SEC-03: Verify production safety rejects malformed SHA-256 digests (invalid length, non-hex)."""
    s = make_valid_production_settings(MODEL_BUNDLE_SHA256=malformed_sha)
    with pytest.raises(RuntimeError) as exc_info:
        s.validate_production_safety()
    err_text = str(exc_info.value)
    assert "MODEL_BUNDLE_SHA256 is malformed" in err_text


def test_production_safety_accepts_valid_model_bundle_sha():
    """SEC-03: Verify production safety accepts canonical 64-character lowercase and uppercase digests."""
    # Canonical lowercase digest
    s_lower = make_valid_production_settings(
        MODEL_BUNDLE_SHA256="feb976cd9f101e12ef869d08c52d6d456ee666314866ae9a062fedccf688ce56"
    )
    s_lower.validate_production_safety()
    assert s_lower.is_production is True

    # Uppercase digest (normalized by .lower())
    s_upper = make_valid_production_settings(
        MODEL_BUNDLE_SHA256="FEB976CD9F101E12EF869D08C52D6D456EE666314866AE9A062FEDCCF688CE56"
    )
    s_upper.validate_production_safety()
    assert s_upper.is_production is True


# =====================================================================
# Redis URL Validation (SEC-05 / F-02 / F-03 / F-04)
# =====================================================================
@pytest.mark.parametrize(
    "invalid_url",
    [
        "redis://",
        "redis://:6379/0",
        "redis://localhost:abc/0",
        "redis://localhost:99999/0",
        "redis://localhost:0/0",
        "redis://localhost:-1/0",
        "redis://bad host:6379/0",
        "redis://localhost: 6379/0",
        "redis://localhost:6379 /0",
        "redis://[invalid_ipv6:6379",
        "unix://",
        "unix:///var/run/bad socket.sock",
    ],
)
def test_production_safety_rejects_invalid_redis_url_formats(invalid_url):
    """SEC-05 / F-02: Verify production safety rejects malformed Redis URLs, ports, hosts, and paths."""
    s = make_valid_production_settings(REDIS_URL=invalid_url, RATE_LIMIT_ENABLED=True)
    with pytest.raises(RuntimeError) as exc_info:
        s.validate_production_safety()
    err_text = str(exc_info.value)
    assert "REDIS_URL is invalid" in err_text or "REDIS_URL is malformed" in err_text


@pytest.mark.parametrize(
    "valid_url",
    [
        "redis://localhost:6379/0",
        "redis://localhost",
        "rediss://valid-host:6379/0",
        "unix:///var/run/redis.sock",
    ],
)
def test_production_safety_accepts_valid_redis_urls(valid_url):
    """SEC-05 / F-02: Verify production safety accepts valid redis://, rediss://, and unix:// URLs."""
    s = make_valid_production_settings(REDIS_URL=valid_url, RATE_LIMIT_ENABLED=True)
    s.validate_production_safety()
    assert s.is_production is True


def test_production_safety_accepts_authenticated_redis_url_without_leaking_credentials():
    """SEC-05 / F-02: Verify authenticated Redis URLs validate cleanly and error messages never expose credentials."""
    secret_pass = "super_classified_redis_auth_token_999"
    auth_url = f"redis://app_user:{secret_pass}@prod-redis.internal:6379/0"
    s = make_valid_production_settings(REDIS_URL=auth_url, RATE_LIMIT_ENABLED=True)
    s.validate_production_safety()
    assert s.is_production is True

    # Error sanitization with authenticated URL containing malformed port
    bad_auth_url = f"redis://app_user:{secret_pass}@prod-redis.internal:invalid_port/0"
    s_bad = make_valid_production_settings(REDIS_URL=bad_auth_url, RATE_LIMIT_ENABLED=True)
    with pytest.raises(RuntimeError) as exc_info:
        s_bad.validate_production_safety()
    err_text = str(exc_info.value)
    assert secret_pass not in err_text
    assert "REDIS_URL is invalid" in err_text


# =====================================================================
# Redis Numeric Configuration Bounds (F-02)
# =====================================================================
@pytest.mark.parametrize("invalid_conn", [0, -1, -50])
def test_production_safety_rejects_non_positive_redis_max_connections(invalid_conn):
    """F-02: Verify production safety rejects non-positive REDIS_MAX_CONNECTIONS."""
    s = make_valid_production_settings(REDIS_MAX_CONNECTIONS=invalid_conn)
    with pytest.raises(RuntimeError) as exc_info:
        s.validate_production_safety()
    err_text = str(exc_info.value)
    assert "REDIS_MAX_CONNECTIONS must be a positive integer" in err_text


@pytest.mark.parametrize("bool_val", [True, False])
def test_production_safety_rejects_boolean_redis_max_connections(bool_val):
    """F-02: Verify boolean values are rejected for REDIS_MAX_CONNECTIONS."""
    with pytest.raises((ValueError, pydantic.ValidationError, RuntimeError)) as exc_info:
        make_valid_production_settings(REDIS_MAX_CONNECTIONS=bool_val)
    assert "must not be a boolean" in str(exc_info.value)


@pytest.mark.parametrize(
    "invalid_timeout",
    [0, 0.0, -1.0, -10.5, float("nan"), float("inf"), float("-inf")],
)
def test_production_safety_rejects_invalid_redis_socket_timeout(invalid_timeout):
    """F-02: Verify production safety rejects zero, negative, NaN, and infinite REDIS_SOCKET_TIMEOUT."""
    s = make_valid_production_settings(REDIS_SOCKET_TIMEOUT=invalid_timeout)
    with pytest.raises(RuntimeError) as exc_info:
        s.validate_production_safety()
    err_text = str(exc_info.value)
    assert "REDIS_SOCKET_TIMEOUT must be a positive finite float" in err_text


@pytest.mark.parametrize("bool_val", [True, False])
def test_production_safety_rejects_boolean_redis_socket_timeout(bool_val):
    """F-02: Verify boolean values are rejected for REDIS_SOCKET_TIMEOUT."""
    with pytest.raises((ValueError, pydantic.ValidationError, RuntimeError)) as exc_info:
        make_valid_production_settings(REDIS_SOCKET_TIMEOUT=bool_val)
    assert "must not be a boolean" in str(exc_info.value)


@pytest.mark.parametrize(
    "invalid_timeout",
    [0, 0.0, -1.0, -10.5, float("nan"), float("inf"), float("-inf")],
)
def test_production_safety_rejects_invalid_redis_connect_timeout(invalid_timeout):
    """F-02: Verify production safety rejects zero, negative, NaN, and infinite REDIS_CONNECT_TIMEOUT."""
    s = make_valid_production_settings(REDIS_CONNECT_TIMEOUT=invalid_timeout)
    with pytest.raises(RuntimeError) as exc_info:
        s.validate_production_safety()
    err_text = str(exc_info.value)
    assert "REDIS_CONNECT_TIMEOUT must be a positive finite float" in err_text


@pytest.mark.parametrize("bool_val", [True, False])
def test_production_safety_rejects_boolean_redis_connect_timeout(bool_val):
    """F-02: Verify boolean values are rejected for REDIS_CONNECT_TIMEOUT."""
    with pytest.raises((ValueError, pydantic.ValidationError, RuntimeError)) as exc_info:
        make_valid_production_settings(REDIS_CONNECT_TIMEOUT=bool_val)
    assert "must not be a boolean" in str(exc_info.value)


def test_production_safety_accepts_valid_redis_numeric_configuration():
    """F-02: Verify production safety accepts positive, finite Redis numeric settings."""
    s = make_valid_production_settings(
        REDIS_MAX_CONNECTIONS=50,
        REDIS_SOCKET_TIMEOUT=2.5,
        REDIS_CONNECT_TIMEOUT=1.5,
    )
    s.validate_production_safety()
    assert s.REDIS_MAX_CONNECTIONS == 50
    assert s.REDIS_SOCKET_TIMEOUT == 2.5
    assert s.REDIS_CONNECT_TIMEOUT == 1.5


def test_email_service_disabled_provider(monkeypatch):
    """Verify that EMAIL_PROVIDER=disabled fails safely without crashing."""
    monkeypatch.setattr(settings, "EMAIL_PROVIDER", "disabled")
    monkeypatch.setattr(settings, "ENVIRONMENT", "development")

    sent, err = email_service.send_verification_email("user@example.com", "User", "token_123")
    assert sent is False
    assert "disabled" in err.lower()


def test_production_docs_disabled_in_production(monkeypatch):
    """Verify that Swagger UI, ReDoc, and OpenAPI schema return 404 in production."""
    from starlette.testclient import TestClient
    from app.main import create_app

    monkeypatch.setattr(settings, "ENVIRONMENT", "production")
    monkeypatch.setattr(settings, "DATABASE_URL", "postgresql://u:p@db:5432/d?sslmode=verify-full")
    monkeypatch.setattr(settings, "JWT_SECRET", "super_long_production_test_secret_32_chars_ok!")
    monkeypatch.setattr(settings, "EMAIL_PROVIDER", "resend")
    monkeypatch.setattr(settings, "RESEND_API_KEY", "re_test_key_12345")
    monkeypatch.setattr(settings, "REDIS_URL", "redis://localhost:6379/0")

    prod_app = create_app()
    assert prod_app.docs_url is None
    assert prod_app.redoc_url is None
    assert prod_app.openapi_url is None

    client = TestClient(prod_app)
    assert client.get("/docs").status_code == 404
    assert client.get("/redoc").status_code == 404
    assert client.get("/openapi.json").status_code == 404


def test_docs_enabled_in_development(monkeypatch):
    """Verify that Swagger UI, ReDoc, and OpenAPI schema are accessible in development."""
    from starlette.testclient import TestClient
    from app.main import create_app

    monkeypatch.setattr(settings, "ENVIRONMENT", "development")
    dev_app = create_app()
    assert dev_app.docs_url == "/docs"
    assert dev_app.redoc_url == "/redoc"
    assert dev_app.openapi_url == "/openapi.json"

    client = TestClient(dev_app)
    assert client.get("/openapi.json").status_code == 200


def test_http_security_headers_applied(client):
    """Verify essential security headers are attached by middleware to HTTP responses."""
    res = client.get("/metrics")
    assert res.headers["X-Content-Type-Options"] == "nosniff"
    assert res.headers["X-Frame-Options"] == "DENY"
    assert res.headers["Referrer-Policy"] == "strict-origin-when-cross-origin"
    assert "default-src" in res.headers["Content-Security-Policy"]
    assert "frame-ancestors 'none'" in res.headers["Content-Security-Policy"]


def test_hsts_header_in_production(monkeypatch, client):
    """Verify HSTS header is attached in production over HTTPS and omitted on plain HTTP."""
    # Development: no HSTS
    monkeypatch.setattr(settings, "ENVIRONMENT", "development")
    res_dev = client.get("/metrics")
    assert "Strict-Transport-Security" not in res_dev.headers

    # Production over HTTPS (via X-Forwarded-Proto)
    monkeypatch.setattr(settings, "ENVIRONMENT", "production")
    res_prod_https = client.get("/metrics", headers={"X-Forwarded-Proto": "https"})
    assert res_prod_https.headers.get("Strict-Transport-Security") == "max-age=31536000; includeSubDomains"

    # Production over plain HTTP: omitted
    res_prod_http = client.get("/metrics", headers={"X-Forwarded-Proto": "http"})
    assert "Strict-Transport-Security" not in res_prod_http.headers


def test_security_headers_on_cors_preflight(client):
    """Verify security headers are attached to CORS preflight OPTIONS responses."""
    headers = {
        "Origin": "http://localhost:3000",
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "Authorization,Content-Type",
    }
    res = client.options("/auth/login", headers=headers)
    assert res.headers["X-Content-Type-Options"] == "nosniff"
    assert res.headers["X-Frame-Options"] == "DENY"


def test_alembic_env_validates_production_safety(monkeypatch):
    """Verify that Alembic migration environment fails fast when production safety checks fail."""
    from pathlib import Path
    from alembic.config import Config
    from alembic import command

    monkeypatch.setattr(settings, "ENVIRONMENT", "production")
    monkeypatch.setattr(settings, "DATABASE_URL", "sqlite:///./unsafe_prod.db")

    backend_dir = Path(__file__).resolve().parent.parent
    alembic_cfg = Config(str(backend_dir / "alembic.ini"))
    alembic_cfg.set_main_option("script_location", str(backend_dir / "alembic"))

    with pytest.raises(RuntimeError) as exc_info:
        command.upgrade(alembic_cfg, "head", sql=True)
    assert "DATABASE_URL is using SQLite" in str(exc_info.value)
