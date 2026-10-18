from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from fastapi.responses import JSONResponse
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.prediction import Prediction
from app.models.user import User
from app.schemas.prediction import NotesUpdateRequest

router = APIRouter(prefix="/history", tags=["history"])


def _parse_date_bound(d_str: str, is_end: bool = False) -> Optional[datetime]:
    if not d_str:
        return None
    d_clean = d_str.strip()
    if len(d_clean) == 10:
        try:
            dt = datetime.strptime(d_clean, "%Y-%m-%d")
            if is_end:
                return dt.replace(hour=23, minute=59, second=59, microsecond=999999)
            return dt
        except Exception:
            pass
    try:
        return datetime.fromisoformat(d_clean.replace("Z", "+00:00"))
    except Exception:
        return None


@router.get("")
def get_history(
    risk_level: Optional[str] = Query(None, description="Filter by risk level (Low, Moderate, High)"),
    prediction: Optional[int] = Query(None, description="Filter by binary prediction (0 or 1)"),
    model: Optional[str] = Query(None, description="Filter by ML model used"),
    search: Optional[str] = Query(None, description="Search in notes, patient name, patient ID, or model"),
    start_date: Optional[str] = Query(None, description="Start date filter (YYYY-MM-DD or ISO timestamp)"),
    end_date: Optional[str] = Query(None, description="End date filter (YYYY-MM-DD or ISO timestamp)"),
    sort: Optional[str] = Query("desc", description="Sort order by date (asc or desc)"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve personal prediction history for authenticated user with optional filtering and sorting."""
    query = db.query(Prediction).filter(Prediction.user_id == current_user.id)

    if risk_level:
        query = query.filter(Prediction.risk_level.ilike(risk_level.strip()))

    if prediction is not None:
        query = query.filter(Prediction.prediction == prediction)

    if model:
        query = query.filter(Prediction.model_used.ilike(model.strip()))

    if search:
        term = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Prediction.notes.ilike(term),
                Prediction.patient_name.ilike(term),
                Prediction.patient_id.ilike(term),
                Prediction.model_used.ilike(term),
            )
        )

    if start_date:
        parsed_start = _parse_date_bound(start_date, is_end=False)
        if parsed_start:
            query = query.filter(Prediction.created_at >= parsed_start)

    if end_date:
        parsed_end = _parse_date_bound(end_date, is_end=True)
        if parsed_end:
            query = query.filter(Prediction.created_at <= parsed_end)

    if sort and sort.lower() == "asc":
        query = query.order_by(Prediction.created_at.asc())
    else:
        query = query.order_by(Prediction.created_at.desc())

    preds = query.all()
    return [p.to_dict() for p in preds]


@router.get("/{pred_id}")
def get_prediction(pred_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Retrieve single prediction record belonging to user."""
    p = db.query(Prediction).filter(Prediction.id == pred_id, Prediction.user_id == current_user.id).first()
    if not p:
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content={"error": "Not found"},
        )
    return p.to_dict()


@router.delete("/{pred_id}")
def delete_prediction(pred_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Delete single prediction record belonging to user."""
    p = db.query(Prediction).filter(Prediction.id == pred_id, Prediction.user_id == current_user.id).first()
    if not p:
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content={"error": "Not found"},
        )
    db.delete(p)
    db.commit()
    return {"message": "Deleted successfully"}


@router.put("/{pred_id}/notes")
def update_notes(
    pred_id: int,
    payload: NotesUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update notes for a specific prediction record."""
    p = db.query(Prediction).filter(Prediction.id == pred_id, Prediction.user_id == current_user.id).first()
    if not p:
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content={"error": "Not found"},
        )
    p.notes = payload.notes
    db.commit()
    db.refresh(p)
    return p.to_dict()
