import calendar
from datetime import date, datetime, timedelta
import logging
import secrets
from typing import Any, Dict, Optional, Tuple
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.patient import ProfileCorrectionLog, RetiredPatientID
from app.models.user import User

logger = logging.getLogger("cardioscan.identity")

# Base-32 alphanumeric character set excluding visually ambiguous glyphs (0, O, 1, I)
PID_CHARSET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"
PID_GROUP_SIZE = 4
PID_PREFIX = "CS"

# Cooldown policy durations
WEIGHT_COOLDOWN_DAYS = 7
HEIGHT_COOLDOWN_MONTHS = 6
DOB_COOLDOWN_MONTHS = 12
CORRECTION_GRACE_HOURS = 24
NAME_EDIT_WINDOW_HOURS = 48

# Sensible biometric validation bounds
MIN_HEIGHT_CM = 50.0
MAX_HEIGHT_CM = 260.0
MIN_WEIGHT_KG = 20.0
MAX_WEIGHT_KG = 350.0
MIN_AGE_YEARS = 1
MAX_AGE_YEARS = 125


def generate_candidate_patient_id() -> str:
    """
    Generate a cryptographically random, collision-resistant patient ID.
    Format: CS-XXXX-XXXX (e.g. CS-7K9M-4W2P).
    Yields 32^8 (~1.1 trillion) distinct permutations.
    Never derived from any patient PII.
    """
    part1 = "".join(secrets.choice(PID_CHARSET) for _ in range(PID_GROUP_SIZE))
    part2 = "".join(secrets.choice(PID_CHARSET) for _ in range(PID_GROUP_SIZE))
    return f"{PID_PREFIX}-{part1}-{part2}"


def is_patient_id_available(candidate_id: str, db: Session) -> bool:
    """
    Verify that candidate ID is completely unused:
    1. Not present on any active user in `users`.
    2. Not recorded in `retired_patient_ids` (never reused after deletion).
    """
    if db.query(User).filter(User.patient_id == candidate_id).first() is not None:
        return False
    if db.query(RetiredPatientID).filter(RetiredPatientID.patient_id == candidate_id).first() is not None:
        return False
    return True


def assign_patient_id(user: User, db: Session) -> str:
    """
    Assign a unique, permanent patient-facing ID to a user upon email verification.
    Guarantees:
    - Idempotency: Returns existing ID if already assigned without mutation.
    - Uniqueness: Enforced against active users and retired IDs.
    - Concurrency safety: Handled with retry loop and exception rollback.
    """
    if user.patient_id:
        return user.patient_id

    max_attempts = 10
    for attempt in range(max_attempts):
        candidate = generate_candidate_patient_id()
        if not is_patient_id_available(candidate, db):
            continue

        user.patient_id = candidate
        try:
            db.commit()
            db.refresh(user)
            logger.info("Assigned permanent patient ID %s to user %s", candidate, user.id)
            return candidate
        except IntegrityError:
            db.rollback()
            # In case concurrent process already assigned an ID to this user
            db.refresh(user)
            if user.patient_id:
                return user.patient_id
            logger.warning("Collision or race on candidate ID %s (attempt %d)", candidate, attempt + 1)

    raise RuntimeError("Failed to generate a unique patient ID after multiple attempts.")


def retire_patient_id(patient_id: Optional[str], db: Session, reason: str = "account_deletion") -> None:
    """
    Permanently retire a patient ID so it can never be reassigned to any future account.
    """
    if not patient_id:
        return

    existing = db.query(RetiredPatientID).filter(RetiredPatientID.patient_id == patient_id).first()
    if not existing:
        retired = RetiredPatientID(
            patient_id=patient_id,
            retired_at=datetime.utcnow(),
            reason=reason,
        )
        db.add(retired)
        try:
            db.commit()
            logger.info("Permanently retired patient ID %s (reason: %s)", patient_id, reason)
        except IntegrityError:
            db.rollback()


