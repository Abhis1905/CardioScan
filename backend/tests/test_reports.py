import re
import pytest
from app.core.security import create_access_token, hash_password
from app.models.prediction import Prediction
from app.models.user import User


@pytest.fixture
def sample_prediction(db_session, test_user):
    pred = Prediction(
        user_id=test_user.id,
        patient_name="Eleanor Vance",
        patient_id="CS-7K9M-4W2P",
        report_id="CS-REP-000042",
        age=54,
        sex=0,
        cp=1,
        trestbps=132,
        chol=228,
        fbs=0,
        restecg=1,
        thalach=155,
        exang=0,
        oldpeak=0.6,
        slope=1,
        ca=0,
        thal=2,
        prediction=0,
        probability=0.22,
        risk_level="Low",
        model_used="random_forest",
        notes="Confidential clinical notes that must never be exposed publicly",
    )
    db_session.add(pred)
    db_session.commit()
    db_session.refresh(pred)
    return pred


def test_unauthenticated_public_verification_redacts_sensitive_fields(client, sample_prediction):
    """
    Public unauthenticated verification confirms document validity, issuer, and ML model,
    but strictly excludes patient identifiers, names, timestamps, risk scores, and probabilities.
    """
    res = client.get(f"/reports/verify/{sample_prediction.report_id}")
    assert res.status_code == 200
    data = res.json()

    # Public verification metadata must be present
    assert data["valid"] is True
    assert data["status"] == "verified"
    assert data["report_id"] == "CS-REP-000042"
    assert data["uhid"] == "CS-REP-000042"
    assert data["model_used"] == "random_forest"
    assert "Random Forest" in data["model_label"]
    assert data["issuer"] == "CardioScan Automated Clinical Registry"
    assert data["verification_type"] == "Registry Log Verification"
    assert "disclaimer" in data
    assert data["access_level"] == "public"
    assert "restricted" in data["message"].lower()

    # CRITICAL PRIVACY CONTROLS: Sensitive fields MUST be absent in unauthenticated public view
    assert "patient_id" not in data
    assert "patient_name" not in data
    assert "patient_masked_name" not in data
    assert "assessment_date" not in data
    assert "risk_level" not in data
    assert "prediction" not in data
    assert "indication" not in data
    assert "probability_percent" not in data
    assert "probability" not in data
    assert "notes" not in data
    assert "trestbps" not in data
    assert "chol" not in data
    assert "thalach" not in data
    assert "oldpeak" not in data
    assert "email" not in data

    # Direct route /reports/{report_id} must have identical redactions
    res_direct = client.get(f"/reports/{sample_prediction.report_id}")
    assert res_direct.status_code == 200
    data_direct = res_direct.json()
    assert "patient_id" not in data_direct
    assert "risk_level" not in data_direct


def test_authenticated_owner_receives_authorized_sensitive_fields(client, test_user, sample_prediction):
    """
    When the authenticated owner requests their own report verification,
    authorized clinical and patient identity fields are provided.
    """
    token = create_access_token(test_user.id)
    headers = {"Authorization": f"Bearer {token}"}

    res = client.get(f"/reports/verify/{sample_prediction.report_id}", headers=headers)
    assert res.status_code == 200
    data = res.json()

    assert data["valid"] is True
    assert data["status"] == "verified"
    assert data["access_level"] == "authorized"
    assert data["is_authenticated_owner"] is True

    # Authorized fields must be present
    assert data["patient_id"] == "CS-7K9M-4W2P"
    assert data["patient_name"] == "Eleanor Vance"
    assert data["patient_masked_name"] != "Eleanor Vance"
    assert "E" in data["patient_masked_name"]
    assert data["assessment_date"] is not None
    assert data["risk_level"] == "Low"
    assert data["prediction"] == 0
    assert data["probability_percent"] == 22
    assert "No Elevated Heart Disease Indication" in data["indication"]

    # Raw biomarkers and clinical notes remain excluded from verification responses
    assert "notes" not in data
    assert "trestbps" not in data
    assert "chol" not in data


