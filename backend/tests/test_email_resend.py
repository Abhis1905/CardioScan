import httpx
import pytest
from app.core.config import settings
from app.models.user import User
from app.services.email import email_service, _mask_email, _sanitize_error

ORIGINAL_HTTPX_POST = httpx.Client.post


def patch_resend_response(monkeypatch, response_or_callable):
    """Safely intercept calls to api.resend.com while allowing TestClient calls through."""
    def mocked_post(self, url, *args, **kwargs):
        if "api.resend.com" in str(url):
            if callable(response_or_callable):
                return response_or_callable(url, *args, **kwargs)
            return response_or_callable
        return ORIGINAL_HTTPX_POST(self, url, *args, **kwargs)

    monkeypatch.setattr(httpx.Client, "post", mocked_post)


def test_mask_email():
    """Verify email masking preserves domain while redacting local part."""
    assert _mask_email("john.doe@example.com") == "j******e@example.com"
    assert _mask_email("ab@domain.com") == "a*@domain.com"
    assert _mask_email("a@domain.com") == "a*@domain.com"
    assert _mask_email("invalid") == "***"
    assert _mask_email("") == "***"


def test_sanitize_error():
    """Verify secrets and tokens are redacted from error messages."""
    settings.RESEND_API_KEY = "re_secret_12345"
    settings.SMTP_PASSWORD = "smtp_super_secret"
    raw_error = "Error: Key re_secret_12345 rejected with Bearer re_secret_12345 and smtp_super_secret for https://cardioscan.app/verify?token=abc_xyz_789"
    sanitized = _sanitize_error(raw_error)
    assert "re_secret_12345" not in sanitized
    assert "[REDACTED_API_KEY]" in sanitized
    assert "smtp_super_secret" not in sanitized
    assert "[REDACTED_PASSWORD]" in sanitized
    assert "abc_xyz_789" not in sanitized
    assert "token=[REDACTED]" in sanitized
    assert "Bearer [REDACTED]" in sanitized


def test_resend_email_success(monkeypatch):
    """Verify successful email delivery via Resend HTTPS API."""
    monkeypatch.setattr(settings, "EMAIL_PROVIDER", "resend")
    monkeypatch.setattr(settings, "ENVIRONMENT", "development")
    monkeypatch.setattr(settings, "RESEND_API_KEY", "re_test_key_valid")
    monkeypatch.setattr(settings, "EMAIL_FROM", "CardioScan <onboarding@resend.dev>")

    captured_request = {}

    def mock_post(url, *args, **kwargs):
        captured_request["url"] = str(url)
        captured_request["headers"] = kwargs.get("headers", {})
        captured_request["json"] = kwargs.get("json", {})
        return httpx.Response(200, json={"id": "resend_msg_001"})

    patch_resend_response(monkeypatch, mock_post)

    sent, err = email_service.send_verification_email("user@example.com", "Test User", "test_token_123")

    assert sent is True
    assert err is None
    assert captured_request["url"] == "https://api.resend.com/emails"
    assert captured_request["headers"]["Authorization"] == "Bearer re_test_key_valid"
    assert captured_request["json"]["from"] == "CardioScan <onboarding@resend.dev>"
    assert captured_request["json"]["to"] == ["user@example.com"]
    assert captured_request["json"]["subject"] == "Verify your CardioScan account"
    assert "test_token_123" in captured_request["json"]["html"]


def test_resend_provider_rejection_403_restricted_domain(monkeypatch):
    """Verify Resend 403 Forbidden sandbox restriction is handled safely."""
    monkeypatch.setattr(settings, "EMAIL_PROVIDER", "resend")
    monkeypatch.setattr(settings, "ENVIRONMENT", "development")
    monkeypatch.setattr(settings, "RESEND_API_KEY", "re_test_key_valid")
    monkeypatch.setattr(settings, "EMAIL_FROM", "CardioScan <onboarding@resend.dev>")

    resend_403_body = {
        "statusCode": 403,
        "name": "restricted_api_key",
        "message": "You can only send testing emails to your own email address (owner@example.com).",
    }

    patch_resend_response(monkeypatch, httpx.Response(403, json=resend_403_body))

    sent, err = email_service.send_verification_email("other@example.com", "Other User", "token_123")

    assert sent is False
    assert "Resend error (403)" in err
    assert "You can only send testing emails" in err


