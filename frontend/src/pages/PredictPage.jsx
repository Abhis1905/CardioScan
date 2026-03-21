import React, { useState, useRef, useEffect } from "react";
import { Heart, AlertCircle, CheckCircle, ChevronRight, RotateCcw, Zap, Download, Send, Bot, User, Loader, Sliders } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { RadialBarChart, RadialBar, PolarAngleAxis, ResponsiveContainer } from "recharts";
import toast from "react-hot-toast";
import { predict, whatif, chatWithBot } from "../api";
import OnboardingTour from "../components/OnboardingTour";
import ECGBackground from "../components/ECGBackground";
import ResultReveal from "../components/ResultReveal";
import AnalyzingSequence from "../components/AnalyzingSequence";
import RiskAlarm from "../components/RiskAlarm";
import HeartbeatOverlay from "../components/HeartbeatOverlay";
import { useTranslation } from "react-i18next";

function useFields() {
  const { t } = useTranslation();
  return [
    { key: "age", label: t("fields.age"), group: "Demographics", type: "number", min: 1, max: 120, step: 1, unit: "yrs", hint: t("fields.age_hint"), default: 52 },
    { key: "sex", label: t("fields.sex"), group: "Demographics", type: "select", options: [{ v: 1, l: t("fields.male") }, { v: 0, l: t("fields.female") }], default: 1 },
    { key: "cp", label: t("fields.cp"), group: "Symptoms", type: "select", options: [{ v: 0, l: t("fields.cp_0") }, { v: 1, l: t("fields.cp_1") }, { v: 2, l: t("fields.cp_2") }, { v: 3, l: t("fields.cp_3") }], default: 0 },
    { key: "trestbps", label: t("fields.trestbps"), group: "Vitals", type: "number", min: 60, max: 250, step: 1, unit: "mmHg", hint: t("fields.trestbps_hint"), default: 130 },
    { key: "chol", label: t("fields.chol"), group: "Vitals", type: "number", min: 100, max: 600, step: 1, unit: "mg/dl", hint: t("fields.chol_hint"), default: 240 },
    { key: "fbs", label: t("fields.fbs"), group: "Lab", type: "select", options: [{ v: 0, l: t("fields.fbs_0") }, { v: 1, l: t("fields.fbs_1") }], default: 0 },
    { key: "restecg", label: t("fields.restecg"), group: "Cardiac", type: "select", options: [{ v: 0, l: t("fields.restecg_0") }, { v: 1, l: t("fields.restecg_1") }, { v: 2, l: t("fields.restecg_2") }], default: 0 },
    { key: "thalach", label: t("fields.thalach"), group: "Cardiac", type: "number", min: 60, max: 250, step: 1, unit: "bpm", hint: t("fields.thalach_hint"), default: 150 },
    { key: "exang", label: t("fields.exang"), group: "Cardiac", type: "select", options: [{ v: 0, l: t("fields.exang_0") }, { v: 1, l: t("fields.exang_1") }], default: 0 },
    { key: "oldpeak", label: t("fields.oldpeak"), group: "Cardiac", type: "number", min: 0, max: 10, step: 0.1, unit: "mm", hint: t("fields.oldpeak_hint"), default: 1.0 },
    { key: "slope", label: t("fields.slope"), group: "Cardiac", type: "select", options: [{ v: 0, l: t("fields.slope_0") }, { v: 1, l: t("fields.slope_1") }, { v: 2, l: t("fields.slope_2") }], default: 1 },
    { key: "ca", label: t("fields.ca"), group: "Lab", type: "select", options: [{ v: 0, l: "0" }, { v: 1, l: "1" }, { v: 2, l: "2" }, { v: 3, l: "3" }, { v: 4, l: "4" }], default: 0 },
    { key: "thal", label: t("fields.thal"), group: "Lab", type: "select", options: [{ v: 0, l: t("fields.thal_0") }, { v: 1, l: t("fields.thal_1") }, { v: 2, l: t("fields.thal_2") }, { v: 3, l: t("fields.thal_3") }], default: 2 },
  ];
}
const FIELD_LABELS = {
  age:"Age",sex:"Biological Sex",cp:"Chest Pain Type",trestbps:"Resting BP",
  chol:"Cholesterol",fbs:"Fasting Blood Sugar",restecg:"Resting ECG",
  thalach:"Max Heart Rate",exang:"Exercise Angina",oldpeak:"ST Depression",
  slope:"ST Slope",ca:"Major Vessels",thal:"Thalassemia",
};

