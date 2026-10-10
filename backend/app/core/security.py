import hashlib
import secrets
from datetime import datetime, timedelta
from typing import Any, Dict, Optional, Union

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError, VerificationError, InvalidHashError

from app.core.config import settings

# Initialize Argon2 password hasher
ph = PasswordHasher(
    time_cost=2,
    memory_cost=19456,  # 19 MiB
    parallelism=1,
    hash_len=32,
    salt_len=16,
)


def hash_password(password: str) -> str:
    """Hash a password using Argon2id."""
    return ph.hash(password)


def verify_password(plain_password: str, hashed_password: Optional[str]) -> bool:
    """Verify a plain password against an Argon2 hash. Returns False safely on any error."""
    if not hashed_password:
        return False
    try:
        return ph.verify(hashed_password, plain_password)
    except (VerifyMismatchError, VerificationError, InvalidHashError):
        return False
    except Exception:
        return False


def create_access_token(subject: Union[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """Generate signed JWT access token."""
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    # Sub must be string format to match Flask-JWT-Extended convention
    to_encode = {
        "sub": str(subject),
        "exp": expire,
        "iat": datetime.utcnow(),
    }
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt


def decode_access_token(token: str) -> Optional[Dict[str, Any]]:
    """Decode and validate a JWT access token."""
    try:
        decoded = jwt.decode(
            token,
            settings.JWT_SECRET,
            algorithms=[settings.JWT_ALGORITHM],
        )
        return decoded
    except (jwt.PyJWTError, Exception):
        return None


def generate_secure_token() -> str:
    """Generate a high-entropy URL-safe cryptographic token."""
    return secrets.token_urlsafe(32)


def hash_token(token: str) -> str:
    """Hash a verification or reset token using SHA-256 for secure DB storage."""
    return hashlib.sha256(token.encode("utf-8")).hexdigest()
