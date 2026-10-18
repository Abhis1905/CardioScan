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
        className="fixed inset-0 z-50 pointer-events-none flex items-end justify-end p-6 sm:p-8">
        {/* Dim overlay */}
        <div className="absolute inset-0 bg-[#35483E]/20 backdrop-blur-[2px] pointer-events-auto" onClick={finish}/>

        {/* Tour card */}
        <motion.div
          key={step}
          initial={{opacity:0, scale:0.9, y:10}}
          animate={{opacity:1, scale:1, y:0}}
          exit={{opacity:0, scale:0.9, y:-10}}
          transition={{type:"spring", stiffness:300, damping:25}}
          className="relative pointer-events-auto glossy-card w-full max-w-xs"
          style={{
            backgroundColor: "rgba(255, 255, 255, 0.96)",
            border: "1px solid #E5E0D6",
            borderRadius: 16,
            padding: "20px 24px",
            maxWidth: 300,
            boxShadow: "0 20px 40px -10px rgba(53, 72, 62, 0.18), 0 0 0 1px #E5E0D6",
          }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-[#E4EDE5] border border-[#E5E0D6] flex items-center justify-center text-[#35483E]">
                <Zap size={11} className="text-[#35483E]"/>
              </div>
              <span className="text-xs text-[#52665A] font-mono uppercase tracking-widest font-semibold">
                {step+1} / {STEPS.length}
              </span>
            </div>
            <button onClick={finish} className="text-[#8A9990] hover:text-[#35483E] transition-colors">
              <X size={14}/>
            </button>
          </div>

          <h3 className="font-serif font-bold text-[#35483E] mb-1">{STEPS[step].title}</h3>
          <p className="text-[#52665A] text-xs leading-relaxed mb-4">{STEPS[step].desc}</p>

          {/* Progress dots */}
          <div className="flex items-center justify-between">
            <div className="flex gap-1.5">
              {STEPS.map((_,i) => (
                <motion.div key={i}
                  animate={{width: i===step ? 20 : 6, background: i===step ? "#35483E" : "#E5E0D6"}}
                  transition={{duration:0.3}}
                  className="h-1.5 rounded-full"
                />
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={finish}
                className="text-xs text-[#52665A] hover:text-[#35483E] transition-colors px-2 py-1">
                Skip
              </button>
              <button
                onClick={() => step < STEPS.length - 1 ? setStep(s=>s+1) : finish()}
                className="flex items-center gap-1 text-xs font-semibold text-white px-3 py-1.5 rounded-lg transition-all glossy-btn-primary">
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
