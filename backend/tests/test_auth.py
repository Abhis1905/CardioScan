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
        "password": "ValidPassword123!",
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
        "password": "ValidPassword123!",
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


def test_logout_revokes_jwt_server_side(client, test_user):
    """Test that POST /auth/logout increments token_version and invalidates the session server-side."""
    # 1. Log in to get token
    login_resp = client.post("/auth/login", json={"email": test_user.email, "password": "password123"})
    assert login_resp.status_code == 200
    token = login_resp.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Token works initially
    me_resp = client.get("/auth/me", headers=headers)
    assert me_resp.status_code == 200

    # 3. Perform server-side logout
    logout_resp = client.post("/auth/logout", headers=headers)
    assert logout_resp.status_code == 200
    assert logout_resp.json()["message"] == "Logged out successfully"

    # 4. Same token is now rejected immediately server-side
    me_after_logout = client.get("/auth/me", headers=headers)
    assert me_after_logout.status_code == 401
    assert "Could not validate credentials" in me_after_logout.json()["detail"]

    # 5. User can log in again to receive a fresh token with incremented token_version
    relogin_resp = client.post("/auth/login", json={"email": test_user.email, "password": "password123"})
    assert relogin_resp.status_code == 200
    new_token = relogin_resp.json()["token"]
    assert new_token != token
    assert client.get("/auth/me", headers={"Authorization": f"Bearer {new_token}"}).status_code == 200


def test_password_reset_invalidates_all_active_sessions(client, test_user, db_session):
    """Test that resetting a password increments token_version and revokes all previous JWTs."""
    # 1. Login to obtain an active token
    login_resp = client.post("/auth/login", json={"email": test_user.email, "password": "password123"})
    assert login_resp.status_code == 200
    old_token = login_resp.json()["token"]
    old_headers = {"Authorization": f"Bearer {old_token}"}
    assert client.get("/auth/me", headers=old_headers).status_code == 200

    # 2. Request and execute password reset
    raw_token = create_password_reset_token(test_user, db_session)
    new_pw = "BrandNewSecurePassword123!"
    reset_resp = client.post("/auth/reset-password", json={"token": raw_token, "password": new_pw})
    assert reset_resp.status_code == 200

    # 3. Old token is now rejected
    assert client.get("/auth/me", headers=old_headers).status_code == 401

    # 4. Old password cannot log in
    assert client.post("/auth/login", json={"email": test_user.email, "password": "password123"}).status_code == 401

    # 5. New password logs in with updated token_version
    new_login = client.post("/auth/login", json={"email": test_user.email, "password": new_pw})
    assert new_login.status_code == 200
    new_token = new_login.json()["token"]
    assert client.get("/auth/me", headers={"Authorization": f"Bearer {new_token}"}).status_code == 200


def test_inactive_account_blocked(client, test_user, db_session):
    """Test that deactivated accounts cannot log in or use existing validly-signed tokens."""
    # 1. Log in while active
    login_resp = client.post("/auth/login", json={"email": test_user.email, "password": "password123"})
    assert login_resp.status_code == 200
    token = login_resp.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}
    assert client.get("/auth/me", headers=headers).status_code == 200

    # 2. Deactivate user account
    test_user.is_active = False
    db_session.commit()
    db_session.refresh(test_user)

    # 3. Existing token rejected immediately
    assert client.get("/auth/me", headers=headers).status_code == 401

    # 4. Login attempt rejected with inactive account notice
    login_attempt = client.post("/auth/login", json={"email": test_user.email, "password": "password123"})
    assert login_attempt.status_code == 401
    assert "inactive" in login_attempt.json()["error"].lower()


