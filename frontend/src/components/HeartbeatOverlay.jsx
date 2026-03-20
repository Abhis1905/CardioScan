import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart } from "lucide-react";

export default function HeartbeatOverlay({ visible }) {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const offsetRef = useRef(0);
  const [dots, setDots] = useState("");

  // Cycling dots
  useEffect(() => {
    if (!visible) return;
    const t = setInterval(() => {
      setDots(d => d.length >= 3 ? "" : d + ".");
    }, 400);
    return () => clearInterval(t);
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const onResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", onResize);

    // ECG shape — one heartbeat cycle
    const ecg = [
      0, 0, 0, 0, 0,
      -0.05, 0.05, -0.05,
      0, 0,
      -0.08, -0.5, 1.0, -0.4, 0.1,
      0.08, 0.06, 0.04, 0.02,
      0, 0, 0, 0, 0, 0, 0,
    ];

    const SPEED = 3;
    const AMPLITUDE = 80;
    const CYCLE = ecg.length * 8;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      offsetRef.current += SPEED;

      const cy = canvas.height / 2;
      const w = canvas.width;

      // Draw trailing line
      ctx.beginPath();
      ctx.strokeStyle = "rgba(244,63,94,0.15)";
      ctx.lineWidth = 1.5;
      ctx.moveTo(0, cy);
      ctx.lineTo(w, cy);
      ctx.stroke();

      // Draw ECG wave
      ctx.beginPath();
      ctx.lineWidth = 2.5;

      const grad = ctx.createLinearGradient(0, 0, w, 0);
      grad.addColorStop(0, "rgba(244,63,94,0)");
      grad.addColorStop(0.3, "rgba(244,63,94,0.3)");
      grad.addColorStop(0.7, "rgba(244,63,94,0.9)");
      grad.addColorStop(0.85, "rgba(244,63,94,1)");
      grad.addColorStop(1, "rgba(244,63,94,0)");
      ctx.strokeStyle = grad;

      let started = false;
      for (let x = 0; x < w; x += 2) {
        const idx = Math.floor(((x + offsetRef.current) % CYCLE) / (CYCLE / ecg.length));
        const val = ecg[Math.min(idx, ecg.length - 1)];
        const y = cy + val * AMPLITUDE;
        if (!started) { ctx.moveTo(x, y); started = true; }
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Glowing dot at the front
      const frontX = w * 0.82;
      const frontIdx = Math.floor(((frontX + offsetRef.current) % CYCLE) / (CYCLE / ecg.length));
      const frontVal = ecg[Math.min(frontIdx, ecg.length - 1)];
      const frontY = cy + frontVal * AMPLITUDE;

      const grd = ctx.createRadialGradient(frontX, frontY, 0, frontX, frontY, 12);
      grd.addColorStop(0, "rgba(244,63,94,1)");
      grd.addColorStop(0.4, "rgba(244,63,94,0.6)");
      grd.addColorStop(1, "rgba(244,63,94,0)");
      ctx.beginPath();
      ctx.fillStyle = grd;
      ctx.arc(frontX, frontY, 12, 0, Math.PI * 2);
      ctx.fill();

      // Bright center dot
      ctx.beginPath();
      ctx.fillStyle = "#f43f5e";
      ctx.arc(frontX, frontY, 3, 0, Math.PI * 2);
      ctx.fill();

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", onResize);
    };
  }, [visible]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}>

          {/* Dark overlay */}
          <div className="absolute inset-0" style={{
            background: "rgba(6,8,16,0.92)",
            backdropFilter: "blur(4px)",
          }}/>

          {/* ECG Canvas */}
          <canvas
            ref={canvasRef}
            className="absolute inset-0 pointer-events-none"
          />

          {/* Center content */}
          <div className="relative z-10 flex flex-col items-center gap-6">
            {/* Pulsing heart */}
            <div className="relative">
              {[0,1,2].map(i => (
                <motion.div key={i}
                  className="absolute inset-0 rounded-full border-2 border-crimson-500/30"
                  animate={{ scale: [1, 2.5], opacity: [0.5, 0] }}
                  transition={{ duration: 1.5, delay: i * 0.5, repeat: Infinity, ease: "easeOut" }}
                  style={{ width: 64, height: 64, top: -4, left: -4 }}
                />
              ))}
              <motion.div
                animate={{ scale: [1, 1.15, 1, 1.08, 1] }}
                transition={{ duration: 0.8, repeat: Infinity, repeatDelay: 0.3 }}
                className="w-14 h-14 rounded-2xl flex items-center justify-center"
                style={{
                  background: "linear-gradient(135deg, rgba(244,63,94,0.2), rgba(190,18,60,0.1))",
                  border: "2px solid rgba(244,63,94,0.5)",
                  boxShadow: "0 0 40px rgba(244,63,94,0.3)",
                }}>
                <Heart size={28} className="text-crimson-400 fill-crimson-400"/>
              </motion.div>
            </div>

            {/* Text */}
            <div className="text-center">
              <motion.p
                animate={{ opacity: [0.7, 1, 0.7] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="font-display text-xl font-bold text-white tracking-wide">
                Analyzing
                <span className="text-crimson-400">{dots}</span>
              </motion.p>
              <p className="text-slate-500 text-xs mt-1 font-mono tracking-widest uppercase">
                AI is processing your data
              </p>
            </div>

            {/* Vital signs row */}
            <div className="flex gap-6 mt-2">
              {[
                { label: "HR", value: "72", unit: "bpm", color: "#f43f5e" },
                { label: "BP", value: "120/80", unit: "mmHg", color: "#10b981" },
                { label: "ML", value: "3x", unit: "models", color: "#6366f1" },
              ].map(({ label, value, unit, color }) => (
                <motion.div key={label}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center px-4 py-2 rounded-xl"
                  style={{
                    background: `${color}10`,
                    border: `1px solid ${color}25`,
                  }}>
                  <p className="text-xs text-slate-500 font-mono">{label}</p>
                  <p className="font-display font-bold text-sm num-display" style={{ color }}>{value}</p>
                  <p className="text-xs text-slate-600">{unit}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
