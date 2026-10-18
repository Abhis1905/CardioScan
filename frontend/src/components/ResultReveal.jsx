import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { AlertCircle, CheckCircle, Download } from "lucide-react";

const FIELD_LABELS = {
  age: "Age",
  sex: "Biological Sex",
  cp: "Chest Pain Type",
  trestbps: "Resting BP",
  chol: "Cholesterol",
  fbs: "Fasting Blood Sugar",
  restecg: "Resting ECG",
  thalach: "Max Heart Rate",
  exang: "Exercise Angina",
  oldpeak: "ST Depression",
  slope: "ST Slope",
  ca: "Major Vessels",
  thal: "Thalassemia",
};

function CountUpNumber({ target, suffix = "%" }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let isMounted = true;
    const duration = 800;
    const steps = 30;
    const stepDuration = Math.max(16, Math.floor(duration / steps));
    let currentStep = 0;
    const timer = setInterval(() => {
      currentStep++;
      if (!isMounted) return;
      const nextVal = Math.min(target, Math.round((target / steps) * currentStep));
      setCount(nextVal);
      if (currentStep >= steps) {
        clearInterval(timer);
      }
    }, stepDuration);
    return () => {
      isMounted = false;
      clearInterval(timer);
    };
  }, [target]);
  return <>{count}{suffix}</>;
}

