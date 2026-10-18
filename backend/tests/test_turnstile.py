import json
import urllib.error
from unittest.mock import MagicMock, patch
import pytest

from app.core.config import settings
from app.services.turnstile import TurnstileService, turnstile_service


def test_turnstile_missing_token_when_configured(monkeypatch):
    """Verify that a missing or whitespace token is rejected when Turnstile is configured."""
    monkeypatch.setattr(settings, "TURNSTILE_SECRET_KEY", "1x0000000000000000000000000000000AA")
    svc = TurnstileService()

    valid, err = svc.verify_token(None)
    assert valid is False
    assert "token is required" in err

    valid, err = svc.verify_token("   ")
    assert valid is False
    assert "token is required" in err


def test_turnstile_unconfigured_in_dev_allows_bypass(monkeypatch):
    """Verify that in non-production, unconfigured secret key allows development testing."""
    monkeypatch.setattr(settings, "TURNSTILE_SECRET_KEY", "")
    monkeypatch.setattr(settings, "ENVIRONMENT", "development")
    svc = TurnstileService()

    valid, err = svc.verify_token("any_token")
    assert valid is True
    assert err is None


def test_turnstile_unconfigured_in_prod_fails_safely(monkeypatch):
    """Verify that in production, missing secret key fails closed safely."""
    monkeypatch.setattr(settings, "TURNSTILE_SECRET_KEY", "")
    monkeypatch.setattr(settings, "ENVIRONMENT", "production")
    svc = TurnstileService()

    valid, err = svc.verify_token("any_token")
    assert valid is False
    assert "misconfigured" in err


def test_turnstile_valid_token_success(monkeypatch):
    """Verify successful verification using Cloudflare Siteverify response."""
    monkeypatch.setattr(settings, "TURNSTILE_SECRET_KEY", "1x0000000000000000000000000000000AA")
    svc = TurnstileService()

    mock_resp = MagicMock()
    mock_resp.read.return_value = json.dumps({"success": True}).encode("utf-8")
    mock_resp.__enter__.return_value = mock_resp

    with patch("urllib.request.urlopen", return_value=mock_resp):
        valid, err = svc.verify_token("valid_turnstile_token", remote_ip="127.0.0.1")
        assert valid is True
        assert err is None


def test_turnstile_invalid_token_error(monkeypatch):
    """Verify handling of invalid-input-response error code."""
    monkeypatch.setattr(settings, "TURNSTILE_SECRET_KEY", "1x0000000000000000000000000000000AA")
    svc = TurnstileService()

    mock_resp = MagicMock()
    mock_resp.read.return_value = json.dumps({
        "success": False,
        "error-codes": ["invalid-input-response"],
    }).encode("utf-8")
    mock_resp.__enter__.return_value = mock_resp

    with patch("urllib.request.urlopen", return_value=mock_resp):
        valid, err = svc.verify_token("invalid_token")
        assert valid is False
        assert "invalid token" in err


def test_turnstile_expired_or_duplicate_token(monkeypatch):
    """Verify handling of timeout-or-duplicate error code."""
    monkeypatch.setattr(settings, "TURNSTILE_SECRET_KEY", "1x0000000000000000000000000000000AA")
    svc = TurnstileService()

    mock_resp = MagicMock()
    mock_resp.read.return_value = json.dumps({
        "success": False,
        "error-codes": ["timeout-or-duplicate"],
    }).encode("utf-8")
    mock_resp.__enter__.return_value = mock_resp

    with patch("urllib.request.urlopen", return_value=mock_resp):
        valid, err = svc.verify_token("expired_token")
        assert valid is False
        assert "expired or was already used" in err


def test_turnstile_network_timeout_handling(monkeypatch):
    """Verify that network timeouts return a safe error message without raising unhandled exceptions."""
    monkeypatch.setattr(settings, "TURNSTILE_SECRET_KEY", "1x0000000000000000000000000000000AA")
    svc = TurnstileService()

    with patch("urllib.request.urlopen", side_effect=TimeoutError("Request timed out")):
        valid, err = svc.verify_token("timeout_token")
        assert valid is False
        assert "timed out" in err


def test_turnstile_http_error_handling(monkeypatch):
    """Verify HTTP error responses from Cloudflare return a clean error."""
    monkeypatch.setattr(settings, "TURNSTILE_SECRET_KEY", "1x0000000000000000000000000000000AA")
    svc = TurnstileService()

    with patch("urllib.request.urlopen", side_effect=urllib.error.HTTPError("url", 500, "Server Error", {}, None)):
        valid, err = svc.verify_token("server_err_token")
        assert valid is False
        assert "remote server error" in err


def test_verify_turnstile_endpoint_success(client, monkeypatch):
    """Test POST /auth/verify-turnstile with valid token."""
    monkeypatch.setattr(settings, "TURNSTILE_SECRET_KEY", "1x0000000000000000000000000000000AA")
    with patch.object(turnstile_service, "verify_token", return_value=(True, None)):
        res = client.post("/auth/verify-turnstile", json={"turnstile_token": "valid_token_123"})
        assert res.status_code == 200
        assert res.json()["success"] is True


def test_verify_turnstile_endpoint_failure(client, monkeypatch):
    """Test POST /auth/verify-turnstile with rejected token."""
    monkeypatch.setattr(settings, "TURNSTILE_SECRET_KEY", "1x0000000000000000000000000000000AA")
    with patch.object(turnstile_service, "verify_token", return_value=(False, "Bot verification failed: invalid token.")):
        res = client.post("/auth/verify-turnstile", json={"turnstile_token": "bad_token"})
        assert res.status_code == 400
        assert "invalid token" in res.json()["error"]


def test_register_with_turnstile_rejection(client, monkeypatch):
    """Test that POST /auth/register rejects registration if Turnstile verification fails."""
    monkeypatch.setattr(settings, "TURNSTILE_SECRET_KEY", "1x0000000000000000000000000000000AA")
    with patch.object(turnstile_service, "verify_token", return_value=(False, "Bot verification token is required.")):
        res = client.post("/auth/register", json={
            "name": "Bot User",
            "email": "bot@example.com",
            "password": "password123",
            "turnstile_token": None,
        })
        assert res.status_code == 400
        assert "Bot verification token is required" in res.json()["error"]


def test_login_with_turnstile_rejection(client, monkeypatch):
    """Test that POST /auth/login rejects login if Turnstile verification fails."""
    monkeypatch.setattr(settings, "TURNSTILE_SECRET_KEY", "1x0000000000000000000000000000000AA")
    with patch.object(turnstile_service, "verify_token", return_value=(False, "Bot verification expired or was already used.")):
        res = client.post("/auth/login", json={
            "email": "user@example.com",
            "password": "password123",
            "turnstile_token": "expired_token",
        })
        assert res.status_code == 400
        assert "expired or was already used" in res.json()["error"]


def test_firebase_auth_with_turnstile_rejection(client, monkeypatch):
    """Test that POST /auth/firebase rejects token exchange if Turnstile verification fails."""
    monkeypatch.setattr(settings, "TURNSTILE_SECRET_KEY", "1x0000000000000000000000000000000AA")
    with patch.object(turnstile_service, "verify_token", return_value=(False, "Bot verification token is required.")):
        res = client.post("/auth/firebase", json={
            "id_token": "valid_firebase_id_token_12345",
            "turnstile_token": None,
        })
        assert res.status_code == 400
        assert "Bot verification token is required" in res.json()["error"]
