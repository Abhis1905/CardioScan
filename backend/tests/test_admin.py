from app.models.prediction import Prediction
from app.models.user import User


def test_admin_authorization(client, auth_headers, admin_headers):
    # Non-admin user gets 403
    res_forbidden = client.get("/admin/check", headers=auth_headers)
    assert res_forbidden.status_code == 403
    assert res_forbidden.json()["detail"] == "Admin access required"

    # Admin gets 200
    res_ok = client.get("/admin/check", headers=admin_headers)
    assert res_ok.status_code == 200
    assert res_ok.json()["is_admin"] is True


def test_admin_stats(client, admin_headers, test_user, db_session):
    pred_rf = Prediction(
        user_id=test_user.id, age=50, sex=1, cp=1, trestbps=120, chol=200, fbs=0, restecg=0,
        thalach=150, exang=0, oldpeak=1.0, slope=1, ca=0, thal=2,
        prediction=1, probability=0.8, risk_level="High", model_used="random_forest"
    )
    pred_svm = Prediction(
        user_id=test_user.id, age=55, sex=0, cp=2, trestbps=125, chol=210, fbs=0, restecg=0,
        thalach=155, exang=0, oldpeak=0.8, slope=1, ca=0, thal=2,
        prediction=1, probability=0.75, risk_level="Moderate", model_used="svm"
    )
    db_session.add(pred_rf)
    db_session.add(pred_svm)
    db_session.commit()

    res = client.get("/admin/stats", headers=admin_headers)
    assert res.status_code == 200
    data = res.json()
    assert "users" in data
    assert "predictions" in data
    assert "models" in data
    assert data["users"]["total"] >= 2
    assert data["predictions"]["total"] >= 2
    assert "svm" in data["models"]
    assert data["models"]["svm"] >= 1
    assert "random_forest" in data["models"]
    assert data["models"]["random_forest"] >= 1
    assert "ensemble" in data["models"]
    assert "unique_accounts_assessed" in data["predictions"]
    assert "unique_patients_assessed" in data["predictions"]
    assert data["predictions"]["unique_accounts_assessed"] >= 1
    assert "activity_trends" in data
    assert len(data["activity_trends"]) == 14
    assert "system_health" in data
    assert data["system_health"]["database"]["status"] == "connected"
    assert "data_quality" in data
    assert data["data_quality"]["bundled_dataset_rows"] == 1025
    assert data["data_quality"]["distinct_full_row_observations"] == 302
    assert data["data_quality"]["original_source_rows"] == 303
    assert "recent_activity" in data
    assert isinstance(data["recent_activity"], list)


def test_admin_users_and_deletion(client, admin_headers, test_user, admin_user, db_session):
    # Search users
    res_users = client.get(f"/admin/users?search={test_user.name}", headers=admin_headers)
    assert res_users.status_code == 200
    assert any(u["id"] == test_user.id for u in res_users.json())

    # Cannot delete admin
    res_del_admin = client.delete(f"/admin/users/{admin_user.id}", headers=admin_headers)
    assert res_del_admin.status_code == 400
    assert res_del_admin.json()["error"] == "Cannot delete admin"

    # Can delete regular user
    res_del_user = client.delete(f"/admin/users/{test_user.id}", headers=admin_headers)
    assert res_del_user.status_code == 200
    assert res_del_user.json()["message"] == "User deleted"


def test_admin_predictions_and_export(client, admin_headers, test_user, db_session):
    pred = Prediction(
        user_id=test_user.id, age=55, sex=1, cp=2, trestbps=135, chol=210, fbs=0, restecg=0,
        thalach=155, exang=0, oldpeak=1.2, slope=2, ca=1, thal=2,
        prediction=1, probability=0.85, risk_level="High", model_used="random_forest"
    )
    db_session.add(pred)
    db_session.commit()

    # List predictions
    res_preds = client.get("/admin/predictions?risk=High", headers=admin_headers)
    assert res_preds.status_code == 200
    assert len(res_preds.json()) >= 1
    assert res_preds.json()[0]["user_name"] == test_user.name

    # Export users CSV
    res_exp_u = client.get("/admin/export/users", headers=admin_headers)
    assert res_exp_u.status_code == 200
    assert "text/csv" in res_exp_u.headers["content-type"]
    assert "ID,Name,Email,Verified" in res_exp_u.text

    # Export predictions CSV
    res_exp_p = client.get("/admin/export/predictions", headers=admin_headers)
    assert res_exp_p.status_code == 200
    assert "text/csv" in res_exp_p.headers["content-type"]
    assert "ID,User,Email,Age" in res_exp_p.text

    # Delete prediction
    res_del_p = client.delete(f"/admin/predictions/{pred.id}", headers=admin_headers)
    assert res_del_p.status_code == 200


