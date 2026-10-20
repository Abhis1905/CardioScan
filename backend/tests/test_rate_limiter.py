import time
from unittest.mock import patch
from app.core.config import settings
from app.core.rate_limiter import rate_limiter_storage, RateLimiter, InMemoryRateLimiterStorage


def test_storage_sliding_window():
    storage = InMemoryRateLimiterStorage()
    key = "test_ip_1"
    limit = 3
    window = 10  # 10 seconds

    now = 1000.0
    # First 3 requests should succeed
    allowed, retry = storage.check_and_record(key, limit, window, now=now)
    assert allowed is True
    assert retry == 0

    allowed, retry = storage.check_and_record(key, limit, window, now=now + 1.0)
    assert allowed is True

    allowed, retry = storage.check_and_record(key, limit, window, now=now + 2.0)
    assert allowed is True

    # 4th request within window should be rate-limited
    allowed, retry = storage.check_and_record(key, limit, window, now=now + 3.0)
    assert allowed is False
    assert retry == 7  # oldest was 1000.0, expires at 1010.0; now is 1003.0 -> 7s remaining

    # Request after window expires should succeed
    allowed, retry = storage.check_and_record(key, limit, window, now=now + 11.0)
    assert allowed is True
    assert retry == 0


def test_rate_limiter_endpoint_429(client, auth_headers):
    rate_limiter_storage.reset()
    with patch.object(settings, "RATE_LIMIT_ENABLED", True):
        with patch.object(settings, "RATE_LIMIT_WHATIF", 2):
            with patch.object(settings, "RATE_LIMIT_WHATIF_WINDOW", 60):
                payload = {
                    "age": 55, "sex": 1, "cp": 0, "trestbps": 130, "chol": 240,
                    "fbs": 0, "restecg": 0, "thalach": 150, "exang": 0,
                    "oldpeak": 1.2, "slope": 1, "ca": 0, "thal": 2
                }
                # Request 1: 200 OK
                res1 = client.post("/whatif", json=payload)
                assert res1.status_code == 200

                # Request 2: 200 OK
                res2 = client.post("/whatif", json=payload)
                assert res2.status_code == 200

                # Request 3: Exceeds limit (2) -> 429 Too Many Requests
                res3 = client.post("/whatif", json=payload)
                assert res3.status_code == 429
                assert "Retry-After" in res3.headers
                data3 = res3.json()
                detail = data3.get("detail", {})
                if isinstance(detail, dict):
                    assert "Too many requests" in detail.get("error", "")
                    assert "retry_after" in detail
                else:
                    assert "Too many requests" in str(detail)

    rate_limiter_storage.reset()


def test_rate_limiter_disabled_flag(client):
    rate_limiter_storage.reset()
    with patch.object(settings, "RATE_LIMIT_ENABLED", False):
        with patch.object(settings, "RATE_LIMIT_WHATIF", 1):
            payload = {
                "age": 55, "sex": 1, "cp": 0, "trestbps": 130, "chol": 240,
                "fbs": 0, "restecg": 0, "thalach": 150, "exang": 0,
                "oldpeak": 1.2, "slope": 1, "ca": 0, "thal": 2
            }
            # Both requests should succeed because rate limiter is disabled
            res1 = client.post("/whatif", json=payload)
            assert res1.status_code == 200
            res2 = client.post("/whatif", json=payload)
            assert res2.status_code == 200

    rate_limiter_storage.reset()


def test_proxy_header_anti_spoofing(client):
    """
    Prove that client-supplied spoofed X-Forwarded-For headers cannot bypass rate limits.
    With TRUSTED_PROXY_HOPS=1 (Render setup), client IP is extracted from the rightmost
    proxy hop, so changing injected prefixes does not evade the rate limit.
    """
    rate_limiter_storage.reset()
    payload = {
        "age": 55, "sex": 1, "cp": 0, "trestbps": 130, "chol": 240,
        "fbs": 0, "restecg": 0, "thalach": 150, "exang": 0,
        "oldpeak": 1.2, "slope": 1, "ca": 0, "thal": 2
    }
    with patch.object(settings, "RATE_LIMIT_ENABLED", True):
        with patch.object(settings, "TRUSTED_PROXY_HOPS", 1):
            with patch.object(settings, "RATE_LIMIT_WHATIF", 2):
                real_client_ip = "198.51.100.42"

                # Request 1: Attacker sends fake prefix 1.1.1.1
                h1 = {"X-Forwarded-For": f"1.1.1.1, {real_client_ip}"}
                r1 = client.post("/whatif", json=payload, headers=h1)
                assert r1.status_code == 200

                # Request 2: Attacker sends fake prefix 2.2.2.2
                h2 = {"X-Forwarded-For": f"2.2.2.2, {real_client_ip}"}
                r2 = client.post("/whatif", json=payload, headers=h2)
                assert r2.status_code == 200

                # Request 3: Attacker tries fake prefix 3.3.3.3 -> MUST be blocked with 429
                # because the rightmost IP (198.51.100.42) hit its limit of 2!
                h3 = {"X-Forwarded-For": f"3.3.3.3, {real_client_ip}"}
                r3 = client.post("/whatif", json=payload, headers=h3)
                assert r3.status_code == 429
                assert "Retry-After" in r3.headers

    rate_limiter_storage.reset()


