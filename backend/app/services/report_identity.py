import secrets
from typing import Optional
from sqlalchemy.orm import Session

REPORT_ID_PREFIX = "CS-REP"


def generate_candidate_report_id() -> str:
    """
    Generate a cryptographically random, collision-resistant report identifier.
    Format: CS-REP-<20 uppercase hex characters> (Length: 27 chars, fits within String(32)).
    Yields 16^20 (~1.2 x 10^24) distinct permutations with 80 bits of cryptographic entropy.
    Never derived from database sequence IDs, auto-increment keys, timestamps, or patient PII.
    """
    return f"{REPORT_ID_PREFIX}-{secrets.token_hex(10).upper()}"


def is_report_id_available(candidate_id: str, db: Session) -> bool:
    """Verify that candidate report ID is completely unused across all predictions."""
    from app.models.prediction import Prediction

    return db.query(Prediction).filter(Prediction.report_id == candidate_id).first() is None


def generate_report_id(db: Optional[Session] = None) -> str:
    """
    Generate a unique report ID, verifying uniqueness if database session is provided.
    """
    for _ in range(10):
        candidate = generate_candidate_report_id()
        if db is None or is_report_id_available(candidate, db):
            return candidate
    # Fallback under extreme unlikely collision
    return f"{REPORT_ID_PREFIX}-{secrets.token_hex(12).upper()[:20]}"


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
