import React from "react";
import { motion } from "framer-motion";
import { Heart, BarChart2, History, Database, User } from "lucide-react";

const LOADERS = {
  predict: {
    icon: Heart,
    color: "#f43f5e",
    lines: ["Calibrating models...", "Loading clinical engine...", "Ready to analyze..."],
  },
  metrics: {
    icon: BarChart2,
    color: "#6366f1",
    lines: ["Fetching model scores...", "Computing ROC curves...", "Preparing charts..."],
  },
  history: {
    icon: History,
    color: "#10b981",
    lines: ["Loading your predictions...", "Fetching history...", "Almost there..."],
  },
  data: {
    icon: Database,
    color: "#f59e0b",
    lines: ["Loading dataset...", "Computing statistics...", "Building charts..."],
  },
  profile: {
    icon: User,
    color: "#ec4899",
    lines: ["Loading your profile...", "Fetching predictions...", "Building dashboard..."],
  },
};

export default function PageLoader({ page = "predict" }) {
  const cfg = LOADERS[page] || LOADERS.predict;
  const Icon = cfg.icon;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-8">
      {/* Animated icon */}
      <div className="relative">
        {/* Outer ring */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          className="w-24 h-24 rounded-full border border-dashed"
          style={{ borderColor: `${cfg.color}30` }}
        />
        {/* Inner ring */}
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="absolute inset-2 rounded-full border"
          style={{
            borderColor: "transparent",
            borderTopColor: cfg.color,
            borderRightColor: `${cfg.color}50`,
          }}
        />
        {/* Icon center */}
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}>
            <Icon size={28} style={{ color: cfg.color }} className={page === "predict" ? "fill-current" : ""} />
          </motion.div>
        </div>
        {/* Glow */}
        <div className="absolute inset-0 rounded-full blur-xl opacity-20"
          style={{ background: cfg.color }} />
      </div>

      {/* Cycling text */}
      <div className="flex flex-col items-center gap-2">
        <motion.p
          key={cfg.lines[0]}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-slate-400 text-sm font-mono">
          {cfg.lines[Math.floor(Date.now() / 1000) % cfg.lines.length]}
        </motion.p>
        {/* Dots */}
        <div className="flex gap-1.5">
          {[0, 1, 2].map(i => (
            <motion.div key={i}
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: cfg.color }}
            />
          ))}
        </div>
      </div>

      {/* Skeleton cards */}
      <div className="flex gap-3 mt-4">
        {[80, 120, 96].map((w, i) => (
          <motion.div key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="skeleton rounded-xl h-8"
            style={{ width: w }}
          />
        ))}
      </div>
    </div>
  );
}
