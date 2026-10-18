import React, { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { Heart, AlertCircle, CheckCircle, ChevronRight, RotateCcw, Zap, Download, Send, Bot, User, Loader, Sliders, X, MessageSquare, Lock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { predict, whatif, chatWithBot, getProfile } from "../api";
import { useAuth } from "../context/AuthContext";
import { generatePDF } from "../utils/reportGenerator";
import OnboardingTour from "../components/OnboardingTour";
import ECGBackground from "../components/ECGBackground";
import ResultReveal from "../components/ResultReveal";
import AnalyzingSequence from "../components/AnalyzingSequence";
import RiskAlarm from "../components/RiskAlarm";
import HeartbeatOverlay from "../components/HeartbeatOverlay";
import { useTranslation } from "react-i18next";

function useFields() {
  const { t } = useTranslation();
  return [
    { key: "age", label: t("fields.age"), group: "Demographics", type: "number", min: 1, max: 120, step: 1, unit: "yrs", hint: t("fields.age_hint"), default: 52 },
    { key: "sex", label: t("fields.sex"), group: "Demographics", type: "select", options: [{ v: 1, l: t("fields.male") }, { v: 0, l: t("fields.female") }], default: 1 },
    { key: "cp", label: t("fields.cp"), group: "Symptoms", type: "select", options: [{ v: 0, l: t("fields.cp_0") }, { v: 1, l: t("fields.cp_1") }, { v: 2, l: t("fields.cp_2") }, { v: 3, l: t("fields.cp_3") }], default: 0 },
    { key: "trestbps", label: t("fields.trestbps"), group: "Vitals", type: "number", min: 60, max: 250, step: 1, unit: "mmHg", hint: t("fields.trestbps_hint"), default: 130 },
    { key: "chol", label: t("fields.chol"), group: "Vitals", type: "number", min: 100, max: 600, step: 1, unit: "mg/dl", hint: t("fields.chol_hint"), default: 240 },
    { key: "fbs", label: t("fields.fbs"), group: "Lab", type: "select", options: [{ v: 0, l: t("fields.fbs_0") }, { v: 1, l: t("fields.fbs_1") }], default: 0 },
    { key: "restecg", label: t("fields.restecg"), group: "Cardiac", type: "select", options: [{ v: 0, l: t("fields.restecg_0") }, { v: 1, l: t("fields.restecg_1") }, { v: 2, l: t("fields.restecg_2") }], default: 0 },
    { key: "thalach", label: t("fields.thalach"), group: "Cardiac", type: "number", min: 60, max: 250, step: 1, unit: "bpm", hint: t("fields.thalach_hint"), default: 150 },
    { key: "exang", label: t("fields.exang"), group: "Cardiac", type: "select", options: [{ v: 0, l: t("fields.exang_0") }, { v: 1, l: t("fields.exang_1") }], default: 0 },
    { key: "oldpeak", label: t("fields.oldpeak"), group: "Cardiac", type: "number", min: 0, max: 10, step: 0.1, unit: "mm", hint: t("fields.oldpeak_hint"), default: 1.0 },
    { key: "slope", label: t("fields.slope"), group: "Cardiac", type: "select", options: [{ v: 0, l: t("fields.slope_0") }, { v: 1, l: t("fields.slope_1") }, { v: 2, l: t("fields.slope_2") }], default: 1 },
    { key: "ca", label: t("fields.ca"), group: "Lab", type: "select", options: [{ v: 0, l: "0" }, { v: 1, l: "1" }, { v: 2, l: "2" }, { v: 3, l: "3" }, { v: 4, l: "4" }], default: 0 },
    { key: "thal", label: t("fields.thal"), group: "Lab", type: "select", options: [{ v: 0, l: t("fields.thal_0") }, { v: 1, l: t("fields.thal_1") }, { v: 2, l: t("fields.thal_2") }, { v: 3, l: t("fields.thal_3") }], default: 2 },
  ];
}

const FIELD_LABELS = {
  age: "Age", sex: "Biological Sex", cp: "Chest Pain Type", trestbps: "Resting BP",
  chol: "Cholesterol", fbs: "Fasting Blood Sugar", restecg: "Resting ECG",
  thalach: "Max Heart Rate", exang: "Exercise Angina", oldpeak: "ST Depression",
  slope: "ST Slope", ca: "Major Vessels", thal: "Thalassemia",
};

const MODELS = [
  { key: "logistic_regression", label: "Logistic Regression", icon: "📈" },
  { key: "random_forest", label: "Random Forest", icon: "🌲" },
  { key: "knn", label: "K-Nearest Neighbors", icon: "🔵" },
  { key: "svm", label: "Support Vector Machine", icon: "⚡" },
  { key: "ensemble", label: "Ensemble (All 3)", icon: "🎯" },
];

function buildDefaults() {
  return { patient_name: "", patient_id: "", age: 52, sex: 1, cp: 0, trestbps: 130, chol: 240, fbs: 0, restecg: 0, thalach: 150, exang: 0, oldpeak: 1.0, slope: 1, ca: 0, thal: 2 };
}

function buildSystemPrompt(form, result, modelLabel) {
  const topShap = result.feature_names.map((name, i) => ({ name, value: result.shap_values[i] })).sort((a, b) => Math.abs(b.value) - Math.abs(a.value)).slice(0, 5);
  const FEATURE_KEYS = ["age", "sex", "cp", "trestbps", "chol", "fbs", "restecg", "thalach", "exang", "oldpeak", "slope", "ca", "thal"];
  const patientSummary = FEATURE_KEYS.map(key => `${FIELD_LABELS[key]}: ${form[key]}`).join(", ");
  const shapSummary = topShap.map(({ name, value }) => `${FIELD_LABELS[name] || name}: ${value > 0 ? "+" : ""}${value.toFixed(4)} (${value > 0 ? "increases" : "reduces"} risk)`).join(", ");
  return `You are CardioScan Assistant, an AI medical research assistant built into CardioScan.\n\nPATIENT REPORT:\n- Diagnosis: ${result.prediction === 1 ? "Heart Disease Detected" : "No Heart Disease Detected"}\n- Risk Level: ${result.risk_level}\n- Probability: ${Math.round(result.probability * 100)}%\n- Model: ${modelLabel}\n- Patient Data: ${patientSummary}\n- Top SHAP Features: ${shapSummary}\n\nBe friendly, clear, empathetic and concise. Explain medical terms simply. Never diagnose or prescribe. Always recommend consulting a doctor.`;
}

function FloatingChatAssistant({ form, result, modelLabel }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  // Initialize or update conversation state when result changes
  useEffect(() => {
    if (result) {
      setMessages([
        {
          role: "assistant",
          content: `Greetings. I'm **CardioScan Assistant**, your clinical research assistant. The current estimation indicates a **${result.risk_level} risk** (${Math.round(result.probability * 100)}%) of heart disease based on the ${modelLabel} algorithm. Feel free to ask about feature importances, SHAP values, or cardiovascular risk factors.`,
        },
      ]);
    } else {
      setMessages([
        {
          role: "assistant",
          content: `Greetings. I'm **CardioScan Assistant**, your clinical research assistant. Fill in the biomarker observations on the left and run an assessment, or ask me any questions regarding cardiovascular metrics and ML models.`,
        },
      ]);
    }
  }, [result, modelLabel]);

  useEffect(() => {
    if (isOpen) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMsg }]);
    setLoading(true);
    try {
      const history = messages.map(m => ({ role: m.role, content: m.content }));
      const prompt = result
        ? buildSystemPrompt(form, result, modelLabel)
        : `You are CardioScan Assistant, an AI medical research assistant built into CardioScan. Answer questions about cardiovascular risk factors, clinical measurements, and machine learning explainability clearly, concisely, and empathetically. Never diagnose or prescribe. Always recommend consulting a licensed healthcare professional.`;
      const { data } = await chatWithBot(prompt, [...history, { role: "user", content: userMsg }]);
      setMessages(prev => [...prev, { role: "assistant", content: data.reply || "Sorry, try again." }]);
    } catch (err) {
      const msg = err?.response?.data?.error || "Connection error.";
      setMessages(prev => [...prev, { role: "assistant", content: msg }]);
    } finally {
      setLoading(false);
    }
  };

  const suggestions = result
    ? ["Why is my risk score elevated?", "What does Major Vessels (CA) mean?", "Explain the top SHAP features", "What lifestyle modifications help?"]
    : ["What is normal resting blood pressure?", "How does Random Forest predict risk?", "Explain exercise-induced angina", "What does Thalassemia mean in cardiac testing?"];

  return (
    <>
      {/* Floating Trigger Pill */}
      <div className="fixed bottom-5 right-5 sm:bottom-6 sm:right-6 z-40 ltr:right-5 rtl:left-5 rtl:right-auto">
        <motion.button
          type="button"
          onClick={() => setIsOpen(prev => !prev)}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          className={`flex items-center gap-2.5 px-4 py-3 rounded-full shadow-lg transition-all border cursor-pointer ${
            isOpen
              ? "bg-[#E4EDE5] text-[#35483E] border-[#C5D5C8] shadow-md"
              : "bg-[#35483E] text-white border-[#52665A]/40 hover:bg-[#2A3B32] hover:shadow-xl"
          }`}
          aria-label="Toggle Clinical Research Assistant"
        >
          <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
            isOpen ? "bg-[#35483E] text-white" : "bg-[#E4EDE5] text-[#35483E]"
          }`}>
            <Bot size={13} />
          </div>
          <span className="text-xs font-medium font-sans">
            {isOpen ? "Close Assistant" : "Research Assistant"}
          </span>
          <div className="w-2 h-2 rounded-full bg-[#2D7A58] animate-pulse" />
        </motion.button>
      </div>

      {/* Floating Chat Modal Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="fixed bottom-20 right-4 sm:right-6 z-50 w-[calc(100vw-2rem)] sm:w-[420px] max-h-[calc(100vh-6.5rem)] sm:max-h-[580px] flex flex-col rounded-2xl overflow-hidden border border-[#E5E0D6] shadow-2xl bg-[#F7F5F0] ltr:right-4 rtl:left-4 rtl:right-auto"
            style={{
              boxShadow: "0 20px 40px -10px rgba(53, 72, 62, 0.22), 0 0 0 1px #E5E0D6",
            }}
          >
            {/* Header */}
            <div className="px-4 py-3.5 border-b border-[#E5E0D6] flex items-center justify-between bg-white/95">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#35483E] text-white flex items-center justify-center shadow-xs">
                  <Bot size={15} />
                </div>
                <div>
                  <p className="text-[#35483E] font-serif font-semibold text-xs sm:text-sm">
                    CardioScan Research Assistant
                  </p>
                  <p className="text-[#607368] text-[10px] sm:text-[11px]">
                    Educational AI dialogue & report interpretation
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 bg-[#E4EDE5] px-2 py-0.5 rounded-full border border-[#D3DFD5]">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#2D7A58] animate-pulse" />
                  <span className="text-[10px] text-[#2D7A58] font-medium font-sans">Ready</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-[#52665A] hover:text-[#35483E] hover:bg-[#E4EDE5]/60 transition-all cursor-pointer"
                  aria-label="Close Assistant"
                >
                  <X size={15} />
                </button>
              </div>
            </div>

            {/* Message History */}
            <div className="flex-1 overflow-y-auto px-4 py-3.5 space-y-3 bg-white/40 min-h-[180px] max-h-[300px]">
              {messages.map((msg, i) => (
                <div key={i} className={`flex gap-2.5 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                    msg.role === "assistant" ? "bg-[#35483E] text-white" : "bg-[#E4EDE5] text-[#35483E] border border-[#E5E0D6]"
                  }`}>
                    {msg.role === "assistant" ? <Bot size={12} /> : <User size={12} />}
                  </div>
                  <div
                    className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed ${
                      msg.role === "assistant"
                        ? "bg-white text-[#35483E] rounded-tl-sm border border-[#E5E0D6] shadow-xs"
                        : "bg-[#35483E] text-white rounded-tr-sm"
                    }`}
                  >
                    {msg.content.split("**").map((part, j) => (j % 2 === 1 ? <strong key={j} className="font-semibold text-inherit">{part}</strong> : part))}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex gap-2.5">
                  <div className="w-6 h-6 rounded-full bg-[#35483E] text-white flex items-center justify-center shrink-0">
                    <Bot size={12} />
                  </div>
                  <div className="bg-white px-3.5 py-2 rounded-2xl rounded-tl-sm border border-[#E5E0D6] flex items-center gap-2 text-xs text-[#52665A]">
                    <Loader size={12} className="text-[#35483E] animate-spin" />
                    <span>Synthesizing response...</span>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Quick Suggestions */}
            {messages.length <= 2 && (
              <div className="px-3 py-2 bg-white/70 border-t border-[#E5E0D6] flex flex-wrap gap-1">
                {suggestions.map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setInput(s)}
                    className="text-[11px] px-2.5 py-1 rounded-full border border-[#E5E0D6] bg-white text-[#52665A] hover:bg-[#E4EDE5] hover:text-[#35483E] transition-all text-start cursor-pointer"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            {/* Input Bar */}
            <div className="p-3 bg-white/95 border-t border-[#E5E0D6]">
              <div className="flex gap-2 items-end">
                <textarea
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                  placeholder="Ask about cardiovascular metrics, SHAP..."
                  rows={1}
                  className="glossy-input flex-1 resize-none text-xs py-2 px-3"
                  style={{ minHeight: 38 }}
                />
                <button
                  type="button"
                  onClick={sendMessage}
                  disabled={!input.trim() || loading}
                  className="glossy-btn-primary w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 disabled:opacity-40 shrink-0 text-white cursor-pointer"
                  aria-label="Send message"
                >
                  <Send size={13} />
                </button>
              </div>
              <p className="text-[10px] text-[#8A9990] mt-1 text-center sm:text-start">
                Educational research assistant; not medical advice.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function WhatIfAnalysis({ originalForm, originalResult, model }) {
  const NUMERIC_FIELDS = [
    { key: "age", label: "Age", min: 1, max: 120, step: 1, unit: "yrs" },
    { key: "trestbps", label: "Resting BP", min: 60, max: 250, step: 1, unit: "mmHg" },
    { key: "chol", label: "Cholesterol", min: 100, max: 600, step: 1, unit: "mg/dl" },
    { key: "thalach", label: "Max HR", min: 60, max: 250, step: 1, unit: "bpm" },
    { key: "oldpeak", label: "Oldpeak", min: 0, max: 10, step: 0.1, unit: "mm" },
  ];
  const [whatIfForm, setWhatIfForm] = useState({ ...originalForm });
  const [whatIfResult, setWhatIfResult] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(async () => {
      setLoading(true);
      try {
        const { age, sex, cp, trestbps, chol, fbs, restecg, thalach, exang, oldpeak, slope, ca, thal } = whatIfForm;
        const { data } = await whatif({ age, sex, cp, trestbps, chol, fbs, restecg, thalach, exang, oldpeak, slope, ca, thal, model });
        setWhatIfResult(data);
      } catch (e) {} finally { setLoading(false); }
    }, 500);
    return () => clearTimeout(timeout);
  }, [whatIfForm, model]);

  const origPct = Math.round(originalResult.probability * 100);
  const newPct = whatIfResult ? Math.round(whatIfResult.probability * 100) : origPct;
  const diff = newPct - origPct;
  const riskColor = (level) => level === "Low" ? "#2D7A58" : level === "Moderate" ? "#C67D3B" : "#B35D52";

  return (
    <div className="glossy-card p-5 sm:p-6 border border-[#E5E0D6] shadow-sm">
      <div className="flex items-center gap-2 mb-1">
        <Sliders size={16} className="text-[#35483E]" />
        <p className="text-[#35483E] font-serif font-semibold text-base">What-If Parameter Sensitivity</p>
      </div>
      <p className="text-xs text-[#52665A] mb-4">Adjust clinical variables to observe real-time risk trajectory changes</p>

      {/* Risk comparison */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="rounded-xl p-3.5 text-center bg-white/80 border border-[#E5E0D6]">
          <p className="text-[11px] text-[#52665A] uppercase tracking-wider mb-1 font-medium">Original Baseline</p>
          <p className="font-serif text-2xl font-bold" style={{ color: riskColor(originalResult.risk_level) }}>{origPct}%</p>
          <p className="text-xs mt-0.5 font-medium" style={{ color: riskColor(originalResult.risk_level) }}>{originalResult.risk_level} Risk</p>
        </div>
        <div className="rounded-xl p-3.5 text-center bg-white/80 border border-[#E5E0D6]">
          <p className="text-[11px] text-[#52665A] uppercase tracking-wider mb-1 font-medium">Simulated Outcome {loading && <span className="animate-pulse">...</span>}</p>
          <p className="font-serif text-2xl font-bold" style={{ color: riskColor(whatIfResult?.risk_level || originalResult.risk_level) }}>{newPct}%</p>
          <p className="text-xs mt-0.5 font-bold font-mono" style={{ color: diff > 0 ? "#B35D52" : diff < 0 ? "#2D7A58" : "#52665A" }}>
            {diff > 0 ? `+${diff}%` : diff < 0 ? `${diff}%` : "No delta"}
          </p>
        </div>
      </div>

      {/* Sliders for numeric fields */}
      <div className="space-y-4">
        {NUMERIC_FIELDS.map(field => (
          <div key={field.key}>
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-[#35483E] font-medium">{field.label}</span>
              <span className="text-[#52665A] font-mono font-semibold">{whatIfForm[field.key]} {field.unit}</span>
            </div>
            <input
              type="range"
              min={field.min}
              max={field.max}
              step={field.step}
              value={whatIfForm[field.key]}
              onChange={e => setWhatIfForm(f => ({ ...f, [field.key]: parseFloat(e.target.value) }))}
              className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-[#E5E0D6] accent-[#35483E]"
            />
            <div className="flex justify-between text-[10px] text-[#8A9990] font-mono mt-0.5">
              <span>{field.min} {field.unit}</span>
              <span>{field.max} {field.unit}</span>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => setWhatIfForm({ ...originalForm })}
        className="mt-5 w-full py-2.5 rounded-xl border border-[#E5E0D6] bg-white/70 hover:bg-[#E4EDE5]/60 text-[#52665A] hover:text-[#35483E] text-xs font-medium transition-all cursor-pointer"
      >
        Reset Simulation to Baseline Values
      </button>
    </div>
  );
}

function EnsembleResults({ ensembleResults, votes }) {
  if (!ensembleResults) return null;
  const models = [
    { key: "logistic_regression", label: "Logistic Regression", icon: "📈" },
    { key: "random_forest", label: "Random Forest", icon: "🌲" },
    { key: "knn", label: "K-Nearest Neighbors", icon: "🔵" },
  ];
  return (
    <div className="glossy-card p-5 sm:p-6 border border-[#E5E0D6] shadow-sm">
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs text-[#52665A] uppercase tracking-wider font-semibold">Ensemble Model Consensus</p>
        <span className="text-[11px] text-[#8A9990] font-mono">Majority Vote</span>
      </div>
      <p className="text-[#52665A] text-xs mb-4">Individual model predictions across trained classifiers</p>
      <div className="space-y-2.5">
        {models.map(({ key, label, icon }) => {
          const r = ensembleResults[key];
          if (!r) return null;
          const positive = r.prediction === 1;
          const color = positive ? "#B35D52" : "#2D7A58";
          return (
            <div key={key} className="flex items-center gap-3 p-3 rounded-xl bg-white/80 border border-[#E5E0D6]">
              <span className="text-base">{icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-[#35483E] font-medium truncate">{label}</p>
                <div className="h-1.5 rounded-full bg-[#E4EDE5] mt-1.5 overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${r.probability * 100}%`, background: color }} />
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs font-mono font-bold" style={{ color }}>{Math.round(r.probability * 100)}%</p>
                <p className="text-[11px] font-medium" style={{ color }}>{positive ? "Positive" : "Negative"}</p>
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-4 pt-3.5 border-t border-[#E5E0D6] flex items-center justify-between">
        <p className="text-xs text-[#52665A]">Consensus Vote Count</p>
        <div className="flex items-center gap-1.5">
          {[0, 1, 2].map(i => {
            const votedPos = i < (votes?.heart_disease || 0);
            return (
              <div
                key={i}
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  votedPos ? "bg-[#B35D52] text-white" : "bg-[#E4EDE5] text-[#52665A]"
                }`}
              >
                {votedPos ? "✓" : "—"}
              </div>
            );
          })}
          <span className="text-xs font-mono text-[#35483E] font-semibold ml-1.5">
            {votes?.heart_disease || 0}/3 Positive
          </span>
        </div>
      </div>
    </div>
  );
}

function FieldInput({ field, value, onChange }) {
  if (field.type === "select") {
    return (
      <select
        className="glossy-input w-full px-3.5 py-2.5 text-sm cursor-pointer"
        value={value}
        onChange={e => onChange(field.key, Number(e.target.value))}
      >
        {field.options.map(o => (
          <option key={o.v} value={o.v}>
            {o.l}
          </option>
        ))}
      </select>
    );
  }
  return (
    <div className="relative">
      <input
        type="number"
        className="glossy-input w-full px-3.5 py-2.5 text-sm ltr:pr-14 rtl:pl-14"
        value={value}
        min={field.min}
        max={field.max}
        step={field.step}
        onChange={e => onChange(field.key, parseFloat(e.target.value))}
      />
      {field.unit && (
        <span className="absolute ltr:right-3.5 rtl:left-3.5 top-1/2 -translate-y-1/2 text-xs text-[#8A9990] font-mono pointer-events-none">
          {field.unit}
        </span>
      )}
    </div>
  );
}

function ShapWaterfall({ shapValues, featureNames }) {
  const data = featureNames.map((name, i) => ({ name, value: shapValues[i] }))
    .sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
    .slice(0, 10);
  const maxAbs = Math.max(...data.map(d => Math.abs(d.value))) || 1;
  return (
    <div className="space-y-2.5">
      {data.map(({ name, value }) => {
        const pct = Math.abs(value) / maxAbs * 100;
        const positive = value > 0;
        return (
          <div key={name} className="flex items-center gap-2.5 sm:gap-3 text-xs">
            <span className="w-24 sm:w-28 text-end text-[#52665A] font-mono font-medium truncate shrink-0">
              {FIELD_LABELS[name] || name}
            </span>
            <div className="flex-1 flex items-center gap-1">
              {positive ? (
                <>
                  <div className="flex-1" />
                  <div
                    className="h-4 sm:h-4.5 rounded-sm transition-all duration-500"
                    style={{ width: `${Math.max(pct / 2, 3)}%`, background: "#B35D52" }}
                  />
                </>
              ) : (
                <>
                  <div
                    className="h-4 sm:h-4.5 rounded-sm ml-auto transition-all duration-500"
                    style={{ width: `${Math.max(pct / 2, 3)}%`, background: "#2D7A58" }}
                  />
                  <div className="flex-1" />
                </>
              )}
            </div>
            <span className={`w-16 font-mono font-bold text-end shrink-0 ${positive ? "text-[#B35D52]" : "text-[#2D7A58]"}`}>
              {value > 0 ? "+" : ""}{value.toFixed(3)}
            </span>
          </div>
        );
      })}
      <div className="flex justify-between text-[11px] text-[#8A9990] pt-2 border-t border-[#E5E0D6] px-2 font-medium">
        <span className="text-[#2D7A58]">← Reduces risk</span>
        <span className="text-[#B35D52]">Increases risk →</span>
      </div>
    </div>
  );
}

export default function PredictPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const FIELDS = useFields();
  const [form, setForm] = useState(buildDefaults());
  const [model, setModel] = useState("random_forest");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [patientNameTouched, setPatientNameTouched] = useState(false);
  const [prefilledFromProfile, setPrefilledFromProfile] = useState(false);
  const [profileCooldown, setProfileCooldown] = useState(null);
  const userEditedRef = useRef(false);
  const modelLabel = MODELS.find(m => m.key === model)?.label || model;
  const handleChange = (key, val) => {
    userEditedRef.current = true;
    setForm(f => ({ ...f, [key]: val }));
  };
  const resultRef = useRef(null);
  const [alarmTrigger, setAlarmTrigger] = useState(0);

  // Automatic profile prefill: Use authenticated profile as single source of truth
  useEffect(() => {
    let isMounted = true;
    if (user) {
      getProfile()
        .then((res) => {
          if (!isMounted || !res?.data) return;
          const p = res.data;
          if (p.cooldowns?.name) {
            setProfileCooldown(p.cooldowns.name);
          }
          setForm((prev) => {
            if (userEditedRef.current) return prev;
            const next = { ...prev };
            let didPrefill = false;

            if (!prev.patient_name || prev.patient_name.trim() === "") {
              if (p.name && p.name.trim()) {
                next.patient_name = p.name.trim();
                didPrefill = true;
              }
            }

            if (!prev.patient_id || prev.patient_id.trim() === "") {
              if (p.patient_id && p.patient_id.trim()) {
                next.patient_id = p.patient_id.trim();
                didPrefill = true;
              }
            }

            if (p.age && typeof p.age === "number" && prev.age === 52) {
              next.age = p.age;
              didPrefill = true;
            }

            if (didPrefill) {
              setPrefilledFromProfile(true);
            }
            return next;
          });
        })
        .catch(() => {});
    }
    return () => {
      isMounted = false;
    };
  }, [user]);

  const handleSubmit = async () => {
    const trimmedPatientName = (form.patient_name || "").trim();
    if (!trimmedPatientName) {
      setPatientNameTouched(true);
      toast.error(t("predict.patient_name_required", "Please enter a valid patient legal name to proceed."));
      const inputEl = document.getElementById("patient-name-input");
      if (inputEl) inputEl.focus();
      return;
    }

    setLoading(true);
    setResult(null);
    try {
      const sanitizedForm = {
        ...form,
        patient_name: trimmedPatientName,
        patient_id: (form.patient_id || "").trim() || undefined,
      };
      const payload = model === "ensemble"
        ? { ...sanitizedForm, model: "random_forest", ensemble: true }
        : { ...sanitizedForm, model };
      const { data } = await predict(payload);
      setResult(data);
      if (data.risk_level === "High") {
        setAlarmTrigger(prev => prev + 1);
      }
      toast.success("Prediction complete!");
      // Smooth scroll to results
      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 150);
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Backend error.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#F7F5F0] text-[#35483E] relative pb-28 sm:pb-20 selection:bg-[#E4EDE5] selection:text-[#35483E]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        <ECGBackground />

        {/* Page Header */}
        <div className="mb-8 sm:mb-10 animate-fadeinup relative z-10">
          <div className="flex items-center gap-2 text-[#52665A] text-xs font-mono uppercase tracking-widest mb-2.5">
            <div className="w-1.5 h-1.5 rounded-full bg-[#B35D52] animate-pulse" />
            <span>{t("predict.title", "Cardiovascular").toUpperCase()} · {t("predict.subtitle_tag", "RESEARCH & EDUCATION RISK ASSESSMENT")}</span>
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-normal text-[#35483E] tracking-tight leading-tight">
            {t("predict.title", "Heart Disease")}<br />
            <span className="italic font-serif text-[#B35D52]">{t("predict.title2", "Prediction Model")}</span>
          </h1>
          <p className="text-[#52665A] mt-3 max-w-2xl text-xs sm:text-sm leading-relaxed">
            {t("predict.subtitle", "Enter clinical observations to calculate multi-model cardiovascular risk estimates, inspect SHAP feature contributions, and explore physiological parameter sensitivity.")}
          </p>
        </div>

        {/* ── Section 1: Clinical Workflow Grid (Two-Column Desktop with Sticky Summary) ── */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start relative z-10">
          {/* Left Column: Clinical Assessment Workstation (Inputs & Actions) */}
          <div className="lg:col-span-7 xl:col-span-7 space-y-6">
            {/* Algorithm Selector & Patient Reference Bar */}
            <div className="glossy-card p-5 sm:p-6 space-y-5 border border-[#E5E0D6] shadow-sm">
              <div className="tour-model-selector">
                <div className="flex items-center justify-between mb-2.5">
                  <p className="text-xs text-[#52665A] uppercase tracking-wider font-semibold">
                    {t("predict.select_algorithm", "Select Prediction Algorithm")}
                  </p>
                  <span className="text-[11px] text-[#8A9990] font-mono">5 Models Available</span>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {MODELS.map(m => {
                    const active = model === m.key;
                    return (
                      <button
                        key={m.key}
                        type="button"
                        onClick={() => setModel(m.key)}
                        className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all duration-200 border ${
                          active
                            ? "bg-[#35483E] text-white border-[#35483E] shadow-sm"
                            : "bg-white/80 text-[#52665A] border-[#E5E0D6] hover:bg-[#E4EDE5]/60 hover:text-[#35483E]"
                        }`}
                      >
                        <span className="text-base">{m.icon}</span>
                        <span>{m.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="tour-patient-form pt-4 border-t border-[#E5E0D6] space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                  <div className="flex items-center gap-1.5">
                    <User size={13} className="text-[#35483E]" />
                    <span className="text-xs font-semibold text-[#35483E] uppercase tracking-wider">
                      {t("predict.patient_identity_section", "Patient Identification Record")}
                    </span>
                  </div>
                  {prefilledFromProfile && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-medium bg-[#E4EDE5] text-[#2D7A58] border border-[#D3DFD5] self-start sm:self-auto">
                      <CheckCircle size={10} className="text-[#2D7A58]" />
                      <span>{t("predict.prefilled_badge", "Prefilled from Health Profile")}</span>
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* Field 1: Permanent Patient ID (Immutable & Read-Only) */}
                  <div className="space-y-1.5 p-3 rounded-xl bg-white/70 border border-[#E5E0D6]">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-semibold text-[#52665A] uppercase tracking-wider flex items-center gap-1">
                        <Lock size={11} className="text-[#35483E]" />
                        <span>{t("predict.patient_id_label", "Permanent Patient ID")}</span>
                      </label>
                      <span className="text-[10px] font-mono text-[#2D7A58] bg-[#E4EDE5] px-1.5 py-0.5 rounded border border-[#D3DFD5]">
                        Immutable
                      </span>
                    </div>
                    <input
                      type="text"
                      readOnly
                      tabIndex={-1}
                      value={form.patient_id || (user ? "Pending Assignment" : "Unassigned (Guest Session)")}
                      className="glossy-input w-full px-3 py-2 text-xs sm:text-sm font-mono font-bold text-[#35483E] bg-[#FAF8F5] cursor-not-allowed select-all border-[#E5E0D6]"
                      title="Permanent cryptographic identifier assigned to this account. Never editable."
                    />
                    <p className="text-[10px] text-[#8A9990] flex items-center gap-1">
                      <span>{t("predict.patient_id_sub", "Cryptographically bound to authenticated record.")}</span>
                    </p>
                  </div>

                  {/* Field 2: Patient Legal Name (48h Window or Read-Only) */}
                  <div className="space-y-1.5 p-3 rounded-xl bg-white/70 border border-[#E5E0D6]">
                    <div className="flex items-center justify-between flex-wrap gap-1">
                      <label htmlFor="patient-name-input" className="text-[11px] font-semibold text-[#52665A] uppercase tracking-wider flex items-center gap-1">
                        <span>{t("predict.patient_legal_name", "Patient Legal Name")}</span>
                        <span className="text-[#B35D52] font-bold" title="Required">*</span>
                      </label>
                      {user && profileCooldown ? (
                        profileCooldown.can_edit ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-mono text-[#2D7A58] bg-[#E4EDE5] px-1.5 py-0.5 rounded border border-[#D3DFD5]">
                            <span>Editable ({profileCooldown.remaining_hours}h left)</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-mono text-[#B35D52] bg-[#FAF0EE] px-1.5 py-0.5 rounded border border-[#F0D5D1]">
                            <Lock size={9} />
                            <span>Locked (48h passed)</span>
                          </span>
                        )
                      ) : null}
                    </div>

                    <input
                      id="patient-name-input"
                      type="text"
                      readOnly={user && profileCooldown && !profileCooldown.can_edit}
                      className={`glossy-input w-full px-3 py-2 text-xs sm:text-sm transition-colors ${
                        user && profileCooldown && !profileCooldown.can_edit
                          ? "bg-[#FAF8F5] text-[#35483E] font-medium cursor-not-allowed opacity-90 border-[#E5E0D6]"
                          : patientNameTouched && !(form.patient_name && form.patient_name.trim().length > 0)
                          ? "border-[#B35D52] focus:border-[#B35D52] focus:ring-[#B35D52]/20"
                          : ""
                      }`}
                      placeholder={t("predict.patient_name_placeholder", "e.g., Dr. Sarah Jenkins")}
                      value={form.patient_name || ""}
                      aria-invalid={patientNameTouched && !(form.patient_name && form.patient_name.trim().length > 0)}
                      aria-describedby={patientNameTouched && !(form.patient_name && form.patient_name.trim().length > 0) ? "patient-name-error" : undefined}
                      onBlur={() => setPatientNameTouched(true)}
                      onChange={e => {
                        userEditedRef.current = true;
                        handleChange("patient_name", e.target.value);
                        if (!patientNameTouched) setPatientNameTouched(true);
                      }}
                    />

                    {patientNameTouched && !(form.patient_name && form.patient_name.trim().length > 0) && (
                      <p id="patient-name-error" role="alert" className="text-[11px] text-[#B35D52] font-medium mt-1 flex items-center gap-1 animate-fadeinup">
                        <AlertCircle size={12} className="shrink-0" />
                        <span>{t("predict.patient_name_required", "Please enter a valid patient legal name to proceed.")}</span>
                      </p>
                    )}

                    {user && profileCooldown && !profileCooldown.can_edit && (
                      <div className="flex items-center justify-between pt-0.5 text-[10px]">
                        <span className="text-[#8A9990]">Permanent legal name.</span>
                        <Link
                          to="/dashboard?setup=true"
                          className="text-[#35483E] underline font-semibold hover:text-[#2D7A58]"
                        >
                          Request Correction &rarr;
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Clinical Assessment Workstation Domains */}
            <div className="glossy-card p-5 sm:p-7 space-y-7 border border-[#E5E0D6] shadow-sm">
              {/* Domain 1: Demographics & Presentation */}
              <div className="form-group-card space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#E5E0D6]">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-[11px] font-bold text-[#35483E] bg-[#E4EDE5] px-2 py-0.5 rounded-md border border-[#D3DFD5]">
                      01
                    </span>
                    <div>
                      <h3 className="font-serif font-semibold text-[#35483E] text-sm tracking-wide uppercase">
                        Demographics & Presentation
                      </h3>
                      <p className="text-[11px] text-[#607368]">
                        Patient baseline indicators and chest pain characteristics
                      </p>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {FIELDS.filter(f => ["age", "sex", "cp"].includes(f.key)).map(field => (
                    <div key={field.key}>
                      <label className="block text-xs text-[#52665A] mb-1.5 font-medium">
                        {field.label}
                        {field.hint && <span className="text-[#8A9990] ml-1 font-normal font-sans">({field.hint})</span>}
                      </label>
                      <FieldInput field={field} value={form[field.key]} onChange={handleChange} />
                    </div>
                  ))}
                </div>
              </div>

              {/* Domain 2: Hemodynamics & Metabolic Panel */}
              <div className="form-group-card space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#E5E0D6]">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-[11px] font-bold text-[#35483E] bg-[#E4EDE5] px-2 py-0.5 rounded-md border border-[#D3DFD5]">
                      02
                    </span>
                    <div>
                      <h3 className="font-serif font-semibold text-[#35483E] text-sm tracking-wide uppercase">
                        Hemodynamics & Metabolic Panel
                      </h3>
                      <p className="text-[11px] text-[#607368]">
                        Resting blood pressure, serum cholesterol, and fasting blood sugar
                      </p>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {FIELDS.filter(f => ["trestbps", "chol", "fbs"].includes(f.key)).map(field => (
                    <div key={field.key}>
                      <label className="block text-xs text-[#52665A] mb-1.5 font-medium">
                        {field.label}
                        {field.hint && <span className="text-[#8A9990] ml-1 font-normal font-sans">({field.hint})</span>}
                      </label>
                      <FieldInput field={field} value={form[field.key]} onChange={handleChange} />
                    </div>
                  ))}
                </div>
              </div>

              {/* Domain 3: Electrocardiography & Cardiac Diagnostics */}
              <div className="form-group-card space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#E5E0D6]">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-[11px] font-bold text-[#35483E] bg-[#E4EDE5] px-2 py-0.5 rounded-md border border-[#D3DFD5]">
                      03
                    </span>
                    <div>
                      <h3 className="font-serif font-semibold text-[#35483E] text-sm tracking-wide uppercase">
                        Electrocardiography & Cardiac Diagnostics
                      </h3>
                      <p className="text-[11px] text-[#607368]">
                        Resting ECG, exercise stress response, fluoroscopy vessels, and thallium scan
                      </p>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {FIELDS.filter(f => ["restecg", "thalach", "exang", "oldpeak", "slope", "ca", "thal"].includes(f.key)).map(field => (
                    <div key={field.key}>
                      <label className="block text-xs text-[#52665A] mb-1.5 font-medium">
                        {field.label}
                        {field.hint && <span className="text-[#8A9990] ml-1 font-normal font-sans">({field.hint})</span>}
                      </label>
                      <FieldInput field={field} value={form[field.key]} onChange={handleChange} />
                    </div>
                  ))}
                </div>
              </div>

              {/* Workstation Actions */}
              <div className="pt-2 border-t border-[#E5E0D6] flex flex-col sm:flex-row gap-3.5 tour-run-btn">
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={loading}
                  className="glossy-btn-primary flex-1 flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl font-medium text-white text-sm sm:text-base transition-all duration-200 disabled:opacity-60 shadow-sm cursor-pointer"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>{t("predict.analyzing", "Running Clinical Analysis...")}</span>
                    </>
                  ) : (
                    <>
                      <Heart size={16} className="fill-white" />
                      <span>{t("predict.run_prediction", "Run Risk Assessment")}</span>
                      <ChevronRight size={16} />
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    userEditedRef.current = true;
                    setForm(buildDefaults());
                    setResult(null);
                    setPatientNameTouched(false);
                    setPrefilledFromProfile(false);
                  }}
                  className="glossy-btn-secondary flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer"
                >
                  <RotateCcw size={15} />
                  <span>{t("predict.reset", "Reset Form")}</span>
                </button>
              </div>
            </div>

            {/* Educational Disclaimer */}
            <div className="rounded-xl p-4 bg-[#E4EDE5]/40 border border-[#E5E0D6] flex items-start gap-3">
              <AlertCircle size={16} className="text-[#52665A] shrink-0 mt-0.5" />
              <p className="text-xs text-[#52665A] leading-relaxed">
                <strong>Educational & Research Demonstration Only:</strong> CardioScan estimations are intended solely for academic research and workflow demonstration. They must not be used as clinical diagnostic tools or medical advice.
              </p>
            </div>
          </div>

          {/* Right Column: Sticky Summary & Outcome Panel */}
          <div className="lg:col-span-5 xl:col-span-5 lg:sticky lg:top-24 space-y-6">
            {!result && !loading && (
              <div className="glossy-card p-5 sm:p-6 flex flex-col items-center justify-center text-center border border-[#E5E0D6] shadow-sm">
                <div className="w-11 h-11 rounded-xl bg-[#E4EDE5] border border-[#E5E0D6] flex items-center justify-center mb-3 text-[#35483E] shadow-2xs">
                  <Heart size={20} className="text-[#35483E]" />
                </div>
                <h4 className="font-serif font-semibold text-base text-[#35483E] mb-1">
                  {t("predict.awaiting", "Ready for Clinical Input")}
                </h4>
                <p className="text-[#52665A] text-xs max-w-xs leading-relaxed">
                  {t("predict.awaiting_sub", "Complete the clinical features on the left and select an algorithm to generate multi-model cardiovascular risk estimations.")}
                </p>
                <div className="mt-4 pt-3 border-t border-[#E5E0D6]/70 w-full flex items-center justify-center gap-2 text-[10px] sm:text-[11px] text-[#8A9990] font-mono">
                  <span>13 Features</span> · <span>5 ML Models</span> · <span>SHAP Explainability</span>
                </div>
              </div>
            )}

            {loading && (
              <div className="glossy-card p-5 sm:p-6 flex flex-col items-center justify-center text-center border border-[#E5E0D6] shadow-sm">
                <div className="relative mb-3.5">
                  <div className="w-14 h-14 rounded-full border-2 border-[#E5E0D6] flex items-center justify-center">
                    <div className="w-10 h-10 rounded-full border-2 border-[#35483E]/20 border-t-[#35483E] animate-spin" />
                  </div>
                  <Heart size={16} className="text-[#B35D52] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 fill-[#B35D52]" />
                </div>
                <p className="text-[#35483E] font-serif font-semibold text-sm sm:text-base">{t("predict.running", "Analyzing Biomarkers...")}</p>
                <p className="text-[#52665A] text-xs mt-1">{t("predict.computing", "Evaluating model weights and SHAP explanations...")}</p>
              </div>
            )}

            {result && (
              <div id="predict-results" className="space-y-6">
                <div ref={resultRef} className="scroll-mt-24" />
                <ResultReveal
                  result={result}
                  modelLabel={modelLabel}
                  onDownload={() => generatePDF(form, result, modelLabel)}
                />
              </div>
            )}
          </div>
        </section>

        {/* ── Section 2: Full-Width Lower Analysis Section (SHAP & What-If) ── */}
        {result && (
          <section className="mt-10 sm:mt-12 pt-8 sm:pt-10 border-t border-[#E5E0D6] space-y-6 relative z-10 animate-fadeinup scroll-mt-24">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <p className="text-xs font-mono uppercase tracking-wider text-[#607368] font-semibold">
                  In-Depth Clinical Interpretability & Physiological Simulation
                </p>
                <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#35483E] tracking-tight">
                  Biomarker Attribution & Sensitivity
                </h2>
              </div>
              <span className="text-xs font-mono text-[#52665A] bg-[#E4EDE5] px-3 py-1 rounded-full border border-[#D3DFD5] self-start sm:self-auto">
                SHAP & Dynamic Sensitivity
              </span>
            </div>

            {/* Side-by-Side Analysis Grid on Desktop */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 items-start">
              {/* Left Analysis: Biomarker Feature Contributions (SHAP) + Ensemble consensus */}
              <div className="space-y-6">
                <div className="glossy-card p-5 sm:p-6 border border-[#E5E0D6] shadow-sm">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs text-[#52665A] uppercase tracking-wider font-semibold">
                      {t("predict.feature_contributions", "Biomarker Feature Contributions")}
                    </p>
                    <span className="text-[11px] text-[#8A9990] font-mono">SHAP Waterfall</span>
                  </div>
                  <p className="text-[#52665A] text-xs mb-4">
                    {t("predict.shap_desc", "Relative directional contribution of each patient feature to the calculated risk score.")}
                  </p>
                  <ShapWaterfall shapValues={result.shap_values} featureNames={result.feature_names} />
                </div>

                {result.ensemble_results && (
                  <EnsembleResults ensembleResults={result.ensemble_results} votes={result.votes} />
                )}
              </div>

              {/* Right Analysis: What-If Parameter Sensitivity */}
              <div>
                <WhatIfAnalysis originalForm={form} originalResult={result} model={model} />
              </div>
            </div>
          </section>
        )}

        {/* ── Section 3: Restrained Page Ending Footer ── */}
        <footer className="mt-16 pt-8 pb-10 sm:pb-4 border-t border-[#E5E0D6] relative z-10">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#52665A]">
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-lg bg-[#35483E] text-white flex items-center justify-center">
                <Heart size={13} className="fill-white" />
              </div>
              <span className="font-serif font-bold text-[#35483E] text-sm tracking-tight">CardioScan</span>
              <span className="text-[#8A9990]">·</span>
              <span className="text-[11px] text-[#607368]">Cardiovascular Research & Education Platform</span>
            </div>

            <div className="flex items-center gap-4 text-[11px]">
              <Link to="/" className="text-[#52665A] hover:text-[#35483E] transition-colors">
                Home
              </Link>
              <Link to="/privacy" className="text-[#52665A] hover:text-[#35483E] transition-colors">
                Privacy Policy
              </Link>
              <Link to="/terms" className="text-[#52665A] hover:text-[#35483E] transition-colors">
                Terms & Conditions
              </Link>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-[#E5E0D6]/60 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-[#8A9990]">
            <p className="max-w-xl text-center sm:text-start leading-relaxed">
              <strong>Academic & Educational Notice:</strong> Statistical machine-learning estimates are for research exploration only and do not constitute clinical diagnoses or medical advice.
            </p>
            <span className="font-mono text-[10px] shrink-0">
              CardioScan · Research & Education
            </span>
          </div>
        </footer>

        {/* ── Floating Educational Research Assistant (ChatBot) ── */}
        <FloatingChatAssistant form={form} result={result} modelLabel={modelLabel} />

        <HeartbeatOverlay visible={loading} />
        <RiskAlarm trigger={alarmTrigger} riskLevel={result?.risk_level} />
        <OnboardingTour />
      </div>
    </div>
  );
}
