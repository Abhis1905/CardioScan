<div align="center">

<img src="https://img.shields.io/badge/CardioScan-Heart%20Disease%20AI-f43f5e?style=for-the-badge&logo=heart&logoColor=white" alt="CardioScan"/>

# 🫀 CardioScan
### AI-Powered Heart Disease Prediction System

[![MIT License](https://img.shields.io/badge/License-MIT-green.svg?style=flat-square)](LICENSE)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react)](https://reactjs.org)
[![Flask](https://img.shields.io/badge/Flask-3.1-000000?style=flat-square&logo=flask)](https://flask.palletsprojects.com)
[![scikit-learn](https://img.shields.io/badge/scikit--learn-1.6-F7931E?style=flat-square&logo=scikit-learn)](https://scikit-learn.org)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-3-06B6D4?style=flat-square&logo=tailwindcss)](https://tailwindcss.com)
[![Framer Motion](https://img.shields.io/badge/Framer%20Motion-11-FF0055?style=flat-square&logo=framer)](https://www.framer.com/motion)
[![Railway](https://img.shields.io/badge/Backend-Railway-0B0D0E?style=flat-square&logo=railway)](https://railway.app)
[![Vercel](https://img.shields.io/badge/Frontend-Vercel-000000?style=flat-square&logo=vercel)](https://vercel.com)

*Predict heart disease risk with 98.5% accuracy using advanced ML — fully explainable with SHAP analysis*

[🚀 Live Demo](https://cardio-scan-lac.vercel.app) • [📊 Features](#features) • [🛠️ Tech Stack](#tech-stack) • [⚡ Quick Start](#quick-start)

---

</div>

## ✨ Features

### 🧠 Machine Learning
- **3 ML Models** — Logistic Regression, Random Forest, K-Nearest Neighbors
- **Ensemble Voting** — All 3 models vote for maximum accuracy
- **SHAP Explainability** — Understand exactly which features drive every prediction
- **What-If Analysis** — Adjust clinical values with sliders, see risk change in real time
- **98.5% Accuracy** on the UCI Heart Disease dataset

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
- **Risk Trend Graph** — track risk over time
- **AI Chatbot** — powered by Groq/Llama 3.3 70B

### 🔐 Auth & Security
- JWT Authentication
- Admin Dashboard with CSV exports
- PostgreSQL persistent database

---

## 🛠️ Tech Stack

### Backend
| Technology | Purpose |
|-----------|---------|
| **Flask** | REST API |
| **scikit-learn** | ML models |
| **Flask-JWT-Extended** | Authentication |
| **PostgreSQL** | Database |
| **Groq API** | AI Chatbot |
| **Resend** | Transactional Email |

### Frontend
| Technology | Purpose |
|-----------|---------|
| **React 18** | UI Framework |
| **Tailwind CSS** | Styling |
| **Framer Motion 11** | Animations |
| **Recharts** | Charts |
| **i18next** | 8 Languages |

---

## ⚡ Quick Start
```bash
# Clone
git clone https://github.com/Abhis1905/CardioScan.git
cd CardioScan

# Backend
cd backend
pip3 install -r requirements.txt
export GROQ_API_KEY="your-groq-key"
export RESEND_API_KEY="your-resend-key"
export JWT_SECRET="your-secret-key"
python3 main.py

# Frontend (new terminal)
cd frontend
npm install --legacy-peer-deps
npm start
```

---

## 📊 Model Performance

| Model | Accuracy | AUC |
|-------|----------|-----|
| Random Forest | **98.54%** | 0.99 |
| Logistic Regression | 79.51% | 0.88 |
| KNN | 83.41% | 0.91 |
| **Ensemble** | **98.54%** | **0.99** |

---

## 🔬 Dataset

UCI Heart Disease Dataset — Cleveland, Hungarian, Switzerland, VA Long Beach (~1025 patients, 13 clinical features)

---

## 📁 Project Structure
```
CardioScan/
├── backend/
│   ├── main.py          # Flask API + ML training
│   ├── models.py        # SQLAlchemy models
│   ├── email_service.py # Resend email
│   └── heart.csv        # Training dataset
└── frontend/
    └── src/
        ├── pages/       # All page components
        ├── components/  # Reusable components
        ├── context/     # Auth + Theme context
        └── i18n/        # 8 language files
```

---

## 🌍 Roadmap

- [x] Deploy on Railway + Vercel
- [x] PostgreSQL persistent database
- [x] 8 language support
- [x] PDF report generation
- [ ] Custom domain
- [ ] XGBoost + LightGBM models
- [ ] Batch CSV prediction upload
- [ ] Mobile PWA

---

## ⚕️ Disclaimer

> CardioScan is an **educational ML project** and is **not a substitute for professional medical advice**. Always consult a qualified healthcare provider for medical decisions.

---

<div align="center">

Made with ❤️ by [Abhishek](https://www.linkedin.com/in/1905-abhishek/)

[![GitHub stars](https://img.shields.io/github/stars/Abhis1905/CardioScan?style=social)](https://github.com/Abhis1905/CardioScan)

⭐ Star this repo if you found it useful!

</div>
