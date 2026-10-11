from fastapi import APIRouter, status
from fastapi.responses import JSONResponse

from app.services.ml import ml_service

router = APIRouter(tags=["analytics"])


@router.get("/")
def root_health():
    """Health check endpoint used by deployment checks."""
    return {"status": "CardioScan API running"}


@router.get("/metrics")
def get_metrics():
    """Return model performance metrics and ROC curves for all models."""
    if not ml_service.is_initialized:
        ml_service.load_or_train()
    return ml_service.metrics


@router.get("/metrics/{model_key}")
def get_model_metrics(model_key: str):
    """Return evaluation metrics for a specific model."""
    if not ml_service.is_initialized:
        ml_service.load_or_train()
    if model_key not in ml_service.metrics:
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content={"error": "Not found"},
        )
    return ml_service.metrics[model_key]


@router.get("/feature-importance/{model_key}")
def get_feature_importance(model_key: str):
    """Return normalized feature importances sorted descending."""
    if not ml_service.is_initialized:
        ml_service.load_or_train()
    if model_key not in ml_service.feature_importance:
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content={"error": "Not found"},
        )
    fi = ml_service.feature_importance[model_key]
    tot = sum(fi.values()) or 1.0
    sorted_fi = dict(
        sorted({k: round(v / tot, 4) for k, v in fi.items()}.items(), key=lambda x: -x[1])
    )
    return sorted_fi


@router.get("/dataset-stats")
def get_dataset_stats():
    """Return dataset overview, distributions, and feature correlations."""
    if not ml_service.is_initialized:
        ml_service.load_or_train()
    return ml_service.dataset_stats


@router.get("/models")
def list_models():
    """List available prediction models."""
    return {
        "models": [
            {"key": "logistic_regression", "label": "Logistic Regression"},
            {"key": "random_forest", "label": "Random Forest"},
            {"key": "knn", "label": "K-Nearest Neighbors"},
            {"key": "svm", "label": "Support Vector Machine"},
        ]
    }
