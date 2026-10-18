import React, { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  History,
  Trash2,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  Calendar,
  Clock,
  Download,
  FileText,
  Search,
  Filter,
  RefreshCw,
  ArrowUpDown,
  UserCheck,
  ShieldCheck,
  ExternalLink,
  Activity,
  Heart,
  HelpCircle,
  Sparkles,
  Info,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { getHistory, deletePrediction, updateNotes } from "../api";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import ECGBackground from "../components/ECGBackground";
import { generateReportFromPrediction } from "../utils/reportGenerator";

const FEATURE_NAMES = [
  "age", "sex", "cp", "trestbps", "chol", "fbs",
  "restecg", "thalach", "exang", "oldpeak", "slope", "ca", "thal"
];

const CLINICAL_GROUPS = [
  {
    category: "Demographics & Presentation",
    fields: [
      { key: "age", label: "Age", unit: "years", normal: "Adult 18–120" },
      {
        key: "sex",
        label: "Biological Sex",
        format: (v) => (v === 1 ? "Male" : v === 0 ? "Female" : "Not specified"),
        normal: "Baseline",
      },
      {
        key: "cp",
        label: "Chest Pain Type",
        format: (v) => {
          const map = { 0: "Typical Angina", 1: "Atypical Angina", 2: "Non-Anginal", 3: "Asymptomatic" };
          return map[v] || `Type ${v}`;
        },
        normal: "Asymptomatic / Non-anginal",
      },
    ],
  },
  {
    category: "Hemodynamics & Resting Vitals",
    fields: [
      { key: "trestbps", label: "Resting BP", unit: "mmHg", normal: "< 120 mmHg" },
      { key: "thalach", label: "Max Heart Rate", unit: "bpm", normal: "Age-predicted max" },
      {
        key: "restecg",
        label: "Resting ECG",
        format: (v) => {
          const map = { 0: "Normal", 1: "ST-T Abnormality", 2: "LV Hypertrophy" };
          return map[v] || `Grade ${v}`;
        },
        normal: "Normal tracing",
      },
    ],
  },
  {
    category: "Exercise Tolerance & Electrocardiography",
    fields: [
      {
        key: "exang",
        label: "Exercise Angina",
        format: (v) => (v === 1 ? "Yes (Positive)" : "No (Negative)"),
        normal: "Negative",
      },
      { key: "oldpeak", label: "ST Depression", unit: "mm", normal: "< 1.0 mm" },
      {
        key: "slope",
        label: "ST Slope",
        format: (v) => {
          const map = { 0: "Upsloping", 1: "Flat", 2: "Downsloping" };
          return map[v] || `Slope ${v}`;
        },
        normal: "Upsloping",
      },
    ],
  },
  {
    category: "Metabolic, Fluoroscopy & Scintigraphy",
    fields: [
      { key: "chol", label: "Serum Cholesterol", unit: "mg/dl", normal: "< 200 mg/dl" },
      {
        key: "fbs",
        label: "Fasting Blood Sugar",
        format: (v) => (v === 1 ? "Elevated (> 120 mg/dl)" : "Normal (≤ 120 mg/dl)"),
        normal: "≤ 120 mg/dl",
      },
      { key: "ca", label: "Major Vessels (CA)", unit: "vessels", normal: "0 vessels" },
      {
        key: "thal",
        label: "Thallium Scintigraphy",
        format: (v) => {
          const map = { 0: "Normal Flow (0)", 1: "Fixed Defect", 2: "Reversible Defect", 3: "Indeterminate" };
          return map[v] || `Code ${v}`;
        },
        normal: "Normal Flow",
      },
    ],
  },
];

const MODEL_LABELS = {
  ensemble: "Consensus Ensemble",
  random_forest: "Random Forest",
  logistic_regression: "Logistic Regression",
  svm: "Support Vector Machine",
  knn: "K-Nearest Neighbors",
};

function formatModelName(modelKey) {
  return MODEL_LABELS[modelKey] || modelKey || "Clinical Classifier";
}

function RiskBadge({ level }) {
  const { t } = useTranslation();
  if (level === "Low") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#F0F7F2] dark:bg-[#12281D] text-[#2D7A58] dark:text-[#52B788] border border-[#C4DFCD] dark:border-[#2D7A58]/40">
        <span className="w-1.5 h-1.5 rounded-full bg-[#2D7A58] dark:bg-[#52B788]" />
        {t("predict.low_risk", "Low Risk")}
      </span>
    );
  }
  if (level === "Moderate") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#FBF5EE] dark:bg-[#2A1E10] text-[#B56E2B] dark:text-[#E0A96D] border border-[#EBD3BC] dark:border-[#B56E2B]/40">
        <span className="w-1.5 h-1.5 rounded-full bg-[#B56E2B] dark:bg-[#E0A96D]" />
        {t("predict.moderate_risk", "Moderate Risk")}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#FDF3F2] dark:bg-[#2A1312] text-[#B35D52] dark:text-[#E08A80] border border-[#EACAC6] dark:border-[#B35D52]/40">
      <span className="w-1.5 h-1.5 rounded-full bg-[#B35D52] dark:bg-[#E08A80]" />
      {t("predict.high_risk", "High Risk")}
    </span>
  );
}