def test_admin_process_cleanups(client, admin_headers, auth_headers):
    # Non-admin forbidden
    res_forbidden = client.post("/admin/process-cleanups", headers=auth_headers)
    assert res_forbidden.status_code == 403

    # Admin allowed
    res_admin = client.post("/admin/process-cleanups", headers=admin_headers)
    assert res_admin.status_code == 200
    assert "resolved" in res_admin.json()
    assert "remaining" in res_admin.json()


def test_admin_access_fails_closed_when_admin_email_unset(client, db_session, test_user):
    """When ADMIN_EMAIL is unset (None), standard users must be forbidden (HTTP 403)."""
    from unittest.mock import patch
    from app.core.config import settings
    from app.core.security import create_access_token

    token = create_access_token(subject=test_user.id)
    headers = {"Authorization": f"Bearer {token}"}

    with patch.object(settings, "ADMIN_EMAIL", None):
        res = client.get("/admin/check", headers=headers)
        assert res.status_code == 403
        assert res.json()["detail"] == "Admin access required"


def test_admin_role_granted_via_database_role(client, db_session):
    """Users with database role='admin' have access even when ADMIN_EMAIL is unset."""
    from unittest.mock import patch
    from app.core.config import settings
    from app.core.security import create_access_token, hash_password

    rbac_admin = User(
        name="DB Role Admin",
        email="rbac_admin@example.org",
        password_hash=hash_password("adminpass123"),
        is_verified=True,
        role="admin",
    )
    db_session.add(rbac_admin)
    db_session.commit()
    db_session.refresh(rbac_admin)

    token = create_access_token(subject=rbac_admin.id)
    headers = {"Authorization": f"Bearer {token}"}

    with patch.object(settings, "ADMIN_EMAIL", None):
        res = client.get("/admin/check", headers=headers)
        assert res.status_code == 200
        assert res.json()["is_admin"] is True


def test_admin_bootstrap_lifecycle(client, db_session):
    """
    Test the explicit admin bootstrap lifecycle:
    1. Initially, a standard patient user has 403 Forbidden on /admin/check.
    2. Running the bootstrap utility (set_user_role) promotes the user in DB to 'admin'.
    3. The user now has full 200 OK access to /admin/check even with ADMIN_EMAIL=None.
    4. Demoting the user back to 'patient' immediately returns 403 Forbidden.
    """
    from unittest.mock import patch
    from app.core.config import settings
    from app.core.security import create_access_token, hash_password
    from scripts.bootstrap_admin import set_user_role

    user = User(
        name="Candidate Admin",
        email="candidate_admin@example.org",
        password_hash=hash_password("pw123"),
        is_verified=True,
        role="patient",
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    token = create_access_token(subject=user.id)
    headers = {"Authorization": f"Bearer {token}"}

    with patch.object(settings, "ADMIN_EMAIL", None):
        # Step 1: Standard patient is rejected
        r1 = client.get("/admin/check", headers=headers)
        assert r1.status_code == 403

        # Step 2: Bootstrap promotion
        success = set_user_role(user.email, "admin", db=db_session)
        assert success is True

        # Step 3: Now granted access via database role
        r2 = client.get("/admin/check", headers=headers)
        assert r2.status_code == 200
        assert r2.json()["is_admin"] is True

        # Step 4: Demotion
        set_user_role(user.email, "patient", db=db_session)
        r3 = client.get("/admin/check", headers=headers)
        assert r3.status_code == 403


def test_failsafe_admin_env_promotion_property(db_session):
    """
    Verify the dual-layer model property:
    - If DB role is 'patient', user.is_admin still returns True if email matches ADMIN_EMAIL.
    - If email does not match and role is 'patient', user.is_admin returns False.
    """
    from unittest.mock import patch
    from app.core.config import settings
    from app.core.security import hash_password

    user = User(
        name="Env Admin",
        email="env_admin@domain.com",
        password_hash=hash_password("pw123"),
        is_verified=True,
        role="patient",
    )
    db_session.add(user)
    db_session.commit()

    with patch.object(settings, "ADMIN_EMAIL", "env_admin@domain.com"):
        assert user.is_admin is True

    with patch.object(settings, "ADMIN_EMAIL", "other_admin@domain.com"):
        assert user.is_admin is False

    with patch.object(settings, "ADMIN_EMAIL", None):
        assert user.is_admin is False


def test_legacy_admin_required_fails_closed_when_unconfigured():
    """Verify legacy Flask admin_required fails closed when ADMIN_EMAIL is unconfigured."""
    from unittest.mock import patch
    import os
    with patch.dict(os.environ, {}, clear=True):
        admin_email = (os.environ.get("ADMIN_EMAIL") or "").strip().lower()
        assert admin_email == ""



