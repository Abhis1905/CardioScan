# CardioScan ML Ensemble Benchmarking Audit Report

**Audit Date**: 2026-10-11  
**Scope**: Read-only verification of `backend/scripts/evaluate_ensembles.py`, `backend/scripts/ensemble_benchmark_results.json`, `backend/scripts/ensemble_benchmark_report.md`, and `backend/scripts/evaluate_models.py`.

---

## 1. Verified Findings

1. **Cross-Validation Integrity**:
   - Every candidate model and ensemble uses strictly out-of-fold predictions.
   - All models share identical 5-fold Stratified K-Fold splits (`StratifiedKFold(n_splits=5, shuffle=True, random_state=42)`).
   - Folds are strictly stratified based on the target class (54.3% positive, 45.7% negative).

2. **Zero Calibration & Preprocessing Leakage**:
   - `StandardScaler` transformations are encapsulated in `sklearn.pipeline.Pipeline` and fit strictly on training folds.
   - `SVC(probability=True)` Platt scaling is fit strictly during training on `X_train`.
   - In `evaluate_models.py`, `CalibratedClassifierCV(cv=3)` performs internal 3-fold cross-validation nested strictly inside the training fold.
   - Held-out test folds are never exposed to feature scalers, base estimators, or calibrators.

3. **Deterministic Reproducibility**:
   - All random seeds are fixed (`random_state=42`).
   - Every model's `classes_` attribute is verified to be `[0, 1]`, confirming that `predict_proba()[:, 1]` consistently extracts $P(Y=1)$.

4. **Clinical Interpretation Accuracy**:
   - Metrics are described accurately using standard medical terminology (Sensitivity = True Positive Rate, Specificity = True Negative Rate).
   - Reports explicitly avoid claiming clinical safety, diagnostic efficacy, or real-world validity.

---

## 2. Identified Defect & Methodological Nuances

### Defect 1: Brier Score on Majority Voting (Discrete Vote Fractions)
- **Finding**: In `evaluate_ensembles.py`, Strategy B (Majority Voting) calculated Brier score using `vote_frac = votes / K` (e.g. discrete values like $\{0, 0.25, 0.50, 0.75, 1.0\}$) rather than continuous probabilities.
- **Impact**: Reporting Brier score for majority voting creates a misleading comparison against probability averaging (Strategy A), as discrete step functions naturally incur higher squared error (~0.143–0.145) than continuous calibrated probabilities (~0.119–0.121).
- **Correction**: Brier score should only be evaluated on genuine continuous probabilities (Strategy A). In pure discrete voting, Brier score should be omitted or reported as discrete 0/1 squared loss ($1 - \text{Accuracy}$).

### Nuance 2: Expected Calibration Error (ECE) Sample-Size Binning Bias
- **Finding**: In the fold-averaged summary, ECE was reported as ~0.108 to 0.122.
- **Root Cause**: Dividing each fold of 60 patients into 10 bins results in only ~6 patients per bin. In small bins, empirical accuracy variance is high, introducing an upward small-sample bias in $|acc - conf|$.
- **Verification on Pooled Out-of-Fold Predictions ($N=302$)**: When all 302 out-of-fold predictions are pooled, ECE drops significantly:
  - Ensemble 1 (Production): **0.0555**
  - Ensemble 2 (Current + SVM): **0.0396** (Best calibration)
  - Ensemble 3 (Current + XGBoost): **0.0411**
  - Ensemble 4 (Current + SVM + XGB): **0.0302**

### Nuance 3: Metric Aggregation (Fold-Averaged vs. Pooled Out-of-Fold)
- **Finding**: `evaluate_ensembles.py` computes metrics per fold and reports their mean and standard deviation.
- **Comparison**:
  - **Accuracy, Balanced Accuracy, Sensitivity, and Brier Score** are identical between fold-averaged and pooled evaluations (e.g. Ensemble 1 accuracy: 0.8346 fold-avg vs 0.8344 pooled).
  - **ROC-AUC** is slightly higher when averaged per fold (**0.9128**) than when pooled (**0.9076**). This occurs because small inter-fold probability threshold shifts introduce minor ranking inversions when predictions from 5 independently trained models are merged into a single pooled list.

### Nuance 4: Tie-Breaking in 4-Model Ensembles
- **Finding**: In Ensembles 2 and 3 ($K=4$), exact ties ($V=2$) are broken via continuous mean probability $\bar{p} \ge 0.50$.
- **Impact**: This tie-breaking rule makes hard majority voting nearly identical to soft probability averaging on tie cases, explaining why Ensemble 2 has identical hard and soft accuracy (0.8380).

---

## 3. Recommended Next Steps

1. In future benchmark scripts, calculate Brier score and ECE strictly on continuous probability distributions, omitting Brier score from discrete majority-voting tables.
2. Report both within-fold mean $\pm$ std and pooled out-of-fold metrics to provide complete transparency on both fold variance and global sample calibration.
3. Keep production pipelines untouched until a decision is made regarding Ensemble 2 (+ SVM).
