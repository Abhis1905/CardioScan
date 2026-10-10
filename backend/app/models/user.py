from datetime import datetime
from typing import TYPE_CHECKING, Any, Dict, List, Optional
from sqlalchemy import Boolean, Column, DateTime, Integer, String
from sqlalchemy.orm import relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.prediction import Prediction


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(150), unique=True, index=True, nullable=False)
    password_hash = Column(String(256), nullable=True)
    google_id = Column(String(200), unique=True, nullable=True)
    avatar = Column(String(500), nullable=True)
    is_verified = Column(Boolean, default=False, nullable=False)

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

    def to_dict(self) -> Dict[str, Any]:
        """Serialize user model to frontend UserObject contract."""
        return {
            "id": self.id,
            "name": self.name,
            "email": self.email,
            "avatar": self.avatar,
            "is_verified": self.is_verified,
            "consent_given": self.consent_given,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
