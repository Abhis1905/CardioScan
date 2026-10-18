import json
import logging
import urllib.error
import urllib.parse
import urllib.request
from typing import Optional, Tuple

from app.core.config import settings

logger = logging.getLogger(__name__)


class TurnstileService:
    """Service for validating Cloudflare Turnstile tokens via Cloudflare's Siteverify API."""

    def verify_token(
        self,
        token: Optional[str],
        remote_ip: Optional[str] = None,
    ) -> Tuple[bool, Optional[str]]:
        """
        Verify a Turnstile token against Cloudflare's Siteverify API.

        Returns:
            Tuple of (is_valid: bool, error_message: Optional[str])
        """
        secret_key = (settings.TURNSTILE_SECRET_KEY or "").strip()

        # If Turnstile secret is not configured in development or test, allow bypass with warning
        if not secret_key:
            if settings.is_production:
                logger.error("TURNSTILE_SECRET_KEY is missing in production environment.")
                return False, "Bot protection service is misconfigured. Please contact support."
            logger.debug("Turnstile secret key not configured; skipping verification in non-production.")
            return True, None

        if not token or not isinstance(token, str) or not token.strip():
            return False, "Bot verification token is required. Please complete the verification."

        token_str = token.strip()

        # Prepare payload for Cloudflare Siteverify API
        form_data = {
            "secret": secret_key,
            "response": token_str,
        }
        if remote_ip and isinstance(remote_ip, str) and remote_ip.strip():
            form_data["remoteip"] = remote_ip.strip()

        encoded_data = urllib.parse.urlencode(form_data).encode("utf-8")

        req = urllib.request.Request(
            settings.TURNSTILE_VERIFY_URL,
            data=encoded_data,
            headers={
                "Content-Type": "application/x-www-form-urlencoded",
                "User-Agent": "CardioScan-FastAPI/2.0",
            },
            method="POST",
        )

        try:
            with urllib.request.urlopen(req, timeout=settings.TURNSTILE_TIMEOUT_SECONDS) as response:
                raw_body = response.read().decode("utf-8")
                data = json.loads(raw_body)
        except urllib.error.HTTPError as http_err:
            logger.warning("Cloudflare Siteverify HTTP error %s", http_err.code)
            return False, "Bot verification failed due to remote server error. Please try again."
        except (urllib.error.URLError, TimeoutError) as net_err:
            logger.warning("Cloudflare Siteverify network error or timeout: %s", type(net_err).__name__)
            return False, "Bot verification timed out. Please try again."
        except Exception as exc:
            logger.warning("Unexpected error during Turnstile verification: %s", type(exc).__name__)
            return False, "Bot verification service is temporarily unavailable."

        success = data.get("success", False)
        if success is True:
            return True, None

        error_codes = data.get("error-codes", [])
        logger.info("Cloudflare Turnstile verification rejected with codes: %s", error_codes)

        if "timeout-or-duplicate" in error_codes:
            return False, "Bot verification expired or was already used. Please complete the verification again."
        if "invalid-input-response" in error_codes:
            return False, "Bot verification failed: invalid token. Please try again."
        if "missing-input-response" in error_codes:
            return False, "Bot verification token is missing. Please complete the verification."

        return False, "Bot verification failed. Please try again."


turnstile_service = TurnstileService()
