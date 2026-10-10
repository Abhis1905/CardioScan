from unittest.mock import patch
from app.core.config import settings
from app.models.cleanup import PendingFirebaseCleanup
from app.models.prediction import Prediction
from app.models.user import User
from app.services.firebase_auth import firebase_auth_service


def test_firebase_auth_missing_token(client):
    """Verify that requests with missing or empty tokens are rejected."""
    res = client.post("/auth/firebase", json={})
    assert res.status_code == 400
    assert "required" in res.json()["error"].lower()

    res2 = client.post("/auth/firebase", json={"id_token": "short"})
    assert res2.status_code == 400
    assert "at least 10" in res2.json()["error"].lower() or "invalid" in res2.json()["error"].lower()


def test_firebase_auth_invalid_token(client):
    """Verify that cryptographically invalid or expired tokens return 401."""
    with patch("app.api.auth.firebase_auth_service.verify_id_token") as mock_verify:
        mock_verify.return_value = (False, None, "Invalid Firebase token signature.")
        res = client.post("/auth/firebase", json={"id_token": "invalid_mock_token_12345"})
        assert res.status_code == 401
        assert "Invalid Firebase token signature" in res.json()["error"]


def test_firebase_auth_unverified_email_rejected(client):
    """Verify that unverified Firebase users are blocked with 400 and not_verified flag."""
    unverified_claims = {
        "uid": "fb_uid_unverified_1",
        "email": "unverified.user@example.com",
        "email_verified": False,
        "name": "Unverified User",
    }
    with patch("app.api.auth.firebase_auth_service.verify_id_token") as mock_verify:
        mock_verify.return_value = (True, unverified_claims, None)
        res = client.post("/auth/firebase", json={"id_token": "valid_unverified_token_12345"})
        assert res.status_code == 400
        data = res.json()
        assert data.get("not_verified") is True
        assert "verify your email" in data["error"].lower()
        assert data.get("email") == "unverified.user@example.com"


def test_firebase_auth_new_user_success(client, db_session):
    """Verify that a brand new verified Firebase user is provisioned and issued a CardioScan JWT."""
    new_user_claims = {
        "uid": "fb_uid_new_999",
        "email": "new.cardio.user@example.com",
        "email_verified": True,
        "name": "Jane Cardio",
        "picture": "https://example.com/avatar.png",
    }
    with patch("app.api.auth.firebase_auth_service.verify_id_token") as mock_verify:
        mock_verify.return_value = (True, new_user_claims, None)
        res = client.post("/auth/firebase", json={"id_token": "valid_token_for_jane_12345"})
        assert res.status_code == 200
        data = res.json()
        assert "token" in data
        assert data["user"]["email"] == "new.cardio.user@example.com"
        assert data["user"]["name"] == "Jane Cardio"
        assert data["user"]["is_verified"] is True

        # Verify database record
        db_user = db_session.query(User).filter(User.email == "new.cardio.user@example.com").first()
        assert db_user is not None
        assert db_user.firebase_uid == "fb_uid_new_999"
        assert db_user.avatar == "https://example.com/avatar.png"
        assert db_user.is_verified is True

        # Verify issued CardioScan JWT allows accessing /auth/me
        headers = {"Authorization": f"Bearer {data['token']}"}
        me_res = client.get("/auth/me", headers=headers)
        assert me_res.status_code == 200
        assert me_res.json()["id"] == db_user.id


def test_firebase_auth_existing_user_login(client, db_session):
    """Verify that an existing user linked to firebase_uid can log in repeatedly."""
    existing_user = User(
        name="Existing FB User",
        email="existing.fb@example.com",
        firebase_uid="fb_uid_existing_456",
        is_verified=True,
    )
    db_session.add(existing_user)
    db_session.commit()
    db_session.refresh(existing_user)

    claims = {
        "uid": "fb_uid_existing_456",
        "email": "existing.fb@example.com",
        "email_verified": True,
        "name": "Existing FB User",
    }
    with patch("app.api.auth.firebase_auth_service.verify_id_token") as mock_verify:
        mock_verify.return_value = (True, claims, None)
        res = client.post("/auth/firebase", json={"id_token": "token_for_existing_fb_user"})
        assert res.status_code == 200
        data = res.json()
        assert data["user"]["id"] == existing_user.id
        assert data["user"]["email"] == "existing.fb@example.com"