function useGroupLabel(group) {
  const { t } = useTranslation();
  return t(`fields.groups.${group}`, group);
}
const MODELS = [
  { key: "logistic_regression", label: "Logistic Regression", icon: "📈" },
  { key: "random_forest", label: "Random Forest", icon: "🌲" },
  { key: "knn", label: "K-Nearest Neighbors", icon: "🔵" },
  { key: "ensemble", label: "Ensemble (All 3)", icon: "🎯" },
];
function buildDefaults() {
  return { patient_name: "", age:52, sex:1, cp:0, trestbps:130, chol:240, fbs:0, restecg:0, thalach:150, exang:0, oldpeak:1.0, slope:1, ca:0, thal:2 };
}

function generatePDF(form, result, modelLabel) {
  const pct = Math.round(result.probability * 100);
  const riskColor = result.risk_level==="Low"?"#10b981":result.risk_level==="Moderate"?"#f59e0b":"#e11d48";
  const diagnosisText = result.prediction===1?"Heart Disease Detected":"No Heart Disease Detected";
  const topShap = result.feature_names.map((name,i)=>({name,value:result.shap_values[i]})).sort((a,b)=>Math.abs(b.value)-Math.abs(a.value)).slice(0,8);
  const PDF_FIELDS = [
    {key:"age",label:"Age",unit:"yrs",type:"number"},{key:"sex",label:"Sex",type:"select",options:[{v:1,l:"Male"},{v:0,l:"Female"}]},
    {key:"cp",label:"Chest Pain",type:"select",options:[{v:0,l:"Typical Angina"},{v:1,l:"Atypical Angina"},{v:2,l:"Non-anginal"},{v:3,l:"Asymptomatic"}]},
    {key:"trestbps",label:"Resting BP",unit:"mmHg",type:"number"},{key:"chol",label:"Cholesterol",unit:"mg/dl",type:"number"},
    {key:"fbs",label:"Fasting BS",type:"select",options:[{v:0,l:"Normal"},{v:1,l:"Elevated"}]},
    {key:"restecg",label:"Rest ECG",type:"select",options:[{v:0,l:"Normal"},{v:1,l:"ST-T Abnormality"},{v:2,l:"LV Hypertrophy"}]},
    {key:"thalach",label:"Max HR",unit:"bpm",type:"number"},{key:"exang",label:"Ex. Angina",type:"select",options:[{v:0,l:"No"},{v:1,l:"Yes"}]},
    {key:"oldpeak",label:"Oldpeak",unit:"mm",type:"number"},
    {key:"slope",label:"ST Slope",type:"select",options:[{v:0,l:"Upsloping"},{v:1,l:"Flat"},{v:2,l:"Downsloping"}]},
    {key:"ca",label:"CA",type:"number"},{key:"thal",label:"Thal",type:"select",options:[{v:0,l:"Normal"},{v:1,l:"Fixed"},{v:2,l:"Reversable"},{v:3,l:"Unknown"}]},
  ];
  const patientRows = PDF_FIELDS.map(f=>{
    const val=form[f.key]; let display=val;
    if(f.type==="select"){const opt=f.options?.find(o=>o.v===val);display=opt?opt.l:val;}
    return `<tr><td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;color:#64748b;font-size:13px;">${f.label}</td><td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;font-weight:600;font-size:13px;">${display}${f.unit?' '+f.unit:''}</td></tr>`;
  }).join("");
  const shapRows = topShap.map(({name,value})=>{
    const color=value>0?"#e11d48":"#10b981";
    return `<tr><td style="padding:7px 12px;border-bottom:1px solid #e2e8f0;font-size:13px;">${FIELD_LABELS[name]||name}</td><td style="padding:7px 12px;font-weight:700;color:${color};font-size:13px;">${value>0?"+":""}${value.toFixed(4)}</td><td style="padding:7px 12px;color:${color};font-size:12px;">${value>0?"↑ Increases risk":"↓ Reduces risk"}</td></tr>`;
  }).join("");
  const now = new Date().toLocaleString();
  const patientName = form.patient_name || "Unknown Patient";
  const patientAge = form.age;
  const patientSex = form.sex === 1 ? "Male" : "Female";
  const html=`<!DOCTYPE html><html><head><meta charset="utf-8"/><title>CardioScan Report - ${patientName}</title><style>*{margin:0;padding:0;box-sizing:border-box;}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1e293b;}.page{max-width:800px;margin:0 auto;background:white;min-height:100vh;}.header{background:linear-gradient(135deg,#0f172a,#1e293b);color:white;padding:40px;}.header-top{display:flex;justify-content:space-between;align-items:flex-start;}.logo{display:flex;align-items:center;gap:12px;}.logo-icon{width:44px;height:44px;background:#f43f5e;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:22px;}.logo-text{font-size:24px;font-weight:800;}.logo-sub{font-size:13px;color:#94a3b8;margin-top:2px;}.report-meta{text-align:right;font-size:12px;color:#94a3b8;}.diagnosis-banner{margin:32px 40px;padding:24px;border-radius:16px;display:flex;align-items:center;justify-content:space-between;}.diagnosis-text{font-size:22px;font-weight:800;}.risk-badge{padding:8px 20px;border-radius:999px;font-weight:700;font-size:14px;}.score-row{display:flex;gap:16px;margin:0 40px 32px;}.score-card{flex:1;padding:20px;background:#f8fafc;border-radius:12px;border:1px solid #e2e8f0;text-align:center;}.score-val{font-size:28px;font-weight:800;}.score-label{font-size:11px;color:#64748b;margin-top:4px;text-transform:uppercase;}.section{margin:0 40px 28px;}.section-title{font-size:13px;font-weight:700;text-transform:uppercase;color:#64748b;margin-bottom:12px;padding-bottom:8px;border-bottom:2px solid #f43f5e;}table{width:100%;border-collapse:collapse;}.footer{background:#0f172a;color:#94a3b8;padding:24px 40px;font-size:12px;display:flex;justify-content:space-between;margin-top:40px;}</style></head><body><div class="page"><div class="header"><div class="header-top"><div class="logo"><div class="logo-icon">🫀</div><div><div class="logo-text">CardioScan</div><div class="logo-sub">Heart Disease Prediction Report</div></div></div><div class="report-meta"><div>Generated: ${now}</div><div style="margin-top:4px;">Model: ${modelLabel}</div></div></div></div><div style="margin:24px 40px 0;padding:20px 24px;background:#f8fafc;border-radius:12px;border:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;"><div><p style="font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:.08em;margin-bottom:4px;">Patient</p><p style="font-size:20px;font-weight:800;color:#1e293b;">${patientName}</p><p style="font-size:13px;color:#64748b;margin-top:2px;">${patientAge} years old · ${patientSex}</p></div><div style="text-align:right;"><p style="font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:.08em;margin-bottom:4px;">Report Date</p><p style="font-size:13px;color:#1e293b;font-weight:600;">${now}</p></div></div><div class="diagnosis-banner" style="background:${result.prediction===1?'#fff1f2':'#f0fdf4'};border:2px solid ${riskColor}20;"><div><div class="diagnosis-text" style="color:${riskColor}">${diagnosisText}</div><div style="font-size:13px;margin-top:4px;color:${riskColor};opacity:.8;">Based on ${modelLabel} classifier</div></div><div class="risk-badge" style="background:${riskColor}20;color:${riskColor};border:1px solid ${riskColor}40;">${result.risk_level} Risk</div></div><div class="score-row"><div class="score-card"><div class="score-val" style="color:${riskColor}">${pct}%</div><div class="score-label">Risk Probability</div></div><div class="score-card"><div class="score-val" style="color:#6366f1">${result.risk_level}</div><div class="score-label">Risk Level</div></div><div class="score-card"><div class="score-val" style="color:#0ea5e9">${result.prediction===1?"Positive":"Negative"}</div><div class="score-label">Diagnosis</div></div></div><div class="section"><div class="section-title">Patient Clinical Data</div><table><tbody>${patientRows}</tbody></table></div><div class="section"><div class="section-title">Feature Contributions (SHAP)</div><table><thead><tr style="background:#f8fafc;"><th style="padding:8px 12px;text-align:left;font-size:12px;color:#64748b;">Feature</th><th style="padding:8px 12px;text-align:left;font-size:12px;color:#64748b;">SHAP Value</th><th style="padding:8px 12px;text-align:left;font-size:12px;color:#64748b;">Impact</th></tr></thead><tbody>${shapRows}</tbody></table></div><div class="section"><div class="section-title">Disclaimer</div><p style="font-size:12px;color:#64748b;line-height:1.6;">This report is for informational purposes only. Not a substitute for professional medical advice. Always consult a qualified healthcare provider.</p></div><div class="footer"><span>CardioScan — Heart Disease Prediction System</span><span>For clinical reference only</span></div></div></body></html>`;
  const blob=new Blob([html],{type:"text/html"});
  const url=URL.createObjectURL(blob);
  const win=window.open(url,"_blank");
  if(win){win.onload=()=>win.print();}
  toast.success("Report opened — use Print → Save as PDF!");
}

