import json, time
from urllib.request import urlopen, Request
from urllib.parse import quote

EN = {
  "nav": {
    "predict": "Predict", "metrics": "Metrics", "dataset": "Dataset",
    "history": "History", "admin": "Admin", "logout": "Logout"
  },
  "predict": {
    "title": "Heart Disease", "subtitle": "Prediction Model",
    "description": "Enter patient clinical data below. The model analyzes 13 features using advanced ML algorithms.",
    "badge": "CARDIAC RISK ASSESSMENT", "selectAlgorithm": "Select Algorithm",
    "patientInfo": "Patient Information", "patientName": "Patient Name",
    "patientNameHint": "optional, shown in PDF report",
    "patientNamePlaceholder": "e.g. John Doe",
    "runPrediction": "Run Prediction", "analyzing": "Analyzing...",
    "reset": "Reset", "awaitingAnalysis": "Awaiting Analysis",
    "awaitingDesc": "Fill in patient data and run the prediction to see results here.",
    "runningAnalysis": "Running Analysis", "computingShap": "Computing SHAP values...",
    "diagnosis": "Diagnosis", "heartDiseaseDetected": "Heart Disease Detected",
    "noHeartDisease": "No Heart Disease", "model": "Model",
    "downloadPDF": "Download PDF Report", "featureContributions": "Feature Contributions",
    "shapDesc": "SHAP values — how each feature influenced this prediction",
    "confidence": "Confidence", "probabilityDesc": "Probability of heart disease presence",
    "reducesRisk": "Reduces risk", "increasesRisk": "Increases risk",
    "riskScore": "risk score", "lowRisk": "Low Risk",
    "moderateRisk": "Moderate Risk", "highRisk": "High Risk",
    "whatIf": "What-If Analysis", "whatIfDesc": "adjust values to see risk change in real time",
    "originalRisk": "Original Risk", "modifiedRisk": "Modified Risk",
    "noChange": "No change", "resetToOriginal": "Reset to Original",
    "groups": {
      "Demographics": "Demographics", "Symptoms": "Symptoms",
      "Vitals": "Vitals", "Cardiac": "Cardiac", "Lab": "Lab"
    },
    "fields": {
      "age": "Age", "sex": "Biological Sex", "cp": "Chest Pain Type",
      "trestbps": "Resting Blood Pressure", "chol": "Serum Cholesterol",
      "fbs": "Fasting Blood Sugar", "restecg": "Resting ECG Results",
      "thalach": "Max Heart Rate", "exang": "Exercise Induced Angina",
      "oldpeak": "ST Depression", "slope": "ST Slope",
      "ca": "Major Vessels", "thal": "Thalassemia"
    }
  },
  "auth": {
    "welcomeBack": "Welcome back", "signInDesc": "Sign in to your CardioScan account",
    "email": "Email", "password": "Password", "forgotPassword": "Forgot password?",
    "signIn": "Sign In", "noAccount": "Don't have an account?", "signUp": "Sign up",
    "createAccount": "Create account", "createAccountDesc": "Start predicting and tracking heart health",
    "fullName": "Full Name", "createAccountBtn": "Create Account",
    "alreadyAccount": "Already have an account?",
    "forgotPasswordTitle": "Forgot password?",
    "forgotPasswordDesc": "Enter your email and we will send you a reset link",
    "sendResetLink": "Send Reset Link", "backToLogin": "Back to Login",
    "checkEmail": "Check your email!", "resetLinkSent": "We sent a password reset link to:",
    "resetPassword": "Reset password", "newPassword": "New Password",
    "confirmPassword": "Confirm Password", "resetPasswordBtn": "Reset Password",
    "emailNotVerified": "Email not verified",
    "verifyEmailFirst": "Please verify your email before logging in.",
    "resendVerification": "Resend verification email", "sending": "Sending..."
  },
  "history": {
    "title": "Patient", "subtitle": "History", "badge": "PREDICTION HISTORY",
    "desc": "All your saved predictions with full clinical data.",
    "totalPredictions": "Total Predictions", "heartDisease": "Heart Disease",
    "highRisk": "High Risk", "avgRisk": "Avg Risk Score",
    "all": "All", "positive": "Heart Disease", "negative": "No Disease",
    "high": "High Risk", "noPredictions": "No predictions yet",
    "noPredictionsDesc": "Run a prediction on the Predict page and it will appear here automatically.",
    "details": "Details", "hide": "Hide", "clinicalData": "Clinical Data",
    "featureContributions": "Feature Contributions", "doctorNotes": "Doctor Notes",
    "notesPlaceholder": "Add notes about this patient or prediction...",
    "saveNotes": "Save Notes", "saving": "Saving...", "probability": "probability"
  },
  "chatbot": {
    "askAnything": "Ask anything about your report", "online": "Online",
    "thinking": "Thinking...", "placeholder": "Ask about your results...",
    "disclaimer": "Press Enter to send. Not a substitute for medical advice",
    "suggestions": {
      "whyHigh": "Why is my risk high?", "whatCA": "What does CA mean?",
      "explainSHAP": "Explain SHAP values", "lifestyle": "What lifestyle changes help?"
    }
  },
  "common": {
    "loading": "Loading...", "error": "Error", "success": "Success",
    "cancel": "Cancel", "save": "Save", "delete": "Delete",
    "patients": "patients", "clinicalVars": "clinical vars",
    "positiveCases": "positive cases", "negativeCases": "negative cases"
  }
}