def test_resend_provider_rejection_401_invalid_key(monkeypatch):
    """Verify Resend 401 Unauthorized is handled gracefully."""
    monkeypatch.setattr(settings, "EMAIL_PROVIDER", "resend")
    monkeypatch.setattr(settings, "ENVIRONMENT", "development")
    monkeypatch.setattr(settings, "RESEND_API_KEY", "re_invalid_key")

    resend_401_body = {
        "statusCode": 401,
        "name": "invalid_api_key",
        "message": "API key is invalid",
    }

    patch_resend_response(monkeypatch, httpx.Response(401, json=resend_401_body))

    sent, err = email_service.send_password_reset_email("user@example.com", "User", "token_123")

    assert sent is False
    assert "Resend error (401)" in err
    assert "API key is invalid" in err


def test_resend_timeout_handling(monkeypatch):
    """Verify httpx.TimeoutException is caught and converted to safe error."""
    monkeypatch.setattr(settings, "EMAIL_PROVIDER", "resend")
    monkeypatch.setattr(settings, "ENVIRONMENT", "development")
    monkeypatch.setattr(settings, "RESEND_API_KEY", "re_test_key")

    def mock_post(url, *args, **kwargs):
        raise httpx.TimeoutException("Connection timed out after 10.0s")

    patch_resend_response(monkeypatch, mock_post)

    sent, err = email_service.send_verification_email("user@example.com", "User", "token_123")

    assert sent is False
    assert err == "Email service request timed out"


def test_resend_connection_error_handling(monkeypatch):
    """Verify network connection failures are caught safely."""
    monkeypatch.setattr(settings, "EMAIL_PROVIDER", "resend")
    monkeypatch.setattr(settings, "ENVIRONMENT", "development")
    monkeypatch.setattr(settings, "RESEND_API_KEY", "re_test_key")

    def mock_post(url, *args, **kwargs):
        raise httpx.RequestError("Network unreachable")

    patch_resend_response(monkeypatch, mock_post)

    sent, err = email_service.send_welcome_email("user@example.com", "User")

    assert sent is False
    assert err == "Failed to connect to email provider"


def test_resend_missing_configuration(monkeypatch):
    """Verify missing API key or missing sender address fails early."""
    monkeypatch.setattr(settings, "EMAIL_PROVIDER", "resend")
    monkeypatch.setattr(settings, "ENVIRONMENT", "development")

    # Missing API key
    monkeypatch.setattr(settings, "RESEND_API_KEY", "")
    monkeypatch.setattr(settings, "EMAIL_FROM", "CardioScan <onboarding@resend.dev>")
    sent, err = email_service.send_verification_email("user@example.com", "User", "token_123")
    assert sent is False
    assert "Resend API key is not configured" in err

    # Missing EMAIL_FROM
    monkeypatch.setattr(settings, "RESEND_API_KEY", "re_test_key")
    monkeypatch.setattr(settings, "EMAIL_FROM", "")
    sent, err = email_service.send_verification_email("user@example.com", "User", "token_123")
    assert sent is False
    assert "Email sender address (EMAIL_FROM) is not configured" in err


def test_production_guard_rejects_mock_and_console(monkeypatch):
    """Verify that mock and console email delivery are strictly blocked in production."""
    monkeypatch.setattr(settings, "ENVIRONMENT", "production")

    monkeypatch.setattr(settings, "EMAIL_PROVIDER", "mock")
    sent, err = email_service.send_verification_email("user@example.com", "User", "token_123")
    assert sent is False
    assert "Mock/console email delivery is strictly disallowed in production" in err

    monkeypatch.setattr(settings, "EMAIL_PROVIDER", "console")
    sent, err = email_service.send_verification_email("user@example.com", "User", "token_123")
    assert sent is False
    assert "Mock/console email delivery is strictly disallowed in production" in err


