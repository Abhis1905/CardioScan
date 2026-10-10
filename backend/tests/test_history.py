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
