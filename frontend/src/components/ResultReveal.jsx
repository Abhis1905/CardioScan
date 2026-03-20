import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, CheckCircle, Download, Activity } from "lucide-react";

function TypewriterText({ text, delay = 0, className }) {
  const [displayed, setDisplayed] = useState("");
  useEffect(() => {
    setDisplayed("");
    let i = 0;
    const t = setTimeout(() => {
      const interval = setInterval(() => {
        setDisplayed(text.slice(0, i + 1));
        i++;
        if (i >= text.length) clearInterval(interval);
      }, 35);
      return () => clearInterval(interval);
    }, delay);
    return () => clearTimeout(t);
  }, [text, delay]);
  return <span className={className}>{displayed}<span className="animate-pulse">|</span></span>;
}

function CountUpNumber({ target, delay = 0, suffix = "%" }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    setCount(0);
    const timeout = setTimeout(() => {
      const duration = 1200;
      const steps = 60;
      const increment = target / steps;
      let current = 0;
      let step = 0;
      const interval = setInterval(() => {
        step++;
        current = Math.min(target, Math.round(increment * step));
        setCount(current);
        if (step >= steps) clearInterval(interval);
      }, duration / steps);
      return () => clearInterval(interval);
    }, delay);
    return () => clearTimeout(timeout);
  }, [target, delay]);
  return <span>{count}{suffix}</span>;
}

function PulsingHeart({ active, color }) {
  return (
    <div className="relative flex items-center justify-center">
      {/* Ripple rings */}
      {active && [0, 1, 2].map(i => (
        <motion.div key={i}
          className="absolute rounded-full border"
          style={{ borderColor: `${color}40` }}
          initial={{ width: 48, height: 48, opacity: 0.8 }}
          animate={{ width: [48, 120], height: [48, 120], opacity: [0.6, 0] }}
          transition={{ duration: 1.5, delay: i * 0.5, repeat: Infinity, ease: "easeOut" }}
        />
      ))}
      <motion.div
        animate={active ? { scale: [1, 1.15, 1, 1.1, 1] } : { scale: 1 }}
        transition={{ duration: 0.8, repeat: active ? Infinity : 0, repeatDelay: 0.7 }}
        className="w-16 h-16 rounded-2xl flex items-center justify-center relative z-10"
        style={{
          background: `linear-gradient(135deg, ${color}20, ${color}10)`,
          border: `2px solid ${color}50`,
          boxShadow: `0 0 30px ${color}30`,
        }}>
        {active
          ? <AlertCircle size={32} style={{ color }} />
          : <CheckCircle size={32} style={{ color }} />}
      </motion.div>
    </div>
  );
}

