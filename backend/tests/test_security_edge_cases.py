from datetime import datetime, timedelta
from unittest.mock import patch
import jwt
from sqlalchemy.exc import IntegrityError

from app.core.config import settings
from app.core.security import create_access_token, decode_access_token, hash_password, verify_password, hash_token, generate_secure_token
from app.models.user import User


def test_jwt_expired_token_rejected(client, test_user):
    # Create expired token (1 hour in past)
    expired_token = create_access_token(subject=test_user.id, expires_delta=timedelta(hours=-1))
    
    # Try accessing protected endpoint
    response = client.get("/auth/me", headers={"Authorization": f"Bearer {expired_token}"})
    assert response.status_code == 401
    assert "Could not validate credentials" in response.json()["detail"]


def test_jwt_invalid_signature_rejected(client, test_user):
    # Sign token with wrong secret
    payload = {
        "sub": str(test_user.id),
        "exp": datetime.utcnow() + timedelta(hours=1),
        "iat": datetime.utcnow(),
    }
    fake_token = jwt.encode(payload, "wrong-unauthorized-secret-key-32chars", algorithm="HS256")

    response = client.get("/auth/me", headers={"Authorization": f"Bearer {fake_token}"})
    assert response.status_code == 401


def test_jwt_malformed_token_rejected(client):
    response = client.get("/auth/me", headers={"Authorization": "Bearer malformed.token.value"})
    assert response.status_code == 401


def test_argon2_password_hashing():
    pw = "mysecret123"
    hashed = hash_password(pw)
    assert hashed != pw
    assert hashed.startswith("$argon2id$")
    assert verify_password(pw, hashed) is True
    assert verify_password("wrongpw", hashed) is False
    assert verify_password("", hashed) is False
    assert verify_password(pw, None) is False


def test_token_hash_deterministic():
    token = generate_secure_token()
    h1 = hash_token(token)
    h2 = hash_token(token)
    assert h1 == h2
    assert len(h1) == 64  # SHA-256 hex string


def test_registration_integrity_error_handling(client, db_session):
    """Simulate a concurrency race where db.commit raises IntegrityError on register."""
    payload = {
        "name": "Race User",
        "email": "race@example.com",
        "password": "ValidPassword123!",
    }
    # Mock db.commit on the second call or directly to raise IntegrityError
    with patch("sqlalchemy.orm.Session.commit", side_effect=IntegrityError("statement", "params", "orig")):
        response = client.post("/auth/register", json=payload)
        assert response.status_code == 409
        assert response.json()["error"] == "Email already registered"


def test_jwt_claims_structure_and_ttl():
    """Verify access token contains subject, exp, iat, tv, and jti claims, with 120-minute default TTL."""
    token = create_access_token(subject=42, token_version=3)
    decoded = decode_access_token(token)

    assert decoded is not None
    assert decoded["sub"] == "42"
    assert decoded["tv"] == 3
    assert "jti" in decoded
    assert len(decoded["jti"]) == 16  # 8 bytes in hex
    assert settings.ACCESS_TOKEN_EXPIRE_MINUTES == 120

    # Verify expiration delta is approximately 120 minutes
    exp = decoded["exp"]
    iat = decoded["iat"]
    assert 119 * 60 <= (exp - iat) <= 121 * 60


def test_jwt_missing_token_version_rejected(client, test_user):
    """Tokens signed without the tv claim (legacy/forged tokens) must be rejected."""
    payload = {
        "sub": str(test_user.id),
        "exp": datetime.utcnow() + timedelta(hours=1),
        "iat": datetime.utcnow(),
    }
    unversioned_token = jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)
    res = client.get("/auth/me", headers={"Authorization": f"Bearer {unversioned_token}"})
    assert res.status_code == 401
    assert "Could not validate credentials" in res.json()["detail"]


def test_jwt_mismatched_token_version_rejected(client, test_user):
    """Tokens with an outdated or mismatched tv claim must be rejected."""
    token = create_access_token(subject=test_user.id, token_version=test_user.token_version + 5)
    res = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 401
    assert "Could not validate credentials" in res.json()["detail"]


def test_firebase_token_rejected_on_bearer_auth(client):
    """Firebase RS256 ID tokens cannot be used directly as native Bearer tokens."""
    fake_firebase_token = "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL3NlY3VyZXRva2VuLmdvb2dsZS5jb20vY2FyZGlvc2NhbiIsInN1YiI6ImZiX3VpZF8xMjM0NSJ9.sig"
    res = client.get("/auth/me", headers={"Authorization": f"Bearer {fake_firebase_token}"})
    assert res.status_code == 401


def test_jwt_fail_closed_on_null_user_token_version():
    """SEC-02-05: If user.token_version is unexpectedly NULL or missing, auth fails closed."""
    from unittest.mock import MagicMock
    from app.api.deps import get_current_user_optional
    from fastapi.security import HTTPAuthorizationCredentials

    token = create_access_token(subject=1, token_version=1)

    # 1. User has NULL token_version in DB -> fails closed
    db = MagicMock()
    mock_user = MagicMock()
    mock_user.id = 1
    mock_user.is_active = True
    mock_user.token_version = None
    db.query().filter().first.return_value = mock_user

    auth = HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)
    assert get_current_user_optional(auth=auth, db=db) is None

    # 2. User has token_version=1, but token has tv=None in payload -> fails closed
    with patch("app.api.deps.decode_access_token", return_value={"sub": "1", "tv": None}):
        mock_user.token_version = 1
        assert get_current_user_optional(auth=auth, db=db) is None


def test_logout_atomic_increment(client, test_user, db_session):
    """SEC-02-04: Logout atomically increments token_version."""
    initial_version = test_user.token_version
    token = create_access_token(subject=test_user.id, token_version=initial_version)

    res = client.post("/auth/logout", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200

    db_session.refresh(test_user)
    assert test_user.token_version == initial_version + 1


def test_alembic_offline_sql_generation():
    """SEC-02-07: Alembic offline --sql generation succeeds without requiring live reflection."""
    import os
    import subprocess
    result = subprocess.run(
        ["backend/venv/bin/alembic", "-c", "backend/alembic.ini", "upgrade", "h4c5d6e7f8a9:i5d6e7f8a9b0", "--sql"],
        env=dict(os.environ, PYTHONPATH="backend"),
        capture_output=True,
        text=True,
    )
    assert result.returncode == 0
    assert "ALTER TABLE users ADD COLUMN token_version" in result.stdout
    assert "ALTER TABLE users ADD COLUMN is_active" in result.stdout


