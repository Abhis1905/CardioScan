import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Heart, Mail, ArrowLeft, CheckCircle } from "lucide-react";
import toast from "react-hot-toast";
import { forgotPassword } from "../api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await forgotPassword(email);
      setSent(true);
    } catch (err) {
      toast.error("Something went wrong. Please try again.");
    } finally { setLoading(false); }
  };

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <div className="glass-card p-10">
            <div className="w-20 h-20 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mx-auto mb-6">
              <CheckCircle size={40} className="text-emerald-400"/>
            </div>
            <h2 className="font-display text-2xl font-bold text-white mb-3">Check your email!</h2>
            <p className="text-slate-400 text-sm leading-relaxed mb-2">We sent a password reset link to:</p>
            <p className="text-crimson-400 font-semibold mb-6">{email}</p>
            <p className="text-slate-500 text-xs leading-relaxed mb-8">
              Click the link in the email to reset your password. Check your spam folder if you don't see it.
            </p>
            <Link to="/login" className="text-crimson-400 hover:text-crimson-300 font-medium text-sm">
              Back to Login →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-2xl bg-crimson-500/20 border border-crimson-500/30 flex items-center justify-center animate-heartbeat">
              <Heart size={32} className="text-crimson-400 fill-crimson-400"/>
            </div>
          </div>
          <h1 className="font-display text-3xl font-bold text-white">Forgot password?</h1>
          <p className="text-slate-400 mt-2">Enter your email and we'll send you a reset link</p>
        </div>

        <div className="glass-card p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs text-slate-400 mb-1.5 font-medium">Email Address</label>
              <div className="relative">
                <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"/>
                <input type="email" placeholder="you@example.com" className="form-input pl-9"
                  value={email} onChange={e => setEmail(e.target.value)} required/>
              </div>
            </div>
            <button type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-display font-semibold text-white transition-all duration-200 animate-glow disabled:opacity-60"
              style={{ background: "linear-gradient(135deg,#be123c,#f43f5e)" }}>
              {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/> : "Send Reset Link"}
            </button>
          </form>
          <div className="mt-6 text-center">
            <Link to="/login" className="flex items-center justify-center gap-1.5 text-slate-400 hover:text-slate-200 text-sm transition-all">
              <ArrowLeft size={14}/> Back to Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
