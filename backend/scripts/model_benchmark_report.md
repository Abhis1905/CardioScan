# CardioScan Isolated Offline Model Benchmark Report

**Generated Date**: 2026-10-11  
**Experiment Script**: `backend/scripts/evaluate_models.py`  
**Results Data**: `backend/scripts/benchmark_results.json`

---

## 1. Executive Summary & Critical Finding

This report documents an isolated, offline benchmarking experiment designed to evaluate CardioScan's candidate machine learning classifiers under strict, leakage-safe validation constraints.

### The Duplicate Record Finding
Inspection of `backend/heart.csv` revealed that although the file has **1,025 rows**, **723 rows are exact duplicate copies**. The dataset actually comprises only **302 unique patients** (derived from the classic UCI Cleveland Heart Disease dataset).

In the existing production pipeline (`train_test_split(test_size=0.2, random_state=42)`):
- **199 of 205 test samples (97.1%)** were exact duplicates of rows in the training partition.
- This extreme data leakage artificially inflated the reported Random Forest test accuracy to **98.54%** and ROC-AUC to **1.0000**, as deep decision trees memorized duplicate patient records.

---

## 2. Methodology & Validation Protocol

To establish genuine generalization performance across unseen patients:

1. **Deduplication**: Exact duplicate rows were removed prior to partitioning, leaving $N = 302$ unique patient records.
2. **Stratified 5-Fold Cross-Validation**:
   - Fixed random state (`random_state=42`, `shuffle=True`).
   - Identical fold assignments for all candidate models (~60–61 held-out test patients per fold).
3. **Strict Zero-Leakage Preprocessing**:
   - Preprocessing steps (e.g. `StandardScaler`) were encapsulated within `sklearn.pipeline.Pipeline`.
   - Scalers and transformations were fit strictly on the training fold and applied out-of-fold to the test fold.
4. **Held-Out Evaluation Only**:
   - Metrics and predicted probabilities were calculated exclusively on the held-out validation folds.
5. **Leakage-Safe Calibration**:
   - Calibrated models used internal 3-fold cross-validation on the training fold (`CalibratedClassifierCV(cv=3)`), ensuring zero exposure to test-fold observations.

---

## 3. Dataset Profile

| Property | Value | Description |
| :--- | :--- | :--- |
| **Raw File Rows** | 1,025 | Total lines in `backend/heart.csv` |
| **Unique Patient Records** | 302 | Distinct clinical observations |
| **Duplicate Rows Removed** | 723 (70.54%) | Exact duplicate observations |
| **Class 0 (No Disease)** | 138 (45.70%) | Negative diagnosis |
| **Class 1 (Heart Disease)** | 164 (54.30%) | Positive diagnosis |
| **Clinical Features** | 13 | `age`, `sex`, `cp`, `trestbps`, `chol`, `fbs`, `restecg`, `thalach`, `exang`, `oldpeak`, `slope`, `ca`, `thal` |

---

## 4. Benchmark Results (Mean ± Std Across 5 Folds)

Evaluated on $N = 302$ unique patients using identical 5-Fold Stratified Cross-Validation:

