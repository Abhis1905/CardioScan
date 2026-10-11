import React, { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, BarChart, Bar, Cell, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from "recharts";
import { BarChart2, TrendingUp, Target, Layers, Code, ChevronDown, ChevronUp } from "lucide-react";
import { motion } from "framer-motion";
import { getMetrics, getFeatureImportance } from "../api";

const MODELS = [
  { key: "logistic_regression", label: "Logistic Regression", color: "#f43f5e" },
  { key: "random_forest", label: "Random Forest", color: "#10b981" },
  { key: "knn", label: "KNN", color: "#6366f1" },
  { key: "svm", label: "Support Vector Machine", color: "#8b5cf6" },
];

const PYTHON_CODE = `# Step 1: Import Libraries
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.neighbors import KNeighborsClassifier
from sklearn.svm import SVC
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

# Step 5: Feature Scaling (for LR, KNN & SVM)
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
# 🔹 Model 4: Support Vector Machine
# ===========================
svm = SVC(kernel="rbf", probability=True, random_state=42)
svm.fit(X_train_scaled, y_train)
y_pred_svm = svm.predict(X_test_scaled)
print("🔹 Support Vector Machine")
print("Accuracy:", accuracy_score(y_test, y_pred_svm))
print(classification_report(y_test, y_pred_svm))

# ===========================
# 🔹 Compare All Models
# ===========================
print("\\n===== Model Comparison =====")
print("Logistic Regression Accuracy:", accuracy_score(y_test, y_pred_lr))
print("Random Forest Accuracy:      ", accuracy_score(y_test, y_pred_rf))
print("KNN Accuracy:                ", accuracy_score(y_test, y_pred_knn))
print("SVM Accuracy:                ", accuracy_score(y_test, y_pred_svm))`;

function MetricCard({ label, value, color = "#f43f5e" }) {
  const displayVal = typeof value === "number" ? (value * 100).toFixed(1) : "—";
  return (
    <div className="glass-card p-5">
      <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">{label}</p>
      <p className="font-display text-3xl font-bold" style={{ color }}>
        {displayVal}<span className="text-base text-slate-500">%</span>
      </p>
    </div>
  );
}

function ConfusionMatrix({ cm }) {
  if (!cm || !Array.isArray(cm) || cm.length < 2 || !Array.isArray(cm[0]) || !Array.isArray(cm[1])) {
    return <div className="text-slate-500 text-xs text-center py-8">Confusion matrix unavailable</div>;
  }
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

function getTprAtFpr(rocCurve, targetFpr) {
  if (!rocCurve || !Array.isArray(rocCurve.fpr) || !Array.isArray(rocCurve.tpr)) {
    return null;
  }
  const { fpr, tpr } = rocCurve;
  const n = Math.min(fpr.length, tpr.length);
  if (n === 0) return null;
  if (targetFpr <= fpr[0]) return tpr[0];
  if (targetFpr >= fpr[n - 1]) return tpr[n - 1];

  for (let i = 1; i < n; i++) {
    if (fpr[i] >= targetFpr) {
      const f0 = fpr[i - 1];
      const f1 = fpr[i];
      const t0 = tpr[i - 1];
      const t1 = tpr[i];
      if (f1 === f0) return t1;
      const alpha = (targetFpr - f0) / (f1 - f0);
      return +(t0 + alpha * (t1 - t0)).toFixed(4);
    }
  }
  return tpr[n - 1];
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
    Promise.allSettled([
      getMetrics(),
      getFeatureImportance("random_forest"),
      getFeatureImportance("logistic_regression"),
      getFeatureImportance("svm"),
    ])
      .then(([mRes, rfRes, lrRes, svmRes]) => {
        if (mRes.status === "fulfilled" && mRes.value?.data) {
          setMetrics(mRes.value.data);
        }
        const imp = {};
        if (rfRes.status === "fulfilled" && rfRes.value?.data) {
          imp.random_forest = rfRes.value.data;
        }
        if (lrRes.status === "fulfilled" && lrRes.value?.data) {
          imp.logistic_regression = lrRes.value.data;
        }
        if (svmRes.status === "fulfilled" && svmRes.value?.data) {
          imp.svm = svmRes.value.data;
        }
        setFeatureImp(imp);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
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

  const active = (metrics && metrics[activeModel]) || {};

  const grid = Array.from({ length: 51 }, (_, i) => +(i / 50).toFixed(2));
  const rocData = grid.map((fpr) => {
    const point = { fpr };
    if (metrics?.logistic_regression?.roc_curve) {
      point.lr = getTprAtFpr(metrics.logistic_regression.roc_curve, fpr);
    }
    if (metrics?.random_forest?.roc_curve) {
      point.rf = getTprAtFpr(metrics.random_forest.roc_curve, fpr);
    }
    if (metrics?.knn?.roc_curve) {
      point.knn = getTprAtFpr(metrics.knn.roc_curve, fpr);
    }
    if (metrics?.svm?.roc_curve) {
      point.svm = getTprAtFpr(metrics.svm.roc_curve, fpr);
    }
    return point;
  });

  const radarData = ["accuracy", "auc", "precision", "recall", "f1"].map((key) => {
    const row = { metric: key.toUpperCase() };
    if (metrics?.logistic_regression?.[key] != null) {
      row["Logistic Regression"] = +(metrics.logistic_regression[key] * 100).toFixed(1);
    }
    if (metrics?.random_forest?.[key] != null) {
      row["Random Forest"] = +(metrics.random_forest[key] * 100).toFixed(1);
    }
    if (metrics?.knn?.[key] != null) {
      row["KNN"] = +(metrics.knn[key] * 100).toFixed(1);
    }
    if (metrics?.svm?.[key] != null) {
      row["SVM"] = +(metrics.svm[key] * 100).toFixed(1);
    }
    return row;
  });

  const fiModel = featureImp[activeModel] || featureImp["random_forest"] || {};
  const fiData = Object.entries(fiModel)
    .map(([k, v]) => ({ name: k, value: +(v * 100).toFixed(2) }))
    .sort((a, b) => b.value - a.value);
  const FI_GRADIENT = ["#f43f5e", "#fb7185", "#fd8da0", "#fda4af", "#fecdd3"];

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      <div className="mb-8 animate-fadeinup">
        <div className="flex items-center gap-2 text-crimson-400 text-sm font-mono mb-3 opacity-70"><BarChart2 size={13}/> MODEL PERFORMANCE</div>
        <h1 className="font-display text-4xl font-bold text-white">Model <span className="gradient-text">Metrics</span></h1>
        <p className="text-slate-400 mt-2 text-sm">Compare performance across trained classifiers.</p>
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
          <ResponsiveContainer width="100%" height={280}>
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
              <Line type="monotone" dataKey="lr" name={`LR (AUC ${metrics?.logistic_regression?.auc ?? "N/A"})`} stroke="#f43f5e" strokeWidth={2} dot={false}/>
              <Line type="monotone" dataKey="rf" name={`RF (AUC ${metrics?.random_forest?.auc ?? "N/A"})`} stroke="#10b981" strokeWidth={2} dot={false}/>
              <Line type="monotone" dataKey="knn" name={`KNN (AUC ${metrics?.knn?.auc ?? "N/A"})`} stroke="#6366f1" strokeWidth={2} dot={false}/>
              {metrics?.svm && (
                <Line type="monotone" dataKey="svm" name={`SVM (AUC ${metrics?.svm?.auc ?? "N/A"})`} stroke="#8b5cf6" strokeWidth={2} dot={false}/>
              )}
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
              {metrics?.svm && (
                <Radar name="SVM" dataKey="SVM" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.15}/>
              )}
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
