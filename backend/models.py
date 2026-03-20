from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()

class User(db.Model):
    __tablename__ = "users"
    id              = db.Column(db.Integer, primary_key=True)
    name            = db.Column(db.String(100), nullable=False)
    email           = db.Column(db.String(150), unique=True, nullable=False)
    password_hash   = db.Column(db.String(256), nullable=True)
    google_id       = db.Column(db.String(200), nullable=True, unique=True)
    avatar          = db.Column(db.String(500), nullable=True)
    is_verified     = db.Column(db.Boolean, default=False)
    verify_token    = db.Column(db.String(200), nullable=True)
    created_at      = db.Column(db.DateTime, default=datetime.utcnow)
    predictions     = db.relationship("Prediction", backref="user", lazy=True, cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id":          self.id,
            "name":        self.name,
            "email":       self.email,
            "avatar":      self.avatar,
            "is_verified": self.is_verified,
            "created_at":  self.created_at.isoformat(),
        }

class Prediction(db.Model):
    __tablename__ = "predictions"
    id          = db.Column(db.Integer, primary_key=True)
    user_id     = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    age         = db.Column(db.Float)
    sex         = db.Column(db.Integer)
    cp          = db.Column(db.Integer)
    trestbps    = db.Column(db.Float)
    chol        = db.Column(db.Float)
    fbs         = db.Column(db.Integer)
    restecg     = db.Column(db.Integer)
    thalach     = db.Column(db.Float)
    exang       = db.Column(db.Integer)
    oldpeak     = db.Column(db.Float)
    slope       = db.Column(db.Integer)
    ca          = db.Column(db.Integer)
    thal        = db.Column(db.Integer)
    prediction  = db.Column(db.Integer)
    probability = db.Column(db.Float)
    risk_level  = db.Column(db.String(20))
    model_used  = db.Column(db.String(50))
    shap_values = db.Column(db.Text)
    notes       = db.Column(db.Text, nullable=True)
    created_at  = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        import json
        return {
            "id":          self.id,
            "user_id":     self.user_id,
            "age":         self.age,
            "sex":         self.sex,
            "cp":          self.cp,
            "trestbps":    self.trestbps,
            "chol":        self.chol,
            "fbs":         self.fbs,
            "restecg":     self.restecg,
            "thalach":     self.thalach,
            "exang":       self.exang,
            "oldpeak":     self.oldpeak,
            "slope":       self.slope,
            "ca":          self.ca,
            "thal":        self.thal,
            "prediction":  self.prediction,
            "probability": self.probability,
            "risk_level":  self.risk_level,
            "model_used":  self.model_used,
            "shap_values": json.loads(self.shap_values) if self.shap_values else [],
            "notes":       self.notes,
            "created_at":  self.created_at.isoformat(),
        }
