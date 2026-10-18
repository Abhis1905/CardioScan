#!/usr/bin/env python3
"""
CardioScan Isolated Offline Model Benchmarking Experiment.

This script benchmarks candidate ML models on CardioScan heart disease data
using leakage-safe Stratified 5-Fold Cross Validation.

Key safeguards:
1. Exact duplicate rows in heart.csv are removed prior to splitting.
2. Identical 5-fold StratifiedKFold splits (random_state=42) for all models.
3. sklearn Pipelines ensure all transformations (e.g. StandardScaler) are fit
   strictly on training folds only (zero cross-fold data leakage).
4. Out-of-fold predictions evaluate Accuracy, Balanced Accuracy, Sensitivity,
   Specificity, Precision, F1-Score, ROC-AUC, and Brier Score.
5. Cross-validated calibration (CalibratedClassifierCV) avoids test-leakage.
6. Does not modify production artifacts or prediction pipelines.
"""

import os
import sys
import json
import warnings
import argparse
from typing import Tuple, Dict, Any, List, Optional
import numpy as np
import pandas as pd

warnings.filterwarnings("ignore")

from sklearn.model_selection import StratifiedKFold
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.neighbors import KNeighborsClassifier
from sklearn.svm import SVC
from sklearn.calibration import CalibratedClassifierCV
from sklearn.metrics import (
    accuracy_score,
    balanced_accuracy_score,
    confusion_matrix,
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score,
    brier_score_loss,
)

# Optional XGBoost import
try:
    import xgboost as xgb
    from xgboost import XGBClassifier
    XGB_AVAILABLE = True
except ImportError:
    XGB_AVAILABLE = False


FEATURE_NAMES = [
    "age", "sex", "cp", "trestbps", "chol", "fbs", "restecg",
    "thalach", "exang", "oldpeak", "slope", "ca", "thal"
]


def load_and_deduplicate_dataset(csv_path: str) -> Tuple[pd.DataFrame, np.ndarray, Dict[str, Any], pd.DataFrame]:
    if not os.path.exists(csv_path):
        raise FileNotFoundError(f"Dataset not found at {csv_path}")

    raw_df = pd.read_csv(csv_path)
    total_raw_rows = len(raw_df)

    dedup_df = raw_df.drop_duplicates().copy().reset_index(drop=True)
    total_unique_rows = len(dedup_df)
    duplicate_rows = total_raw_rows - total_unique_rows

    target_counts = dedup_df["target"].value_counts().to_dict()
    target_proportions = dedup_df["target"].value_counts(normalize=True).to_dict()

    X = dedup_df[FEATURE_NAMES].copy()
    y = dedup_df["target"].to_numpy()

    meta = {
        "total_raw_rows": total_raw_rows,
        "total_unique_rows": total_unique_rows,
        "duplicate_rows": duplicate_rows,
        "duplicate_pct": round(duplicate_rows / total_raw_rows * 100, 2),
        "target_counts": {int(k): int(v) for k, v in target_counts.items()},
        "target_proportions": {int(k): round(float(v), 4) for k, v in target_proportions.items()},
        "features": FEATURE_NAMES,
    }

    return X, y, meta, raw_df


