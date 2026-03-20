<div align="center">

<img src="https://img.shields.io/badge/CardioScan-Heart%20Disease%20AI-f43f5e?style=for-the-badge&logo=heart&logoColor=white" alt="CardioScan"/>

# 🫀 CardioScan
### AI-Powered Heart Disease Prediction System

[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react)](https://reactjs.org)
[![Flask](https://img.shields.io/badge/Flask-3.1-000000?style=flat-square&logo=flask)](https://flask.palletsprojects.com)
[![scikit-learn](https://img.shields.io/badge/scikit--learn-1.6-F7931E?style=flat-square&logo=scikit-learn)](https://scikit-learn.org)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-3-06B6D4?style=flat-square&logo=tailwindcss)](https://tailwindcss.com)
[![Framer Motion](https://img.shields.io/badge/Framer%20Motion-11-FF0055?style=flat-square&logo=framer)](https://www.framer.com/motion)

*Predict heart disease risk with 98.5% accuracy using advanced ML — fully explainable with SHAP analysis*

[🚀 Live Demo](#) • [📊 Features](#features) • [🛠️ Tech Stack](#tech-stack) • [⚡ Quick Start](#quick-start)

---

![CardioScan Preview](https://via.placeholder.com/900x500/0a0f1e/f43f5e?text=CardioScan+Preview)

</div>

---

## ✨ Features

### 🧠 Machine Learning
- **3 ML Models** — Logistic Regression, Random Forest, K-Nearest Neighbors
- **Ensemble Voting** — All 3 models vote, majority wins for maximum accuracy
- **SHAP Explainability** — Understand exactly which features drive every prediction
- **What-If Analysis** — Adjust clinical values with sliders, see risk change in real time
- **98.5% Accuracy** on the Cleveland Heart Disease dataset

### 🎨 Premium UI/UX
- **Cinematic result reveal** — scan line, typewriter diagnosis, animated gauge
- **Live ECG background** — hospital monitor heartbeat across the screen
- **Full-screen heartbeat overlay** during analysis
- **Risk alarm flash** — screen pulses red on High Risk detection
- **Smooth page transitions** — directional slides with color flashes per route
- **Dark/Light mode** — persists across sessions
- **8 languages** — English, Hindi, Spanish, French, German, Arabic, Chinese, Portuguese

### 🏥 Clinical Features
- **PDF Report Generation** — professional downloadable clinical reports
- **Prediction History** — timeline view with trend charts
- **Doctor Notes** — annotate any prediction
- **Risk Trend Graph** — track risk over time across multiple predictions
- **202Officials AI Chatbot** — powered by Groq/Llama 3.3 70B, answers questions about your report

### 🔐 Authentication & Security
- **JWT Authentication** — secure token-based auth
- **Email Verification** — Gmail SMTP verification on signup
- **Forgot Password** — email reset flow
- **Google OAuth** ready
- **Admin Dashboard** — full platform oversight, user management, CSV exports

---

## 🛠️ Tech Stack

### Backend
| Technology | Purpose |
|-----------|---------|
| **Flask** | REST API framework |
| **scikit-learn** | ML models (LR, RF, KNN) |
| **Flask-JWT-Extended** | Authentication |
| **Flask-SQLAlchemy** | ORM + SQLite database |
| **Flask-Bcrypt** | Password hashing |
| **Groq API** | AI chatbot (Llama 3.3 70B) |
| **Gmail SMTP** | Email verification |

### Frontend
| Technology | Purpose |
|-----------|---------|
| **React 18** | UI framework |
| **Tailwind CSS** | Styling |
| **Framer Motion 11** | Animations |
| **Recharts** | Charts & visualizations |
| **i18next** | Internationalization |
| **react-hot-toast** | Notifications |

---

## ⚡ Quick Start

### Prerequisites
- Python 3.9+
- Node.js 18+
- A [Groq API key](https://console.groq.com) (free)
- Gmail App Password

### 1. Clone the repo
```bash
git clone https://github.com/Abhis1905/CardioScan.git
cd CardioScan
```

### 2. Start the backend
```bash
cd backend
pip3 install flask flask-sqlalchemy flask-jwt-extended flask-bcrypt scikit-learn pandas numpy
export GROQ_API_KEY="your-groq-key"
export GMAIL_USER="your@gmail.com"
export GMAIL_APP_PASSWORD="your-app-password"
export JWT_SECRET="your-secret-key"
python3 main.py
```

### 3. Start the frontend
```bash
cd frontend
npm install --legacy-peer-deps
npm start
```

App opens at **http://localhost:3000** 🎉

---

## 📊 Model Performance

| Model | Accuracy | AUC | Precision | Recall | F1 |
|-------|----------|-----|-----------|--------|-----|
| Random Forest | **98.54%** | 0.99 | 0.98 | 0.99 | 0.98 |
| Logistic Regression | 79.51% | 0.88 | 0.81 | 0.79 | 0.80 |
| KNN | 83.41% | 0.91 | 0.84 | 0.83 | 0.83 |
| **Ensemble** | **98.54%** | **0.99** | **0.98** | **0.99** | **0.98** |

---

## 🔬 Dataset

Training data from the **UCI Heart Disease Dataset** — Cleveland, Hungarian, Switzerland, and VA Long Beach combined (~920 patients).

**13 Clinical Features:**
`age` `sex` `chest pain type` `resting blood pressure` `cholesterol` `fasting blood sugar` `resting ECG` `max heart rate` `exercise angina` `ST depression` `ST slope` `major vessels` `thalassemia`

---

## 📁 Project Structure
```
CardioScan/
├── backend/
│   ├── main.py          # Flask API + ML training
│   ├── models.py        # SQLAlchemy models
│   ├── email_service.py # Gmail SMTP
│   └── heart.csv        # Training dataset
└── frontend/
    └── src/
        ├── pages/       # All page components
        ├── components/  # Reusable components
        ├── context/     # Auth + Theme context
        └── i18n/        # Translation files
```

---

## 🌍 Roadmap

- [ ] Deploy on Railway + Vercel
- [ ] Custom domain
- [ ] XGBoost + LightGBM models
- [ ] Batch CSV prediction upload
- [ ] Doctor/Patient dual roles
- [ ] Mobile PWA
- [ ] HIPAA compliance notes

---

## ⚕️ Disclaimer

> CardioScan is an **educational ML project** and is **not a substitute for professional medical advice**. Always consult a qualified healthcare provider for medical decisions.

---

<div align="center">

Made with ❤️ by [Abhishek](https://www.linkedin.com/in/1905-abhishek/)

⭐ Star this repo if you found it useful!

</div>
