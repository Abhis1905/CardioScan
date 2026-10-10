import json
import logging
import os
from typing import Any, Dict, Optional, Tuple

import firebase_admin
from firebase_admin import auth as fb_auth, credentials, exceptions

from app.core.config import settings

logger = logging.getLogger(__name__)


class FirebaseAuthService:
    """Service for validating Firebase ID tokens using the Firebase Admin SDK."""

    def __init__(self) -> None:
        self._initialized: bool = False

    def ensure_initialized(self) -> bool:
        """Initialize Firebase Admin SDK if not already initialized."""
        if self._initialized:
            return True

        # Check if default Firebase app is already initialized
        try:
            if firebase_admin._apps and firebase_admin.DEFAULT_APP_NAME in firebase_admin._apps:
                self._initialized = True
                return True
        except Exception:
            pass

        try:
            # 1. Secret file path (e.g. Render Secret File /etc/secrets/firebase-service-account.json)
            if settings.FIREBASE_SERVICE_ACCOUNT_PATH and os.path.exists(settings.FIREBASE_SERVICE_ACCOUNT_PATH):
                cred = credentials.Certificate(settings.FIREBASE_SERVICE_ACCOUNT_PATH)
                firebase_admin.initialize_app(cred, {"projectId": settings.FIREBASE_PROJECT_ID})
                self._initialized = True
                logger.info("Firebase Admin initialized via service account file path.")
                return True

            # 2. Raw JSON string from environment variable
            if settings.FIREBASE_SERVICE_ACCOUNT_JSON:
                try:
                    cred_dict = json.loads(settings.FIREBASE_SERVICE_ACCOUNT_JSON)
                    cred = credentials.Certificate(cred_dict)
                    firebase_admin.initialize_app(cred, {"projectId": settings.FIREBASE_PROJECT_ID})
                    self._initialized = True
                    logger.info("Firebase Admin initialized via service account JSON string.")
                    return True
                except Exception:
                    logger.error("Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON: invalid JSON format.")

            # 3. Default credentials / project ID fallback
            firebase_admin.initialize_app(options={"projectId": settings.FIREBASE_PROJECT_ID})
            self._initialized = True
            logger.info("Firebase Admin initialized with project options fallback.")
            return True
        except ValueError as val_err:
            # If app already initialized under race conditions
            if "already exists" in str(val_err).lower():
                self._initialized = True
                return True
            logger.warning("Firebase Admin initialization warning: app already exists or configuration invalid.")
            return False
        except Exception:
            logger.warning("Firebase Admin initialization deferred: service account credentials not configured.")
            return False

    def verify_id_token(self, id_token: str) -> Tuple[bool, Optional[Dict[str, Any]], Optional[str]]:
        """
        Verify a Firebase ID token.
        
        Returns:
            Tuple of (is_valid: bool, decoded_claims: Optional[Dict], error_message: Optional[str])
        """
        if not id_token or not isinstance(id_token, str):
            return False, None, "Token is required and must be a string."

        token_str = id_token.strip()
        if len(token_str) < 10:
            return False, None, "Token format is invalid."

        if not self.ensure_initialized():
            return False, None, "Firebase authentication service is not configured or unavailable."

        try:
            decoded = fb_auth.verify_id_token(token_str)
            return True, decoded, None
        except fb_auth.ExpiredIdTokenError:
            return False, None, "Firebase token has expired."
        except fb_auth.RevokedIdTokenError:
            return False, None, "Firebase token has been revoked."
        except fb_auth.InvalidIdTokenError:
            return False, None, "Invalid Firebase token."
        except exceptions.FirebaseError:
            logger.warning("Firebase authentication error during token verification.")
            return False, None, "Firebase authentication verification failed."
        except Exception:
            logger.warning("Unexpected error during Firebase token verification.")
            return False, None, "Firebase token verification failed."

    def delete_user(self, uid: str) -> bool:
        """
        Delete a Firebase user by UID using Admin SDK.
        Returns True if deleted or already nonexistent, False on error.
        """
        if not uid or not isinstance(uid, str):
            return False

        if not self.ensure_initialized():
            logger.warning("Firebase Admin not initialized; skipped user deletion for UID.")
            return False

        try:
            fb_auth.delete_user(uid.strip())
            return True
        except fb_auth.UserNotFoundError:
            return True
        except Exception:
            logger.warning("Could not delete Firebase Auth user via Admin SDK.")
            return False

    def process_pending_cleanups(self, db: Any, max_attempts: int = 5) -> Tuple[int, int]:
        """
        Process pending Firebase cleanups stored in database.
        Returns tuple of (successful_count, remaining_count).
        """
        from datetime import datetime
        from app.models.cleanup import PendingFirebaseCleanup

        try:
            pending = (
                db.query(PendingFirebaseCleanup)
                .filter(PendingFirebaseCleanup.attempts < max_attempts)
                .order_by(PendingFirebaseCleanup.created_at.asc())
                .all()
            )
        except Exception as query_err:
            logger.warning(f"Failed to query pending cleanups: {query_err}")
            return 0, 0

        successful = 0
        for item in pending:
            item.attempts += 1
            item.last_attempt_at = datetime.utcnow()
            try:
                if self.delete_user(item.firebase_uid):
                    db.delete(item)
                    successful += 1
                else:
                    item.last_error = "Firebase deletion attempt returned False"
            except Exception as e:
                item.last_error = str(e)[:500]

        try:
            db.commit()
        except Exception as commit_err:
            logger.error(f"Failed to commit pending cleanups: {commit_err}")
            db.rollback()

        try:
            remaining = db.query(PendingFirebaseCleanup).count()
        except Exception:
            remaining = 0

        return successful, remaining


firebase_auth_service = FirebaseAuthService()