def add_calendar_months(dt: datetime, months: int) -> datetime:
    """
    Accurately add calendar months to a datetime, handling variable month lengths
    (28, 29, 30, 31) and leap years.
    Example: March 31 + 6 calendar months -> September 30 (clamped).
    Example: Feb 29 (leap) + 12 calendar months -> Feb 28 (non-leap clamped).
    """
    year = dt.year + (dt.month + months - 1) // 12
    month = (dt.month + months - 1) % 12 + 1
    max_day = calendar.monthrange(year, month)[1]
    day = min(dt.day, max_day)
    return dt.replace(year=year, month=month, day=day)


def calculate_age(dob: date, reference_date: Optional[date] = None) -> int:
    """
    Calculate exact elapsed years from DOB to reference date.
    Properly handles leap-day (Feb 29) birthdays.
    """
    today = reference_date or date.today()
    if dob > today:
        raise ValueError("Date of birth cannot be in the future.")
    age = today.year - dob.year - (
        (today.month, today.day) < (dob.month, dob.day)
    )
    return age


def validate_profile_fields(
    name: Optional[str] = None,
    dob: Optional[date] = None,
    height: Optional[float] = None,
    weight: Optional[float] = None,
    reference_date: Optional[date] = None,
) -> Tuple[bool, Optional[str]]:
    """
    Validate demographic and biometric profile fields server-side.
    """
    if name is not None:
        trimmed = name.strip()
        if not trimmed:
            return False, "Full legal name cannot be empty."
        if len(trimmed) > 100:
            return False, "Full legal name must not exceed 100 characters."

    if dob is not None:
        today = reference_date or date.today()
        if dob >= today:
            return False, "Date of birth must be in the past."
        try:
            age = calculate_age(dob, today)
        except ValueError as e:
            return False, str(e)
        if age < MIN_AGE_YEARS:
            return False, f"Patient age must be at least {MIN_AGE_YEARS} year."
        if age > MAX_AGE_YEARS:
            return False, f"Patient age must not exceed {MAX_AGE_YEARS} years."

    if height is not None:
        if height < MIN_HEIGHT_CM or height > MAX_HEIGHT_CM:
            return False, f"Height must be between {MIN_HEIGHT_CM:.0f} cm and {MAX_HEIGHT_CM:.0f} cm."

    if weight is not None:
        if weight < MIN_WEIGHT_KG or weight > MAX_WEIGHT_KG:
            return False, f"Weight must be between {MIN_WEIGHT_KG:.0f} kg and {MAX_WEIGHT_KG:.0f} kg."

    return True, None


