from typing import Optional
from pydantic import BaseModel, ConfigDict, EmailStr


class UserBase(BaseModel):
    name: str
    email: EmailStr


class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    avatar: Optional[str] = None
    is_verified: bool
    consent_given: bool
    created_at: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class AdminUserResponse(UserResponse):
    prediction_count: int = 0
