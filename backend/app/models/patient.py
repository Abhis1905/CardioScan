from datetime import datetime
from sqlalchemy import Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from app.db.base import Base


class RetiredPatientID(Base):
    """
    Tombstone table for patient IDs that were previously assigned to accounts
    that have since been deleted. Ensures a patient-facing ID is permanently
    retired and never reassigned to another patient.
    """
    __tablename__ = "retired_patient_ids"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(String(32), unique=True, index=True, nullable=False)
    retired_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    reason = Column(String(100), default="account_deletion", nullable=False)


class ProfileCorrectionLog(Base):
    """
    Audit log for legitimate clinical and demographic profile corrections
    performed on biometric/demographic baselines.
    """
    __tablename__ = "profile_correction_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    field_name = Column(String(50), nullable=False)
    old_value = Column(String(255), nullable=True)
    new_value = Column(String(255), nullable=True)
    reason = Column(String(500), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="correction_logs")
