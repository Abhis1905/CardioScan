from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field


class ClinicalFeatures(BaseModel):
    age: float = Field(..., ge=1, le=120, description="Age in years")
    sex: int = Field(..., ge=0, le=1, description="0=Female, 1=Male")
    cp: int = Field(..., ge=0, le=3, description="Chest pain type 0-3")
    trestbps: float = Field(..., ge=60, le=250, description="Resting blood pressure")
    chol: float = Field(..., ge=100, le=600, description="Serum cholesterol in mg/dl")
    fbs: int = Field(..., ge=0, le=1, description="Fasting blood sugar > 120 mg/dl")
    restecg: int = Field(..., ge=0, le=2, description="Resting ECG results 0-2")
    thalach: float = Field(..., ge=60, le=250, description="Maximum heart rate achieved")
    exang: int = Field(..., ge=0, le=1, description="Exercise induced angina")
    oldpeak: float = Field(..., ge=0.0, le=10.0, description="ST depression induced by exercise")
    slope: int = Field(..., ge=0, le=2, description="Slope of the peak exercise ST segment")
    ca: int = Field(..., ge=0, le=4, description="Number of major vessels (0-4) colored by fluoroscopy")
    thal: int = Field(..., ge=0, le=3, description="Thalassemia 0-3")


class PredictRequest(ClinicalFeatures):
    patient_name: Optional[str] = None
    patient_id: Optional[str] = None
    model: Optional[str] = "random_forest"
    ensemble: Optional[bool] = False


class WhatIfRequest(ClinicalFeatures):
    model: Optional[str] = "random_forest"


class NotesUpdateRequest(BaseModel):
    notes: str


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    system: Optional[str] = "You are a helpful medical assistant."
    messages: List[ChatMessage] = []


class ChatResponse(BaseModel):
    reply: str


class PredictResponse(BaseModel):
    prediction: int
    probability: float
    risk_level: str
    model_used: str
    shap_values: List[float]
    feature_names: List[str]
    saved_id: Optional[int] = None
    ensemble_results: Optional[Dict[str, Any]] = None
    votes: Optional[Dict[str, int]] = None


class WhatIfResponse(BaseModel):
    prediction: int
    probability: float
    risk_level: str


class PredictionItemResponse(BaseModel):
    id: int
    user_id: int
    patient_name: Optional[str] = None
    patient_id: Optional[str] = None
    current_profile_name: Optional[str] = None
    current_patient_id: Optional[str] = None
    name_was_corrected: Optional[bool] = False
    age: float
    sex: int
    cp: int
    trestbps: float
    chol: float
    fbs: int
    restecg: int
    thalach: float
    exang: int
    oldpeak: float
    slope: int
    ca: int
    thal: int
    prediction: int
    probability: float
    risk_level: str
    model_used: str
    shap_values: List[float]
    notes: Optional[str] = None
    created_at: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class AdminPredictionItemResponse(PredictionItemResponse):
    user_name: Optional[str] = "Deleted"
    user_email: Optional[str] = "Deleted"
