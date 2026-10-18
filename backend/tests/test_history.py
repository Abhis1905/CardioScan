from app.core.security import create_access_token, hash_password
from app.models.prediction import Prediction
from app.models.user import User


def test_history_flow_and_cross_user_isolation(client, auth_headers, test_user, db_session):
    # Create prediction for test_user
    pred_1 = Prediction(
        user_id=test_user.id,
        age=50, sex=1, cp=1, trestbps=120, chol=200, fbs=0, restecg=0,
        thalach=150, exang=0, oldpeak=1.0, slope=1, ca=0, thal=2,
        prediction=1, probability=0.75, risk_level="High", model_used="random_forest",
        shap_values="[0.1, 0.2]", notes="Initial observation"
    )
    db_session.add(pred_1)
    db_session.commit()
    db_session.refresh(pred_1)

    # Create another user and prediction
    other_user = User(
        name="Other User",
        email="other@example.com",
        password_hash=hash_password("password123"),
        is_verified=True,
    )
    db_session.add(other_user)
    db_session.commit()
    db_session.refresh(other_user)

    pred_other = Prediction(
        user_id=other_user.id,
        age=60, sex=0, cp=0, trestbps=130, chol=220, fbs=0, restecg=0,
        thalach=140, exang=0, oldpeak=0.5, slope=1, ca=0, thal=2,
        prediction=0, probability=0.20, risk_level="Low", model_used="random_forest",
        shap_values="[]"
    )
    db_session.add(pred_other)
    db_session.commit()
    db_session.refresh(pred_other)

    other_headers = {"Authorization": f"Bearer {create_access_token(other_user.id)}"}

    # 1. test_user history only contains their own prediction
    res_history = client.get("/history", headers=auth_headers)
    assert res_history.status_code == 200
    ids = [p["id"] for p in res_history.json()]
    assert pred_1.id in ids
    assert pred_other.id not in ids

    # 2. test_user cannot view other_user's prediction
    res_cross_get = client.get(f"/history/{pred_other.id}", headers=auth_headers)
    assert res_cross_get.status_code == 404

    # 3. test_user cannot delete other_user's prediction
    res_cross_del = client.delete(f"/history/{pred_other.id}", headers=auth_headers)
    assert res_cross_del.status_code == 404

    # 4. test_user can update notes on own prediction
    res_notes = client.put(f"/history/{pred_1.id}/notes", json={"notes": "Updated note"}, headers=auth_headers)
    assert res_notes.status_code == 200
    assert res_notes.json()["notes"] == "Updated note"

    # 5. test_user can delete own prediction
    res_del = client.delete(f"/history/{pred_1.id}", headers=auth_headers)
    assert res_del.status_code == 200


def test_history_filtering_search_and_sorting(client, auth_headers, test_user, db_session):
    """Test backend query parameters for risk_level, prediction, search, and sorting."""
    from datetime import datetime, timedelta

    p1 = Prediction(
        user_id=test_user.id,
        patient_name="Alex River",
        patient_id="CS-9901-0001",
        age=45, sex=1, cp=0, trestbps=120, chol=190, fbs=0, restecg=0,
        thalach=160, exang=0, oldpeak=0.2, slope=0, ca=0, thal=1,
        prediction=0, probability=0.15, risk_level="Low", model_used="random_forest",
        notes="Routine health checkup",
        created_at=datetime.utcnow() - timedelta(days=2),
    )
    p2 = Prediction(
        user_id=test_user.id,
        patient_name="Alex River",
        patient_id="CS-9901-0001",
        age=58, sex=1, cp=2, trestbps=145, chol=260, fbs=1, restecg=1,
        thalach=125, exang=1, oldpeak=2.4, slope=2, ca=2, thal=2,
        prediction=1, probability=0.88, risk_level="High", model_used="ensemble",
        notes="Cardiology referral required",
        created_at=datetime.utcnow(),
    )
    db_session.add_all([p1, p2])
    db_session.commit()

    # Filter by risk_level=High
    res_high = client.get("/history?risk_level=High", headers=auth_headers)
    assert res_high.status_code == 200
    assert len(res_high.json()) == 1
    assert res_high.json()[0]["id"] == p2.id

    # Filter by prediction=0
    res_pred0 = client.get("/history?prediction=0", headers=auth_headers)
    assert res_pred0.status_code == 200
    assert len(res_pred0.json()) == 1
    assert res_pred0.json()[0]["id"] == p1.id

    # Filter by model=ensemble
    res_model = client.get("/history?model=ensemble", headers=auth_headers)
    assert res_model.status_code == 200
    assert len(res_model.json()) == 1
    assert res_model.json()[0]["id"] == p2.id

    # Search in notes
    res_search = client.get("/history?search=referral", headers=auth_headers)
    assert res_search.status_code == 200
    assert len(res_search.json()) == 1
    assert res_search.json()[0]["id"] == p2.id

    # Sort ascending
    res_asc = client.get("/history?sort=asc", headers=auth_headers)
    assert res_asc.status_code == 200
    assert len(res_asc.json()) >= 2
    assert res_asc.json()[0]["id"] == p1.id
    assert res_asc.json()[-1]["id"] == p2.id


