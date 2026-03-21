<div align="center">

<br/>

<img width="80" src="https://img.shields.io/badge/%F0%9F%AB%80-CardioScan-f43f5e?style=for-the-badge&labelColor=0a0f1e&color=f43f5e" alt="logo"/>

# CardioScan

**AI-Powered Heart Disease Prediction**

*Clinical-grade machine learning meets stunning UI — predict heart disease risk in under 2 seconds*

<br/>

[![Live Demo](https://img.shields.io/badge/🚀_Live_Demo-cardio--scan--lac.vercel.app-f43f5e?style=for-the-badge&labelColor=0a0f1e)](https://cardio-scan-lac.vercel.app)

<br/>

[![MIT License](https://img.shields.io/badge/License-MIT-22c55e?style=flat-square)](LICENSE)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=61DAFB&labelColor=0a0f1e)](https://reactjs.org)
[![Flask](https://img.shields.io/badge/Flask-3.1-ffffff?style=flat-square&logo=flask&logoColor=white&labelColor=0a0f1e)](https://flask.palletsprojects.com)
[![scikit-learn](https://img.shields.io/badge/scikit--learn-1.6-F7931E?style=flat-square&logo=scikit-learn&logoColor=F7931E&labelColor=0a0f1e)](https://scikit-learn.org)
[![Framer Motion](https://img.shields.io/badge/Framer_Motion-11-FF0055?style=flat-square&logo=framer&logoColor=FF0055&labelColor=0a0f1e)](https://www.framer.com/motion)
[![Railway](https://img.shields.io/badge/Railway-Deployed-7c3aed?style=flat-square&logo=railway&logoColor=white&labelColor=0a0f1e)](https://railway.app)
[![Vercel](https://img.shields.io/badge/Vercel-Deployed-ffffff?style=flat-square&logo=vercel&logoColor=white&labelColor=0a0f1e)](https://vercel.com)

<br/>

</div>

---

<div align="center">

### 🎯 98.5% Accuracy &nbsp;|&nbsp; ⚡ <2s Results &nbsp;|&nbsp; 🔬 13 Clinical Features &nbsp;|&nbsp; 🧠 3 ML Models &nbsp;|&nbsp; 🌍 8 Languages

</div>

---

## 📸 Overview

CardioScan is a **full-stack AI web application** that predicts heart disease risk using machine learning. It analyzes 13 clinical features and delivers instant predictions with full **SHAP explainability** — so you don't just get a risk score, you understand *why*.

Built as a portfolio project to demonstrate real-world ML engineering, production deployment, and premium UI/UX design.

---

## ✨ What Makes It Special

### 🫀 Cinematic Medical Experience
- **Full-screen heartbeat overlay** — when you click "Run Prediction", the entire screen dims, a live ECG line pulses across the display, and a beating heart animation plays while the AI analyzes
- **Dramatic result reveal** — a scan line races down the result card, the diagnosis types itself character by character, and the risk gauge counts up from 0% with a glowing arc
- **Red alarm flash** — on High Risk detection, the screen pulses crimson like a cardiac monitor alert
- **Live ECG background** — a continuous hospital-monitor heartbeat runs across the entire predict page

### 🧠 Genuine ML Engineering
- 3 models (LR, RF, KNN) with cross-validation benchmarks
- **Ensemble voting** — all 3 models vote, majority wins
- **SHAP waterfall charts** — per-prediction feature attribution
- **What-If analysis** — live sliders to see how changing each clinical value shifts the risk score
- **AI chatbot** — Llama 3.3 70B via Groq answers questions about your specific result

### 🎨 Premium UI/UX
- Cursor glow that follows your mouse with physics-based lag
- Sliding navbar pill with spring animation between routes
- Directional page transitions with per-route color flashes
- Dark/Light mode persisted in localStorage
- Animated stats ticker on landing page
- Interactive feature cards — hover one, the other 5 dim and blur
- Split login/register layout with animated ECG panel

---

## 🏗️ Architecture
```
┌─────────────────────────────────────────────────────┐
│                    USER BROWSER                      │
│         React 18 + Tailwind + Framer Motion          │
│              Vercel (cardio-scan-lac.vercel.app)      │
└───────────────────┬─────────────────────────────────┘
                    │ HTTPS / REST API
┌───────────────────▼─────────────────────────────────┐
│                  FLASK BACKEND                       │
│         scikit-learn · JWT · SQLAlchemy              │
│         Railway (cardioscan-production.up.railway.app)│
└───────────┬──────────────────┬──────────────────────┘
            │                  │
┌───────────▼───┐    ┌─────────▼──────────────────────┐
│  PostgreSQL   │    │     External APIs               │
│  (Railway)    │    │  Groq (LLM) · Resend (Email)    │
└───────────────┘    └────────────────────────────────-┘
```

---

## 📊 Model Benchmarks

| Model | Accuracy | AUC-ROC | Precision | Recall | F1 |
|-------|:--------:|:-------:|:---------:|:------:|:--:|
| 🌲 Random Forest | **98.54%** | **0.99** | **0.98** | **0.99** | **0.98** |
| 📈 Logistic Regression | 79.51% | 0.88 | 0.81 | 0.79 | 0.80 |
| 🔵 KNN | 83.41% | 0.91 | 0.84 | 0.83 | 0.83 |
| 🧠 Ensemble (All 3) | **98.54%** | **0.99** | **0.98** | **0.99** | **0.98** |

*Trained on UCI Heart Disease Dataset — Cleveland + Hungarian + Switzerland + VA Long Beach (~1025 patients)*

---

## 🔬 The 13 Clinical Features

| Feature | Description | Feature | Description |
|---------|-------------|---------|-------------|
| `age` | Patient age | `thalach` | Max heart rate |
| `sex` | Biological sex | `exang` | Exercise angina |
| `cp` | Chest pain type | `oldpeak` | ST depression |
| `trestbps` | Resting blood pressure | `slope` | ST slope |
| `chol` | Cholesterol level | `ca` | Major vessels |
| `fbs` | Fasting blood sugar | `thal` | Thalassemia type |
| `restecg` | Resting ECG | | |

---

## 🛠️ Tech Stack

<table>
<tr>
<td valign="top" width="50%">

### Backend
- **Flask** — REST API framework
- **scikit-learn** — ML models & SHAP
- **Flask-JWT-Extended** — Auth tokens
- **Flask-SQLAlchemy** — ORM
- **PostgreSQL** — Persistent database
- **Groq API** — Llama 3.3 70B chatbot
- **Resend** — Transactional email

</td>
<td valign="top" width="50%">

### Frontend
- **React 18** — UI framework
- **Tailwind CSS** — Utility styling
- **Framer Motion 11** — Animations
- **Recharts** — Charts & graphs
- **i18next** — 8 language support
- **jsPDF** — PDF report generation
- **react-hot-toast** — Notifications

</td>
</tr>
</table>

---

## ⚡ Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+
- [Groq API key](https://console.groq.com) (free)
- [Resend API key](https://resend.com) (free)

### Run Locally
```bash
# 1. Clone
git clone https://github.com/Abhis1905/CardioScan.git
cd CardioScan

# 2. Backend
cd backend
pip3 install -r requirements.txt

export GROQ_API_KEY="your-groq-key"
export RESEND_API_KEY="your-resend-key"
export JWT_SECRET="your-secret-key"

python3 main.py
# → http://localhost:8000

# 3. Frontend (new terminal)
cd frontend
npm install --legacy-peer-deps
npm start
# → http://localhost:3000
```

---

## 📁 Project Structure
```
CardioScan/
├── 📂 backend/
│   ├── main.py            # Flask API + ML engine
│   ├── models.py          # SQLAlchemy DB models
│   ├── email_service.py   # Resend email service
│   ├── heart.csv          # UCI training dataset
│   ├── requirements.txt   # Python dependencies
│   └── railway.toml       # Railway config
│
└── 📂 frontend/
    └── src/
        ├── 📂 pages/          # Route components
        │   ├── LandingPage    # Marketing page
        │   ├── PredictPage    # Main ML interface
        │   ├── MetricsPage    # Model benchmarks
        │   ├── HistoryPage    # Prediction timeline
        │   └── ProfilePage    # User dashboard
        ├── 📂 components/     # Reusable UI
        │   ├── HeartbeatOverlay  # Full-screen ECG
        │   ├── ResultReveal      # Cinematic reveal
        │   ├── ECGBackground     # Canvas animation
        │   └── PageTransition    # Route animations
        ├── 📂 context/        # Auth + Theme
        └── 📂 i18n/           # 8 language files
```

---

## 🌍 Roadmap

- [x] 3 ML models with ensemble voting
- [x] SHAP explainability
- [x] Cinematic UI with Framer Motion
- [x] 8 language internationalization
- [x] PDF report generation
- [x] AI chatbot (Llama 3.3 70B)
- [x] JWT auth + admin dashboard
- [x] Deploy on Railway + Vercel
- [x] PostgreSQL persistent database
- [ ] Custom domain
- [ ] XGBoost + LightGBM models
- [ ] Batch CSV prediction upload
- [ ] Mobile PWA
- [ ] Doctor/Patient dual roles

---

## ⚕️ Disclaimer

> CardioScan is an **educational machine learning project** created for portfolio purposes. It is **not a medical device** and should **not be used for clinical diagnosis**. Always consult a qualified healthcare professional for medical decisions.

---

<div align="center">

<br/>

**Built with 🫀 by [Abhishek](https://www.linkedin.com/in/1905-abhishek/)**

*Full-Stack ML Engineer · React · Flask · scikit-learn*

<br/>

[![LinkedIn](https://img.shields.io/badge/LinkedIn-Connect-0077B5?style=for-the-badge&logo=linkedin&logoColor=white)](https://www.linkedin.com/in/1905-abhishek/)
[![GitHub](https://img.shields.io/badge/GitHub-Follow-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/Abhis1905)
[![Stars](https://img.shields.io/github/stars/Abhis1905/CardioScan?style=for-the-badge&logo=github&logoColor=white&label=Star%20this%20repo&color=f43f5e&labelColor=0a0f1e)](https://github.com/Abhis1905/CardioScan)

<br/>

</div>
