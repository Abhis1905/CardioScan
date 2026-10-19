import React, { useEffect, useState, useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  BarChart,
  Bar,
  Cell,
  ReferenceLine,
} from "recharts";
import {
  BarChart2,
  TrendingUp,
  Target,
  Layers,
  AlertCircle,
  ShieldCheck,
  CheckCircle,
  Info,
  Activity,
  HelpCircle,
  RefreshCw,
  FileText,
  Lock,
  ArrowUpRight,
  Database,
  Cpu,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useTheme } from "../context/ThemeContext";
import { getMetrics, getFeatureImportance, getDatasetStats, getEvaluationAudit } from "../api";
import ECGBackground from "../components/ECGBackground";

// Model color palette - Warm, accessible CardioScan clinical palette (no generic neon blue)
const MODEL_CONFIGS = {
  logistic_regression: {
    key: "logistic_regression",
    label: "Logistic Regression",
    abbr: "LR",
    color: "#35483E", // Deep forest green
    lightBg: "#E4EDE5",
    type: "Linear / L2 Regularized",
    description: "Standardized linear classification with L2 penalty, providing well-calibrated baseline probabilities.",
  },
  random_forest: {
    key: "random_forest",
    label: "Random Forest",
    abbr: "RF",
    color: "#2D7A58", // Clinical sage green
    lightBg: "#E0EFE7",
    type: "Ensemble (100 Trees)",
    description: "Non-linear decision tree ensemble capturing complex biomarker interactions.",
  },
  knn: {
    key: "knn",
    label: "K-Nearest Neighbors",
    abbr: "KNN",
    color: "#7A6F5D", // Warm taupe / earth
    lightBg: "#EDE8DF",
    type: "Instance-Based (k=5)",
    description: "Standardized distance-weighted nearest neighbors classification.",
  },
  svm: {
    key: "svm",
    label: "Support Vector Machine",
    abbr: "SVM",
    color: "#B35D52", // Restrained terracotta
    lightBg: "#FAF0EE",
    type: "Kernel RBF / Platt Scaled",
    description: "Radial Basis Function kernel with cross-validated Platt probability scaling.",
  },
  ensemble: {
    key: "ensemble",
    label: "Consensus Ensemble",
    abbr: "ENS",
    color: "#405B4D", // Deep sage-teal
    lightBg: "#E2EBE5",
    type: "Majority Voting (LR + RF + KNN)",
    description: "CardioScan's production consensus voting pipeline aggregating three distinct algorithmic families.",
  },
};

const FEATURE_METADATA = {
  cp: { name: "Chest Pain Type", unit: "0-3 scale", group: "Symptom" },
  thalach: { name: "Max Heart Rate Achieved", unit: "bpm", group: "Cardiac" },
  oldpeak: { name: "ST Depression (Exercise)", unit: "mm", group: "Cardiac" },
  ca: { name: "Major Vessels (Fluoroscopy)", unit: "0-4 count", group: "Diagnostic" },
  thal: { name: "Thalassemia Type", unit: "1-3 categorical", group: "Diagnostic" },
  age: { name: "Age", unit: "years", group: "Demographic" },
  exang: { name: "Exercise-Induced Angina", unit: "0/1 binary", group: "Symptom" },
  slope: { name: "Peak Exercise ST Slope", unit: "0-2 categorical", group: "Cardiac" },
  sex: { name: "Biological Sex", unit: "0/1 binary", group: "Demographic" },
  trestbps: { name: "Resting Blood Pressure", unit: "mmHg", group: "Vitals" },
  chol: { name: "Serum Cholesterol", unit: "mg/dL", group: "Metabolic" },
  restecg: { name: "Resting ECG Results", unit: "0-2 categorical", group: "Cardiac" },
  fbs: { name: "Fasting Blood Sugar > 120", unit: "0/1 binary", group: "Metabolic" },
};

function formatPercent(value, decimals = 1) {
  if (value == null || isNaN(value)) return "—";
  return `${(Number(value) * 100).toFixed(decimals)}%`;
}

function formatScore(value, decimals = 3) {
  if (value == null || isNaN(value)) return "—";
  return Number(value).toFixed(decimals);
}

function getTprAtFpr(rocCurve, targetFpr) {
  if (!rocCurve || !Array.isArray(rocCurve.fpr) || !Array.isArray(rocCurve.tpr)) return null;
  const { fpr, tpr } = rocCurve;
  const n = Math.min(fpr.length, tpr.length);
  if (n === 0) return null;
  if (targetFpr <= fpr[0]) return tpr[0];
  if (targetFpr >= fpr[n - 1]) return tpr[n - 1];

  for (let i = 1; i < n; i++) {
    if (fpr[i] >= targetFpr) {
      const f0 = fpr[i - 1];
      const f1 = fpr[i];
      const t0 = tpr[i - 1];
      const t1 = tpr[i];
      if (f1 === f0) return t1;
      const alpha = (targetFpr - f0) / (f1 - f0);
      return +(t0 + alpha * (t1 - t0)).toFixed(4);
    }
  }
  return tpr[n - 1];
}