function buildSystemPrompt(form, result, modelLabel) {
  const topShap=result.feature_names.map((name,i)=>({name,value:result.shap_values[i]})).sort((a,b)=>Math.abs(b.value)-Math.abs(a.value)).slice(0,5);
  const FEATURE_KEYS=["age","sex","cp","trestbps","chol","fbs","restecg","thalach","exang","oldpeak","slope","ca","thal"];
  const patientSummary=FEATURE_KEYS.map(key=>`${FIELD_LABELS[key]}: ${form[key]}`).join(", ");
  const shapSummary=topShap.map(({name,value})=>`${FIELD_LABELS[name]||name}: ${value>0?"+":""}${value.toFixed(4)} (${value>0?"increases":"reduces"} risk)`).join(", ");
  return `You are 202Officials, an AI medical assistant built into CardioScan.\n\nPATIENT REPORT:\n- Diagnosis: ${result.prediction===1?"Heart Disease Detected":"No Heart Disease Detected"}\n- Risk Level: ${result.risk_level}\n- Probability: ${Math.round(result.probability*100)}%\n- Model: ${modelLabel}\n- Patient Data: ${patientSummary}\n- Top SHAP Features: ${shapSummary}\n\nBe friendly, clear, empathetic and concise. Explain medical terms simply. Never diagnose or prescribe. Always recommend consulting a doctor.`;
}

