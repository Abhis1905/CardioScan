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


def test_production_safety_passes_with_valid_production_config():
    """Verify that production succeeds when all security requirements are satisfied."""
    s = Settings(
        ENVIRONMENT="production",
        DATABASE_URL="postgresql://app_user:secret_db_pass@db.railway.internal:5432/railway",
        JWT_SECRET="valid_cryptographic_production_secret_with_32_chars_minimum!",
        EMAIL_PROVIDER="resend",
        RESEND_API_KEY="re_1234567890abcdef",
    )
    s.validate_production_safety()
    assert s.is_production is True


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


def test_email_service_disabled_provider(monkeypatch):
    """Verify that EMAIL_PROVIDER=disabled fails safely without crashing."""
    monkeypatch.setattr(settings, "EMAIL_PROVIDER", "disabled")
    monkeypatch.setattr(settings, "ENVIRONMENT", "development")

    sent, err = email_service.send_verification_email("user@example.com", "User", "token_123")
    assert sent is False
    assert "disabled" in err.lower()
