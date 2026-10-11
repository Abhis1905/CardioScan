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
            deltas = []
            for val in sampled:
                xm = x_arr.copy()
                xm[0, i] = val
                xm_df = pd.DataFrame(xm, columns=FEATURE_NAMES)
                xm_in = scaler.transform(xm_df) if scaled else xm_df
                deltas.append(base_prob - float(model.predict_proba(xm_in)[0][1]))
            shap_vals.append(round(float(np.mean(deltas)), 5))
        return shap_vals

    def predict_single(self, data_dict: Dict[str, Any], model_key: str) -> Tuple[int, float, str, List[float]]:
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
        shap_vals = self.explain(model, x_arr, scaled=scaled)
        return pred, round(prob, 4), risk, shap_vals

    def predict_ensemble(self, data_dict: Dict[str, Any]) -> Tuple[int, float, str, List[float], Dict[str, Any], Dict[str, int]]:
        """Inference with majority ensemble voting."""
        results = {}
        for mk in ["logistic_regression", "random_forest", "knn"]:
            p, prob, risk, _ = self.predict_single(data_dict, mk)
            results[mk] = {"prediction": p, "probability": round(prob, 4), "risk_level": risk}

        votes = [r["prediction"] for r in results.values()]
        pred = 1 if sum(votes) >= 2 else 0
        prob = round(sum(r["probability"] for r in results.values()) / 3.0, 4)
        risk = "Low" if prob < 0.3 else "Moderate" if prob < 0.6 else "High"

        # Explanation for ensemble uses Random Forest baseline
        _, _, _, shap_vals = self.predict_single(data_dict, "random_forest")
        vote_counts = {"heart_disease": sum(votes), "no_disease": 3 - sum(votes)}
        return pred, prob, risk, shap_vals, results, vote_counts


ml_service = MLService()