function ChatBot({ form, result, modelLabel }) {
  const [messages, setMessages] = useState([{role:"assistant",content:`Hi! I'm **202Officials** 🤖❤️ The model shows a **${result.risk_level} risk** (${Math.round(result.probability*100)}%) of heart disease. Ask me anything!`}]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  useEffect(()=>{bottomRef.current?.scrollIntoView({behavior:"smooth"});},[messages]);

  const sendMessage = async () => {
    if(!input.trim()||loading) return;
    const userMsg=input.trim(); setInput("");
    setMessages(prev=>[...prev,{role:"user",content:userMsg}]);
    setLoading(true);
    try {
      const history=messages.map(m=>({role:m.role,content:m.content}));
      const {data}=await chatWithBot(buildSystemPrompt(form,result,modelLabel),[...history,{role:"user",content:userMsg}]);
      setMessages(prev=>[...prev,{role:"assistant",content:data.reply||"Sorry, try again."}]);
    } catch(err) {
      const msg=err?.response?.data?.error||"Connection error.";
      setMessages(prev=>[...prev,{role:"assistant",content:msg}]);
    } finally{setLoading(false);}
  };

  const suggestions=["Why is my risk high?","What does CA mean?","Explain SHAP values","What lifestyle changes help?"];
  return (
    <div className="glass-card overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-800/60 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-crimson-500/20 border border-crimson-500/30 flex items-center justify-center"><Bot size={15} className="text-crimson-400"/></div>
        <div><p className="text-white font-display font-semibold text-sm">202Officials</p><p className="text-slate-500 text-xs">Ask anything about your report</p></div>
        <div className="ml-auto flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"/><span className="text-xs text-emerald-400">Online</span></div>
      </div>
      <div className="h-72 overflow-y-auto px-4 py-4 space-y-4">
        {messages.map((msg,i)=>(
          <div key={i} className={`flex gap-3 ${msg.role==="user"?"flex-row-reverse":""}`}>
            <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${msg.role==="assistant"?"bg-crimson-500/20 border border-crimson-500/30":"bg-slate-700"}`}>
              {msg.role==="assistant"?<Bot size={13} className="text-crimson-400"/>:<User size={13} className="text-slate-300"/>}
            </div>
            <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${msg.role==="assistant"?"bg-slate-800/80 text-slate-200 rounded-tl-sm":"text-white rounded-tr-sm"}`}
              style={msg.role==="user"?{background:"linear-gradient(135deg,#be123c,#f43f5e)"}:{}}>
              {msg.content.split("**").map((part,j)=>j%2===1?<strong key={j} className="text-white">{part}</strong>:part)}
            </div>
          </div>
        ))}
        {loading&&(
          <div className="flex gap-3">
            <div className="w-7 h-7 rounded-full bg-crimson-500/20 border border-crimson-500/30 flex items-center justify-center shrink-0"><Bot size={13} className="text-crimson-400"/></div>
            <div className="bg-slate-800/80 px-4 py-3 rounded-2xl rounded-tl-sm flex items-center gap-2"><Loader size={13} className="text-crimson-400 animate-spin"/><span className="text-slate-400 text-sm">Thinking...</span></div>
          </div>
        )}
        <div ref={bottomRef}/>
      </div>
      {messages.length<=1&&(
        <div className="px-4 pb-3 flex flex-wrap gap-2">
          {suggestions.map(s=><button key={s} onClick={()=>setInput(s)} className="text-xs px-3 py-1.5 rounded-full border border-crimson-500/30 text-crimson-400 hover:bg-crimson-500/10 transition-all">{s}</button>)}
        </div>
      )}
      <div className="px-4 pb-4">
        <div className="flex gap-2 items-end">
          <textarea value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendMessage();}}} placeholder="Ask about your results..." rows={1} className="flex-1 form-input resize-none text-sm py-2.5" style={{minHeight:42}}/>
          <button onClick={sendMessage} disabled={!input.trim()||loading} className="w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 disabled:opacity-40 shrink-0" style={{background:"linear-gradient(135deg,#be123c,#f43f5e)"}}><Send size={15} className="text-white"/></button>
        </div>
        <p className="text-xs text-slate-600 mt-1.5">Press Enter to send · Not a substitute for medical advice</p>
      </div>
      <OnboardingTour/>
    </div>
  );
}