| Model | Accuracy | Balanced Accuracy | Sensitivity (Recall) | Specificity | Precision | F1-Score | ROC-AUC | Brier Score (↓) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Logistic Regression** | **0.8312 ± 0.028** | **0.8275 ± 0.025** | 0.8655 ± 0.099 | 0.7894 ± 0.090 | **0.8380 ± 0.051** | 0.8454 ± 0.036 | 0.9045 ± 0.018 | 0.1254 ± 0.021 |
| **SVM (RBF Kernel)** | 0.8279 ± 0.026 | 0.8231 ± 0.024 | **0.8780 ± 0.084** | 0.7683 ± 0.074 | 0.8223 ± 0.038 | **0.8455 ± 0.032** | **0.9074 ± 0.018** | **0.1233 ± 0.018** |
| **Random Forest (100)** | 0.8247 ± 0.033 | 0.8219 ± 0.033 | 0.8536 ± 0.073 | **0.7902 ± 0.079** | 0.8326 ± 0.043 | 0.8400 ± 0.035 | 0.9073 ± 0.011 | 0.1270 ± 0.011 |
| **XGBoost (Regularized)** | 0.8214 ± 0.043 | 0.8164 ± 0.041 | 0.8716 ± 0.089 | 0.7611 ± 0.073 | 0.8154 ± 0.041 | 0.8392 ± 0.045 | 0.9049 ± 0.018 | 0.1243 ± 0.022 |
| **XGBoost (Baseline)** | 0.8114 ± 0.052 | 0.8097 ± 0.050 | 0.8290 ± 0.094 | 0.7905 ± 0.064 | 0.8257 ± 0.045 | 0.8243 ± 0.057 | 0.8734 ± 0.026 | 0.1590 ± 0.040 |
| **K-Nearest Neighbors (k=5)** | 0.8081 ± 0.027 | 0.8032 ± 0.029 | 0.8598 ± 0.041 | 0.7466 ± 0.059 | 0.8031 ± 0.033 | 0.8295 ± 0.024 | 0.8837 ± 0.020 | 0.1363 ± 0.015 |
| **XGBoost (Calibrated)** | 0.8049 ± 0.045 | 0.8012 ± 0.044 | 0.8413 ± 0.095 | 0.7611 ± 0.095 | 0.8124 ± 0.051 | 0.8219 ± 0.049 | 0.9062 ± 0.016 | 0.1272 ± 0.023 |

---

## 5. Detailed Comparative Analysis

### 1. XGBoost Baseline vs. Regularized XGBoost
- The **Baseline XGBoost** (default parameters: `max_depth=6`, unconstrained trees) showed evidence of overfitting on this small sample size:
  - Lower ROC-AUC (**0.8734**)
  - Substantially higher probability calibration error (Brier score **0.1590**)
  - Lower sensitivity (**82.9%**)
- In contrast, **Regularized XGBoost** (`max_depth=3`, `learning_rate=0.05`, `subsample=0.8`, `colsample_bytree=0.8`, `reg_lambda=1.0`, `reg_alpha=0.1`) significantly improved:
  - ROC-AUC increased to **0.9049** (+0.0315)
  - Sensitivity rose to **87.16%** (+4.26%)
  - Brier score dropped to **0.1243** (reliable calibration)

### 2. SVM (RBF Kernel) Clinical Strengths
- **SVM with an RBF kernel** achieved the highest mean sensitivity across folds (**87.80%**) while maintaining the lowest Brier score (**0.1233**) and sharing the top ROC-AUC (**0.9074**).
- In cardiology diagnostics, higher sensitivity is paramount because a false negative (failing to identify an existing heart disease case) carries high clinical risk.

### 3. Performance Parity Across Top Models
- The top four models—**Logistic Regression (83.1%)**, **SVM (82.8%)**, **Random Forest (82.5%)**, and **Regularized XGBoost (82.1%)**—perform within **±1 standard deviation** of each other across all folds.
- Their ROC-AUCs are virtually identical (**0.9045 to 0.9074**).
- **Conclusion**: The empirical evidence does **not** support declaring any single model an outright winner. XGBoost does not outperform simpler regularized models (Logistic Regression or SVM) on this dataset.

---

## 6. Clinical & Statistical Limitations

1. **Small Retrospective Sample ($N = 302$)**:
   The entire dataset comprises only 302 unique patients. A sample of this size exhibits noticeable fold-to-fold variance (standard deviation of ~2.5% to 5.2% in accuracy, and ~7% to 10% in sensitivity).
2. **Cannot Establish Clinical Safety**:
   Performance on a small, retrospective academic dataset cannot establish real-world diagnostic accuracy, safety, or clinical efficacy across diverse patient populations.
3. **Feature Representations**:
   Multi-class categorical features (`cp`, `restecg`, `slope`, `thal`) are treated as continuous integers. While tree-based models and kernel SVM handle non-linear boundaries reasonably well, true one-hot encoding or target encoding may yield cleaner representations.