# MyMemory language codes
LANGUAGES = {
  "hi": "hi-IN", "es": "es-ES", "fr": "fr-FR", "de": "de-DE",
  "ar": "ar-SA", "zh": "zh-CN", "ja": "ja-JP", "pt": "pt-BR",
  "bn": "bn-IN", "gu": "gu-IN", "kn": "kn-IN", "ml": "ml-IN",
  "mr": "mr-IN", "pa": "pa-IN", "ta": "ta-IN", "te": "te-IN",
  "ur": "ur-PK", "ne": "ne-NP", "or": "or-IN", "as": "as-IN",
  "ks": "ks-IN", "sa": "sa-IN", "sd": "sd-IN"
}

LANG_NAMES = {
  "hi":"Hindi","es":"Spanish","fr":"French","de":"German","ar":"Arabic",
  "zh":"Chinese","ja":"Japanese","pt":"Portuguese","bn":"Bengali",
  "gu":"Gujarati","kn":"Kannada","ml":"Malayalam","mr":"Marathi",
  "pa":"Punjabi","ta":"Tamil","te":"Telugu","ur":"Urdu","ne":"Nepali",
  "or":"Odia","as":"Assamese","ks":"Kashmiri","sa":"Sanskrit","sd":"Sindhi"
}

def translate(text, lang_code):
    try:
        url = f"https://api.mymemory.translated.net/get?q={quote(text)}&langpair=en|{lang_code}"
        req = Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urlopen(req, timeout=10) as r:
            data = json.loads(r.read())
            if data["responseStatus"] == 200:
                translated = data["responseData"]["translatedText"]
                if translated and "MYMEMORY WARNING" not in translated:
                    return translated
        return text
    except Exception as e:
        return text

def translate_dict(d, lang_code):
    result = {}
    for k, v in d.items():
        if isinstance(v, dict):
            result[k] = translate_dict(v, lang_code)
        elif isinstance(v, str):
            result[k] = translate(v, lang_code)
            time.sleep(0.4)
        else:
            result[k] = v
    return result

# Save English
with open("en.json", "w", encoding="utf-8") as f:
    json.dump(EN, f, ensure_ascii=False, indent=2)
print("✅ en.json saved")

# Translate all
for code, lang_code in LANGUAGES.items():
    name = LANG_NAMES[code]
    print(f"🌐 Translating to {name}...", end=" ", flush=True)
    try:
        translated = translate_dict(EN, lang_code)
        with open(f"{code}.json", "w", encoding="utf-8") as f:
            json.dump(translated, f, ensure_ascii=False, indent=2)
        print(f"✅")
    except Exception as e:
        print(f"❌ {e}")

print("\n🎉 All translations done!")
