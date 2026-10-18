# CardioScan Isolated Offline Ensemble Benchmark Report

**Generated Date**: 2026-10-11  
**Experiment Script**: `backend/scripts/evaluate_ensembles.py`  
**Results Data**: `backend/scripts/ensemble_benchmark_results.json`

---

## 1. Executive Summary & Objective

This report evaluates four ensemble configurations for CardioScan using strictly out-of-fold predictions on the deduplicated dataset of **302 unique patients**.

### Evaluated Ensembles:
1. **Ensemble 1 (Current Production)**: Logistic Regression + Random Forest + KNN ($K=3$)
2. **Ensemble 2 (Experimental)**: Current Ensemble + SVM (RBF Kernel) ($K=4$)
3. **Ensemble 3 (Experimental)**: Current Ensemble + Regularized XGBoost ($K=4$)
4. **Ensemble 4 (Experimental)**: Current Ensemble + SVM + Regularized XGBoost ($K=5$)

---

## 2. Validation Protocol & Constraints

- **Dataset**: `backend/heart.csv` deduplicated to $N=302$ unique patients (164 disease positive [54.3%], 138 negative [45.7%]).
- **Splits**: Identical 5-Fold Stratified K-Fold cross-validation (`StratifiedKFold(n_splits=5, shuffle=True, random_state=42)`).
- **Zero Leakage**: All base models fit strictly on training folds; zero out-of-fold contamination.
- **Two Decision Strategies Evaluated Separately**:
  - **Strategy A (Mean Predicted Probability / Soft Voting)**: Unweighted average of continuous probabilities $\bar{p} = \frac{1}{K}\sum p_k$; binary classification threshold at $\bar{p} \ge 0.5$.
  - **Strategy B (Majority Voting / Hard Voting)**: Sum of binary votes $V = \sum \hat{y}_k$; strict majority for odd $K$, ties broken via $\bar{p} \ge 0.5$ for even $K$.
- **No Test Tuning**: No thresholds, weights, or calibrators were fit or tuned on held-out predictions.

---

## 3. Benchmark Results (Mean ± Std Across 5 Folds)

### Strategy A: Mean Predicted Probability (Risk Score Averaging / Soft Voting)

| Ensemble Configuration | Accuracy | Balanced Accuracy | Sensitivity (Recall) | Specificity | Precision | F1-Score | ROC-AUC | Brier Score (↓) | ECE (↓) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Ensemble 1 (Production: LR+RF+KNN)** | 0.8346 ± 0.035 | 0.8299 ± 0.036 | 0.8841 ± 0.068 | 0.7757 ± 0.079 | 0.8276 ± 0.045 | 0.8523 ± 0.034 | 0.9128 ± 0.014 | 0.1207 ± 0.014 | 0.1176 ± 0.027 |
| **Ensemble 2 (Current + SVM)** | 0.8380 ± 0.037 | 0.8334 ± 0.035 | 0.8841 ± 0.082 | 0.7828 ± 0.068 | 0.8314 ± 0.038 | 0.8539 ± 0.041 | **0.9143 ± 0.013** | 0.1202 ± 0.015 | **0.1086 ± 0.008** |
| **Ensemble 3 (Current + Reg XGBoost)** | **0.8413 ± 0.042** | **0.8365 ± 0.042** | **0.8902 ± 0.073** | 0.7828 ± 0.081 | **0.8333 ± 0.046** | **0.8581 ± 0.040** | 0.9124 ± 0.014 | 0.1196 ± 0.016 | 0.1223 ± 0.016 |
| **Ensemble 4 (Current + SVM + XGB)** | 0.8380 ± 0.037 | 0.8334 ± 0.035 | 0.8841 ± 0.082 | **0.7828 ± 0.068** | 0.8314 ± 0.038 | 0.8539 ± 0.041 | 0.9135 ± 0.013 | **0.1194 ± 0.016** | 0.1219 ± 0.033 |

---

### Strategy B: Majority Voting (Discrete Hard Voting)