def get_candidate_models() -> Dict[str, Any]:
    """Define candidate model pipelines."""
    models = {
        "Logistic Regression": Pipeline([
            ("scaler", StandardScaler()),
            ("classifier", LogisticRegression(max_iter=1000, random_state=42, C=1.0)),
        ]),
        "K-Nearest Neighbors (k=5)": Pipeline([
            ("scaler", StandardScaler()),
            ("classifier", KNeighborsClassifier(n_neighbors=5)),
        ]),
        "Random Forest (100 trees)": Pipeline([
            ("classifier", RandomForestClassifier(n_estimators=100, random_state=42)),
        ]),
        "Support Vector Machine (RBF)": Pipeline([
            ("scaler", StandardScaler()),
            ("classifier", SVC(kernel="rbf", probability=True, random_state=42, C=1.0)),
        ]),
    }

    if XGB_AVAILABLE:
        # 1. Baseline XGBoost (default configuration)
        models["XGBoost (Baseline)"] = Pipeline([
            ("classifier", XGBClassifier(
                random_state=42,
                eval_metric="logloss",
                use_label_encoder=False if hasattr(xgb, "XGBClassifier") else None,
            )),
        ])

        # 2. Regularized XGBoost (constrained capacity for small N=302)
        models["XGBoost (Regularized)"] = Pipeline([
            ("classifier", XGBClassifier(
                n_estimators=100,
                max_depth=3,
                learning_rate=0.05,
                subsample=0.8,
                colsample_bytree=0.8,
                reg_lambda=1.0,
                reg_alpha=0.1,
                min_child_weight=2,
                random_state=42,
                eval_metric="logloss",
            )),
        ])

        # 3. Leakage-safe Calibrated Regularized XGBoost
        # Uses internal 3-fold CV on each training fold (never sees test fold)
        inner_xgb = Pipeline([
            ("classifier", XGBClassifier(
                n_estimators=100,
                max_depth=3,
                learning_rate=0.05,
                subsample=0.8,
                colsample_bytree=0.8,
                reg_lambda=1.0,
                reg_alpha=0.1,
                min_child_weight=2,
                random_state=42,
                eval_metric="logloss",
            )),
        ])
        models["XGBoost (Regularized + Calibrated)"] = CalibratedClassifierCV(
            estimator=inner_xgb,
            method="sigmoid",
            cv=3,
        )

    return models


def evaluate_model_cv(
    model_name: str,
    pipeline: Any,
    X: pd.DataFrame,
    y: np.ndarray,
    cv: StratifiedKFold
) -> Dict[str, Any]:
    """Run cross-validation and compute clinically relevant metrics per fold."""
    fold_metrics: List[Dict[str, float]] = []

    for fold_idx, (train_idx, test_idx) in enumerate(cv.split(X, y), start=1):
        X_train, X_test = X.iloc[train_idx], X.iloc[test_idx]
        y_train, y_test = y[train_idx], y[test_idx]

        # Clone / fit model strictly on training fold
        # sklearn Pipeline ensures scalers fit ONLY on X_train
        pipeline.fit(X_train, y_train)

        # Held-out predictions
        y_pred = pipeline.predict(X_test)
        y_prob = pipeline.predict_proba(X_test)[:, 1]

        # Confusion Matrix elements
        cm = confusion_matrix(y_test, y_pred)
        tn, fp, fn, tp = cm.ravel()

        sensitivity = tp / (tp + fn) if (tp + fn) > 0 else 0.0
        specificity = tn / (tn + fp) if (tn + fp) > 0 else 0.0

        metrics = {
            "accuracy": float(accuracy_score(y_test, y_pred)),
            "balanced_accuracy": float(balanced_accuracy_score(y_test, y_pred)),
            "sensitivity": float(sensitivity),
            "specificity": float(specificity),
            "precision": float(precision_score(y_test, y_pred, zero_division=0)),
            "f1_score": float(f1_score(y_test, y_pred, zero_division=0)),
            "roc_auc": float(roc_auc_score(y_test, y_prob)),
            "brier_score": float(brier_score_loss(y_test, y_prob)),
        }
        fold_metrics.append(metrics)

    # Compute summary statistics (mean and std across folds)
    metric_keys = list(fold_metrics[0].keys())
    summary: Dict[str, Any] = {}
    for k in metric_keys:
        vals = [f[k] for f in fold_metrics]
        summary[k] = {
            "mean": round(float(np.mean(vals)), 4),
            "std": round(float(np.std(vals)), 4),
        }

    return {
        "model_name": model_name,
        "summary": summary,
        "fold_metrics": fold_metrics,
    }


