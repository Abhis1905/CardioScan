import logging
import os
import re
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Optional, Tuple
import httpx
from jinja2 import Environment, FileSystemLoader

from app.core.config import settings

logger = logging.getLogger(__name__)

# Template environment
TEMPLATE_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "templates")
jinja_env = Environment(loader=FileSystemLoader(TEMPLATE_DIR), autoescape=True)

RESEND_API_URL = "https://api.resend.com/emails"


def _mask_email(email: str) -> str:
    """Mask email address for privacy-safe logging."""
    if not email or "@" not in email:
        return "***"
    local, domain = email.split("@", 1)
    if len(local) <= 2:
        masked_local = local[0] + "*"
    else:
        masked_local = local[0] + "*" * (len(local) - 2) + local[-1]
    return f"{masked_local}@{domain}"


def _sanitize_error(msg: str) -> str:
    """Strip API keys, passwords, and raw tokens from error strings before logging/returning."""
    if not msg:
        return ""
    if "Bearer " in msg:
        msg = re.sub(r"Bearer\s+\S+", "Bearer [REDACTED]", msg)
    if settings.RESEND_API_KEY and settings.RESEND_API_KEY in msg:
        msg = msg.replace(settings.RESEND_API_KEY, "[REDACTED_API_KEY]")
    if settings.SMTP_PASSWORD and settings.SMTP_PASSWORD in msg:
        msg = msg.replace(settings.SMTP_PASSWORD, "[REDACTED_PASSWORD]")
    if "token=" in msg:
        msg = re.sub(r"token=[a-zA-Z0-9_\-]+", "token=[REDACTED]", msg)
    return msg[:250]


