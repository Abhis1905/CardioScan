import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Heart, Mail, Lock, LogIn, Shield, Zap, BarChart2, Brain } from "lucide-react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { login } from "../api";
import { useAuth } from "../context/AuthContext";
import axios from "axios";

const STATS = [
  { icon: Brain, label: "ML Models", value: "3", color: "#f43f5e" },
  { icon: Shield, label: "Accuracy", value: "98.5%", color: "#10b981" },
  { icon: Zap, label: "Instant Results", value: "<2s", color: "#6366f1" },
  { icon: BarChart2, label: "Features", value: "13", color: "#f59e0b" },
];

function LeftPanel() {
  return (
    <div className="hidden lg:flex flex-col justify-between p-12 relative overflow-hidden"
      style={{background:"linear-gradient(145deg,#060810,#0d1424)"}}>

      {/* Animated background orbs */}
      <div className="absolute inset-0 pointer-events-none">
        <motion.div animate={{scale:[1,1.2,1],opacity:[0.05,0.1,0.05]}}
          transition={{duration:6,repeat:Infinity,ease:"easeInOut"}}
          className="absolute top-1/4 left-1/4 w-80 h-80 rounded-full blur-3xl"
          style={{background:"#f43f5e"}}/>
        <motion.div animate={{scale:[1.2,1,1.2],opacity:[0.04,0.08,0.04]}}
          transition={{duration:8,repeat:Infinity,ease:"easeInOut",delay:2}}
          className="absolute bottom-1/4 right-1/4 w-64 h-64 rounded-full blur-3xl"
          style={{background:"#6366f1"}}/>
      </div>

      {/* Grid */}
      <div className="absolute inset-0 opacity-20"
        style={{backgroundImage:"linear-gradient(rgba(244,63,94,0.08) 1px,transparent 1px),linear-gradient(90deg,rgba(244,63,94,0.08) 1px,transparent 1px)",backgroundSize:"40px 40px"}}/>

      {/* Logo */}
      <motion.div initial={{opacity:0,y:-20}} animate={{opacity:1,y:0}} transition={{delay:0.1}}
        className="flex items-center gap-3 relative z-10">
        <div className="w-10 h-10 rounded-xl bg-crimson-500/20 border border-crimson-500/30 flex items-center justify-center animate-heartbeat">
          <Heart size={20} className="text-crimson-400 fill-crimson-400"/>
        </div>
        <span className="font-display text-xl font-bold text-white">
          Cardio<span className="gradient-text">Scan</span>
        </span>
      </motion.div>

      {/* Hero text */}
      <div className="relative z-10">
        <motion.div initial={{opacity:0,x:-30}} animate={{opacity:1,x:0}} transition={{delay:0.2,duration:0.7}}>
          <p className="text-crimson-400 text-sm font-mono uppercase tracking-widest mb-4 opacity-70">
            AI-Powered Clinical Tool
          </p>
          <h2 className="font-display text-4xl font-bold text-white leading-tight mb-4">
            Predict heart disease<br/>
            <span className="gradient-text">with confidence</span>
          </h2>
          <p className="text-slate-400 text-sm leading-relaxed max-w-sm">
            Advanced machine learning meets clinical precision. Analyze 13 features, get instant risk scores with full SHAP explainability.
          </p>
        </motion.div>

        {/* Animated ECG */}
        <motion.div initial={{opacity:0}} animate={{opacity:1}} transition={{delay:0.5}}
          className="mt-8 mb-8">
          <svg className="w-full h-12" viewBox="0 0 400 48" fill="none">
            <motion.polyline
              points="0,24 40,24 55,8 70,40 85,24 120,24 145,4 160,44 175,24 210,24 225,16 240,32 255,24 400,24"
              fill="none" stroke="#f43f5e" strokeWidth="1.5"
              strokeLinecap="round" strokeLinejoin="round"
              initial={{pathLength:0,opacity:0}}
              animate={{pathLength:1,opacity:0.6}}
              transition={{duration:2,ease:"easeInOut",delay:0.6}}
            />
          </svg>
        </motion.div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3">
          {STATS.map(({icon:Icon,label,value,color},i)=>(
            <motion.div key={label}
              initial={{opacity:0,y:20}} animate={{opacity:1,y:0}}
              transition={{delay:0.7+i*0.1}}
              className="rounded-xl p-3 flex items-center gap-3"
              style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.06)"}}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                style={{background:`${color}20`,border:`1px solid ${color}30`}}>
                <Icon size={14} style={{color}}/>
              </div>
              <div>
                <p className="font-display font-bold text-white text-sm">{value}</p>
                <p className="text-slate-500 text-xs">{label}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Bottom quote */}
      <motion.p initial={{opacity:0}} animate={{opacity:1}} transition={{delay:1.1}}
        className="text-slate-700 text-xs relative z-10">
        "Early detection saves lives. CardioScan empowers clinicians with AI."
      </motion.p>
    </div>
  );
}

export default function LoginPage() {
  const { t } = useTranslation();
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [notVerified, setNotVerified] = useState(false);
  const [resending, setResending] = useState(false);
  const [success, setSuccess] = useState(false);
  const { loginUser } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setNotVerified(false);
    try {
      const { data } = await login(form);
      setSuccess(true);
      setTimeout(() => { loginUser(data.token, data.user); navigate("/predict"); }, 800);
    } catch (err) {
      if (err?.response?.data?.not_verified) { setNotVerified(true); }
      else { toast.error(err?.response?.data?.error || "Login failed"); }
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      await axios.post("https://cardioscan-production.up.railway.app/auth/resend-verification", { email: form.email });
      toast.success("Verification email resent!");
    } catch (err) { toast.error("Could not resend"); }
    finally { setResending(false); }
  };

  if (success) return (
    <div className="min-h-screen flex items-center justify-center">
      <motion.div initial={{scale:0.8,opacity:0}} animate={{scale:1,opacity:1}}
        transition={{type:"spring",stiffness:200,damping:15}}
        className="flex flex-col items-center gap-4">
        <motion.div animate={{scale:[1,1.3,1],rotate:[0,-10,10,0]}}
          transition={{duration:0.6}}
          className="w-20 h-20 rounded-2xl bg-crimson-500/20 border border-crimson-500/40 flex items-center justify-center">
          <Heart size={40} className="text-crimson-400 fill-crimson-400"/>
        </motion.div>
        <motion.p initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{delay:0.2}}
          className="font-display text-xl font-bold text-white">Welcome back!</motion.p>
        <motion.div initial={{scaleX:0}} animate={{scaleX:1}} transition={{delay:0.3,duration:0.5}}
          className="h-1 w-32 rounded-full bg-gradient-to-r from-crimson-600 to-crimson-400"/>
      </motion.div>
    </div>
  );

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <LeftPanel/>

      {/* Right — form */}
      <motion.div
        className="flex flex-col items-center justify-center px-8 py-12 relative"
        style={{background:"rgba(10,15,30,0.98)"}}
        initial={{opacity:0,x:40}}
        animate={{opacity:1,x:0}}
        transition={{duration:0.5,ease:[0.22,1,0.36,1]}}>

        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-2 mb-8">
          <Heart size={20} className="text-crimson-400 fill-crimson-400 animate-heartbeat"/>
          <span className="font-display text-lg font-bold text-white">Cardio<span className="gradient-text">Scan</span></span>
        </div>

        <div className="w-full max-w-sm">
          <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{delay:0.15}}
            className="mb-8">
            <h1 className="font-display text-3xl font-bold text-white mb-2">{t("auth.welcome_back")}</h1>
            <p className="text-slate-400 text-sm">{t("auth.signin_sub")}</p>
          </motion.div>

          <AnimatePresence>
            {notVerified && (
              <motion.div initial={{opacity:0,height:0}} animate={{opacity:1,height:"auto"}}
                exit={{opacity:0,height:0}}
                className="mb-5 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 overflow-hidden">
                <p className="text-amber-400 text-sm font-semibold mb-1">Email not verified</p>
                <p className="text-amber-300/70 text-xs mb-3">Please verify your email before logging in.</p>
                <button onClick={handleResend} disabled={resending}
                  className="text-xs px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 transition-all disabled:opacity-60">
                  {resending ? "Sending..." : "Resend verification email"}
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <motion.div initial={{opacity:0,y:15}} animate={{opacity:1,y:0}} transition={{delay:0.2}}>
              <label className="block text-xs text-slate-400 mb-1.5 font-medium">{t("auth.email")}</label>
              <div className="relative group">
                <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-crimson-400 transition-colors"/>
                <input type="email" placeholder="you@example.com" className="form-input pl-9"
                  value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} required/>
              </div>
            </motion.div>

            {/* Password */}
            <motion.div initial={{opacity:0,y:15}} animate={{opacity:1,y:0}} transition={{delay:0.25}}>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs text-slate-400 font-medium">{t("auth.password")}</label>
                <Link to="/forgot-password" className="text-xs text-crimson-400 hover:text-crimson-300 transition-all">
                  {t("auth.forgot_password")}
                </Link>
              </div>
              <div className="relative group">
                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-crimson-400 transition-colors"/>
                <input type="password" placeholder="••••••••" className="form-input pl-9"
                  value={form.password} onChange={e=>setForm(f=>({...f,password:e.target.value}))} required/>
              </div>
            </motion.div>

            {/* Submit */}
            <motion.div initial={{opacity:0,y:15}} animate={{opacity:1,y:0}} transition={{delay:0.3}}>
              <motion.button type="submit" disabled={loading}
                whileHover={{scale:1.02}} whileTap={{scale:0.97}}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-display font-semibold text-white animate-glow disabled:opacity-60"
                style={{background:"linear-gradient(135deg,#be123c,#f43f5e)"}}>
                {loading
                  ? <motion.div animate={{rotate:360}} transition={{duration:0.8,repeat:Infinity,ease:"linear"}}
                      className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"/>
                  : <><LogIn size={16}/>{t("auth.sign_in")}</>}
              </motion.button>
            </motion.div>
          </form>

          <motion.div initial={{opacity:0}} animate={{opacity:1}} transition={{delay:0.4}}
            className="mt-6 pt-6 border-t border-slate-800/50 text-center">
            <p className="text-slate-500 text-sm">
              {t("auth.no_account")}{" "}
              <Link to="/register" className="text-crimson-400 hover:text-crimson-300 font-medium transition-all">
                {t("auth.sign_up")}
              </Link>
            </p>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
