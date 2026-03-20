import React, { useEffect, useState } from "react";
import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer } from "recharts";
import { Database, Activity } from "lucide-react";
import { getDatasetStats } from "../api";

const FEATURE_LABELS = {
  age: "Age", sex: "Sex", cp: "Chest Pain", trestbps: "Rest BP",
  chol: "Cholesterol", fbs: "Fasting BS", restecg: "Rest ECG",
  thalach: "Max HR", exang: "Ex. Angina", oldpeak: "Oldpeak",
  slope: "Slope", ca: "CA", thal: "Thal",
};

function CorrBar({ name, value }) {
  const positive = value >= 0;
  const pct = Math.abs(value) * 100;
  const color = positive ? "#f43f5e" : "#10b981";
  return (
    <div className="flex items-center gap-3 py-1.5">
      <span className="w-20 text-right text-xs text-slate-400 font-mono shrink-0">{FEATURE_LABELS[name] || name}</span>
      <div className="flex-1 flex items-center">
        {positive
          ? <div className="h-4 rounded-sm" style={{ width: `${pct * 0.9}%`, background: color, opacity: 0.8, minWidth: 3 }} />
          : <div className="ml-auto h-4 rounded-sm" style={{ width: `${pct * 0.9}%`, background: color, opacity: 0.8, minWidth: 3 }} />}
      </div>
      <span className="w-14 text-xs font-mono" style={{ color }}>{value > 0 ? "+" : ""}{value.toFixed(3)}</span>
    </div>
  );
}

function StatRow({ name, stats }) {
  return (
    <div className="flex items-center gap-4 py-2 border-b border-slate-800/60 last:border-0">
      <span className="w-28 text-sm text-slate-300 font-mono">{name}</span>
      <div className="flex gap-6 flex-1 flex-wrap">
        {[["Mean", stats.mean], ["Std", stats.std], ["Min", stats.min], ["Max", stats.max]].map(([l, v]) => (
          <div key={l}>
            <p className="text-xs text-slate-600">{l}</p>
            <p className="text-sm text-slate-200 font-mono">{v}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DataPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDatasetStats().then((r) => setStats(r.data)).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="max-w-7xl mx-auto px-6 py-10 space-y-6">
      {[...Array(3)].map((_, i) => <div key={i} className="skeleton rounded-2xl h-48" />)}
    </div>
  );

  if (!stats) return (
    <div className="max-w-7xl mx-auto px-6 py-20 text-center">
      <p className="text-slate-500">Could not load dataset stats. Is the backend running?</p>
    </div>
  );

  const { shape, target_distribution, feature_stats, correlation_with_target } = stats;
  const [rows] = shape;

  const pieData = [
    { name: "No Disease", value: target_distribution[0] || 0, fill: "#10b981" },
    { name: "Heart Disease", value: target_distribution[1] || 0, fill: "#f43f5e" },
  ];

  const corrSorted = Object.entries(correlation_with_target).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
  const numericFeatures = ["age", "trestbps", "chol", "thalach", "oldpeak"];
  const barColor = ["#f43f5e", "#fb7185", "#6366f1", "#10b981", "#f59e0b"];

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      <div className="mb-8 animate-fadeinup">
        <div className="flex items-center gap-2 text-crimson-400 text-sm font-mono mb-3 opacity-70"><Database size={13} /> DATASET EXPLORER</div>
        <h1 className="font-display text-4xl font-bold text-white">Dataset <span className="gradient-text">Overview</span></h1>
        <p className="text-slate-400 mt-2 text-sm">Explore the training data distribution, correlations, and feature statistics.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total Samples", value: rows.toLocaleString(), unit: "patients" },
          { label: "Features", value: 13, unit: "clinical vars" },
          { label: "Heart Disease", value: target_distribution[1] || 0, unit: "positive cases" },
          { label: "Healthy", value: target_distribution[0] || 0, unit: "negative cases" },
        ].map(({ label, value, unit }) => (
          <div key={label} className="glass-card p-5">
            <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">{label}</p>
            <p className="font-display text-3xl font-bold gradient-text">{value}</p>
            <p className="text-slate-600 text-xs mt-1">{unit}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="glass-card p-6">
          <div className="flex items-center gap-2 mb-5"><Activity size={15} className="text-crimson-400" /><h3 className="font-display font-semibold text-white text-sm uppercase tracking-wide">Target Distribution</h3></div>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" outerRadius={80} dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                labelLine={{ stroke: "#475569" }}>
                {pieData.map((entry, i) => <Cell key={i} fill={entry.fill} fillOpacity={0.85} />)}
              </Pie>
              <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid rgba(244,63,94,0.2)", borderRadius: 8 }} />
              <Legend wrapperStyle={{ fontSize: 12, color: "#94a3b8" }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-card p-6">
          <div className="flex items-center gap-2 mb-2"><Activity size={15} className="text-crimson-400" /><h3 className="font-display font-semibold text-white text-sm uppercase tracking-wide">Feature Correlation with Target</h3></div>
          <p className="text-xs text-slate-600 mb-4">Sorted by absolute correlation strength</p>
          <div className="space-y-0.5">
            {corrSorted.map(([name, value]) => <CorrBar key={name} name={name} value={value} />)}
          </div>
          <div className="flex justify-between text-xs text-slate-700 mt-2 px-24">
            <span>← Negative</span><span>Positive →</span>
          </div>
        </div>
      </div>

      <div className="glass-card p-6 mb-8">
        <h3 className="font-display font-semibold text-white text-sm uppercase tracking-wide mb-6">Numeric Feature Distributions</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {numericFeatures.map((feat, i) => {
            const s = feature_stats[feat];
            if (!s) return null;
            return (
              <div key={feat} className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
                <p className="text-xs text-slate-400 font-semibold mb-1 font-mono">{FEATURE_LABELS[feat]}</p>
                <p className="font-display text-xl font-bold" style={{ color: barColor[i] }}>{s.mean}</p>
                <p className="text-xs text-slate-600 mb-3">±{s.std} std</p>
                <div className="space-y-1.5">
                  {[["Min", s.min], ["Mean", s.mean], ["Max", s.max]].map(([l, v]) => (
                    <div key={l}>
                      <div className="flex justify-between text-xs text-slate-600"><span>{l}</span><span className="font-mono">{v}</span></div>
                      <div className="h-1 rounded-full bg-slate-800 mt-0.5">
                        <div className="h-full rounded-full" style={{ width: `${((v - s.min) / (s.max - s.min)) * 100}%`, background: barColor[i], opacity: 0.7 }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="glass-card p-6">
        <h3 className="font-display font-semibold text-white text-sm uppercase tracking-wide mb-5">All Feature Statistics</h3>
        <div className="overflow-x-auto">
          {Object.entries(feature_stats).map(([name, s]) => <StatRow key={name} name={name} stats={s} />)}
        </div>
      </div>
    </div>
  );
}
