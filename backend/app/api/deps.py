from typing import Generator, Optional
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import decode_access_token
from app.db.session import get_db
from app.models.user import User

security_scheme = HTTPBearer(auto_error=False)


def get_current_user_optional(
    auth: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme),
    db: Session = Depends(get_db),
) -> Optional[User]:
    """Extract authenticated user if Authorization Bearer token is provided."""
    if not auth or not auth.credentials:
        return None

    payload = decode_access_token(auth.credentials)
    if not payload:
        return None

    user_id_str = payload.get("sub")
    if not user_id_str:
        return None

    try:
        user_id = int(user_id_str)
    except ValueError:
        return None

    user = db.query(User).filter(User.id == user_id).first()
    return user


def get_current_user(
    current_user: Optional[User] = Depends(get_current_user_optional),
) -> User:
    """Enforce authentication for protected routes."""
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return current_user


def get_current_admin(
    current_user: User = Depends(get_current_user),
) -> User:
    """Enforce administrator role for protected admin routes."""
    if not current_user.email or current_user.email.lower() != settings.ADMIN_EMAIL.lower():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return current_user
