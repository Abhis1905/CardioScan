from datetime import datetime, timedelta
from unittest.mock import patch

from app.models.user import User
from app.services.tokens import create_password_reset_token, create_verification_token


def test_register_success(client, db_session):
    payload = {
        "name": "Jane Doe",
        "email": "jane@example.com",
        "password": "securepassword123",
    }
    response = client.post("/auth/register", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert "Registration successful" in data["message"]
    assert data["email"] == "jane@example.com"

    # Verify created in DB and unverified initially
    user = db_session.query(User).filter(User.email == "jane@example.com").first()
    assert user is not None
    assert user.is_verified is False
    assert user.verify_token_hash is not None


def test_register_duplicate_email(client, test_user):
    payload = {
        "name": "Duplicate User",
        "email": test_user.email,
        "password": "password123",
    }
    response = client.post("/auth/register", json=payload)
    assert response.status_code == 409
    assert response.json()["error"] == "Email already registered"


def test_register_validation_short_password(client):
    payload = {
        "name": "Short Pass",
        "email": "short@example.com",
        "password": "123",
    }
    response = client.post("/auth/register", json=payload)
    assert response.status_code == 400


def test_register_email_failure_rolls_back(client, db_session):
    """Ensure user is deleted if email delivery fails, preventing zombie accounts."""
    payload = {
        "name": "Failed Email User",
        "email": "fail@example.com",
        "password": "password123",
    }
    with patch("app.api.auth.email_service.send_verification_email", return_value=(False, "SMTP Timeout")):
        response = client.post("/auth/register", json=payload)
        assert response.status_code == 500
        assert "Failed to send verification email" in response.json()["error"]

    # Verify user was deleted from DB
    user = db_session.query(User).filter(User.email == "fail@example.com").first()
    assert user is None


def test_login_success(client, test_user):
    payload = {
        "email": test_user.email,
        "password": "password123",
    }
    response = client.post("/auth/login", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "token" in data
    assert data["user"]["email"] == test_user.email
    assert data["user"]["is_verified"] is True


def test_login_invalid_password(client, test_user):
    payload = {
        "email": test_user.email,
        "password": "wrongpassword",
    }
    response = client.post("/auth/login", json=payload)
    assert response.status_code == 401
    assert response.json()["error"] == "Invalid email or password"


def test_login_unverified_account(client, unverified_user):
    payload = {
        "email": unverified_user.email,
        "password": "password123",
    }
    response = client.post("/auth/login", json=payload)
    assert response.status_code == 401
    data = response.json()
    assert data["not_verified"] is True
    assert "Please verify your email" in data["error"]


def test_email_verification_flow(client, unverified_user, db_session):
    raw_token = create_verification_token(unverified_user, db_session)

    # 1. Success
    response = client.get(f"/auth/verify-email?token={raw_token}")
    assert response.status_code == 200
    data = response.json()
    assert "token" in data
    assert data["user"]["is_verified"] is True
    assert "Email verified successfully" in data["message"]

    # 2. Token reuse (single-use semantics)
    response_reuse = client.get(f"/auth/verify-email?token={raw_token}")
    assert response_reuse.status_code == 400
    assert response_reuse.json()["error"] == "Invalid verification link"


def test_email_verification_expired(client, unverified_user, db_session):
    raw_token = create_verification_token(unverified_user, db_session)
    # Set expiration in past
    unverified_user.verify_token_expires = datetime.utcnow() - timedelta(hours=1)
    db_session.commit()

    response = client.get(f"/auth/verify-email?token={raw_token}")
    assert response.status_code == 400
    data = response.json()
    assert data["expired"] is True
    assert "expired" in data["error"].lower()


def test_resend_verification_cooldown_and_already_verified(client, unverified_user, test_user, db_session):
    # Cooldown trigger
    create_verification_token(unverified_user, db_session)
    response_cooldown = client.post("/auth/resend-verification", json={"email": unverified_user.email})
    assert response_cooldown.status_code == 429
    assert "wait" in response_cooldown.json()["error"].lower()

    # Already verified
    response_verified = client.post("/auth/resend-verification", json={"email": test_user.email})
    assert response_verified.status_code == 400
    assert "already verified" in response_verified.json()["error"].lower()

    # Nonexistent email doesn't leak
    response_none = client.post("/auth/resend-verification", json={"email": "nobody@example.com"})
    assert response_none.status_code == 200


def test_password_reset_flow(client, test_user, db_session):
    # 1. Request forgot password
    resp_forgot = client.post("/auth/forgot-password", json={"email": test_user.email})
    assert resp_forgot.status_code == 200

    # Retrieve created token
    db_session.refresh(test_user)
    raw_token = create_password_reset_token(test_user, db_session)

    # 2. Reset with new password
    new_pw = "brandnewpassword123"
    resp_reset = client.post("/auth/reset-password", json={"token": raw_token, "password": new_pw})
    assert resp_reset.status_code == 200
    assert "Password reset successfully" in resp_reset.json()["message"]

    # 3. Token reuse fails
    resp_reuse = client.post("/auth/reset-password", json={"token": raw_token, "password": "anotherpassword"})
    assert resp_reuse.status_code == 400

    # 4. Login works with new password
    login_resp = client.post("/auth/login", json={"email": test_user.email, "password": new_pw})
    assert login_resp.status_code == 200


def test_get_me_and_record_consent(client, auth_headers, test_user):
    resp_me = client.get("/auth/me", headers=auth_headers)
    assert resp_me.status_code == 200
    assert resp_me.json()["email"] == test_user.email

    resp_consent = client.post("/auth/record-consent", headers=auth_headers)
    assert resp_consent.status_code == 200
    assert resp_consent.json()["user"]["consent_given"] is True


def test_delete_account(client, auth_headers, db_session, test_user):
    resp = client.delete("/auth/delete-account", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["message"] == "Account deleted successfully"

    # Confirm user is removed from database
    user = db_session.query(User).filter(User.id == test_user.id).first()
    assert user is None
