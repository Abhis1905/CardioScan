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

