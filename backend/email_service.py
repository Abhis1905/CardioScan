import os
import urllib.request
import urllib.error
import json

def send_verification_email(to_email, name, token):
    api_key = os.environ.get("re_g5u6XShF_5u78tSAWGhrA9tc8YAaheqn1, "")
    if not api_key:
        print("⚠️ RESEND_API_KEY not set")
        return False

    verify_url = f"https://cardio-scan-lac.vercel.app/verify-email?token={token}"

    payload = json.dumps({
        "from": "CardioScan <onboarding@resend.dev>",
        "to": [to_email],
        "subject": "Verify your CardioScan account",
        "html": f"""
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:40px;background:#fff;border-radius:16px;">
            <h1 style="color:#be123c;">🫀 CardioScan</h1>
            <h2>Verify your email</h2>
            <p>Hi {name}, click below to verify your account:</p>
            <a href="{verify_url}" style="display:inline-block;background:linear-gradient(135deg,#be123c,#f43f5e);color:white;padding:14px 28px;border-radius:10px;text-decoration:none;font-weight:600;">
                Verify Email
            </a>
            <p style="color:#94a3b8;font-size:12px;margin-top:24px;">Or copy: {verify_url}</p>
        </div>
        """
    }).encode("utf-8")

    req = urllib.request.Request(
        "https://api.resend.com/emails",
        data=payload,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        },
        method="POST"
    )

    try:
        with urllib.request.urlopen(req, timeout=10) as r:
            print(f"✅ Verification email sent to {to_email}")
            return True
    except Exception as e:
        print(f"❌ Email error: {e}")
        return False

def send_welcome_email(to_email, name):
    api_key = os.environ.get("re_g5u6XShF_5u78tSAWGhrA9tc8YAaheqn1", "")
    if not api_key:
        return False

    payload = json.dumps({
        "from": "CardioScan <onboarding@resend.dev>",
        "to": [to_email],
        "subject": "Welcome to CardioScan!",
        "html": f"""
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:40px;background:#fff;border-radius:16px;">
            <h1 style="color:#be123c;">🫀 Welcome to CardioScan!</h1>
            <p>Hi {name}, your account is verified. Start predicting now!</p>
            <a href="https://cardio-scan-lac.vercel.app/predict" style="display:inline-block;background:linear-gradient(135deg,#be123c,#f43f5e);color:white;padding:14px 28px;border-radius:10px;text-decoration:none;font-weight:600;">
                Start Predicting
            </a>
        </div>
        """
    }).encode("utf-8")

    req = urllib.request.Request(
        "https://api.resend.com/emails",
        data=payload,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        },
        method="POST"
    )

    try:
        with urllib.request.urlopen(req, timeout=10) as r:
            return True
    except Exception as e:
        print(f"❌ Welcome email error: {e}")
        return False

def send_reset_email(to_email, name, token):
    api_key = os.environ.get("re_g5u6XShF_5u78tSAWGhrA9tc8YAaheqn1", "")
    if not api_key:
        return False

    reset_url = f"https://cardio-scan-lac.vercel.app/reset-password?token={token}"

    payload = json.dumps({
        "from": "CardioScan <onboarding@resend.dev>",
        "to": [to_email],
        "subject": "Reset your CardioScan password",
        "html": f"""
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:40px;background:#fff;border-radius:16px;">
            <h1 style="color:#be123c;">🫀 CardioScan</h1>
            <h2>Reset your password</h2>
            <p>Hi {name}, click below to reset your password:</p>
            <a href="{reset_url}" style="display:inline-block;background:linear-gradient(135deg,#be123c,#f43f5e);color:white;padding:14px 28px;border-radius:10px;text-decoration:none;font-weight:600;">
                Reset Password
            </a>
            <p style="color:#94a3b8;font-size:12px;">Or copy: {reset_url}</p>
        </div>
        """
    }).encode("utf-8")

    req = urllib.request.Request(
        "https://api.resend.com/emails",
        data=payload,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        },
        method="POST"
    )

    try:
        with urllib.request.urlopen(req, timeout=10) as r:
            return True
    except Exception as e:
        print(f"❌ Reset email error: {e}")
        return False
