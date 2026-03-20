import React, { useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { Heart, Lock, CheckCircle, XCircle } from "lucide-react";
import toast from "react-hot-toast";
import { resetPassword } from "../api";

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const [form, setForm] = useState({ password: "", confirm: "" });
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const navigate = useNavigate();
  const token = searchParams.get("token");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirm) { toast.error("Passwords don't match"); return; }
    if (form.password.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    setLoading(true);
    try {
      await resetPassword(token, form.password);
      setDone(true);
      setTimeout(() => navigate("/login"), 3000);
    } catch (err) {
      toast.error(err?.response?.data?.error || "Reset failed. Link may have expired.");
    } finally { setLoading(false); }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="glass-card p-10 text-center max-w-md w-full">
          <XCircle size={40} className="text-crimson-400 mx-auto mb-4"/>
          <h2 className="font-display text-2xl font-bold text-white mb-3">Invalid Link</h2>
          <p className="text-slate-400 text-sm mb-6">This reset link is invalid or has expired.</p>
          <Link to="/forgot-password" className="text-crimson-400 hover:text-crimson-300 font-medium text-sm">
            Request a new reset link →
          </Link>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="glass-card p-10 text-center max-w-md w-full">
          <div className="w-20 h-20 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={40} className="text-emerald-400"/>
          </div>
          <h2 className="font-display text-2xl font-bold text-white mb-3">Password Reset! 🎉</h2>
          <p className="text-slate-400 text-sm mb-2">Your password has been updated successfully.</p>
          <p className="text-slate-500 text-xs">Redirecting to login...</p>
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
          <h1 className="font-display text-3xl font-bold text-white">Reset password</h1>
          <p className="text-slate-400 mt-2">Enter your new password below</p>
        </div>

        <div className="glass-card p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs text-slate-400 mb-1.5 font-medium">New Password</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"/>
                <input type="password" placeholder="Min. 6 characters" className="form-input pl-9"
                  value={form.password} onChange={e => setForm(f => ({...f, password: e.target.value}))} required/>
              </div>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1.5 font-medium">Confirm Password</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"/>
                <input type="password" placeholder="Repeat your password" className="form-input pl-9"
                  value={form.confirm} onChange={e => setForm(f => ({...f, confirm: e.target.value}))} required/>
              </div>
            </div>
            <button type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-display font-semibold text-white transition-all duration-200 animate-glow disabled:opacity-60"
              style={{ background: "linear-gradient(135deg,#be123c,#f43f5e)" }}>
              {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/> : "Reset Password"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
