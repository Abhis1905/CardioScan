from typing import List
from fastapi import APIRouter, Depends, status
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.prediction import Prediction
from app.models.user import User
from app.schemas.prediction import NotesUpdateRequest

router = APIRouter(prefix="/history", tags=["history"])


@router.get("")
def get_history(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Retrieve personal prediction history for authenticated user."""
    preds = (
        db.query(Prediction)
        .filter(Prediction.user_id == current_user.id)
        .order_by(Prediction.created_at.desc())
        .all()
    )
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
