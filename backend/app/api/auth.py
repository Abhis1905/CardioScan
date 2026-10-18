from datetime import datetime
from typing import Any, Dict, Optional
from fastapi import APIRouter, Depends, Query, Request, status
from fastapi.responses import JSONResponse
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.config import settings
from app.core.security import create_access_token, hash_password, verify_password
from app.db.session import get_db
from app.models.cleanup import PendingFirebaseCleanup
from app.models.user import User
from app.schemas.auth import (
    FirebaseAuthRequest,
    ForgotPasswordRequest,
    GoogleAuthRequest,
    ResendVerificationRequest,
    ResetPasswordRequest,
    TurnstileVerifyRequest,
    UserLogin,
    UserRegister,
)
from app.services.email import email_service
from app.services.firebase_auth import firebase_auth_service
from app.services.tokens import (
    check_resend_cooldown,
    consume_password_reset_token,
    create_password_reset_token,
    create_verification_token,
    verify_email_token,
    verify_password_reset_token,
)
from app.services.patient_identity import assign_patient_id, retire_patient_id
from app.services.turnstile import turnstile_service

router = APIRouter(prefix="/auth", tags=["auth"])


def _get_client_ip(request: Request) -> Optional[str]:
    """Safely extract the client IP address from request headers or socket."""
    if not request:
        return None
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    if request.client:
        return request.client.host
    return None


@router.post("/verify-turnstile")
def verify_turnstile(payload: TurnstileVerifyRequest, request: Request):
    """Verify a standalone Cloudflare Turnstile token."""
    client_ip = _get_client_ip(request)
    is_valid, error_msg = turnstile_service.verify_token(payload.turnstile_token, remote_ip=client_ip)
    if not is_valid:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={"error": error_msg or "Bot verification failed."},
        )
    return {"success": True, "message": "Bot verification passed."}


@router.post("/register", status_code=status.HTTP_201_CREATED)
def register(payload: UserRegister, request: Request, db: Session = Depends(get_db)):
    client_ip = _get_client_ip(request)
    turnstile_valid, turnstile_err = turnstile_service.verify_token(payload.turnstile_token, remote_ip=client_ip)
    if not turnstile_valid:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={"error": turnstile_err or "Bot verification failed."},
        )

    name = payload.name.strip()
    email = payload.email.strip().lower()
    password = payload.password

    if not name or not email or not password:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={"error": "Name, email and password are required"},
        )

    if len(password) < 6:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={"error": "Password must be at least 6 characters"},
        )

    existing_user = db.query(User).filter(User.email == email).first()
    if existing_user:
        return JSONResponse(
            status_code=status.HTTP_409_CONFLICT,
            content={"error": "Email already registered"},
        )

    pw_hash = hash_password(password)

    user = User(
        name=name,
        email=email,
        password_hash=pw_hash,
        is_verified=False,
    )
    db.add(user)
    try:
        db.commit()
        db.refresh(user)
    except IntegrityError:
        db.rollback()
        return JSONResponse(
            status_code=status.HTTP_409_CONFLICT,
            content={"error": "Email already registered"},
        )

    # Generate single-use verification token
    raw_token = create_verification_token(user, db)

    # Dispatch verification email
    sent, error_msg = email_service.send_verification_email(email, name, raw_token)
    if not sent:
        # Roll back and remove user if email service failed to deliver
        try:
            db.delete(user)
            db.commit()
        except Exception:
            db.rollback()
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"error": f"Failed to send verification email: {error_msg}. Please try again later."},
        )

    return {
        "message": "Registration successful! Please check your email to verify your account.",
        "email": email,
    }


@router.post("/login")
def login(payload: UserLogin, request: Request, db: Session = Depends(get_db)):
    client_ip = _get_client_ip(request)
    turnstile_valid, turnstile_err = turnstile_service.verify_token(payload.turnstile_token, remote_ip=client_ip)
    if not turnstile_valid:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={"error": turnstile_err or "Bot verification failed."},
        )

    email = payload.email.strip().lower()
    password = payload.password

    user = db.query(User).filter(User.email == email).first()
    if not user or not user.password_hash or not verify_password(password, user.password_hash):
        return JSONResponse(
            status_code=status.HTTP_401_UNAUTHORIZED,
            content={"error": "Invalid email or password"},
        )

    if not user.is_verified:
        return JSONResponse(
            status_code=status.HTTP_401_UNAUTHORIZED,
            content={
                "error": "Please verify your email before logging in.",
                "not_verified": True,
                "email": email,
            },
        )

    # Idempotently ensure permanent patient ID is assigned to verified account
    if not user.patient_id:
        assign_patient_id(user, db)

    token = create_access_token(subject=user.id)
    return {
        "token": token,
        "user": user.to_dict(),
    }


