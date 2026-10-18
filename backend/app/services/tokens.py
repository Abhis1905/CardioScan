from datetime import datetime, timedelta
from typing import Optional, Tuple
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import generate_secure_token, hash_token
from app.models.user import User


def create_verification_token(user: User, db: Session) -> str:
    """Generate a secure verification token, store its hash and expiry, and commit."""
    raw_token = generate_secure_token()
    token_hash = hash_token(raw_token)
    expires = datetime.utcnow() + timedelta(hours=settings.VERIFY_TOKEN_TTL_HOURS)

    user.verify_token_hash = token_hash
    user.verify_token_expires = expires
    user.verify_email_last_sent = datetime.utcnow()
    db.commit()
    db.refresh(user)
    return raw_token


def verify_email_token(raw_token: str, db: Session) -> Tuple[bool, Optional[User], Optional[str]]:
    """
    Validate a verification token.
    Returns (success, user, error_message).
    Enforces single-use and expiration.
    """
    if not raw_token:
        return False, None, "Verification token is missing"

    token_hash = hash_token(raw_token)
    user = db.query(User).filter(User.verify_token_hash == token_hash).first()

    if not user:
        return False, None, "Invalid verification link"

    # Check expiration
    if user.verify_token_expires and datetime.utcnow() > user.verify_token_expires:
        return False, user, "Verification link has expired. Please request a new one."

    # Mark as verified, assign permanent patient ID, and invalidate token (single-use)
    user.is_verified = True
    user.verify_token_hash = None
    user.verify_token_expires = None
    from app.services.patient_identity import assign_patient_id
    assign_patient_id(user, db)
    db.commit()
    db.refresh(user)

    return True, user, None


def check_resend_cooldown(user: User) -> Tuple[bool, int]:
    """
    Check if user is allowed to request a resend.
    Returns (allowed: bool, wait_minutes: int).
    """
    if not user.verify_email_last_sent:
        return True, 0

    elapsed_minutes = (datetime.utcnow() - user.verify_email_last_sent).total_seconds() / 60
    if elapsed_minutes < settings.RESEND_COOLDOWN_MINUTES:
        wait = int(settings.RESEND_COOLDOWN_MINUTES - elapsed_minutes) + 1
        return False, wait

    return True, 0


def create_password_reset_token(user: User, db: Session) -> str:
    """Generate a single-use password reset token, store its hash and expiry."""
    raw_token = generate_secure_token()
    token_hash = hash_token(raw_token)
    expires = datetime.utcnow() + timedelta(minutes=settings.RESET_TOKEN_TTL_MINUTES)

    user.reset_token_hash = token_hash
    user.reset_token_expires = expires
    db.commit()
    db.refresh(user)
    return raw_token


def verify_password_reset_token(raw_token: str, db: Session) -> Tuple[bool, Optional[User], Optional[str]]:
    """
    Validate a password reset token.
    Returns (success, user, error_message).
    """
    if not raw_token:
        return False, None, "Invalid or expired reset link"

    token_hash = hash_token(raw_token)
    user = db.query(User).filter(User.reset_token_hash == token_hash).first()

    if not user:
        return False, None, "Invalid or expired reset link"

    if user.reset_token_expires and datetime.utcnow() > user.reset_token_expires:
        return False, user, "Reset link has expired. Please request a new one."

    return True, user, None


def consume_password_reset_token(user: User, new_password_hash: str, db: Session) -> None:
    """Set new password and invalidate reset token immediately (single-use)."""
    user.password_hash = new_password_hash
    user.reset_token_hash = None
    user.reset_token_expires = None
    db.commit()
    db.refresh(user)