def test_direct_connection_untrusted_forwarded_headers(client):
    """
    When TRUSTED_PROXY_HOPS=0 (direct connection / untrusted proxy),
    all X-Forwarded-For headers are disregarded and peer socket is used.
    """
    rate_limiter_storage.reset()
    payload = {
        "age": 55, "sex": 1, "cp": 0, "trestbps": 130, "chol": 240,
        "fbs": 0, "restecg": 0, "thalach": 150, "exang": 0,
        "oldpeak": 1.2, "slope": 1, "ca": 0, "thal": 2
    }
    with patch.object(settings, "RATE_LIMIT_ENABLED", True):
        with patch.object(settings, "TRUSTED_PROXY_HOPS", 0):
            with patch.object(settings, "RATE_LIMIT_WHATIF", 2):
                # Client tries sending different X-Forwarded-For IPs
                r1 = client.post("/whatif", json=payload, headers={"X-Forwarded-For": "10.0.0.1"})
                assert r1.status_code == 200
                r2 = client.post("/whatif", json=payload, headers={"X-Forwarded-For": "10.0.0.2"})
                assert r2.status_code == 200

                # Request 3 with yet another fake IP is blocked because socket IP ('testclient') hit limit
                r3 = client.post("/whatif", json=payload, headers={"X-Forwarded-For": "10.0.0.3"})
                assert r3.status_code == 429

    rate_limiter_storage.reset()


def test_authenticated_user_identity_keying(client, db_session):
    """
    Authenticated endpoints key by user ID, so User A and User B sharing the same IP
    have distinct quotas and do not starve each other.
    """
    from app.models.user import User
    from app.core.security import hash_password, create_access_token

    rate_limiter_storage.reset()
    u1 = User(name="User One", email="user1@example.com", password_hash=hash_password("pw1"), is_verified=True)
    u2 = User(name="User Two", email="user2@example.com", password_hash=hash_password("pw2"), is_verified=True)
    db_session.add(u1)
    db_session.add(u2)
    db_session.commit()
    db_session.refresh(u1)
    db_session.refresh(u2)

    t1 = create_access_token(subject=u1.id)
    t2 = create_access_token(subject=u2.id)

    payload = {
        "age": 50, "sex": 1, "cp": 0, "trestbps": 120, "chol": 200, "fbs": 0,
        "restecg": 0, "thalach": 140, "exang": 0, "oldpeak": 1.0, "slope": 1,
        "ca": 0, "thal": 2, "model": "random_forest"
    }

    with patch.object(settings, "RATE_LIMIT_ENABLED", True):
        with patch.object(settings, "RATE_LIMIT_PREDICT", 2):
            # User 1 makes 2 predict requests from 'testclient' IP
            r1 = client.post("/predict", json=payload, headers={"Authorization": f"Bearer {t1}"})
            assert r1.status_code == 200
            r2 = client.post("/predict", json=payload, headers={"Authorization": f"Bearer {t1}"})
            assert r2.status_code == 200

            # User 1 makes 3rd request -> hits 429
            r3 = client.post("/predict", json=payload, headers={"Authorization": f"Bearer {t1}"})
            assert r3.status_code == 429

            # User 2 from the EXACT SAME IP makes a predict request -> succeeds (200 OK)!
            # Proves User 1's limit did not block User 2!
            r4 = client.post("/predict", json=payload, headers={"Authorization": f"Bearer {t2}"})
            assert r4.status_code == 200

    rate_limiter_storage.reset()


def test_rate_limit_login(client):
    rate_limiter_storage.reset()
    with patch.object(settings, "RATE_LIMIT_ENABLED", True):
        with patch.object(settings, "RATE_LIMIT_LOGIN", 2):
            with patch("app.api.auth.turnstile_service.verify_token", return_value=(True, None)):
                body = {"email": "nobody@example.com", "password": "wrong", "turnstile_token": "mock"}
                r1 = client.post("/auth/login", json=body)
                assert r1.status_code == 401
                r2 = client.post("/auth/login", json=body)
                assert r2.status_code == 401
                r3 = client.post("/auth/login", json=body)
                assert r3.status_code == 429
                assert "Retry-After" in r3.headers

    rate_limiter_storage.reset()


