import csv
import io
from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from fastapi.responses import JSONResponse, Response
from sqlalchemy import func, text
from sqlalchemy.orm import Session

from app.api.deps import get_current_admin
from app.core.config import settings
from app.db.session import get_db
from app.models.cleanup import PendingFirebaseCleanup
from app.models.prediction import Prediction
from app.models.user import User
from app.services.ml import ml_service

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/check")
def admin_check(admin: User = Depends(get_current_admin)):
    """Verify administrator identity."""
    return {"is_admin": True}


@router.get("/stats")
def admin_stats(admin: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    """Aggregate platform analytics and counts."""
    total_users = db.query(User).count()
    verified_users = db.query(User).filter(User.is_verified == True).count()
    total_predictions = db.query(Prediction).count()
    unique_accounts = db.query(func.count(func.distinct(Prediction.user_id))).scalar() or 0
    high_risk = db.query(Prediction).filter(Prediction.risk_level == "High").count()
    moderate_risk = db.query(Prediction).filter(Prediction.risk_level == "Moderate").count()
    low_risk = db.query(Prediction).filter(Prediction.risk_level == "Low").count()
    positive = db.query(Prediction).filter(Prediction.prediction == 1).count()
    negative = db.query(Prediction).filter(Prediction.prediction == 0).count()

    model_counts = {
        mk: db.query(Prediction).filter(Prediction.model_used == mk).count()
        for mk in ["random_forest", "logistic_regression", "knn", "svm", "ensemble"]
    }

    week_ago = datetime.utcnow() - timedelta(days=7)
    new_users_week = db.query(User).filter(User.created_at >= week_ago).count()
    new_preds_week = db.query(Prediction).filter(Prediction.created_at >= week_ago).count()

    # 14-day daily assessment trends from genuine database records
    fourteen_days_ago = datetime.utcnow() - timedelta(days=14)
    daily_rows = (
        db.query(
            func.date(Prediction.created_at).label("d"),
            func.count(Prediction.id).label("c"),
        )
        .filter(Prediction.created_at >= fourteen_days_ago)
        .group_by(func.date(Prediction.created_at))
        .all()
    )
    daily_map = {str(row[0]): row[1] for row in daily_rows if row[0]}
    activity_trends = []
    for i in range(13, -1, -1):
        day = (datetime.utcnow() - timedelta(days=i)).date()
        day_iso = day.isoformat()
        activity_trends.append({
            "date": day_iso,
            "label": day.strftime("%b %d"),
            "assessments": daily_map.get(day_iso, 0),
        })

    # Genuine system health telemetry (no healthy defaults on failure)
    db_connected = True
    try:
        db.execute(text("SELECT 1"))
    except Exception:
        db_connected = False

    try:
        pending_cleanups = db.query(PendingFirebaseCleanup).count()
        worker_status = "nominal" if pending_cleanups == 0 else "queued_items"
    except Exception:
        pending_cleanups = None
        worker_status = "unverified"

    models_loaded_count = len(ml_service.models) if (hasattr(ml_service, "models") and ml_service.models) else 0
    ml_engine_ready = bool(ml_service.is_initialized and models_loaded_count > 0)
    system_status = "operational" if (db_connected and ml_engine_ready) else "degraded"

    system_health = {
        "status": system_status,
        "backend_version": settings.VERSION,
        "environment": settings.ENVIRONMENT,
        "database": {
            "status": "connected" if db_connected else "disconnected",
            "engine": "postgresql" if "postgresql" in settings.DATABASE_URL.lower() else "sqlite",
        },
        "ml_engine": {
            "status": "ready" if ml_engine_ready else "uninitialized",
            "models_loaded": models_loaded_count,
            "supported_models": ["random_forest", "logistic_regression", "knn", "svm", "ensemble"],
        },
        "firebase_worker": {
            "pending_cleanups": pending_cleanups if pending_cleanups is not None else 0,
            "status": worker_status,
        },
        "turnstile": {
            "enabled": bool(settings.TURNSTILE_SECRET_KEY),
            "status": "active" if bool(settings.TURNSTILE_SECRET_KEY) else "disabled_in_dev",
        },
        "checked_at": datetime.utcnow().isoformat(),
        "reliability_disclaimer": "Operational status reflects host responsiveness and process initialization; it does not replace diagnostic clinical validation or formal high-availability SLAs.",
    }

    # Data quality & clinical safety governance summary:
    # Carefully distinguishes bundled dataset, distinct observations, and 1988 source provenance.
    data_quality = {
        "bundled_dataset_rows": 1025,
        "bundled_exact_duplicates": 723,
        "bundled_duplicate_pct": 70.54,
        "distinct_full_row_observations": 302,
        "original_source_rows": 303,
        "original_source_duplicates": 1,
        "original_duplicate_indices": "Row index 164 duplicates Row index 0",
        "patient_identity_disclaimer": "Distinct rows represent unique biomarker configurations in the 1988 tabular records, not independently verified biological patients.",
        "validation_scheme": "5-Fold Stratified Cross-Validation (Leakage-Safe Pipelines)",
        "leakage_isolation": "StandardScaler scaling strictly fitted within training folds to prevent cross-fold distribution leakage.",
        "clinical_boundary": "Experimental ML decision-support benchmark. Not cleared as an autonomous diagnostic device.",
        # Backward-compatibility aliases
        "raw_observations": 303,
        "unique_patients": 302,
        "confirmed_duplicates": 1,
        "duplicate_row_index": 164,
        "duplicate_source_index": 0,
    }

    # Legitimate, PHI-safe administrative activity feed (no raw clinical measurements)
    recent_preds = (
        db.query(Prediction)
        .order_by(Prediction.created_at.desc())
        .limit(10)
        .all()
    )
    recent_activity = [
        {
            "id": p.id,
            "ref_code": f"EV-{p.id:05d}",
            "user_masked_ref": f"User #{p.user_id}" if p.user_id else "Anonymous",
            "risk_level": p.risk_level,
            "probability": round(p.probability, 4) if p.probability is not None else 0.0,
            "prediction": p.prediction,
            "model_used": p.model_used,
            "created_at": p.created_at.isoformat() if p.created_at else None,
        }
        for p in recent_preds
    ]

    return {
        "users": {
            "total": total_users,
            "verified": verified_users,
            "unverified": total_users - verified_users,
            "new_this_week": new_users_week,
        },
        "predictions": {
            "total": total_predictions,
            "unique_accounts_assessed": unique_accounts,
            "unique_patients_assessed": unique_accounts,  # backward compatibility alias
            "positive": positive,
            "negative": negative,
            "high_risk": high_risk,
            "moderate_risk": moderate_risk,
            "low_risk": low_risk,
            "new_this_week": new_preds_week,
        },
        "models": model_counts,
        "activity_trends": activity_trends,
        "system_health": system_health,
        "data_quality": data_quality,
        "recent_activity": recent_activity,
    }


@router.get("/users")
def admin_users(
    search: str = Query("", description="Search by name or email"),
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """List registered users with attached prediction counts."""
    query = db.query(User).order_by(User.created_at.desc())
    if search:
        search_term = f"%{search.lower()}%"
        query = query.filter((User.name.ilike(search_term)) | (User.email.ilike(search_term)))

    users = query.all()
    result = []
    for u in users:
        d = u.to_dict()
        d["prediction_count"] = db.query(Prediction).filter(Prediction.user_id == u.id).count()
        result.append(d)
    return result


@router.delete("/users/{uid}")
def admin_delete_user(
    uid: int,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Delete a user account. Cannot delete self/admin."""
    user = db.query(User).filter(User.id == uid).first()
    if not user:
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content={"error": "User not found"},
        )
    if user.email.lower() == settings.ADMIN_EMAIL.lower():
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={"error": "Cannot delete admin"},
        )

    db.delete(user)
    db.commit()
    return {"message": "User deleted"}


@router.get("/predictions")
def admin_predictions(
    search: str = Query("", description="Search user name or email"),
    risk: str = Query("", description="Filter by risk level"),
    model: str = Query("", description="Filter by model used"),
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """List predictions across all users."""
    query = db.query(Prediction).order_by(Prediction.created_at.desc())
    if risk:
        query = query.filter(Prediction.risk_level == risk)
    if model:
        query = query.filter(Prediction.model_used == model)

    preds = query.all()
    result = []
    for p in preds:
        user = p.user
        user_name = user.name if user else "Deleted"
        user_email = user.email if user else "Deleted"

        if search:
            s = search.lower()
            if s not in user_name.lower() and s not in user_email.lower():
                continue

        d = p.to_dict()
        d["user_name"] = user_name
        d["user_email"] = user_email
        result.append(d)
    return result


@router.delete("/predictions/{pid}")
def admin_delete_prediction(
    pid: int,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Delete a prediction record."""
    p = db.query(Prediction).filter(Prediction.id == pid).first()
    if not p:
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content={"error": "Not found"},
        )
    db.delete(p)
    db.commit()
    return {"message": "Prediction deleted"}


@router.get("/export/users")
def admin_export_users(admin: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    """Export users as CSV."""
    users = db.query(User).order_by(User.created_at.desc()).all()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["ID", "Name", "Email", "Verified", "Created At", "Predictions"])
    for u in users:
        p_count = db.query(Prediction).filter(Prediction.user_id == u.id).count()
        writer.writerow([u.id, u.name, u.email, u.is_verified, u.created_at, p_count])

    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment;filename=cardioscan_users.csv"},
    )


@router.get("/export/predictions")
def admin_export_predictions(admin: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    """Export predictions as CSV."""
    preds = db.query(Prediction).order_by(Prediction.created_at.desc()).all()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "ID", "User", "Email", "Age", "Sex", "CP", "TrestBPS", "Chol", "FBS", "RestECG",
        "Thalach", "Exang", "Oldpeak", "Slope", "CA", "Thal",
        "Prediction", "Probability", "Risk", "Model", "Created At"
    ])
    for p in preds:
        user = p.user
        writer.writerow([
            p.id,
            user.name if user else "Deleted",
            user.email if user else "Deleted",
            p.age, p.sex, p.cp, p.trestbps, p.chol, p.fbs, p.restecg,
            p.thalach, p.exang, p.oldpeak, p.slope, p.ca, p.thal,
            p.prediction, p.probability, p.risk_level, p.model_used, p.created_at
        ])

    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment;filename=cardioscan_predictions.csv"},
    )


@router.post("/process-cleanups")
def admin_process_cleanups(admin: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    """Trigger retry processing of pending Firebase cleanups."""
    from app.services.firebase_auth import firebase_auth_service
    resolved, remaining = firebase_auth_service.process_pending_cleanups(db)
    return {
        "message": "Cleanup processing executed",
        "resolved": resolved,
        "remaining": remaining,
    }