| Ensemble Configuration | Accuracy | Balanced Accuracy | Sensitivity (Recall) | Specificity | Precision | F1-Score | ROC-AUC | Brier Score (↓) | ECE (↓) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Ensemble 1 (Production: LR+RF+KNN)** | 0.8280 ± 0.033 | 0.8239 ± 0.035 | 0.8720 ± 0.062 | 0.7759 ± 0.091 | 0.8269 ± 0.049 | 0.8460 ± 0.030 | 0.8665 ± 0.029 | 0.1448 ± 0.027 | 0.1323 ± 0.033 |
| **Ensemble 2 (Current + SVM)** | 0.8380 ± 0.037 | 0.8334 ± 0.035 | 0.8841 ± 0.082 | 0.7828 ± 0.068 | 0.8314 ± 0.038 | 0.8539 ± 0.041 | **0.8670 ± 0.030** | 0.1431 ± 0.028 | 0.1389 ± 0.032 |
| **Ensemble 3 (Current + Reg XGBoost)** | **0.8446 ± 0.042** | **0.8402 ± 0.041** | **0.8902 ± 0.073** | **0.7902 ± 0.079** | **0.8378 ± 0.045** | **0.8606 ± 0.040** | 0.8658 ± 0.030 | 0.1451 ± 0.030 | 0.1405 ± 0.043 |
| **Ensemble 4 (Current + SVM + XGB)** | 0.8347 ± 0.039 | 0.8305 ± 0.038 | 0.8780 ± 0.079 | 0.7831 ± 0.077 | 0.8312 ± 0.043 | 0.8509 ± 0.041 | 0.8669 ± 0.031 | **0.1429 ± 0.031** | 0.1468 ± 0.040 |

---

## 4. Key Comparative Insights

1. **Mean Predicted Probability Strongly Outperforms Majority Voting**:
   - Across all four ensembles, probability averaging (Strategy A) achieved higher ROC-AUC (**~0.913 vs ~0.867**), lower Brier scores (**~0.120 vs ~0.144**), and lower Expected Calibration Error (ECE) than discrete majority vote counting.
   - This validates CardioScan's current design of displaying averaged probabilities to patients, as averaging continuous outputs preserves confidence margins.
2. **Current Production Ensemble Holds Up Well**:
   - The current production ensemble (LR + RF + KNN) achieves **83.46% accuracy**, **0.9128 ROC-AUC**, and **88.41% sensitivity** under probability averaging.
3. **Marginal Incremental Gains from Ensembling Additional Models**:
   - Adding SVM (Ensemble 2) slightly improves accuracy to **83.80%** (+0.34%), lowers ECE to **0.1086** (best calibration), and marginally raises ROC-AUC to **0.9143**.
   - Adding regularized XGBoost (Ensemble 3) slightly improves accuracy to **84.13%** (+0.67%) and sensitivity to **89.02%** (+0.61%).
   - All variations fall within **±1 standard deviation** (which ranges between ±3.5% and ±4.2% across folds).
   - **Conclusion**: The empirical evidence does **not** indicate a decisive winner.

---

## 5. Limitations & Recommendations

1. **Sample Size Constraint**: $N=302$ unique patients means that individual patient classifications in a fold shift fold accuracy by ~1.6%. Observed differences between ensembles (0.3% to 0.7%) are smaller than the fold-to-fold standard deviations (~3.5% to 4.2%).
2. **Clinical Safety**: Offline retrospective validation on 302 historical patients cannot establish clinical diagnostic safety or performance across broader hospital populations.
3. **Recommendation**:
   - **Ensemble 2 (Current + SVM)** represents the most practical candidate for further exploration: it improves calibration error (ECE 0.1086), slightly improves ROC-AUC (0.9143), and uses `scikit-learn` (already installed in production), requiring zero external dependencies.
   - **Ensemble 3 (Current + Regularized XGBoost)** offers competitive sensitivity (89.0%), but introduces an extra dependency (`xgboost`) and requires strict regularization tuning to prevent small-sample overfitting.