export default function MetricsPage() {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const isDark = Boolean(theme?.dark);
  const isRTL = i18n.dir ? i18n.dir() === "rtl" : document.documentElement.dir === "rtl";

  const [metrics, setMetrics] = useState(null);
  const [featureImp, setFeatureImp] = useState({});
  const [datasetStats, setDatasetStats] = useState(null);
  const [evaluationAudit, setEvaluationAudit] = useState(null);
  const [activeModel, setActiveModel] = useState("logistic_regression");
  const [evalMode, setEvalMode] = useState("cv5"); // "cv5" (5-Fold CV) or "holdout" (20% test partition)
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [mRes, dsRes, auditRes, rfRes, lrRes, svmRes] = await Promise.allSettled([
        getMetrics(),
        getDatasetStats(),
        getEvaluationAudit(),
        getFeatureImportance("random_forest"),
        getFeatureImportance("logistic_regression"),
        getFeatureImportance("svm"),
      ]);

      if (mRes.status === "fulfilled" && mRes.value?.data) {
        setMetrics(mRes.value.data);
      } else {
        throw new Error("Could not load primary model metrics.");
      }

      if (dsRes.status === "fulfilled" && dsRes.value?.data) {
        setDatasetStats(dsRes.value.data);
      }

      if (auditRes.status === "fulfilled" && auditRes.value?.data) {
        setEvaluationAudit(auditRes.value.data);
      }

      const imp = {};
      if (rfRes.status === "fulfilled" && rfRes.value?.data) imp.random_forest = rfRes.value.data;
      if (lrRes.status === "fulfilled" && lrRes.value?.data) imp.logistic_regression = lrRes.value.data;
      if (svmRes.status === "fulfilled" && svmRes.value?.data) imp.svm = svmRes.value.data;
      setFeatureImp(imp);
    } catch (err) {
      console.error("Failed to load metrics data:", err);
      setLoadError(err.message || "Unable to connect to evaluation backend.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Compute active model metrics depending on evaluation mode
  const activeMetrics = useMemo(() => {
    if (evalMode === "cv5") {
      // Offline 5-fold cross validation benchmark (leakage-safe on 302 unique patients)
      if (activeModel === "ensemble") {
        const ensData = evaluationAudit?.ensemble?.ensembles?.["Ensemble 1 (Production: LR + RF + KNN)"];
        const summary = ensData?.mean_probability?.summary;
        return {
          name: "Consensus Ensemble",
          accuracy: summary?.accuracy?.mean ?? 0.8346,
          accuracy_std: summary?.accuracy?.std ?? 0.0353,
          sensitivity: summary?.sensitivity?.mean ?? 0.8841,
          sensitivity_std: summary?.sensitivity?.std ?? 0.0676,
          specificity: summary?.specificity?.mean ?? 0.7757,
          specificity_std: summary?.specificity?.std ?? 0.0792,
          precision: summary?.precision?.mean ?? 0.8276,
          precision_std: summary?.precision?.std ?? 0.0447,
          f1: summary?.f1_score?.mean ?? 0.8523,
          f1_std: summary?.f1_score?.std ?? 0.0343,
          auc: summary?.roc_auc?.mean ?? 0.9128,
          auc_std: summary?.roc_auc?.std ?? 0.0143,
          sampleCount: 302,
          foldCount: 5,
          basisLabel: t("metrics_page.cv_badge", "5-Fold Cross-Validation"),
          hasConfusionMatrix: false,
        };
      }

      const modelKeyMap = {
        logistic_regression: "Logistic Regression",
        random_forest: "Random Forest (100 trees)",
        knn: "K-Nearest Neighbors (k=5)",
        svm: "Support Vector Machine (RBF)",
      };
      const auditModelName = modelKeyMap[activeModel] || "Logistic Regression";
      const bench = evaluationAudit?.benchmark?.results?.[auditModelName]?.summary;

      // Fallback to verified report findings if backend audit response is pending
      const fallbackBench = {
        logistic_regression: { acc: 0.8312, acc_std: 0.028, sens: 0.8655, sens_std: 0.099, spec: 0.7894, spec_std: 0.09, prec: 0.838, prec_std: 0.051, f1: 0.8454, f1_std: 0.036, auc: 0.9045, auc_std: 0.018 },
        random_forest: { acc: 0.8247, acc_std: 0.033, sens: 0.8536, sens_std: 0.073, spec: 0.7902, spec_std: 0.079, prec: 0.8326, prec_std: 0.043, f1: 0.8400, f1_std: 0.035, auc: 0.9073, auc_std: 0.011 },
        knn: { acc: 0.8081, acc_std: 0.027, sens: 0.8598, sens_std: 0.041, spec: 0.7466, spec_std: 0.059, prec: 0.8031, prec_std: 0.033, f1: 0.8295, f1_std: 0.024, auc: 0.8837, auc_std: 0.020 },
        svm: { acc: 0.8279, acc_std: 0.026, sens: 0.8780, sens_std: 0.084, spec: 0.7683, spec_std: 0.074, prec: 0.8223, prec_std: 0.038, f1: 0.8455, f1_std: 0.032, auc: 0.9074, auc_std: 0.018 },
      }[activeModel];

      return {
        name: MODEL_CONFIGS[activeModel]?.label,
        accuracy: bench?.accuracy?.mean ?? fallbackBench?.acc ?? 0.83,
        accuracy_std: bench?.accuracy?.std ?? fallbackBench?.acc_std ?? 0.028,
        sensitivity: bench?.sensitivity?.mean ?? fallbackBench?.sens ?? 0.86,
        sensitivity_std: bench?.sensitivity?.std ?? fallbackBench?.sens_std ?? 0.08,
        specificity: bench?.specificity?.mean ?? fallbackBench?.spec ?? 0.78,
        specificity_std: bench?.specificity?.std ?? fallbackBench?.spec_std ?? 0.08,
        precision: bench?.precision?.mean ?? fallbackBench?.prec ?? 0.83,
        precision_std: bench?.precision?.std ?? fallbackBench?.prec_std ?? 0.04,
        f1: bench?.f1_score?.mean ?? fallbackBench?.f1 ?? 0.84,
        f1_std: bench?.f1_score?.std ?? fallbackBench?.f1_std ?? 0.03,
        auc: bench?.roc_auc?.mean ?? fallbackBench?.auc ?? 0.905,
        auc_std: bench?.roc_auc?.std ?? fallbackBench?.auc_std ?? 0.018,
        sampleCount: 302,
        foldCount: 5,
        basisLabel: t("metrics_page.cv_badge", "5-Fold Cross-Validation"),
        hasConfusionMatrix: false,
      };
    } else {
      // Held-out test split (205 samples from 80/20 train/test partition of heart.csv)
      if (activeModel === "ensemble") {
        // Production Ensemble evaluation on X_test (majority vote across LR + RF + KNN)
        return {
          name: "Consensus Ensemble",
          accuracy: 0.8878,
          accuracy_std: null,
          sensitivity: 0.9417,
          sensitivity_std: null,
          specificity: 0.8333,
          specificity_std: null,
          precision: 0.8509,
          precision_std: null,
          f1: 0.8940,
          f1_std: null,
          auc: 0.9876,
          auc_std: null,
          confusion_matrix: [[85, 17], [6, 97]],
          sampleCount: 205,
          basisLabel: t("metrics_page.holdout_badge", "Test Partition (N=205)"),
          hasConfusionMatrix: true,
        };
      }

      const raw = metrics?.[activeModel] || {};
      const cm = raw.confusion_matrix;
      let specificity = null;
      if (cm && cm.length === 2 && cm[0]?.length === 2) {
        const tn = cm[0][0];
        const fp = cm[0][1];
        const totalNeg = tn + fp;
        if (totalNeg > 0) specificity = +(tn / totalNeg).toFixed(4);
      }

      return {
        name: raw.name || MODEL_CONFIGS[activeModel]?.label,
        accuracy: raw.accuracy,
        accuracy_std: null,
        sensitivity: raw.recall, // Recall = Sensitivity for positive class
        sensitivity_std: null,
        specificity: specificity,
        specificity_std: null,
        precision: raw.precision,
        precision_std: null,
        f1: raw.f1,
        f1_std: null,
        auc: raw.auc,
        auc_std: null,
        confusion_matrix: cm,
        roc_curve: raw.roc_curve,
        sampleCount: cm ? cm[0][0] + cm[0][1] + cm[1][0] + cm[1][1] : 205,
        basisLabel: t("metrics_page.holdout_badge", "Test Partition (N=205)"),
        hasConfusionMatrix: Boolean(cm),
      };
    }
  }, [evalMode, activeModel, metrics, evaluationAudit, t]);

  // Comparison table items across all models
  const comparisonItems = useMemo(() => {
    const modelKeys = ["logistic_regression", "random_forest", "knn", "svm", "ensemble"];
    if (evalMode === "cv5") {
      return modelKeys.map((key) => {
        const cfg = MODEL_CONFIGS[key];
        if (key === "ensemble") {
          return {
            key,
            label: cfg.label,
            color: cfg.color,
            accuracy: 0.8346,
            accuracy_std: 0.0353,
            sensitivity: 0.8841,
            specificity: 0.7757,
            precision: 0.8276,
            f1: 0.8523,
            auc: 0.9128,
            type: "3-Model Soft Voting",
          };
        }
        const data = {
          logistic_regression: { acc: 0.8312, std: 0.028, sens: 0.8655, spec: 0.7894, prec: 0.838, f1: 0.8454, auc: 0.9045 },
          random_forest: { acc: 0.8247, std: 0.033, sens: 0.8536, spec: 0.7902, prec: 0.8326, f1: 0.8400, auc: 0.9073 },
          knn: { acc: 0.8081, std: 0.027, sens: 0.8598, spec: 0.7466, prec: 0.8031, f1: 0.8295, auc: 0.8837 },
          svm: { acc: 0.8279, std: 0.026, sens: 0.8780, spec: 0.7683, prec: 0.8223, f1: 0.8455, auc: 0.9074 },
        }[key];
        return {
          key,
          label: cfg.label,
          color: cfg.color,
          accuracy: data.acc,
          accuracy_std: data.std,
          sensitivity: data.sens,
          specificity: data.spec,
          precision: data.prec,
          f1: data.f1,
          auc: data.auc,
          type: "5-Fold CV (N=302)",
        };
      });
    } else {
      // Held-out test split
      return modelKeys.map((key) => {
        const cfg = MODEL_CONFIGS[key];
        if (key === "ensemble") {
          return {
            key,
            label: cfg.label,
            color: cfg.color,
            accuracy: 0.8878,
            sensitivity: 0.9417,
            specificity: 0.8333,
            precision: 0.8509,
            f1: 0.8940,
            auc: 0.9876,
            type: "Voting Ensemble (N=205)",
          };
        }
        const m = metrics?.[key] || {};
        let spec = null;
        if (m.confusion_matrix) {
          const tn = m.confusion_matrix[0][0];
          const fp = m.confusion_matrix[0][1];
          if (tn + fp > 0) spec = +(tn / (tn + fp)).toFixed(4);
        }
        return {
          key,
          label: cfg.label,
          color: cfg.color,
          accuracy: m.accuracy ?? null,
          sensitivity: m.recall ?? null,
          specificity: spec,
          precision: m.precision ?? null,
          f1: m.f1 ?? null,
          auc: m.auc ?? null,
          type: "Test Split (N=205)",
        };
      });
    }
  }, [evalMode, metrics]);

  // ROC data interpolation across 51 points
  const rocGridData = useMemo(() => {
    const grid = Array.from({ length: 51 }, (_, i) => +(i / 50).toFixed(2));
    return grid.map((fpr) => {
      const point = { fpr, chance: fpr };
      if (metrics?.logistic_regression?.roc_curve) {
        point.lr = getTprAtFpr(metrics.logistic_regression.roc_curve, fpr);
      }
      if (metrics?.random_forest?.roc_curve) {
        point.rf = getTprAtFpr(metrics.random_forest.roc_curve, fpr);
      }
      if (metrics?.knn?.roc_curve) {
        point.knn = getTprAtFpr(metrics.knn.roc_curve, fpr);
      }
      if (metrics?.svm?.roc_curve) {
        point.svm = getTprAtFpr(metrics.svm.roc_curve, fpr);
      }
      return point;
    });
  }, [metrics]);

  // Feature importance data
  const fiData = useMemo(() => {
    const modelTarget = activeModel === "ensemble" ? "random_forest" : activeModel;
    const rawFi = featureImp[modelTarget] || featureImp["random_forest"] || {};
    return Object.entries(rawFi)
      .map(([key, val]) => {
        const meta = FEATURE_METADATA[key] || { name: key, unit: "" };
        return {
          key,
          name: meta.name,
          unit: meta.unit,
          value: +(val * 100).toFixed(1),
        };
      })
      .sort((a, b) => b.value - a.value);
  }, [activeModel, featureImp]);

  if (loading) {
    return (
      <div className="w-full min-h-[calc(100vh-4rem)] bg-[#F7F5F0] text-[#35483E] py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="h-10 w-64 bg-black/5 animate-pulse rounded-xl" />
          <div className="h-6 w-96 bg-black/5 animate-pulse rounded-lg" />
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-32 bg-black/5 animate-pulse rounded-2xl" />
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="h-72 bg-black/5 animate-pulse rounded-2xl" />
            <div className="h-72 bg-black/5 animate-pulse rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  if (loadError || !metrics) {
    return (
      <div className="w-full min-h-[calc(100vh-4rem)] bg-[#F7F5F0] text-[#35483E] flex items-center justify-center py-20 px-4">
        <div className="max-w-md w-full bg-white/90 border border-[#E5E0D6] rounded-2xl p-8 text-center space-y-4 shadow-sm">
          <div className="w-12 h-12 rounded-full bg-[#FAF0EE] text-[#B35D52] flex items-center justify-center mx-auto">
            <AlertCircle size={24} />
          </div>
          <h2 className="font-serif text-xl font-bold text-[#35483E]">Evaluation Server Unavailable</h2>
          <p className="text-xs sm:text-sm text-[#52665A]">
            {loadError || "Could not retrieve validation data from CardioScan API."}
          </p>
          <button
            onClick={fetchData}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#35483E] text-white text-xs font-semibold hover:bg-[#2D3F36] transition-colors shadow-sm"
          >
            <RefreshCw size={14} />
            <span>Retry Connection</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="w-full min-h-[calc(100vh-4rem)] relative selection:bg-[#E4EDE5] selection:text-[#35483E] transition-colors duration-300 bg-[#F7F5F0] text-[#35483E]"
      dir={isRTL ? "rtl" : "ltr"}
    >
      <ECGBackground />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-8 relative z-10">
        {/* ── Page Header ── */}
        <header className="space-y-3 scroll-mt-24">
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-[#52665A]">
            <div className="w-1.5 h-1.5 rounded-full bg-[#B35D52] animate-pulse" />
            <span>{t("metrics_page.badge", "Cardiovascular Machine Learning · Model Evaluation & Benchmarks")}</span>
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-normal text-[#35483E] tracking-tight leading-tight">
            {t("metrics_page.title_main", "Model Performance &")}{" "}
            <span className="italic font-serif text-[#B35D52]">
              {t("metrics_page.title_accent", "Evaluation Benchmarks")}
            </span>
          </h1>
          <p className="text-[#52665A] max-w-3xl text-xs sm:text-sm leading-relaxed">
            {t(
              "metrics_page.subtitle",
              "Review objective validation metrics, diagnostic discrimination curves, and biomarker attributions across CardioScan's candidate machine learning classifiers."
            )}
          </p>
        </header>

        {/* ── Healthcare Research Notice & Disclaimer Banner ── */}
        <section
          aria-label="Clinical Evaluation Notice"
          className="scroll-mt-24 rounded-2xl border border-[#D3DFD5] dark:border-[#373C40] bg-[#E4EDE5]/80 dark:bg-[#202326] p-4 sm:p-5 text-[#2D7A58] dark:text-[#789580] flex flex-col sm:flex-row items-start sm:items-center gap-3.5 shadow-xs"
        >
          <div className="p-2 rounded-xl bg-white/70 dark:bg-[#282C30] border border-[#D3DFD5] dark:border-[#373C40] text-[#2D7A58] dark:text-[#789580] shrink-0">
            <ShieldCheck size={20} className="text-[#2D7A58] dark:text-[#789580]" />
          </div>
          <div className="space-y-1 text-xs sm:text-sm leading-relaxed text-[#35483E] dark:text-[#F2F3F3]">
            <p className="font-bold font-serif text-sm text-[#2D7A58] dark:text-[#789580]">
              {t("metrics_page.disclaimer_title", "Research & Educational Tool Notice")}
            </p>
            <p className="text-[#52665A] dark:text-[#B2B7BB] text-xs">
              {t(
                "metrics_page.disclaimer_text",
                "CardioScan is strictly an educational tool designed to promote cardiovascular health literacy and demonstrate clinical machine learning methods. The statistical metrics shown here measure retrospective discrimination on benchmark cohorts and do not constitute an individualized patient risk assessment, a clinical diagnosis, or a medical device clearance."
              )}
            </p>
          </div>
        </section>

        {/* ── Evaluation Protocol & Validation Basis Switcher ── */}
        <section className="scroll-mt-24 bg-white/90 border border-[#E5E0D6] rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[#52665A]">
                Validation Protocol & Evaluation Basis
              </p>
              <p className="text-xs text-[#8A9990] mt-0.5">
                Toggle between leakage-safe cross-validation and the held-out test split
              </p>
            </div>

            <div className="inline-flex p-1 rounded-xl bg-[#FAF8F5] border border-[#E5E0D6] text-xs font-medium">
              <button
                type="button"
                onClick={() => setEvalMode("cv5")}
                className={`px-3.5 py-1.5 rounded-lg transition-all ${
                  evalMode === "cv5"
                    ? "bg-[#35483E] text-white shadow-xs"
                    : "text-[#52665A] hover:text-[#35483E] hover:bg-white"
                }`}
              >
                {t("metrics_page.tab_cv5", "5-Fold Cross-Validation (N=302 Unique Patients)")}
              </button>
              <button
                type="button"
                onClick={() => setEvalMode("holdout")}
                className={`px-3.5 py-1.5 rounded-lg transition-all ${
                  evalMode === "holdout"
                    ? "bg-[#35483E] text-white shadow-xs"
                    : "text-[#52665A] hover:text-[#35483E] hover:bg-white"
                }`}
              >
                {t("metrics_page.tab_holdout", "Held-Out Test Split (N=205, 80/20 Production Cache)")}
              </button>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[#FAF8F5] border border-[#EFECE6] text-xs text-[#52665A] flex items-start gap-2.5">
            <Info size={15} className="text-[#35483E] shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              {evalMode === "cv5" ? (
                <span>
                  <strong>Scientifically Rigorous Protocol:</strong>{" "}
                  {t(
                    "metrics_page.cv_note",
                    "Evaluated using Stratified 5-Fold Cross-Validation with strict per-fold preprocessing pipelines on deduplicated Cleveland Clinic records (302 distinct patient records, zero cross-fold leakage)."
                  )}
                </span>
              ) : (
                <span>
                  <strong>Production Inference Partition:</strong>{" "}
                  {t(
                    "metrics_page.holdout_note",
                    "Evaluated on the fixed 20% test partition of the production training cache. Note: Due to historical duplication in the raw 1,025-row file, high-capacity tree models exhibit duplicate memorization on un-deduplicated splits."
                  )}
                </span>
              )}
            </div>
          </div>
        </section>

        {/* ── Algorithm Selection Bar ── */}
        <section className="scroll-mt-24 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#52665A] uppercase tracking-wider">
              Select Evaluated Algorithm
            </span>
            <span className="text-xs font-mono text-[#8A9990]">5 Architectures Available</span>
          </div>

          <div className="flex gap-2.5 flex-wrap">
            {Object.values(MODEL_CONFIGS).map((cfg) => {
              const active = activeModel === cfg.key;
              return (
                <button
                  key={cfg.key}
                  type="button"
                  onClick={() => setActiveModel(cfg.key)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all duration-200 border ${
                    active
                      ? "bg-[#35483E] text-white border-[#35483E] shadow-sm ring-1 ring-[#35483E]/20"
                      : "bg-white/85 text-[#52665A] border-[#E5E0D6] hover:bg-[#E4EDE5]/60 hover:text-[#35483E]"
                  }`}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: active ? "#FAF5F0" : cfg.color }}
                  />
                  <span className="font-semibold">{cfg.label}</span>
                  <span className="text-[10px] opacity-75 font-mono">({cfg.abbr})</span>
                </button>
              );
            })}
          </div>

          <p className="text-xs text-[#52665A] italic">
            {MODEL_CONFIGS[activeModel]?.description}
          </p>
        </section>

        {/* ── Executive Performance KPI Cards (6 Key Metrics) ── */}
        <section
          aria-label="Key Performance Indicators"
          className="scroll-mt-24 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5 sm:gap-4"
        >
          {/* Card 1: Accuracy */}
          <div className="bg-white/90 border border-[#E5E0D6] rounded-2xl p-4 sm:p-5 shadow-xs hover:border-[#D5D0C6] transition-all">
            <div className="flex items-center justify-between text-xs text-[#52665A] uppercase font-semibold mb-1">
              <span>{t("metrics_page.kpi.accuracy", "Accuracy")}</span>
              <Activity size={13} className="text-[#35483E]" />
            </div>
            <p className="font-serif text-2xl sm:text-3xl font-bold text-[#35483E]">
              {formatPercent(activeMetrics.accuracy)}
            </p>
            {activeMetrics.accuracy_std != null && (
              <p className="text-[10px] font-mono text-[#8A9990] mt-0.5">
                ± {(activeMetrics.accuracy_std * 100).toFixed(1)}% (5 folds)
              </p>
            )}
            <p className="text-[11px] text-[#8A9990] mt-1.5 leading-snug">
              {t("metrics_page.kpi.accuracy_desc", "Correct classifications / total")}
            </p>
          </div>

          {/* Card 2: Sensitivity (Recall) */}
          <div className="bg-white/90 border border-[#E5E0D6] rounded-2xl p-4 sm:p-5 shadow-xs hover:border-[#D5D0C6] transition-all">
            <div className="flex items-center justify-between text-xs text-[#52665A] uppercase font-semibold mb-1">
              <span className="text-[#2D7A58]">{t("metrics_page.kpi.sensitivity", "Sensitivity")}</span>
              <Target size={13} className="text-[#2D7A58]" />
            </div>
            <p className="font-serif text-2xl sm:text-3xl font-bold text-[#2D7A58]">
              {formatPercent(activeMetrics.sensitivity)}
            </p>
            {activeMetrics.sensitivity_std != null && (
              <p className="text-[10px] font-mono text-[#8A9990] mt-0.5">
                ± {(activeMetrics.sensitivity_std * 100).toFixed(1)}% (5 folds)
              </p>
            )}
            <p className="text-[11px] text-[#8A9990] mt-1.5 leading-snug">
              {t("metrics_page.kpi.sensitivity_desc", "True positive detection rate")}
            </p>
          </div>

          {/* Card 3: Specificity */}
          <div className="bg-white/90 border border-[#E5E0D6] rounded-2xl p-4 sm:p-5 shadow-xs hover:border-[#D5D0C6] transition-all">
            <div className="flex items-center justify-between text-xs text-[#52665A] uppercase font-semibold mb-1">
              <span>{t("metrics_page.kpi.specificity", "Specificity")}</span>
              <ShieldCheck size={13} className="text-[#35483E]" />
            </div>
            <p className="font-serif text-2xl sm:text-3xl font-bold text-[#35483E]">
              {formatPercent(activeMetrics.specificity)}
            </p>
            {activeMetrics.specificity_std != null && (
              <p className="text-[10px] font-mono text-[#8A9990] mt-0.5">
                ± {(activeMetrics.specificity_std * 100).toFixed(1)}% (5 folds)
              </p>
            )}
            <p className="text-[11px] text-[#8A9990] mt-1.5 leading-snug">
              {t("metrics_page.kpi.specificity_desc", "True negative healthy identification")}
            </p>
          </div>

          {/* Card 4: Precision (PPV) */}
          <div className="bg-white/90 border border-[#E5E0D6] rounded-2xl p-4 sm:p-5 shadow-xs hover:border-[#D5D0C6] transition-all">
            <div className="flex items-center justify-between text-xs text-[#52665A] uppercase font-semibold mb-1">
              <span>{t("metrics_page.kpi.precision", "Precision")}</span>
              <CheckCircle size={13} className="text-[#35483E]" />
            </div>
            <p className="font-serif text-2xl sm:text-3xl font-bold text-[#35483E]">
              {formatPercent(activeMetrics.precision)}
            </p>
            {activeMetrics.precision_std != null && (
              <p className="text-[10px] font-mono text-[#8A9990] mt-0.5">
                ± {(activeMetrics.precision_std * 100).toFixed(1)}% (5 folds)
              </p>
            )}
            <p className="text-[11px] text-[#8A9990] mt-1.5 leading-snug">
              {t("metrics_page.kpi.precision_desc", "Positive predictive value")}
            </p>
          </div>

          {/* Card 5: F1-Score */}
          <div className="bg-white/90 border border-[#E5E0D6] rounded-2xl p-4 sm:p-5 shadow-xs hover:border-[#D5D0C6] transition-all">
            <div className="flex items-center justify-between text-xs text-[#52665A] uppercase font-semibold mb-1">
              <span>{t("metrics_page.kpi.f1", "F1-Score")}</span>
              <Layers size={13} className="text-[#35483E]" />
            </div>
            <p className="font-serif text-2xl sm:text-3xl font-bold text-[#35483E]">
              {formatScore(activeMetrics.f1, 3)}
            </p>
            {activeMetrics.f1_std != null && (
              <p className="text-[10px] font-mono text-[#8A9990] mt-0.5">
                ± {activeMetrics.f1_std.toFixed(3)} (5 folds)
              </p>
            )}
            <p className="text-[11px] text-[#8A9990] mt-1.5 leading-snug">
              {t("metrics_page.kpi.f1_desc", "Harmonic balance of precision & recall")}
            </p>
          </div>

          {/* Card 6: ROC-AUC */}
          <div className="bg-white/90 border border-[#E5E0D6] rounded-2xl p-4 sm:p-5 shadow-xs hover:border-[#D5D0C6] transition-all">
            <div className="flex items-center justify-between text-xs text-[#52665A] uppercase font-semibold mb-1">
              <span className="text-[#B35D52]">{t("metrics_page.kpi.roc_auc", "ROC-AUC")}</span>
              <TrendingUp size={13} className="text-[#B35D52]" />
            </div>
            <p className="font-serif text-2xl sm:text-3xl font-bold text-[#B35D52]">
              {formatScore(activeMetrics.auc, 3)}
            </p>
            {activeMetrics.auc_std != null && (
              <p className="text-[10px] font-mono text-[#8A9990] mt-0.5">
                ± {activeMetrics.auc_std.toFixed(3)} (5 folds)
              </p>
            )}
            <p className="text-[11px] text-[#8A9990] mt-1.5 leading-snug">
              {t("metrics_page.kpi.roc_auc_desc", "Threshold-independent discrimination")}
            </p>
          </div>
        </section>

        {/* ── Section 2: Diagnostic Confusion Matrix & Screening Analysis ── */}
        <section className="scroll-mt-24 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left: Confusion Matrix (6 cols) */}
          <div className="lg:col-span-6 bg-white/90 border border-[#E5E0D6] rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#E5E0D6] pb-3">
              <div className="flex items-center gap-2">
                <Target size={16} className="text-[#35483E]" />
                <h2 className="font-serif text-base sm:text-lg font-bold text-[#35483E]">
                  {t("metrics_page.cm.title", "Diagnostic Confusion Matrix")}
                </h2>
              </div>
              <span className="text-xs font-mono text-[#8A9990]">
                {evalMode === "cv5" ? "Pooled CV (N=302)" : "Held-Out Test (N=205)"}
              </span>
            </div>

            {/* Matrix Component */}
            {activeMetrics.confusion_matrix ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-center">
                  {/* True Negative */}
                  <div className="p-4 rounded-xl bg-[#E4EDE5] border border-[#D3DFD5]">
                    <span className="text-xs font-semibold text-[#2D7A58] block mb-1">
                      {t("metrics_page.cm.tn", "True Negative (TN)")}
                    </span>
                    <span className="font-serif text-3xl font-bold text-[#2D7A58]">
                      {activeMetrics.confusion_matrix[0][0]}
                    </span>
                    <p className="text-[11px] text-[#52665A] mt-1">
                      {t("metrics_page.cm.tn_desc", "Correctly identified as no disease")}
                    </p>
                  </div>

                  {/* False Positive */}
                  <div className="p-4 rounded-xl bg-[#FAF0EE] border border-[#F0D5D1]">
                    <span className="text-xs font-semibold text-[#B35D52] block mb-1">
                      {t("metrics_page.cm.fp", "False Positive (FP)")}
                    </span>
                    <span className="font-serif text-3xl font-bold text-[#B35D52]">
                      {activeMetrics.confusion_matrix[0][1]}
                    </span>
                    <p className="text-[11px] text-[#52665A] mt-1">
                      {t("metrics_page.cm.fp_desc", "False alarm on healthy patient")}
                    </p>
                  </div>

                  {/* False Negative */}
                  <div className="p-4 rounded-xl bg-[#FAF0EE] border border-[#F0D5D1]">
                    <span className="text-xs font-semibold text-[#B35D52] block mb-1">
                      {t("metrics_page.cm.fn", "False Negative (FN)")}
                    </span>
                    <span className="font-serif text-3xl font-bold text-[#B35D52]">
                      {activeMetrics.confusion_matrix[1][0]}
                    </span>
                    <p className="text-[11px] text-[#B35D52] font-medium mt-1">
                      {t("metrics_page.cm.fn_desc", "Missed disease risk (high clinical risk)")}
                    </p>
                  </div>

                  {/* True Positive */}
                  <div className="p-4 rounded-xl bg-[#E4EDE5] border border-[#D3DFD5]">
                    <span className="text-xs font-semibold text-[#2D7A58] block mb-1">
                      {t("metrics_page.cm.tp", "True Positive (TP)")}
                    </span>
                    <span className="font-serif text-3xl font-bold text-[#2D7A58]">
                      {activeMetrics.confusion_matrix[1][1]}
                    </span>
                    <p className="text-[11px] text-[#52665A] mt-1">
                      {t("metrics_page.cm.tp_desc", "Correctly detected disease risk")}
                    </p>
                  </div>
                </div>

                <div className="flex justify-between items-center text-xs text-[#8A9990] pt-2 border-t border-[#E5E0D6]">
                  <span>Total Tested: {activeMetrics.sampleCount} patients</span>
                  <span>
                    Disease Prevalence:{" "}
                    {(
                      ((activeMetrics.confusion_matrix[1][0] + activeMetrics.confusion_matrix[1][1]) /
                        activeMetrics.sampleCount) *
                      100
                    ).toFixed(1)}
                    %
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-6 rounded-xl bg-[#FAF8F5] border border-[#E5E0D6] text-center space-y-2">
                <Info size={20} className="text-[#35483E] mx-auto" />
                <p className="text-sm font-semibold text-[#35483E]">
                  Cross-Validation Aggregate Summary
                </p>
                <p className="text-xs text-[#52665A] max-w-sm mx-auto">
                  In 5-fold cross-validation, predictions are generated across 5 separate held-out
                  folds. Switch to "Held-Out Test Split" above to view the fixed single-split 2x2
                  confusion matrix.
                </p>
              </div>
            )}

            <div className="p-3.5 rounded-xl bg-[#FAF8F5] border border-[#E5E0D6] text-xs text-[#52665A] leading-relaxed">
              <strong className="text-[#35483E]">Clinical Screening Consideration:</strong> In
              retrospective cardiovascular screening benchmarks, False Negatives indicate positive cases
              that were not flagged during computational scoring. Higher statistical sensitivity reduces the
              frequency of unflagged suspected cases in benchmark evaluations, though formal clinical
              efficacy requires prospective diagnostic workflows and licensed physician oversight.
            </div>
          </div>

          {/* Right: Biomarker Influence / Feature Importance (6 cols) */}
          <div className="lg:col-span-6 bg-white/90 border border-[#E5E0D6] rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#E5E0D6] pb-3">
              <div className="flex items-center gap-2">
                <Layers size={16} className="text-[#35483E]" />
                <h2 className="font-serif text-base sm:text-lg font-bold text-[#35483E]">
                  {t("metrics_page.fi.title", "Biomarker Influence & Feature Importance")}
                </h2>
              </div>
              <span className="text-xs font-mono text-[#8A9990]">13 Clinical Predictors</span>
            </div>

            <p className="text-xs text-[#52665A]">
              Relative attribution of physiological parameters in model predictions:
            </p>

            <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
              {fiData.map((item, idx) => {
                const isTop3 = idx < 3;
                return (
                  <div key={item.key} className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-medium text-[#35483E] flex items-center gap-1.5">
                        <span className="font-mono text-[10px] text-[#8A9990] w-4">{idx + 1}.</span>
                        <span>{item.name}</span>
                        <span className="text-[10px] text-[#8A9990] font-mono">({item.key})</span>
                      </span>
                      <span className="font-mono font-semibold text-[#35483E]">{item.value}%</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-[#E5E0D6]/60 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isTop3 ? "bg-[#35483E]" : "bg-[#2D7A58]"
                        }`}
                        style={{ width: `${Math.min(100, item.value * 3.5)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <p className="text-[11px] text-[#8A9990] pt-2 border-t border-[#E5E0D6] italic">
              {activeModel === "random_forest"
                ? t("metrics_page.fi.note_rf", "Attribution: Mean Gini impurity reduction across decision trees.")
                : activeModel === "logistic_regression"
                ? t("metrics_page.fi.note_lr", "Attribution: Normalized absolute standardized regression coefficients.")
                : activeModel === "svm"
                ? t("metrics_page.fi.note_svm", "Attribution: Permutation importance evaluated on validation folds.")
                : t("metrics_page.fi.note_knn", "Attribution: Reference tree-derived proxy (KNN computes no internal feature weights).")}
            </p>
          </div>
        </section>

        {/* ── Section 3: Comparative Analysis & Discrimination Curves ── */}
        <section className="scroll-mt-24 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left: Model Comparison Table (7 cols) */}
          <div className="lg:col-span-7 bg-white/90 border border-[#E5E0D6] rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#E5E0D6] pb-3">
              <div className="flex items-center gap-2">
                <BarChart2 size={16} className="text-[#35483E]" />
                <h2 className="font-serif text-base sm:text-lg font-bold text-[#35483E]">
                  {t("metrics_page.comparison.title", "Standardized Model Comparison")}
                </h2>
              </div>
              <span className="text-xs font-mono text-[#8A9990]">
                {evalMode === "cv5" ? "5-Fold CV (N=302)" : "Test Split (N=205)"}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#E5E0D6] text-[#52665A] uppercase tracking-wider font-semibold">
                    <th className="py-2.5 px-3">{t("metrics_page.comparison.table_model", "Algorithm")}</th>
                    <th className="py-2.5 px-2 text-right">{t("metrics_page.comparison.table_acc", "Accuracy")}</th>
                    <th className="py-2.5 px-2 text-right">{t("metrics_page.comparison.table_sens", "Sensitivity")}</th>
                    <th className="py-2.5 px-2 text-right">{t("metrics_page.comparison.table_spec", "Specificity")}</th>
                    <th className="py-2.5 px-2 text-right">{t("metrics_page.comparison.table_f1", "F1")}</th>
                    <th className="py-2.5 px-3 text-right">{t("metrics_page.comparison.table_auc", "ROC-AUC")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EFECE6]">
                  {comparisonItems.map((item) => {
                    const isSelected = activeModel === item.key;
                    return (
                      <tr
                        key={item.key}
                        onClick={() => setActiveModel(item.key)}
                        className={`cursor-pointer transition-colors ${
                          isSelected
                            ? "bg-[#E4EDE5]/60 font-semibold text-[#35483E]"
                            : "hover:bg-[#FAF8F5] text-[#52665A]"
                        }`}
                      >
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: item.color }}
                            />
                            <span>{item.label}</span>
                          </div>
                        </td>
                        <td className="py-3 px-2 text-right font-mono">
                          {formatPercent(item.accuracy)}
                        </td>
                        <td className="py-3 px-2 text-right font-mono text-[#2D7A58]">
                          {formatPercent(item.sensitivity)}
                        </td>
                        <td className="py-3 px-2 text-right font-mono">
                          {formatPercent(item.specificity)}
                        </td>
                        <td className="py-3 px-2 text-right font-mono">
                          {formatScore(item.f1, 3)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-[#B35D52]">
                          {formatScore(item.auc, 3)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="p-3.5 rounded-xl bg-[#FAF8F5] border border-[#E5E0D6] text-xs text-[#52665A] leading-relaxed">
              <strong>Key Finding:</strong> Under strict 5-fold cross-validation on deduplicated records,
              the top candidate models (Logistic Regression, Random Forest, SVM, and Consensus
              Ensemble) perform within ±1 standard deviation of one another (82.5% – 83.5%
              accuracy; ROC-AUC 0.905 – 0.913). Random Forest does not outperform simpler regularized
              models once training-test data leakage is prevented.
            </div>
          </div>

          {/* Right: ROC Curves (5 cols) */}
          <div className="lg:col-span-5 bg-white/90 border border-[#E5E0D6] rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#E5E0D6] pb-3">
              <div className="flex items-center gap-2">
                <TrendingUp size={16} className="text-[#35483E]" />
                <h2 className="font-serif text-base sm:text-lg font-bold text-[#35483E]">
                  {t("metrics_page.roc.title", "ROC Discrimination Curves")}
                </h2>
              </div>
              <span className="text-xs font-mono text-[#8A9990]">Sensitivity vs. FPR</span>
            </div>

            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={rocGridData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E0D6" />
                  <XAxis
                    dataKey="fpr"
                    domain={[0, 1]}
                    tick={{ fill: "#8A9990", fontSize: 10 }}
                    tickFormatter={(v) => Number(v).toFixed(1)}
                  />
                  <YAxis
                    domain={[0, 1]}
                    tick={{ fill: "#8A9990", fontSize: 10 }}
                    tickFormatter={(v) => Number(v).toFixed(1)}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#FFFFFF",
                      border: "1px solid #E5E0D6",
                      borderRadius: "12px",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
                      fontSize: "11px",
                      fontFamily: "monospace",
                    }}
                    formatter={(val, name) => [Number(val).toFixed(3), name]}
                    labelFormatter={(label) => `FPR: ${label}`}
                  />
                  <ReferenceLine
                    y={0}
                    stroke="#D5D0C6"
                    strokeDasharray="4 4"
                    label={{ value: "Chance", position: "insideBottomRight", fill: "#8A9990", fontSize: 9 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="chance"
                    name={t("metrics_page.roc.chance_line", "Random Chance")}
                    stroke="#C5BFB5"
                    strokeDasharray="4 4"
                    strokeWidth={1.5}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="lr"
                    name={`LR (AUC ${formatScore(evalMode === "cv5" ? 0.9045 : (metrics?.logistic_regression?.auc ?? 0.8787), 3)})`}
                    stroke={MODEL_CONFIGS.logistic_regression.color}
                    strokeWidth={activeModel === "logistic_regression" ? 3 : 1.75}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="rf"
                    name={`RF (AUC ${formatScore(evalMode === "cv5" ? 0.9073 : (metrics?.random_forest?.auc ?? 1.0), 3)})`}
                    stroke={MODEL_CONFIGS.random_forest.color}
                    strokeWidth={activeModel === "random_forest" ? 3 : 1.75}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="knn"
                    name={`KNN (AUC ${formatScore(evalMode === "cv5" ? 0.8837 : (metrics?.knn?.auc ?? 0.9486), 3)})`}
                    stroke={MODEL_CONFIGS.knn.color}
                    strokeWidth={activeModel === "knn" ? 3 : 1.75}
                    dot={false}
                  />
                  {metrics?.svm && (
                    <Line
                      type="monotone"
                      dataKey="svm"
                      name={`SVM (AUC ${formatScore(evalMode === "cv5" ? 0.9074 : (metrics?.svm?.auc ?? 0.9632), 3)})`}
                      stroke={MODEL_CONFIGS.svm.color}
                      strokeWidth={activeModel === "svm" ? 3 : 1.75}
                      dot={false}
                    />
                  )}
                  <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-2 pt-2 border-t border-[#E5E0D6] text-[11px] text-[#52665A] leading-relaxed">
              <p className="italic text-[#8A9990]">
                {t(
                  "metrics_page.roc.footer_note",
                  "Receiver Operating Characteristic (ROC) trajectories plotted from the held-out test partition (N=205). Area under the curve measures discrimination across decision thresholds."
                )}
              </p>
              <div className="p-2.5 rounded-lg bg-[#FAF8F5] border border-[#E5E0D6] text-[10px] text-[#52665A]">
                <strong>Suspicious AUC Investigation (RF AUC 1.000):</strong> In the un-deduplicated 80/20 held-out split of heart.csv (N=205), duplicate patient records shared between training and test sets produce artificial memorization (0 False Positives). When evaluated on the 302 unique patients with zero-leakage 5-fold cross-validation, Random Forest achieves an un-inflated, generalizable ROC-AUC of <strong>0.907 ± 0.011</strong>.
              </div>
            </div>
          </div>
        </section>

        {/* ── Section 4: Evaluation Methodology, Dataset Integrity & Clinical Boundaries ── */}
        <section
          aria-label="Evaluation Methodology & Dataset Limitations"
          className="scroll-mt-24 bg-white/90 border border-[#E5E0D6] rounded-2xl p-6 sm:p-8 shadow-xs space-y-6"
        >
          <div className="border-b border-[#E5E0D6] pb-4 space-y-1">
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-[#52665A]">
              <Database size={14} className="text-[#35483E]" />
              <span>Scientific Integrity & Methodological Transparency</span>
            </div>
            <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#35483E]">
              {t("metrics_page.methodology.title", "Evaluation Methodology, Dataset Integrity & Clinical Limitations")}
            </h2>
            <p className="text-xs sm:text-sm text-[#52665A]">
              {t("metrics_page.methodology.subtitle", "Scientific transparency regarding training data, duplicate records, and clinical boundaries.")}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Card 1: UCI Cleveland Retrospective Cohort */}
            <div className="p-5 rounded-xl bg-[#FAF8F5] border border-[#E5E0D6] space-y-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#E4EDE5] text-[#2D7A58] flex items-center justify-center">
                <FileText size={16} />
              </div>
              <h3 className="font-serif font-bold text-sm text-[#35483E]">
                {t("metrics_page.methodology.card1_title", "Retrospective Cohort & Biomarkers")}
              </h3>
              <p className="text-xs text-[#52665A] leading-relaxed">
                {t(
                  "metrics_page.methodology.card1_desc",
                  "Models were evaluated using 13 physiological parameters from the classic UCI Cleveland Clinic Foundation heart disease cohort (hemodynamics, metabolic panels, and stress ECG). Target prevalence in unique patients is 54.3% positive and 45.7% negative."
                )}
              </p>
            </div>

            {/* Card 2: The Duplicate Record Finding */}
            <div className="p-5 rounded-xl bg-[#FAF8F5] border border-[#E5E0D6] space-y-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#FAF0EE] text-[#B35D52] flex items-center justify-center">
                <AlertCircle size={16} />
              </div>
              <h3 className="font-serif font-bold text-sm text-[#35483E]">
                {t("metrics_page.methodology.card2_title", "The Duplicate Record Finding & Data Leakage")}
              </h3>
              <p className="text-xs text-[#52665A] leading-relaxed">
                {t(
                  "metrics_page.methodology.card2_desc",
                  "A critical dataset audit identified that the raw 1,025-row heart.csv dataset contains 723 duplicate copies of only 302 unique patients. When partitioned without deduplication, 97.1% of test rows are exact copies of training rows, artificially inflating Random Forest test accuracy to 98.5%. When evaluated with leakage-safe 5-fold cross-validation on unique patients, true generalization is ~82.5% across all models."
                )}
              </p>
            </div>

            {/* Card 3: Clinical Translation Boundaries */}
            <div className="p-5 rounded-xl bg-[#FAF8F5] border border-[#E5E0D6] space-y-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#E4EDE5] text-[#35483E] flex items-center justify-center">
                <ShieldCheck size={16} />
              </div>
              <h3 className="font-serif font-bold text-sm text-[#35483E]">
                {t("metrics_page.methodology.card3_title", "Statistical Performance vs. Real-World Care")}
              </h3>
              <p className="text-xs text-[#52665A] leading-relaxed">
                {t(
                  "metrics_page.methodology.card3_desc",
                  "High statistical benchmark scores (ROC-AUC ~0.90) do not guarantee individualized accuracy or clinical safety. Retrospective academic datasets lack contemporary ethnic, demographic, and comorbidity diversity. CardioScan is not cleared by regulatory authorities and must not replace professional clinical judgment."
                )}
              </p>
            </div>
          </div>
        </section>

        {/* ── Section 5: Plain-Language Healthcare Metrics Glossary ── */}
        <section
          aria-label="Healthcare Metrics Glossary"
          className="scroll-mt-24 bg-white/90 border border-[#E5E0D6] rounded-2xl p-6 sm:p-8 shadow-xs space-y-5"
        >
          <div className="border-b border-[#E5E0D6] pb-3 space-y-1">
            <h2 className="font-serif text-lg sm:text-xl font-bold text-[#35483E] flex items-center gap-2">
              <HelpCircle size={18} className="text-[#35483E]" />
              <span>{t("metrics_page.glossary.title", "Healthcare Machine Learning Metric Glossary")}</span>
            </h2>
            <p className="text-xs text-[#52665A]">
              {t("metrics_page.glossary.subtitle", "Understanding evaluation terminology in cardiovascular risk estimation.")}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#E5E0D6] space-y-1.5">
              <p className="font-bold font-serif text-sm text-[#2D7A58]">
                {t("metrics_page.glossary.sens_title", "Sensitivity (True Positive Rate)")}
              </p>
              <p className="text-[#52665A] leading-relaxed">
                {t(
                  "metrics_page.glossary.sens_body",
                  "The proportion of heart disease cases in the cohort correctly identified as positive. In screening evaluation, higher sensitivity prioritizes cases for secondary clinical review."
                )}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#E5E0D6] space-y-1.5">
              <p className="font-bold font-serif text-sm text-[#35483E]">
                {t("metrics_page.glossary.spec_title", "Specificity (True Negative Rate)")}
              </p>
              <p className="text-[#52665A] leading-relaxed">
                {t(
                  "metrics_page.glossary.spec_body",
                  "The proportion of non-disease individuals correctly classified as negative. In screening evaluation, higher specificity reduces false alarms on healthy individuals, helping limit avoidable secondary testing."
                )}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#E5E0D6] space-y-1.5">
              <p className="font-bold font-serif text-sm text-[#35483E]">
                {t("metrics_page.glossary.ppv_title", "Precision (Positive Predictive Value)")}
              </p>
              <p className="text-[#52665A] leading-relaxed">
                {t(
                  "metrics_page.glossary.ppv_body",
                  "Out of all patients flagged by the model, the percentage who actually have cardiovascular disease. PPV depends heavily on disease prevalence in the tested population."
                )}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#E5E0D6] space-y-1.5">
              <p className="font-bold font-serif text-sm text-[#B35D52]">
                {t("metrics_page.glossary.auc_title", "ROC-AUC (Area Under the Curve)")}
              </p>
              <p className="text-[#52665A] leading-relaxed">
                {t(
                  "metrics_page.glossary.auc_body",
                  "A threshold-independent measure of discrimination: the probability that the algorithm will assign a higher risk score to a randomly chosen disease patient than to a healthy individual."
                )}
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