def get_field_cooldown_status(user: User, now: Optional[datetime] = None) -> Dict[str, Any]:
    """
    Evaluate server-side editing eligibility and next permitted edit dates for
    Weight (7 days), Height (6 calendar months), and DOB (12 calendar months).
    Also checks if user is within the initial 24-hour setup grace correction period.
    """
    current_time = now or datetime.utcnow()

    # 1. Weight status
    if user.weight is None or user.weight_updated_at is None:
        weight_status = {
            "can_edit": True,
            "last_updated_at": None,
            "next_permitted_at": None,
            "cooldown_rule": "Every 7 days once configured",
            "remaining_seconds": 0,
            "in_grace_period": False,
        }
    else:
        grace_expires = user.weight_updated_at + timedelta(hours=CORRECTION_GRACE_HOURS)
        cooldown_expires = user.weight_updated_at + timedelta(days=WEIGHT_COOLDOWN_DAYS)
        in_grace = current_time < grace_expires
        can_edit = current_time >= cooldown_expires or in_grace
        remaining = max(0, int((cooldown_expires - current_time).total_seconds())) if not in_grace else 0

        weight_status = {
            "can_edit": can_edit,
            "last_updated_at": user.weight_updated_at.isoformat(),
            "next_permitted_at": cooldown_expires.isoformat(),
            "cooldown_rule": "Every 7 days",
            "remaining_seconds": remaining,
            "in_grace_period": in_grace,
        }

    # 2. Height status
    if user.height is None or user.height_updated_at is None:
        height_status = {
            "can_edit": True,
            "last_updated_at": None,
            "next_permitted_at": None,
            "cooldown_rule": "Every 6 calendar months once configured",
            "remaining_seconds": 0,
            "in_grace_period": False,
        }
    else:
        grace_expires = user.height_updated_at + timedelta(hours=CORRECTION_GRACE_HOURS)
        cooldown_expires = add_calendar_months(user.height_updated_at, HEIGHT_COOLDOWN_MONTHS)
        in_grace = current_time < grace_expires
        can_edit = current_time >= cooldown_expires or in_grace
        remaining = max(0, int((cooldown_expires - current_time).total_seconds())) if not in_grace else 0

        height_status = {
            "can_edit": can_edit,
            "last_updated_at": user.height_updated_at.isoformat(),
            "next_permitted_at": cooldown_expires.isoformat(),
            "cooldown_rule": "Every 6 calendar months",
            "remaining_seconds": remaining,
            "in_grace_period": in_grace,
        }

    # 3. Date of birth status
    if user.date_of_birth is None or user.dob_updated_at is None:
        dob_status = {
            "can_edit": True,
            "last_updated_at": None,
            "next_permitted_at": None,
            "cooldown_rule": "Every 12 calendar months once configured",
            "remaining_seconds": 0,
            "in_grace_period": False,
        }
    else:
        grace_expires = user.dob_updated_at + timedelta(hours=CORRECTION_GRACE_HOURS)
        cooldown_expires = add_calendar_months(user.dob_updated_at, DOB_COOLDOWN_MONTHS)
        in_grace = current_time < grace_expires
        can_edit = current_time >= cooldown_expires or in_grace
        remaining = max(0, int((cooldown_expires - current_time).total_seconds())) if not in_grace else 0

        dob_status = {
            "can_edit": can_edit,
            "last_updated_at": user.dob_updated_at.isoformat(),
            "next_permitted_at": cooldown_expires.isoformat(),
            "cooldown_rule": "Every 12 calendar months",
            "remaining_seconds": remaining,
            "in_grace_period": in_grace,
        }

    # 4. Patient name policy: editable strictly within first 48 hours of account registration (created_at)
    registration_time = user.created_at or datetime.utcnow()
    name_deadline = registration_time + timedelta(hours=NAME_EDIT_WINDOW_HOURS)
    can_edit_name = current_time < name_deadline
    remaining_name_seconds = max(0, int((name_deadline - current_time).total_seconds())) if can_edit_name else 0
    remaining_name_hours = round(remaining_name_seconds / 3600.0, 1)

    name_status = {
        "can_edit": can_edit_name,
        "registered_at": registration_time.isoformat(),
        "deadline_at": name_deadline.isoformat(),
        "remaining_seconds": remaining_name_seconds,
        "remaining_hours": remaining_name_hours,
        "cooldown_rule": (
            f"Editable during first {NAME_EDIT_WINDOW_HOURS} hours after account registration"
            if can_edit_name
            else "Permanent record locked after 48h. Changes require an audited correction request."
        ),
        "can_request_correction": True,
    }

    return {
        "weight": weight_status,
        "height": height_status,
        "date_of_birth": dob_status,
        "name": name_status,
    }


def record_profile_correction(
    user_id: int,
    field_name: str,
    old_val: Optional[Any],
    new_val: Optional[Any],
    reason: str,
    db: Session,
) -> ProfileCorrectionLog:
    """
    Record an explicit clinical profile correction with required rationale.
    """
    log_entry = ProfileCorrectionLog(
        user_id=user_id,
        field_name=field_name,
        old_value=str(old_val) if old_val is not None else None,
        new_value=str(new_val) if new_val is not None else None,
        reason=reason.strip(),
        created_at=datetime.utcnow(),
    )
    db.add(log_entry)
    db.commit()
    db.refresh(log_entry)
    return log_entry
