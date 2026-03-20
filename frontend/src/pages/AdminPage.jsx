import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { Shield, Users, Activity, TrendingUp, Trash2, Download, Search, RefreshCw, AlertCircle, CheckCircle, ChevronDown, ChevronUp } from "lucide-react";
import toast from "react-hot-toast";
import { adminStats, adminUsers, adminDeleteUser, adminPredictions, adminDeletePrediction, adminExportUsers, adminExportPredictions } from "../api";
import { useAuth } from "../context/AuthContext";

const ADMIN_EMAIL = "mabhi192005@gmail.com";

function StatCard({ label, value, sub, color = "#f43f5e" }) {
  return (
    <div className="glass-card p-5">
      <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">{label}</p>
      <p className="font-display text-3xl font-bold" style={{ color }}>{value}</p>
      {sub && <p className="text-slate-600 text-xs mt-1">{sub}</p>}
    </div>
  );
}

function UserRow({ user, onDelete }) {
  return (
    <div className="flex items-center gap-4 py-3 border-b border-slate-800/40 last:border-0">
      <div className="w-9 h-9 rounded-xl bg-crimson-500/20 border border-crimson-500/30 flex items-center justify-center shrink-0">
        <span className="text-crimson-400 font-bold text-sm">{user.name[0].toUpperCase()}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-semibold truncate">{user.name}</p>
        <p className="text-slate-500 text-xs truncate">{user.email}</p>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <span className={`text-xs px-2 py-0.5 rounded-full ${user.is_verified ? "risk-low" : "risk-moderate"}`}>
          {user.is_verified ? "Verified" : "Unverified"}
        </span>
        <span className="text-xs text-slate-500 font-mono">{user.prediction_count} predictions</span>
        <span className="text-xs text-slate-600">{new Date(user.created_at).toLocaleDateString()}</span>
        <button onClick={() => onDelete(user.id, user.name)}
          className="p-1.5 rounded-lg text-slate-600 hover:text-crimson-400 hover:bg-crimson-500/10 transition-all">
          <Trash2 size={13}/>
        </button>
      </div>
    </div>
  );
}

