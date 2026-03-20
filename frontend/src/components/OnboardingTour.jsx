import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronRight, Zap } from "lucide-react";

const STEPS = [
  { target: ".tour-patient-form", title: "Enter Patient Data", desc: "Fill in 13 clinical features for accurate prediction.", pos: "right" },
  { target: ".tour-model-selector", title: "Choose Algorithm", desc: "Pick a model or use Ensemble for the best accuracy.", pos: "bottom" },
  { target: ".tour-run-btn", title: "Run Prediction", desc: "Hit this to get your instant risk score with SHAP analysis.", pos: "top" },
];

export default function OnboardingTour({ onDone }) {
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const done = localStorage.getItem("cardioscan-tour-done");
    if (!done) setTimeout(() => setVisible(true), 1200);
  }, []);

  const finish = () => {
    localStorage.setItem("cardioscan-tour-done", "1");
    setVisible(false);
    onDone?.();
  };

  if (!visible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
        className="fixed inset-0 z-40 pointer-events-none">
        {/* Dim overlay */}
        <div className="absolute inset-0 bg-black/40 pointer-events-auto" onClick={finish}/>

        {/* Tour card */}
        <motion.div
          key={step}
          initial={{opacity:0, scale:0.9, y:10}}
          animate={{opacity:1, scale:1, y:0}}
          exit={{opacity:0, scale:0.9, y:-10}}
          transition={{type:"spring", stiffness:300, damping:25}}
          className="absolute bottom-8 right-8 pointer-events-auto"
          style={{
            background:"linear-gradient(145deg,rgba(13,20,36,0.98),rgba(17,24,39,0.98))",
            border:"1px solid rgba(244,63,94,0.3)",
            borderRadius:16,
            padding:"20px 24px",
            maxWidth:280,
            boxShadow:"0 25px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(244,63,94,0.1)",
          }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-crimson-500/20 border border-crimson-500/30 flex items-center justify-center">
                <Zap size={11} className="text-crimson-400"/>
              </div>
              <span className="text-xs text-crimson-400 font-mono uppercase tracking-widest">
                {step+1} / {STEPS.length}
              </span>
            </div>
            <button onClick={finish} className="text-slate-600 hover:text-slate-300 transition-colors">
              <X size={14}/>
            </button>
          </div>

          <h3 className="font-display font-bold text-white mb-1">{STEPS[step].title}</h3>
          <p className="text-slate-400 text-sm leading-relaxed mb-4">{STEPS[step].desc}</p>

          {/* Progress dots */}
          <div className="flex items-center justify-between">
            <div className="flex gap-1.5">
              {STEPS.map((_,i) => (
                <motion.div key={i}
                  animate={{width: i===step ? 20 : 6, background: i===step ? "#f43f5e" : "#334155"}}
                  transition={{duration:0.3}}
                  className="h-1.5 rounded-full"
                />
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={finish}
                className="text-xs text-slate-500 hover:text-slate-300 transition-colors px-2 py-1">
                Skip
              </button>
              <button
                onClick={() => step < STEPS.length - 1 ? setStep(s=>s+1) : finish()}
                className="flex items-center gap-1 text-xs font-semibold text-white px-3 py-1.5 rounded-lg transition-all"
                style={{background:"linear-gradient(135deg,#be123c,#f43f5e)"}}>
                {step < STEPS.length - 1 ? "Next" : "Done"}
                <ChevronRight size={11}/>
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
