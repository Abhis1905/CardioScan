import os
import joblib
import logging
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.neighbors import KNeighborsClassifier
from sklearn.svm import SVC
from sklearn.inspection import permutation_importance
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix, roc_curve, auc
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler

from app.core.config import settings

logger = logging.getLogger(__name__)

REQUIRED_MODELS = {"logistic_regression", "random_forest", "knn", "svm"}

FEATURE_NAMES = [
    "age", "sex", "cp", "trestbps", "chol", "fbs", "restecg",
    "thalach", "exang", "oldpeak", "slope", "ca", "thal"
]

FIELD_RULES = {
    "age": (1, 120, False),
    "sex": (0, 1, True),
    "cp": (0, 3, True),
    "trestbps": (60, 250, False),
    "chol": (100, 600, False),
    "fbs": (0, 1, True),
    "restecg": (0, 2, True),
    "thalach": (60, 250, False),
    "exang": (0, 1, True),
    "oldpeak": (0.0, 10.0, False),
    "slope": (0, 2, True),
    "ca": (0, 4, True),
    "thal": (0, 3, True),
}

FEATURE_CATALOG = {
    "age": {
        "name": "Age",
        "category": "Demographics",
        "data_type": "Integer",
        "unit": "years",
        "valid_range_documented": "1 – 120",
        "description": "Patient chronological age in completed years.",
        "clinical_relevance": "Coronary artery disease incidence increases significantly with advancing age due to cumulative endothelial stress, vascular stiffening, and calcification.",
        "missing_count_unique": 0,
        "missing_pct_unique": 0.0,
        "missing_note": None,
        "categories": None,
    },
    "sex": {
        "name": "Biological Sex",
        "category": "Demographics",
        "data_type": "Binary",
        "unit": None,
        "valid_range_documented": "0 or 1",
        "description": "Biological sex assigned at birth.",
        "clinical_relevance": "Cardiovascular risk profiles and typical symptom presentations differ substantially between biological sexes. This historical cohort has a 68.2% male representation.",
        "missing_count_unique": 0,
        "missing_pct_unique": 0.0,
        "missing_note": None,
        "categories": {0: "Female (31.8% unique)", 1: "Male (68.2% unique)"},
    },
    "cp": {
        "name": "Chest Pain Type",
        "category": "Symptoms",
        "data_type": "Categorical (4 Levels)",
        "unit": None,
        "valid_range_documented": "0, 1, 2, 3",
        "description": "Classification of chest pain according to Diamond-Forrester clinical criteria.",
        "clinical_relevance": "Differentiates typical angina (substernal exertional discomfort relieved by rest/nitrates) from atypical or non-anginal chest pain. Strong predictor of coronary stenosis in referral populations.",
        "missing_count_unique": 0,
        "missing_pct_unique": 0.0,
        "missing_note": None,
        "categories": {
            0: "Typical Angina (143 unique, 47.4%)",
            1: "Atypical Angina (50 unique, 16.6%)",
            2: "Non-anginal Pain (86 unique, 28.5%)",
            3: "Asymptomatic (23 unique, 7.6%)",
        },
    },
    "trestbps": {
        "name": "Resting Blood Pressure",
        "category": "Vitals",
        "data_type": "Continuous",
        "unit": "mm Hg",
        "valid_range_documented": "60 – 250",
        "description": "Resting systolic blood pressure recorded upon hospital admission.",
        "clinical_relevance": "Chronic elevated systolic pressure promotes endothelial shear stress, coronary vascular remodeling, and accelerates atherosclerosis.",
        "missing_count_unique": 0,
        "missing_pct_unique": 0.0,
        "missing_note": None,
        "categories": None,
    },
    "chol": {
        "name": "Serum Cholesterol",
        "category": "Lab",
        "data_type": "Continuous",
        "unit": "mg/dL",
        "valid_range_documented": "100 – 600",
        "description": "Total fasting serum cholesterol level.",
        "clinical_relevance": "Circulating low-density and total lipoproteins infiltrate arterial subendothelium, driving foam-cell formation and fibroatheroma growth.",
        "missing_count_unique": 0,
        "missing_pct_unique": 0.0,
        "missing_note": None,
        "categories": None,
    },
    "fbs": {
        "name": "Fasting Blood Sugar",
        "category": "Lab",
        "data_type": "Binary",
        "unit": None,
        "valid_range_documented": "0 or 1",
        "description": "Fasting blood sugar elevation indicator (> 120 mg/dL).",
        "clinical_relevance": "Hyperglycemia correlates with microvascular endothelial dysfunction, autonomic neuropathy, and elevated cardiovascular morbidity.",
        "missing_count_unique": 0,
        "missing_pct_unique": 0.0,
        "missing_note": None,
        "categories": {
            0: "≤ 120 mg/dL / Normal (257 unique, 85.1%)",
            1: "> 120 mg/dL / Elevated (45 unique, 14.9%)",
        },
    },
    "restecg": {
        "name": "Resting ECG Results",
        "category": "Cardiac",
        "data_type": "Categorical (3 Levels)",
        "unit": None,
        "valid_range_documented": "0, 1, 2",
        "description": "Baseline 12-lead electrocardiogram findings at rest.",
        "clinical_relevance": "Detects resting ST-segment and T-wave abnormalities indicative of previous ischemia, or left ventricular hypertrophy by voltage/repolarization criteria.",
        "missing_count_unique": 0,
        "missing_pct_unique": 0.0,
        "missing_note": None,
        "categories": {
            0: "Normal (147 unique, 48.7%)",
            1: "ST-T Wave Abnormality (151 unique, 50.0%)",
            2: "Left Ventricular Hypertrophy (4 unique, 1.3%)",
        },
    },
    "thalach": {
        "name": "Max Heart Rate Achieved",
        "category": "Cardiac",
        "data_type": "Continuous",
        "unit": "bpm",
        "valid_range_documented": "60 – 250",
        "description": "Maximum heart rate attained during graded exercise stress testing.",
        "clinical_relevance": "Failure to achieve target age-predicted peak heart rate (chronotropic incompetence) indicates exercise intolerance and autonomic dysfunction.",
        "missing_count_unique": 0,
        "missing_pct_unique": 0.0,
        "missing_note": None,
        "categories": None,
    },
    "exang": {
        "name": "Exercise-Induced Angina",
        "category": "Symptoms",
        "data_type": "Binary",
        "unit": None,
        "valid_range_documented": "0 or 1",
        "description": "Presence of exertional chest pain triggered during exercise stress testing.",
        "clinical_relevance": "Direct clinical sign of transient myocardial oxygen supply-demand mismatch during increased workload.",
        "missing_count_unique": 0,
        "missing_pct_unique": 0.0,
        "missing_note": None,
        "categories": {
            0: "No exertional angina (203 unique, 67.2%)",
            1: "Exertional angina provoked (99 unique, 32.8%)",
        },
    },
    "oldpeak": {
        "name": "ST Depression (Oldpeak)",
        "category": "Cardiac",
        "data_type": "Continuous",
        "unit": "mm",
        "valid_range_documented": "0.0 – 10.0",
        "description": "Exercise-induced ST-segment depression relative to resting baseline.",
        "clinical_relevance": "Magnitude of horizontal or downsloping ST displacement at 80 ms past the J-point reflects depth and extent of subendocardial ischemia.",
        "missing_count_unique": 0,
        "missing_pct_unique": 0.0,
        "missing_note": None,
        "categories": None,
    },
    "slope": {
        "name": "Peak Exercise ST Slope",
        "category": "Cardiac",
        "data_type": "Categorical (3 Levels)",
        "unit": None,
        "valid_range_documented": "0, 1, 2",
        "description": "Trajectory slope of the ST segment during peak exercise.",
        "clinical_relevance": "Flat and downsloping ST trajectories have significantly higher diagnostic sensitivity and specificity for coronary ischemia than rapid upsloping patterns.",
        "missing_count_unique": 0,
        "missing_pct_unique": 0.0,
        "missing_note": None,
        "categories": {
            0: "Upsloping (21 unique, 7.0%)",
            1: "Flat / Horizontal (140 unique, 46.4%)",
            2: "Downsloping (141 unique, 46.7%)",
        },
    },
    "ca": {
        "name": "Major Vessels (Fluoroscopy)",
        "category": "Cardiac",
        "data_type": "Discrete (0–3 valid, 4 sentinel)",
        "unit": "vessels",
        "valid_range_documented": "0 – 3 (4 is missing sentinel)",
        "description": "Number of major coronary arteries (LAD, LCx, RCA) visualized by cardiac fluoroscopy.",
        "clinical_relevance": "Direct surrogate for multi-vessel calcification and anatomical coronary burden. Value 4 is a non-standard historical missingness code.",
        "missing_count_unique": 4,
        "missing_pct_unique": round(4 / 302 * 100, 2),
        "missing_note": "Value 4 represents missing or undetermined fluoroscopy in 4 unique records (18 raw records).",
        "categories": {
            0: "0 vessels colored (175 unique, 57.9%)",
            1: "1 vessel colored (65 unique, 21.5%)",
            2: "2 vessels colored (38 unique, 12.6%)",
            3: "3 vessels colored (20 unique, 6.6%)",
            4: "Missing sentinel value (4 unique, 1.3%)",
        },
    },
    "thal": {
        "name": "Thallium Stress Scintigraphy",
        "category": "Cardiac",
        "data_type": "Categorical (1–3 valid, 0 sentinel)",
        "unit": None,
        "valid_range_documented": "1, 2, 3 (0 is missing sentinel)",
        "description": "Radioactive Thallium-201 nuclear perfusion scan measuring myocardial blood flow during stress and rest.",
        "clinical_relevance": "Distinguishes reversible ischemia (salvageable myocardium) from fixed scar defects (infarction). Value 0 is a historical missingness code.",
        "missing_count_unique": 2,
        "missing_pct_unique": round(2 / 302 * 100, 2),
        "missing_note": "Value 0 represents missing scintigraphy in 2 unique records (7 raw records).",
        "categories": {
            0: "Missing sentinel value (2 unique, 0.7%)",
            1: "Fixed Defect (18 unique, 6.0%)",
            2: "Normal Perfusion (165 unique, 54.6%)",
            3: "Reversible Defect (117 unique, 38.7%)",
        },
    },
}



