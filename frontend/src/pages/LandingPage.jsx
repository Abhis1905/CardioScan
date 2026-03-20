import React, { useEffect, useState } from "react";
import CursorGlow from "../components/CursorGlow";
import ScrollNavbar from "../components/ScrollNavbar";
import { Link } from "react-router-dom";
import { Heart, Shield, Zap, BarChart2, Brain, FileText, ChevronRight, Activity } from "lucide-react";
import LanguageSwitcher from "../components/LanguageSwitcher";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";

function ECGAnimation() {
  return (
    <svg className="w-full h-16 opacity-30" viewBox="0 0 800 60" preserveAspectRatio="none">
      <polyline
        points="0,30 80,30 100,10 120,50 140,30 200,30 240,5 260,55 280,30 320,30 340,20 360,40 380,30 800,30"
        fill="none" stroke="#f43f5e" strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round"
        style={{strokeDasharray:1200,strokeDashoffset:1200,animation:"ecgDraw 3s linear infinite"}}
      />
      <style>{`@keyframes ecgDraw{0%{stroke-dashoffset:1200}100%{stroke-dashoffset:0}}`}</style>
    </svg>
  );
}

function CountUp({ target, suffix="" }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const step = target / 60;
    let current = 0;
    const timer = setInterval(() => {
      current += step;
      if (current >= target) { setCount(target); clearInterval(timer); }
      else setCount(Math.floor(current));
    }, 16);
    return () => clearInterval(timer);
  }, [target]);
  return <span>{count.toLocaleString()}{suffix}</span>;
}

const FEATURE_ICONS = [Brain, Zap, Shield, FileText, Activity, BarChart2];
const FEATURE_COLORS = ["#f43f5e","#6366f1","#10b981","#f59e0b","#ec4899","#8b5cf6"];
const FEATURE_KEYS = ["f1","f2","f3","f4","f5","f6"];
const STEP_KEYS = ["s1","s2","s3","s4"];