def test_cross_user_isolation_non_owner_cannot_access_sensitive_fields(client, db_session, sample_prediction):
    """
    An authenticated user who is NOT the owner of the assessment cannot access
    another user's sensitive patient or risk data via verification.
    """
    other_user = User(
        name="Other User",
        email="other_patient@example.com",
        password_hash=hash_password("password123"),
        is_verified=True,
        role="patient",
    )
    db_session.add(other_user)
    db_session.commit()
    db_session.refresh(other_user)

    other_token = create_access_token(other_user.id)
    headers = {"Authorization": f"Bearer {other_token}"}

    # other_user queries sample_prediction (owned by test_user)
    res = client.get(f"/reports/verify/{sample_prediction.report_id}", headers=headers)
    assert res.status_code == 200
    data = res.json()

    # Confirms public registry existence but denies access to other user's private clinical data
    assert data["valid"] is True
    assert data["status"] == "verified"
    assert data["access_level"] == "public"
    assert data.get("is_authenticated_owner") is not True

    assert "patient_id" not in data
    assert "patient_name" not in data
    assert "patient_masked_name" not in data
    assert "assessment_date" not in data
    assert "risk_level" not in data
    assert "probability_percent" not in data
    assert "prediction" not in data
    assert "indication" not in data


def test_admin_user_can_access_authorized_report_fields(client, db_session, sample_prediction):
    """
    System administrators are authorized to inspect clinical assessment details on reports.
    """
    admin_user = User(
        name="Clinic Admin",
        email="admin_auditor@example.com",
        password_hash=hash_password("adminpw123"),
        is_verified=True,
        role="admin",
    )
    db_session.add(admin_user)
    db_session.commit()
    db_session.refresh(admin_user)

    admin_token = create_access_token(admin_user.id)
    headers = {"Authorization": f"Bearer {admin_token}"}

    res = client.get(f"/reports/verify/{sample_prediction.report_id}", headers=headers)
    assert res.status_code == 200
    data = res.json()

    assert data["access_level"] == "authorized"
    assert data["is_authenticated_owner"] is True
    assert data["patient_id"] == "CS-7K9M-4W2P"
    assert data["risk_level"] == "Low"


def test_unsafe_numeric_lookup_fallback_strictly_rejected(client, sample_prediction):
    """
    Direct numeric primary key lookups (e.g. /reports/verify/1 or /reports/verify/42)
    are strictly rejected with HTTP 404 Not Found to prevent sequential enumeration attacks.
    """
    # 1. Bare prediction primary key ID
    res_bare_id = client.get(f"/reports/verify/{sample_prediction.id}")
    assert res_bare_id.status_code == 404
    data = res_bare_id.json()
    assert data["valid"] is False
    assert data["status"] == "not_found"

    # 2. Integer 1
    res_one = client.get("/reports/verify/1")
    assert res_one.status_code == 404

    # 3. Direct route with bare integer
    res_direct_num = client.get(f"/reports/{sample_prediction.id}")
    assert res_direct_num.status_code == 404


def test_legacy_sequential_report_backward_compatibility(client, test_user, db_session):
    """
    Historical reports that already have formatted sequential IDs (e.g. CS-REP-000007)
    continue to verify safely for backward compatibility without breaking existing QR codes.
    """
    pred_legacy = Prediction(
        user_id=test_user.id,
        patient_name="Jane Record",
        patient_id="CS-9901-0001",
        report_id="CS-REP-000007",
        age=48, sex=1, cp=0, trestbps=120, chol=200, fbs=0, restecg=0,
        thalach=160, exang=0, oldpeak=0.0, slope=0, ca=0, thal=1,
        prediction=0, probability=0.10, risk_level="Low", model_used="logistic_regression",
    )
    db_session.add(pred_legacy)
    db_session.commit()
    db_session.refresh(pred_legacy)

    # 1. Historical QR code scanning using exact canonical report ID works
    res = client.get("/reports/verify/CS-REP-000007")
    assert res.status_code == 200
    assert res.json()["valid"] is True
    assert res.json()["report_id"] == "CS-REP-000007"
    # Unauthenticated requester gets NO patient data
    assert "patient_id" not in res.json()
    assert "risk_level" not in res.json()

    # 2. Bare integer 7 fails (no numeric shortcut)
    res_bare = client.get(f"/reports/verify/{pred_legacy.id}")
    assert res_bare.status_code == 404