function WhatIfAnalysis({ originalForm, originalResult, model }) {
  const NUMERIC_FIELDS = [
    {key:"age",label:"Age",min:1,max:120,step:1,unit:"yrs"},
    {key:"trestbps",label:"Resting BP",min:60,max:250,step:1,unit:"mmHg"},
    {key:"chol",label:"Cholesterol",min:100,max:600,step:1,unit:"mg/dl"},
    {key:"thalach",label:"Max HR",min:60,max:250,step:1,unit:"bpm"},
    {key:"oldpeak",label:"Oldpeak",min:0,max:10,step:0.1,unit:"mm"},
  ];
  const [whatIfForm, setWhatIfForm] = useState({...originalForm});
  const [whatIfResult, setWhatIfResult] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(async () => {
      setLoading(true);
      try {
        const {age,sex,cp,trestbps,chol,fbs,restecg,thalach,exang,oldpeak,slope,ca,thal} = whatIfForm;
        const {data} = await whatif({age,sex,cp,trestbps,chol,fbs,restecg,thalach,exang,oldpeak,slope,ca,thal,model});
        setWhatIfResult(data);
      } catch(e) {} finally {setLoading(false);}
    }, 500);
    return () => clearTimeout(timeout);
  }, [whatIfForm, model]);

  const origPct = Math.round(originalResult.probability * 100);
  const newPct = whatIfResult ? Math.round(whatIfResult.probability * 100) : origPct;
  const diff = newPct - origPct;
  const riskColor = (level) => level==="Low"?"#10b981":level==="Moderate"?"#f59e0b":"#f43f5e";

  return (
    <div className="glass-card p-5">
      <div className="flex items-center gap-2 mb-4">
        <Sliders size={15} className="text-crimson-400"/>
        <p className="text-white font-display font-semibold text-sm">What-If Analysis</p>
        <span className="text-xs text-slate-500 ml-1">— adjust values to see risk change in real time</span>
      </div>

      {/* Risk comparison */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="rounded-xl p-3 text-center" style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.06)"}}>
          <p className="text-xs text-slate-500 mb-1">Original Risk</p>
          <p className="font-display text-2xl font-bold" style={{color:riskColor(originalResult.risk_level)}}>{origPct}%</p>
          <p className="text-xs mt-1" style={{color:riskColor(originalResult.risk_level)}}>{originalResult.risk_level}</p>
        </div>
        <div className="rounded-xl p-3 text-center" style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.06)"}}>
          <p className="text-xs text-slate-500 mb-1">Modified Risk {loading&&<span className="text-slate-600">...</span>}</p>
          <p className="font-display text-2xl font-bold" style={{color:riskColor(whatIfResult?.risk_level||originalResult.risk_level)}}>{newPct}%</p>
          <p className="text-xs mt-1 font-semibold" style={{color:diff>0?"#f43f5e":diff<0?"#10b981":"#64748b"}}>
            {diff>0?`+${diff}%`:diff<0?`${diff}%`:"No change"}
          </p>
        </div>
      </div>

      {/* Sliders for numeric fields */}
      <div className="space-y-4">
        {NUMERIC_FIELDS.map(field=>(
          <div key={field.key}>
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-slate-400 font-medium">{field.label}</span>
              <span className="text-slate-300 font-mono">{whatIfForm[field.key]} {field.unit}</span>
            </div>
            <input type="range" min={field.min} max={field.max} step={field.step}
              value={whatIfForm[field.key]}
              onChange={e=>setWhatIfForm(f=>({...f,[field.key]:parseFloat(e.target.value)}))}
              className="w-full h-1 rounded-full appearance-none cursor-pointer"
              style={{background:`linear-gradient(to right, #f43f5e ${((whatIfForm[field.key]-field.min)/(field.max-field.min))*100}%, rgba(244,63,94,0.2) 0%)`}}
            />
            <div className="flex justify-between text-xs text-slate-700 mt-0.5">
              <span>{field.min}</span><span>{field.max}</span>
            </div>
          </div>
        ))}
      </div>

      <button onClick={()=>setWhatIfForm({...originalForm})}
        className="mt-4 w-full py-2 rounded-xl border border-slate-700/50 text-slate-400 hover:text-slate-200 text-sm transition-all">
        Reset to Original
      </button>
    </div>
  );
}

