import re
from typing import Optional
from fastapi import APIRouter, Depends, status
from fastapi.responses import JSONResponse
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.prediction import Prediction

router = APIRouter(prefix="/reports", tags=["reports"])

MODEL_LABELS = {
    "random_forest": "Random Forest Classifier",
    "logistic_regression": "Logistic Regression",
    "knn": "K-Nearest Neighbors",
    "svm": "Support Vector Machine",
    "ensemble": "Ensemble Consensus Model",
}


def mask_patient_name(name: Optional[str]) -> str:
    """Mask patient full name to initials/stars for public verification privacy."""
    if not name or not name.strip():
        return "Patient on Record"
    parts = name.strip().split()
    masked = []
    for p in parts:
        if len(p) <= 1:
            masked.append(p)
        elif len(p) == 2:
            masked.append(f"{p[0]}*")
        else:
            masked.append(f"{p[0]}{'*' * (len(p) - 1)}")
    return " ".join(masked)


def lookup_prediction_by_report_id(raw_report_id: str, db: Session) -> Optional[Prediction]:
    """
    Look up a prediction record by its stable report_id or fallback primary key.
    Supports both direct report_id string matches and legacy CS-REP-XXXXXX numeric decoding.
    """
    clean_id = (raw_report_id or "").strip()
    if not clean_id or len(clean_id) > 64:
        return None

    # 1. Exact match on report_id column
    pred = db.query(Prediction).filter(Prediction.report_id == clean_id).first()
    if pred:
        return pred

    # 2. Match standard CS-REP-XXXXXX format where numbers match integer id
    match = re.match(r"^CS-REP-0*(\d+)$", clean_id, re.IGNORECASE)
    if match:
        numeric_id = int(match.group(1))
        pred = db.query(Prediction).filter(Prediction.id == numeric_id).first()
        if pred:
            return pred

    # 3. Direct numeric ID fallback
    if clean_id.isdigit():
        numeric_id = int(clean_id)
        pred = db.query(Prediction).filter(Prediction.id == numeric_id).first()
        if pred:
            return pred

    return None


@router.get("/verify/{report_id}")
@router.get("/{report_id}")
def verify_report(report_id: str, db: Session = Depends(get_db)):
    """
    Public report verification endpoint.
    Validates a Report ID / UHID against persisted assessment records in the CardioScan registry.
    Strictly safeguards patient privacy: exposes ONLY verification status, masked initials,
    and algorithm metadata. Never exposes private clinical biomarkers, email, or credentials.
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
    recorded_name = pred.patient_name or (pred.user.name if pred.user else None)
    recorded_pid = pred.patient_id or (pred.user.patient_id if pred.user else "Unassigned ID")

    return {
        "valid": True,
        "status": "verified",
        "report_id": canonical_report_id,
        "uhid": canonical_report_id,
        "patient_id": recorded_pid,
        "patient_masked_name": mask_patient_name(recorded_name),
        "assessment_date": pred.created_at.isoformat() if pred.created_at else None,
        "model_used": pred.model_used,
        "model_label": MODEL_LABELS.get(pred.model_used, pred.model_used),
        "risk_level": pred.risk_level,
        "prediction": pred.prediction,
        "indication": "Elevated Heart Disease Indication" if pred.prediction == 1 else "No Elevated Heart Disease Indication",
        "probability_percent": round(pred.probability * 100),
        "issuer": "CardioScan Automated Clinical Registry",
        "verification_type": "Registry Log Verification",
        "disclaimer": (
            "This public verification confirms the existence and metadata of an algorithmic "
            "evaluation record logged in the CardioScan registry. It is NOT a clinical medical "
            "diagnosis, digital signature, or certified laboratory report."
        ),
    }
