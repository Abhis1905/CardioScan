import pytest
from app.models.prediction import Prediction
from app.models.user import User


def test_verify_existing_valid_report(client, test_user, db_session):
    """Public verification of a persisted assessment record returns verification metadata without sensitive clinical biomarkers."""
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

    # 1. Verify via /reports/verify/{report_id}
    res = client.get("/reports/verify/CS-REP-000042")
    assert res.status_code == 200
    data = res.json()

    assert data["valid"] is True
    assert data["status"] == "verified"
    assert data["report_id"] == "CS-REP-000042"
    assert data["uhid"] == "CS-REP-000042"
    assert data["patient_id"] == "CS-7K9M-4W2P"
    # Patient name must be masked for privacy (e.g. E****** V****)
    assert data["patient_masked_name"] != "Eleanor Vance"
    assert "E" in data["patient_masked_name"]
    assert data["risk_level"] == "Low"
    assert data["probability_percent"] == 22
    assert "Random Forest" in data["model_label"]
    assert "registry" in data["disclaimer"].lower()

    # CRITICAL PRIVACY CHECKS: Ensure no private clinical measurements or notes leak
    assert "trestbps" not in data
    assert "chol" not in data
    assert "thalach" not in data
    assert "oldpeak" not in data
    assert "notes" not in data
    assert "Confidential" not in str(data)
    assert "email" not in data

    # 2. Verify identical response via /reports/{report_id}
    res_direct = client.get("/reports/CS-REP-000042")
    assert res_direct.status_code == 200
    assert res_direct.json()["report_id"] == "CS-REP-000042"


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


def test_verify_legacy_report_fallback_resolution(client, test_user, db_session):
    """Legacy or newly backfilled records resolve cleanly via numeric padding."""
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

    # Looking up with direct integer or unpadded ID still safely resolves to the canonical report
    res = client.get(f"/reports/verify/{pred_legacy.id}")
    assert res.status_code == 200
    assert res.json()["report_id"] == "CS-REP-000007"


def test_distinct_reports_receive_distinct_ids_and_stable_reloading(client, test_user, db_session):
    """Different assessments strictly receive different report IDs, and reloading an assessment is completely stable."""
    p1 = Prediction(
        user_id=test_user.id,
        patient_name="User Test",
        patient_id="CS-1111-2222",
        report_id="CS-REP-000088",
        age=50, sex=1, cp=2, trestbps=130, chol=210, fbs=0, restecg=0,
        thalach=140, exang=0, oldpeak=1.0, slope=1, ca=0, thal=2,
        prediction=1, probability=0.65, risk_level="Moderate", model_used="svm",
    )
    p2 = Prediction(
        user_id=test_user.id,
        patient_name="User Test",
        patient_id="CS-1111-2222",
        report_id="CS-REP-000089",
        age=51, sex=1, cp=3, trestbps=135, chol=220, fbs=0, restecg=1,
        thalach=135, exang=1, oldpeak=1.5, slope=2, ca=1, thal=2,
        prediction=1, probability=0.78, risk_level="High", model_used="ensemble",
    )
    db_session.add_all([p1, p2])
    db_session.commit()

    # 1. Distinct IDs
    assert p1.report_id != p2.report_id
    assert p1.to_dict()["report_id"] != p2.to_dict()["report_id"]
    assert p1.to_dict()["uhid"] != p2.to_dict()["uhid"]

    # 2. Patient ID is shared across assessments
    assert p1.patient_id == p2.patient_id == "CS-1111-2222"

    # 3. Stable verification across repeated requests
    res1_a = client.get(f"/reports/verify/{p1.report_id}").json()
    res1_b = client.get(f"/reports/verify/{p1.report_id}").json()
    assert res1_a["report_id"] == res1_b["report_id"] == "CS-REP-000088"
    assert res1_a["risk_level"] == res1_b["risk_level"] == "Moderate"