export default function ResultReveal({ result, modelLabel, onDownload, children }) {
  const [phase, setPhase] = useState(0);
  // phase 0: scanning, 1: diagnosis shown, 2: gauge shown, 3: full

  useEffect(() => {
    setPhase(0);
    const timers = [
      setTimeout(() => setPhase(1), 400),
      setTimeout(() => setPhase(2), 1000),
      setTimeout(() => setPhase(3), 1800),
    ];
    return () => timers.forEach(clearTimeout);
  }, [result]);

  const isPositive = result.prediction === 1;
  const pct = Math.round(result.probability * 100);
  const color = result.risk_level === "Low" ? "#10b981" : result.risk_level === "Moderate" ? "#f59e0b" : "#f43f5e";
  const circumference = 2 * Math.PI * 54;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="relative rounded-2xl overflow-hidden"
      style={{
        background: isPositive
          ? "linear-gradient(145deg,rgba(244,63,94,0.06),rgba(13,20,36,0.98))"
          : "linear-gradient(145deg,rgba(16,185,129,0.06),rgba(13,20,36,0.98))",
        border: `1px solid ${color}35`,
        boxShadow: `0 0 60px ${color}15, 0 25px 60px rgba(0,0,0,0.5)`,
      }}>

      {/* Scan line */}
      <AnimatePresence>
        {phase === 0 && (
          <motion.div
            initial={{ top: 0, opacity: 0 }}
            animate={{ top: ["0%", "100%"], opacity: [0, 1, 1, 0] }}
            transition={{ duration: 0.6, ease: "linear" }}
            className="absolute left-0 right-0 h-0.5 z-20 pointer-events-none"
            style={{ background: `linear-gradient(90deg, transparent, ${color}, transparent)` }}
          />
        )}
      </AnimatePresence>

      {/* Top status bar */}
      <div className="px-5 pt-5 pb-3 flex items-center justify-between border-b border-white/5">
        <div className="flex items-center gap-2">
          <motion.div
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 1.2, repeat: Infinity }}
            className="w-2 h-2 rounded-full"
            style={{ background: color }}
          />
          <span className="text-xs font-mono text-slate-500 uppercase tracking-widest">
            ANALYSIS COMPLETE
          </span>
        </div>
        <span className="text-xs text-slate-600 font-mono">{modelLabel}</span>
      </div>

      <div className="p-5">
        {/* Diagnosis */}
        <AnimatePresence>
          {phase >= 1 && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-widest mb-1 font-mono">
                  DIAGNOSIS
                </p>
                <p className={`font-display text-xl font-bold ${isPositive ? "text-crimson-400" : "text-emerald-400"}`}>
                  <TypewriterText
                    text={isPositive ? "Heart Disease Detected" : "No Heart Disease"}
                    delay={0}
                  />
                </p>
              </div>
              <PulsingHeart active={isPositive} color={color} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Risk gauge */}
        <AnimatePresence>
          {phase >= 2 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 20 }}
              className="flex flex-col items-center py-3">

              <div className="relative w-44 h-44">
                {/* Glow */}
                <motion.div
                  animate={{ opacity: [0.15, 0.3, 0.15] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="absolute inset-0 rounded-full blur-2xl"
                  style={{ background: color }}
                />

                <svg width="176" height="176" viewBox="0 0 176 176" className="absolute inset-0">
                  {/* Background track */}
                  <circle cx="88" cy="88" r="54" fill="none"
                    stroke="rgba(255,255,255,0.05)" strokeWidth="10" />
                  {/* Colored segments */}
                  {[
                    { color: "#10b981", dash: 55, offset: 0 },
                    { color: "#f59e0b", dash: 55, offset: -55 },
                    { color: "#f43f5e", dash: 55, offset: -110 },
                  ].map((seg, i) => (
                    <circle key={i} cx="88" cy="88" r="54" fill="none"
                      stroke={seg.color} strokeWidth="10" strokeOpacity="0.15"
                      strokeDasharray={`${seg.dash} ${circumference - seg.dash}`}
                      strokeDashoffset={-seg.offset + circumference * 0.25}
                      transform="rotate(-90 88 88)" />
                  ))}
                  {/* Main progress */}
                  <motion.circle
                    cx="88" cy="88" r="54" fill="none"
                    stroke={color} strokeWidth="10" strokeLinecap="round"
                    strokeDasharray={circumference}
                    initial={{ strokeDashoffset: circumference }}
                    animate={{ strokeDashoffset: circumference - (pct / 100) * circumference }}
                    transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
                    transform="rotate(-90 88 88)"
                    style={{ filter: `drop-shadow(0 0 10px ${color})` }}
                  />
                </svg>

                {/* Center */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
                    className="font-display font-bold num-display text-center"
                    style={{ color, fontSize: "2.4rem", lineHeight: 1 }}>
                    <CountUpNumber target={pct} delay={300} />
                  </motion.div>
                  <span className="text-slate-500 text-xs mt-1 uppercase tracking-wider">risk</span>
                </div>
              </div>

              <motion.span
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
                className={`mt-3 px-4 py-1.5 rounded-full text-sm font-bold ${result.risk_level==="Low"?"risk-low":result.risk_level==="Moderate"?"risk-moderate":"risk-high"}`}
                style={{ boxShadow: `0 0 20px ${color}30` }}>
                {result.risk_level} Risk
              </motion.span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Download */}
        <AnimatePresence>
          {phase >= 3 && (
            <motion.button
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={onDownload}
              className="mt-2 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium text-slate-300 hover:text-white transition-all"
              style={{ border: `1px solid ${color}30`, background: `${color}08` }}>
              <Download size={14} /> Download Report
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* Full content (SHAP etc) */}
      <AnimatePresence>
        {phase >= 3 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}>
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
