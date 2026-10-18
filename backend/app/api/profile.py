from datetime import date, datetime
from typing import Any, Dict
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.patient import ProfileCorrectionLog
from app.models.user import User
from app.schemas.user import ProfileCorrectionRequest, ProfileResponse, ProfileUpdateRequest
from app.services.patient_identity import (
    get_field_cooldown_status,
    record_profile_correction,
    validate_profile_fields,
)

router = APIRouter(prefix="/profile", tags=["profile"])


def _serialize_profile(user: User) -> Dict[str, Any]:
    """Helper to construct full ProfileResponse dictionary for authenticated user."""
    completion = user.get_profile_completion()
    cooldowns = get_field_cooldown_status(user)
    return {
        "patient_id": user.patient_id,
        "name": user.name,
        "email": user.email,
        "avatar": user.avatar,
        "is_verified": user.is_verified,
        "date_of_birth": user.date_of_birth,
        "age": user.calculate_age(),
        "height": user.height,
        "weight": user.weight,
        "profile_completed": completion["is_completed"],
        "profile_completion_percentage": completion["percentage"],
        "configured_domains_count": completion["configured_count"],
        "total_domains_count": completion["total_count"],
        "domains": completion["domains"],
        "cooldowns": cooldowns,
        "created_at": user.created_at.isoformat() if user.created_at else None,
        "updated_at": user.updated_at.isoformat() if user.updated_at else None,
    }


@router.get("/me", response_model=ProfileResponse)
def get_my_profile(current_user: User = Depends(get_current_user)):
    """
    Retrieve authenticated user's permanent patient identity, baseline biometrics,
    completion status, and server-side editing cooldown timers.
    """
    return _serialize_profile(current_user)


@router.put("/me", response_model=ProfileResponse)
def update_my_profile(
    payload: ProfileUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Update allowed clinical and demographic baseline fields with strict server-side
    cooldown enforcement:
    - Weight: once every 7 days (or within 24h grace period of initial setup).
    - Height: once every 6 calendar months (or within 24h grace period).
    - Date of Birth: once every 12 calendar months (or within 24h grace period).
    """
    # 1. Server-side validation of incoming values
    is_valid, error_msg = validate_profile_fields(
        name=payload.name,
        dob=payload.date_of_birth,
        height=payload.height,
        weight=payload.weight,
    )
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error_msg,
        )

    now = datetime.utcnow()
    cooldowns = get_field_cooldown_status(current_user, now=now)

    # 2. Enforce cooldowns on modified fields
    # Name update: strictly enforce 48-hour registration window
    if payload.name is not None and payload.name.strip() != current_user.name:
        trimmed_name = payload.name.strip()
        if not trimmed_name:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Full legal name cannot be empty or whitespace only.",
            )
        if len(trimmed_name) > 100:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Full legal name must not exceed 100 characters.",
            )
        if not cooldowns["name"]["can_edit"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Patient name cannot be edited directly after the 48-hour registration window. Please submit an authenticated correction request.",
            )
        current_user.name = trimmed_name

    # Weight update
    if payload.weight is not None and payload.weight != current_user.weight:
        if not cooldowns["weight"]["can_edit"]:
            next_date = cooldowns["weight"]["next_permitted_at"]
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Weight cannot be edited yet. Cooldown policy allows updates once every 7 days. Next permitted update: {next_date}.",
            )
        current_user.weight = float(payload.weight)
        current_user.weight_updated_at = now

    # Height update
    if payload.height is not None and payload.height != current_user.height:
        if not cooldowns["height"]["can_edit"]:
            next_date = cooldowns["height"]["next_permitted_at"]
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Height cannot be edited yet. Cooldown policy allows updates once every 6 calendar months. Next permitted update: {next_date}.",
            )
        current_user.height = float(payload.height)
        current_user.height_updated_at = now

    # Date of Birth update
    if payload.date_of_birth is not None and payload.date_of_birth != current_user.date_of_birth:
        if not cooldowns["date_of_birth"]["can_edit"]:
            next_date = cooldowns["date_of_birth"]["next_permitted_at"]
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Date of birth cannot be edited yet. Cooldown policy allows updates once every 12 calendar months. Next permitted update: {next_date}.",
            )
        current_user.date_of_birth = payload.date_of_birth
        current_user.dob_updated_at = now

    current_user.updated_at = now
    db.commit()
    db.refresh(current_user)

    return _serialize_profile(current_user)


@router.post("/me/correct")
def correct_profile_field(
    payload: ProfileCorrectionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Legitimate profile correction process:
    Allows a user or clinician to submit an explicit correction for a mistaken field
    (e.g., typo in DOB, incorrect height/weight entered) with required rationale.
    Records an immutable entry in `profile_correction_logs` and resets the cooldown
    timestamp to prevent abuse while ensuring clinical record integrity.
    """
    field = payload.field_name
    new_raw = payload.new_value.strip()
    reason = payload.reason.strip()

    if len(reason) < 10:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Correction reason must be at least 10 characters detailing the clinical or administrative mistake.",
        )

    now = datetime.utcnow()
    old_val: Any = None
    parsed_new_val: Any = None

    if field == "name":
        old_val = current_user.name
        parsed_new_val = new_raw
        is_valid, err = validate_profile_fields(name=parsed_new_val)
        if not is_valid:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=err)
        current_user.name = parsed_new_val

    elif field == "date_of_birth":
        old_val = current_user.date_of_birth
        try:
            parsed_new_val = date.fromisoformat(new_raw)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Date of birth must be a valid ISO date (YYYY-MM-DD).",
            )
        is_valid, err = validate_profile_fields(dob=parsed_new_val)
        if not is_valid:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=err)
        current_user.date_of_birth = parsed_new_val
        current_user.dob_updated_at = now

    elif field == "height":
        old_val = current_user.height
        try:
            parsed_new_val = float(new_raw)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Height must be a valid numeric measurement in centimeters.",
            )
        is_valid, err = validate_profile_fields(height=parsed_new_val)
        if not is_valid:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=err)
        current_user.height = parsed_new_val
        current_user.height_updated_at = now

    elif field == "weight":
        old_val = current_user.weight
        try:
            parsed_new_val = float(new_raw)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Weight must be a valid numeric measurement in kilograms.",
            )
        is_valid, err = validate_profile_fields(weight=parsed_new_val)
        if not is_valid:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=err)
        current_user.weight = parsed_new_val
        current_user.weight_updated_at = now

    current_user.updated_at = now

    # Record permanent audit log
    log_entry = record_profile_correction(
        user_id=current_user.id,
        field_name=field,
        old_val=old_val,
        new_val=parsed_new_val,
        reason=reason,
        db=db,
    )

    db.commit()
    db.refresh(current_user)

    return {
        "message": f"Successfully corrected {field}.",
        "correction_id": log_entry.id,
        "profile": _serialize_profile(current_user),
    }


@router.get("/me/corrections")
def get_my_corrections(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Retrieve authenticated user's immutable profile correction audit trail.
    """
    logs = (
        db.query(ProfileCorrectionLog)
        .filter(ProfileCorrectionLog.user_id == current_user.id)
        .order_by(ProfileCorrectionLog.created_at.desc())
        .all()
    )
    return [
        {
            "id": log.id,
            "field_name": log.field_name,
            "old_value": log.old_value,
            "new_value": log.new_value,
            "reason": log.reason,
            "created_at": log.created_at.isoformat() if log.created_at else None,
        }
        for log in logs
    ]