@router.get("/verify-email")
def verify_email(token: str = Query("", description="Verification token"), db: Session = Depends(get_db)):
    if not token:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={"error": "Verification token is missing"},
        )

    success, user, error_msg = verify_email_token(token, db)
    if not success:
        if error_msg and "expired" in error_msg.lower():
            return JSONResponse(
                status_code=status.HTTP_400_BAD_REQUEST,
                content={
                    "error": error_msg,
                    "expired": True,
                    "email": user.email if user else "",
                },
            )
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={"error": error_msg or "Invalid verification link"},
        )

    # Issue JWT upon verification
    jwt_token = create_access_token(subject=user.id)

    # Optional welcome email
    email_service.send_welcome_email(user.email, user.name)

    return {
        "token": jwt_token,
        "user": user.to_dict(),
        "message": "Email verified successfully! Welcome to CardioScan.",
    }


@router.post("/resend-verification")
def resend_verification(payload: ResendVerificationRequest, db: Session = Depends(get_db)):
    email = payload.email.strip().lower()
    user = db.query(User).filter(User.email == email).first()

    # Prevent email enumeration: return benign message if user doesn't exist
    if not user:
        return {"message": "If this email is registered, a verification link has been sent."}

    if user.is_verified:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={"error": "This email is already verified. Please log in."},
        )

    allowed, wait_minutes = check_resend_cooldown(user)
    if not allowed:
        return JSONResponse(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            content={
                "error": f"Please wait {wait_minutes} minute(s) before requesting another email.",
                "wait_minutes": wait_minutes,
            },
        )

    raw_token = create_verification_token(user, db)
    sent, error_msg = email_service.send_verification_email(email, user.name, raw_token)
    if not sent:
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"error": "Failed to send verification email. Please try again later."},
        )

    return {"message": "Verification email sent! Check your inbox (and spam folder)."}


@router.post("/forgot-password")
def forgot_password(payload: ForgotPasswordRequest, db: Session = Depends(get_db)):
    email = payload.email.strip().lower()
    user = db.query(User).filter(User.email == email).first()

    # Generic message avoids leaking whether email exists
    if not user:
        return {"message": "If this email is registered, a reset link has been sent."}

    raw_token = create_password_reset_token(user, db)
    email_service.send_password_reset_email(email, user.name, raw_token)
    return {"message": "If this email is registered, a reset link has been sent."}


@router.post("/reset-password")
def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)):
    token = payload.token
    new_password = payload.password

    if len(new_password) < 6:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={"error": "Password must be at least 6 characters"},
        )

    success, user, error_msg = verify_password_reset_token(token, db)
    if not success:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={"error": error_msg or "Invalid or expired reset link"},
        )

    new_hash = hash_password(new_password)
    consume_password_reset_token(user, new_hash, db)
    return {"message": "Password reset successfully! You can now log in."}