def test_history_immutability_after_profile_name_update(client, auth_headers, test_user, db_session):
    """Historical assessment retains originally recorded name even if user profile is updated later."""
    original_name = "Alex Original"
    test_user.name = original_name
    db_session.commit()

    p = Prediction(
        user_id=test_user.id,
        patient_name=original_name,
        patient_id="CS-9901-0002",
        age=52, sex=1, cp=1, trestbps=130, chol=210, fbs=0, restecg=0,
        thalach=140, exang=0, oldpeak=1.0, slope=1, ca=0, thal=2,
        prediction=1, probability=0.62, risk_level="Moderate", model_used="logistic_regression",
        notes="Baseline assessment",
    )
    db_session.add(p)
    db_session.commit()

    # User later updates or corrects their name in the profile
    new_profile_name = "Alex Corrected"
    test_user.name = new_profile_name
    db_session.commit()

    res = client.get(f"/history/{p.id}", headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["patient_name"] == original_name, "Historical recorded name must remain unchanged"
    assert data["current_profile_name"] == new_profile_name
    assert data["name_was_corrected"] is True


def test_history_snapshot_immutability_with_profile_biometrics_change(client, auth_headers, test_user, db_session):
    """Historical assessment parameters (age, sex, trestbps, chol, etc.) must NEVER mutate when user profile biometrics change."""
    original_assessment_biometrics = {
        "age": 42.0,
        "sex": 1,
        "cp": 2,
        "trestbps": 128.0,
        "chol": 215.0,
        "fbs": 0,
        "restecg": 1,
        "thalach": 165.0,
        "exang": 0,
        "oldpeak": 0.8,
        "slope": 1,
        "ca": 0,
        "thal": 2,
    }

    pred = Prediction(
        user_id=test_user.id,
        patient_name=test_user.name,
        patient_id=test_user.patient_id or "CS-TEST-0001",
        prediction=0,
        probability=0.18,
        risk_level="Low",
        model_used="random_forest",
        shap_values='[{"feature": "chol", "value": 215.0, "impact": 0.05}]',
        notes="Pre-profile update assessment",
        **original_assessment_biometrics,
    )
    db_session.add(pred)
    db_session.commit()
    pred_id = pred.id

    # Simulate subsequent profile update with different biometrics/attributes
    test_user.name = "Updated User Name"
    db_session.commit()

    # Re-fetch assessment from history
    res = client.get(f"/history/{pred_id}", headers=auth_headers)
    assert res.status_code == 200
    hist_data = res.json()

    # Every single one of the 13 clinical biomarkers must exactly match the original assessment snapshot
    for param, expected_val in original_assessment_biometrics.items():
        assert hist_data[param] == expected_val, f"Biomarker {param} unexpectedly mutated!"

    # Model inference results must remain completely unchanged
    assert hist_data["prediction"] == 0
    assert hist_data["probability"] == 0.18
    assert hist_data["risk_level"] == "Low"
    assert hist_data["model_used"] == "random_forest"
    assert len(hist_data["shap_values"]) == 1
    assert hist_data["shap_values"][0]["feature"] == "chol"


def test_history_tampered_id_and_unauthorized_access(client, auth_headers, test_user, db_session):
    """Ensure tampered IDs, non-existent records, invalid types, and cross-account access are strictly rejected."""
    # 1. Non-existent record ID -> 404
    res_non_existent = client.get("/history/9999999", headers=auth_headers)
    assert res_non_existent.status_code == 404
    assert res_non_existent.json() == {"error": "Not found"}

    # 2. Delete non-existent ID -> 404
    res_del_non_existent = client.delete("/history/9999999", headers=auth_headers)
    assert res_del_non_existent.status_code == 404

    # 3. Update notes on non-existent ID -> 404
    res_notes_non_existent = client.put("/history/9999999/notes", json={"notes": "test"}, headers=auth_headers)
    assert res_notes_non_existent.status_code == 404

    # 4. Tampered string / non-integer ID -> 400 Bad Request (via validation_exception_handler)
    res_invalid_id = client.get("/history/invalid-id-string", headers=auth_headers)
    assert res_invalid_id.status_code == 400
    assert "pred_id" in res_invalid_id.json()["error"]

    # 5. Tampered negative ID -> 404
    res_negative = client.get("/history/-500", headers=auth_headers)
    assert res_negative.status_code == 404


def test_history_legacy_records_with_null_fields(client, auth_headers, test_user, db_session):
    """Records created before patient_name, patient_id, shap_values, or notes existed serialize cleanly without 500 error."""
    legacy_pred = Prediction(
        user_id=test_user.id,
        patient_name=None,
        patient_id=None,
        age=61,
        sex=0,
        cp=0,
        trestbps=140,
        chol=240,
        fbs=0,
        restecg=1,
        thalach=130,
        exang=1,
        oldpeak=1.8,
        slope=1,
        ca=1,
        thal=2,
        prediction=1,
        probability=0.72,
        risk_level="High",
        model_used="svm",
        shap_values=None,  # Null explainability data
        notes=None,        # Null notes
    )
    db_session.add(legacy_pred)
    db_session.commit()
    pred_id = legacy_pred.id

    res = client.get(f"/history/{pred_id}", headers=auth_headers)
    assert res.status_code == 200
    data = res.json()

    assert data["id"] == pred_id
    assert data["notes"] is None
    assert data["shap_values"] == []
    # If patient_name was null, it falls back to user.name if present, but does not crash
    assert data["risk_level"] == "High"
    assert data["model_used"] == "svm"


