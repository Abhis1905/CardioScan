import smtplib, os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

GMAIL_USER         = os.environ.get("GMAIL_USER", "")
GMAIL_APP_PASSWORD = os.environ.get("GMAIL_APP_PASSWORD", "")

# ── Read frontend URL from env so it works on Railway + Vercel ────────────────
# Set FRONTEND_URL=https://cardio-scan-lac.vercel.app in Railway environment vars
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:3000").rstrip("/")


def _send(to_email: str, subject: str, html: str) -> bool:
    """Shared SMTP sender. Returns True on success."""
    if not GMAIL_USER or not GMAIL_APP_PASSWORD:
        print("⚠️  GMAIL_USER or GMAIL_APP_PASSWORD env var not set — email skipped")
        return False
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"]    = f"CardioScan <{GMAIL_USER}>"
    msg["To"]      = to_email
    msg.attach(MIMEText(html, "html"))
    try:
        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
            server.login(GMAIL_USER, GMAIL_APP_PASSWORD)
            server.sendmail(GMAIL_USER, to_email, msg.as_string())
        print(f"✅ Email '{subject}' sent → {to_email}")
        return True
    except Exception as e:
        print(f"❌ Email error ({subject} → {to_email}): {e}")
        return False


# ── 1. Verification email ─────────────────────────────────────────────────────
def send_verification_email(to_email: str, name: str, token: str) -> bool:
    verify_url = f"{FRONTEND_URL}/verify-email?token={token}"
    html = f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f8fafc;padding:40px 0;">
  <div style="max-width:480px;margin:0 auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <div style="background:linear-gradient(135deg,#0f172a,#1e293b);padding:32px 40px;">
      <span style="color:white;font-size:22px;font-weight:800;">&#10084;&#65039; CardioScan</span>
    </div>
    <div style="padding:40px;">
      <h2 style="color:#1e293b;font-size:22px;font-weight:700;margin-bottom:8px;">Verify your email, {name}!</h2>
      <p style="color:#64748b;font-size:15px;line-height:1.6;margin-bottom:32px;">
        Thanks for signing up. Click below to verify your email and activate your account.
      </p>
      <a href="{verify_url}"
         style="display:inline-block;background:#be123c;color:white;text-decoration:none;
                padding:14px 32px;border-radius:12px;font-weight:700;font-size:15px;">
        Verify Email Address
      </a>
      <p style="color:#94a3b8;font-size:13px;margin-top:32px;line-height:1.6;">
        This link expires in <strong>24 hours</strong>. If you didn&#39;t create an account, ignore this email.
      </p>
      <p style="color:#cbd5e1;font-size:12px;margin-top:8px;word-break:break-all;">
        Or copy: <a href="{verify_url}" style="color:#be123c;">{verify_url}</a>
      </p>
    </div>
    <div style="background:#f8fafc;padding:20px 40px;border-top:1px solid #e2e8f0;">
      <p style="color:#94a3b8;font-size:12px;margin:0;">
        CardioScan &mdash; Not a substitute for medical advice
      </p>
    </div>
  </div>
</body>
</html>"""
    return _send(to_email, "Verify your CardioScan account", html)


# ── 2. Welcome email (sent after verification) ────────────────────────────────
def send_welcome_email(to_email: str, name: str) -> bool:
    app_url = FRONTEND_URL
    html = f"""<!DOCTYPE html>
<html>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f8fafc;padding:40px 0;">
  <div style="max-width:480px;margin:0 auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <div style="background:linear-gradient(135deg,#0f172a,#1e293b);padding:32px 40px;">
      <span style="color:white;font-size:22px;font-weight:800;">&#10084;&#65039; CardioScan</span>
    </div>
    <div style="padding:40px;">
      <h2 style="color:#1e293b;font-size:22px;font-weight:700;margin-bottom:8px;">Welcome, {name}! &#127881;</h2>
      <p style="color:#64748b;font-size:15px;line-height:1.6;">
        Your account is verified. You can now run heart disease predictions, save your history, and chat with our AI assistant.
      </p>
      <div style="margin:24px 0;padding:16px 20px;background:#fff1f2;border-radius:12px;border:1px solid #fecdd3;">
        <p style="color:#be123c;font-size:13px;font-weight:600;margin:0 0 4px;">&#9877;&#65039; Medical Disclaimer</p>
        <p style="color:#9f1239;font-size:13px;margin:0;">
          CardioScan is for informational purposes only and is not a substitute for professional medical advice.
        </p>
      </div>
      <a href="{app_url}"
         style="display:inline-block;background:#be123c;color:white;text-decoration:none;
                padding:14px 32px;border-radius:12px;font-weight:700;font-size:15px;">
        Start Predicting &rarr;
      </a>
    </div>
  </div>
</body>
</html>"""
    return _send(to_email, "Welcome to CardioScan! ❤️", html)


# ── 3. Password reset email ───────────────────────────────────────────────────
# This was MISSING in the original — causing an ImportError crash on /forgot-password
def send_reset_email(to_email: str, name: str, token: str) -> bool:
    reset_url = f"{FRONTEND_URL}/reset-password?token={token}"
    html = f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f8fafc;padding:40px 0;">
  <div style="max-width:480px;margin:0 auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <div style="background:linear-gradient(135deg,#0f172a,#1e293b);padding:32px 40px;">
      <span style="color:white;font-size:22px;font-weight:800;">&#10084;&#65039; CardioScan</span>
    </div>
    <div style="padding:40px;">
      <h2 style="color:#1e293b;font-size:22px;font-weight:700;margin-bottom:8px;">Reset your password, {name}</h2>
      <p style="color:#64748b;font-size:15px;line-height:1.6;margin-bottom:32px;">
        We received a request to reset your password. Click below to choose a new one.
      </p>
      <a href="{reset_url}"
         style="display:inline-block;background:#be123c;color:white;text-decoration:none;
                padding:14px 32px;border-radius:12px;font-weight:700;font-size:15px;">
        Reset Password
      </a>
      <p style="color:#94a3b8;font-size:13px;margin-top:32px;line-height:1.6;">
        This link expires in <strong>1 hour</strong>. If you didn&#39;t request this, ignore this email — your password won&#39;t change.
      </p>
      <p style="color:#cbd5e1;font-size:12px;margin-top:8px;word-break:break-all;">
        Or copy: <a href="{reset_url}" style="color:#be123c;">{reset_url}</a>
      </p>
    </div>
    <div style="background:#f8fafc;padding:20px 40px;border-top:1px solid #e2e8f0;">
      <p style="color:#94a3b8;font-size:12px;margin:0;">CardioScan &mdash; Not a substitute for medical advice</p>
    </div>
  </div>
</body>
</html>"""
    return _send(to_email, "Reset your CardioScan password", html)