@router.post("/google")
def google_auth(payload: GoogleAuthRequest, db: Session = Depends(get_db)):
    token = payload.credential
    if not settings.GOOGLE_CLIENT_ID:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={"error": "Google authentication is not configured on this server."},
        )

    try:
        from google.oauth2 import id_token
        from google.auth.transport import requests as g_requests

        idinfo = id_token.verify_oauth2_token(token, g_requests.Request(), settings.GOOGLE_CLIENT_ID)
        email = idinfo["email"].lower()
        name = idinfo.get("name", email.split("@")[0])
        google_id = idinfo["sub"]
        avatar = idinfo.get("picture", "")

        user = db.query(User).filter(User.email == email).first()
        if not user:
            user = User(
                name=name,
                email=email,
                google_id=google_id,
                avatar=avatar,
                is_verified=True,
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        else:
            if not user.google_id:
                user.google_id = google_id
                user.avatar = avatar
                user.is_verified = True
                db.commit()
                db.refresh(user)

        if user.is_verified and not user.patient_id:
            assign_patient_id(user, db)

        jwt_token = create_access_token(subject=user.id)
        return {"token": jwt_token, "user": user.to_dict()}
    except Exception as e:
        return JSONResponse(
            status_code=status.HTTP_401_UNAUTHORIZED,
            content={"error": str(e)},
        )


@router.post("/firebase")
def firebase_auth(payload: FirebaseAuthRequest, request: Request, db: Session = Depends(get_db)):
    """
    Authenticate or register a user via Firebase ID Token.
    
    Security & Safe Account Linking Policy:
    1. Validates Cloudflare Turnstile bot verification token.
    2. Validates the Firebase ID token cryptographically.
    3. Enforces that email is verified in Firebase (email_verified == True).
    4. If a user already exists with matching firebase_uid, authenticates directly.
    5. If no user has this firebase_uid, but an existing user has the same email:
       REJECTS with HTTP 409 Conflict ('account_exists_conflict').
       Never automatically links or leaks account data based solely on email matching.
    6. If no user exists with this email, provisions a new verified user account with firebase_uid.
    7. Issues a standard CardioScan JWT (sub: user.id), preserving all downstream protected routes.
    """
    client_ip = _get_client_ip(request)
    turnstile_valid, turnstile_err = turnstile_service.verify_token(payload.turnstile_token, remote_ip=client_ip)
    if not turnstile_valid:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={"error": turnstile_err or "Bot verification failed."},
        )

    token_str = payload.id_token.strip()
    if not token_str:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={"error": "Firebase ID token is required."},
        )

    is_valid, decoded, error_msg = firebase_auth_service.verify_id_token(token_str)
    if not is_valid or not decoded:
        return JSONResponse(
            status_code=status.HTTP_401_UNAUTHORIZED,
            content={"error": error_msg or "Invalid or expired Firebase authentication token."},
        )

    email = (decoded.get("email") or "").strip().lower()
    if not email:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={"error": "Firebase token does not contain a valid email address."},
        )

    email_verified = decoded.get("email_verified", False)
    if not email_verified:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={
                "error": "Please verify your email address before continuing.",
                "not_verified": True,
                "email": email,
            },
        )

    firebase_uid = decoded.get("uid")
    if not firebase_uid:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={"error": "Firebase token does not contain a valid user identifier."},
        )

    # 1. Check if user already exists by firebase_uid
    user = db.query(User).filter(User.firebase_uid == firebase_uid).first()
    if user:
        avatar = decoded.get("picture")
        if avatar and not user.avatar:
            user.avatar = avatar
        if not user.is_verified:
            user.is_verified = True
        db.commit()
        db.refresh(user)

        if not user.patient_id:
            assign_patient_id(user, db)

        jwt_token = create_access_token(subject=user.id)
        return {
            "token": jwt_token,
            "user": user.to_dict(),
            "message": "Authentication successful.",
        }

    # 2. Safe Account Linking Check: Check if an account already exists with this email
    existing_user = db.query(User).filter(User.email == email).first()
    if existing_user:
        return JSONResponse(
            status_code=status.HTTP_409_CONFLICT,
            content={
                "error": "An account with this email already exists. Automatic linking is disabled for security. Please sign in with your original method.",
                "code": "account_exists_conflict",
            },
        )

    # 3. Create brand new verified user
    name = (decoded.get("name") or email.split("@")[0]).strip()
    avatar = decoded.get("picture")

    new_user = User(
        name=name,
        email=email,
        firebase_uid=firebase_uid,
        avatar=avatar,
        is_verified=True,
    )
    db.add(new_user)
    try:
        db.commit()
        db.refresh(new_user)
        assign_patient_id(new_user, db)
    except IntegrityError:
        db.rollback()
        return JSONResponse(
            status_code=status.HTTP_409_CONFLICT,
            content={
                "error": "Account could not be created due to a conflict.",
                "code": "account_exists_conflict",
            },
        )

    jwt_token = create_access_token(subject=new_user.id)
    return {
        "token": jwt_token,
        "user": new_user.to_dict(),
        "message": "Welcome to CardioScan!",
    }


@router.get("/me")
def get_me(current_user: User = Depends(get_current_user)):
    return current_user.to_dict()


@router.post("/record-consent")
def record_consent(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    current_user.consent_given = True
    current_user.consent_at = datetime.utcnow()
    db.commit()
    db.refresh(current_user)
    return {
        "message": "Consent recorded.",
        "user": current_user.to_dict(),
    }


@router.delete("/delete-account")
def delete_account(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    fb_uid = current_user.firebase_uid
    pid = current_user.patient_id

    # Permanently retire patient ID so it can never be reused
    if pid:
        retire_patient_id(pid, db, reason="account_deletion")

    db.delete(current_user)
    db.commit()

    if fb_uid:
        fb_deleted = firebase_auth_service.delete_user(fb_uid)
        if fb_deleted:
            return {
                "completed": True,
                "firebase_cleanup": "completed",
                "message": "Account deleted successfully",
            }
        else:
            cleanup_record = PendingFirebaseCleanup(
                firebase_uid=fb_uid,
                attempts=1,
                last_error="Initial deletion attempt failed or Firebase Admin uninitialized",
                last_attempt_at=datetime.utcnow(),
            )
            db.add(cleanup_record)
            try:
                db.commit()
            except Exception:
                db.rollback()

            return JSONResponse(
                status_code=status.HTTP_202_ACCEPTED,
                content={
                    "completed": False,
                    "firebase_cleanup": "pending",
                    "message": "Database account deleted. Firebase identity cleanup is queued and pending.",
                },
            )

    return {
        "completed": True,
        "firebase_cleanup": "none",
        "message": "Account deleted successfully",
    }