def test_firebase_auth_account_conflict_rejected(client, db_session):
    """
    SECURITY TEST:
    Verify that an existing native account is NEVER automatically linked
    to an incoming Firebase token with matching email.
    Must return 409 Conflict without leaking account data or transferring ownership.
    """
    native_user = User(
        name="Native User",
        email="native.user@example.com",
        password_hash="argon2_hashed_secret",
        firebase_uid=None,  # Not linked
        is_verified=True,
    )
    db_session.add(native_user)
    db_session.commit()
    db_session.refresh(native_user)

    # An attacker or external user tries Firebase with this same email
    conflicting_claims = {
        "uid": "fb_attacker_uid_777",
        "email": "native.user@example.com",
        "email_verified": True,
        "name": "Impostor or Secondary Account",
    }
    with patch("app.api.auth.firebase_auth_service.verify_id_token") as mock_verify:
        mock_verify.return_value = (True, conflicting_claims, None)
        res = client.post("/auth/firebase", json={"id_token": "token_with_same_email_conflict"})
        assert res.status_code == 409
        data = res.json()
        assert data.get("code") == "account_exists_conflict"
        assert "already exists" in data["error"].lower()

        # Database record must NOT be altered or linked!
        db_user = db_session.query(User).filter(User.email == "native.user@example.com").first()
        assert db_user.firebase_uid is None
        assert db_user.password_hash == "argon2_hashed_secret"


def test_firebase_auth_different_uid_conflict_rejected(client, db_session):
    """Verify that an account linked to UID-A cannot be hijacked by UID-B claiming the same email."""
    linked_user = User(
        name="Legit User",
        email="legit.user@example.com",
        firebase_uid="original_legit_uid_111",
        is_verified=True,
    )
    db_session.add(linked_user)
    db_session.commit()

    hijack_claims = {
        "uid": "rogue_uid_222",
        "email": "legit.user@example.com",
        "email_verified": True,
        "name": "Rogue Login",
    }
    with patch("app.api.auth.firebase_auth_service.verify_id_token") as mock_verify:
        mock_verify.return_value = (True, hijack_claims, None)
        res = client.post("/auth/firebase", json={"id_token": "token_with_rogue_uid"})
        assert res.status_code == 409
        assert res.json().get("code") == "account_exists_conflict"

        # Verify UID did not change
        db_user = db_session.query(User).filter(User.email == "legit.user@example.com").first()
        assert db_user.firebase_uid == "original_legit_uid_111"


def test_firebase_google_sign_in_profile_sync(client, db_session):
    """Verify that Google Sign-In via Firebase correctly populates avatar and name."""
    google_claims = {
        "uid": "google_oauth_firebase_uid_888",
        "email": "doctor.google@example.com",
        "email_verified": True,
        "name": "Dr. Google Specialist",
        "picture": "https://lh3.googleusercontent.com/a/specialist_photo.jpg",
    }
    with patch("app.api.auth.firebase_auth_service.verify_id_token") as mock_verify:
        mock_verify.return_value = (True, google_claims, None)
        res = client.post("/auth/firebase", json={"id_token": "google_firebase_token_888"})
        assert res.status_code == 200
        data = res.json()
        assert data["user"]["name"] == "Dr. Google Specialist"
        assert data["user"]["avatar"] == "https://lh3.googleusercontent.com/a/specialist_photo.jpg"