export default function ResultReveal({ result, modelLabel, onDownload, children }) {
  const isPositive = result.prediction === 1;
  const pct = Math.round(result.probability * 100);
  const color = result.risk_level === "Low" ? "#2D7A58" : result.risk_level === "Moderate" ? "#C67D3B" : "#B35D52";
  const circumference = 2 * Math.PI * 74; // ~464.96

  const topShap = result.feature_names && result.shap_values
    ? result.feature_names
        .map((name, i) => ({ name, value: result.shap_values[i] }))
        .sort((a, b) => Math.abs(b.value) - Math.abs(a.value))[0]
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-2xl overflow-hidden glossy-card text-[#35483E] border border-[#E5E0D6] shadow-sm"
    >
      {/* Top Header Bar */}
      <div className="px-5 py-3.5 flex items-center justify-between border-b border-[#E5E0D6] bg-white/70">
        <div className="flex items-center gap-2">
          <div
            className="w-2 h-2 rounded-full"
            style={{ background: color }}
          />
          <span className="text-xs font-mono font-semibold text-[#52665A] uppercase tracking-wider">
            Analysis Complete
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-medium text-[#35483E] bg-[#E4EDE5] px-2.5 py-0.5 rounded-md border border-[#D3DFD5]">
            {modelLabel}
          </span>
        </div>
      </div>

      <div className="p-5 sm:p-6 space-y-6">
        {/* Outcome Headline Banner (Decoupled & Responsive) */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-[#E5E0D6]">
          <div className="space-y-1.5 flex-1 min-w-0">
            <p className="text-[11px] text-[#607368] uppercase tracking-wider font-mono font-semibold">
              Estimated Outcome · Multi-Model Inference
            </p>
            <h2 className={`font-serif text-2xl sm:text-3xl font-bold tracking-tight ${isPositive ? "text-[#B35D52]" : "text-[#2D7A58]"}`}>
              {isPositive ? "Heart Disease Pattern Detected" : "No Heart Disease Pattern Detected"}
            </h2>
            <p className="text-xs sm:text-sm text-[#52665A] leading-relaxed">
              {isPositive
                ? "Biomarker constellation indicates elevated cardiovascular risk patterns requiring clinical evaluation."
                : "Biomarker indices align with normative cardiovascular profiles within trained parameter baselines."}
            </p>
          </div>

          <div className="shrink-0 self-start sm:self-center">
            <div
              className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center border shadow-xs"
              style={{
                background: isPositive ? "#FAF0EE" : "#E4EDE5",
                borderColor: isPositive ? "#F0D5D1" : "#C5D5C8",
              }}
            >
              {isPositive ? (
                <AlertCircle size={28} className="text-[#B35D52]" />
              ) : (
                <CheckCircle size={28} className="text-[#2D7A58]" />
              )}
            </div>
          </div>
        </div>

        {/* Circular Risk Gauge Section (Precision-Centered SVG) */}
        <div className="space-y-5 pb-5 border-b border-[#E5E0D6]">
          <div className="flex flex-col items-center justify-center">
            <div className="relative w-48 h-48 sm:w-52 sm:h-52 select-none">
              <svg
                width="200"
                height="200"
                viewBox="0 0 200 200"
                className="w-full h-full transform -rotate-90"
              >
                {/* Background track */}
                <circle
                  cx="100"
                  cy="100"
                  r="74"
                  fill="none"
                  stroke="#E5E0D6"
                  strokeWidth="10"
                />
                {/* 3 risk zone guide arcs */}
                <circle
                  cx="100"
                  cy="100"
                  r="74"
                  fill="none"
                  stroke="#2D7A58"
                  strokeWidth="10"
                  strokeOpacity="0.2"
                  strokeDasharray="155 310"
                  strokeDashoffset="0"
                />
                <circle
                  cx="100"
                  cy="100"
                  r="74"
                  fill="none"
                  stroke="#C67D3B"
                  strokeWidth="10"
                  strokeOpacity="0.2"
                  strokeDasharray="155 310"
                  strokeDashoffset="-155"
                />
                <circle
                  cx="100"
                  cy="100"
                  r="74"
                  fill="none"
                  stroke="#B35D52"
                  strokeWidth="10"
                  strokeOpacity="0.2"
                  strokeDasharray="155 310"
                  strokeDashoffset="-310"
                />
                {/* Active progress arc */}
                <motion.circle
                  cx="100"
                  cy="100"
                  r="74"
                  fill="none"
                  stroke={color}
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  initial={{ strokeDashoffset: circumference }}
                  animate={{ strokeDashoffset: circumference - (pct / 100) * circumference }}
                  transition={{ duration: 1.0, ease: [0.22, 1, 0.36, 1] }}
                />

                {/* SVG Centered Percentage and Label (Clean 18px separation) */}
                <g className="transform rotate-90 origin-center pointer-events-none">
                  <text
                    x="100"
                    y="88"
                    textAnchor="middle"
                    dominantBaseline="central"
                    className="font-serif font-bold fill-[#35483E]"
                    style={{ fontSize: "38px" }}
                  >
                    <CountUpNumber target={pct} />
                  </text>
                  <text
                    x="100"
                    y="124"
                    textAnchor="middle"
                    dominantBaseline="central"
                    className="font-mono font-semibold fill-[#52665A]"
                    style={{ fontSize: "9.5px", letterSpacing: "0.08em" }}
                  >
                    RISK PROBABILITY
                  </text>
                </g>
              </svg>
            </div>

            {/* Risk Level Badge */}
            <span
              className={`mt-3.5 px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide ${
                result.risk_level === "Low"
                  ? "bg-[#E4EDE5] text-[#2D7A58] border border-[#C5D5C8]"
                  : result.risk_level === "Moderate"
                  ? "bg-[#FDF3E7] text-[#C67D3B] border border-[#F3DFC9]"
                  : "bg-[#FAF0EE] text-[#B35D52] border border-[#F0D5D1]"
              }`}
            >
              {result.risk_level} Risk Level
            </span>
          </div>

          {/* Metric Overview Panels (Responsive: 1-col on mobile/desktop sidebar, 3-col on tablet) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 xl:grid-cols-1 gap-2.5">
            <div className="p-3.5 rounded-xl bg-white/80 border border-[#E5E0D6] flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-mono uppercase tracking-wider text-[#607368] font-medium">
                  Risk Classification
                </p>
                <p className="font-serif font-semibold text-sm text-[#35483E] mt-0.5 truncate">
                  {isPositive ? "Elevated Risk Indication" : "Normative Profile"}
                </p>
              </div>
              <span
                className={`shrink-0 text-xs font-mono font-bold px-2.5 py-1 rounded-md ${
                  isPositive ? "bg-[#FAF0EE] text-[#B35D52] border border-[#F0D5D1]" : "bg-[#E4EDE5] text-[#2D7A58] border border-[#C5D5C8]"
                }`}
              >
                {isPositive ? "POSITIVE" : "NEGATIVE"}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-white/80 border border-[#E5E0D6] flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-mono uppercase tracking-wider text-[#607368] font-medium">
                  Model Probability
                </p>
                <p className="font-serif font-semibold text-sm text-[#35483E] mt-0.5 truncate">
                  {(result.probability * 100).toFixed(1)}% Confidence
                </p>
              </div>
              <span className="shrink-0 text-xs font-mono font-bold text-[#35483E] bg-[#E4EDE5] px-2.5 py-1 rounded-md border border-[#D3DFD5]">
                {modelLabel}
              </span>
            </div>

            {topShap && (
              <div className="p-3.5 rounded-xl bg-white/80 border border-[#E5E0D6]">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-[#607368] font-medium">
                    Primary Biomarker Driver
                  </span>
                  <span
                    className="text-xs font-mono font-bold shrink-0"
                    style={{ color: topShap.value > 0 ? "#B35D52" : "#2D7A58" }}
                  >
                    {topShap.value > 0 ? "+" : ""}{topShap.value.toFixed(3)} SHAP
                  </span>
                </div>
                <p className="text-xs font-semibold text-[#35483E] truncate">
                  {FIELD_LABELS[topShap.name] || topShap.name}
                  <span className="text-[11px] font-normal text-[#52665A] ml-1.5 font-sans">
                    ({topShap.value > 0 ? "increases risk" : "attenuates risk"})
                  </span>
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Download Action */}
        <div>
          <button
            onClick={onDownload}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs sm:text-sm font-semibold text-[#35483E] glossy-btn-secondary shadow-2xs hover:border-[#35483E] transition-all cursor-pointer"
          >
            <Download size={15} />
            <span>Download Clinical Summary (PDF)</span>
          </button>
        </div>
      </div>

      {/* Children: SHAP waterfall and ensemble consensus */}
      {children}
    </motion.div>
  );
}
