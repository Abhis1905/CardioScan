<div align="center">

# CardioScan

### Full-Stack Cardiovascular Risk Exploration & Explainable Machine Learning Platform

An academic and educational health-literacy platform that analyzes standard cardiovascular measurements, evaluates predictions across five supervised machine learning models, delivers per-feature SHAP explainability, and generates verifiable clinical reports with embedded QR codes.

<br/>

[![Live Production](https://img.shields.io/badge/Live%20App-cardio--scan--lac.vercel.app-2D7A58?style=for-the-badge&logo=vercel&logoColor=white)](https://cardio-scan-lac.vercel.app)
[![Short Link](https://img.shields.io/badge/Short%20Link-da.gd%2Fcardioscan-789580?style=for-the-badge)](https://da.gd/cardioscan)
[![API Documentation](https://img.shields.io/badge/FastAPI%20Docs-Swagger%20UI-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://cardioscan-api-1gbm.onrender.com/docs)
[![GitHub Repository](https://img.shields.io/badge/GitHub-Abhis1905%2FCardioScan-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/Abhis1905/CardioScan)

<br/>

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](LICENSE)
[![React](https://img.shields.io/badge/React-18.2-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.111-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Python](https://img.shields.io/badge/Python-3.10%2B-3776AB?style=flat-square&logo=python&logoColor=white)](https://python.org)
[![scikit-learn](https://img.shields.io/badge/scikit--learn-1.6-F7931E?style=flat-square&logo=scikit-learn&logoColor=white)](https://scikit-learn.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white)](https://tailwindcss.com)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon%20Serverless-4169E1?style=flat-square&logo=postgresql&logoColor=white)](https://neon.tech)
[![Tests](https://img.shields.io/badge/Tests-Passing-2D7A58?style=flat-square&logo=github-actions&logoColor=white)](backend/tests)

</div>

---

> [!IMPORTANT]
> **Educational & Research Prototype Notice**  
> CardioScan is strictly an academic demonstration and health literacy educational tool. It is **not** an FDA-cleared or CE-marked medical device, is **not** diagnostic software, and must **never** be used to replace individualized clinical diagnosis, emergency evaluation, or treatment decisions by a licensed cardiologist or healthcare physician.

---

## 📑 Table of Contents

- [Overview & Clinical Scope](#-overview--clinical-scope)
- [Key Features](#-key-features)
- [Architecture & Data Flow](#-architecture--data-flow)
- [Machine Learning & Explainability Pipeline](#-machine-learning--explainability-pipeline)
- [Technology Stack](#-technology-stack)
- [Repository Layout](#-repository-layout)
- [Local Development Setup](#-local-development-setup)
- [Environment Configuration](#-environment-configuration)
- [Testing & Quality Assurance](#-testing--quality-assurance)
- [Design System & Theme Harmonization](#-design-system--theme-harmonization)
- [Scientific Limitations & Provenance](#-scientific-limitations--provenance)
- [Future Scope & Roadmap](#-future-scope--roadmap)
- [Author & License](#-author--license)

---

## 🔬 Overview & Clinical Scope

CardioScan demonstrates modern full-stack engineering and machine learning model explainability in healthcare informatics. The application allows users to explore how 13 standard clinical variables (e.g., blood pressure, serum cholesterol, exercise-induced angina, ST depression) interact non-linearly to influence cardiovascular risk predictions.

### Core Objectives
1. **Explainable AI (XAI)**: Demystify black-box machine learning by presenting Shapley Additive Explanations (SHAP) that quantify each biomarker's exact marginal contribution to a given risk estimate.
2. **Honest Scientific Evaluation**: Train and evaluate models on true deduplicated observations (302 unique records from the 1988 Cleveland Clinic Foundation benchmark cohort) using 5-fold cross-validation with leakage-safe scaling pipelines.
3. **Clinical Auditability**: Issue tamper-resistant PDF summary documents embedded with cryptographic Report IDs and scannable QR verification badges linked to live authentication routes.
4. **Accessible International Design**: Provide a fully localized experience in 8 languages with seamless Right-to-Left (RTL) Arabic layout and a verified neutral charcoal dark mode.

---

## ✨ Key Features

### 🫀 Multi-Model Risk Inference Engine
- **5 Supervised Learning Models**:
  - **Random Forest**: 100-tree ensemble capturing non-linear feature interactions without overfitting.
  - **Logistic Regression**: L2-regularized probabilistic baseline calibrated for odds-ratio interpretability.
  - **K-Nearest Neighbors (KNN)**: Distance-weighted instance similarity across multi-dimensional feature space.
  - **Support Vector Machine (SVM)**: Radial Basis Function (RBF) kernel mapping non-linear decision boundaries with Platt scaling.
  - **Consensus Ensemble**: Majority voting combining predictions across all base classifiers to reduce single-model variance.
- **Risk Stratification**: Continuous output mapped into actionable risk bands (**Low Risk**, **Moderate Risk**, **High Risk**) with calibrated probability confidence intervals.

### 📊 Explainability & Interactive "What-If" Analysis
- **SHAP Waterfall Decompositions**: Visual attribution charts showing whether specific biomarkers (e.g., elevated `trestbps` or ST slope flattening) pushed the predicted probability above or below the population base value.
- **Interactive Synergy Explorer**: Real-time multi-variable sensitivity simulator demonstrating how borderline signals (e.g., Stage 1 blood pressure + moderate cholesterol + exercise ST sag) compound non-linearly in machine learning models.

### 📄 Verifiable PDF Clinical Summaries & QR Audit
- **Vector PDF Generation**: Client-side compiled clinical summaries via `jsPDF`, preserving recorded baseline vitals and attribution breakdowns.
- **Permanent Identifiers**: Generates deterministic, collision-resistant Report IDs (`CR-XXXX-XXXX`) and hospital-style Patient Identifiers (`CS-XXXX-XXXX`).
- **Cryptographic QR Badges**: Each report includes a high-density QR code resolving directly to `https://cardio-scan-lac.vercel.app/reports/:reportId` for real-time authenticity verification.

### 🌍 Universal Internationalization (8 Locales + RTL)
- Supported languages: **English**, **Hindi (हिंदी)**, **Spanish (Español)**, **French (Français)**, **German (Deutsch)**, **Arabic (العربية)**, **Chinese (中文)**, and **Portuguese (Português)**.
- **Bidirectional Arabic Layout**: Dynamic `dir="rtl"` transformation adjusting flex orientations, margins, iconography, and navigation drawer alignments.

### 🛡️ Authentication, Privacy & Platform Governance
- **Zero-Storage Anonymous Mode**: Run predictions and simulate What-If scenarios without registering, creating accounts, or storing personal identifiers.
- **Dual Authentication**: Salted bcrypt password authentication with email verification alongside Firebase Google OAuth federated sign-in.
- **Cloudflare Turnstile Bot Protection**: Frictionless CAPTCHA alternative protecting prediction endpoints and authentication flows.
- **Audited Admin Telemetry**: Role-based platform governance dashboard displaying live model usage counts, deduplication metrics, user directories, and database health.

---

## 🏗️ Architecture & Data Flow

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                CLIENT BROWSER                                   │
│  React 18 · Tailwind CSS · Framer Motion · Recharts · i18next · jsPDF · qrcode   │
│  Production CDN: Vercel (https://cardio-scan-lac.vercel.app)                    │
└──────────────────────────────────────┬──────────────────────────────────────────┘
                                       │ HTTPS / JSON REST
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                             BACKEND API SERVICE                                 │
│                   FastAPI · Uvicorn · Pydantic v2 · Python 3.10                 │
│                   Production Host: Render (cardioscan-api-1gbm.onrender.com)     │
├──────────────────────────────────────┬──────────────────────────────────────────┤
│           ROUTERS & SECURITY         │           MACHINE LEARNING ENGINE        │
│  • /predict & /whatif                │  • scikit-learn 1.6 Classifiers          │
│  • /auth (JWT + Firebase Admin)      │  • TreeSHAP & LinearSHAP Attribution     │
│  • /profile & /history               │  • StandardScaler Pipeline Isolation     │
│  • /admin telemetry & audit          │  • 5-Fold Cross-Validation Benchmarks    │
│  • Cloudflare Turnstile Validation   │  • Model Consensus Majority Voting       │
└──────────────────┬───────────────────┴────────────────────────┬─────────────────┘
                   │                                            │
                   ▼                                            ▼
┌──────────────────────────────────────┐     ┌────────────────────────────────────┐
│      PERSISTENT DATABASE (Neon)      │     │      THIRD-PARTY SERVICES          │
│  • Neon Serverless PostgreSQL        │     │  • Firebase Authentication (OAuth) │
│  • SQLAlchemy 2.0 ORM                │     │  • Cloudflare Turnstile (Anti-Bot) │
│  • Alembic Schema Version Tracking   │     │  • Resend / SMTP (Trans. Emails)   │
└──────────────────────────────────────┘     └────────────────────────────────────┘
```

---

## 🧠 Machine Learning & Explainability Pipeline

### 13 Clinical Predictors

| Feature | Name | Clinical Description | Range / Categories |
| :--- | :--- | :--- | :--- |
| `age` | Age | Patient chronological age | 29 – 77 years |
| `sex` | Biological Sex | Biological sex at birth | 0 = Female, 1 = Male |
| `cp` | Chest Pain Type | Symptom category | 0 = Typical, 1 = Atypical, 2 = Non-anginal, 3 = Asymptomatic |
| `trestbps`| Resting BP | Resting systolic blood pressure on admission | 94 – 200 mm Hg |
| `chol` | Serum Cholesterol| Fasting serum cholesterol level | 126 – 564 mg/dL |
| `fbs` | Fasting Blood Sugar| Blood sugar after fasting | 0 = $\le$ 120 mg/dL, 1 = $>$ 120 mg/dL |
| `restecg` | Resting ECG | Electrocardiographic findings at rest | 0 = Normal, 1 = ST-T wave anomaly, 2 = LVH |
| `thalach` | Max Heart Rate | Peak heart rate achieved during exercise | 71 – 202 bpm |
| `exang` | Exercise Angina | Exercise-induced angina pectoris | 0 = No, 1 = Yes |
| `oldpeak` | ST Depression | ST depression induced by exercise vs. rest | 0.0 – 6.2 mm |
| `slope` | ST Slope | Peak exercise ST segment slope | 0 = Upsloping, 1 = Flat, 2 = Downsloping |
| `ca` | Fluoroscopy | Major blood vessels colored by fluoroscopy | 0 – 3 vessels |
| `thal` | Thallium Stress | Cardiac thallium stress test result | 1 = Fixed defect, 2 = Normal, 3 = Reversible defect |

### Deduplication & Cross-Validation Protocol
Historical datasets frequently contain exact duplicate observations (e.g., the bundled 1,025-row set contains 723 duplicates). CardioScan implements automated exact-duplicate removal, reducing the dataset to **302 unique clinical observations**. All performance metrics are calculated using **5-Fold Stratified Cross-Validation**, with `StandardScaler` transformations strictly fitted within training folds to eliminate cross-fold distribution leakage.

---

## 🛠️ Technology Stack

| Domain | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend Framework** | React 18.2 | Single-page application with modular component architecture |
| **Styling & Theme** | Tailwind CSS 3.4 | Utility-first CSS with dark/light theme selector tokens |
| **Animation & Motion** | Framer Motion 11 | Hardware-accelerated UI transitions and micro-interactions |
| **Visualizations** | Recharts 2.12 | Responsive bar charts, telemetry gauges, and radar comparisons |
| **Internationalization**| i18next & react-i18next | Multi-language translation dictionaries with RTL support |
| **Document Generation** | jsPDF & qrcode | Client-side verifiable clinical PDF export with QR code |
| **Backend Framework** | FastAPI 0.111 | High-performance asynchronous REST API with OpenAPI/Swagger |
| **Web Server** | Uvicorn 0.30 | ASGI production server |
| **Machine Learning** | scikit-learn 1.6 & SHAP | Multi-model classifiers, probability calibration, and feature attribution |
| **Data Processing** | NumPy & Pandas | Tabular data deduplication and array operations |
| **Database & ORM** | PostgreSQL & SQLAlchemy 2.0 | Relational database storage with transactional integrity |
| **Schema Migrations** | Alembic 1.13 | Reversible database schema version control |
| **Authentication** | Firebase Admin & PyJWT | Password hashing (bcrypt), JWT tokens, and Google OAuth |
| **Bot Protection** | Cloudflare Turnstile | Server-side verified invisible bot mitigation |
| **Deployment** | Vercel & Render | Continuous frontend CDN and containerized backend hosting |

---

## 📁 Repository Layout

```
CardioScan/
├── 📂 backend/                     # FastAPI backend application
│   ├── 📂 alembic/                 # Database schema migrations
│   │   └── 📂 versions/            # Version migration scripts
│   ├── 📂 app/                     # Core application source
│   │   ├── 📂 api/                 # REST router endpoints (/predict, /auth, /admin, etc.)
│   │   ├── 📂 core/                # Application settings and security configurations
│   │   ├── 📂 db/                  # Database session and base model definitions
│   │   ├── 📂 models/              # SQLAlchemy declarative models (User, Prediction, etc.)
│   │   ├── 📂 schemas/             # Pydantic request and response contracts
│   │   └── 📂 services/            # Machine learning service and email dispatchers
│   ├── 📂 tests/                   # Pytest test suite (13 test modules)
│   ├── .env.example                # Backend environment configuration template
│   ├── alembic.ini                 # Alembic migration configuration
│   ├── main.py                     # Entrypoint wrapper
│   ├── Procfile                    # Production web server command
│   └── requirements.txt            # Python dependencies
│
├── 📂 frontend/                    # React 18 frontend application
│   ├── 📂 public/                  # Static assets and index.html (pre-render script)
│   ├── 📂 src/
│   │   ├── 📂 components/          # Reusable UI widgets (Navbar, AnatomicalHeart, Tour, etc.)
│   │   ├── 📂 context/             # React context providers (AuthContext, ThemeContext)
│   │   ├── 📂 i18n/                # Translation files (en, hi, es, fr, de, ar, zh, pt)
│   │   ├── 📂 pages/               # Route components (Landing, Predict, Metrics, Data, etc.)
│   │   ├── 📂 utils/               # PDF generator and report validation logic
│   │   ├── App.js                  # Application routing and route guards
│   │   ├── api.js                  # Axios HTTP client configuration
│   │   └── index.css               # Global styles and Tailwind directives
│   ├── .env.example                # Frontend environment configuration template
│   ├── package.json                # Frontend dependencies and npm scripts
│   └── tailwind.config.js          # Tailwind theme tokens and dark mode config
│
├── .gitignore                      # Git exclusion rules
├── LICENSE                         # MIT Open Source License
└── README.md                       # Repository documentation
```

---

## 💻 Local Development Setup

### Prerequisites
- **Python**: Version 3.10 or higher
- **Node.js**: Version 18 or higher (with `npm`)
- **Git**: Installed and configured

### 1. Clone the Repository
```bash
git clone https://github.com/Abhis1905/CardioScan.git
cd CardioScan
```

### 2. Backend Setup
```bash
# Navigate to backend directory
cd backend

# Create and activate Python virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install required packages
pip install -r requirements.txt

# Copy environment configuration template
cp .env.example .env

# Run Alembic database migrations (creates SQLite cardioscan.db locally)
alembic upgrade head

# Start FastAPI development server
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
# API Swagger UI available at: http://127.0.0.1:8000/docs
```

### 3. Frontend Setup
In a new terminal window:
```bash
# Navigate to frontend directory
cd CardioScan/frontend

# Install dependencies
npm install --legacy-peer-deps

# Copy environment configuration template
cp .env.example .env.local

# Start React development server
npm start
# Web application available at: http://localhost:3000 (or http://localhost:3002)
```

---

## 🔐 Environment Configuration

> [!CAUTION]
> Never commit actual credentials, service account JSON files, private keys, or passwords to Git. All secrets are excluded in `.gitignore`.

### Backend Environment Variables (`backend/.env`)

| Variable | Description | Example / Default |
| :--- | :--- | :--- |
| `ENVIRONMENT` | Runtime environment (`development`, `production`, `test`) | `development` |
| `DEBUG` | Enable debug mode and verbose logging | `false` |
| `PORT` | Local server port | `8000` |
| `DATABASE_URL` | SQLAlchemy connection string (PostgreSQL or SQLite) | `sqlite:///./cardioscan.db` |
| `JWT_SECRET` | 32+ character random secret for JWT signing | `openssl rand -hex 32` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Token validity duration | `1440` (24 hours) |
| `ALLOWED_ORIGINS` | Permitted CORS frontend origins | `http://localhost:3000,http://localhost:3002` |
| `FRONTEND_URL` | Base URL used in transactional email links | `http://localhost:3000` |
| `EMAIL_PROVIDER` | Email provider (`console`, `resend`, `smtp`) | `console` (for local dev) |
| `RESEND_API_KEY` | Resend API key for transactional emails | `re_placeholder_key` |
| `FIREBASE_PROJECT_ID` | Firebase project identifier for OAuth token verification | `cardioscan-app` |
| `TURNSTILE_SECRET_KEY` | Cloudflare Turnstile secret key (testing dummy: `1x00...AA`)| `1x0000000000000000000000000000000AA` |

### Frontend Environment Variables (`frontend/.env.local`)

| Variable | Description | Example / Default |
| :--- | :--- | :--- |
| `REACT_APP_API_URL` | Backend REST API endpoint URL | `http://127.0.0.1:8000` |
| `REACT_APP_FIREBASE_API_KEY` | Firebase Web API key for client SDK | `AIzaSy_placeholder` |
| `REACT_APP_FIREBASE_AUTH_DOMAIN` | Firebase Authentication domain | `cardioscan-app.firebaseapp.com` |
| `REACT_APP_FIREBASE_PROJECT_ID` | Firebase project identifier | `cardioscan-app` |
| `REACT_APP_TURNSTILE_SITE_KEY` | Cloudflare Turnstile site key (public testing key) | `1x00000000000000000000AA` |

---

## 🧪 Testing & Quality Assurance

CardioScan maintains test suites covering frontend security, report generation, backend endpoint contracts, database isolation, and production safety guards.

### Running Backend Unit & Safety Tests
```bash
cd backend
source venv/bin/activate
pytest tests/ -v
```
Test modules include:
- `test_production_safety.py`: Confirms mock email/auth providers and insecure defaults are blocked in production mode.
- `test_predictions.py`: Validates input range validation, model inferences, and SHAP calculation boundaries.
- `test_patient_profile.py`: Verifies immutability of historical prediction records upon profile update.
- `test_reports.py`: Tests report verification endpoint contracts and QR code URL consistency.
- `test_auth.py` & `test_firebase_auth.py`: Exercises user registration, salted hashing, and federated tokens.

### Running Frontend Tests
```bash
cd frontend
CI=true npm test -- --watchAll=false
```
Test specifications include:
- **Snapshot Consistency**: Verifies report ID, legal name, UHID, and biomarker attributes match prediction snapshots.
- **QR Code Decoding**: Generates live QR canvas and verifies bitwise decoding back to the canonical verification URL.
- **XSS Escaping**: Verifies user-entered names with script tags are strictly sanitized before PDF generation.

---

## 🎨 Design System & Theme Harmonization

CardioScan features a **Neutral Charcoal Dark Mode** engineered for sustained clinical and educational reading comfort, completely eliminating green-tinted backgrounds and generic navy blue styling.

### Neutral Charcoal Palette

| Role | Token Hex | Computed Value | Application |
| :--- | :--- | :--- | :--- |
| **Main Background** | `#17191B` | `rgb(23, 25, 27)` | Base canvas across all application views |
| **Surface / Card** | `#202326` | `rgb(32, 35, 38)` | Content cards, modals, dropdown panels |
| **Elevated Surface**| `#282C30` | `rgb(40, 44, 48)` | Button pills, secondary panels, form inputs |
| **Subtle Border** | `#373C40` | `rgb(55, 60, 64)` | Outlines, card frames, table cell dividers |
| **Primary Text** | `#F2F3F3` | `rgb(242, 243, 243)` | Main headings, labels, typed input text |
| **Secondary Text**| `#B2B7BB` | `rgb(178, 183, 187)` | Descriptive body paragraphs, metadata |
| **Muted Text** | `#8C9399` | `rgb(140, 147, 153)` | Input placeholders, captions, disabled states |
| **Restrained Accent**| `#789580` | `rgb(120, 149, 128)` | Selected states, primary action CTA buttons |

*Light mode is 100% preserved using a warm cream base (`#F7F5F0`), white cards (`#FFFFFF`), and deep charcoal typography (`#1E293B`).*

---

## ⚠️ Scientific Limitations & Provenance

1. **Cohort Demographics**: The training benchmark dataset originates from the 1988 Cleveland Clinic Foundation study (UCI Machine Learning Repository). The dataset reflects a historic hospital-referral cohort with a high prevalence of severe coronary artery disease; statistical risk distributions cannot be generalized to contemporary unselected populations.
2. **Missing Biomarkers**: Standard contemporary cardiovascular risk calculators (such as ASCVD or Framingham) utilize high-sensitivity troponin, hs-CRP, smoking status (pack-years), and lipid sub-fractions (HDL/LDL/triglycerides) which are not present in this historic 13-feature tabular format.
3. **Exploration Only**: High probability scores indicate that the entered feature configuration resembles angiographically confirmed coronary disease cases in the historic Cleveland training distribution; they do not constitute an individualized clinical diagnosis.

---

## 🚀 Future Scope & Roadmap

- [x] Multi-model supervised inference (Random Forest, Logistic Regression, KNN, SVM, Consensus)
- [x] SHAP feature attribution waterfall visualizations
- [x] Verifiable PDF clinical summary reports with scannable QR verification badges
- [x] 8-language localization with full Arabic bidirectional RTL support
- [x] Dual authentication (Bcrypt email/password + Firebase Google OAuth)
- [x] Neutral charcoal dark mode theme harmonization
- [x] Cloudflare Turnstile automated bot protection
- [x] Administrative platform governance and deduplication telemetry dashboard
- [ ] Prospective multi-center validation on modern electronic health record (EHR) cohorts
- [ ] 12-lead digital ECG waveform signal processing via 1D Convolutional Neural Networks (CNN)
- [ ] Longitudinal risk tracking showing multi-year biomarker drift
- [ ] FHIR (Fast Healthcare Interoperability Resources) data export standard compliance

---

## 👤 Author & Acknowledgments

**Abhishek Jha**  
- **GitHub**: [@Abhis1905](https://github.com/Abhis1905)
- **LinkedIn**: [Abhishek Jha](https://www.linkedin.com/in/1905-abhishek/)
- **Live Demo**: [https://cardio-scan-lac.vercel.app](https://cardio-scan-lac.vercel.app)
- **Short Link**: [https://da.gd/cardioscan](https://da.gd/cardioscan)

### Acknowledgments & References
- *Cleveland Clinic Foundation*, Robert Detrano, M.D., Ph.D. — Original heart disease clinical dataset.
- *UCI Machine Learning Repository* — Historic dataset curation and distribution.
- *Lundberg, S. M., & Lee, S.-I.* — A Unified Approach to Interpreting Model Predictions (SHAP).

---

## 📄 License

This project is licensed under the terms of the [MIT License](LICENSE).  
Copyright (c) 2026 Abhishek Jha. All rights reserved.