def test_firebase_admin_authorization(client, db_session):
    """Verify that an administrator logging in via Firebase retains full admin authorization."""
    admin_claims = {
        "uid": "firebase_admin_uid_001",
        "email": settings.ADMIN_EMAIL,  # "admin@example.com" in test settings
        "email_verified": True,
        "name": "Firebase System Admin",
    }
    with patch("app.api.auth.firebase_auth_service.verify_id_token") as mock_verify:
        mock_verify.return_value = (True, admin_claims, None)
        res = client.post("/auth/firebase", json={"id_token": "firebase_admin_token_001"})
        assert res.status_code == 200
        admin_jwt = res.json()["token"]

        admin_headers = {"Authorization": f"Bearer {admin_jwt}"}
        # Check admin route
        check_res = client.get("/admin/check", headers=admin_headers)
        assert check_res.status_code == 200
        assert check_res.json()["is_admin"] is True

        # Check stats route
        stats_res = client.get("/admin/stats", headers=admin_headers)
        assert stats_res.status_code == 200
        assert "users" in stats_res.json()


def test_firebase_non_admin_forbidden_from_admin_route(client, db_session):
    """Verify that regular Firebase users are rejected with 403 on admin routes."""
    normal_claims = {
        "uid": "firebase_normal_user_002",
        "email": "regular.patient@example.com",
        "email_verified": True,
        "name": "Regular Patient",
    }
    with patch("app.api.auth.firebase_auth_service.verify_id_token") as mock_verify:
        mock_verify.return_value = (True, normal_claims, None)
        res = client.post("/auth/firebase", json={"id_token": "firebase_normal_token_002"})
        assert res.status_code == 200
        user_jwt = res.json()["token"]

        user_headers = {"Authorization": f"Bearer {user_jwt}"}
        check_res = client.get("/admin/check", headers=user_headers)
        assert check_res.status_code == 403
        assert check_res.json()["detail"] == "Admin access required"


def test_firebase_prediction_history_integrity(client, db_session):
    """Verify that Firebase users can create predictions and retrieve history with preserved integer user_id."""
    claims = {
        "uid": "fb_clinical_user_333",
        "email": "clinical.doctor@example.com",
        "email_verified": True,
        "name": "Clinical Doctor",
    }
    with patch("app.api.auth.firebase_auth_service.verify_id_token") as mock_verify:
        mock_verify.return_value = (True, claims, None)
        auth_res = client.post("/auth/firebase", json={"id_token": "clinical_doctor_token_333"})
        assert auth_res.status_code == 200
        token = auth_res.json()["token"]
        user_id = auth_res.json()["user"]["id"]

        headers = {"Authorization": f"Bearer {token}"}

        # Submit prediction
        clinical_data = {
            "age": 55.0,
            "sex": 1,
            "cp": 2,
            "trestbps": 130.0,
            "chol": 240.0,
            "fbs": 0,
            "restecg": 1,
            "thalach": 150.0,
            "exang": 0,
            "oldpeak": 1.2,
            "slope": 1,
            "ca": 0,
            "thal": 2,
            "model": "random_forest",
        }
        pred_res = client.post("/predict", json=clinical_data, headers=headers)
        assert pred_res.status_code == 200
        pred_data = pred_res.json()
        assert pred_data["saved_id"] is not None

        # Verify prediction is linked to user_id in database
        db_pred = db_session.query(Prediction).filter(Prediction.id == pred_data["saved_id"]).first()
        assert db_pred is not None
        assert db_pred.user_id == user_id

        # Query history
        hist_res = client.get("/history", headers=headers)
        assert hist_res.status_code == 200
        hist_data = hist_res.json()
        assert len(hist_data) >= 1
        assert hist_data[0]["id"] == pred_data["saved_id"]


