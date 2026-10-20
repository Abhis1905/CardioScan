from datetime import date, datetime
from typing import TYPE_CHECKING, Any, Dict, List, Optional
from sqlalchemy import Boolean, Column, Date, DateTime, Float, Integer, String
from sqlalchemy.orm import relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.prediction import Prediction
    from app.models.patient import ProfileCorrectionLog


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    # Permanent patient-facing unique identifier (CS-XXXX-XXXX)
    patient_id = Column(String(32), unique=True, index=True, nullable=True)

    name = Column(String(100), nullable=False)
    email = Column(String(150), unique=True, index=True, nullable=False)
    password_hash = Column(String(256), nullable=True)
    google_id = Column(String(200), unique=True, nullable=True)
    firebase_uid = Column(String(128), unique=True, index=True, nullable=True)
    avatar = Column(String(500), nullable=True)
    is_verified = Column(Boolean, default=False, nullable=False)
    role = Column(String(32), default="patient", nullable=True, index=True)

    # Demographic & Biometric Profile Baseline
    date_of_birth = Column(Date, nullable=True)
    height = Column(Float, nullable=True)  # in centimeters (cm)
    weight = Column(Float, nullable=True)  # in kilograms (kg)

    # Profile Update Timestamps for Cooldown Enforcement
    updated_at = Column(DateTime, nullable=True, onupdate=datetime.utcnow)
    dob_updated_at = Column(DateTime, nullable=True)
    height_updated_at = Column(DateTime, nullable=True)
    weight_updated_at = Column(DateTime, nullable=True)

    # Verification token (secure hash stored in DB)
    verify_token_hash = Column(String(256), nullable=True, index=True)
    verify_token_expires = Column(DateTime, nullable=True)
    verify_email_last_sent = Column(DateTime, nullable=True)

    # Password reset token (secure hash stored in DB)
    reset_token_hash = Column(String(256), nullable=True, index=True)
    reset_token_expires = Column(DateTime, nullable=True)

    # User consent tracking
    consent_given = Column(Boolean, default=False, nullable=False)
    consent_at = Column(DateTime, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, index=True, nullable=False)

    # Relationship to predictions
    predictions = relationship(
        "Prediction",
        back_populates="user",
        cascade="all, delete-orphan",
        order_by="desc(Prediction.created_at)",
    )

    # Relationship to correction logs
    correction_logs = relationship(
        "ProfileCorrectionLog",
        back_populates="user",
        cascade="all, delete-orphan",
        order_by="desc(ProfileCorrectionLog.created_at)",
    )

    def calculate_age(self, reference_date: Optional[date] = None) -> Optional[int]:
        """
        Calculate age from date of birth server-side.
        Handles leap-year (Feb 29) birthdays accurately.
        Never trusts client-reported age.
        """
        if not self.date_of_birth:
            return None
        today = reference_date or date.today()
        dob = self.date_of_birth
        if dob > today:
            return None
        
        # Calculate full elapsed years
        age = today.year - dob.year - (
            (today.month, today.day) < (dob.month, dob.day)
        )
        return age

    def get_profile_completion(self) -> Dict[str, Any]:
        """
        Evaluate setup completion across 5 clinical profile domains:
        1. Account Credentials (always configured)
        2. Email Verification
        3. Permanent Patient ID Assigned
        4. Date of Birth & Calculated Age
        5. Biometric Measurements (Height & Weight)
        """
        domains = {
            "credentials": True,
            "email_verification": bool(self.is_verified),
            "patient_id": bool(self.patient_id),
            "date_of_birth": bool(self.date_of_birth),
            "biometrics": bool(self.height is not None and self.weight is not None),
        }
        configured_count = sum(1 for v in domains.values() if v)
        total_count = len(domains)
        percentage = int((configured_count / total_count) * 100)
        return {
            "configured_count": configured_count,
            "total_count": total_count,
            "percentage": percentage,
            "is_completed": configured_count == total_count,
            "domains": domains,
        }

    @property
    def is_admin(self) -> bool:
        """
        Evaluate admin status via explicit DB role or validated ADMIN_EMAIL configuration.
        Fails safely if no admin email is configured and role is not explicitly 'admin' or 'superadmin'.
        """
        user_role = (self.role or "").strip().lower()
        if user_role in ("admin", "superadmin"):
            return True
        from app.core.config import settings
        admin_email = (settings.ADMIN_EMAIL or "").strip().lower()
        if admin_email and self.email and self.email.strip().lower() == admin_email:
            return True
        return False

    def to_dict(self) -> Dict[str, Any]:
        """Serialize user model to frontend UserObject contract."""
        completion = self.get_profile_completion()
        return {
            "id": self.id,
            "patient_id": self.patient_id,
            "name": self.name,
            "email": self.email,
            "avatar": self.avatar,
            "role": self.role or "patient",
            "is_admin": self.is_admin,
            "is_verified": self.is_verified,
            "consent_given": self.consent_given,
            "date_of_birth": self.date_of_birth.isoformat() if self.date_of_birth else None,
            "age": self.calculate_age(),
            "height": self.height,
            "weight": self.weight,
            "profile_completed": completion["is_completed"],
            "profile_completion_percentage": completion["percentage"],
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