def test_development_mock_and_console_allowed_in_dev(monkeypatch):
    """Verify mock and console are accepted in development/test environments."""
    monkeypatch.setattr(settings, "ENVIRONMENT", "development")

    monkeypatch.setattr(settings, "EMAIL_PROVIDER", "mock")
    sent, err = email_service.send_verification_email("user@example.com", "User", "token_123")
    assert sent is True
    assert err is None

    monkeypatch.setattr(settings, "EMAIL_PROVIDER", "console")
    sent, err = email_service.send_verification_email("user@example.com", "User", "token_123")
    assert sent is True
    assert err is None


def test_registration_rollback_on_resend_failure(client, db_session, monkeypatch):
    """Verify registration rolls back database user if Resend email dispatch fails."""
    monkeypatch.setattr(settings, "EMAIL_PROVIDER", "resend")
    monkeypatch.setattr(settings, "ENVIRONMENT", "development")
    monkeypatch.setattr(settings, "RESEND_API_KEY", "re_test_key")
    monkeypatch.setattr(settings, "EMAIL_FROM", "CardioScan <onboarding@resend.dev>")

    # Mock Resend 403 Forbidden failure
    def mock_post(url, *args, **kwargs):
        return httpx.Response(403, json={"message": "You can only send testing emails to your own email address"})

    patch_resend_response(monkeypatch, mock_post)

    payload = {
        "name": "Failed Registration User",
        "email": "failed.user@example.com",
        "password": "Password123!",
    }

    response = client.post("/auth/register", json=payload)
    assert response.status_code == 500
    assert "Failed to send verification email" in response.json()["error"]

    # Confirm user was not persisted in database
    user = db_session.query(User).filter(User.email == "failed.user@example.com").first()
    assert user is None


def test_resend_verification_endpoint_on_email_failure(client, unverified_user, monkeypatch):
    """Verify /auth/resend-verification handles Resend API failures."""
    monkeypatch.setattr(settings, "EMAIL_PROVIDER", "resend")
    monkeypatch.setattr(settings, "ENVIRONMENT", "development")
    monkeypatch.setattr(settings, "RESEND_API_KEY", "re_test_key")
    monkeypatch.setattr(settings, "EMAIL_FROM", "CardioScan <onboarding@resend.dev>")

    # Mock Resend 500 failure
    def mock_post(url, *args, **kwargs):
        return httpx.Response(500, json={"message": "Internal Resend error"})

    patch_resend_response(monkeypatch, mock_post)

    response = client.post("/auth/resend-verification", json={"email": unverified_user.email})
    assert response.status_code == 500
    assert "Failed to send verification email" in response.json()["error"]


def test_forgot_password_endpoint_with_resend(client, test_user, monkeypatch):
    """Verify /auth/forgot-password dispatches reset email via Resend."""
    monkeypatch.setattr(settings, "EMAIL_PROVIDER", "resend")
    monkeypatch.setattr(settings, "ENVIRONMENT", "development")
    monkeypatch.setattr(settings, "RESEND_API_KEY", "re_test_key")
    monkeypatch.setattr(settings, "EMAIL_FROM", "CardioScan <onboarding@resend.dev>")

    captured = {}

    def mock_post(url, *args, **kwargs):
        captured["called"] = True
        captured["json"] = kwargs.get("json")
        return httpx.Response(200, json={"id": "resend_msg_reset"})

    patch_resend_response(monkeypatch, mock_post)

    response = client.post("/auth/forgot-password", json={"email": test_user.email})
    assert response.status_code == 200
    assert response.json()["message"] == "If this email is registered, a reset link has been sent."
    assert captured.get("called") is True
    assert captured["json"]["subject"] == "Reset your CardioScan password"
    assert captured["json"]["to"] == [test_user.email]
