import re
from typing import Optional
from fastapi import APIRouter, Depends, status
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.api.deps import get_current_user_optional
from app.core.rate_limiter import rate_limit_reports
from app.db.session import get_db
from app.models.prediction import Prediction
from app.models.user import User
from app.services.report_identity import mask_patient_name

router = APIRouter(prefix="/reports", tags=["reports"])

MODEL_LABELS = {
    "random_forest": "Random Forest Classifier",
    "logistic_regression": "Logistic Regression",
    "knn": "K-Nearest Neighbors",
    "svm": "Support Vector Machine",
    "ensemble": "Ensemble Consensus Model",
}


def lookup_prediction_by_report_id(raw_report_id: str, db: Session) -> Optional[Prediction]:
    """
    Look up a prediction record by its stable report_id or backward-compatible legacy key.
    Unsafe direct numeric lookups (e.g. raw integer primary keys '1', '42') are strictly
    rejected to prevent sequential enumeration.
    """
    clean_id = (raw_report_id or "").strip()
    if not clean_id or len(clean_id) > 64:
        return None

    # 1. Exact match on report_id column (primary lookup for all modern & backfilled reports)
    pred = db.query(Prediction).filter(Prediction.report_id == clean_id).first()
    if pred:
        return pred

    # 2. Backward compatibility: match legacy CS-REP-XXXXXX format where numbers match integer id
    # but ONLY if the report_id in the database matches or is unassigned (None).
    match = re.match(r"^CS-REP-0*(\d+)$", clean_id, re.IGNORECASE)
    if match:
        numeric_id = int(match.group(1))
        pred = db.query(Prediction).filter(
            Prediction.id == numeric_id,
            (Prediction.report_id == clean_id) | (Prediction.report_id.is_(None)),
        ).first()
        if pred:
            return pred

    # Direct numeric ID fallback is intentionally omitted for security:
    # Bare integers (e.g. "42", "1") must return None / 404 to block sequential scraping.
    return None


@router.get("/verify/{report_id}", dependencies=[Depends(rate_limit_reports)])
@router.get("/{report_id}", dependencies=[Depends(rate_limit_reports)])
def verify_report(
    report_id: str,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    """
    Public report verification endpoint.
    Validates a Report ID / UHID against persisted assessment records in the CardioScan registry.

    Security & Privacy Model:
    1. Unauthenticated or non-owner callers receive ONLY public registry verification metadata:
       validity confirmation, canonical report identifier, evaluated ML model, issuer, and disclaimer.
       Zero patient identifiers, names, timestamps, clinical measurements, or risk scores are exposed.
    2. Authenticated owners (current_user.id == prediction.user_id) or system administrators receive
       the full verified assessment outcome, patient ID, and assessment timestamp.
    """
    pred = lookup_prediction_by_report_id(report_id, db)
    if not pred:
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content={
                "valid": False,
                "status": "not_found",
                "report_id": report_id,
                "message": "Report record not found. No verified clinical assessment corresponds to this identifier.",
            },
        )

    canonical_report_id = pred.report_id or f"CS-REP-{pred.id:06d}"

    # Public base response: Confirms existence, authenticity, issuer, and algorithm metadata
    response_data = {
        "valid": True,
        "status": "verified",
        "report_id": canonical_report_id,
        "uhid": canonical_report_id,
        "model_used": pred.model_used,
        "model_label": MODEL_LABELS.get(pred.model_used, pred.model_used),
        "issuer": "CardioScan Automated Clinical Registry",
        "verification_type": "Registry Log Verification",
        "disclaimer": (
            "This public verification confirms the authenticity and existence of an "
            "algorithmic evaluation record logged in the CardioScan registry. It is NOT "
            "a clinical medical diagnosis, digital signature, or certified laboratory report."
        ),
        "access_level": "public",
        "message": (
            "Report verified in CardioScan registry. In compliance with patient privacy standards, "
            "clinical results and patient identifiers are restricted to the authenticated patient account."
        ),
    }

    # Evaluate authorization: Only the authenticated owner or an admin can access sensitive health fields
    is_owner = bool(current_user and (current_user.id == pred.user_id or current_user.is_admin))

    if is_owner:
        recorded_name = pred.patient_name or (pred.user.name if pred.user else None)
        recorded_pid = pred.patient_id or (pred.user.patient_id if pred.user else "Unassigned ID")
        response_data.update({
            "access_level": "authorized",
            "is_authenticated_owner": True,
            "patient_id": recorded_pid,
            "patient_name": recorded_name,
            "patient_masked_name": mask_patient_name(recorded_name),
            "assessment_date": pred.created_at.isoformat() if pred.created_at else None,
            "risk_level": pred.risk_level,
            "prediction": pred.prediction,
            "indication": (
                "Elevated Heart Disease Indication"
                if pred.prediction == 1
                else "No Elevated Heart Disease Indication"
            ),
            "probability_percent": round(pred.probability * 100),
        })

    return response_data