def run_benchmark(
    dataset_path: str,
    output_report_path: Optional[str] = None
) -> Dict[str, Any]:
    print("=" * 80)
    print("CARDIOSCAN OFFLINE MODEL BENCHMARKING EXPERIMENT")
    print("=" * 80)

    # 1. Load dataset & inspect duplicates
    X, y, meta, raw_df = load_and_deduplicate_dataset(dataset_path)

    print(f"\n[1] DATASET PROFILE:")
    print(f"  * Raw file rows:           {meta['total_raw_rows']}")
    print(f"  * Unique patient records:  {meta['total_unique_rows']}")
    print(f"  * Duplicate rows removed:  {meta['duplicate_rows']} ({meta['duplicate_pct']}%)")
    print(f"  * Class 0 (No Disease):    {meta['target_counts'].get(0, 0)} ({meta['target_proportions'].get(0, 0)*100:.1f}%)")
    print(f"  * Class 1 (Disease):       {meta['target_counts'].get(1, 0)} ({meta['target_proportions'].get(1, 0)*100:.1f}%)")
    print(f"  * Total Features:          {len(meta['features'])} ({', '.join(meta['features'])})")

    if not XGB_AVAILABLE:
        print("\n[NOTE] 'xgboost' is not installed in the current environment.")
        print("       Running evaluation for Logistic Regression, KNN, Random Forest, and SVM.")
        print("       Install xgboost in your virtual environment to include XGBoost variants.")

    # 2. Setup Stratified 5-Fold Cross Validation
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    models = get_candidate_models()

    print(f"\n[2] VALIDATION PROTOCOL:")
    print(f"  * Strategy:    Stratified 5-Fold Cross Validation (shuffle=True, random_state=42)")
    print(f"  * Fold sizes:  ~60-61 test patients per fold (held-out out-of-fold evaluation)")
    print(f"  * Leakage:     Zero cross-fold leakage (all scalers fit strictly on training folds)")
    print(f"  * Candidates:  {len(models)} models ({', '.join(models.keys())})")

    # 3. Evaluate each model
    results: Dict[str, Any] = {}
    print("\n[3] RUNNING BENCHMARK EVALUATIONS...")

    for name, pipeline in models.items():
        print(f"  -> Evaluating {name}...")
        res = evaluate_model_cv(name, pipeline, X, y, cv)
        results[name] = res

    # 4. Format tabular summary
    print("\n" + "=" * 90)
    print("BENCHMARK RESULTS (Deduplicated 302 Patients, 5-Fold Stratified CV Mean ± Std)")
    print("=" * 90)

    header = f"{'Model':<32} | {'Accuracy':<13} | {'Bal Acc':<13} | {'Sensitivity':<13} | {'Specificity':<13} | {'ROC-AUC':<13} | {'Brier (↓)':<13}"
    print(header)
    print("-" * 90)

    for name, r in results.items():
        s = r["summary"]
        acc = f"{s['accuracy']['mean']:.3f}±{s['accuracy']['std']:.3f}"
        bal = f"{s['balanced_accuracy']['mean']:.3f}±{s['balanced_accuracy']['std']:.3f}"
        sens = f"{s['sensitivity']['mean']:.3f}±{s['sensitivity']['std']:.3f}"
        spec = f"{s['specificity']['mean']:.3f}±{s['specificity']['std']:.3f}"
        auc_val = f"{s['roc_auc']['mean']:.3f}±{s['roc_auc']['std']:.3f}"
        brier = f"{s['brier_score']['mean']:.3f}±{s['brier_score']['std']:.3f}"
        print(f"{name:<32} | {acc:<13} | {bal:<13} | {sens:<13} | {spec:<13} | {auc_val:<13} | {brier:<13}")

    print("=" * 90)

    # 5. Save report to disk if path specified
    report_data = {
        "metadata": meta,
        "xgboost_available": XGB_AVAILABLE,
        "results": results,
    }

    if output_report_path:
        os.makedirs(os.path.dirname(os.path.abspath(output_report_path)), exist_ok=True)
        with open(output_report_path, "w") as f:
            json.dump(report_data, f, indent=2)
        print(f"\n[4] Full benchmark results saved to: {output_report_path}")

    return report_data


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Evaluate CardioScan candidate ML models offline.")
    parser.add_argument(
        "--csv",
        type=str,
        default=os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "heart.csv"),
        help="Path to heart.csv dataset",
    )
    parser.add_argument(
        "--output",
        type=str,
        default=os.path.join(os.path.dirname(os.path.abspath(__file__)), "benchmark_results.json"),
        help="Path to save output JSON benchmark results",
    )
    args = parser.parse_args()

    run_benchmark(args.csv, args.output)
