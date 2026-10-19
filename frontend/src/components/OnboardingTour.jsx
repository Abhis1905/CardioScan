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
        <div className="absolute inset-0 bg-[#35483E]/20 dark:bg-black/60 backdrop-blur-[2px] pointer-events-auto" onClick={finish}/>

        {/* Tour card */}
        <motion.div
          key={step}
          initial={{opacity:0, scale:0.9, y:10}}
          animate={{opacity:1, scale:1, y:0}}
          exit={{opacity:0, scale:0.9, y:-10}}
          transition={{type:"spring", stiffness:300, damping:25}}
          className="relative pointer-events-auto glossy-card w-full max-w-xs bg-white/95 dark:bg-[#202326] border border-[#E5E0D6] dark:border-[#373C40] rounded-2xl p-5 shadow-xl"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-[#E4EDE5] dark:bg-[#282C30] border border-[#E5E0D6] dark:border-[#373C40] flex items-center justify-center text-[#35483E] dark:text-[#789580]">
                <Zap size={11} className="text-[#35483E] dark:text-[#789580]"/>
              </div>
              <span className="text-xs text-[#52665A] dark:text-[#B2B7BB] font-mono uppercase tracking-widest font-semibold">
                {step+1} / {STEPS.length}
              </span>
            </div>
            <button onClick={finish} className="text-[#8A9990] hover:text-[#35483E] dark:text-[#8C9399] dark:hover:text-[#F2F3F3] transition-colors">
              <X size={14}/>
            </button>
          </div>

          <h3 className="font-serif font-bold text-[#35483E] dark:text-[#F2F3F3] mb-1">{STEPS[step].title}</h3>
          <p className="text-[#52665A] dark:text-[#B2B7BB] text-xs leading-relaxed mb-4">{STEPS[step].desc}</p>

          {/* Progress dots */}
          <div className="flex items-center justify-between">
            <div className="flex gap-1.5">
              {STEPS.map((_,i) => (
                <motion.div key={i}
                  animate={{width: i===step ? 20 : 6, background: i===step ? "#789580" : "#373C40"}}
                  transition={{duration:0.3}}
                  className="h-1.5 rounded-full"
                />
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={finish}
                className="text-xs text-[#52665A] hover:text-[#35483E] dark:text-[#B2B7BB] dark:hover:text-[#F2F3F3] transition-colors px-2 py-1">
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
