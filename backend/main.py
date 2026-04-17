import os, warnings, json, secrets
from urllib.request import urlopen, Request
from urllib.error import HTTPError
from datetime import datetime, timedelta
import numpy as np
import pandas as pd
from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_bcrypt import Bcrypt
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.neighbors import KNeighborsClassifier
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix, roc_curve, auc
from models import db, User, Prediction

warnings.filterwarnings("ignore")
app = Flask(__name__)

# ── Config ────────────────────────────────────────────────────────────────────
app.config["SQLALCHEMY_DATABASE_URI"] = os.environ.get(
    "DATABASE_URL", "sqlite:///cardioscan.db"
).replace("postgres://", "postgresql://")          # fix Railway Postgres URL prefix
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
app.config["JWT_SECRET_KEY"] = os.environ.get("JWT_SECRET", secrets.token_hex(32))
app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(hours=24)

db.init_app(app)
bcrypt = Bcrypt(app)
jwt = JWTManager(app)

# ── CORS — reads allowed origins from env so localhost + Vercel both work ─────
_raw = os.environ.get(
    "ALLOWED_ORIGINS",
    "http://localhost:3000,http://127.0.0.1:3000,https://cardio-scan-lac.vercel.app"
)
ALLOWED_ORIGINS = {o.strip() for o in _raw.split(",") if o.strip()}

FEATURE_NAMES = ["age","sex","cp","trestbps","chol","fbs","restecg","thalach","exang","oldpeak","slope","ca","thal"]
FIELD_RULES = {
    "age":(1,120,False),"sex":(0,1,True),"cp":(0,3,True),
    "trestbps":(60,250,False),"chol":(100,600,False),"fbs":(0,1,True),
    "restecg":(0,2,True),"thalach":(60,250,False),"exang":(0,1,True),
    "oldpeak":(0.0,10.0,False),"slope":(0,2,True),"ca":(0,4,True),"thal":(0,3,True),
}
_models={}; _scalers={}; _metrics={}; _dataset={}; _feat_imp={}; _X_train=None

# ── CORS ──────────────────────────────────────────────────────────────────────
@app.after_request
def add_cors(resp):
    origin = request.headers.get("Origin", "")
    if origin in ALLOWED_ORIGINS:
        resp.headers["Access-Control-Allow-Origin"] = origin
    resp.headers["Access-Control-Allow-Methods"] = "GET,POST,PUT,DELETE,OPTIONS"
    resp.headers["Access-Control-Allow-Headers"] = "Content-Type,Authorization"
    return resp

@app.route("/", defaults={"path": ""}, methods=["OPTIONS"])
@app.route("/<path:path>", methods=["OPTIONS"])
def handle_options(path):
    return jsonify({}), 200

# ── ML helpers (unchanged) ────────────────────────────────────────────────────
def _explain(model, x_arr, X_bg, scaled=False, n_samples=40):
    np.random.seed(42)
    scaler = _scalers.get("standard")
    x_in = scaler.transform(x_arr) if scaled else x_arr
    base_prob = float(model.predict_proba(x_in)[0][1])
    bg = X_bg.values
    shap_vals = []
    for i in range(x_arr.shape[1]):
        sampled = bg[:,i][np.random.choice(len(bg), n_samples, replace=True)]
        deltas = []
        for val in sampled:
            xm = x_arr.copy(); xm[0,i] = val
            xm_in = scaler.transform(xm) if scaled else xm
            deltas.append(base_prob - float(model.predict_proba(xm_in)[0][1]))
        shap_vals.append(round(float(np.mean(deltas)), 5))
    return shap_vals

