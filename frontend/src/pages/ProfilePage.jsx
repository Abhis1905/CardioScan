import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { User, Mail, Calendar, Trash2, AlertTriangle, CheckCircle, Heart, Activity, TrendingUp, TrendingDown, Shield, Edit2, Save, X } from "lucide-react";
import toast from "react-hot-toast";
import { deleteAccount, getHistory } from "../api";
import { useAuth } from "../context/AuthContext";

function StatCard({ icon: Icon, label, value, color, sub }) {
  return (
    <div className="glass-card p-5 flex items-center gap-4">
      <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{background:`${color}20`,border:`1px solid ${color}30`}}>
        <Icon size={20} style={{color}}/>
      </div>
      <div>
        <p className="text-xs text-slate-500 uppercase tracking-widest mb-0.5">{label}</p>
        <p className="font-display text-2xl font-bold text-white">{value}</p>
        {sub && <p className="text-xs mt-0.5" style={{color}}>{sub}</p>}
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const { user, logoutUser } = useAuth();
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    getHistory().then(r => setPredictions(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handleDelete = async () => {
    if (confirmText !== "DELETE") { toast.error('Type "DELETE" to confirm'); return; }
    setDeleting(true);
    try {
      await deleteAccount();
      logoutUser();
      toast.success("Account deleted successfully");
      navigate("/");
    } catch (err) {
      toast.error(err?.response?.data?.error || "Could not delete account");
    } finally { setDeleting(false); }
  };

  // Stats
  const total = predictions.length;
  const positive = predictions.filter(p => p.prediction === 1).length;
  const high = predictions.filter(p => p.risk_level === "High").length;
  const avgRisk = total ? Math.round(predictions.reduce((s,p) => s + p.probability, 0) / total * 100) : 0;

  // Latest prediction
  const latest = predictions[0];

  // Risk trend
  const last5 = predictions.slice(0, 5).reverse();
  const trending = last5.length >= 2
    ? last5[last5.length-1].probability > last5[0].probability ? "up" : "down"
    : "stable";

  // Member since
  const memberSince = new Date(user?.created_at).toLocaleDateString("en-US", {year:"numeric", month:"long"});
  const daysActive = Math.floor((new Date() - new Date(user?.created_at)) / (1000*60*60*24));

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      {/* Header */}
      <div className="mb-8 animate-fadeinup">
        <div className="flex items-center gap-2 text-crimson-400 text-sm font-mono mb-3 opacity-70">
          <User size={13}/> MY PROFILE
        </div>
        <h1 className="font-display text-4xl font-bold text-white">
          My <span className="gradient-text">Dashboard</span>
        </h1>
      </div>

      {/* Profile Hero Card */}
      <div className="glass-card p-6 mb-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-5 blur-3xl" style={{background:"#f43f5e", transform:"translate(30%,-30%)"}}/>
        <div className="flex items-center gap-6 relative">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-crimson-500 to-crimson-700 flex items-center justify-center shrink-0 shadow-lg shadow-crimson-500/20">
            <span className="font-display text-3xl font-bold text-white">{user?.name?.[0]?.toUpperCase()}</span>
          </div>
          <div className="flex-1">
            <h2 className="font-display text-2xl font-bold text-white">{user?.name}</h2>
            <p className="text-slate-400 text-sm mt-1">{user?.email}</p>
            <div className="flex items-center gap-3 mt-2">
              <span className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
                <CheckCircle size={11}/> Verified Account
              </span>
              <span className="text-xs text-slate-500">Member since {memberSince}</span>
              <span className="text-xs text-slate-500">·</span>
              <span className="text-xs text-slate-500">{daysActive} days active</span>
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="glass-card px-4 py-3 text-center">
              <p className="font-display text-3xl font-bold gradient-text">{total}</p>
              <p className="text-xs text-slate-500 mt-0.5">Total Predictions</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard icon={Heart} label="Heart Disease" value={positive} color="#f43f5e" sub={total ? `${Math.round(positive/total*100)}% of total` : "no data"}/>
        <StatCard icon={AlertTriangle} label="High Risk" value={high} color="#f59e0b" sub={total ? `${Math.round(high/total*100)}% of total` : "no data"}/>
        <StatCard icon={Activity} label="Avg Risk Score" value={`${avgRisk}%`} color="#6366f1" sub={avgRisk < 30 ? "Good range" : avgRisk < 60 ? "Moderate" : "High range"}/>
        <StatCard
          icon={trending === "down" ? TrendingDown : TrendingUp}
          label="Risk Trend"
          value={trending === "down" ? "↓ Better" : trending === "up" ? "↑ Higher" : "→ Stable"}
          color={trending === "down" ? "#10b981" : trending === "up" ? "#f43f5e" : "#64748b"}
          sub="based on last 5"/>
      </div>

      {/* Latest Prediction */}
      {latest && (
        <div className={`glass-card p-5 mb-6 border ${latest.prediction===1?"border-crimson-500/30":"border-emerald-500/30"}`}>
          <p className="text-xs text-slate-500 uppercase tracking-widest mb-3 font-semibold">Latest Prediction</p>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${latest.prediction===1?"bg-crimson-500/20":"bg-emerald-500/20"}`}>
                {latest.prediction===1
                  ? <Heart size={20} className="text-crimson-400 fill-crimson-400"/>
                  : <CheckCircle size={20} className="text-emerald-400"/>}
              </div>
              <div>
                <p className={`font-display font-bold ${latest.prediction===1?"text-crimson-400":"text-emerald-400"}`}>
                  {latest.prediction===1?"Heart Disease Detected":"No Heart Disease"}
                </p>
                <p className="text-slate-500 text-xs mt-0.5">
                  {new Date(latest.created_at).toLocaleString()} · {latest.model_used === "random_forest" ? "Random Forest" : latest.model_used === "logistic_regression" ? "Logistic Regression" : latest.model_used === "ensemble" ? "Ensemble" : "KNN"}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className={`font-display text-2xl font-bold ${latest.risk_level==="Low"?"text-emerald-400":latest.risk_level==="Moderate"?"text-amber-400":"text-crimson-400"}`}>
                {Math.round(latest.probability*100)}%
              </p>
              <p className="text-xs text-slate-500">{latest.risk_level} Risk</p>
            </div>
          </div>
          <button onClick={() => navigate("/history")}
            className="mt-4 w-full py-2 rounded-xl border border-slate-700/50 text-slate-400 hover:text-white hover:border-slate-600 transition-all text-sm">
            View Full History →
          </button>
        </div>
      )}

      {/* Risk Distribution */}
      {total > 0 && (
        <div className="glass-card p-6 mb-6">
          <p className="text-xs text-slate-500 uppercase tracking-widest mb-4 font-semibold">Risk Distribution</p>
          <div className="space-y-3">
            {[
              {label:"Low Risk",value:predictions.filter(p=>p.risk_level==="Low").length,color:"#10b981"},
              {label:"Moderate Risk",value:predictions.filter(p=>p.risk_level==="Moderate").length,color:"#f59e0b"},
              {label:"High Risk",value:predictions.filter(p=>p.risk_level==="High").length,color:"#f43f5e"},
            ].map(({label,value,color})=>(
              <div key={label}>
                <div className="flex justify-between text-xs text-slate-400 mb-1">
                  <span>{label}</span>
                  <span className="font-mono">{value} ({total ? Math.round(value/total*100) : 0}%)</span>
                </div>
                <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-700"
                    style={{width:`${total ? (value/total)*100 : 0}%`, background:color}}/>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Account Info */}
      <div className="glass-card p-6 mb-6">
        <p className="text-xs text-slate-500 uppercase tracking-widest mb-4 font-semibold">Account Information</p>
        <div className="space-y-3">
          {[
            {icon:User, label:"Full Name", value:user?.name, color:"#f43f5e"},
            {icon:Mail, label:"Email Address", value:user?.email, color:"#6366f1"},
            {icon:Calendar, label:"Member Since", value:memberSince, color:"#10b981"},
            {icon:Shield, label:"Account Status", value:"Verified ✓", color:"#10b981"},
          ].map(({icon:Icon,label,value,color})=>(
            <div key={label} className="flex items-center gap-4 py-3 border-b border-slate-800/40 last:border-0">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{background:`${color}15`}}>
                <Icon size={14} style={{color}}/>
              </div>
              <div className="flex-1">
                <p className="text-xs text-slate-500">{label}</p>
                <p className="text-sm text-white font-medium mt-0.5">{value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Danger Zone */}
      <div className="glass-card p-6 border border-crimson-500/20">
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle size={16} className="text-crimson-400"/>
          <h3 className="font-display font-semibold text-crimson-400 text-sm uppercase tracking-wide">Danger Zone</h3>
        </div>
        <p className="text-slate-500 text-sm mb-5">Permanently delete your account and all prediction history. This cannot be undone.</p>

        {!showConfirm ? (
          <button onClick={() => setShowConfirm(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-crimson-500/40 text-crimson-400 hover:bg-crimson-500/10 transition-all text-sm font-medium">
            <Trash2 size={15}/> Delete My Account
          </button>
        ) : (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-crimson-500/10 border border-crimson-500/30">
              <p className="text-crimson-300 text-sm font-semibold mb-1">⚠️ This will permanently delete:</p>
              <ul className="text-crimson-300/70 text-xs space-y-1 ml-4 list-disc">
                <li>Your account and profile</li>
                <li>All {total} prediction{total !== 1 ? "s" : ""} and history</li>
                <li>All saved notes and reports</li>
              </ul>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">
                Type <span className="text-crimson-400 font-bold">DELETE</span> to confirm
              </label>
              <input type="text" className="form-input" placeholder="Type DELETE here"
                value={confirmText} onChange={e => setConfirmText(e.target.value)}/>
            </div>
            <div className="flex gap-3">
              <button onClick={handleDelete} disabled={deleting || confirmText !== "DELETE"}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-medium transition-all disabled:opacity-40"
                style={{background:"linear-gradient(135deg,#7f1d1d,#dc2626)"}}>
                <Trash2 size={15}/>{deleting ? "Deleting..." : "Yes, Delete My Account"}
              </button>
              <button onClick={() => { setShowConfirm(false); setConfirmText(""); }}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-700/50 text-slate-400 hover:text-slate-200 transition-all text-sm">
                <X size={14}/> Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