def test_rate_limit_register(client):
    rate_limiter_storage.reset()
    with patch.object(settings, "RATE_LIMIT_ENABLED", True):
        with patch.object(settings, "RATE_LIMIT_REGISTER", 2):
            with patch("app.api.auth.turnstile_service.verify_token", return_value=(True, None)):
                body = {"name": "Test", "email": "reg@example.com", "password": "short", "turnstile_token": "mock"}
                r1 = client.post("/auth/register", json=body)
                assert r1.status_code == 400
                r2 = client.post("/auth/register", json=body)
                assert r2.status_code == 400
                r3 = client.post("/auth/register", json=body)
                assert r3.status_code == 429

    rate_limiter_storage.reset()


def test_rate_limit_chat(client, auth_headers):
    import json
    from unittest.mock import MagicMock
    rate_limiter_storage.reset()

    mock_resp = MagicMock()
    mock_resp.__enter__.return_value = mock_resp
    mock_resp.read.return_value = json.dumps({"choices": [{"message": {"content": "ok"}}]}).encode()

    with patch.object(settings, "RATE_LIMIT_ENABLED", True):
        with patch.object(settings, "RATE_LIMIT_CHAT", 2):
            with patch.object(settings, "GROQ_API_KEY", "dummy_key"):
                with patch("app.api.chat.urlopen", return_value=mock_resp):
                    body = {"messages": [{"role": "user", "content": "hi"}]}
                    r1 = client.post("/chat", json=body, headers=auth_headers)
                    assert r1.status_code == 200
                    r2 = client.post("/chat", json=body, headers=auth_headers)
                    assert r2.status_code == 200
                    r3 = client.post("/chat", json=body, headers=auth_headers)
                    assert r3.status_code == 429

    rate_limiter_storage.reset()


def test_rate_limit_forgot_password(client):
    rate_limiter_storage.reset()
    with patch.object(settings, "RATE_LIMIT_ENABLED", True):
        with patch.object(settings, "RATE_LIMIT_FORGOT_PASSWORD", 2):
            r1 = client.post("/auth/forgot-password", json={"email": "nobody@example.com"})
            assert r1.status_code == 200
            r2 = client.post("/auth/forgot-password", json={"email": "nobody@example.com"})
            assert r2.status_code == 200
            r3 = client.post("/auth/forgot-password", json={"email": "nobody@example.com"})
            assert r3.status_code == 429

    rate_limiter_storage.reset()


def test_rate_limit_reset_password(client):
    rate_limiter_storage.reset()
    with patch.object(settings, "RATE_LIMIT_ENABLED", True):
        with patch.object(settings, "RATE_LIMIT_RESET_PASSWORD", 2):
            body = {"token": "invalid_tok", "password": "newpassword123"}
            r1 = client.post("/auth/reset-password", json=body)
            assert r1.status_code == 400
            r2 = client.post("/auth/reset-password", json=body)
            assert r2.status_code == 400
            r3 = client.post("/auth/reset-password", json=body)
            assert r3.status_code == 429

    rate_limiter_storage.reset()


def test_rate_limit_google(client):
    rate_limiter_storage.reset()
    with patch.object(settings, "RATE_LIMIT_ENABLED", True):
        with patch.object(settings, "RATE_LIMIT_GOOGLE", 2):
            body = {"credential": "mock_cred"}
            r1 = client.post("/auth/google", json=body)
            assert r1.status_code in (400, 401)
            r2 = client.post("/auth/google", json=body)
            assert r2.status_code in (400, 401)
            r3 = client.post("/auth/google", json=body)
            assert r3.status_code == 429

    rate_limiter_storage.reset()


def test_rate_limit_turnstile(client):
    rate_limiter_storage.reset()
    with patch.object(settings, "RATE_LIMIT_ENABLED", True):
        with patch.object(settings, "RATE_LIMIT_TURNSTILE", 2):
            with patch("app.api.auth.turnstile_service.verify_token", return_value=(True, None)):
                body = {"turnstile_token": "valid_token"}
                r1 = client.post("/auth/verify-turnstile", json=body)
                assert r1.status_code == 200
                r2 = client.post("/auth/verify-turnstile", json=body)
                assert r2.status_code == 200
                r3 = client.post("/auth/verify-turnstile", json=body)
                assert r3.status_code == 429

    rate_limiter_storage.reset()
