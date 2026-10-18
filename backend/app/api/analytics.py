import os
import json
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
    return ml_service.get_enriched_dataset_stats()



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


@router.get("/evaluation-audit")
def get_evaluation_audit():
    """
    Return offline leakage-safe 5-fold cross-validation benchmark results
    and deduplication audit data.
    """
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    benchmark_path = os.path.join(base_dir, "scripts", "benchmark_results.json")
    ensemble_path = os.path.join(base_dir, "scripts", "ensemble_benchmark_results.json")

    benchmark_data = None
    ensemble_data = None
    if os.path.exists(benchmark_path):
        try:
            with open(benchmark_path, "r", encoding="utf-8") as f:
                benchmark_data = json.load(f)
        except Exception:
            pass

    if os.path.exists(ensemble_path):
        try:
            with open(ensemble_path, "r", encoding="utf-8") as f:
                ensemble_data = json.load(f)
        except Exception:
            pass

    return {
        "status": "available" if (benchmark_data or ensemble_data) else "unavailable",
        "benchmark": benchmark_data,
        "ensemble": ensemble_data,
    }

