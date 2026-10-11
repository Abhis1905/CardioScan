from app.models.prediction import Prediction

SAMPLE_CLINICAL_DATA = {
    "age": 58.0,
    "sex": 1,
    "cp": 2,
    "trestbps": 140.0,
    "chol": 211.0,
    "fbs": 1,
    "restecg": 0,
    "thalach": 165.0,
    "exang": 0,
    "oldpeak": 1.8,
    "slope": 2,
    "ca": 0,
    "thal": 2,
}


def test_predict_random_forest(client):
    payload = {**SAMPLE_CLINICAL_DATA, "model": "random_forest"}
    response = client.post("/predict", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["prediction"] in (0, 1)
    assert 0.0 <= data["probability"] <= 1.0
    assert data["risk_level"] in ("Low", "Moderate", "High")
    assert data["model_used"] == "random_forest"
    assert len(data["shap_values"]) == 13
    assert len(data["feature_names"]) == 13
    assert data["saved_id"] is None  # unauthenticated


def test_predict_logistic_regression(client):
    payload = {**SAMPLE_CLINICAL_DATA, "model": "logistic_regression"}
    response = client.post("/predict", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["model_used"] == "logistic_regression"
    assert len(data["shap_values"]) == 13


def test_predict_knn(client):
    payload = {**SAMPLE_CLINICAL_DATA, "model": "knn"}
    response = client.post("/predict", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["model_used"] == "knn"


def test_predict_svm(client):
    payload = {**SAMPLE_CLINICAL_DATA, "model": "svm"}
    response = client.post("/predict", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["prediction"] in (0, 1)
    assert 0.0 <= data["probability"] <= 1.0
    assert data["risk_level"] in ("Low", "Moderate", "High")
    assert data["model_used"] == "svm"
    assert len(data["shap_values"]) == 13
    assert len(data["feature_names"]) == 13


def test_predict_ensemble(client):
    payload = {**SAMPLE_CLINICAL_DATA, "model": "random_forest", "ensemble": True}
    response = client.post("/predict", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["model_used"] == "ensemble"
    assert "ensemble_results" in data
    assert "votes" in data
    assert "logistic_regression" in data["ensemble_results"]
    assert "random_forest" in data["ensemble_results"]
    assert "knn" in data["ensemble_results"]
    assert data["votes"]["heart_disease"] + data["votes"]["no_disease"] == 3


def test_predict_authenticated_saves_history(client, auth_headers, test_user, db_session):
    payload = {**SAMPLE_CLINICAL_DATA, "model": "random_forest"}
    response = client.post("/predict", json=payload, headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["saved_id"] is not None

    # Check record in DB
    record = db_session.query(Prediction).filter(Prediction.id == data["saved_id"]).first()
    assert record is not None
    assert record.user_id == test_user.id
    assert record.age == 58.0


def test_predict_invalid_inputs(client):
    # Invalid age > 120
    bad_payload = {**SAMPLE_CLINICAL_DATA, "age": 200}
    response = client.post("/predict", json=bad_payload)
    assert response.status_code == 400

    # Negative blood pressure
    bad_bp = {**SAMPLE_CLINICAL_DATA, "trestbps": -10}
    response = client.post("/predict", json=bad_bp)
    assert response.status_code == 400


def test_whatif_analysis(client):
    payload = {**SAMPLE_CLINICAL_DATA, "model": "random_forest"}
    response = client.post("/whatif", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "prediction" in data
    assert "probability" in data
    assert "risk_level" in data


def test_whatif_svm(client):
    payload = {**SAMPLE_CLINICAL_DATA, "model": "svm"}
    response = client.post("/whatif", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["prediction"] in (0, 1)
    assert 0.0 <= data["probability"] <= 1.0
    assert data["risk_level"] in ("Low", "Moderate", "High")