def test_unassigned_legacy_report_backward_compatibility(client, test_user, db_session):
    """
    Historical rows where report_id is NULL resolve safely when queried via CS-REP-XXXXXX
    matching their primary key.
    """
    pred_unassigned = Prediction(
        user_id=test_user.id,
        patient_name="Historic Unassigned",
        patient_id="CS-9901-0002",
        report_id=None,
        age=50, sex=1, cp=0, trestbps=120, chol=200, fbs=0, restecg=0,
        thalach=160, exang=0, oldpeak=0.0, slope=0, ca=0, thal=1,
        prediction=0, probability=0.10, risk_level="Low", model_used="logistic_regression",
    )
    db_session.add(pred_unassigned)
    db_session.commit()
    db_session.refresh(pred_unassigned)

    formatted_legacy_id = f"CS-REP-{pred_unassigned.id:06d}"
    res = client.get(f"/reports/verify/{formatted_legacy_id}")
    assert res.status_code == 200
    assert res.json()["valid"] is True
    assert res.json()["report_id"] == formatted_legacy_id


def test_verify_nonexistent_and_invalid_report_ids(client):
    """Nonexistent, empty, or invalid report IDs return 404 Not Found."""
    # Non-existent report ID
    res_404 = client.get("/reports/verify/CS-REP-999999")
    assert res_404.status_code == 404
    data_404 = res_404.json()
    assert data_404["valid"] is False
    assert data_404["status"] == "not_found"

    # Garbage / malformed ID
    res_malformed = client.get("/reports/verify/invalid!@#$%^&*()")
    assert res_malformed.status_code == 404

    # Extremely long string
    res_long = client.get(f"/reports/verify/{'A' * 100}")
    assert res_long.status_code == 404


def test_new_predictions_receive_cryptographically_secure_random_ids(client, auth_headers, db_session):
    """
    Newly created predictions receive cryptographically secure, unguessable report IDs
    that do not correspond to sequential primary keys.
    """
    sample_data = {
        "age": 52.0, "sex": 1, "cp": 2, "trestbps": 128.0, "chol": 215.0,
        "fbs": 0, "restecg": 0, "thalach": 158.0, "exang": 0, "oldpeak": 0.8,
        "slope": 1, "ca": 0, "thal": 2, "model": "random_forest"
    }

    res1 = client.post("/predict", json=sample_data, headers=auth_headers)
    assert res1.status_code == 200
    rep_id_1 = res1.json()["report_id"]
    saved_id_1 = res1.json()["saved_id"]

    # 1. Format: CS-REP-<20 hex chars> (total length 27)
    assert rep_id_1.startswith("CS-REP-")
    assert len(rep_id_1) == 27
    # 2. Must NOT be the sequential primary key
    assert rep_id_1 != f"CS-REP-{saved_id_1:06d}"
    # 3. Hexadecimal entropy
    random_part = rep_id_1.replace("CS-REP-", "")
    assert re.match(r"^[0-9A-F]{20}$", random_part)

    # 4. Successive predictions receive distinct random IDs
    res2 = client.post("/predict", json=sample_data, headers=auth_headers)
    assert res2.status_code == 200
    rep_id_2 = res2.json()["report_id"]
    assert rep_id_1 != rep_id_2

    # 5. DB record has matching report_id
    pred_in_db = db_session.query(Prediction).filter(Prediction.id == saved_id_1).first()
    assert pred_in_db.report_id == rep_id_1


def test_report_verification_rate_limiting(client, sample_prediction):
    """
    Report verification endpoint enforces sliding-window rate limiting against rapid scraping.
    """
    from unittest.mock import patch
    from app.core.config import settings
    from app.core.rate_limiter import rate_limiter_storage

    rate_limiter_storage.reset()
    with patch.object(settings, "RATE_LIMIT_ENABLED", True):
        with patch.object(settings, "RATE_LIMIT_REPORTS", 3):
            with patch.object(settings, "RATE_LIMIT_REPORTS_WINDOW", 60):
                url = f"/reports/verify/{sample_prediction.report_id}"
                assert client.get(url).status_code == 200
                assert client.get(url).status_code == 200
                assert client.get(url).status_code == 200

                # 4th request exceeds limit -> 429 Too Many Requests
                res4 = client.get(url)
                assert res4.status_code == 429
                assert "Retry-After" in res4.headers
                assert "exceeded" in res4.text.lower()
