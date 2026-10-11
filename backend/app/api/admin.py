import csv
import io
from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from fastapi.responses import JSONResponse, Response
from sqlalchemy.orm import Session

from app.api.deps import get_current_admin
from app.core.config import settings
from app.db.session import get_db
from app.models.prediction import Prediction
from app.models.user import User

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

    return {
        "users": {
            "total": total_users,
            "verified": verified_users,
            "unverified": total_users - verified_users,
            "new_this_week": new_users_week,
        },
        "predictions": {
            "total": total_predictions,
            "positive": positive,
            "negative": negative,
            "high_risk": high_risk,
            "moderate_risk": moderate_risk,
            "low_risk": low_risk,
            "new_this_week": new_preds_week,
        },
        "models": model_counts,
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
