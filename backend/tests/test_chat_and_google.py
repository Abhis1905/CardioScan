import json
from unittest.mock import MagicMock, patch
from app.core.config import settings


def test_chat_without_groq_api_key(client):
    with patch.object(settings, "GROQ_API_KEY", None):
        res = client.post("/chat", json={"messages": [{"role": "user", "content": "Hello"}]})
        assert res.status_code == 500
        assert "GROQ_API_KEY not set" in res.json()["error"]


def test_chat_with_mocked_groq(client):
    mock_response = MagicMock()
    mock_response.__enter__.return_value = mock_response
    mock_response.read.return_value = json.dumps({
        "choices": [{"message": {"content": "Heart disease risk depends on clinical factors."}}]
    }).encode("utf-8")

    with patch.object(settings, "GROQ_API_KEY", "dummy_groq_key"):
        with patch("app.api.chat.urlopen", return_value=mock_response):
            res = client.post("/chat", json={"messages": [{"role": "user", "content": "What is heart disease?"}]})
            assert res.status_code == 200
            assert "Heart disease risk" in res.json()["reply"]


def test_google_auth_unconfigured(client):
    with patch.object(settings, "GOOGLE_CLIENT_ID", None):
        res = client.post("/auth/google", json={"credential": "mock_credential"})
        assert res.status_code == 400
        assert "not configured" in res.json()["error"]


def test_google_auth_mocked_success(client, db_session):
    mock_idinfo = {
        "email": "googleuser@example.com",
        "name": "Google User",
        "sub": "google-oauth2-12345",
        "picture": "https://example.com/avatar.png",
    }

    with patch.object(settings, "GOOGLE_CLIENT_ID", "dummy_client_id"):
        with patch("google.oauth2.id_token.verify_oauth2_token", return_value=mock_idinfo):
            res = client.post("/auth/google", json={"credential": "valid_mock_token"})
            assert res.status_code == 200
            data = res.json()
            assert "token" in data
            assert data["user"]["email"] == "googleuser@example.com"
            assert data["user"]["is_verified"] is True
