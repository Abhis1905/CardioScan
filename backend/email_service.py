import os
import urllib.request
import json

def send_verification_email(to_email, name, token):
    api_key = os.environ.get("RESEND_API_KEY", "")
    if not api_key:
        print("⚠️ RESEND_API_KEY not set")
        return False

    verify_url = f"https://cardio-scan-lac.vercel.app/verify-email?token={token}"

    payload = json.dumps({
        "from": "CardioScan <onboarding@resend.dev>",
        "to": [to_email],
        "subject": "Verify your CardioScan account",
        "html": f"<div style='font-family:sans-serif;padding:40px;'><h1 style='color:#be123c;'>CardioScan</h1><p>Hi {name}, verify your account:</p><a href='{verify_url}' style='background:#f43f5e;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;'>Verify Email</a><p style='color:#94a3b8;font-size:12px;margin-top:16px;'>{verify_url}</p></div>"
    }).encode("utf-8")

    req = urllib.request.Request(
        "https://api.resend.com/emails",
        data=payload,
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
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
    api_key = os.environ.get("RESEND_API_KEY", "")
    if not api_key:
        return False
    payload = json.dumps({
        "from": "CardioScan <onboarding@resend.dev>",
        "to": [to_email],
        "subject": "Welcome to CardioScan!",
        "html": f"<div style='font-family:sans-serif;padding:40px;'><h1 style='color:#be123c;'>Welcome {name}!</h1><p>Your account is verified.</p><a href='https://cardio-scan-lac.vercel.app/predict' style='background:#f43f5e;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;'>Start Predicting</a></div>"
    }).encode("utf-8")
    req = urllib.request.Request("https://api.resend.com/emails", data=payload,
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=10) as r:
            return True
    except Exception as e:
        print(f"❌ Welcome email error: {e}")
        return False

def send_reset_email(to_email, name, token):
    api_key = os.environ.get("RESEND_API_KEY", "")
    if not api_key:
        return False
    reset_url = f"https://cardio-scan-lac.vercel.app/reset-password?token={token}"
    payload = json.dumps({
        "from": "CardioScan <onboarding@resend.dev>",
        "to": [to_email],
        "subject": "Reset your CardioScan password",
        "html": f"<div style='font-family:sans-serif;padding:40px;'><h1 style='color:#be123c;'>Reset Password</h1><p>Hi {name}, click to reset:</p><a href='{reset_url}' style='background:#f43f5e;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;'>Reset Password</a></div>"
    }).encode("utf-8")
    req = urllib.request.Request("https://api.resend.com/emails", data=payload,
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=10) as r:
            return True
    except Exception as e:
        print(f"❌ Reset email error: {e}")
        return False