export default function LandingPage() {
  const { t } = useTranslation();
  const [activeFeature, setActiveFeature] = useState(null);
  const [activeStep, setActiveStep] = useState(null);

  return (
    <div className="min-h-screen" style={{background:"#0a0f1e"}}>
      <CursorGlow/>
      <ScrollNavbar/>
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-crimson-900/30"
        style={{background:"rgba(10,15,30,0.95)",backdropFilter:"blur(20px)"}}>
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="animate-heartbeat"><Heart size={22} className="text-crimson-500 fill-crimson-500"/></div>
            <span className="font-display text-xl font-bold text-white">Cardio<span className="gradient-text">Scan</span></span>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSwitcher/>
            {/* Sign In — text morphs, underline draws */}
            <motion.div whileHover="hover" initial="rest" animate="rest" className="relative">
              <Link to="/login" className="relative text-sm font-medium px-4 py-2 block overflow-hidden">
                <motion.span
                  variants={{rest:{color:"#94a3b8"}, hover:{color:"#ffffff"}}}
                  transition={{duration:0.2}}
                  className="relative z-10 inline-block">
                  Sign In
                </motion.span>
                {/* underline sweep */}
                <motion.span
                  variants={{rest:{scaleX:0, originX:0}, hover:{scaleX:1, originX:0}}}
                  transition={{duration:0.3, ease:[0.22,1,0.36,1]}}
                  className="absolute bottom-1 left-4 right-4 h-px block"
                  style={{background:"linear-gradient(90deg,#f43f5e,#fb7185)"}}
                />
              </Link>
            </motion.div>

            {/* Get Started — magnetic + particle burst */}
            <motion.div
              whileHover="hover"
              initial="rest"
              animate="rest"
              className="relative">
              <Link to="/register" className="relative flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white overflow-hidden"
                style={{background:"linear-gradient(135deg,#be123c,#f43f5e)"}}>

                {/* Shimmer sweep on hover */}
                <motion.span
                  variants={{
                    rest:{x:"-100%", opacity:0},
                    hover:{x:"200%", opacity:1}
                  }}
                  transition={{duration:0.5, ease:"easeInOut"}}
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background:"linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.25) 50%, transparent 60%)",
                    zIndex:1,
                  }}
                />

                {/* Pulse ring */}
                <motion.span
                  variants={{
                    rest:{scale:1, opacity:0},
                    hover:{scale:1.6, opacity:0}
                  }}
                  transition={{duration:0.6, ease:"easeOut"}}
                  className="absolute inset-0 rounded-xl pointer-events-none border border-crimson-400"
                />

                <motion.span
                  variants={{rest:{rotate:0}, hover:{rotate:360}}}
                  transition={{duration:0.5, ease:[0.22,1,0.36,1]}}
                  className="relative z-10">
                  <Heart size={14} className="fill-white text-white"/>
                </motion.span>

                <motion.span
                  variants={{rest:{letterSpacing:"0em"}, hover:{letterSpacing:"0.03em"}}}
                  transition={{duration:0.2}}
                  className="relative z-10">
                  {t("landing.get_started")}
                </motion.span>

                <motion.span
                  variants={{rest:{x:0, opacity:1}, hover:{x:3, opacity:1}}}
                  transition={{duration:0.2, ease:"easeOut"}}
                  className="relative z-10">
                  <ChevronRight size={14}/>
                </motion.span>
              </Link>

              {/* Glow underneath button */}
              <motion.div
                variants={{rest:{opacity:0, scale:0.8}, hover:{opacity:1, scale:1}}}
                transition={{duration:0.3}}
                className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-3/4 h-3 blur-lg pointer-events-none rounded-full"
                style={{background:"linear-gradient(90deg,#be123c,#f43f5e)"}}
              />
            </motion.div>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-6 bg-grid relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-1/4 w-96 h-96 rounded-full opacity-10 blur-3xl" style={{background:"#f43f5e"}}/>
          <div className="absolute bottom-20 right-1/4 w-64 h-64 rounded-full opacity-10 blur-3xl" style={{background:"#6366f1"}}/>
        </div>
        <div className="max-w-5xl mx-auto text-center relative">
          <motion.div
            initial={{opacity:0, y:20}}
            animate={{opacity:1, y:0}}
            transition={{duration:0.5}}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-crimson-500/30 bg-crimson-500/10 text-crimson-400 text-sm font-medium mb-8">
            <Zap size={13}/> {t("landing.tagline")}
          </motion.div>

          <motion.h1
            className="font-display text-6xl md:text-7xl font-bold text-white leading-tight mb-6"
            initial={{opacity:0,y:30}} animate={{opacity:1,y:0}}
            transition={{delay:0.2,duration:0.7,ease:[0.22,1,0.36,1]}}>
            {t("landing.hero_title")}<br/>
            <span className="gradient-text">{t("landing.hero_title2")}</span>
          </motion.h1>

          <motion.p
            className="text-slate-400 text-xl leading-relaxed max-w-2xl mx-auto mb-10"
            initial={{opacity:0,y:20}} animate={{opacity:1,y:0}}
            transition={{delay:0.4,duration:0.6,ease:[0.22,1,0.36,1]}}>
            {t("landing.hero_desc")}
          </motion.p>

          <motion.div
            className="flex items-center justify-center gap-4 flex-wrap"
            initial={{opacity:0,y:20}} animate={{opacity:1,y:0}}
            transition={{delay:0.5,duration:0.5}}>

            {/* Primary CTA */}
            <motion.div whileHover="hover" initial="rest" animate="rest" className="relative">
              <Link to="/register"
                className="relative flex items-center gap-2 px-8 py-4 rounded-xl font-display font-bold text-white text-lg overflow-hidden"
                style={{background:"linear-gradient(135deg,#be123c,#f43f5e)"}}>
                <motion.span
                  variants={{rest:{x:"-100%",opacity:0}, hover:{x:"200%",opacity:1}}}
                  transition={{duration:0.6}}
                  className="absolute inset-0 pointer-events-none"
                  style={{background:"linear-gradient(105deg,transparent 40%,rgba(255,255,255,0.3) 50%,transparent 60%)"}}
                />
                <motion.span
                  variants={{rest:{scale:1}, hover:{scale:1.2, rotate:-15}}}
                  transition={{type:"spring", stiffness:300, damping:15}}>
                  <Heart size={18} className="fill-white"/>
                </motion.span>
                <motion.span
                  variants={{rest:{x:0}, hover:{x:2}}}
                  transition={{duration:0.2}}>
                  {t("landing.start_btn")}
                </motion.span>
              </Link>
              <motion.div
                variants={{rest:{opacity:0,scaleX:0.5}, hover:{opacity:1,scaleX:1}}}
                transition={{duration:0.3}}
                className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-2/3 h-4 blur-xl pointer-events-none"
                style={{background:"#f43f5e"}}
              />
            </motion.div>

            {/* Secondary CTA */}
            <motion.div whileHover="hover" initial="rest" animate="rest" className="relative">
              <Link to="/login"
                className="relative flex items-center gap-2 px-8 py-4 rounded-xl font-display font-bold text-slate-300 text-lg overflow-hidden"
                style={{border:"1px solid rgba(255,255,255,0.1)"}}>
                <motion.span
                  variants={{rest:{opacity:0}, hover:{opacity:1}}}
                  transition={{duration:0.3}}
                  className="absolute inset-0 pointer-events-none rounded-xl"
                  style={{background:"rgba(255,255,255,0.04)"}}
                />
                <motion.span
                  variants={{rest:{color:"#cbd5e1"}, hover:{color:"#ffffff"}}}
                  transition={{duration:0.2}}
                  className="relative z-10">
                  {t("landing.signin_btn")}
                </motion.span>
                <motion.span
                  variants={{rest:{x:0,opacity:0.5}, hover:{x:4,opacity:1}}}
                  transition={{duration:0.2}}>
                  <ChevronRight size={18}/>
                </motion.span>
                {/* border glow on hover */}
                <motion.span
                  variants={{rest:{opacity:0}, hover:{opacity:1}}}
                  transition={{duration:0.3}}
                  className="absolute inset-0 rounded-xl pointer-events-none"
                  style={{boxShadow:"inset 0 0 0 1px rgba(244,63,94,0.4)"}}
                />
              </Link>
            </motion.div>
          </motion.div>
          <div className="mt-6 text-xs text-slate-600">{t("landing.no_card")}</div>
        </div>

        <div className="max-w-4xl mx-auto mt-16"><ECGAnimation/></div>

        <div className="max-w-3xl mx-auto mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            {label:"Accuracy",value:98,suffix:"%",color:"#f43f5e",icon:"🎯"},
            {label:"Patients Analyzed",value:1025,suffix:"+",color:"#10b981",icon:"🫀"},
            {label:"Clinical Features",value:13,suffix:"",color:"#6366f1",icon:"🔬"},
            {label:"ML Models",value:3,suffix:"",color:"#f59e0b",icon:"🧠"},
          ].map(({label,value,suffix,color,icon},i)=>(
            <motion.div key={label}
              initial={{opacity:0,y:30,scale:0.9}} animate={{opacity:1,y:0,scale:1}}
              transition={{delay:0.6+i*0.1, type:"spring", stiffness:200, damping:20}}
              whileHover={{y:-4, scale:1.03}}
              className="glass-card p-5 text-center relative overflow-hidden cursor-default">
              <motion.div
                className="absolute inset-0 opacity-0 pointer-events-none"
                whileHover={{opacity:1}}
                style={{background:`radial-gradient(circle at 50% 50%, ${color}15, transparent 70%)`}}
              />
              <div className="text-2xl mb-1">{icon}</div>
              <p className="font-display text-3xl font-bold num-display" style={{color}}>
                <CountUp target={value} suffix={suffix}/>
              </p>
              <p className="text-slate-500 text-xs mt-1 tracking-wide">{label}</p>
              <motion.div
                className="absolute bottom-0 left-0 h-0.5 w-0"
                whileHover={{width:"100%"}}
                transition={{duration:0.3}}
                style={{background:`linear-gradient(90deg, ${color}, transparent)`}}
              />
            </motion.div>
          ))}
        </div>
      </section>

      {/* Ticker */}
      <div className="overflow-hidden border-y border-slate-800/50 py-3 bg-slate-900/30">
        <motion.div
          animate={{ x: ["0%", "-50%"] }}
          transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
          className="flex gap-12 whitespace-nowrap">
          {[...Array(2)].map((_, repeat) => (
            <div key={repeat} className="flex gap-12">
              {[
                "🫀 98.5% Prediction Accuracy",
                "🧠 3 ML Models in Ensemble",
                "🔬 SHAP Explainability Built-in",
                "📊 13 Clinical Features Analyzed",
                "⚡ Results in Under 2 Seconds",
                "📄 Professional PDF Reports",
                "🌍 8 Languages Supported",
                "🔒 Secure & Private by Design",
              ].map((item, i) => (
                <span key={i} className="text-sm text-slate-500 font-mono flex items-center gap-2">
                  {item}
                  <span className="text-slate-700">◆</span>
                </span>
              ))}
            </div>
          ))}
        </motion.div>
      </div>

      {/* Features — Interactive hover */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-crimson-400 text-sm font-mono uppercase tracking-widest mb-3">{t("landing.why_title")}</p>
            <h2 className="font-display text-4xl font-bold text-white">{t("landing.why_sub")}</h2>
            <p className="text-slate-600 text-sm mt-3">Hover over any feature to explore</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURE_KEYS.map((key, i) => {
              const Icon = FEATURE_ICONS[i];
              const color = FEATURE_COLORS[i];
              const isActive = activeFeature === i;
              const isDimmed = activeFeature !== null && !isActive;

              return (
                <motion.div
                  key={key}
                  onHoverStart={() => setActiveFeature(i)}
                  onHoverEnd={() => setActiveFeature(null)}
                  initial={{opacity:0,y:30}}
                  whileInView={{opacity:1,y:0}}
                  viewport={{once:true}}
                  transition={{delay:i*0.08, duration:0.5, ease:[0.22,1,0.36,1]}}
                  animate={{
                    scale: isActive ? 1.04 : isDimmed ? 0.97 : 1,
                    opacity: isDimmed ? 0.35 : 1,
                    filter: isDimmed ? "blur(1px)" : "blur(0px)",
                  }}
                  style={{
                    cursor: "pointer",
                    transition: "all 0.3s cubic-bezier(0.22,1,0.36,1)",
                  }}
                  className="glass-card p-6 relative overflow-hidden"
                >
                  {/* Glow on active */}
                  <AnimatePresence>
                    {isActive && (
                      <motion.div
                        initial={{opacity:0}}
                        animate={{opacity:1}}
                        exit={{opacity:0}}
                        className="absolute inset-0 rounded-2xl pointer-events-none"
                        style={{
                          background: `radial-gradient(circle at 30% 30%, ${color}25, transparent 70%)`,
                          border: `1px solid ${color}50`,
                        }}
                      />
                    )}
                  </AnimatePresence>

                  <motion.div
                    animate={{ scale: isActive ? 1.15 : 1, rotate: isActive ? 5 : 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                    style={{background:`${color}20`, border:`1px solid ${color}30`}}>
                    <Icon size={22} style={{color}}/>
                  </motion.div>

                  <motion.h3
                    animate={{ color: isActive ? color : "#f1f5f9" }}
                    className="font-display font-bold text-lg mb-2">
                    {t(`landing.features.${key}_title`)}
                  </motion.h3>

                  <p className="text-slate-400 text-sm leading-relaxed">
                    {t(`landing.features.${key}_desc`)}
                  </p>

                  <AnimatePresence>
                    {isActive && (
                      <motion.div
                        initial={{scaleX:0, originX:0}}
                        animate={{scaleX:1}}
                        exit={{scaleX:0}}
                        transition={{duration:0.3}}
                        className="absolute bottom-0 left-0 h-0.5 w-full"
                        style={{background:`linear-gradient(90deg, ${color}, transparent)`}}
                      />
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 px-6 bg-grid">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-crimson-400 text-sm font-mono uppercase tracking-widest mb-3">{t("landing.simple_process")}</p>
            <h2 className="font-display text-4xl font-bold text-white">{t("landing.how_title")} <span className="gradient-text">{t("landing.how_title2")}</span></h2>
          </div>
          {/* Steps — click to expand */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {STEP_KEYS.map((key,i)=>{
              const isActive = activeStep === i;
              const stepColors = ["#f43f5e","#6366f1","#10b981","#f59e0b"];
              const color = stepColors[i];
              return (
                <motion.div key={key}
                  onClick={() => setActiveStep(isActive ? null : i)}
                  initial={{opacity:0,y:30}}
                  whileInView={{opacity:1,y:0}}
                  viewport={{once:true}}
                  transition={{delay:i*0.1, duration:0.5}}
                  animate={{
                    scale: isActive ? 1.05 : 1,
                    y: isActive ? -6 : 0,
                  }}
                  style={{cursor:"pointer"}}
                  className="glass-card p-6 relative overflow-hidden select-none">

                  {/* Active background glow */}
                  <AnimatePresence>
                    {isActive && (
                      <motion.div
                        initial={{opacity:0, scale:0.8}}
                        animate={{opacity:1, scale:1}}
                        exit={{opacity:0, scale:0.8}}
                        className="absolute inset-0 pointer-events-none rounded-2xl"
                        style={{
                          background:`radial-gradient(ellipse at 50% 0%, ${color}30, transparent 70%)`,
                          border:`1px solid ${color}40`,
                        }}
                      />
                    )}
                  </AnimatePresence>

                  {/* Step number — shrinks when active */}
                  <motion.div
                    animate={{
                      fontSize: isActive ? "2.5rem" : "3rem",
                      opacity: isActive ? 0.5 : 0.2,
                      color: isActive ? color : "#f43f5e",
                    }}
                    transition={{duration:0.3}}
                    className="font-display font-bold mb-3 gradient-text">
                    0{i+1}
                  </motion.div>

                  <motion.h3
                    animate={{ color: isActive ? color : "#f1f5f9" }}
                    transition={{duration:0.2}}
                    className="font-display font-bold text-white mb-2">
                    {t(`landing.steps.${key}_title`)}
                  </motion.h3>

                  <p className="text-slate-400 text-sm leading-relaxed">
                    {t(`landing.steps.${key}_desc`)}
                  </p>

                  {/* Connector arrow — only on non-last */}
                  <AnimatePresence>
                    {isActive && i < 3 && (
                      <motion.div
                        initial={{opacity:0, x:-10}}
                        animate={{opacity:1, x:0}}
                        exit={{opacity:0, x:-10}}
                        className="mt-4 flex items-center gap-2 text-xs font-medium"
                        style={{color}}>
                        <span>Next: {t(`landing.steps.s${i+2}_title`)}</span>
                        <ChevronRight size={12}/>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Bottom bar */}
                  <AnimatePresence>
                    {isActive && (
                      <motion.div
                        initial={{scaleX:0, originX:0}}
                        animate={{scaleX:1}}
                        exit={{scaleX:0}}
                        transition={{duration:0.4, ease:[0.22,1,0.36,1]}}
                        className="absolute bottom-0 left-0 h-0.5 w-full"
                        style={{background:`linear-gradient(90deg, ${color}, transparent)`}}
                      />
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
          {/* Step connector line */}
          <div className="hidden lg:flex items-center justify-center mt-6 gap-2">
            {STEP_KEYS.map((_,i)=>(
              <React.Fragment key={i}>
                <motion.div
                  animate={{
                    background: activeStep === i
                      ? ["#f43f5e","#6366f1","#10b981","#f59e0b"][i]
                      : "rgba(255,255,255,0.1)",
                    scale: activeStep === i ? 1.4 : 1,
                  }}
                  className="w-2 h-2 rounded-full"
                />
                {i < 3 && <div className="w-16 h-px bg-slate-800"/>}
              </React.Fragment>
            ))}
          </div>
          <p className="text-center text-slate-700 text-xs mt-4">Click any step to explore</p>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{opacity:0,y:20}} whileInView={{opacity:1,y:0}}
            viewport={{once:true}}
            className="glass-card p-8 border border-crimson-500/20 text-center mb-8">
            <Shield size={28} className="text-crimson-400 mx-auto mb-3"/>
            <h3 className="font-display font-bold text-white text-lg mb-2">{t("landing.disclaimer_title")}</h3>
            <p className="text-slate-400 text-sm leading-relaxed">{t("landing.disclaimer_text")}</p>
          </motion.div>

          <motion.div
            initial={{opacity:0,y:20}} whileInView={{opacity:1,y:0}}
            viewport={{once:true}} transition={{delay:0.1}}
            className="glass-card p-10 text-center"
            style={{background:"linear-gradient(135deg,rgba(190,18,60,0.1),rgba(244,63,94,0.05))"}}>
            <Heart size={40} className="text-crimson-400 fill-crimson-400 mx-auto mb-4 animate-heartbeat"/>
            <h2 className="font-display text-3xl font-bold text-white mb-3">{t("landing.cta_title")}</h2>
            <p className="text-slate-400 mb-8">{t("landing.cta_sub")}</p>
            <motion.div whileHover={{scale:1.03}} whileTap={{scale:0.97}}>
              <Link to="/register"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-display font-bold text-white text-lg transition-all animate-glow"
                style={{background:"linear-gradient(135deg,#be123c,#f43f5e)"}}>
                <Heart size={18} className="fill-white"/> {t("landing.start_btn")}
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800/30 py-16 px-6 relative overflow-hidden">
        {/* Background pulse */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-96 h-32 opacity-20 blur-3xl"
            style={{background:"radial-gradient(ellipse, #f43f5e, transparent)"}}/>
        </div>

        <div className="max-w-4xl mx-auto text-center relative">
          {/* Main credit line */}
          <motion.div
            initial={{opacity:0, y:20}}
            whileInView={{opacity:1, y:0}}
            viewport={{once:true}}
            className="flex flex-col items-center gap-4">

            {/* Heartbeat line above */}
            <svg className="w-48 h-8 opacity-40" viewBox="0 0 200 30" fill="none">
              <motion.polyline
                points="0,15 30,15 40,5 50,25 60,15 80,15 95,2 105,28 115,15 130,15 140,10 150,20 160,15 200,15"
                fill="none" stroke="#f43f5e" strokeWidth="1.5"
                strokeLinecap="round" strokeLinejoin="round"
                initial={{pathLength:0, opacity:0}}
                whileInView={{pathLength:1, opacity:1}}
                viewport={{once:true}}
                transition={{duration:1.5, ease:"easeInOut"}}
              />
            </svg>

            {/* The credit */}
            <motion.div
              className="flex items-center gap-3"
              initial={{opacity:0, scale:0.9}}
              whileInView={{opacity:1, scale:1}}
              viewport={{once:true}}
              transition={{delay:0.3, duration:0.6, ease:[0.22,1,0.36,1]}}>

              <div className="h-px w-12 bg-gradient-to-r from-transparent to-slate-700"/>

              <span className="text-slate-500 text-sm tracking-wide">Made with</span>

              {/* Beating heart */}
              <motion.span
                animate={{
                  scale:[1, 1.35, 1, 1.2, 1],
                  filter:["drop-shadow(0 0 0px #f43f5e)", "drop-shadow(0 0 8px #f43f5e)", "drop-shadow(0 0 0px #f43f5e)","drop-shadow(0 0 5px #f43f5e)","drop-shadow(0 0 0px #f43f5e)"],
                }}
                transition={{duration:1.2, repeat:Infinity, ease:"easeInOut"}}
                className="text-base inline-block">
                ❤️
              </motion.span>

              <span className="text-slate-500 text-sm tracking-wide">by</span>

              {/* The name — the star of the show */}
              <motion.a
                href="https://www.linkedin.com/in/1905-abhishek/"
                target="_blank"
                rel="noopener noreferrer"
                className="relative font-display font-bold text-lg inline-block"
                whileHover="hover"
                initial="rest"
                animate="rest">

                {/* Glow behind name */}
                <motion.span
                  variants={{
                    rest:{opacity:0, scale:0.8},
                    hover:{opacity:1, scale:1.2}
                  }}
                  transition={{duration:0.3}}
                  className="absolute inset-0 blur-lg rounded-full pointer-events-none"
                  style={{background:"linear-gradient(135deg,#f43f5e,#fb7185)"}}
                />

                {/* Name text with gradient */}
                <motion.span
                  variants={{
                    rest:{backgroundPosition:"0% 50%"},
                    hover:{backgroundPosition:"100% 50%"}
                  }}
                  transition={{duration:0.5}}
                  className="relative"
                  style={{
                    background:"linear-gradient(135deg, #f43f5e, #fb7185, #fda4af, #f43f5e)",
                    backgroundSize:"300% 300%",
                    WebkitBackgroundClip:"text",
                    WebkitTextFillColor:"transparent",
                    backgroundClip:"text",
                  }}>
                  Abhishek
                </motion.span>

                {/* Underline that draws on hover */}
                <motion.span
                  variants={{
                    rest:{scaleX:0, originX:0},
                    hover:{scaleX:1, originX:0}
                  }}
                  transition={{duration:0.3, ease:[0.22,1,0.36,1]}}
                  className="absolute -bottom-0.5 left-0 right-0 h-0.5 block"
                  style={{background:"linear-gradient(90deg,#f43f5e,#fb7185)"}}
                />
              </motion.a>

              <div className="h-px w-12 bg-gradient-to-l from-transparent to-slate-700"/>
            </motion.div>

            {/* Sub line */}
            <motion.p
              initial={{opacity:0}} whileInView={{opacity:1}}
              viewport={{once:true}} transition={{delay:0.5}}
              className="text-slate-700 text-xs tracking-widest uppercase">
              Built with React · Flask · scikit-learn · For educational use only
            </motion.p>

          </motion.div>
        </div>
      </footer>
    </div>
  );
}