def _build_metrics(name, y_test, y_pred, y_prob):
    report = classification_report(y_test, y_pred, output_dict=True, zero_division=0)
    cm = confusion_matrix(y_test, y_pred).tolist()
    fpr, tpr, _ = roc_curve(y_test, y_prob)
    step = max(1, len(fpr)//50)
    return {
        "name": name,
        "accuracy":  round(float(accuracy_score(y_test, y_pred)), 4),
        "auc":       round(float(auc(fpr, tpr)), 4),
        "precision": round(float(report["1"]["precision"]), 4),
        "recall":    round(float(report["1"]["recall"]), 4),
        "f1":        round(float(report["1"]["f1-score"]), 4),
        "confusion_matrix": cm,
        "roc_curve": {
            "fpr": [round(float(v),4) for v in fpr[::step]],
            "tpr": [round(float(v),4) for v in tpr[::step]],
        },
    }

def train():
    global _X_train
    csv_path = os.path.join(os.path.dirname(__file__), "heart.csv")
    df = pd.read_csv(csv_path)
    X = df.drop("target", axis=1)[FEATURE_NAMES]
    y = df["target"]
    _dataset["shape"] = list(df.shape)
    _dataset["target_distribution"] = {int(k):int(v) for k,v in y.value_counts().items()}
    _dataset["feature_stats"] = {
        col:{"mean":round(float(X[col].mean()),2),"std":round(float(X[col].std()),2),
             "min":round(float(X[col].min()),2),"max":round(float(X[col].max()),2)}
        for col in FEATURE_NAMES}
    _dataset["correlation_with_target"] = {
        col: round(float(df[col].corr(df["target"])), 3) for col in FEATURE_NAMES}
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    _X_train = X_train
    scaler = StandardScaler()
    Xs_tr = scaler.fit_transform(X_train); Xs_te = scaler.transform(X_test)
    _scalers["standard"] = scaler
    lr = LogisticRegression(max_iter=1000, random_state=42)
    lr.fit(Xs_tr, y_train)
    _models["logistic_regression"] = lr
    _metrics["logistic_regression"] = _build_metrics("Logistic Regression", y_test, lr.predict(Xs_te), lr.predict_proba(Xs_te)[:,1])
    coef = np.abs(lr.coef_[0]); tot = coef.sum() or 1
    _feat_imp["logistic_regression"] = {fn:round(float(v/tot),4) for fn,v in zip(FEATURE_NAMES,coef)}
    rf = RandomForestClassifier(n_estimators=100, random_state=42)
    rf.fit(X_train, y_train)
    _models["random_forest"] = rf
    _metrics["random_forest"] = _build_metrics("Random Forest", y_test, rf.predict(X_test), rf.predict_proba(X_test)[:,1])
    _feat_imp["random_forest"] = {fn:round(float(v),4) for fn,v in zip(FEATURE_NAMES, rf.feature_importances_)}
    knn = KNeighborsClassifier(n_neighbors=5)
    knn.fit(Xs_tr, y_train)
    _models["knn"] = knn
    _metrics["knn"] = _build_metrics("KNN", y_test, knn.predict(Xs_te), knn.predict_proba(Xs_te)[:,1])
    _feat_imp["knn"] = _feat_imp["random_forest"]
    print("✅ Models trained | RF:", _metrics["random_forest"]["accuracy"],
          "| LR:", _metrics["logistic_regression"]["accuracy"],
          "| KNN:", _metrics["knn"]["accuracy"])

def _validate(data):
    errors = []
    for field,(lo,hi,is_int) in FIELD_RULES.items():
        if field not in data:
            errors.append(f"Missing: {field}"); continue
        try: val = int(data[field]) if is_int else float(data[field])
        except: errors.append(f"'{field}' must be numeric"); continue
        if not (lo <= val <= hi):
            errors.append(f"'{field}' out of range [{lo},{hi}] (got {val})")
    return errors

def _run_prediction(body, mk):
    vals = [int(body[f]) if FIELD_RULES[f][2] else float(body[f]) for f in FEATURE_NAMES]
    x_df = pd.DataFrame([vals], columns=FEATURE_NAMES)
    x_arr = x_df.values.astype(float)
    model = _models[mk]; scaled = mk in ("logistic_regression","knn"); sc = _scalers["standard"]
    if scaled:
        xi = sc.transform(x_arr); pred = int(model.predict(xi)[0]); prob = float(model.predict_proba(xi)[0][1])
    else:
        pred = int(model.predict(x_df)[0]); prob = float(model.predict_proba(x_df)[0][1])
    risk = "Low" if prob < 0.3 else "Moderate" if prob < 0.6 else "High"
    shap_vals = _explain(model, x_arr, _X_train, scaled=scaled)
    return pred, round(prob,4), risk, shap_vals

# ── Auth Routes ───────────────────────────────────────────────────────────────

VERIFY_TOKEN_TTL_HOURS  = 24
RESET_TOKEN_TTL_MINUTES = 60
RESEND_COOLDOWN_MINUTES = 2    # minimum gap between resend requests

@app.post("/auth/register")
def register():
    from email_service import send_verification_email
    body     = request.get_json(force=True, silent=True) or {}
    name     = body.get("name", "").strip()
    email    = body.get("email", "").strip().lower()
    password = body.get("password", "")

    if not name or not email or not password:
        return jsonify({"error": "Name, email and password are required"}), 400
    if len(password) < 6:
        return jsonify({"error": "Password must be at least 6 characters"}), 400
    if User.query.filter_by(email=email).first():
        return jsonify({"error": "Email already registered"}), 409

    pw_hash      = bcrypt.generate_password_hash(password).decode("utf-8")
    verify_token = secrets.token_urlsafe(32)
    expires      = datetime.utcnow() + timedelta(hours=VERIFY_TOKEN_TTL_HOURS)

    user = User(
        name=name, email=email, password_hash=pw_hash,
        verify_token=verify_token,
        verify_token_expires=expires,
        verify_email_last_sent=datetime.utcnow(),
        is_verified=False,
    )
    db.session.add(user)
    db.session.commit()

    sent = send_verification_email(email, name, verify_token)
    if not sent:
        # Don't block registration if email fails — log it and continue
        print(f"⚠️  Verification email failed for {email} — check GMAIL_USER/GMAIL_APP_PASSWORD env vars")

    return jsonify({
        "message": "Registration successful! Please check your email to verify your account.",
        "email": email,
    }), 201


@app.get("/auth/verify-email")
def verify_email():
    token = request.args.get("token", "")
    if not token:
        return jsonify({"error": "Verification token is missing"}), 400

    user = User.query.filter_by(verify_token=token).first()
    if not user:
        return jsonify({"error": "Invalid verification link"}), 400

    # Check expiry
    if user.verify_token_expires and datetime.utcnow() > user.verify_token_expires:
        return jsonify({
            "error": "Verification link has expired. Please request a new one.",
            "expired": True,
            "email": user.email,
        }), 400

    user.is_verified          = True
    user.verify_token         = None
    user.verify_token_expires = None
    db.session.commit()

    jwt_token = create_access_token(identity=str(user.id))

    from email_service import send_welcome_email
    send_welcome_email(user.email, user.name)

    return jsonify({
        "token":   jwt_token,
        "user":    user.to_dict(),
        "message": "Email verified successfully! Welcome to CardioScan.",
    })


@app.post("/auth/resend-verification")
def resend_verification():
    from email_service import send_verification_email
    body  = request.get_json(force=True, silent=True) or {}
    email = body.get("email", "").strip().lower()

    user = User.query.filter_by(email=email).first()
    if not user:
        # Don't leak whether email exists
        return jsonify({"message": "If this email is registered, a verification link has been sent."})
    if user.is_verified:
        return jsonify({"error": "This email is already verified. Please log in."}), 400

    # Rate limit: one resend per RESEND_COOLDOWN_MINUTES
    if user.verify_email_last_sent:
        elapsed = (datetime.utcnow() - user.verify_email_last_sent).total_seconds() / 60
        if elapsed < RESEND_COOLDOWN_MINUTES:
            wait = int(RESEND_COOLDOWN_MINUTES - elapsed) + 1
            return jsonify({
                "error": f"Please wait {wait} minute(s) before requesting another email.",
                "wait_minutes": wait,
            }), 429

    new_token = secrets.token_urlsafe(32)
    user.verify_token         = new_token
    user.verify_token_expires = datetime.utcnow() + timedelta(hours=VERIFY_TOKEN_TTL_HOURS)
    user.verify_email_last_sent = datetime.utcnow()
    db.session.commit()

    send_verification_email(email, user.name, new_token)
    return jsonify({"message": "Verification email sent! Check your inbox (and spam folder)."})


@app.post("/auth/login")
def login():
    body     = request.get_json(force=True, silent=True) or {}
    email    = body.get("email", "").strip().lower()
    password = body.get("password", "")

    user = User.query.filter_by(email=email).first()
    if not user or not user.password_hash:
        return jsonify({"error": "Invalid email or password"}), 401
    if not bcrypt.check_password_hash(user.password_hash, password):
        return jsonify({"error": "Invalid email or password"}), 401
    if not user.is_verified:
        return jsonify({
            "error": "Please verify your email before logging in.",
            "not_verified": True,
            "email": email,
        }), 401

    token = create_access_token(identity=str(user.id))
    return jsonify({"token": token, "user": user.to_dict()})


@app.post("/auth/google")
def google_auth():
    body  = request.get_json(force=True, silent=True) or {}
    token = body.get("credential", "")
    try:
        from google.oauth2 import id_token
        from google.auth.transport import requests as g_requests
        GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID", "")
        idinfo    = id_token.verify_oauth2_token(token, g_requests.Request(), GOOGLE_CLIENT_ID)
        email     = idinfo["email"]
        name      = idinfo.get("name", email.split("@")[0])
        google_id = idinfo["sub"]
        avatar    = idinfo.get("picture", "")

        user = User.query.filter_by(email=email).first()
        if not user:
            user = User(
                name=name, email=email, google_id=google_id,
                avatar=avatar, is_verified=True,   # Google accounts are pre-verified
            )
            db.session.add(user)
            db.session.commit()
        else:
            if not user.google_id:
                user.google_id = google_id
                user.avatar    = avatar
                user.is_verified = True            # retroactively verify on Google link
                db.session.commit()

        jwt_token = create_access_token(identity=str(user.id))
        return jsonify({"token": jwt_token, "user": user.to_dict()})
    except Exception as e:
        return jsonify({"error": str(e)}), 401


@app.get("/auth/me")
@jwt_required()
def get_me():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
    return jsonify(user.to_dict())


# ── Password reset — now uses reset_token (separate from verify_token) ────────

@app.post("/auth/forgot-password")
def forgot_password():
    from email_service import send_reset_email
    body  = request.get_json(force=True, silent=True) or {}
    email = body.get("email", "").strip().lower()

    user = User.query.filter_by(email=email).first()
    # Always return the same message to avoid leaking registered emails
    if not user:
        return jsonify({"message": "If this email is registered, a reset link has been sent."})

    reset_token = secrets.token_urlsafe(32)
    user.reset_token         = reset_token
    user.reset_token_expires = datetime.utcnow() + timedelta(minutes=RESET_TOKEN_TTL_MINUTES)
    db.session.commit()

    send_reset_email(email, user.name, reset_token)
    return jsonify({"message": "If this email is registered, a reset link has been sent."})


@app.post("/auth/reset-password")
def reset_password():
    body         = request.get_json(force=True, silent=True) or {}
    token        = body.get("token", "")
    new_password = body.get("password", "")

    if len(new_password) < 6:
        return jsonify({"error": "Password must be at least 6 characters"}), 400

    user = User.query.filter_by(reset_token=token).first()
    if not user:
        return jsonify({"error": "Invalid or expired reset link"}), 400

    # Check expiry
    if user.reset_token_expires and datetime.utcnow() > user.reset_token_expires:
        return jsonify({"error": "Reset link has expired. Please request a new one."}), 400

    user.password_hash   = bcrypt.generate_password_hash(new_password).decode("utf-8")
    user.reset_token     = None      # single-use: invalidate immediately
    user.reset_token_expires = None
    db.session.commit()

    return jsonify({"message": "Password reset successfully! You can now log in."})


@app.post("/auth/record-consent")
@jwt_required()
def record_consent():
    """Called from the frontend consent modal — stores consent timestamp."""
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
    user.consent_given = True
    user.consent_at    = datetime.utcnow()
    db.session.commit()
    return jsonify({"message": "Consent recorded.", "user": user.to_dict()})


@app.delete("/auth/delete-account")
@jwt_required()
def delete_account():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
    db.session.delete(user)
    db.session.commit()
    return jsonify({"message": "Account deleted successfully"})


# ── Predict Route ─────────────────────────────────────────────────────────────
@app.post("/predict")
def predict():
    body = request.get_json(force=True, silent=True) or {}
    errs = _validate(body)
    if errs: return jsonify({"detail": "; ".join(errs)}), 400
    mk = body.get("model", "random_forest")
    use_ensemble = body.get("ensemble", False)

    if use_ensemble:
        results = {}
        for model_key in ["logistic_regression", "random_forest", "knn"]:
            p, prob, risk, _ = _run_prediction(body, model_key)
            results[model_key] = {"prediction": p, "probability": round(prob, 4), "risk_level": risk}
        votes = [r["prediction"] for r in results.values()]
        pred  = 1 if sum(votes) >= 2 else 0
        prob  = round(sum(r["probability"] for r in results.values()) / 3, 4)
        risk  = "Low" if prob < 0.3 else "Moderate" if prob < 0.6 else "High"
        mk    = "ensemble"
        _, _, _, shap_vals = _run_prediction(body, "random_forest")
    else:
        if mk not in _models: return jsonify({"detail": f"Unknown model: {mk}"}), 400
        pred, prob, risk, shap_vals = _run_prediction(body, mk)
        results = None
        votes   = None

    saved_id = None
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        try:
            from flask_jwt_extended import decode_token
            token_data = decode_token(auth_header.split(" ")[1])
            user_id = int(token_data["sub"])
            p_obj = Prediction(
                user_id=user_id, prediction=pred, probability=prob,
                risk_level=risk, model_used=mk,
                shap_values=json.dumps(shap_vals),
                **{f: (int(body[f]) if FIELD_RULES[f][2] else float(body[f])) for f in FEATURE_NAMES}
            )
            db.session.add(p_obj); db.session.commit()
            saved_id = p_obj.id
        except Exception as e:
            print("Could not save prediction:", e)

    resp = {
        "prediction": pred, "probability": prob, "risk_level": risk,
        "model_used": mk, "shap_values": shap_vals,
        "feature_names": FEATURE_NAMES, "saved_id": saved_id,
    }
    if results:
        resp["ensemble_results"] = results
        resp["votes"] = {"heart_disease": sum(votes), "no_disease": 3 - sum(votes)}
    return jsonify(resp)


# ── Prediction History Routes ─────────────────────────────────────────────────
@app.get("/history")
@jwt_required()
def get_history():
    user_id = int(get_jwt_identity())
    preds = Prediction.query.filter_by(user_id=user_id).order_by(Prediction.created_at.desc()).all()
    return jsonify([p.to_dict() for p in preds])

@app.get("/history/<int:pred_id>")
@jwt_required()
def get_prediction(pred_id):
    user_id = int(get_jwt_identity())
    p = Prediction.query.filter_by(id=pred_id, user_id=user_id).first()
    if not p: return jsonify({"error": "Not found"}), 404
    return jsonify(p.to_dict())

@app.delete("/history/<int:pred_id>")
@jwt_required()
def delete_prediction(pred_id):
    user_id = int(get_jwt_identity())
    p = Prediction.query.filter_by(id=pred_id, user_id=user_id).first()
    if not p: return jsonify({"error": "Not found"}), 404
    db.session.delete(p); db.session.commit()
    return jsonify({"message": "Deleted successfully"})

@app.put("/history/<int:pred_id>/notes")
@jwt_required()
def update_notes(pred_id):
    user_id = int(get_jwt_identity())
    p = Prediction.query.filter_by(id=pred_id, user_id=user_id).first()
    if not p: return jsonify({"error": "Not found"}), 404
    body = request.get_json(force=True, silent=True) or {}
    p.notes = body.get("notes", "")
    db.session.commit()
    return jsonify(p.to_dict())


# ── What-If Analysis ──────────────────────────────────────────────────────────
@app.post("/whatif")
def whatif():
    body = request.get_json(force=True, silent=True) or {}
    errs = _validate(body)
    if errs: return jsonify({"detail": "; ".join(errs)}), 400
    mk = body.get("model", "random_forest")
    if mk not in _models: return jsonify({"detail": f"Unknown model: {mk}"}), 400
    pred, prob, risk, _ = _run_prediction(body, mk)
    return jsonify({"prediction": pred, "probability": prob, "risk_level": risk})


# ── Chat Route ────────────────────────────────────────────────────────────────
@app.post("/chat")
def chat():
    body = request.get_json(force=True, silent=True) or {}
    system_prompt = body.get("system", "You are a helpful medical assistant.")
    messages      = body.get("messages", [])
    api_key       = os.environ.get("GROQ_API_KEY", "")
    if not api_key:
        return jsonify({"error": "GROQ_API_KEY not set."}), 500
    payload = json.dumps({
        "model": "llama-3.3-70b-versatile",
        "messages": [{"role": "system", "content": system_prompt}] + messages,
        "max_tokens": 800, "temperature": 0.7,
    }).encode("utf-8")
    req = Request(
        "https://api.groq.com/openai/v1/chat/completions",
        data=payload,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}",
            "User-Agent": "Mozilla/5.0",
        },
        method="POST",
    )
    try:
        with urlopen(req, timeout=30) as r:
            data = json.loads(r.read().decode("utf-8"))
            return jsonify({"reply": data["choices"][0]["message"]["content"].strip()})
    except HTTPError as e:
        body_text = e.read().decode("utf-8") if e.fp else str(e)
        return jsonify({"error": f"Groq error {e.code}: {body_text}"}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ── Static / Metrics / Dataset Routes ────────────────────────────────────────
@app.get("/")
def root(): return jsonify({"status": "CardioScan API running"})

@app.get("/metrics")
def get_metrics(): return jsonify(_metrics)

@app.get("/metrics/<mk>")
def get_model_metrics(mk):
    if mk not in _metrics: return jsonify({"error": "Not found"}), 404
    return jsonify(_metrics[mk])

@app.get("/feature-importance/<mk>")
def get_fi(mk):
    if mk not in _feat_imp: return jsonify({"error": "Not found"}), 404
    fi = _feat_imp[mk]; tot = sum(fi.values()) or 1
    return jsonify(dict(sorted({k:round(v/tot,4) for k,v in fi.items()}.items(), key=lambda x:-x[1])))

@app.get("/dataset-stats")
def dataset_stats(): return jsonify(_dataset)

@app.get("/models")
def list_models():
    return jsonify({"models": [
        {"key": "logistic_regression", "label": "Logistic Regression"},
        {"key": "random_forest",       "label": "Random Forest"},
        {"key": "knn",                 "label": "K-Nearest Neighbors"},
    ]})


# ── Admin Routes ──────────────────────────────────────────────────────────────
ADMIN_EMAIL = "mabhi192005@gmail.com"

def admin_required(fn):
    from functools import wraps
    @wraps(fn)
    @jwt_required()
    def wrapper(*args, **kwargs):
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        if not user or user.email != ADMIN_EMAIL:
            return jsonify({"error": "Admin access required"}), 403
        return fn(*args, **kwargs)
    return wrapper

@app.get("/admin/stats")
@admin_required
def admin_stats():
    total_users       = User.query.count()
    verified_users    = User.query.filter_by(is_verified=True).count()
    total_predictions = Prediction.query.count()
    high_risk         = Prediction.query.filter_by(risk_level="High").count()
    moderate_risk     = Prediction.query.filter_by(risk_level="Moderate").count()
    low_risk          = Prediction.query.filter_by(risk_level="Low").count()
    positive          = Prediction.query.filter_by(prediction=1).count()
    negative          = Prediction.query.filter_by(prediction=0).count()
    model_counts = {mk: Prediction.query.filter_by(model_used=mk).count()
                    for mk in ["random_forest","logistic_regression","knn"]}
    week_ago        = datetime.utcnow() - timedelta(days=7)
    new_users_week  = User.query.filter(User.created_at >= week_ago).count()
    new_preds_week  = Prediction.query.filter(Prediction.created_at >= week_ago).count()
    return jsonify({
        "users": {
            "total": total_users, "verified": verified_users,
            "unverified": total_users - verified_users, "new_this_week": new_users_week,
        },
        "predictions": {
            "total": total_predictions, "positive": positive, "negative": negative,
            "high_risk": high_risk, "moderate_risk": moderate_risk, "low_risk": low_risk,
            "new_this_week": new_preds_week,
        },
        "models": model_counts,
    })

@app.get("/admin/users")
@admin_required
def admin_users():
    search = request.args.get("search", "").lower()
    users  = User.query.order_by(User.created_at.desc()).all()
    result = []
    for u in users:
        if search and search not in u.name.lower() and search not in u.email.lower():
            continue
        d = u.to_dict()
        d["prediction_count"] = Prediction.query.filter_by(user_id=u.id).count()
        result.append(d)
    return jsonify(result)

@app.delete("/admin/users/<int:uid>")
@admin_required
def admin_delete_user(uid):
    user = User.query.get(uid)
    if not user: return jsonify({"error": "User not found"}), 404
    if user.email == ADMIN_EMAIL: return jsonify({"error": "Cannot delete admin"}), 400
    db.session.delete(user); db.session.commit()
    return jsonify({"message": "User deleted"})

@app.get("/admin/predictions")
@admin_required
def admin_predictions():
    search = request.args.get("search", "").lower()
    risk   = request.args.get("risk", "")
    model  = request.args.get("model", "")
    preds  = Prediction.query.order_by(Prediction.created_at.desc()).all()
    result = []
    for p in preds:
        user = User.query.get(p.user_id)
        if risk  and p.risk_level  != risk:  continue
        if model and p.model_used  != model: continue
        if search:
            n = (user.name  if user else "").lower()
            e = (user.email if user else "").lower()
            if search not in n and search not in e: continue
        d = p.to_dict()
        d["user_name"]  = user.name  if user else "Deleted"
        d["user_email"] = user.email if user else "Deleted"
        result.append(d)
    return jsonify(result)

@app.delete("/admin/predictions/<int:pid>")
@admin_required
def admin_delete_prediction(pid):
    p = Prediction.query.get(pid)
    if not p: return jsonify({"error": "Not found"}), 404
    db.session.delete(p); db.session.commit()
    return jsonify({"message": "Prediction deleted"})

@app.get("/admin/export/users")
@admin_required
def admin_export_users_route():
    import csv, io
    from flask import Response
    users  = User.query.order_by(User.created_at.desc()).all()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["ID","Name","Email","Verified","Created At","Predictions"])
    for u in users:
        writer.writerow([u.id, u.name, u.email, u.is_verified, u.created_at,
                         Prediction.query.filter_by(user_id=u.id).count()])
    return Response(output.getvalue(), mimetype="text/csv",
        headers={"Content-Disposition": "attachment;filename=cardioscan_users.csv"})

