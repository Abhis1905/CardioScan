import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Heart, Mail, Lock, User, UserPlus, CheckCircle, Activity, FileText } from "lucide-react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { register } from "../api";

const FEATURES = [
  { icon: Activity, text: "Real-time risk analysis", color: "#f43f5e" },
  { icon: FileText, text: "PDF report generation", color: "#10b981" },
  { icon: Heart, text: "SHAP explainability", color: "#6366f1" },
  { icon: CheckCircle, text: "Prediction history", color: "#f59e0b" },
];

export default function RegisterPage() {
  const { t } = useTranslation();
  const [form, setForm] = useState({ name:"", email:"", password:"" });
  const [loading, setLoading] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    setLoading(true);
    try {
      await register(form);
      setRegisteredEmail(form.email);
      setRegistered(true);
    } catch (err) {
      toast.error(err?.response?.data?.error || "Registration failed");
    } finally { setLoading(false); }
  };

  if (registered) return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <motion.div initial={{scale:0.9,opacity:0}} animate={{scale:1,opacity:1}}
        transition={{type:"spring",stiffness:200}}
        className="w-full max-w-md glass-card p-10 text-center">
        <motion.div animate={{scale:[1,1.15,1]}} transition={{duration:0.5}}
          className="w-20 h-20 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mx-auto mb-6">
          <CheckCircle size={40} className="text-emerald-400"/>
        </motion.div>
        <h2 className="font-display text-2xl font-bold text-white mb-3">{t("auth.check_email")}</h2>
        <p className="text-slate-400 text-sm mb-2">We sent a verification link to:</p>
        <p className="text-crimson-400 font-semibold mb-6">{registeredEmail}</p>
        <p className="text-slate-500 text-xs mb-8">Click the link to verify. Check spam if you don't see it.</p>
        <Link to="/login" className="text-crimson-400 hover:text-crimson-300 font-medium text-sm">
          {t("auth.back_login")} →
        </Link>
      </motion.div>
    </div>
  );

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left panel */}
      <motion.div initial={{opacity:0,x:-40}} animate={{opacity:1,x:0}} transition={{duration:0.5}}
        className="hidden lg:flex flex-col justify-center p-12 relative overflow-hidden"
        style={{background:"linear-gradient(145deg,#060810,#0d1424)"}}>

        <div className="absolute inset-0 pointer-events-none">
          <motion.div animate={{scale:[1,1.3,1],opacity:[0.04,0.09,0.04]}}
            transition={{duration:7,repeat:Infinity}}
            className="absolute top-1/3 right-1/4 w-80 h-80 rounded-full blur-3xl"
            style={{background:"#10b981"}}/>
        </div>
        <div className="absolute inset-0 opacity-20"
          style={{backgroundImage:"linear-gradient(rgba(244,63,94,0.06) 1px,transparent 1px),linear-gradient(90deg,rgba(244,63,94,0.06) 1px,transparent 1px)",backgroundSize:"40px 40px"}}/>

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-10 h-10 rounded-xl bg-crimson-500/20 border border-crimson-500/30 flex items-center justify-center">
              <Heart size={20} className="text-crimson-400 fill-crimson-400 animate-heartbeat"/>
            </div>
            <span className="font-display text-xl font-bold text-white">Cardio<span className="gradient-text">Scan</span></span>
          </div>

          <motion.div initial={{opacity:0,x:-20}} animate={{opacity:1,x:0}} transition={{delay:0.2}}>
            <h2 className="font-display text-4xl font-bold text-white leading-tight mb-4">
              Join thousands<br/>
              <span className="gradient-text">predicting risk</span>
            </h2>
            <p className="text-slate-400 text-sm leading-relaxed mb-10 max-w-sm">
              Free forever. No credit card. Start analyzing heart disease risk in under 2 minutes.
            </p>
          </motion.div>

          <div className="space-y-3">
            {FEATURES.map(({icon:Icon,text,color},i)=>(
              <motion.div key={text}
                initial={{opacity:0,x:-20}} animate={{opacity:1,x:0}}
                transition={{delay:0.3+i*0.1}}
                className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                  style={{background:`${color}20`,border:`1px solid ${color}30`}}>
                  <Icon size={13} style={{color}}/>
                </div>
                <span className="text-slate-300 text-sm">{text}</span>
                <motion.div
                  initial={{scaleX:0,originX:0}}
                  animate={{scaleX:1}}
                  transition={{delay:0.5+i*0.1,duration:0.4}}
                  className="flex-1 h-px"
                  style={{background:`linear-gradient(90deg,${color}40,transparent)`}}/>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Right — form */}
      <motion.div
        className="flex flex-col items-center justify-center px-8 py-12"
        style={{background:"rgba(10,15,30,0.98)"}}
        initial={{opacity:0,x:40}} animate={{opacity:1,x:0}}
        transition={{duration:0.5,ease:[0.22,1,0.36,1]}}>

        <div className="lg:hidden flex items-center gap-2 mb-8">
          <Heart size={20} className="text-crimson-400 fill-crimson-400 animate-heartbeat"/>
          <span className="font-display text-lg font-bold text-white">Cardio<span className="gradient-text">Scan</span></span>
        </div>

        <div className="w-full max-w-sm">
          <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{delay:0.15}} className="mb-8">
            <h1 className="font-display text-3xl font-bold text-white mb-2">{t("auth.create_account")}</h1>
            <p className="text-slate-400 text-sm">{t("auth.create_sub")}</p>
          </motion.div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {[
              {key:"name",label:t("auth.full_name"),type:"text",icon:User,placeholder:"John Doe",delay:0.2},
              {key:"email",label:t("auth.email"),type:"email",icon:Mail,placeholder:"you@example.com",delay:0.25},
              {key:"password",label:t("auth.password"),type:"password",icon:Lock,placeholder:"Min. 6 characters",delay:0.3},
            ].map(({key,label,type,icon:Icon,placeholder,delay})=>(
              <motion.div key={key} initial={{opacity:0,y:15}} animate={{opacity:1,y:0}} transition={{delay}}>
                <label className="block text-xs text-slate-400 mb-1.5 font-medium">{label}</label>
                <div className="relative group">
                  <Icon size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-crimson-400 transition-colors"/>
                  <input type={type} placeholder={placeholder} className="form-input pl-9"
                    value={form[key]} onChange={e=>setForm(f=>({...f,[key]:e.target.value}))} required/>
                </div>
              </motion.div>
            ))}

            <motion.div initial={{opacity:0,y:15}} animate={{opacity:1,y:0}} transition={{delay:0.35}}>
              <motion.button type="submit" disabled={loading}
                whileHover={{scale:1.02}} whileTap={{scale:0.97}}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-display font-semibold text-white animate-glow disabled:opacity-60"
                style={{background:"linear-gradient(135deg,#be123c,#f43f5e)"}}>
                {loading
                  ? <motion.div animate={{rotate:360}} transition={{duration:0.8,repeat:Infinity,ease:"linear"}}
                      className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"/>
                  : <><UserPlus size={16}/>{t("auth.create_btn")}</>}
              </motion.button>
            </motion.div>
          </form>

          <motion.div initial={{opacity:0}} animate={{opacity:1}} transition={{delay:0.4}}
            className="mt-6 pt-6 border-t border-slate-800/50 text-center">
            <p className="text-slate-500 text-sm">
              {t("auth.have_account")}{" "}
              <Link to="/login" className="text-crimson-400 hover:text-crimson-300 font-medium">{t("auth.sign_in")}</Link>
            </p>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
