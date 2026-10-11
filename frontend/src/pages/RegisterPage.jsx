import React, { useState, useRef } from "react";
import { Link } from "react-router-dom";
import { Heart, Mail, Lock, User, UserPlus, CheckCircle, Activity, FileText } from "lucide-react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { register, verifyTurnstile } from "../api";
import { auth, createUserWithEmailAndPassword, updateProfile, sendEmailVerification, signOut } from "../firebase";
import TurnstileWidget from "../components/TurnstileWidget";

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
  const [emailSendFailed, setEmailSendFailed] = useState(false);
  const [resending, setResending] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState(null);
  const turnstileRef = useRef(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!turnstileToken) {
      toast.error("Please complete the bot protection check.");
      return;
    }
    if (form.password.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    setLoading(true);

    // Verify Turnstile bot protection token server-side before creating account
    try {
      await verifyTurnstile(turnstileToken);
    } catch (turnstileErr) {
      turnstileRef.current?.reset();
      setTurnstileToken(null);
      toast.error(turnstileErr?.response?.data?.error || "Bot verification failed. Please try again.");
      setLoading(false);
      return;
    }

    let userCredential = null;
    try {
      userCredential = await createUserWithEmailAndPassword(auth, form.email.trim(), form.password);
      if (form.name.trim()) {
        try {
          await updateProfile(userCredential.user, { displayName: form.name.trim() });
        } catch (_) {}
      }
    } catch (err) {
      turnstileRef.current?.reset();
      setTurnstileToken(null);
      let msg = "Registration failed. Please try again.";
      if (err.code === "auth/email-already-in-use") {
        msg = "This email is already registered. Please sign in.";
      } else if (err.code === "auth/invalid-email") {
        msg = "Please enter a valid email address.";
      } else if (err.code === "auth/weak-password") {
        msg = "Password is too weak. Please choose a stronger password.";
      } else if (err?.message) {
        msg = err.message;
      }
      toast.error(msg);
      setLoading(false);
      return;
    }

    // Account creation succeeded. Dispatch verification email
    try {
      await sendEmailVerification(userCredential.user);
    } catch (sendErr) {
      console.warn("Failed to dispatch initial verification email:", sendErr);
      setEmailSendFailed(true);
      toast.error("Account created, but verification email could not be sent. You can resend it below.");
    } finally {
      await signOut(auth);
    }

    setRegisteredEmail(form.email.trim());
    setRegistered(true);
    setLoading(false);
  };

  const handleResend = async () => {
    setResending(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, registeredEmail, form.password);
      await sendEmailVerification(cred.user);
      await signOut(auth);
      setEmailSendFailed(false);
      toast.success("Verification email sent! Check your inbox.");
    } catch (err) {
      toast.error("Could not resend email. Please try logging in to resend.");
    } finally {
      setResending(false);
    }
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
        <h2 className="font-display text-2xl font-bold text-white mb-3">
          {emailSendFailed ? "Account Created!" : t("auth.check_email")}
        </h2>
        <p className="text-slate-400 text-sm mb-2">
          {emailSendFailed
            ? "We had trouble sending the verification link automatically to:"
            : "We sent a verification link to:"}
        </p>
        <p className="text-crimson-400 font-semibold mb-4">{registeredEmail}</p>
        {emailSendFailed ? (
          <div className="mb-6">
            <button
              onClick={handleResend}
              disabled={resending}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-crimson-600 hover:bg-crimson-500 transition-all disabled:opacity-60"
            >
              {resending ? "Sending..." : "Resend Verification Email"}
            </button>
          </div>
        ) : (
          <p className="text-slate-500 text-xs mb-8">Click the link to verify. Check spam if you don't see it.</p>
        )}
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

            {/* Bot Protection Widget */}
            <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{delay:0.32}}>
              <TurnstileWidget
                ref={turnstileRef}
                onVerify={(token) => setTurnstileToken(token)}
                onError={() => setTurnstileToken(null)}
                onExpire={() => setTurnstileToken(null)}
              />
            </motion.div>

            <motion.div initial={{opacity:0,y:15}} animate={{opacity:1,y:0}} transition={{delay:0.35}}>
              <motion.button type="submit" disabled={loading || !turnstileToken}
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
