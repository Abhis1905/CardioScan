import React, { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, BarChart, Bar, Cell, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from "recharts";
import { BarChart2, TrendingUp, Target, Layers, Code, ChevronDown, ChevronUp } from "lucide-react";
import { motion } from "framer-motion";
import { getMetrics, getFeatureImportance } from "../api";

const MODELS = [
  { key: "logistic_regression", label: "Logistic Regression", color: "#f43f5e" },
  { key: "random_forest", label: "Random Forest", color: "#10b981" },
  { key: "knn", label: "KNN", color: "#6366f1" },
];

const PYTHON_CODE = `# Step 1: Import Libraries
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.neighbors import KNeighborsClassifier
from sklearn.metrics import accuracy_score, classification_report

# Step 2: Load Dataset
df = pd.read_csv("heart.csv")

# Step 3: Split Features & Target
X = df.drop("target", axis=1)
y = df["target"]

# Step 4: Train-Test Split
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

# Step 5: Feature Scaling (for LR & KNN)
scaler = StandardScaler()
X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled  = scaler.transform(X_test)

# ===========================
# 🔹 Model 1: Logistic Regression
# ===========================
lr = LogisticRegression()
lr.fit(X_train_scaled, y_train)
y_pred_lr = lr.predict(X_test_scaled)
print("🔹 Logistic Regression")
print("Accuracy:", accuracy_score(y_test, y_pred_lr))
print(classification_report(y_test, y_pred_lr))

# ===========================
# 🔹 Model 2: Random Forest
# ===========================
rf = RandomForestClassifier(n_estimators=100, random_state=42)
rf.fit(X_train, y_train)
y_pred_rf = rf.predict(X_test)
print("🔹 Random Forest")
print("Accuracy:", accuracy_score(y_test, y_pred_rf))
print(classification_report(y_test, y_pred_rf))

# ===========================
# 🔹 Model 3: KNN
# ===========================
knn = KNeighborsClassifier(n_neighbors=5)
knn.fit(X_train_scaled, y_train)
y_pred_knn = knn.predict(X_test_scaled)
print("🔹 KNN")
print("Accuracy:", accuracy_score(y_test, y_pred_knn))

# ===========================
# 🔹 Compare All Models
# ===========================
print("\\n===== Model Comparison =====")
print("Logistic Regression Accuracy:", accuracy_score(y_test, y_pred_lr))
print("Random Forest Accuracy:      ", accuracy_score(y_test, y_pred_rf))
print("KNN Accuracy:                ", accuracy_score(y_test, y_pred_knn))`;

function MetricCard({ label, value, color = "#f43f5e" }) {
  return (
    <div className="glass-card p-5">
      <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">{label}</p>
      <p className="font-display text-3xl font-bold" style={{ color }}>
        {(value * 100).toFixed(1)}<span className="text-base text-slate-500">%</span>
      </p>
    </div>
  );
}

function ConfusionMatrix({ cm }) {
  if (!cm) return null;
  const [[tn, fp], [fn, tp]] = cm;
  const cells = [
    { label: "TN", value: tn, bg: "rgba(16,185,129,0.2)", text: "#10b981" },
    { label: "FP", value: fp, bg: "rgba(244,63,94,0.15)", text: "#f87171" },
    { label: "FN", value: fn, bg: "rgba(244,63,94,0.15)", text: "#f87171" },
    { label: "TP", value: tp, bg: "rgba(16,185,129,0.2)", text: "#10b981" },
  ];
  return (
    <div>
      <div className="grid grid-cols-2 gap-2">
        {cells.map(({ label, value, bg, text }) => (
          <div key={label} className="rounded-xl p-3 text-center" style={{ background: bg }}>
            <p className="font-display text-2xl font-bold" style={{ color: text }}>{value}</p>
            <p className="text-xs text-slate-400 mt-0.5">{label}</p>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2 mt-1">
        <p className="text-center text-xs text-slate-600">Predicted: No</p>
        <p className="text-center text-xs text-slate-600">Predicted: Yes</p>
      </div>
    </div>
  );
}

function CodeBlock() {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(PYTHON_CODE);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const lines = PYTHON_CODE.split("\n");
  const getColor = (line) => {
    if (line.trim().startsWith("#")) return "#64748b";
    if (line.includes("print(")) return "#fb923c";
    if (/^(import|from|def|class|if|for|return|with|as|in)/.test(line.trim())) return "#c084fc";
    if (line.includes("=") && !line.includes("==")) return "#f1f5f9";
    return "#94a3b8";
  };

  return (
    <div className="glass-card overflow-hidden">
      <button onClick={() => setOpen(o => !o)}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-white/5 transition-all duration-200">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-crimson-500/20 border border-crimson-500/30 flex items-center justify-center">
            <Code size={15} className="text-crimson-400" />
          </div>
          <div className="text-left">
            <p className="text-white font-display font-semibold text-sm">Training Source Code</p>
            <p className="text-slate-500 text-xs">Python · scikit-learn · Your original model code</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-mono">{lines.length} lines</span>
          {open ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
        </div>
      </button>

      {open && (
        <div className="border-t border-slate-800/60">
          <div className="flex items-center justify-between px-4 py-2 bg-slate-900/50">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500/60" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
              <div className="w-3 h-3 rounded-full bg-green-500/60" />
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-600 font-mono">heart_model.py</span>
              <button onClick={handleCopy}
                className="text-xs px-3 py-1 rounded-lg border border-slate-700/50 text-slate-400 hover:text-white hover:border-crimson-500/40 hover:bg-crimson-500/10 transition-all">
                {copied ? "✓ Copied!" : "Copy"}
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <pre className="p-4 text-xs font-mono leading-6 min-w-max">
              {lines.map((line, i) => (
                <div key={i} className="flex gap-4 hover:bg-white/3 px-1 rounded">
                  <span className="text-slate-700 select-none w-6 text-right shrink-0">{i + 1}</span>
                  <span style={{ color: getColor(line) }}>{line || " "}</span>
                </div>
              ))}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

export default function MetricsPage() {
  const [metrics, setMetrics] = useState(null);
  const [featureImp, setFeatureImp] = useState({});
  const [activeModel, setActiveModel] = useState("random_forest");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getMetrics(), getFeatureImportance("random_forest"), getFeatureImportance("logistic_regression")])
      .then(([m, rfFi, lrFi]) => { setMetrics(m.data); setFeatureImp({ random_forest: rfFi.data, logistic_regression: lrFi.data }); })
      .catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="max-w-7xl mx-auto px-6 py-10 space-y-6">
      {[...Array(3)].map((_, i) => <div key={i} className="skeleton rounded-2xl h-48" />)}
    </div>
  );

  if (!metrics) return (
    <div className="max-w-7xl mx-auto px-6 py-20 text-center">
      <p className="text-slate-500">Could not load metrics. Is the backend running?</p>
    </div>
  );

  const active = metrics[activeModel];
  const rocData = metrics.logistic_regression.roc_curve.fpr.map((fpr, i) => ({
    fpr, lr: metrics.logistic_regression.roc_curve.tpr[i],
    rf: metrics.random_forest.roc_curve.tpr[i],
    knn: metrics.knn.roc_curve.tpr[i],
  }));
  const radarData = ["accuracy", "auc", "precision", "recall", "f1"].map((key) => ({
    metric: key.toUpperCase(),
    "Logistic Regression": +(metrics.logistic_regression[key] * 100).toFixed(1),
    "Random Forest": +(metrics.random_forest[key] * 100).toFixed(1),
    "KNN": +(metrics.knn[key] * 100).toFixed(1),
  }));
  const fiModel = featureImp[activeModel] || featureImp["random_forest"] || {};
  const fiData = Object.entries(fiModel).map(([k, v]) => ({ name: k, value: +(v * 100).toFixed(2) })).sort((a, b) => b.value - a.value).slice(0, 10);
  const FI_GRADIENT = ["#f43f5e", "#fb7185", "#fd8da0", "#fda4af", "#fecdd3"];

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      <div className="mb-8 animate-fadeinup">
        <div className="flex items-center gap-2 text-crimson-400 text-sm font-mono mb-3 opacity-70"><BarChart2 size={13}/> MODEL PERFORMANCE</div>
        <h1 className="font-display text-4xl font-bold text-white">Model <span className="gradient-text">Metrics</span></h1>
        <p className="text-slate-400 mt-2 text-sm">Compare performance across all three trained classifiers.</p>
      </div>

      <div className="flex gap-3 mb-8 flex-wrap">
        {MODELS.map(m=>(
          <button key={m.key} onClick={()=>setActiveModel(m.key)}
            className={`px-5 py-2.5 rounded-xl text-sm font-semibold border transition-all duration-200 ${activeModel===m.key?"text-white border-transparent":"border-slate-700/50 text-slate-400 hover:text-slate-200"}`}
            style={activeModel===m.key?{background:m.color}:{}}>
            {m.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        {["accuracy","auc","precision","recall","f1"].map((key,i)=>(
          <motion.div key={key}
            initial={{opacity:0,y:20}}
            animate={{opacity:1,y:0}}
            transition={{delay:i*0.08, duration:0.4, ease:[0.22,1,0.36,1]}}>
            <MetricCard label={key.toUpperCase()} value={active[key]} color={MODELS.find(m=>m.key===activeModel)?.color}/>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="glass-card p-6">
          <div className="flex items-center gap-2 mb-5"><Target size={15} className="text-crimson-400"/><h3 className="font-display font-semibold text-white text-sm uppercase tracking-wide">Confusion Matrix</h3></div>
          <ConfusionMatrix cm={active.confusion_matrix}/>
          <div className="mt-4 text-xs text-slate-600 space-y-1">
            <div className="flex justify-between"><span>True Negative (TN)</span><span className="text-emerald-500">Correctly predicted no disease</span></div>
            <div className="flex justify-between"><span>False Positive (FP)</span><span className="text-red-400">Predicted disease, no disease</span></div>
            <div className="flex justify-between"><span>False Negative (FN)</span><span className="text-red-400">Missed actual disease</span></div>
            <div className="flex justify-between"><span>True Positive (TP)</span><span className="text-emerald-500">Correctly predicted disease</span></div>
          </div>
        </div>
        <div className="glass-card p-6">
          <div className="flex items-center gap-2 mb-4"><Layers size={15} className="text-crimson-400"/><h3 className="font-display font-semibold text-white text-sm uppercase tracking-wide">Feature Importance</h3></div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={fiData} layout="vertical" margin={{left:0,right:20}}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false}/>
              <XAxis type="number" tick={{fill:"#475569",fontSize:11}} tickFormatter={v=>`${v}%`}/>
              <YAxis type="category" dataKey="name" tick={{fill:"#94a3b8",fontSize:11}} width={60}/>
              <Tooltip contentStyle={{background:"#0f172a",border:"1px solid rgba(244,63,94,0.2)",borderRadius:8}} formatter={v=>[`${v}%`,"Importance"]}/>
              <Bar dataKey="value" radius={[0,4,4,0]}>
                {fiData.map((_,i)=><Cell key={i} fill={FI_GRADIENT[Math.min(i,FI_GRADIENT.length-1)]} fillOpacity={0.85}/>)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="glass-card p-6">
          <div className="flex items-center gap-2 mb-5"><TrendingUp size={15} className="text-crimson-400"/><h3 className="font-display font-semibold text-white text-sm uppercase tracking-wide">ROC Curves</h3></div>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={rocData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)"/>
              <XAxis dataKey="fpr" tick={{fill:"#475569",fontSize:10}}/>
              <YAxis tick={{fill:"#475569",fontSize:10}}/>
              <Tooltip contentStyle={{background:"#0f172a",border:"1px solid rgba(244,63,94,0.2)",borderRadius:8}}/>
              <Legend wrapperStyle={{fontSize:12,color:"#94a3b8"}}/>
              <Line type="monotone" dataKey="lr" name={`LR (AUC ${metrics.logistic_regression.auc})`} stroke="#f43f5e" strokeWidth={2} dot={false}/>
              <Line type="monotone" dataKey="rf" name={`RF (AUC ${metrics.random_forest.auc})`} stroke="#10b981" strokeWidth={2} dot={false}/>
              <Line type="monotone" dataKey="knn" name={`KNN (AUC ${metrics.knn.auc})`} stroke="#6366f1" strokeWidth={2} dot={false}/>
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="glass-card p-6">
          <div className="flex items-center gap-2 mb-5"><BarChart2 size={15} className="text-crimson-400"/><h3 className="font-display font-semibold text-white text-sm uppercase tracking-wide">Model Comparison Radar</h3></div>
          <ResponsiveContainer width="100%" height={260}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="rgba(255,255,255,0.07)"/>
              <PolarAngleAxis dataKey="metric" tick={{fill:"#94a3b8",fontSize:11}}/>
              <PolarRadiusAxis angle={30} domain={[0,100]} tick={{fill:"#475569",fontSize:9}}/>
              <Radar name="LR" dataKey="Logistic Regression" stroke="#f43f5e" fill="#f43f5e" fillOpacity={0.15}/>
              <Radar name="RF" dataKey="Random Forest" stroke="#10b981" fill="#10b981" fillOpacity={0.15}/>
              <Radar name="KNN" dataKey="KNN" stroke="#6366f1" fill="#6366f1" fillOpacity={0.15}/>
              <Legend wrapperStyle={{fontSize:12,color:"#94a3b8"}}/>
              <Tooltip contentStyle={{background:"#0f172a",border:"1px solid rgba(244,63,94,0.2)",borderRadius:8}}/>
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <CodeBlock/>
    </div>
  );
}
