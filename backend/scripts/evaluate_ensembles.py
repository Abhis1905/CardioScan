#!/usr/bin/env python3
"""
CardioScan Isolated Offline Ensemble Benchmarking Experiment.

This script compares the current CardioScan production ensemble against
candidate expanded ensembles using strictly out-of-fold cross-validation.

Candidate Ensembles:
1. Current Production Ensemble: Logistic Regression + Random Forest + KNN (3 models)
2. Current Ensemble + SVM (RBF) (4 models)
3. Current Ensemble + Regularized XGBoost (4 models)
4. Current Ensemble + SVM + Regularized XGBoost (5 models)

Methodology & Constraints:
- Deduplicated dataset of 302 unique patient records.
- Identical 5-fold StratifiedKFold splits (random_state=42, shuffle=True).
- Strictly out-of-fold predictions (no model predicts on training samples).
- Independent evaluation of:
    (a) Mean predicted probabilities (Soft voting / probability averaging)
    (b) Majority voting (Hard voting; ties on even-sized ensembles broken via mean prob >= 0.5)
- Metrics evaluated per held-out fold: Accuracy, Balanced Accuracy, Sensitivity, Specificity,
  Precision, F1-Score, ROC-AUC, and Brier Score.
- Expected Calibration Error (ECE) evaluated across bins.
- No tuning of weights, thresholds, or calibration on held-out predictions.
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
from xgboost import XGBClassifier
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

FEATURE_NAMES = [
    "age", "sex", "cp", "trestbps", "chol", "fbs", "restecg",
    "thalach", "exang", "oldpeak", "slope", "ca", "thal"
]


def load_deduplicated_data(csv_path: str) -> Tuple[pd.DataFrame, np.ndarray, Dict[str, Any]]:
    if not os.path.exists(csv_path):
        raise FileNotFoundError(f"Dataset not found at {csv_path}")

    raw_df = pd.read_csv(csv_path)
    dedup_df = raw_df.drop_duplicates().copy().reset_index(drop=True)

    X = dedup_df[FEATURE_NAMES].copy()
    y = dedup_df["target"].to_numpy()

    meta = {
        "raw_count": len(raw_df),
        "unique_count": len(dedup_df),
        "duplicates_removed": len(raw_df) - len(dedup_df),
        "target_distribution": {int(k): int(v) for k, v in dedup_df["target"].value_counts().items()},
    }
    return X, y, meta


def get_base_model_pipelines() -> Dict[str, Any]:
    """Instantiate base model pipelines with strict per-fold preprocessing."""
    return {
        "lr": Pipeline([
            ("scaler", StandardScaler()),
            ("classifier", LogisticRegression(max_iter=1000, C=1.0, random_state=42)),
        ]),
        "rf": Pipeline([
            ("classifier", RandomForestClassifier(n_estimators=100, random_state=42)),
        ]),
        "knn": Pipeline([
            ("scaler", StandardScaler()),
            ("classifier", KNeighborsClassifier(n_neighbors=5)),
        ]),
        "svm": Pipeline([
            ("scaler", StandardScaler()),
            ("classifier", SVC(kernel="rbf", probability=True, C=1.0, random_state=42)),
        ]),
        "xgb": Pipeline([
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
        ]),
    }


def compute_expected_calibration_error(y_true: np.ndarray, y_prob: np.ndarray, n_bins: int = 10) -> float:
    """Compute Expected Calibration Error (ECE) across uniform confidence bins."""
    bin_boundaries = np.linspace(0, 1, n_bins + 1)
    ece = 0.0
    n = len(y_true)

    for i in range(n_bins):
        bin_lower, bin_upper = bin_boundaries[i], bin_boundaries[i + 1]
        if i == n_bins - 1:
            in_bin = (y_prob >= bin_lower) & (y_prob <= bin_upper)
        else:
            in_bin = (y_prob >= bin_lower) & (y_prob < bin_upper)

        bin_size = np.sum(in_bin)
        if bin_size > 0:
            bin_acc = np.mean(y_true[in_bin])
            bin_conf = np.mean(y_prob[in_bin])
            ece += (bin_size / n) * np.abs(bin_acc - bin_conf)

    return float(ece)


def calculate_metrics_from_preds(y_true: np.ndarray, y_pred: np.ndarray, y_prob: np.ndarray) -> Dict[str, float]:
    cm = confusion_matrix(y_true, y_pred)
    tn, fp, fn, tp = cm.ravel()

    sens = tp / (tp + fn) if (tp + fn) > 0 else 0.0
    spec = tn / (tn + fp) if (tn + fp) > 0 else 0.0

    return {
        "accuracy": float(accuracy_score(y_true, y_pred)),
        "balanced_accuracy": float(balanced_accuracy_score(y_true, y_pred)),
        "sensitivity": float(sens),
        "specificity": float(spec),
        "precision": float(precision_score(y_true, y_pred, zero_division=0)),
        "f1_score": float(f1_score(y_true, y_pred, zero_division=0)),
        "roc_auc": float(roc_auc_score(y_true, y_prob)),
        "brier_score": float(brier_score_loss(y_true, y_prob)),
        "ece": compute_expected_calibration_error(y_true, y_prob),
    }


def run_ensemble_benchmark(csv_path: str, output_json_path: Optional[str] = None) -> Dict[str, Any]:
    print("=" * 85)
    print("CARDIOSCAN OFFLINE ENSEMBLE BENCHMARKING EXPERIMENT")
    print("=" * 85)

    X, y, meta = load_deduplicated_data(csv_path)

    print(f"\n[1] DATASET OVERVIEW:")
    print(f"  * Deduplicated unique patients: {meta['unique_count']}")
    print(f"  * Class 0 (No Disease):         {meta['target_distribution'][0]} ({meta['target_distribution'][0]/meta['unique_count']*100:.1f}%)")
    print(f"  * Class 1 (Disease):            {meta['target_distribution'][1]} ({meta['target_distribution'][1]/meta['unique_count']*100:.1f}%)")

    # Define the 4 ensemble configurations
    ensemble_definitions = {
        "Ensemble 1 (Production: LR + RF + KNN)": ["lr", "rf", "knn"],
        "Ensemble 2 (Current + SVM)": ["lr", "rf", "knn", "svm"],
        "Ensemble 3 (Current + Reg XGBoost)": ["lr", "rf", "knn", "xgb"],
        "Ensemble 4 (Current + SVM + Reg XGBoost)": ["lr", "rf", "knn", "svm", "xgb"],
    }

    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)

    # Dictionary to hold predictions per fold
    # Format: fold_predictions[fold_idx][model_key] = {"prob": ..., "pred": ..., "y_true": ...}
    all_models_needed = ["lr", "rf", "knn", "svm", "xgb"]
    fold_model_outputs: List[Dict[str, Dict[str, np.ndarray]]] = []
    fold_y_true: List[np.ndarray] = []

    print(f"\n[2] FITTING BASE MODELS ON 5 FOLDS (STRICTLY OUT-OF-FOLD)...")
    for fold_idx, (train_idx, test_idx) in enumerate(cv.split(X, y), start=1):
        X_train, X_test = X.iloc[train_idx], X.iloc[test_idx]
        y_train, y_test = y[train_idx], y[test_idx]
        fold_y_true.append(y_test)

        base_pipelines = get_base_model_pipelines()
        fold_dict = {}

        for m_key, pipe in base_pipelines.items():
            pipe.fit(X_train, y_train)
            prob = pipe.predict_proba(X_test)[:, 1]
            pred = pipe.predict(X_test)
            fold_dict[m_key] = {"prob": prob, "pred": pred}

        fold_model_outputs.append(fold_dict)
        print(f"  * Fold {fold_idx}/5 fitted and evaluated on {len(test_idx)} held-out patients.")

    # Now evaluate each ensemble for both Mean Probability and Majority Voting
    ensemble_results: Dict[str, Any] = {}

    for ens_name, model_keys in ensemble_definitions.items():
        is_production = (ens_name == "Ensemble 1 (Production: LR + RF + KNN)")
        num_models = len(model_keys)

        mean_prob_fold_metrics: List[Dict[str, float]] = []
        maj_vote_fold_metrics: List[Dict[str, float]] = []

        for fold_idx in range(5):
            y_test = fold_y_true[fold_idx]
            fold_preds = fold_model_outputs[fold_idx]

            # Stack probabilities and predictions for selected models
            probs_matrix = np.column_stack([fold_preds[k]["prob"] for k in model_keys])  # shape: (n_samples, K)
            preds_matrix = np.column_stack([fold_preds[k]["pred"] for k in model_keys])  # shape: (n_samples, K)

            # Strategy A: Mean Predicted Probability (Soft Voting)
            mean_probs = np.mean(probs_matrix, axis=1)
            mean_prob_binary_preds = (mean_probs >= 0.5).astype(int)
            metrics_soft = calculate_metrics_from_preds(y_test, mean_prob_binary_preds, mean_probs)
            mean_prob_fold_metrics.append(metrics_soft)

            # Strategy B: Majority Voting (Hard Voting)
            # Votes count
            votes = np.sum(preds_matrix, axis=1)  # shape: (n_samples,)
            vote_frac = votes / float(num_models)

            if num_models % 2 == 1:
                # Odd number of models: strict majority
                maj_preds = (votes >= (num_models // 2 + 1)).astype(int)
            else:
                # Even number of models: tie broken via mean probability >= 0.5
                maj_preds = np.zeros(len(votes), dtype=int)
                maj_preds[votes > (num_models / 2)] = 1
                maj_preds[votes < (num_models / 2)] = 0
                tie_mask = (votes == (num_models / 2))
                maj_preds[tie_mask] = (mean_probs[tie_mask] >= 0.5).astype(int)

            # Note: For majority voting, vote fraction is used as ranking score for ROC-AUC / Brier
            metrics_hard = calculate_metrics_from_preds(y_test, maj_preds, vote_frac)
            maj_vote_fold_metrics.append(metrics_hard)

        # Summarize across folds
        def summarize(fold_list):
            m_keys = list(fold_list[0].keys())
            res = {}
            for k in m_keys:
                vals = [f[k] for f in fold_list]
                res[k] = {"mean": round(float(np.mean(vals)), 4), "std": round(float(np.std(vals)), 4)}
            return res

        ensemble_results[ens_name] = {
            "is_production": is_production,
            "models": model_keys,
            "num_models": num_models,
            "mean_probability": {
                "summary": summarize(mean_prob_fold_metrics),
                "folds": mean_prob_fold_metrics,
            },
            "majority_voting": {
                "summary": summarize(maj_vote_fold_metrics),
                "folds": maj_vote_fold_metrics,
            },
        }

    # Print Comparison Table
    print("\n" + "=" * 105)
    print("ENSEMBLE BENCHMARK RESULTS (Deduplicated 302 Patients, 5-Fold Stratified CV Mean ± Std)")
    print("=" * 105)

    print("\n--- [STRATEGY A] MEAN PREDICTED PROBABILITY (Risk Score Averaging / Soft Voting) ---")
    hdr = f"{'Ensemble Configuration':<42} | {'Accuracy':<13} | {'Bal Acc':<13} | {'Sensitivity':<13} | {'Specificity':<13} | {'ROC-AUC':<13} | {'Brier (↓)':<13}"
    print(hdr)
    print("-" * 105)
    for name, data in ensemble_results.items():
        s = data["mean_probability"]["summary"]
        acc = f"{s['accuracy']['mean']:.3f}±{s['accuracy']['std']:.3f}"
        bal = f"{s['balanced_accuracy']['mean']:.3f}±{s['balanced_accuracy']['std']:.3f}"
        sens = f"{s['sensitivity']['mean']:.3f}±{s['sensitivity']['std']:.3f}"
        spec = f"{s['specificity']['mean']:.3f}±{s['specificity']['std']:.3f}"
        auc_val = f"{s['roc_auc']['mean']:.3f}±{s['roc_auc']['std']:.3f}"
        brier = f"{s['brier_score']['mean']:.3f}±{s['brier_score']['std']:.3f}"
        tag = " [PROD]" if data["is_production"] else ""
        print(f"{(name + tag):<42} | {acc:<13} | {bal:<13} | {sens:<13} | {spec:<13} | {auc_val:<13} | {brier:<13}")

    print("\n--- [STRATEGY B] MAJORITY VOTING (Discrete Hard Voting) ---")
    print(hdr)
    print("-" * 105)
    for name, data in ensemble_results.items():
        s = data["majority_voting"]["summary"]
        acc = f"{s['accuracy']['mean']:.3f}±{s['accuracy']['std']:.3f}"
        bal = f"{s['balanced_accuracy']['mean']:.3f}±{s['balanced_accuracy']['std']:.3f}"
        sens = f"{s['sensitivity']['mean']:.3f}±{s['sensitivity']['std']:.3f}"
        spec = f"{s['specificity']['mean']:.3f}±{s['specificity']['std']:.3f}"
        auc_val = f"{s['roc_auc']['mean']:.3f}±{s['roc_auc']['std']:.3f}"
        brier = f"{s['brier_score']['mean']:.3f}±{s['brier_score']['std']:.3f}"
        tag = " [PROD]" if data["is_production"] else ""
        print(f"{(name + tag):<42} | {acc:<13} | {bal:<13} | {sens:<13} | {spec:<13} | {auc_val:<13} | {brier:<13}")

    print("=" * 105)

    # Save results to JSON
    if output_json_path:
        os.makedirs(os.path.dirname(os.path.abspath(output_json_path)), exist_ok=True)
        with open(output_json_path, "w") as f:
            json.dump({
                "metadata": meta,
                "ensembles": ensemble_results,
            }, f, indent=2)
        print(f"\n[3] Saved ensemble benchmark data to: {output_json_path}")

    return ensemble_results


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Evaluate CardioScan ensemble combinations offline.")
    parser.add_argument(
        "--csv",
        type=str,
        default=os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "heart.csv"),
        help="Path to heart.csv dataset",
    )
    parser.add_argument(
        "--output",
        type=str,
        default=os.path.join(os.path.dirname(os.path.abspath(__file__)), "ensemble_benchmark_results.json"),
        help="Path to save output JSON benchmark results",
    )
    args = parser.parse_args()

    run_ensemble_benchmark(args.csv, args.output)