def test_password_policy_enforcement_on_register(client):
    """Test that register enforces minimum 12 chars, blocklist, diversity, and allows passphrases."""
    # 1. Too short (< 12 chars)
    r1 = client.post("/auth/register", json={"name": "U", "email": "p1@example.com", "password": "short"})
    assert r1.status_code == 400
    assert "at least 12 characters" in r1.json()["error"].lower()

    # 2. Blocklisted common password
    r2 = client.post("/auth/register", json={"name": "U", "email": "p2@example.com", "password": "password12345"})
    assert r2.status_code == 400
    assert "common or easily guessable" in r2.json()["error"].lower()

    # 3. Low character diversity
    r3 = client.post("/auth/register", json={"name": "U", "email": "p3@example.com", "password": "aaaaaaaaaaaa"})
    assert r3.status_code == 400
    assert "too simple" in r3.json()["error"].lower()

    # 4. Trivial root with trailing symbols
    r4 = client.post("/auth/register", json={"name": "U", "email": "p4@example.com", "password": "password999999!"})
    assert r4.status_code == 400
    assert "common or easily guessable" in r4.json()["error"].lower()

    # 5. Multi-word passphrase with spaces is accepted
    r5 = client.post("/auth/register", json={"name": "Passphrase User", "email": "passphrase@example.com", "password": "correct horse battery staple"})
    assert r5.status_code == 201
    assert "Registration successful" in r5.json()["message"]


def test_password_policy_enforcement_on_reset(client, test_user, db_session):
    """Test that reset-password endpoint also strictly enforces the strong password policy."""
    raw_token = create_password_reset_token(test_user, db_session)

    # 1. Reset with short password fails
    r_short = client.post("/auth/reset-password", json={"token": raw_token, "password": "short"})
    assert r_short.status_code == 400
    assert "at least 12 characters" in r_short.json()["error"].lower()

    # 2. Reset with common password fails
    r_common = client.post("/auth/reset-password", json={"token": raw_token, "password": "password12345"})
    assert r_common.status_code == 400
    assert "common or easily guessable" in r_common.json()["error"].lower()

    # 3. Reset with valid strong password succeeds
    r_valid = client.post("/auth/reset-password", json={"token": raw_token, "password": "ValidStrongPassword2026!"})
    assert r_valid.status_code == 200
    assert "Password reset successfully" in r_valid.json()["message"]


def test_password_policy_whitespace_padding_and_passphrase(client, db_session):
    """SEC-02-01: Whitespace padding cannot bypass min length; internal passphrase spaces are preserved."""
    # 1. Padded short passwords (< 12 chars when stripped) must be rejected
    r1 = client.post("/auth/register", json={"name": "Padded", "email": "pad1@example.com", "password": "      cat   "})
    assert r1.status_code == 400
    assert "at least 12 characters" in r1.json()["error"].lower()

    r2 = client.post("/auth/register", json={"name": "Padded", "email": "pad2@example.com", "password": "         abc"})
    assert r2.status_code == 400
    assert "at least 12 characters" in r2.json()["error"].lower()

    # 2. Padded blocklisted password rejected
    r3 = client.post("/auth/register", json={"name": "Padded", "email": "pad3@example.com", "password": "   password12345   "})
    assert r3.status_code == 400
    assert "common or easily guessable" in r3.json()["error"].lower()

    # 3. Multi-word passphrase with internal spaces is preserved in hash
    passphrase = "correct horse battery staple"
    r4 = client.post("/auth/register", json={"name": "Passphrase User", "email": "passphrase_exact@example.com", "password": passphrase})
    assert r4.status_code == 201

    user = db_session.query(User).filter(User.email == "passphrase_exact@example.com").first()
    user.is_verified = True
    db_session.commit()

    # Exact passphrase logs in
    login_ok = client.post("/auth/login", json={"email": user.email, "password": passphrase})
    assert login_ok.status_code == 200

    # Passphrase without internal spaces is rejected
    login_fail = client.post("/auth/login", json={"email": user.email, "password": "correcthorsebatterystaple"})
    assert login_fail.status_code == 401