@app.get("/admin/export/predictions")
@admin_required
def admin_export_predictions_route():
    import csv, io
    from flask import Response
    preds  = Prediction.query.order_by(Prediction.created_at.desc()).all()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["ID","User","Email","Age","Sex","CP","TrestBPS","Chol","FBS","RestECG",
                     "Thalach","Exang","Oldpeak","Slope","CA","Thal",
                     "Prediction","Probability","Risk","Model","Created At"])
    for p in preds:
        user = User.query.get(p.user_id)
        writer.writerow([p.id, user.name if user else "Deleted", user.email if user else "Deleted",
            p.age, p.sex, p.cp, p.trestbps, p.chol, p.fbs, p.restecg,
            p.thalach, p.exang, p.oldpeak, p.slope, p.ca, p.thal,
            p.prediction, p.probability, p.risk_level, p.model_used, p.created_at])
    return Response(output.getvalue(), mimetype="text/csv",
        headers={"Content-Disposition": "attachment;filename=cardioscan_predictions.csv"})

@app.get("/admin/check")
@admin_required
def admin_check():
    return jsonify({"is_admin": True})


# ── Startup ───────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    print("\n🫀  CardioScan — Heart Disease Prediction API")
    with app.app_context():
        db.create_all()
        print("✅ Database ready")
    print("Training models …")
    train()
    print("✅  Server → http://localhost:8000\n")
    app.run(host="0.0.0.0", port=8000, debug=False)