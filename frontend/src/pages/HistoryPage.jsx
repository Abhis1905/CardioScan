import React, { useEffect, useState } from "react";
import { History, Trash2, ChevronDown, ChevronUp, AlertCircle, CheckCircle, TrendingUp, TrendingDown, Calendar, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import toast from "react-hot-toast";
import { getHistory, deletePrediction, updateNotes } from "../api";
import PageLoader from "../components/PageLoader";

const FEATURE_NAMES = ["age","sex","cp","trestbps","chol","fbs","restecg","thalach","exang","oldpeak","slope","ca","thal"];
const FIELD_LABELS = {
  age:"Age",sex:"Sex",cp:"Chest Pain",trestbps:"Rest BP",chol:"Cholesterol",
  fbs:"Fasting BS",restecg:"Rest ECG",thalach:"Max HR",exang:"Ex. Angina",
  oldpeak:"Oldpeak",slope:"Slope",ca:"CA",thal:"Thal",
};

function RiskBadge({ level }) {
  const cls = level==="Low"?"risk-low":level==="Moderate"?"risk-moderate":"risk-high";
  return <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${cls}`}>{level}</span>;
}

function RiskTrendChart({ predictions }) {
  if (predictions.length < 2) return null;
  const data = [...predictions].reverse().map((p) => ({
    date: new Date(p.created_at).toLocaleDateString("en-US",{month:"short",day:"numeric"}),
    risk: Math.round(p.probability * 100),
    level: p.risk_level,
  }));
  const latest = data[data.length-1];
  const first = data[0];
  const diff = latest.risk - first.risk;

  return (
    <div className="glass-card p-6 mb-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp size={15} className="text-crimson-400"/>
            <p className="text-white font-display font-semibold text-sm">Risk Trend</p>
          </div>
          <p className="text-slate-500 text-xs">{predictions.length} predictions tracked</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-500 mb-0.5">Overall trend</p>
          <p className={`text-sm font-bold flex items-center gap-1 justify-end ${diff > 0 ? "text-crimson-400" : diff < 0 ? "text-emerald-400" : "text-slate-400"}`}>
            {diff > 0 ? <TrendingUp size={14}/> : diff < 0 ? <TrendingDown size={14}/> : null}
            {diff > 0 ? `+${diff}% Higher` : diff < 0 ? `${diff}% Better` : "Stable"}
          </p>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={180}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="rg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)"/>
          <XAxis dataKey="date" tick={{fill:"#475569",fontSize:10}}/>
          <YAxis domain={[0,100]} tick={{fill:"#475569",fontSize:10}} tickFormatter={v=>`${v}%`}/>
          <Tooltip contentStyle={{background:"#0d1424",border:"1px solid rgba(244,63,94,0.2)",borderRadius:8}}
            formatter={v=>[`${v}%`,"Risk"]}/>
          <Area type="monotone" dataKey="risk" stroke="#f43f5e" strokeWidth={2} fill="url(#rg)"
            dot={(props) => {
              const {cx,cy,payload} = props;
              const c = payload.level==="Low"?"#10b981":payload.level==="Moderate"?"#f59e0b":"#f43f5e";
              return <circle key={cx} cx={cx} cy={cy} r={4} fill={c} stroke="#0d1424" strokeWidth={2}/>;
            }}/>
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function TimelineCard({ pred, onDelete, index }) {
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState(pred.notes || "");
  const [saving, setSaving] = useState(false);
  const isPositive = pred.prediction === 1;
  const color = pred.risk_level==="Low"?"#10b981":pred.risk_level==="Moderate"?"#f59e0b":"#f43f5e";
  const date = new Date(pred.created_at);
  const modelLabel = pred.model_used==="random_forest"?"RF":pred.model_used==="logistic_regression"?"LR":pred.model_used==="ensemble"?"ENS":"KNN";

  const handleDelete = async () => {
    if (!window.confirm("Delete this prediction?")) return;
    try { await deletePrediction(pred.id); onDelete(pred.id); toast.success("Deleted!"); }
    catch { toast.error("Could not delete"); }
  };

  const handleSave = async () => {
    setSaving(true);
    try { await updateNotes(pred.id, notes); toast.success("Notes saved!"); }
    catch { toast.error("Could not save"); }
    finally { setSaving(false); }
  };

  return (
    <motion.div
      initial={{opacity:0, x:-20}}
      animate={{opacity:1, x:0}}
      transition={{delay:index*0.05, duration:0.35, ease:[0.22,1,0.36,1]}}
      className="relative flex gap-4">
      <div className="flex flex-col items-center shrink-0">
        <motion.div
          initial={{scale:0}} animate={{scale:1}}
          transition={{delay:index*0.05+0.1, type:"spring", stiffness:300}}
          className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 z-10"
          style={{
            background: isPositive ? "rgba(244,63,94,0.15)" : "rgba(16,185,129,0.15)",
            border: `2px solid ${isPositive ? "rgba(244,63,94,0.4)" : "rgba(16,185,129,0.4)"}`,
            boxShadow: `0 0 12px ${isPositive ? "rgba(244,63,94,0.2)" : "rgba(16,185,129,0.2)"}`,
          }}>
          {isPositive
            ? <AlertCircle size={16} className="text-crimson-400"/>
            : <CheckCircle size={16} className="text-emerald-400"/>}
        </motion.div>
        <motion.div
          initial={{scaleY:0}} animate={{scaleY:1}}
          transition={{delay:index*0.05+0.15, duration:0.3}}
          className="w-px flex-1 mt-1 origin-top"
          style={{background:`linear-gradient(180deg, ${color}30, transparent)`}}
        />
      </div>

      <div className="flex-1 mb-4">
        <div className="glass-card overflow-hidden">
          <div className="p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <p className={`font-display font-semibold text-sm ${isPositive ? "text-crimson-400" : "text-emerald-400"}`}>
                    {isPositive ? "Heart Disease" : "No Disease"}
                  </p>
                  <RiskBadge level={pred.risk_level}/>
                  <span className="text-xs text-slate-600 font-mono px-1.5 py-0.5 rounded bg-slate-800/50">{modelLabel}</span>
                </div>
                <div className="flex items-center gap-3 mt-1">
                  <span className="flex items-center gap-1 text-xs text-slate-500">
                    <Calendar size={10}/> {date.toLocaleDateString()}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-slate-500">
                    <Clock size={10}/> {date.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <div className="text-right">
                <p className="font-display font-bold text-lg num-display" style={{color}}>
                  {Math.round(pred.probability*100)}%
                </p>
                <p className="text-xs text-slate-600">probability</p>
              </div>
              <svg width="36" height="36" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="14" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="4"/>
                <circle cx="18" cy="18" r="14" fill="none" stroke={color} strokeWidth="4"
                  strokeDasharray={`${pred.probability*88} 88`}
                  strokeLinecap="round"
                  transform="rotate(-90 18 18)"
                  style={{filter:`drop-shadow(0 0 4px ${color}80)`}}/>
              </svg>
              <div className="flex items-center gap-1">
                <button onClick={() => setOpen(o=>!o)}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 transition-all">
                  {open ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
                </button>
                <button onClick={handleDelete}
                  className="p-1.5 rounded-lg text-slate-600 hover:text-crimson-400 hover:bg-crimson-500/10 transition-all">
                  <Trash2 size={13}/>
                </button>
              </div>
            </div>
          </div>

          <AnimatePresence>
            {open && (
              <motion.div
                initial={{height:0, opacity:0}}
                animate={{height:"auto", opacity:1}}
                exit={{height:0, opacity:0}}
                transition={{duration:0.3, ease:[0.22,1,0.36,1]}}
                className="overflow-hidden">
                <div className="border-t border-slate-800/50 p-4 space-y-4">
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-widest mb-3 font-semibold">Clinical Data</p>
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                      {Object.keys(FIELD_LABELS).map(key => (
                        <div key={key} className="rounded-lg p-2 text-center"
                          style={{background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.04)"}}>
                          <p className="text-xs text-slate-600 mb-0.5">{FIELD_LABELS[key]}</p>
                          <p className="text-xs text-slate-200 font-mono font-bold">{pred[key]}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {pred.shap_values && pred.shap_values.length > 0 && (
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-widest mb-3 font-semibold">Top Factors</p>
                      <div className="space-y-1.5">
                        {["cp","thalach","ca","thal","oldpeak","age"].map(name => {
                          const idx = FEATURE_NAMES.indexOf(name);
                          const val = pred.shap_values[idx];
                          if (val === undefined) return null;
                          return (
                            <div key={name} className="flex items-center gap-3">
                              <span className="w-16 text-right text-xs text-slate-500 font-mono shrink-0">{name}</span>
                              <div className="flex-1 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                                <motion.div
                                  initial={{width:0}}
                                  animate={{width:`${Math.min(Math.abs(val)*200,100)}%`}}
                                  transition={{duration:0.6, delay:0.1}}
                                  className="h-full rounded-full"
                                  style={{background:val>0?"#f43f5e":"#10b981"}}/>
                              </div>
                              <span className={`text-xs font-mono w-14 ${val>0?"text-crimson-400":"text-emerald-400"}`}>
                                {val>0?"+":""}{val?.toFixed(3)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-widest mb-2 font-semibold">Notes</p>
                    <textarea value={notes} onChange={e=>setNotes(e.target.value)} rows={2}
                      placeholder="Add clinical notes..."
                      className="form-input resize-none text-sm"/>
                    <button onClick={handleSave} disabled={saving}
                      className="mt-2 px-4 py-1.5 rounded-lg text-xs font-semibold text-white transition-all disabled:opacity-60"
                      style={{background:"linear-gradient(135deg,#be123c,#f43f5e)"}}>
                      {saving ? "Saving..." : "Save Notes"}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

export default function HistoryPage() {
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    getHistory().then(r=>setPredictions(r.data)).catch(()=>toast.error("Could not load history")).finally(()=>setLoading(false));
  }, []);

  const handleDelete = id => setPredictions(p=>p.filter(x=>x.id!==id));

  const filtered = predictions.filter(p => {
    if (filter==="positive" && p.prediction!==1) return false;
    if (filter==="negative" && p.prediction!==0) return false;
    if (filter==="high" && p.risk_level!=="High") return false;
    return true;
  });

  const stats = {
    total: predictions.length,
    positive: predictions.filter(p=>p.prediction===1).length,
    high: predictions.filter(p=>p.risk_level==="High").length,
    avgRisk: predictions.length ? Math.round(predictions.reduce((s,p)=>s+p.probability,0)/predictions.length*100) : 0,
  };

  if (loading) return <PageLoader page="history"/>;

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <motion.div className="mb-8" initial={{opacity:0,y:20}} animate={{opacity:1,y:0}}>
        <div className="flex items-center gap-2 text-crimson-400 text-sm font-mono mb-3 opacity-70">
          <History size={13}/> PREDICTION TIMELINE
        </div>
        <h1 className="font-display text-4xl font-bold text-white">
          Patient <span className="gradient-text">History</span>
        </h1>
        <p className="text-slate-400 mt-2 text-sm">Your prediction timeline with full clinical data.</p>
      </motion.div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          {label:"Total",value:stats.total,color:"#f43f5e"},
          {label:"Heart Disease",value:stats.positive,color:"#f43f5e"},
          {label:"High Risk",value:stats.high,color:"#f59e0b"},
          {label:"Avg Risk",value:`${stats.avgRisk}%`,color:"#6366f1"},
        ].map(({label,value,color},i)=>(
          <motion.div key={label}
            initial={{opacity:0,y:15}} animate={{opacity:1,y:0}}
            transition={{delay:i*0.06}}
            className="glass-card p-4">
            <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">{label}</p>
            <p className="font-display text-2xl font-bold num-display" style={{color}}>{value}</p>
          </motion.div>
        ))}
      </div>

      <RiskTrendChart predictions={predictions}/>

      <div className="flex gap-2 mb-6 flex-wrap">
        {[["all","All"],["positive","Disease"],["negative","Healthy"],["high","High Risk"]].map(([val,label])=>(
          <button key={val} onClick={()=>setFilter(val)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${filter===val?"text-white border-transparent":"border-slate-700/50 text-slate-400 hover:text-slate-200"}`}
            style={filter===val?{background:"linear-gradient(135deg,#be123c,#f43f5e)"}:{}}>
            {label}
          </button>
        ))}
        <span className="ml-auto text-xs text-slate-600 self-center">{filtered.length} results</span>
      </div>

      {filtered.length === 0 ? (
        <motion.div
          initial={{opacity:0,scale:0.95}} animate={{opacity:1,scale:1}}
          className="glass-card p-16 text-center">
          <motion.div
            animate={{y:[0,-8,0]}} transition={{duration:3,repeat:Infinity,ease:"easeInOut"}}
            className="w-20 h-20 rounded-2xl bg-slate-800/50 flex items-center justify-center mx-auto mb-5">
            <History size={36} className="text-slate-600"/>
          </motion.div>
          <p className="font-display font-bold text-white text-lg mb-2">No predictions yet</p>
          <p className="text-slate-500 text-sm">Run a prediction and it will appear here in your timeline.</p>
        </motion.div>
      ) : (
        <div>
          {filtered.map((p,i) => (
            <TimelineCard key={p.id} pred={p} onDelete={handleDelete} index={i}/>
          ))}
        </div>
      )}
    </div>
  );
}