def test_password_length_boundary_128_and_129(client, test_user, db_session):
    """SEC-02-09: 128 chars is accepted; 129 chars is rejected on registration and reset."""
    pw_128 = "A" * 32 + "b" * 32 + "1" * 32 + "!" * 32  # length 128, diverse
    pw_129 = pw_128 + "x"  # length 129

    # 1. 129 chars on register -> rejected
    r_reg_129 = client.post("/auth/register", json={"name": "Boundary", "email": "b129@example.com", "password": pw_129})
    assert r_reg_129.status_code == 400
    assert "cannot exceed 128 characters" in r_reg_129.json()["error"].lower()

    # 2. 128 chars on register -> accepted
    r_reg_128 = client.post("/auth/register", json={"name": "Boundary", "email": "b128@example.com", "password": pw_128})
    assert r_reg_128.status_code == 201

    # 3. 129 chars on reset -> rejected
    raw_token = create_password_reset_token(test_user, db_session)
    r_reset_129 = client.post("/auth/reset-password", json={"token": raw_token, "password": pw_129})
    assert r_reset_129.status_code == 400
    assert "cannot exceed 128 characters" in r_reset_129.json()["error"].lower()

    # 4. 128 chars on reset -> accepted
    r_reset_128 = client.post("/auth/reset-password", json={"token": raw_token, "password": pw_128})
    assert r_reset_128.status_code == 200
    assert "Password reset successfully" in r_reset_128.json()["message"]


def test_inactive_account_forgot_and_reset_flow(client, test_user, db_session):
    """SEC-02-02: Inactive accounts cannot reset credentials or trigger password reset emails."""
    from app.services.email import email_service
    test_user.is_active = False
    db_session.commit()

    with patch.object(email_service, "send_password_reset_email") as mock_email:
        # 1. Forgot password returns generic benign response
        resp = client.post("/auth/forgot-password", json={"email": test_user.email})
        assert resp.status_code == 200
        assert "If this email is registered" in resp.json()["message"]
        # No email sent and no token created in DB
        assert mock_email.called is False
        db_session.refresh(test_user)
        assert test_user.reset_token_hash is None

    # 2. Even if a reset token existed prior to deactivation, reset-password fails closed
    raw_token = create_password_reset_token(test_user, db_session)
    reset_resp = client.post("/auth/reset-password", json={"token": raw_token, "password": "NewStrongPass2026!"})
    assert reset_resp.status_code == 401
    assert "inactive" in reset_resp.json()["error"].lower()


def test_inactive_account_email_verification_flow(client, test_user, db_session):
    """SEC-02-02: Inactive accounts cannot verify email or resend verification emails."""
    from app.services.email import email_service
    test_user.is_active = False
    test_user.is_verified = False
    raw_token = create_verification_token(test_user, db_session)

    # 1. Verify email returns 401 Unauthorized, does not issue token
    res = client.get(f"/auth/verify-email?token={raw_token}")
    assert res.status_code == 401
    assert "inactive" in res.json()["error"].lower()

    # 2. Resend verification returns benign message without sending email
    with patch.object(email_service, "send_verification_email") as mock_email:
        resend_resp = client.post("/auth/resend-verification", json={"email": test_user.email})
        assert resend_resp.status_code == 200
        assert "If this email is registered" in resend_resp.json()["message"]
        assert mock_email.called is False


def test_logout_rate_limiting(client, test_user):
    """SEC-02-03: POST /auth/logout is rate-limited to 20 calls per 60s."""
    from app.core.rate_limiter import rate_limiter_storage
    rate_limiter_storage.reset()

    # Log in to get token
    login_resp = client.post("/auth/login", json={"email": test_user.email, "password": "password123"})
    assert login_resp.status_code == 200
    token = login_resp.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    # First call succeeds
    res1 = client.post("/auth/logout", headers=headers)
    assert res1.status_code == 200

    # Next 19 calls (within 60s) consume remaining quota
    for _ in range(19):
        client.post("/auth/logout", headers=headers)

    # 21st call hits rate limit 429
    res_limited = client.post("/auth/logout", headers=headers)
    assert res_limited.status_code == 429
    assert "Too many requests" in res_limited.json()["detail"]["error"]

    rate_limiter_storage.reset()


