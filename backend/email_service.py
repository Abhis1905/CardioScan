import smtplib, os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

def get_creds():
    user = os.environ.get("GMAIL_USER", "")
    pwd = os.environ.get("GMAIL_APP_PASSWORD", "")
    return user, pwd

def send_verification_email(to_email, name, token):
    GMAIL_USER, GMAIL_APP_PASSWORD = get_creds()
    if not GMAIL_USER or not GMAIL_APP_PASSWORD:
        print(f"⚠️ Gmail credentials not set. USER={GMAIL_USER!r}")
        return False

    verify_url = f"https://cardio-scan-lac.vercel.app/verify-email?token={token}"

    msg = MIMEMultipart("alternative")
    msg["Subject"] = "Verify your CardioScan account"
    msg["From"] = f"CardioScan <{GMAIL_USER}>"
    msg["To"] = to_email

    html = f"""
    <html><body style="font-family:sans-serif;background:#f8fafc;padding:40px 0;">
      <div style="max-width:480px;margin:0 auto;background:white;border-radius:16px;padding:40px;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <h1 style="color:#be123c;font-size:24px;margin-bottom:8px;">🫀 CardioScan</h1>
        <h2 style="color:#0f172a;font-size:20px;">Verify your email</h2>
        <p style="color:#475569;">Hi {name}, click below to verify your account:</p>
        <a href="{verify_url}" style="display:inline-block;background:linear-gradient(135deg,#be123c,#f43f5e);color:white;padding:14px 28px;border-radius:10px;text-decoration:none;font-weight:600;margin:16px 0;">
          Verify Email
        </a>
        <p style="color:#94a3b8;font-size:12px;margin-top:24px;">Or copy: {verify_url}</p>
      </div>
    </body></html>
    """

    msg.attach(MIMEText(html, "html"))

    try:
        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
            server.login(GMAIL_USER, GMAIL_APP_PASSWORD)
            server.sendmail(GMAIL_USER, to_email, msg.as_string())
        print(f"✅ Verification email sent to {to_email}")
        return True
    except Exception as e:
        print(f"❌ Email error: {e}")
        return False

def send_welcome_email(to_email, name):
    GMAIL_USER, GMAIL_APP_PASSWORD = get_creds()
    if not GMAIL_USER or not GMAIL_APP_PASSWORD:
        return False

    msg = MIMEMultipart("alternative")
    msg["Subject"] = "Welcome to CardioScan!"
    msg["From"] = f"CardioScan <{GMAIL_USER}>"
    msg["To"] = to_email

    html = f"""
    <html><body style="font-family:sans-serif;background:#f8fafc;padding:40px 0;">
      <div style="max-width:480px;margin:0 auto;background:white;border-radius:16px;padding:40px;">
        <h1 style="color:#be123c;">🫀 Welcome to CardioScan!</h1>
        <p>Hi {name}, your account is verified. Start predicting heart disease risk now.</p>
        <a href="https://cardio-scan-lac.vercel.app/predict" style="display:inline-block;background:linear-gradient(135deg,#be123c,#f43f5e);color:white;padding:14px 28px;border-radius:10px;text-decoration:none;font-weight:600;">
          Start Predicting
        </a>
      </div>
    </body></html>
    """

    msg.attach(MIMEText(html, "html"))

    try:
        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
            server.login(GMAIL_USER, GMAIL_APP_PASSWORD)
            server.sendmail(GMAIL_USER, to_email, msg.as_string())
        return True
    except Exception as e:
        print(f"❌ Welcome email error: {e}")
        return False

def send_reset_email(to_email, name, token):
    GMAIL_USER, GMAIL_APP_PASSWORD = get_creds()
    if not GMAIL_USER or not GMAIL_APP_PASSWORD:
        return False

    reset_url = f"https://cardio-scan-lac.vercel.app/reset-password?token={token}"

    msg = MIMEMultipart("alternative")
    msg["Subject"] = "Reset your CardioScan password"
    msg["From"] = f"CardioScan <{GMAIL_USER}>"
    msg["To"] = to_email

    html = f"""
    <html><body style="font-family:sans-serif;background:#f8fafc;padding:40px 0;">
      <div style="max-width:480px;margin:0 auto;background:white;border-radius:16px;padding:40px;">
        <h1 style="color:#be123c;">🫀 CardioScan</h1>
        <h2>Reset your password</h2>
        <p>Hi {name}, click below to reset your password:</p>
        <a href="{reset_url}" style="display:inline-block;background:linear-gradient(135deg,#be123c,#f43f5e);color:white;padding:14px 28px;border-radius:10px;text-decoration:none;font-weight:600;">
          Reset Password
        </a>
        <p style="color:#94a3b8;font-size:12px;">Or copy: {reset_url}</p>
      </div>
    </body></html>
    """

    msg.attach(MIMEText(html, "html"))

    try:
        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
            server.login(GMAIL_USER, GMAIL_APP_PASSWORD)
            server.sendmail(GMAIL_USER, to_email, msg.as_string())
        return True
    except Exception as e:
        print(f"❌ Reset email error: {e}")
        return False