function EnsembleResults({ ensembleResults, votes }) {
  if (!ensembleResults) return null;
  const models = [
    { key: "logistic_regression", label: "Logistic Regression", icon: "📈" },
    { key: "random_forest", label: "Random Forest", icon: "🌲" },
    { key: "knn", label: "K-Nearest Neighbors", icon: "🔵" },
  ];
  return (
    <div className="glass-card p-5">
      <p className="text-xs text-slate-500 uppercase tracking-widest mb-1 font-semibold">Ensemble Voting</p>
      <p className="text-slate-500 text-xs mb-4">Individual model predictions — majority vote wins</p>
      <div className="space-y-3">
        {models.map(({ key, label, icon }) => {
          const r = ensembleResults[key];
          if (!r) return null;
          const positive = r.prediction === 1;
          const color = positive ? "#f43f5e" : "#10b981";
          return (
            <div key={key} className="flex items-center gap-3 p-3 rounded-xl" style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.06)"}}>
              <span className="text-lg">{icon}</span>
              <div className="flex-1">
                <p className="text-xs text-slate-400 font-medium">{label}</p>
                <div className="h-1.5 rounded-full bg-slate-800 mt-1 overflow-hidden">
                  <div className="h-full rounded-full" style={{width:`${r.probability*100}%`,background:color}}/>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs font-mono font-bold" style={{color}}>{Math.round(r.probability*100)}%</p>
                <p className="text-xs" style={{color}}>{positive?"Disease":"Healthy"}</p>
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-4 pt-4 border-t border-slate-800/60 flex items-center justify-between">
        <p className="text-xs text-slate-500">Votes for Heart Disease</p>
        <div className="flex gap-1">
          {[0,1,2].map(i => (
            <div key={i} className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${i < votes.heart_disease ? "bg-crimson-500 text-white" : "bg-slate-800 text-slate-600"}`}>
              {i < votes.heart_disease ? "✓" : "✗"}
            </div>
          ))}
          <span className="text-xs text-slate-400 ml-2 self-center">{votes.heart_disease}/3 voted positive</span>
        </div>
      </div>
    </div>
  );
}

function FieldInput({ field, value, onChange }) {
  if(field.type==="select") return <select className="form-input" value={value} onChange={e=>onChange(field.key,Number(e.target.value))}>{field.options.map(o=><option key={o.v} value={o.v}>{o.l}</option>)}</select>;
  return <div className="relative"><input type="number" className="form-input pr-14" value={value} min={field.min} max={field.max} step={field.step} onChange={e=>onChange(field.key,parseFloat(e.target.value))}/>{field.unit&&<span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 font-mono">{field.unit}</span>}</div>;
}

function RiskGauge({ probability, riskLevel }) {
  const pct=Math.round(probability*100);
  const color=riskLevel==="Low"?"#10b981":riskLevel==="Moderate"?"#f59e0b":"#f43f5e";
  return (
    <div className="flex flex-col items-center">
      <div className="relative w-48 h-48">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart cx="50%" cy="50%" innerRadius="65%" outerRadius="85%" data={[{value:pct,fill:color}]} startAngle={180} endAngle={0}>
            <PolarAngleAxis type="number" domain={[0,100]} angleAxisId={0} tick={false}/>
            <RadialBar background={{fill:"rgba(244,63,94,0.08)"}} dataKey="value" cornerRadius={8}/>
          </RadialBarChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center mt-6">
          <span className="font-display text-4xl font-bold" style={{color}}>{pct}%</span>
          <span className="text-slate-400 text-xs mt-1">risk score</span>
        </div>
      </div>
      <span className={`mt-2 px-4 py-1.5 rounded-full text-sm font-semibold ${riskLevel==="Low"?"risk-low":riskLevel==="Moderate"?"risk-moderate":"risk-high"}`}>{riskLevel} Risk</span>
    </div>
  );
}

function ShapWaterfall({ shapValues, featureNames }) {
  const data=featureNames.map((name,i)=>({name,value:shapValues[i]})).sort((a,b)=>Math.abs(b.value)-Math.abs(a.value)).slice(0,10);
  const maxAbs=Math.max(...data.map(d=>Math.abs(d.value)));
  return (
    <div className="space-y-2">
      {data.map(({name,value})=>{
        const pct=Math.abs(value)/maxAbs*100; const positive=value>0;
        return <div key={name} className="flex items-center gap-3"><span className="w-24 text-right text-xs text-slate-400 font-mono shrink-0">{name}</span><div className="flex-1 flex items-center gap-1">{positive?<><div className="flex-1"/><div className="h-5 rounded-sm" style={{width:`${pct/2}%`,background:"rgba(244,63,94,0.7)",minWidth:4}}/></>:<><div className="h-5 rounded-sm ml-auto" style={{width:`${pct/2}%`,background:"rgba(16,185,129,0.7)",minWidth:4}}/><div className="flex-1"/></>}</div><span className={`w-16 text-xs font-mono ${positive?"text-crimson-400":"text-emerald-400"}`}>{value>0?"+":""}{value.toFixed(3)}</span></div>;
      })}
      <div className="flex justify-between text-xs text-slate-600 mt-1 px-24"><span>← Reduces risk</span><span>Increases risk →</span></div>
    </div>
  );
}

export default function PredictPage() {
  const { t } = useTranslation();
  const FIELDS = useFields();
  const GROUPS = ["Demographics", "Symptoms", "Vitals", "Cardiac", "Lab"];
  const [form, setForm] = useState(buildDefaults());
  const [model, setModel] = useState("random_forest");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const modelLabel=MODELS.find(m=>m.key===model)?.label||model;
  const handleChange=(key,val)=>setForm(f=>({...f,[key]:val}));
  const chatRef = useRef(null);
  const resultRef = useRef(null);
  const [alarmTrigger, setAlarmTrigger] = useState(0);

  const handleSubmit = async () => {
    setLoading(true); setResult(null);
    try{
      const payload = model === "ensemble"
        ? {...form, model: "random_forest", ensemble: true}
        : {...form, model};
      const{data}=await predict(payload);
      setResult(data);
      toast.success("Prediction complete!");
      // Scroll to result immediately
      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 300);
      // Then scroll to chatbot after 7 seconds
      setTimeout(() => {
        chatRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 7500);
    }
    catch(err){toast.error(err?.response?.data?.detail||"Backend error.");}
    finally{setLoading(false);}
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      <ECGBackground/>
      {/* Ambient background orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{zIndex:0}}>
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full opacity-5 blur-3xl animate-float"
          style={{background:"#f43f5e", animationDelay:"0s"}}/>
        <div className="absolute bottom-1/3 right-1/4 w-64 h-64 rounded-full opacity-4 blur-3xl animate-float"
          style={{background:"#6366f1", animationDelay:"2s"}}/>
      </div>

      <div className="mb-10 animate-fadeinup relative z-10">
        <div className="flex items-center gap-2 text-crimson-400 text-sm font-mono mb-3 opacity-70"><Zap size={13}/> {t("predict.title").toUpperCase()} RISK ASSESSMENT</div>
        <h1 className="font-display text-4xl font-bold text-white leading-tight">{t("predict.title")}<br/><span className="gradient-text">{t("predict.title2")}</span></h1>
        <p className="text-slate-400 mt-3 max-w-xl text-sm leading-relaxed">{t("predict.subtitle")}</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 relative z-10">
        <div className="xl:col-span-2 space-y-6">
          <div className="glass-card p-5">
            <p className="text-xs text-slate-500 uppercase tracking-widest mb-3 font-semibold">{t("predict.patient_info")}</p>
            <div>
              <label className="block text-xs text-slate-400 mb-1.5 font-medium">{t("predict.patient_name")} <span className="text-slate-600">— {t("predict.patient_name_hint")}</span></label>
              <input
                type="text"
                className="form-input"
                placeholder={t("predict.patient_name")}
                value={form.patient_name || ""}
                onChange={e => handleChange("patient_name", e.target.value)}
              />
            </div>
          </div>

          <div className="glass-card p-5 tour-model-selector">
            <p className="text-xs text-slate-500 uppercase tracking-widest mb-3 font-semibold">{t("predict.select_algorithm")}</p>
            <div className="flex gap-3 flex-wrap">
              {MODELS.map(m=><button key={m.key} onClick={()=>setModel(m.key)} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all duration-200 ${model===m.key?"bg-crimson-500/20 border-crimson-500/50 text-crimson-300":"border-slate-700/50 text-slate-400 hover:border-slate-600 hover:text-slate-200"}`}><span>{m.icon}</span>{m.label}</button>)}
            </div>
          </div>

          {GROUPS.map(group=>(
            <div key={group} className="glass-card p-6 form-group-card">
              <div className="flex items-center gap-2 mb-5"><div className="w-1 h-4 rounded-full bg-crimson-500"/><h3 className="font-display font-semibold text-white text-sm tracking-wide uppercase">{t(`fields.groups.${group}`, group)}</h3></div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {FIELDS.filter(f=>f.group===group).map(field=>(
                  <div key={field.key}>
                    <label className="block text-xs text-slate-400 mb-1.5 font-medium">{field.label}{field.hint&&<span className="text-slate-600 ml-1">— {field.hint}</span>}</label>
                    <FieldInput field={field} value={form[field.key]} onChange={handleChange}/>
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div className="flex gap-4 tour-run-btn">
            <button onClick={handleSubmit} disabled={loading} className="flex-1 flex items-center justify-center gap-2 py-4 rounded-xl font-display font-semibold text-white text-base transition-all duration-200 animate-glow disabled:opacity-60" style={{background:"linear-gradient(135deg,#be123c,#f43f5e)"}}>
              {loading?<><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>{t("predict.analyzing")}</>:<><Heart size={16} className="fill-white"/>{t("predict.run_prediction")}<ChevronRight size={16}/></>}
            </button>
            <button onClick={()=>{setForm(buildDefaults());setResult(null);}} className="flex items-center gap-2 px-5 py-4 rounded-xl border border-slate-700/50 text-slate-400 hover:text-slate-200 transition-all duration-200 font-medium"><RotateCcw size={15}/> {t("predict.reset")}</button>
          </div>
        </div>

        <div className="space-y-6">
          {!result&&!loading&&(
            <div className="glass-card p-8 flex flex-col items-center justify-center text-center min-h-[320px]">
              <div className="w-16 h-16 rounded-2xl bg-crimson-500/10 border border-crimson-500/20 flex items-center justify-center mb-4 animate-pulse-slow"><Heart size={28} className="text-crimson-400"/></div>
              <p className="font-display font-semibold text-white mb-2">{t("predict.awaiting")}</p>
              <p className="text-slate-500 text-sm">{t("predict.awaiting_sub")}</p>
            </div>
          )}

          {loading&&(
            <div className="glass-card p-8 flex flex-col items-center justify-center min-h-[320px]">
              <div className="relative mb-6">
                <div className="w-20 h-20 rounded-full border-2 border-crimson-500/20"><div className="w-16 h-16 rounded-full border-2 border-crimson-500/40 animate-spin m-1" style={{borderTopColor:"#f43f5e"}}/></div>
                <Heart size={20} className="text-crimson-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 fill-crimson-400 animate-heartbeat"/>
              </div>
              <p className="text-white font-display font-semibold">{t("predict.running")}</p>
              <p className="text-slate-500 text-sm mt-1">{t("predict.computing")}</p>
            </div>
          )}

          {result&&(
            <div className="space-y-5 animate-fadeinup">
              <div ref={resultRef}/>
              <ResultReveal result={result} modelLabel={modelLabel} onDownload={()=>generatePDF(form,result,modelLabel)}>
                <div className="px-5 pb-5 space-y-4">
                  <div className="glass-card p-5">
                    <p className="text-xs text-slate-500 uppercase tracking-widest mb-1 font-semibold">{t("predict.feature_contributions")}</p>
                    <p className="text-slate-500 text-xs mb-4">{t("predict.shap_desc")}</p>
                    <ShapWaterfall shapValues={result.shap_values} featureNames={result.feature_names}/>
                  </div>
                  <div className="glass-card p-5">
                    <div className="flex justify-between text-xs text-slate-400 mb-2">
                      <span>{t("predict.confidence")}</span>
                      <span className="font-mono">{(result.probability*100).toFixed(1)}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-1000" style={{width:`${result.probability*100}%`,background:result.risk_level==="Low"?"linear-gradient(90deg,#059669,#10b981)":result.risk_level==="Moderate"?"linear-gradient(90deg,#d97706,#f59e0b)":"linear-gradient(90deg,#be123c,#f43f5e)"}}/>
                    </div>
                    <p className="text-slate-600 text-xs mt-2">Probability of heart disease presence</p>
                  </div>
                  {result.ensemble_results && <EnsembleResults ensembleResults={result.ensemble_results} votes={result.votes}/>}
                </div>
              </ResultReveal>
              <WhatIfAnalysis originalForm={form} originalResult={result} model={model}/>
              <div ref={chatRef}/>
              <ChatBot form={form} result={result} modelLabel={modelLabel}/>
            </div>
          )}
        </div>
      </div>
      <HeartbeatOverlay visible={loading}/>
    </div>
  );
}
