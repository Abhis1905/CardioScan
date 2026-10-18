import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart } from "lucide-react";

const STEPS = [
  { text: "Reading patient vitals...", icon: "📋", duration: 1200 },
  { text: "Calibrating ML models...", icon: "🧠", duration: 1400 },
  { text: "Running inference...", icon: "⚡", duration: 1000 },
  { text: "Computing SHAP values...", icon: "🔬", duration: 1800 },
  { text: "Generating report...", icon: "📊", duration: 800 },
];

export default function AnalyzingSequence() {
  const [stepIndex, setStepIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let elapsed = 0;
    const total = STEPS.reduce((s, x) => s + x.duration, 0);
    let stepStart = 0;

    STEPS.forEach((step, i) => {
      setTimeout(() => setStepIndex(i), stepStart);
      stepStart += step.duration;
    });

    const interval = setInterval(() => {
      elapsed += 40;
      setProgress(Math.min((elapsed / total) * 100, 95));
      if (elapsed >= total) clearInterval(interval);
    }, 40);

    return () => clearInterval(interval);
  }, []);

  const step = STEPS[stepIndex];

  return (
    <div className="glossy-card p-8 flex flex-col items-center justify-center min-h-[320px] gap-6">
      {/* Heart indicator */}
      <div className="relative">
        <motion.div
          animate={{ scale: [1, 1.08, 1, 1.04, 1] }}
          transition={{ duration: 1.2, repeat: Infinity, repeatDelay: 0.4 }}
          className="w-20 h-20 rounded-2xl bg-[#E4EDE5] border border-[#E5E0D6] flex items-center justify-center text-[#B35D52]"
          style={{ boxShadow: "0 10px 25px -5px rgba(53, 72, 62, 0.1)" }}>
          <Heart size={32} className="text-[#B35D52] fill-[#B35D52]"/>
        </motion.div>
      </div>

      {/* Step text */}
      <div className="text-center">
        <AnimatePresence mode="wait">
          <motion.div key={stepIndex}
            initial={{ opacity: 0, y: 10, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -10, filter: "blur(4px)" }}
            transition={{ duration: 0.3 }}
            className="flex items-center gap-2 justify-center">
            <span className="text-xl">{step.icon}</span>
            <span className="text-[#35483E] font-serif font-semibold">{step.text}</span>
          </motion.div>
        </AnimatePresence>
        <p className="text-[#52665A] text-xs mt-2 font-mono">
          Step {stepIndex + 1} of {STEPS.length}
        </p>
      </div>

      {/* Progress bar */}
      <div className="w-full max-w-xs">
        <div className="h-1.5 rounded-full bg-[#E5E0D6] overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ background: "linear-gradient(90deg,#35483E,#52665A)" }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.1, ease: "linear" }}
          />
        </div>
        <div className="flex justify-between text-xs text-[#52665A] mt-1 font-mono">
          <span>Analyzing</span>
          <span>{Math.round(progress)}%</span>
        </div>
      </div>

      {/* ECG line */}
      <svg className="w-48 h-8 opacity-60" viewBox="0 0 200 30" fill="none">
        <motion.polyline
          points="0,15 30,15 40,5 50,25 60,15 80,15 95,2 105,28 115,15 130,15 140,10 150,20 160,15 200,15"
          fill="none" stroke="#B35D52" strokeWidth="1.5"
          strokeLinecap="round" strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: [0, 1, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />
      </svg>
    </div>
  );
}
