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
      ctx.strokeStyle = "rgba(138, 153, 144, 0.25)";
      ctx.lineWidth = 1.5;
      ctx.moveTo(0, cy);
      ctx.lineTo(w, cy);
      ctx.stroke();

      // Draw ECG wave
      ctx.beginPath();
      ctx.lineWidth = 2.5;

      const grad = ctx.createLinearGradient(0, 0, w, 0);
      grad.addColorStop(0, "rgba(53, 72, 62, 0)");
      grad.addColorStop(0.3, "rgba(53, 72, 62, 0.3)");
      grad.addColorStop(0.7, "rgba(53, 72, 62, 0.8)");
      grad.addColorStop(0.85, "rgba(179, 93, 82, 0.95)");
      grad.addColorStop(1, "rgba(53, 72, 62, 0)");
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
      grd.addColorStop(0, "rgba(179, 93, 82, 0.9)");
      grd.addColorStop(0.4, "rgba(179, 93, 82, 0.4)");
      grd.addColorStop(1, "rgba(179, 93, 82, 0)");
      ctx.beginPath();
      ctx.fillStyle = grd;
      ctx.arc(frontX, frontY, 12, 0, Math.PI * 2);
      ctx.fill();

      // Bright center dot
      ctx.beginPath();
      ctx.fillStyle = "#B35D52";
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
          className="fixed inset-0 z-50 flex flex-col items-center justify-center text-[#35483E]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}>

          {/* Warm ivory overlay */}
          <div className="absolute inset-0" style={{
            background: "rgba(247, 245, 240, 0.94)",
            backdropFilter: "blur(12px)",
          }}/>

          {/* ECG Canvas */}
          <canvas
            ref={canvasRef}
            className="absolute inset-0 pointer-events-none"
          />

          {/* Center content */}
          <div className="relative z-10 flex flex-col items-center gap-6">
            {/* Heart indicator */}
            <div className="relative">
              <motion.div
                animate={{ scale: [1, 1.08, 1, 1.04, 1] }}
                transition={{ duration: 1.2, repeat: Infinity, repeatDelay: 0.4 }}
                className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm"
                style={{
                  background: "#E4EDE5",
                  border: "1px solid #C5D5C8",
                }}>
                <Heart size={26} className="text-[#B35D52] fill-[#D9A19A]"/>
              </motion.div>
            </div>

            {/* Text */}
            <div className="text-center">
              <motion.p
                animate={{ opacity: [0.8, 1, 0.8] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="font-serif text-2xl font-bold text-[#35483E] tracking-tight">
                Evaluating Cardiovascular Risk
                <span className="text-[#B35D52]">{dots}</span>
              </motion.p>
              <p className="text-[#52665A] text-xs mt-1 font-mono tracking-wider uppercase font-medium">
                Statistical ML classifiers in progress
              </p>
            </div>

            {/* Vital signs row */}
            <div className="flex gap-4 sm:gap-6 mt-2">
              {[
                { label: "Vitals", value: "Standard", unit: "panel", color: "#35483E" },
                { label: "Norm", value: "Clinical", unit: "metrics", color: "#2D7A58" },
                { label: "ML", value: "Ensemble", unit: "ready", color: "#B35D52" },
              ].map(({ label, value, unit, color }) => (
                <motion.div key={label}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center px-4 py-2 rounded-xl bg-white border border-[#E5E0D6] shadow-2xs">
                  <p className="text-xs text-[#607368] font-mono">{label}</p>
                  <p className="font-serif font-bold text-sm" style={{ color }}>{value}</p>
                  <p className="text-[11px] text-[#8A9990]">{unit}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