def test_firebase_account_deletion_success(client, db_session):
    """Verify that deleting an account linked to Firebase calls delete_user and returns 200."""
    claims = {
        "uid": "fb_user_to_delete_999",
        "email": "delete.me@example.com",
        "email_verified": True,
        "name": "Delete Me",
    }
    with patch("app.api.auth.firebase_auth_service.verify_id_token") as mock_verify:
        mock_verify.return_value = (True, claims, None)
        auth_res = client.post("/auth/firebase", json={"id_token": "token_for_delete_999"})
        assert auth_res.status_code == 200
        token = auth_res.json()["token"]
        user_id = auth_res.json()["user"]["id"]

        headers = {"Authorization": f"Bearer {token}"}

        with patch("app.api.auth.firebase_auth_service.delete_user") as mock_delete:
            mock_delete.return_value = True
            del_res = client.delete("/auth/delete-account", headers=headers)
            assert del_res.status_code == 200
            data = del_res.json()
            assert data["message"] == "Account deleted successfully"
            assert data["completed"] is True
            assert data["firebase_cleanup"] == "completed"

            # Assert delete_user was invoked with the user's firebase_uid
            mock_delete.assert_called_once_with("fb_user_to_delete_999")

            # Assert user is deleted from database
            db_user = db_session.query(User).filter(User.id == user_id).first()
            assert db_user is None


def test_firebase_account_deletion_failure_enqueues_durable_retry(client, db_session):
    """Verify that when Firebase Admin delete fails, Neon user is deleted, cleanup is enqueued, and 202 is returned."""
    claims = {
        "uid": "fb_user_failing_cleanup_888",
        "email": "failing.cleanup@example.com",
        "email_verified": True,
        "name": "Failing Cleanup",
    }
    with patch("app.api.auth.firebase_auth_service.verify_id_token") as mock_verify:
        mock_verify.return_value = (True, claims, None)
        auth_res = client.post("/auth/firebase", json={"id_token": "token_failing_cleanup_888"})
        assert auth_res.status_code == 200
        token = auth_res.json()["token"]
        user_id = auth_res.json()["user"]["id"]

        headers = {"Authorization": f"Bearer {token}"}

        with patch("app.api.auth.firebase_auth_service.delete_user") as mock_delete:
            mock_delete.return_value = False
            del_res = client.delete("/auth/delete-account", headers=headers)

            # Returns 202 Accepted, completed: False, cleanup: pending
            assert del_res.status_code == 202
            data = del_res.json()
            assert data["completed"] is False
            assert data["firebase_cleanup"] == "pending"

            # Database user must be cleanly deleted from Neon
            db_user = db_session.query(User).filter(User.id == user_id).first()
            assert db_user is None

            # Durable cleanup record must be present
            pending_item = db_session.query(PendingFirebaseCleanup).filter_by(
                firebase_uid="fb_user_failing_cleanup_888"
            ).first()
            assert pending_item is not None
            assert pending_item.attempts == 1
            assert "failed" in pending_item.last_error.lower() or "uninitialized" in pending_item.last_error.lower()


def test_process_pending_cleanups_retry(db_session):
    """Verify that process_pending_cleanups retries queued deletions and removes completed items."""
    # Insert a dummy pending cleanup item
    item = PendingFirebaseCleanup(
        firebase_uid="fb_retry_uid_777",
        attempts=1,
        last_error="Temporary network issue",
    )
    db_session.add(item)
    db_session.commit()

    # 1. Test failed retry attempt
    with patch.object(firebase_auth_service, "delete_user", return_value=False):
        successful, remaining = firebase_auth_service.process_pending_cleanups(db_session)
        assert successful == 0
        assert remaining >= 1

        db_session.refresh(item)
        assert item.attempts == 2

    # 2. Test successful retry attempt
    with patch.object(firebase_auth_service, "delete_user", return_value=True):
        successful, remaining = firebase_auth_service.process_pending_cleanups(db_session)
        assert successful == 1

        # The item should now be purged from the table
        item_check = db_session.query(PendingFirebaseCleanup).filter_by(
            firebase_uid="fb_retry_uid_777"
        ).first()
        assert item_check is None