class EmailService:
    """Email service supporting Resend HTTPS API, SMTP, console, and mock providers.

    IMPORTANT SENDER RESTRICTIONS (RESEND):
    - When sending without a custom domain, Resend requires using 'onboarding@resend.dev'.
    - On the Resend free test sandbox (onboarding@resend.dev), Resend strictly permits delivery
      ONLY to the account owner's registered email address. Sending to arbitrary third-party users
      triggers HTTP 403 Forbidden with name 'restricted_api_key'.
    - Vercel subdomains (*.vercel.app) CANNOT be verified in Resend because custom DNS records
      (DKIM TXT, SPF, DMARC) cannot be set on vercel.app.
    - Full production delivery to arbitrary end users requires owning a custom top-level domain
      and completing DNS verification in Resend.
    """

    @property
    def provider(self) -> str:
        return settings.EMAIL_PROVIDER.lower().strip()

    @property
    def frontend_url(self) -> str:
        return settings.FRONTEND_URL.rstrip("/")

    def _send_resend(self, to_email: str, subject: str, html_content: str) -> Tuple[bool, Optional[str]]:
        """Deliver email using Resend HTTPS API."""
        if not settings.RESEND_API_KEY or not settings.RESEND_API_KEY.strip():
            err = "Resend API key is not configured"
            logger.error("Resend delivery failed: %s", err)
            return False, err

        if not settings.EMAIL_FROM or not settings.EMAIL_FROM.strip():
            err = "Email sender address (EMAIL_FROM) is not configured"
            logger.error("Resend delivery failed: %s", err)
            return False, err

        headers = {
            "Authorization": f"Bearer {settings.RESEND_API_KEY.strip()}",
            "Content-Type": "application/json",
            "User-Agent": "CardioScan-Backend/2.0",
        }
        payload = {
            "from": settings.EMAIL_FROM.strip(),
            "to": [to_email.strip()],
            "subject": subject,
            "html": html_content,
        }

        try:
            with httpx.Client(timeout=10.0) as client:
                response = client.post(RESEND_API_URL, headers=headers, json=payload)

            if 200 <= response.status_code < 300:
                try:
                    data = response.json()
                    email_id = data.get("id", "unknown")
                except Exception:
                    email_id = "unknown"
                logger.info(
                    "Email '%s' submitted successfully via Resend to %s (id: %s)",
                    subject,
                    _mask_email(to_email),
                    email_id,
                )
                return True, None

            # Handle 4xx / 5xx HTTP response from Resend
            try:
                err_data = response.json()
                raw_message = err_data.get("message") or err_data.get("error") or str(err_data)
                err_type = err_data.get("name", "")
            except Exception:
                raw_message = response.text or "Unknown error"
                err_type = ""

            clean_msg = _sanitize_error(str(raw_message))
            logger.error(
                "Resend API rejected request (HTTP %d, type: %s) for recipient %s: %s",
                response.status_code,
                err_type or "unspecified",
                _mask_email(to_email),
                clean_msg,
            )
            return False, f"Resend error ({response.status_code}): {clean_msg}"

        except httpx.TimeoutException:
            logger.error("Resend API request timed out for recipient %s", _mask_email(to_email))
            return False, "Email service request timed out"
        except httpx.RequestError as exc:
            clean_err = _sanitize_error(str(exc))
            logger.error("Resend API connection error: %s", clean_err)
            return False, "Failed to connect to email provider"
        except Exception as exc:
            clean_err = _sanitize_error(str(exc))
            logger.error("Unexpected error during Resend email delivery: %s", clean_err)
            return False, "Unexpected error during email delivery"

    def _send_smtp(self, to_email: str, subject: str, html_content: str) -> Tuple[bool, Optional[str]]:
        """Deliver email using configured SMTP provider."""
        if not settings.SMTP_HOST or not settings.SMTP_USER:
            err = "SMTP host or user is not configured"
            logger.warning("Email delivery skipped: %s", err)
            return False, err

        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = settings.EMAIL_FROM or settings.SMTP_USER
        msg["To"] = to_email
        msg.attach(MIMEText(html_content, "html"))

        try:
            if settings.SMTP_USE_SSL:
                with smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT, timeout=15) as server:
                    if settings.SMTP_PASSWORD:
                        server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                    server.sendmail(msg["From"], [to_email], msg.as_string())
            else:
                with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=15) as server:
                    if settings.SMTP_USE_TLS:
                        server.starttls()
                    if settings.SMTP_PASSWORD:
                        server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                    server.sendmail(msg["From"], [to_email], msg.as_string())

            logger.info("Email '%s' sent successfully via SMTP to %s", subject, _mask_email(to_email))
            return True, None
        except smtplib.SMTPAuthenticationError as e:
            logger.error("SMTP Authentication failed: %s", _sanitize_error(str(e)))
            return False, "SMTP authentication failed"
        except smtplib.SMTPConnectError as e:
            logger.error("SMTP Connection failed: %s", _sanitize_error(str(e)))
            return False, "Failed to connect to SMTP server"
        except Exception as e:
            logger.error("SMTP delivery failed: %s", _sanitize_error(str(e)))
            return False, f"Email delivery error: {_sanitize_error(str(e))}"

    def _send(self, to_email: str, subject: str, html_content: str) -> Tuple[bool, Optional[str]]:
        """Centralized email dispatcher with production isolation checks."""
        # Safeguard: Never silently use mock or console in production
        is_prod = settings.ENVIRONMENT.lower().strip() == "production"
        if is_prod and self.provider in ("mock", "console"):
            err = f"Mock/console email delivery is strictly disallowed in production (provider: {self.provider})"
            logger.error(err)
            return False, err

        if self.provider in ("disabled", "none"):
            logger.info("Email delivery skipped (provider: %s)", self.provider)
            return False, "Email sending is currently disabled"
        elif self.provider == "mock":
            return True, None
        elif self.provider == "console":
            logger.info("[CONSOLE EMAIL] Dispatching '%s' to %s", subject, _mask_email(to_email))
            return True, None
        elif self.provider == "resend":
            return self._send_resend(to_email, subject, html_content)
        elif self.provider == "smtp":
            return self._send_smtp(to_email, subject, html_content)
        else:
            err = f"Unsupported email provider: {self.provider}"
            logger.error(err)
            return False, err

    def send_verification_email(self, to_email: str, name: str, token: str) -> Tuple[bool, Optional[str]]:
        """Send account email verification link."""
        verify_url = f"{self.frontend_url}/verify-email?token={token}"
        template = jinja_env.get_template("verification_email.html")
        html_content = template.render(name=name, verify_url=verify_url)
        subject = "Verify your CardioScan account"
        return self._send(to_email, subject, html_content)

    def send_password_reset_email(self, to_email: str, name: str, token: str) -> Tuple[bool, Optional[str]]:
        """Send password reset link."""
        reset_url = f"{self.frontend_url}/reset-password?token={token}"
        template = jinja_env.get_template("password_reset_email.html")
        html_content = template.render(name=name, reset_url=reset_url)
        subject = "Reset your CardioScan password"
        return self._send(to_email, subject, html_content)

    def send_welcome_email(self, to_email: str, name: str) -> Tuple[bool, Optional[str]]:
        """Send welcome email upon successful verification."""
        template = jinja_env.get_template("welcome_email.html")
        html_content = template.render(name=name, app_url=self.frontend_url)
        subject = "Welcome to CardioScan! ❤️"
        return self._send(to_email, subject, html_content)


email_service = EmailService()
