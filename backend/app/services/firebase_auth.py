import json
import logging
import os
import time
from typing import Any, Dict, Optional, Tuple

import firebase_admin
from firebase_admin import auth as fb_auth, credentials, exceptions
import google.auth.credentials

from app.core.config import settings

logger = logging.getLogger(__name__)


class AnonymousAdminCredentials(credentials.Base):
    """
    Credential provider for public token verification without requiring a private service account key.
    Allows Firebase Admin's TokenVerifier to operate using Google's public x509 certificates,
    avoiding ApplicationDefault credential lookups (which fail with DefaultCredentialsError in local dev).
    """

    def __init__(self, project_id: Optional[str] = None) -> None:
        super().__init__()
        self._project_id = project_id

    def get_credential(self) -> google.auth.credentials.Credentials:
        return google.auth.credentials.AnonymousCredentials()

    @property
    def project_id(self) -> Optional[str]:
        return self._project_id


class FirebaseAuthService:
    """Service for validating Firebase ID tokens using the Firebase Admin SDK."""

    def __init__(self) -> None:
        self._initialized: bool = False
        self._certs_cache: Optional[Dict[str, str]] = None
        self._certs_last_fetched: float = 0.0

    def ensure_initialized(self) -> bool:
        """Initialize Firebase Admin SDK if not already initialized."""
        if self._initialized:
            return True

        # Check if default Firebase app is already initialized
        try:
            if firebase_admin._apps and firebase_admin.DEFAULT_APP_NAME in firebase_admin._apps:
                app = firebase_admin.get_app()
                # If app was initialized with ApplicationDefault credentials (which fail locally without ADC),
                # replace it with AnonymousAdminCredentials if no service account is configured.
                if isinstance(app.credential, credentials.ApplicationDefault) and not (
                    (settings.FIREBASE_SERVICE_ACCOUNT_PATH and os.path.exists(settings.FIREBASE_SERVICE_ACCOUNT_PATH))
                    or settings.FIREBASE_SERVICE_ACCOUNT_JSON
                ):
                    firebase_admin.delete_app(app)
                else:
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

            # 3. Public token verification fallback using AnonymousAdminCredentials
            cred = AnonymousAdminCredentials(settings.FIREBASE_PROJECT_ID)
            firebase_admin.initialize_app(cred, {"projectId": settings.FIREBASE_PROJECT_ID})
            self._initialized = True
            logger.info("Firebase Admin initialized with public token verification credentials.")
            return True
        except ValueError as val_err:
            # If app already initialized under race conditions
            if "already exists" in str(val_err).lower():
                self._initialized = True
                return True
            logger.warning("Firebase Admin initialization warning: app already exists or configuration invalid.")
            return False
        except Exception as e:
            logger.warning("Firebase Admin initialization error: %s: %s", type(e).__name__, e)
            return False

    def _get_google_public_certs(self) -> Dict[str, str]:
        """Fetch Google public certificates with disk and in-memory caching fallback."""
        now = time.time()
        if self._certs_cache and (now - self._certs_last_fetched < 3600):
            return self._certs_cache

        certs_url = "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com"
        cache_path = os.path.join(os.path.dirname(__file__), "..", "data", "google_public_certs.json")

        # 1. Try to fetch from network if reachable
        try:
            import urllib.request
            req = urllib.request.Request(certs_url, headers={"User-Agent": "CardioScan-Auth"})
            with urllib.request.urlopen(req, timeout=3) as resp:
                if resp.status == 200:
                    data = resp.read().decode("utf-8")
                    certs = json.loads(data)
                    if isinstance(certs, dict) and certs:
                        self._certs_cache = certs
                        self._certs_last_fetched = now
                        try:
                            os.makedirs(os.path.dirname(cache_path), exist_ok=True)
                            with open(cache_path, "w", encoding="utf-8") as f:
                                json.dump(certs, f)
                        except Exception:
                            pass
                        return certs
        except Exception as net_err:
            logger.debug("Network fetch for Google public certs skipped/failed: %s", net_err)

        # 2. Fall back to local cached certs
        if os.path.exists(cache_path):
            try:
                with open(cache_path, "r", encoding="utf-8") as f:
                    cached = json.load(f)
                if isinstance(cached, dict) and cached:
                    self._certs_cache = cached
                    self._certs_last_fetched = now
                    return cached
            except Exception as read_err:
                logger.warning("Failed to read cached Google certs: %s", read_err)

        return self._certs_cache or {}

    def _verify_with_google_oauth2(self, token_str: str) -> Tuple[bool, Optional[Dict[str, Any]], Optional[str]]:
        """
        Direct fallback token verifier using Google's public x509 certs.
        Cryptographically verifies token signatures, project audience, and expiration independently of Firebase Admin state.
        """
        certs = self._get_google_public_certs()
        if not certs:
            logger.warning("No Google public certificates available for verification.")
            return False, None, "Firebase token verification failed."

        try:
            from google.auth import jwt as google_jwt

            # Cryptographically verify signature, audience, and expiration using Google's public x509 certs
            decoded = google_jwt.decode(
                token_str,
                certs=certs,
                audience=settings.FIREBASE_PROJECT_ID,
            )
            if not isinstance(decoded, dict):
                return False, None, "Invalid token claims."

            # Verify standard Firebase issuer
            expected_iss = f"https://securetoken.google.com/{settings.FIREBASE_PROJECT_ID}"
            if decoded.get("iss") != expected_iss:
                logger.info("Firebase token issuer mismatch: %s != %s", decoded.get("iss"), expected_iss)
                return False, None, "Invalid Firebase token."

            if "uid" not in decoded and "sub" in decoded:
                decoded["uid"] = decoded["sub"]
            return True, decoded, None
        except Exception as val_err:
            msg = str(val_err)
            if "expired" in msg.lower():
                return False, None, "Firebase token has expired."
            logger.info("Token validation failed via google.auth.jwt: %s", val_err)
            return False, None, "Invalid Firebase token."

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
            return self._verify_with_google_oauth2(token_str)

        try:
            decoded = fb_auth.verify_id_token(token_str)
            return True, decoded, None
        except fb_auth.ExpiredIdTokenError:
            return False, None, "Firebase token has expired."
        except fb_auth.RevokedIdTokenError:
            return False, None, "Firebase token has been revoked."
        except fb_auth.InvalidIdTokenError as e:
            logger.info("Invalid Firebase ID token: %s", e)
            return False, None, "Invalid Firebase token."
        except exceptions.FirebaseError as e:
            logger.warning("Firebase authentication error during token verification: %s", e)
            return self._verify_with_google_oauth2(token_str)
        except Exception as e:
            logger.warning("Unexpected error during Firebase Admin token verification: %s: %s", type(e).__name__, e)
            return self._verify_with_google_oauth2(token_str)

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