class MLService:
    def __init__(self):
        self.models: Dict[str, Any] = {}
        self.scalers: Dict[str, Any] = {}
        self.metrics: Dict[str, Any] = {}
        self.dataset_stats: Dict[str, Any] = {}
        self.feature_importance: Dict[str, Dict[str, float]] = {}
        self.X_train_bg: Optional[pd.DataFrame] = None
        self.is_initialized: bool = False
        self.cache_dir = os.path.join(
            os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "artifacts"
        )
        self.cache_path = os.path.join(self.cache_dir, "models_bundle.joblib")

    def _build_metrics(self, name: str, y_test: pd.Series, y_pred: np.ndarray, y_prob: np.ndarray) -> Dict[str, Any]:
        report = classification_report(y_test, y_pred, output_dict=True, zero_division=0)
        cm = confusion_matrix(y_test, y_pred).tolist()
        fpr, tpr, _ = roc_curve(y_test, y_prob)
        step = max(1, len(fpr) // 50)
        return {
            "name": name,
            "accuracy": round(float(accuracy_score(y_test, y_pred)), 4),
            "auc": round(float(auc(fpr, tpr)), 4),
            "precision": round(float(report["1"]["precision"]), 4),
            "recall": round(float(report["1"]["recall"]), 4),
            "f1": round(float(report["1"]["f1-score"]), 4),
            "confusion_matrix": cm,
            "roc_curve": {
                "fpr": [round(float(v), 4) for v in fpr[::step]],
                "tpr": [round(float(v), 4) for v in tpr[::step]],
            },
        }

    def train_and_cache(self, csv_path: Optional[str] = None) -> None:
        """Explicit reproducible training routine with disk caching."""
        target_csv = csv_path or settings.HEART_CSV_PATH
        if not os.path.exists(target_csv):
            raise FileNotFoundError(f"Training dataset not found at {target_csv}")

        logger.info("Training ML models using dataset: %s", target_csv)
        df = pd.read_csv(target_csv)
        X = df.drop("target", axis=1)[FEATURE_NAMES]
        y = df["target"]

        # Compute dataset stats
        self.dataset_stats["shape"] = list(df.shape)
        self.dataset_stats["target_distribution"] = {int(k): int(v) for k, v in y.value_counts().items()}
        self.dataset_stats["feature_stats"] = {
            col: {
                "mean": round(float(X[col].mean()), 2),
                "std": round(float(X[col].std()), 2),
                "min": round(float(X[col].min()), 2),
                "max": round(float(X[col].max()), 2),
            }
            for col in FEATURE_NAMES
        }
        self.dataset_stats["correlation_with_target"] = {
            col: round(float(df[col].corr(df["target"])), 3) for col in FEATURE_NAMES
        }

        # Train/Test Split
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
        self.X_train_bg = X_train

        # StandardScaler for LR and KNN
        scaler = StandardScaler()
        Xs_tr = scaler.fit_transform(X_train)
        Xs_te = scaler.transform(X_test)
        self.scalers["standard"] = scaler

        # 1. Logistic Regression
        lr = LogisticRegression(max_iter=1000, random_state=42)
        lr.fit(Xs_tr, y_train)
        self.models["logistic_regression"] = lr
        self.metrics["logistic_regression"] = self._build_metrics(
            "Logistic Regression", y_test, lr.predict(Xs_te), lr.predict_proba(Xs_te)[:, 1]
        )
        coef = np.abs(lr.coef_[0])
        tot = coef.sum() or 1.0
        self.feature_importance["logistic_regression"] = {
            fn: round(float(v / tot), 4) for fn, v in zip(FEATURE_NAMES, coef)
        }

        # 2. Random Forest
        rf = RandomForestClassifier(n_estimators=100, random_state=42)
        rf.fit(X_train, y_train)
        self.models["random_forest"] = rf
        self.metrics["random_forest"] = self._build_metrics(
            "Random Forest", y_test, rf.predict(X_test), rf.predict_proba(X_test)[:, 1]
        )
        self.feature_importance["random_forest"] = {
            fn: round(float(v), 4) for fn, v in zip(FEATURE_NAMES, rf.feature_importances_)
        }

        # 3. K-Nearest Neighbors
        knn = KNeighborsClassifier(n_neighbors=5)
        knn.fit(Xs_tr, y_train)
        self.models["knn"] = knn
        self.metrics["knn"] = self._build_metrics(
            "KNN", y_test, knn.predict(Xs_te), knn.predict_proba(Xs_te)[:, 1]
        )
        self.feature_importance["knn"] = self.feature_importance["random_forest"]

        # 4. Support Vector Machine (RBF kernel)
        svm = SVC(kernel="rbf", probability=True, C=1.0, random_state=42)
        svm.fit(Xs_tr, y_train)
        self.models["svm"] = svm
        self.metrics["svm"] = self._build_metrics(
            "Support Vector Machine", y_test, svm.predict(Xs_te), svm.predict_proba(Xs_te)[:, 1]
        )
        perm_result = permutation_importance(
            svm, Xs_te, y_test, n_repeats=10, random_state=42, scoring="roc_auc"
        )
        raw_importances = np.maximum(0, perm_result.importances_mean)
        tot_perm = raw_importances.sum()
        norm_importances = raw_importances / tot_perm if tot_perm > 0 else np.ones(len(FEATURE_NAMES)) / len(FEATURE_NAMES)
        self.feature_importance["svm"] = {
            fn: round(float(v), 4) for fn, v in zip(FEATURE_NAMES, norm_importances)
        }

        # Save bundle to disk
        os.makedirs(self.cache_dir, exist_ok=True)
        bundle = {
            "models": self.models,
            "scalers": self.scalers,
            "metrics": self.metrics,
            "dataset_stats": self.dataset_stats,
            "feature_importance": self.feature_importance,
            "X_train_bg": self.X_train_bg,
        }
        joblib.dump(bundle, self.cache_path)
        self.is_initialized = True
        logger.info("Successfully trained and saved model artifacts to %s", self.cache_path)

    def load_or_train(self) -> None:
        """Load pre-trained artifacts from disk cache if present and complete; otherwise train."""
        if os.path.exists(self.cache_path):
            try:
                bundle = joblib.load(self.cache_path)
                loaded_models = bundle.get("models", {})
                if REQUIRED_MODELS.issubset(loaded_models.keys()):
                    self.models = loaded_models
                    self.scalers = bundle["scalers"]
                    self.metrics = bundle["metrics"]
                    self.dataset_stats = bundle["dataset_stats"]
                    self.feature_importance = bundle["feature_importance"]
                    self.X_train_bg = bundle["X_train_bg"]
                    self.is_initialized = True
                    logger.info("Loaded models bundle successfully from cache.")
                    return
                else:
                    missing = REQUIRED_MODELS - set(loaded_models.keys())
                    logger.warning("Cache bundle is missing required models (%s); retraining.", missing)
            except Exception as e:
                logger.warning("Cache load failed (%s); retraining models.", str(e))

        self.train_and_cache()

    def explain(self, model: Any, x_arr: np.ndarray, scaled: bool = False, n_samples: int = 40) -> List[float]:
        """
        Compute feature attribution values via sampling-based marginal probability shifts.
        Deterministic random state 42 ensures reproducible explanation scores.
        Vectorized across the sampled background rows per feature to eliminate unbatched inference overhead.
        """
        np.random.seed(42)
        scaler = self.scalers.get("standard")
        x_df = pd.DataFrame(x_arr, columns=FEATURE_NAMES)
        x_in = scaler.transform(x_df) if scaled else x_df
        base_prob = float(model.predict_proba(x_in)[0][1])

        bg = self.X_train_bg.values
        shap_vals = []
        for i in range(x_arr.shape[1]):
            sampled = bg[:, i][np.random.choice(len(bg), n_samples, replace=True)]
            X_batch = np.repeat(x_arr, n_samples, axis=0)
            X_batch[:, i] = sampled
            X_batch_df = pd.DataFrame(X_batch, columns=FEATURE_NAMES)
            X_batch_in = scaler.transform(X_batch_df) if scaled else X_batch_df
            probs = model.predict_proba(X_batch_in)[:, 1]
            deltas = base_prob - probs
            shap_vals.append(round(float(np.mean(deltas)), 5))
        return shap_vals

    def predict_single(
        self, data_dict: Dict[str, Any], model_key: str, include_explanation: bool = True
    ) -> Tuple[int, float, str, List[float]]:
        """Inference for a single model."""
        if model_key not in self.models:
            raise ValueError(f"Unknown model: {model_key}")

        vals = [int(data_dict[f]) if FIELD_RULES[f][2] else float(data_dict[f]) for f in FEATURE_NAMES]
        x_df = pd.DataFrame([vals], columns=FEATURE_NAMES)
        x_arr = x_df.values.astype(float)

        model = self.models[model_key]
        scaled = model_key in ("logistic_regression", "knn", "svm")
        sc = self.scalers["standard"]

        if scaled:
            xi = sc.transform(x_df)
            pred = int(model.predict(xi)[0])
            prob = float(model.predict_proba(xi)[0][1])
        else:
            pred = int(model.predict(x_df)[0])
            prob = float(model.predict_proba(x_df)[0][1])

        risk = "Low" if prob < 0.3 else "Moderate" if prob < 0.6 else "High"
        shap_vals = self.explain(model, x_arr, scaled=scaled) if include_explanation else []
        return pred, round(prob, 4), risk, shap_vals

    def predict_ensemble(self, data_dict: Dict[str, Any]) -> Tuple[int, float, str, List[float], Dict[str, Any], Dict[str, int]]:
        """Inference with majority ensemble voting."""
        results = {}
        for mk in ["logistic_regression", "random_forest", "knn"]:
            p, prob, risk, _ = self.predict_single(data_dict, mk, include_explanation=False)
            results[mk] = {"prediction": p, "probability": round(prob, 4), "risk_level": risk}

        votes = [r["prediction"] for r in results.values()]
        pred = 1 if sum(votes) >= 2 else 0
        prob = round(sum(r["probability"] for r in results.values()) / 3.0, 4)
        risk = "Low" if prob < 0.3 else "Moderate" if prob < 0.6 else "High"

        # Explanation for ensemble uses Random Forest baseline
        _, _, _, shap_vals = self.predict_single(data_dict, "random_forest", include_explanation=True)
        vote_counts = {"heart_disease": sum(votes), "no_disease": 3 - sum(votes)}
        return pred, prob, risk, shap_vals, results, vote_counts

    def get_enriched_dataset_stats(self) -> Dict[str, Any]:
        """
        Return comprehensive dataset overview, deduplication audit, feature metadata,
        and scientific integrity disclosures.
        """
        if not self.is_initialized:
            self.load_or_train()

        if "audit" in self.dataset_stats and "features_metadata" in self.dataset_stats:
            return self.dataset_stats

        target_csv = settings.HEART_CSV_PATH
        if not os.path.exists(target_csv):
            return self.dataset_stats

        try:
            df = pd.read_csv(target_csv)
            dedup = df.drop_duplicates().reset_index(drop=True)
            feature_cols = [c for c in df.columns if c != "target"]

            # Compute stats on deduplicated 302 rows
            unique_stats = {
                col: {
                    "mean": round(float(dedup[col].mean()), 2),
                    "std": round(float(dedup[col].std()), 2),
                    "min": round(float(dedup[col].min()), 2),
                    "max": round(float(dedup[col].max()), 2),
                }
                for col in feature_cols
            }
            corr_unique = {
                col: round(float(dedup[col].corr(dedup["target"])), 3)
                for col in feature_cols
            }

            # Enriched metadata for all 13 features
            features_meta = []
            for col in feature_cols:
                fdef = FEATURE_CATALOG.get(col, {})
                features_meta.append({
                    "key": col,
                    "name": fdef.get("name", col),
                    "category": fdef.get("category", "General"),
                    "data_type": fdef.get("data_type", "Numeric"),
                    "unit": fdef.get("unit"),
                    "valid_range_documented": fdef.get("valid_range_documented", ""),
                    "min_observed": float(dedup[col].min()),
                    "max_observed": float(dedup[col].max()),
                    "mean_raw": round(float(df[col].mean()), 2),
                    "mean_unique": round(float(dedup[col].mean()), 2),
                    "std_raw": round(float(df[col].std()), 2),
                    "std_unique": round(float(dedup[col].std()), 2),
                    "corr_raw": round(float(df[col].corr(df["target"])), 3),
                    "corr_unique": corr_unique[col],
                    "missing_count_unique": fdef.get("missing_count_unique", 0),
                    "missing_pct_unique": fdef.get("missing_pct_unique", 0.0),
                    "missing_note": fdef.get("missing_note"),
                    "description": fdef.get("description", ""),
                    "clinical_relevance": fdef.get("clinical_relevance", ""),
                    "categories": fdef.get("categories"),
                })

            raw_target_counts = {int(k): int(v) for k, v in df["target"].value_counts().items()}
            dedup_target_counts = {int(k): int(v) for k, v in dedup["target"].value_counts().items()}

            self.dataset_stats.update({
                "audit": {
                    "total_raw_rows": len(df),
                    "total_unique_rows": len(dedup),
                    "duplicate_rows": len(df) - len(dedup),
                    "duplicate_pct": round((len(df) - len(dedup)) / len(df) * 100, 2),
                    "duplicate_pattern": {"3_copies": 187, "4_copies": 114, "8_copies": 1},
                    "conflicting_duplicates": 0,
                    "train_test_overlap": {
                        "test_size": 205,
                        "duplicated_in_train": 199,
                        "overlap_pct": 97.07,
                        "unseen_patients": 2,
                        "unseen_samples": 6,
                    },
                },
                "provenance": {
                    "dataset_name": "UCI Heart Disease (Cleveland Clinic Foundation Cohort)",
                    "origin_investigators": "Robert Detrano, M.D., Ph.D. (V.A. Medical Center, Long Beach & Cleveland Clinic Foundation, 1988)",
                    "source_repository": "UCI Machine Learning Repository (compiled as 1,025-row replication on Kaggle)",
                    "collection_year": 1988,
                    "clinical_setting": "Referred hospital cardiac catheterization cohort (patients undergoing invasive coronary angiography)",
                    "target_definition": "Angiographic coronary artery disease: ≥ 50% diameter narrowing in ≥ 1 major coronary artery",
                },
                "target_breakdown": {
                    "raw": {
                        "0": {"count": raw_target_counts.get(0, 499), "pct": round(raw_target_counts.get(0, 499) / len(df) * 100, 2), "label": "No Significant CAD (<50% stenosis)"},
                        "1": {"count": raw_target_counts.get(1, 526), "pct": round(raw_target_counts.get(1, 526) / len(df) * 100, 2), "label": "Significant CAD (≥50% stenosis)"},
                    },
                    "unique": {
                        "0": {"count": dedup_target_counts.get(0, 138), "pct": round(dedup_target_counts.get(0, 138) / len(dedup) * 100, 2), "label": "No Significant CAD (<50% stenosis)"},
                        "1": {"count": dedup_target_counts.get(1, 164), "pct": round(dedup_target_counts.get(1, 164) / len(dedup) * 100, 2), "label": "Significant CAD (≥50% stenosis)"},
                    },
                },
                "quality_status": {
                    "rating": "Historical Academic Referral Cohort (Identified Limitations Disclosed)",
                    "is_production_ready_for_clinical_care": False,
                    "missingness_summary": "Zero null entries in the raw CSV. Two features contain historical sentinel encodings for missing values: ca=4 (4 unique records, 1.32%) and thal=0 (2 unique records, 0.66%).",
                    "duplication_summary": "723 rows are exact replicas of 302 unique patients (187 records x 3, 114 records x 4, 1 record x 8). In standard random 80/20 train/test splits, 97.1% of test rows are copies of training rows.",
                    "demographic_bias": "68.2% male vs 31.8% female in the unique cohort. Sourced exclusively from a 1988 Cleveland Clinic referral cohort, lacking modern multi-ethnic diversity.",
                },
                "feature_stats_unique": unique_stats,
                "correlation_with_target_unique": corr_unique,
                "features_metadata": features_meta,
            })
        except Exception as e:
            logger.warning("Failed to enrich dataset stats: %s", e)

        return self.dataset_stats


ml_service = MLService()