function PredictionRow({ pred, onDelete }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-slate-800/40 last:border-0">
      <div className="flex items-center gap-4 py-3">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${pred.prediction===1?"bg-crimson-500/20":"bg-emerald-500/20"}`}>
          {pred.prediction===1
            ? <AlertCircle size={14} className="text-crimson-400"/>
            : <CheckCircle size={14} className="text-emerald-400"/>}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-semibold truncate">{pred.user_name}</p>
          <p className="text-slate-500 text-xs truncate">{pred.user_email}</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className={`text-xs px-2 py-0.5 rounded-full ${pred.risk_level==="Low"?"risk-low":pred.risk_level==="Moderate"?"risk-moderate":"risk-high"}`}>
            {pred.risk_level}
          </span>
          <span className="text-xs text-slate-400 font-mono">{Math.round(pred.probability*100)}%</span>
          <span className="text-xs text-slate-600">{new Date(pred.created_at).toLocaleDateString()}</span>
          <button onClick={() => setOpen(o=>!o)} className="p-1.5 rounded-lg text-slate-500 hover:text-white transition-all">
            {open ? <ChevronUp size={13}/> : <ChevronDown size={13}/>}
          </button>
          <button onClick={() => onDelete(pred.id)}
            className="p-1.5 rounded-lg text-slate-600 hover:text-crimson-400 hover:bg-crimson-500/10 transition-all">
            <Trash2 size={13}/>
          </button>
        </div>
      </div>
      {open && (
        <div className="pb-3 pl-12 grid grid-cols-4 sm:grid-cols-7 gap-2">
          {["age","sex","cp","trestbps","chol","thalach","oldpeak"].map(k => (
            <div key={k} className="rounded-lg p-2 text-center" style={{background:"rgba(255,255,255,0.03)"}}>
              <p className="text-xs text-slate-600">{k}</p>
              <p className="text-xs text-slate-200 font-mono font-bold">{pred[k]}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdminPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [predictions, setPredictions] = useState([]);
  const [tab, setTab] = useState("stats");
  const [search, setSearch] = useState("");
  const [riskFilter, setRiskFilter] = useState("");
  const [loading, setLoading] = useState(true);

  if (user?.email !== ADMIN_EMAIL) return <Navigate to="/" replace/>;

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [s, u, p] = await Promise.all([adminStats(), adminUsers(), adminPredictions({})]);
      setStats(s.data); setUsers(u.data); setPredictions(p.data);
    } catch(e) { toast.error("Could not load admin data"); }
    finally { setLoading(false); }
  };

  const handleDeleteUser = async (id, name) => {
    if (!window.confirm(`Delete user "${name}" and all their data?`)) return;
    try {
      await adminDeleteUser(id);
      setUsers(prev => prev.filter(u => u.id !== id));
      toast.success("User deleted!");
    } catch(e) { toast.error(e?.response?.data?.error || "Could not delete"); }
  };

  const handleDeletePrediction = async (id) => {
    if (!window.confirm("Delete this prediction?")) return;
    try {
      await adminDeletePrediction(id);
      setPredictions(prev => prev.filter(p => p.id !== id));
      toast.success("Prediction deleted!");
    } catch(e) { toast.error("Could not delete"); }
  };

  const handleExportUsers = async () => {
    try { await adminExportUsers(); toast.success("Users exported!"); }
    catch { toast.error("Export failed"); }
  };
  const handleExportPredictions = async () => {
    try { await adminExportPredictions(); toast.success("Predictions exported!"); }
    catch { toast.error("Export failed"); }
  };

  const filteredUsers = users.filter(u =>
    !search || u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase())
  );

  const filteredPredictions = predictions.filter(p => {
    if (riskFilter && p.risk_level !== riskFilter) return false;
    if (search && !p.user_name.toLowerCase().includes(search.toLowerCase()) && !p.user_email.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const tabs = [
    { key: "stats", label: "Dashboard", icon: TrendingUp },
    { key: "users", label: `Users (${users.length})`, icon: Users },
    { key: "predictions", label: `Predictions (${predictions.length})`, icon: Activity },
  ];

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      {/* Header */}
      <div className="mb-8 animate-fadeinup">
        <div className="flex items-center gap-2 text-crimson-400 text-sm font-mono mb-3 opacity-70">
          <Shield size={13}/> ADMIN PANEL
        </div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-4xl font-bold text-white">
              Admin <span className="gradient-text">Dashboard</span>
            </h1>
            <p className="text-slate-400 mt-2 text-sm">Full platform overview — visible only to you.</p>
          </div>
          <div className="flex gap-3">
            <button onClick={handleExportUsers}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-700/50 text-slate-400 hover:text-white hover:border-emerald-500/40 hover:bg-emerald-500/10 transition-all text-sm">
              <Download size={14}/> Export Users
            </button>
            <button onClick={handleExportPredictions}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-700/50 text-slate-400 hover:text-white hover:border-crimson-500/40 hover:bg-crimson-500/10 transition-all text-sm">
              <Download size={14}/> Export Predictions
            </button>
            <button onClick={loadAll}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-700/50 text-slate-400 hover:text-white transition-all text-sm">
              <RefreshCw size={14}/> Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-8">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold border transition-all ${tab===key?"text-white border-transparent":"border-slate-700/50 text-slate-400 hover:text-slate-200"}`}
            style={tab===key?{background:"linear-gradient(135deg,#be123c,#f43f5e)"}:{}}>
            <Icon size={14}/>{label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-4">
          {[...Array(4)].map((_,i) => <div key={i} className="skeleton rounded-2xl h-24"/>)}
        </div>
      ) : (
        <>
          {/* Stats Tab */}
          {tab === "stats" && stats && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard label="Total Users" value={stats.users.total} sub={`+${stats.users.new_this_week} this week`} color="#6366f1"/>
                <StatCard label="Verified Users" value={stats.users.verified} sub={`${stats.users.unverified} unverified`} color="#10b981"/>
                <StatCard label="Total Predictions" value={stats.predictions.total} sub={`+${stats.predictions.new_this_week} this week`} color="#f43f5e"/>
                <StatCard label="High Risk Cases" value={stats.predictions.high_risk} sub={`of ${stats.predictions.total} total`} color="#f59e0b"/>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="glass-card p-6">
                  <h3 className="font-display font-semibold text-white text-sm uppercase tracking-wide mb-5">Prediction Outcomes</h3>
                  <div className="space-y-3">
                    {[
                      { label: "Heart Disease Detected", value: stats.predictions.positive, color: "#f43f5e" },
                      { label: "No Heart Disease", value: stats.predictions.negative, color: "#10b981" },
                    ].map(({ label, value, color }) => (
                      <div key={label}>
                        <div className="flex justify-between text-xs text-slate-400 mb-1"><span>{label}</span><span className="font-mono">{value}</span></div>
                        <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${stats.predictions.total ? (value/stats.predictions.total)*100 : 0}%`, background: color }}/>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="glass-card p-6">
                  <h3 className="font-display font-semibold text-white text-sm uppercase tracking-wide mb-5">Risk Distribution</h3>
                  <div className="space-y-3">
                    {[
                      { label: "High Risk", value: stats.predictions.high_risk, color: "#f43f5e" },
                      { label: "Moderate Risk", value: stats.predictions.moderate_risk, color: "#f59e0b" },
                      { label: "Low Risk", value: stats.predictions.low_risk, color: "#10b981" },
                    ].map(({ label, value, color }) => (
                      <div key={label}>
                        <div className="flex justify-between text-xs text-slate-400 mb-1"><span>{label}</span><span className="font-mono">{value}</span></div>
                        <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${stats.predictions.total ? (value/stats.predictions.total)*100 : 0}%`, background: color }}/>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="glass-card p-6">
                  <h3 className="font-display font-semibold text-white text-sm uppercase tracking-wide mb-5">Model Usage</h3>
                  <div className="space-y-3">
                    {[
                      { label: "Random Forest", key: "random_forest", color: "#10b981" },
                      { label: "Logistic Regression", key: "logistic_regression", color: "#f43f5e" },
                      { label: "KNN", key: "knn", color: "#6366f1" },
                    ].map(({ label, key, color }) => (
                      <div key={key}>
                        <div className="flex justify-between text-xs text-slate-400 mb-1"><span>{label}</span><span className="font-mono">{stats.models[key]}</span></div>
                        <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${stats.predictions.total ? (stats.models[key]/stats.predictions.total)*100 : 0}%`, background: color }}/>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="glass-card p-6">
                  <h3 className="font-display font-semibold text-white text-sm uppercase tracking-wide mb-5">User Verification</h3>
                  <div className="space-y-3">
                    {[
                      { label: "Verified", value: stats.users.verified, color: "#10b981" },
                      { label: "Unverified", value: stats.users.unverified, color: "#f59e0b" },
                    ].map(({ label, value, color }) => (
                      <div key={label}>
                        <div className="flex justify-between text-xs text-slate-400 mb-1"><span>{label}</span><span className="font-mono">{value}</span></div>
                        <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${stats.users.total ? (value/stats.users.total)*100 : 0}%`, background: color }}/>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Users Tab */}
          {tab === "users" && (
            <div className="space-y-4">
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"/>
                <input type="text" placeholder="Search users by name or email..."
                  className="form-input pl-9" value={search} onChange={e => setSearch(e.target.value)}/>
              </div>
              <div className="glass-card p-6">
                <div className="flex justify-between items-center mb-4">
                  <p className="text-xs text-slate-500 uppercase tracking-widest font-semibold">
                    {filteredUsers.length} Users
                  </p>
                </div>
                {filteredUsers.length === 0
                  ? <p className="text-slate-500 text-sm text-center py-8">No users found</p>
                  : filteredUsers.map(u => <UserRow key={u.id} user={u} onDelete={handleDeleteUser}/>)
                }
              </div>
            </div>
          )}

          {/* Predictions Tab */}
          {tab === "predictions" && (
            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"/>
                  <input type="text" placeholder="Search by user name or email..."
                    className="form-input pl-9" value={search} onChange={e => setSearch(e.target.value)}/>
                </div>
                <select className="form-input w-40" value={riskFilter} onChange={e => setRiskFilter(e.target.value)}>
                  <option value="">All Risk Levels</option>
                  <option value="High">High Risk</option>
                  <option value="Moderate">Moderate Risk</option>
                  <option value="Low">Low Risk</option>
                </select>
              </div>
              <div className="glass-card p-6">
                <p className="text-xs text-slate-500 uppercase tracking-widest font-semibold mb-4">
                  {filteredPredictions.length} Predictions
                </p>
                {filteredPredictions.length === 0
                  ? <p className="text-slate-500 text-sm text-center py-8">No predictions found</p>
                  : filteredPredictions.map(p => <PredictionRow key={p.id} pred={p} onDelete={handleDeletePrediction}/>)
                }
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
