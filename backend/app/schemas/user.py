from datetime import date
from typing import Any, Dict, Optional
from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UserBase(BaseModel):
    name: str
    email: EmailStr


class UserResponse(BaseModel):
    id: int
    patient_id: Optional[str] = None
    name: str
    email: str
    avatar: Optional[str] = None
    is_verified: bool
    consent_given: bool
    date_of_birth: Optional[date] = None
    age: Optional[int] = None
    height: Optional[float] = None
    weight: Optional[float] = None
    profile_completed: bool = False
    profile_completion_percentage: int = 40
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class AdminUserResponse(UserResponse):
    prediction_count: int = 0


class ProfileUpdateRequest(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    date_of_birth: Optional[date] = None
    height: Optional[float] = Field(None, ge=50.0, le=260.0, description="Height in centimeters (cm)")
    weight: Optional[float] = Field(None, ge=20.0, le=350.0, description="Weight in kilograms (kg)")


class ProfileCorrectionRequest(BaseModel):
    field_name: str = Field(..., pattern="^(name|date_of_birth|height|weight)$")
    new_value: str = Field(..., min_length=1, max_length=100)
    reason: str = Field(..., min_length=10, max_length=500, description="Clinical or administrative justification for correction")


class ProfileResponse(BaseModel):
    patient_id: Optional[str] = None
    name: str
    email: str
    avatar: Optional[str] = None
    is_verified: bool
    date_of_birth: Optional[date] = None
    age: Optional[int] = None
    height: Optional[float] = None
    weight: Optional[float] = None
    profile_completed: bool
    profile_completion_percentage: int
    configured_domains_count: int
    total_domains_count: int
    domains: Dict[str, bool]
    cooldowns: Dict[str, Any]
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)
