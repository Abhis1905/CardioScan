def test_health_root(client):
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"status": "CardioScan API running"}


def test_get_metrics(client):
    response = client.get("/metrics")
    assert response.status_code == 200
    data = response.json()
    assert "logistic_regression" in data
    assert "random_forest" in data
    assert "knn" in data
    assert "svm" in data

    rf = data["random_forest"]
    assert "accuracy" in rf
    assert "auc" in rf
    assert "precision" in rf
    assert "recall" in rf
    assert "f1" in rf
    assert "confusion_matrix" in rf
    assert "roc_curve" in rf


def test_get_model_metrics(client):
    response = client.get("/metrics/random_forest")
    assert response.status_code == 200
    assert response.json()["name"] == "Random Forest"

    response_404 = client.get("/metrics/nonexistent_model")
    assert response_404.status_code == 404
    assert response_404.json() == {"error": "Not found"}


def test_get_model_metrics_svm(client):
    response = client.get("/metrics/svm")
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Support Vector Machine"
    assert "accuracy" in data
    assert "auc" in data
    assert "roc_curve" in data


def test_get_feature_importance(client):
    response = client.get("/feature-importance/random_forest")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, dict)
    assert len(data) == 13
    assert "cp" in data

    response_404 = client.get("/feature-importance/nonexistent")
    assert response_404.status_code == 404


def test_get_feature_importance_svm(client):
    response = client.get("/feature-importance/svm")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, dict)
    assert len(data) == 13
    assert abs(sum(data.values()) - 1.0) < 0.01


def test_get_dataset_stats(client):
    response = client.get("/dataset-stats")
    assert response.status_code == 200
    data = response.json()
    assert "shape" in data
    assert "target_distribution" in data
    assert "feature_stats" in data
    assert "correlation_with_target" in data
    assert data["shape"][0] >= 300


def test_get_models_list(client):
    response = client.get("/models")
    assert response.status_code == 200
    data = response.json()
    assert "models" in data
    keys = [m["key"] for m in data["models"]]
    assert "logistic_regression" in keys
    assert "random_forest" in keys
    assert "knn" in keys
    assert "svm" in keys


def test_get_evaluation_audit(client):
    response = client.get("/evaluation-audit")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert data["status"] == "available"
    assert "benchmark" in data
    assert "ensemble" in data
    if data["benchmark"]:
        assert "metadata" in data["benchmark"]
        assert "results" in data["benchmark"]
        assert data["benchmark"]["metadata"]["total_unique_rows"] == 302

