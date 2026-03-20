import smtplib, os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

GMAIL_USER = os.environ.get("GMAIL_USER", "")
GMAIL_APP_PASSWORD = os.environ.get("GMAIL_APP_PASSWORD", "")

def send_verification_email(to_email, name, token):
    if not GMAIL_USER or not GMAIL_APP_PASSWORD:
        print("⚠️ Gmail credentials not set")
        return False

    verify_url = f"https://cardio-scan-lac.vercel.app/verify-email?token={token}"

    html = f"""
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"/></head>
    <body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f8fafc;padding:40px 0;">
      <div style="max-width:480px;margin:0 auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <div style="background:linear-gradient(135deg,#0f172a,#1e293b);padding:32px 40px;">
          <div style="display:flex;align-items:center;gap:12px;">
            <div style="width:40px;height:40px;background:#f43f5e;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:20px;">🫀</div>
            <span style="color:white;font-size:22px;font-weight:800;">CardioScan</span>
          </div>
        </div>
        <div style="padding:40px;">
          <h2 style="color:#1e293b;font-size:22px;font-weight:700;margin-bottom:8px;">Verify your email, {name}!</h2>
          <p style="color:#64748b;font-size:15px;line-height:1.6;margin-bottom:32px;">
            Thanks for signing up for CardioScan. Click the button below to verify your email address and activate your account.
          </p>
          <a href="{verify_url}" style="display:inline-block;background:linear-gradient(135deg,#be123c,#f43f5e);color:white;text-decoration:none;padding:14px 32px;border-radius:12px;font-weight:700;font-size:15px;">
            Verify Email Address
          </a>
          <p style="color:#94a3b8;font-size:13px;margin-top:32px;line-height:1.6;">
            This link expires in 24 hours. If you didn't create an account, you can safely ignore this email.
          </p>
          <p style="color:#cbd5e1;font-size:12px;margin-top:8px;">
            Or copy this link: <a href="{verify_url}" style="color:#f43f5e;">{verify_url}</a>
          </p>
        </div>
        <div style="background:#f8fafc;padding:20px 40px;border-top:1px solid #e2e8f0;">
          <p style="color:#94a3b8;font-size:12px;margin:0;">CardioScan — Heart Disease Prediction System · Not a substitute for medical advice</p>
        </div>
      </div>
    </body>
    </html>
    """

    msg = MIMEMultipart("alternative")
    msg["Subject"] = "Verify your CardioScan account"
    msg["From"] = f"CardioScan <{GMAIL_USER}>"
    msg["To"] = to_email
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
    if not GMAIL_USER or not GMAIL_APP_PASSWORD:
        return False

    html = f"""
    <!DOCTYPE html>
    <html>
    <body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f8fafc;padding:40px 0;">
      <div style="max-width:480px;margin:0 auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <div style="background:linear-gradient(135deg,#0f172a,#1e293b);padding:32px 40px;">
          <div style="display:flex;align-items:center;gap:12px;">
            <div style="width:40px;height:40px;background:#f43f5e;border-radius:10px;font-size:20px;display:flex;align-items:center;justify-content:center;">🫀</div>
            <span style="color:white;font-size:22px;font-weight:800;">CardioScan</span>
          </div>
        </div>
        <div style="padding:40px;">
          <h2 style="color:#1e293b;font-size:22px;font-weight:700;margin-bottom:8px;">Welcome to CardioScan, {name}! 🎉</h2>
          <p style="color:#64748b;font-size:15px;line-height:1.6;">
            Your account is verified and ready. You can now run heart disease predictions, save your history, and chat with 202Officials AI assistant.
          </p>
          <div style="margin:32px 0;padding:20px;background:#fff1f2;border-radius:12px;border:1px solid #fecdd3;">
            <p style="color:#be123c;font-size:14px;font-weight:600;margin:0;">⚕️ Medical Disclaimer</p>
            <p style="color:#9f1239;font-size:13px;margin:8px 0 0;">CardioScan predictions are for informational purposes only and are not a substitute for professional medical advice.</p>
          </div>
          <a href="https://cardio-scan-lac.vercel.app" style="display:inline-block;background:linear-gradient(135deg,#be123c,#f43f5e);color:white;text-decoration:none;padding:14px 32px;border-radius:12px;font-weight:700;font-size:15px;">
            Start Predicting →
          </a>
        </div>
      </div>
    </body>
    </html>
    """

    msg = MIMEMultipart("alternative")
    msg["Subject"] = "Welcome to CardioScan! 🫀"
    msg["From"] = f"CardioScan <{GMAIL_USER}>"
    msg["To"] = to_email
    msg.attach(MIMEText(html, "html"))

    try:
        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
            server.login(GMAIL_USER, GMAIL_APP_PASSWORD)
            server.sendmail(GMAIL_USER, to_email, msg.as_string())
        print(f"✅ Welcome email sent to {to_email}")
        return True
    except Exception as e:
        print(f"❌ Welcome email error: {e}")
        return False
