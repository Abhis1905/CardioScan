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
    <div className="glass-card p-8 flex flex-col items-center justify-center min-h-[320px] gap-6">
      {/* Pulsing heart */}
      <div className="relative">
        <motion.div
          animate={{ scale: [1, 1.3, 1, 1.15, 1] }}
          transition={{ duration: 0.8, repeat: Infinity, repeatDelay: 0.4 }}
          className="w-20 h-20 rounded-2xl bg-crimson-500/20 border border-crimson-500/30 flex items-center justify-center"
          style={{ boxShadow: "0 0 30px rgba(244,63,94,0.2)" }}>
          <Heart size={32} className="text-crimson-400 fill-crimson-400"/>
        </motion.div>
        {/* Ripple rings */}
        {[0,1,2].map(i => (
          <motion.div key={i}
            className="absolute inset-0 rounded-2xl border border-crimson-500/20"
            animate={{ scale: [1, 1.8], opacity: [0.4, 0] }}
            transition={{ duration: 1.5, delay: i * 0.5, repeat: Infinity, ease: "easeOut" }}
          />
        ))}
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
            <span className="text-white font-display font-semibold">{step.text}</span>
          </motion.div>
        </AnimatePresence>
        <p className="text-slate-600 text-xs mt-2 font-mono">
          Step {stepIndex + 1} of {STEPS.length}
        </p>
      </div>

      {/* Progress bar */}
      <div className="w-full max-w-xs">
        <div className="h-1 rounded-full bg-slate-800 overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ background: "linear-gradient(90deg,#be123c,#f43f5e,#fb7185)" }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.1, ease: "linear" }}
          />
        </div>
        <div className="flex justify-between text-xs text-slate-700 mt-1 font-mono">
          <span>Analyzing</span>
          <span>{Math.round(progress)}%</span>
        </div>
      </div>

      {/* ECG line */}
      <svg className="w-48 h-8 opacity-40" viewBox="0 0 200 30" fill="none">
        <motion.polyline
          points="0,15 30,15 40,5 50,25 60,15 80,15 95,2 105,28 115,15 130,15 140,10 150,20 160,15 200,15"
          fill="none" stroke="#f43f5e" strokeWidth="1.5"
          strokeLinecap="round" strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: [0, 1, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />
      </svg>
    </div>
  );
}
