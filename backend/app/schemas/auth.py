from typing import Optional
from pydantic import BaseModel, EmailStr, Field

from app.schemas.user import UserResponse


class UserRegister(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=6)
    turnstile_token: Optional[str] = Field(None, description="Cloudflare Turnstile verification token")


class UserLogin(BaseModel):
    email: EmailStr
    password: str
    turnstile_token: Optional[str] = Field(None, description="Cloudflare Turnstile verification token")


class GoogleAuthRequest(BaseModel):
    credential: str


class FirebaseAuthRequest(BaseModel):
    id_token: str = Field(..., min_length=10)
    turnstile_token: Optional[str] = Field(None, description="Cloudflare Turnstile verification token")


class TurnstileVerifyRequest(BaseModel):
    turnstile_token: str = Field(..., min_length=1, description="Cloudflare Turnstile verification token")


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    password: str = Field(..., min_length=6)


class ResendVerificationRequest(BaseModel):
    email: EmailStr


class AuthResponse(BaseModel):
    token: str
    user: UserResponse
    message: Optional[str] = None


class RegisterResponse(BaseModel):
    message: str
    email: str


class MessageResponse(BaseModel):
    message: str