function RiskTrendChart({ predictions }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const isDark = Boolean(theme?.dark);

  if (!predictions || predictions.length < 2) return null;

  const data = [...predictions]
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    .map((p) => ({
      date: new Date(p.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      fullDate: new Date(p.created_at).toLocaleString(),
      risk: Math.round(p.probability * 100),
      level: p.risk_level,
      id: p.id,
      model: formatModelName(p.model_used),
    }));

  const first = data[0];
  const latest = data[data.length - 1];
  const diff = latest.risk - first.risk;

  return (
    <div className="glossy-card border border-[#E5E0D6] rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp size={16} className="text-[#35483E]" />
            <h3 className="font-serif font-bold text-base text-[#35483E]">
              {t("history.chart_title", "Longitudinal Risk Trajectory")}
            </h3>
          </div>
          <p className="text-xs text-[#52665A] mt-0.5">
            {t("history.chart_sub", {
              count: predictions.length,
              defaultValue: `Chronological trend across ${predictions.length} recorded evaluations`,
            })}
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto bg-[#F7F5F0] dark:bg-[#111827]/80 px-3 py-1.5 rounded-xl border border-[#E5E0D6] dark:border-white/10">
          <span className="text-xs text-[#52665A]">{t("history.trajectory_delta", "Trajectory delta:")}</span>
          <span
            className={`text-xs font-bold font-mono flex items-center gap-1 ${
              diff > 0 ? "text-[#B35D52]" : diff < 0 ? "text-[#2D7A58]" : "text-[#52665A]"
            }`}
          >
            {diff > 0 ? <TrendingUp size={13} /> : diff < 0 ? <TrendingDown size={13} /> : null}
            {diff > 0 ? `+${diff}% Higher` : diff < 0 ? `${diff}% Lower` : "Stable (0%)"}
          </span>
        </div>
      </div>

      <div className="h-44 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="riskGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#B35D52" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#B35D52" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "rgba(255,255,255,0.08)" : "#E5E0D6"} vertical={false} />
            <XAxis dataKey="date" tick={{ fill: isDark ? "#94a3b8" : "#52665A", fontSize: 11 }} tickLine={false} />
            <YAxis
              domain={[0, 100]}
              tick={{ fill: isDark ? "#94a3b8" : "#52665A", fontSize: 11 }}
              tickFormatter={(v) => `${v}%`}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const item = payload[0].payload;
                  return (
                    <div className="bg-white dark:bg-[#1D2821] border border-[#E5E0D6] dark:border-[#2E3F35] rounded-xl p-3 shadow-md text-xs space-y-1">
                      <p className="font-serif font-bold text-[#35483E] dark:text-[#F7F5F0]">
                        Report CS-REP-{String(item.id).padStart(6, "0")}
                      </p>
                      <p className="text-[#52665A] dark:text-[#A3B8A6]">{item.fullDate}</p>
                      <div className="flex items-center gap-2 pt-1 border-t border-[#E5E0D6] dark:border-[#2E3F35]">
                        <span className="font-mono font-bold text-sm text-[#35483E] dark:text-[#F7F5F0]">
                          {item.risk}% Risk
                        </span>
                        <RiskBadge level={item.level} />
                      </div>
                      <p className="text-[10px] text-[#8A9990] dark:text-[#7C9283]">{item.model}</p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Area
              type="monotone"
              dataKey="risk"
              stroke="#B35D52"
              strokeWidth={2.5}
              fill="url(#riskGrad)"
              dot={(props) => {
                const { cx, cy, payload } = props;
                const c =
                  payload.level === "Low"
                    ? "#2D7A58"
                    : payload.level === "Moderate"
                    ? "#B56E2B"
                    : "#B35D52";
                return (
                  <circle
                    key={cx}
                    cx={cx}
                    cy={cy}
                    r={4}
                    fill={c}
                    stroke={isDark ? "#1D2821" : "#FFFFFF"}
                    strokeWidth={2}
                  />
                );
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function TimelineCard({ pred, onDelete, user }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const isDark = Boolean(theme?.dark);

  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState(pred.notes || "");
  const [savingNotes, setSavingNotes] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const isPositive = pred.prediction === 1;
  const probabilityPct = Math.round((pred.probability || 0) * 100);
  const dateObj = new Date(pred.created_at);
  const formattedDate = dateObj.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  const formattedTime = dateObj.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });

  const reportId = `CS-REP-${String(pred.id).padStart(6, "0")}`;
  const recordedName = pred.patient_name || user?.name || "Patient Record";
  const recordedId = pred.patient_id || user?.patient_id || "Unassigned";

  const handleDownloadPDF = () => {
    try {
      generateReportFromPrediction(pred, user?.name, user?.patient_id);
    } catch (err) {
      toast.error("Could not generate report. Please try again.");
    }
  };

  const handleSaveNotes = async () => {
    setSavingNotes(true);
    try {
      await updateNotes(pred.id, notes);
      toast.success("Clinical notes updated successfully!");
    } catch {
      toast.error("Failed to update notes.");
    } finally {
      setSavingNotes(false);
    }
  };

  const handleDelete = async () => {
    const confirmMsg = t("history.delete_confirm", {
      id: reportId,
      defaultValue: `Are you sure you want to permanently delete assessment record ${reportId}? This action cannot be undone.`,
    });
    if (!window.confirm(confirmMsg)) {
      return;
    }
    setIsDeleting(true);
    try {
      await deletePrediction(pred.id);
      onDelete(pred.id);
      toast.success("Assessment record deleted.");
    } catch {
      toast.error("Could not delete assessment record.");
      setIsDeleting(false);
    }
  };

  return (
    <div className="relative flex gap-3 sm:gap-4 group">
      {/* ── Vertical Timeline Spine & Marker ── */}
      <div className="flex flex-col items-center shrink-0">
        <div
          className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 border transition-transform duration-200 group-hover:scale-105 shadow-2xs ${
            isPositive
              ? "bg-[#FDF3F2] dark:bg-[#2A1312] border-[#EACAC6] dark:border-[#B35D52]/40 text-[#B35D52] dark:text-[#E08A80]"
              : "bg-[#F0F7F2] dark:bg-[#12281D] border-[#C4DFCD] dark:border-[#2D7A58]/40 text-[#2D7A58] dark:text-[#52B788]"
          }`}
        >
          {isPositive ? <AlertCircle size={18} /> : <CheckCircle size={18} />}
        </div>
        <div className="w-px flex-1 mt-2 bg-[#E5E0D6] dark:bg-white/10 group-last:bg-transparent" />
      </div>

      {/* ── Main Card Container ── */}
      <div className="flex-1 mb-5">
        <div className="glossy-card border border-[#E5E0D6] dark:border-white/10 rounded-2xl overflow-hidden shadow-xs transition-shadow duration-200 hover:shadow-sm">
          {/* ── Card Header Strip ── */}
          <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-[#E5E0D6]/60 dark:border-white/10 bg-[#FAF8F5]/60 dark:bg-white/5">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <span className="font-mono text-xs font-bold text-[#35483E] px-2 py-0.5 rounded-md bg-white dark:bg-[#111827] border border-[#E5E0D6] dark:border-white/10">
                {reportId}
              </span>
              <span className="flex items-center gap-1 text-xs text-[#52665A]">
                <Calendar size={13} className="text-[#8A9990]" /> {formattedDate}
              </span>
              <span className="flex items-center gap-1 text-xs text-[#52665A]">
                <Clock size={13} className="text-[#8A9990]" /> {formattedTime}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-md bg-[#E4EDE5]/60 dark:bg-[#162720] text-[#35483E] border border-[#D3DFD5] dark:border-[#2D7A58]/30">
                {formatModelName(pred.model_used)}
              </span>
            </div>

            <div className="flex items-center gap-1.5 self-end md:self-auto">
              <button
                type="button"
                onClick={handleDownloadPDF}
                title="Download Medical-Grade A4 PDF Report"
                className="glossy-btn-secondary inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-[#35483E] shadow-2xs transition-colors"
              >
                <Download size={13} className="text-[#35483E]" />
                <span className="hidden sm:inline">{t("history.pdf_report", "PDF Report")}</span>
              </button>
              <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                title={open ? "Collapse details" : "Expand clinical parameters"}
                className="glossy-btn-secondary inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-[#52665A] shadow-2xs transition-colors"
              >
                {open ? (
                  <>
                    <ChevronUp size={13} />
                    <span>{t("history.hide", "Hide")}</span>
                  </>
                ) : (
                  <>
                    <ChevronDown size={13} />
                    <span>{t("history.details", "Details")}</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                title={t("history.delete_title", "Delete this historical record")}
                className="p-1.5 rounded-lg text-[#8A9990] hover:text-[#B35D52] hover:bg-[#FDF3F2] dark:hover:bg-[#2A1312] border border-transparent hover:border-[#EACAC6] dark:hover:border-[#B35D52]/40 transition-colors disabled:opacity-50"
              >
                <Trash2 size={13} />
              </button>
            </div>
          </div>

          {/* ── Card Body: Identity & Outcome ── */}
          <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            {/* Left: Patient Identity at time of test */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="font-serif font-bold text-base sm:text-lg text-[#35483E]">
                  {recordedName}
                </span>
                <span className="text-xs font-mono font-semibold text-[#52665A] bg-[#F7F5F0] dark:bg-white/5 px-2 py-0.5 rounded border border-[#E5E0D6] dark:border-white/10">
                  {recordedId}
                </span>
              </div>

              {pred.name_was_corrected && (
                <div className="inline-flex items-center gap-1 text-[11px] text-[#B56E2B] bg-[#FBF5EE] dark:bg-[#2A1E10] border border-[#EBD3BC] dark:border-[#B56E2B]/40 px-2 py-0.5 rounded-md">
                  <Info size={11} />
                  <span>
                    {t("history.name_corrected_note", {
                      name: pred.current_profile_name,
                      defaultValue: `Name updated in profile since evaluation (Current: ${pred.current_profile_name})`,
                    })}
                  </span>
                </div>
              )}

              <p className="text-xs text-[#52665A]">
                {isPositive
                  ? t("history.positive_summary", "Assessment identified elevated clinical indicators consistent with coronary artery disease patterns.")
                  : t("history.negative_summary", "Assessment indicated a low probability profile under standard retrospective reference thresholds.")}
              </p>
            </div>

            {/* Right: Calculated Risk Probability & Badge */}
            <div className="flex items-center gap-4 shrink-0 self-start sm:self-auto bg-[#FAF8F5] dark:bg-white/5 p-3 rounded-xl border border-[#E5E0D6] dark:border-white/10">
              <div className="text-right">
                <p className="font-serif font-bold text-2xl sm:text-3xl font-mono text-[#35483E] leading-none">
                  {probabilityPct}%
                </p>
                <p className="text-[10px] text-[#8A9990] uppercase tracking-wider font-semibold mt-1">
                  {t("history.avg_risk", "Estimated Risk")}
                </p>
              </div>
              <RiskBadge level={pred.risk_level} />
            </div>
          </div>

          {/* ── Collapsible Section: Clinical Parameters, SHAP & Notes ── */}
          <AnimatePresence>
            {open && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden border-t border-[#E5E0D6] dark:border-white/10"
              >
                <div className="p-4 sm:p-5 bg-[#FAF8F5]/60 dark:bg-white/5 space-y-5">
                  {/* 13 Clinical Parameters Table */}
                  <div>
                    <div className="flex items-center justify-between mb-2.5">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-[#52665A] flex items-center gap-1.5">
                        <Activity size={13} className="text-[#35483E]" />
                        {t("history.recorded_observations", "Recorded Clinical Observations (13 Predictors)")}
                      </h4>
                      <span className="text-[10px] text-[#8A9990]">
                        {t("history.preserved_note", "Preserved from evaluation time")}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {CLINICAL_GROUPS.map((group) => (
                        <div
                          key={group.category}
                          className="bg-white dark:bg-[#1D2821] border border-[#E5E0D6] dark:border-[#2E3F35] rounded-xl p-3 shadow-2xs space-y-2"
                        >
                          <p className="text-[10px] font-bold uppercase tracking-wider text-[#35483E] dark:text-[#F7F5F0] border-b border-[#E5E0D6] dark:border-[#2E3F35] pb-1">
                            {group.category}
                          </p>
                          <div className="space-y-1.5 text-xs">
                            {group.fields.map((field) => {
                              const val = pred[field.key];
                              const displayVal = field.format
                                ? field.format(val)
                                : val !== undefined && val !== null
                                ? `${val}${field.unit ? " " + field.unit : ""}`
                                : "—";
                              return (
                                <div
                                  key={field.key}
                                  className="flex items-center justify-between py-0.5 border-b border-[#E5E0D6]/40 dark:border-[#2E3F35]/40 last:border-0"
                                >
                                  <span className="text-[#52665A] dark:text-[#A3B8A6]">{field.label}</span>
                                  <span className="font-mono font-bold text-[#1A241E] dark:text-[#F7F5F0]">
                                    {displayVal}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* SHAP Feature Attributions (if available) */}
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#52665A] dark:text-[#A3B8A6] mb-2 flex items-center gap-1.5">
                      <Sparkles size={13} className="text-[#B35D52]" />
                      {t("history.feature_attributions", "Model Feature Attributions (SHAP Impact)")}
                    </h4>
                    {Array.isArray(pred.shap_values) && pred.shap_values.length > 0 ? (
                      <div className="bg-white dark:bg-[#1D2821] border border-[#E5E0D6] dark:border-[#2E3F35] rounded-xl p-3 shadow-2xs space-y-2">
                        {["cp", "thalach", "ca", "thal", "oldpeak", "trestbps", "age"].map((name) => {
                          const idx = FEATURE_NAMES.indexOf(name);
                          const val = pred.shap_values[idx];
                          if (val === undefined || val === null) return null;
                          const isRiskDriver = val > 0;
                          return (
                            <div key={name} className="flex items-center gap-2 text-xs">
                              <span className="w-20 font-mono text-xs text-[#52665A] dark:text-[#A3B8A6] shrink-0">
                                {name}
                              </span>
                              <div className="flex-1 h-2 rounded-full bg-[#E5E0D6]/50 dark:bg-white/10 overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${
                                    isRiskDriver ? "bg-[#B35D52]" : "bg-[#2D7A58]"
                                  }`}
                                  style={{
                                    width: `${Math.min(Math.abs(val) * 200, 100)}%`,
                                  }}
                                />
                              </div>
                              <span
                                className={`font-mono text-xs font-bold w-16 text-right ${
                                  isRiskDriver ? "text-[#B35D52]" : "text-[#2D7A58]"
                                }`}
                              >
                                {val > 0 ? "+" : ""}
                                {val.toFixed(3)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="p-3 bg-white dark:bg-[#1D2821] border border-[#E5E0D6] dark:border-[#2E3F35] rounded-xl text-xs text-[#6B7F74] dark:text-[#A3B8A6]">
                        {t("history.no_shap_data", "Feature attributions (SHAP) were not computed for this assessment record.")}
                      </div>
                    )}
                  </div>

                  {/* Clinical Notes Editor */}
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#52665A] mb-1.5 flex items-center gap-1.5">
                      <FileText size={13} className="text-[#35483E]" />
                      {t("history.notes_title", "Patient & Practitioner Notes")}
                    </h4>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={2}
                      placeholder={t("history.notes_placeholder", "Add clinical observations, medication context, or followup instructions...")}
                      className="glossy-input w-full text-xs text-[#35483E] rounded-xl p-2.5 focus:outline-hidden focus:ring-2 focus:ring-[#35483E]/20 transition-all placeholder:text-[#8A9990]"
                    />
                    <div className="flex justify-end mt-2">
                      <button
                        type="button"
                        onClick={handleSaveNotes}
                        disabled={savingNotes}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-[#35483E] hover:bg-[#2A3A31] transition-colors disabled:opacity-60"
                      >
                        {savingNotes ? t("history.saving_notes", "Saving Notes...") : t("history.save_notes", "Save Notes")}
                      </button>
                    </div>
                  </div>

                  {/* Historical Integrity Audit Note */}
                  <div className="pt-2 border-t border-[#E5E0D6]/60 dark:border-white/10 flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#8A9990]">
                    <span>
                      {t("history.integrity_footer", {
                        model: formatModelName(pred.model_used),
                        defaultValue: `Integrity: Evaluated with ${formatModelName(pred.model_used)}. ML inference is never rerun for historical reviews.`,
                      })}
                    </span>
                    <button
                      type="button"
                      onClick={handleDownloadPDF}
                      className="text-[#35483E] font-semibold hover:underline flex items-center gap-1"
                    >
                      <Download size={11} /> {t("history.print_save_pdf", "Print / Save PDF")}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

export default function HistoryPage() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { dark } = useTheme() || {};
  const isDark = Boolean(dark);

  const isRTL = i18n.dir ? i18n.dir() === "rtl" : document.documentElement.dir === "rtl";

  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  // Filters and Sorting
  const [searchTerm, setSearchTerm] = useState("");
  const [filterOutcome, setFilterOutcome] = useState("all"); // "all", "positive", "negative"
  const [filterRisk, setFilterRisk] = useState("all"); // "all", "Low", "Moderate", "High"
  const [filterModel, setFilterModel] = useState("all");
  const [sortOrder, setSortOrder] = useState("desc"); // "desc", "asc"
  const [dateRange, setDateRange] = useState("all"); // "all", "30d", "90d", "1y"

  const fetchHistory = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await getHistory();
      setPredictions(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setLoadError("Unable to retrieve your assessment history. Please check your connection and try again.");
      toast.error("Could not load assessment history.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleDelete = (id) => {
    setPredictions((prev) => prev.filter((p) => p.id !== id));
  };

  // Filter & Search Logic
  const filteredPredictions = useMemo(() => {
    let list = [...predictions];

    // Search query (matches report id, recorded patient name, notes, model)
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      list = list.filter((p) => {
        const repId = `cs-rep-${String(p.id).padStart(6, "0")}`;
        const name = (p.patient_name || "").toLowerCase();
        const pid = (p.patient_id || "").toLowerCase();
        const notes = (p.notes || "").toLowerCase();
        const model = (p.model_used || "").toLowerCase();
        return (
          repId.includes(q) ||
          name.includes(q) ||
          pid.includes(q) ||
          notes.includes(q) ||
          model.includes(q)
        );
      });
    }

    // Outcome filter
    if (filterOutcome === "positive") {
      list = list.filter((p) => p.prediction === 1);
    } else if (filterOutcome === "negative") {
      list = list.filter((p) => p.prediction === 0);
    }

    // Risk level filter
    if (filterRisk !== "all") {
      list = list.filter((p) => p.risk_level?.toLowerCase() === filterRisk.toLowerCase());
    }

    // Model filter
    if (filterModel !== "all") {
      list = list.filter((p) => p.model_used === filterModel);
    }

    // Date range filter
    if (dateRange !== "all") {
      const now = new Date();
      const cutoff = new Date();
      if (dateRange === "30d") cutoff.setDate(now.getDate() - 30);
      else if (dateRange === "90d") cutoff.setDate(now.getDate() - 90);
      else if (dateRange === "1y") cutoff.setFullYear(now.getFullYear() - 1);

      list = list.filter((p) => new Date(p.created_at) >= cutoff);
    }

    // Sort order
    list.sort((a, b) => {
      const timeA = new Date(a.created_at).getTime();
      const timeB = new Date(b.created_at).getTime();
      return sortOrder === "asc" ? timeA - timeB : timeB - timeA;
    });

    return list;
  }, [predictions, searchTerm, filterOutcome, filterRisk, filterModel, dateRange, sortOrder]);

  // Overall Statistics for KPI Cards
  const stats = useMemo(() => {
    const total = predictions.length;
    if (total === 0) {
      return { total: 0, positive: 0, low: 0, avgRisk: 0, latestDate: "None" };
    }
    const positive = predictions.filter((p) => p.prediction === 1).length;
    const low = predictions.filter((p) => p.risk_level === "Low").length;
    const avgRisk = Math.round(
      (predictions.reduce((acc, p) => acc + (p.probability || 0), 0) / total) * 100
    );
    const sorted = [...predictions].sort(
      (a, b) => new Date(b.created_at) - new Date(a.created_at)
    );
    const latestDate = new Date(sorted[0].created_at).toLocaleDateString();

    return { total, positive, low, avgRisk, latestDate };
  }, [predictions]);

  const hasActiveFilters =
    searchTerm !== "" ||
    filterOutcome !== "all" ||
    filterRisk !== "all" ||
    filterModel !== "all" ||
    dateRange !== "all" ||
    sortOrder !== "desc";

  const resetFilters = () => {
    setSearchTerm("");
    setFilterOutcome("all");
    setFilterRisk("all");
    setFilterModel("all");
    setDateRange("all");
    setSortOrder("desc");
  };

  return (
    <div
      className={`min-h-screen transition-colors duration-200 ${
        isDark ? "bg-[#141D18] text-[#F7F5F0]" : "bg-[#F7F5F0] text-[#35483E]"
      }`}
      dir={isRTL ? "rtl" : "ltr"}
    >
      <ECGBackground />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-8 relative z-10">
        {/* ── Page Header ── */}
        <header className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-[#52665A] dark:text-[#94a3b8]">
              <div className="w-1.5 h-1.5 rounded-full bg-[#B35D52] animate-pulse" />
              <span>{t("history.header_tag", "Clinical Records · Patient Assessment Timeline")}</span>
            </div>

            {user?.patient_id && (
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glossy-card border border-[#E5E0D6] dark:border-white/10 shadow-2xs text-xs">
                <span className="text-[#52665A] dark:text-[#94a3b8]">{t("history.patient_id_label", "Patient ID:")}</span>
                <span className="font-mono font-bold text-[#35483E] dark:text-[#f1f5f9]">{user.patient_id}</span>
              </div>
            )}
          </div>

          <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-normal text-[#35483E] dark:text-[#f1f5f9] tracking-tight">
            {t("history.page_title_prefix", "Assessment Timeline & ")}
            <span className="text-[#B35D52] italic">{t("history.page_title_italic", "Clinical History")}</span>
          </h1>

          <p className="text-xs sm:text-sm text-[#52665A] dark:text-[#94a3b8] max-w-3xl leading-relaxed">
            {t("history.page_subtitle", "Review, inspect, and export your previously saved cardiovascular risk evaluations. Historical assessments preserve the exact clinical parameters, patient identity, and machine-learning conclusions recorded at the time of evaluation.")}
          </p>
        </header>

        {/* ── Educational & Data Integrity Notice ── */}
        <section
          aria-label="Clinical History Disclaimer"
          className="rounded-2xl border border-[#D3DFD5] dark:border-[#2D7A58]/30 bg-[#E4EDE5]/70 dark:bg-[#12281D]/60 p-4 text-[#2D7A58] dark:text-[#52B788] flex items-start gap-3 shadow-xs"
        >
          <div className="p-2 rounded-xl bg-white/80 dark:bg-[#1A382B] border border-[#D3DFD5] dark:border-[#2D7A58]/40 shrink-0 text-[#2D7A58] dark:text-[#52B788]">
            <ShieldCheck size={18} />
          </div>
          <div className="space-y-0.5 text-xs text-[#35483E] dark:text-[#E4EDE5] leading-relaxed">
            <p className="font-bold font-serif text-[#2D7A58] dark:text-[#52B788]">
              {t("history.disclaimer_title", "Historical Integrity & Medical Scope")}
            </p>
            <p className="text-[#52665A] dark:text-[#94a3b8]">
              {t("history.disclaimer_body", "All entries below represent frozen records of assessments performed at that specific date and time. CardioScan never reruns machine learning inference on historical reviews. These records are educational aids and do not replace professional physician consultations.")}
            </p>
          </div>
        </section>

        {/* ── Summary KPI Metric Cards (5 cards) ── */}
        <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <div className="glossy-card border border-[#E5E0D6] dark:border-white/10 rounded-2xl p-4 shadow-xs">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#52665A] dark:text-[#94a3b8] mb-1">
              {t("history.kpi_total", "Total Saved")}
            </p>
            <p className="font-serif text-2xl sm:text-3xl font-bold text-[#35483E] dark:text-[#f1f5f9] font-mono">
              {stats.total}
            </p>
            <p className="text-[10px] text-[#8A9990] dark:text-[#64748b] mt-0.5">
              {t("history.kpi_total_sub", "Recorded assessments")}
            </p>
          </div>

          <div className="glossy-card border border-[#E5E0D6] dark:border-white/10 rounded-2xl p-4 shadow-xs">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#B35D52] dark:text-[#E08A80] mb-1">
              {t("history.kpi_positive", "Elevated Indication")}
            </p>
            <p className="font-serif text-2xl sm:text-3xl font-bold text-[#B35D52] dark:text-[#E08A80] font-mono">
              {stats.positive}
            </p>
            <p className="text-[10px] text-[#8A9990] dark:text-[#64748b] mt-0.5">
              {t("history.kpi_positive_sub", {
                pct: stats.total ? Math.round((stats.positive / stats.total) * 100) : 0,
                defaultValue: `${stats.total ? Math.round((stats.positive / stats.total) * 100) : 0}% of records`,
              })}
            </p>
          </div>

          <div className="glossy-card border border-[#E5E0D6] dark:border-white/10 rounded-2xl p-4 shadow-xs">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#2D7A58] dark:text-[#52B788] mb-1">
              {t("history.kpi_low", "Low Risk Outcomes")}
            </p>
            <p className="font-serif text-2xl sm:text-3xl font-bold text-[#2D7A58] dark:text-[#52B788] font-mono">
              {stats.low}
            </p>
            <p className="text-[10px] text-[#8A9990] dark:text-[#64748b] mt-0.5">
              {t("history.kpi_low_sub", {
                pct: stats.total ? Math.round((stats.low / stats.total) * 100) : 0,
                defaultValue: `${stats.total ? Math.round((stats.low / stats.total) * 100) : 0}% favorable`,
              })}
            </p>
          </div>

          <div className="glossy-card border border-[#E5E0D6] dark:border-white/10 rounded-2xl p-4 shadow-xs">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#52665A] dark:text-[#94a3b8] mb-1">
              {t("history.kpi_avg", "Average Risk")}
            </p>
            <p className="font-serif text-2xl sm:text-3xl font-bold text-[#35483E] dark:text-[#f1f5f9] font-mono">
              {stats.avgRisk}%
            </p>
            <p className="text-[10px] text-[#8A9990] dark:text-[#64748b] mt-0.5">
              {t("history.kpi_avg_sub", "Cohort average")}
            </p>
          </div>

          <div className="glossy-card border border-[#E5E0D6] dark:border-white/10 rounded-2xl p-4 shadow-xs col-span-2 sm:col-span-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#52665A] dark:text-[#94a3b8] mb-1">
              {t("history.kpi_latest", "Latest Evaluation")}
            </p>
            <p className="font-serif text-base sm:text-lg font-bold text-[#35483E] dark:text-[#f1f5f9] truncate">
              {stats.latestDate}
            </p>
            <p className="text-[10px] text-[#8A9990] dark:text-[#64748b] mt-0.5">
              {t("history.kpi_latest_sub", "Most recent record")}
            </p>
          </div>
        </section>

        {/* ── Longitudinal Risk Trajectory Chart ── */}
        <RiskTrendChart predictions={predictions} />

        {/* ── Search, Filters, and Sorting Toolbar ── */}
        <section className="glossy-card border border-[#E5E0D6] dark:border-white/10 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3.5">
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search
                size={15}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8A9990] rtl:left-auto rtl:right-3.5"
              />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={t("history.search_placeholder", "Search by report ID (e.g. CS-REP-000012), patient name, notes, or model...")}
                className="glossy-input w-full pl-9 rtl:pl-3 rtl:pr-9 pr-3 py-2 text-xs text-[#35483E] rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#35483E]/20 transition-all placeholder:text-[#8A9990]"
              />
            </div>

            {/* Sort Toggle */}
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-[#52665A] dark:text-[#94a3b8] flex items-center gap-1 font-semibold">
                <ArrowUpDown size={13} /> {t("history.sort_label", "Sort:")}
              </span>
              <button
                type="button"
                onClick={() => setSortOrder((o) => (o === "desc" ? "asc" : "desc"))}
                className="glossy-btn-secondary px-3 py-1.5 rounded-xl text-xs font-semibold text-[#35483E] dark:text-[#f1f5f9] border border-[#E5E0D6] dark:border-white/10 transition-colors"
              >
                {sortOrder === "desc" ? t("history.sort_newest", "Newest First ↓") : t("history.sort_oldest", "Oldest First ↑")}
              </button>
            </div>
          </div>

          {/* Filter Pills Bar */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#E5E0D6]/60 dark:border-white/10">
            {/* Outcome Filter */}
            <div className="flex items-center gap-1">
              <span className="text-[11px] text-[#52665A] dark:text-[#94a3b8] font-semibold mr-1 rtl:mr-0 rtl:ml-1">{t("history.filter_outcome", "Outcome:")}</span>
              {[
                ["all", t("history.all", "All")],
                ["positive", t("history.kpi_positive", "Elevated Indication")],
                ["negative", t("predict.negative_result", "No Indication")],
              ].map(([val, label]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setFilterOutcome(val)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                    filterOutcome === val
                      ? "bg-[#35483E] text-white border-[#35483E] shadow-2xs"
                      : "glossy-btn-secondary text-[#52665A] dark:text-[#94a3b8] border-[#E5E0D6] dark:border-white/10"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="h-4 w-px bg-[#E5E0D6] dark:bg-white/10 mx-1 hidden md:block" />

            {/* Risk Level Filter */}
            <div className="flex items-center gap-1">
              <span className="text-[11px] text-[#52665A] dark:text-[#94a3b8] font-semibold mr-1 rtl:mr-0 rtl:ml-1">{t("history.filter_risk", "Risk:")}</span>
              {[
                ["all", t("history.all", "All")],
                ["Low", t("predict.low_risk", "Low")],
                ["Moderate", t("predict.moderate_risk", "Mod")],
                ["High", t("predict.high_risk", "High")],
              ].map(([val, label]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setFilterRisk(val)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                    filterRisk === val
                      ? "bg-[#35483E] text-white border-[#35483E] shadow-2xs"
                      : "glossy-btn-secondary text-[#52665A] dark:text-[#94a3b8] border-[#E5E0D6] dark:border-white/10"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="h-4 w-px bg-[#E5E0D6] dark:bg-white/10 mx-1 hidden lg:block" />

            {/* Date Range Filter */}
            <div className="flex items-center gap-1">
              <span className="text-[11px] text-[#52665A] dark:text-[#94a3b8] font-semibold mr-1 rtl:mr-0 rtl:ml-1">{t("history.filter_period", "Period:")}</span>
              {[
                ["all", t("history.all_time", "All Time")],
                ["30d", t("history.last_30d", "Last 30 Days")],
                ["90d", t("history.last_90d", "Last 90 Days")],
                ["1y", t("history.past_year", "Past Year")],
              ].map(([val, label]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setDateRange(val)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                    dateRange === val
                      ? "bg-[#35483E] text-white border-[#35483E] shadow-2xs"
                      : "glossy-btn-secondary text-[#52665A] dark:text-[#94a3b8] border-[#E5E0D6] dark:border-white/10"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="ltr:ml-auto rtl:mr-auto text-xs font-semibold text-[#B35D52] hover:underline flex items-center gap-1"
              >
                {t("history.reset_filters", "Reset filters")}
              </button>
            )}
          </div>

          <div className="flex items-center justify-between text-xs text-[#52665A] dark:text-[#94a3b8] pt-1">
            <span>
              {t("history.showing_count", {
                filtered: filteredPredictions.length,
                total: predictions.length,
                defaultValue: `Showing ${filteredPredictions.length} of ${predictions.length} recorded assessments`,
              })}
            </span>
          </div>
        </section>

        {/* ── Main Assessment History Feed ── */}
        <section aria-label="Assessment Records">
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="glossy-card border border-[#E5E0D6] dark:border-white/10 rounded-2xl p-5 shadow-xs animate-pulse space-y-3"
                >
                  <div className="h-4 bg-[#E4EDE5]/60 dark:bg-white/10 rounded-md w-1/4" />
                  <div className="h-6 bg-[#E4EDE5]/40 dark:bg-white/10 rounded-md w-1/2" />
                  <div className="h-4 bg-[#E4EDE5]/30 dark:bg-white/10 rounded-md w-3/4" />
                </div>
              ))}
            </div>
          ) : loadError ? (
            <div className="bg-[#FDF3F2] dark:bg-[#2A1312] border border-[#EACAC6] dark:border-[#B35D52]/40 rounded-2xl p-6 text-center space-y-3">
              <AlertCircle size={32} className="text-[#B35D52] mx-auto" />
              <h3 className="font-serif font-bold text-lg text-[#B35D52]">
                {t("history.failed_load", "Failed to Load Assessment History")}
              </h3>
              <p className="text-xs text-[#52665A] dark:text-[#94a3b8] max-w-md mx-auto">{loadError}</p>
              <button
                type="button"
                onClick={fetchHistory}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-[#35483E] hover:bg-[#2A3A31] transition-colors"
              >
                <RefreshCw size={13} /> {t("history.retry", "Retry Connection")}
              </button>
            </div>
          ) : predictions.length === 0 ? (
            /* ── Calm Empty State for New Users ── */
            <div className="glossy-card border border-[#E5E0D6] dark:border-white/10 rounded-2xl p-10 sm:p-14 text-center space-y-4 shadow-xs">
              <div className="w-16 h-16 rounded-2xl bg-[#E4EDE5] dark:bg-[#162720] text-[#35483E] dark:text-[#52B788] flex items-center justify-center mx-auto border border-[#D3DFD5] dark:border-[#2D7A58]/30">
                <Heart size={30} className="fill-[#35483E]/20 dark:fill-[#52B788]/20" />
              </div>
              <div className="space-y-1.5 max-w-md mx-auto">
                <h3 className="font-serif font-bold text-xl sm:text-2xl text-[#35483E] dark:text-[#f1f5f9]">
                  {t("history.empty_title", "No Clinical Assessments Recorded Yet")}
                </h3>
                <p className="text-xs sm:text-sm text-[#52665A] dark:text-[#94a3b8] leading-relaxed">
                  {t("history.empty_desc", "You haven't run any cardiovascular risk evaluations on your account. Begin your first assessment using your baseline clinical measurements to view your timeline and downloadable reports here.")}
                </p>
              </div>
              <div className="pt-2">
                <Link
                  to="/predict"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-white bg-[#35483E] hover:bg-[#2A3A31] transition-colors shadow-2xs"
                >
                  <Activity size={15} /> {t("history.begin_assessment", "Begin Your First Assessment")}
                </Link>
              </div>
            </div>
          ) : filteredPredictions.length === 0 ? (
            /* ── Filter Empty State ── */
            <div className="glossy-card border border-[#E5E0D6] dark:border-white/10 rounded-2xl p-8 text-center space-y-3 shadow-xs">
              <Filter size={28} className="text-[#8A9990] dark:text-[#64748b] mx-auto" />
              <h3 className="font-serif font-bold text-base text-[#35483E] dark:text-[#f1f5f9]">
                {t("history.filter_empty_title", "No assessments match your selected filters")}
              </h3>
              <p className="text-xs text-[#52665A] dark:text-[#94a3b8]">
                {t("history.filter_empty_desc", "Try adjusting your search query, risk category, or date range.")}
              </p>
              <button
                type="button"
                onClick={resetFilters}
                className="glossy-btn-secondary px-3.5 py-1.5 rounded-xl text-xs font-semibold text-[#35483E] dark:text-[#f1f5f9] border border-[#E5E0D6] dark:border-white/10 hover:bg-white transition-colors"
              >
                {t("history.reset_all_filters", "Reset All Filters")}
              </button>
            </div>
          ) : (
            /* ── Rendered Timeline List ── */
            <div className="space-y-2">
              {filteredPredictions.map((pred) => (
                <TimelineCard
                  key={pred.id}
                  pred={pred}
                  onDelete={handleDelete}
                  user={user}
                />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
