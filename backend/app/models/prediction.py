import json
from datetime import datetime
from typing import TYPE_CHECKING, Any, Dict, List, Optional
from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.user import User


class Prediction(Base):
    __tablename__ = "predictions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    # 13 Clinical features
    age = Column(Float, nullable=False)
    sex = Column(Integer, nullable=False)
    cp = Column(Integer, nullable=False)
    trestbps = Column(Float, nullable=False)
    chol = Column(Float, nullable=False)
    fbs = Column(Integer, nullable=False)
    restecg = Column(Integer, nullable=False)
    thalach = Column(Float, nullable=False)
    exang = Column(Integer, nullable=False)
    oldpeak = Column(Float, nullable=False)
    slope = Column(Integer, nullable=False)
    ca = Column(Integer, nullable=False)
    thal = Column(Integer, nullable=False)

    # ML results
    prediction = Column(Integer, nullable=False)
    probability = Column(Float, nullable=False)
    risk_level = Column(String(20), nullable=False, index=True)
    model_used = Column(String(50), nullable=False, index=True)
    shap_values = Column(Text, nullable=True)  # JSON-encoded array
    notes = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, index=True, nullable=False)

    # Relationship back to User
    user = relationship("User", back_populates="predictions")

    def to_dict(self) -> Dict[str, Any]:
        """Serialize prediction model to frontend PredictionObject contract."""
        parsed_shap = []
        if self.shap_values:
            try:
                parsed_shap = json.loads(self.shap_values)
            except Exception:
                parsed_shap = []

        return {
            "id": self.id,
            "user_id": self.user_id,
            "age": self.age,
            "sex": self.sex,
            "cp": self.cp,
            "trestbps": self.trestbps,
            "chol": self.chol,
            "fbs": self.fbs,
            "restecg": self.restecg,
            "thalach": self.thalach,
            "exang": self.exang,
            "oldpeak": self.oldpeak,
            "slope": self.slope,
            "ca": self.ca,
            "thal": self.thal,
            "prediction": self.prediction,
            "probability": self.probability,
            "risk_level": self.risk_level,
            "model_used": self.model_used,
            "shap_values": parsed_shap,
            "notes": self.notes,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
