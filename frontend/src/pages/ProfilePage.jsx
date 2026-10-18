import React, { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  Heart,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Trash2,
  ArrowRight,
  ShieldAlert,
  ShieldCheck,
  User,
  Mail,
  Activity,
  Ruler,
  Scale,
  Sparkles,
  Info,
  Clock,
  BarChart2,
  Lock,
  Edit3,
  Copy,
  Check,
  X,
  FileText,
  AlertTriangle,
  RotateCcw,
  Download,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import {
  getHistory,
  deleteAccount,
  getProfile,
  updateProfile,
  correctProfile,
} from "../api";
import { auth } from "../firebase";
import { generateReportFromPrediction } from "../utils/reportGenerator";

const FEATURE_NAMES = {
  age: "Age",
  sex: "Sex",
  cp: "Chest Pain Type",
  trestbps: "Resting BP",
  chol: "Cholesterol",
  fbs: "Fasting Blood Sugar",
  restecg: "Resting ECG",
  thalach: "Max Heart Rate",
  exang: "Exercise Angina",
  oldpeak: "ST Depression",
  slope: "ST Slope",
  ca: "Major Vessels",
  thal: "Thalassemia",
};

export default function ProfilePage() {
  const { t } = useTranslation();
  const { user, logoutUser, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Profile and History State
  const [profile, setProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [predictions, setPredictions] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  // Modals & Forms State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCorrectionModalOpen, setIsCorrectionModalOpen] = useState(false);
  const [copiedPid, setCopiedPid] = useState(false);

  // Profile Form Data
  const [formData, setFormData] = useState({
    name: "",
    date_of_birth: "",
    height: "",
    weight: "",
  });
  const [savingProfile, setSavingProfile] = useState(false);

  // Correction Form Data
  const [correctionData, setCorrectionData] = useState({
    field_name: "date_of_birth",
    new_value: "",
    reason: "",
  });
  const [savingCorrection, setSavingCorrection] = useState(false);

  // Account Deletion State
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  // Load Profile and History
  const fetchProfileData = async () => {
    try {
      const res = await getProfile();
      if (res?.data) {
        setProfile(res.data);
        setFormData({
          name: res.data.name || "",
          date_of_birth: res.data.date_of_birth || "",
          height: res.data.height !== null && res.data.height !== undefined ? String(res.data.height) : "",
          weight: res.data.weight !== null && res.data.weight !== undefined ? String(res.data.weight) : "",
        });
      }
    } catch (_) {
      // Fallback to basic user if profile endpoint temporarily unavailable
    } finally {
      setLoadingProfile(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    fetchProfileData();

    getHistory()
      .then((res) => {
        if (isMounted) {
          setPredictions(Array.isArray(res.data) ? res.data : []);
        }
      })
      .catch(() => {
        if (isMounted) setPredictions([]);
      })
      .finally(() => {
        if (isMounted) setLoadingHistory(false);
      });

    // Check query params to auto-open setup modal if redirected from verification
    if (searchParams.get("setup") === "true") {
      setIsEditModalOpen(true);
    }

    return () => {
      isMounted = false;
    };
  }, [searchParams]);

  const activePatientId = profile?.patient_id || user?.patient_id;

  const handleCopyPid = () => {
    if (!activePatientId) return;
    navigator.clipboard.writeText(activePatientId);
    setCopiedPid(true);
    toast.success(t("dashboard.pid_copied", "Patient ID copied to clipboard"));
    setTimeout(() => setCopiedPid(false), 2000);
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.name.trim()) {
      toast.error(t("dashboard.name_cannot_be_empty", "Full legal name cannot be empty or whitespace only."));
      return;
    }
    setSavingProfile(true);
    try {
      const payload = {};
      if (formData.name.trim() !== (profile?.name || "").trim()) {
        payload.name = formData.name.trim();
      }
      if (formData.date_of_birth) payload.date_of_birth = formData.date_of_birth;
      if (formData.height !== "") payload.height = parseFloat(formData.height);
      if (formData.weight !== "") payload.weight = parseFloat(formData.weight);

      const res = await updateProfile(payload);
      if (res?.data) {
        setProfile(res.data);
        toast.success(t("dashboard.profile_updated", "Clinical profile updated successfully!"));
        setIsEditModalOpen(false);
        if (refreshUser) refreshUser();
      }
    } catch (err) {
      const errMsg = err?.response?.data?.detail || err?.response?.data?.error || t("common.error", "Failed to update profile.");
      toast.error(errMsg);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSaveCorrection = async (e) => {
    e.preventDefault();
    if (correctionData.reason.trim().length < 10) {
      toast.error(t("dashboard.reason_min_length", "Please provide a clinical rationale of at least 10 characters."));
      return;
    }
    setSavingCorrection(true);
    try {
      const res = await correctProfile({
        field_name: correctionData.field_name,
        new_value: correctionData.new_value.trim(),
        reason: correctionData.reason.trim(),
      });
      if (res?.data?.profile) {
        setProfile(res.data.profile);
        toast.success(t("dashboard.correction_success", "Profile correction recorded to audit log!"));
        setIsCorrectionModalOpen(false);
        setCorrectionData({ field_name: "date_of_birth", new_value: "", reason: "" });
        if (refreshUser) refreshUser();
      }
    } catch (err) {
      const errMsg = err?.response?.data?.detail || err?.response?.data?.error || t("common.error", "Failed to submit correction.");
      toast.error(errMsg);
    } finally {
      setSavingCorrection(false);
    }
  };

  const handleDelete = async () => {
    if (confirmText !== "DELETE") {
      toast.error(t("dashboard.confirm_delete_input_label", 'Type "DELETE" to confirm'));
      return;
    }
    setDeleting(true);
    try {
      const res = await deleteAccount();
      if (auth.currentUser) {
        try {
          await auth.currentUser.delete();
        } catch (_) {}
      }
      logoutUser();
      if (res?.status === 202 || res?.data?.firebase_cleanup === "pending") {
        toast(
          t("dashboard.delete_queued", "Account deleted. Firebase identity cleanup is queued in the background."),
          { icon: "ℹ️" }
        );
      } else {
        toast.success(t("dashboard.delete_success", "Account deleted successfully"));
      }
      navigate("/");
    } catch (err) {
      toast.error(err?.response?.data?.error || t("common.error", "Could not delete account"));
    } finally {
      setDeleting(false);
    }
  };

  // Date formatting helpers
  const memberSinceFormatted = user?.created_at
    ? new Date(user.created_at).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : t("dashboard.not_recorded", "Recent");

  const daysActive = user?.created_at
    ? Math.max(1, Math.floor((new Date() - new Date(user.created_at)) / (1000 * 60 * 60 * 24)))
    : 1;

  const userInitial = (profile?.name?.[0] || user?.name?.[0] || user?.email?.[0] || "P").toUpperCase();

  // Helper to extract primary biomarker driver from prediction SHAP
  const getPrimaryDriver = (p) => {
    if (!p) return null;
    let shap = p.shap_values;
    if (typeof shap === "string") {
      try {
        shap = JSON.parse(shap);
      } catch {
        shap = [];
      }
    }
    if (!Array.isArray(shap) || shap.length === 0) return null;

    let maxVal = -1;
    let maxIdx = -1;
    shap.forEach((val, idx) => {
      const absVal = Math.abs(val);
      if (absVal > maxVal) {
        maxVal = absVal;
        maxIdx = idx;
      }
    });

    const featureKeys = Object.keys(FEATURE_NAMES);
    if (maxIdx >= 0 && maxIdx < featureKeys.length) {
      const key = featureKeys[maxIdx];
      const sign = shap[maxIdx] > 0 ? "+" : "";
      return `${FEATURE_NAMES[key]} (${sign}${shap[maxIdx].toFixed(3)} SHAP)`;
    }
    return null;
  };

  const completionPercentage = profile?.profile_completion_percentage ?? (user?.is_verified ? 40 : 20);
  const configuredCount = profile?.configured_domains_count ?? (user?.is_verified ? 2 : 1);
  const cooldowns = profile?.cooldowns || {};

  // Derive genuine profile completeness across all 5 clinical domains
  // Based strictly on actual profile completion data returned from the backend, not hardcoded assumptions
  const isProfileComplete = Boolean(
    profile && (
      profile.profile_completed === true ||
      (profile.configured_domains_count && profile.total_domains_count && profile.configured_domains_count >= profile.total_domains_count) ||
      (profile.domains && Object.keys(profile.domains).length >= 5 && Object.values(profile.domains).every(Boolean))
    )
  );

  // Calculate dynamic age from date of birth (YYYY-MM-DD)
  const calculateAge = (dobString) => {
    if (!dobString) return null;
    const parts = dobString.split("-");
    if (parts.length !== 3) return null;
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    if (isNaN(year) || isNaN(month) || isNaN(day)) return null;

    const today = new Date();
    let age = today.getFullYear() - year;
    const m = today.getMonth() - month;
    if (m < 0 || (m === 0 && today.getDate() < day)) {
      age--;
    }
    return age >= 0 && age <= 130 ? age : null;
  };

  // Calculate live BMI from height (cm) and weight (kg)
  const calculateBmi = (heightCm, weightKg) => {
    const h = parseFloat(heightCm);
    const w = parseFloat(weightKg);
    if (!h || !w || h < 50 || h > 260 || w < 20 || w > 350) return null;
    const hMeters = h / 100;
    const bmiVal = w / (hMeters * hMeters);
    if (isNaN(bmiVal) || bmiVal < 10 || bmiVal > 80) return null;

    let category = t("dashboard.bmi_normal", "Normal range (18.5 – 24.9)");
    let color = "text-[#35483E] bg-[#E4EDE5] border-[#D3DFD5]";
    if (bmiVal < 18.5) {
      category = t("dashboard.bmi_underweight", "Underweight (< 18.5)");
      color = "text-[#6B7F74] bg-[#F7F5F0] border-[#E5E0D6]";
    } else if (bmiVal >= 25 && bmiVal < 30) {
      category = t("dashboard.bmi_overweight", "Overweight (25.0 – 29.9)");
      color = "text-[#8A5B28] bg-[#FDF6E9] border-[#F1E0C5]";
    } else if (bmiVal >= 30) {
      category = t("dashboard.bmi_obese", "Obesity range (≥ 30.0)");
      color = "text-[#B35D52] bg-[#FAF0EE] border-[#F0D5D1]";
    }
    return {
      value: bmiVal.toFixed(1),
      category,
      color,
    };
  };

  const liveBmi = calculateBmi(profile?.height, profile?.weight);

  // Keyboard accessibility: ESC closes open modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        if (isEditModalOpen && !savingProfile) setIsEditModalOpen(false);
        if (isCorrectionModalOpen && !savingCorrection) setIsCorrectionModalOpen(false);
      }
    };
    if (isEditModalOpen || isCorrectionModalOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isEditModalOpen, isCorrectionModalOpen, savingProfile, savingCorrection]);

  return (
    <div className="w-full min-h-[calc(100vh-4rem)] bg-[#F7F5F0] text-[#35483E] py-8 sm:py-12 selection:bg-[#E4EDE5] selection:text-[#35483E]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* ── 1. Welcoming Profile Header ── */}
      <header className="glossy-card p-6 sm:p-8 border border-[#E5E0D6] shadow-sm relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 text-xs font-mono tracking-wider text-[#52665A] uppercase">
              <span className="w-2 h-2 rounded-full bg-[#35483E]" />
              <span>{t("dashboard.tag", "PATIENT DASHBOARD · CLINICAL PROFILE & ASSESSMENT HUB")}</span>
            </div>

            <h1 className="font-serif font-bold text-3xl sm:text-4xl text-[#35483E] tracking-tight">
              {t("dashboard.welcome", "Welcome back")},{" "}
              <span className="italic font-normal">
                {(() => {
                  const firstName = profile?.name ? profile.name.split(" ")[0] : user?.name ? user.name.split(" ")[0] : "Patient";
                  return firstName.endsWith(".") ? firstName : `${firstName}.`;
                })()}
              </span>
            </h1>

            <p className="text-sm text-[#52665A] max-w-2xl leading-relaxed">
              {t(
                "dashboard.subtitle",
                "Review your clinical profile, monitor baseline biometrics, and perform machine-learning cardiovascular risk assessments."
              )}
            </p>
          </div>

          {/* Quick Action Button in Header */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setIsEditModalOpen(true)}
              className="glossy-btn-secondary flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-xs sm:text-sm cursor-pointer shadow-2xs"
            >
              <Edit3 size={15} />
              <span>{profile?.profile_completed ? t("dashboard.edit_profile_btn", "Update Baseline") : t("dashboard.complete_profile_btn", "Complete Baseline")}</span>
            </button>

            <Link
              to="/predict"
              className="glossy-btn-primary flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl font-medium text-xs sm:text-sm shadow-sm text-white"
            >
              <Heart size={15} className="fill-current text-[#D9A19A]" />
              <span>{t("dashboard.btn_start_assessment", "Start New Assessment")}</span>
              <ArrowRight size={14} className="rtl:rotate-180" />
            </Link>
          </div>
        </div>

        {/* Account Identity Meta Bar */}
        <div className="mt-5 pt-4 border-t border-[#E5E0D6] flex flex-wrap items-center gap-2.5 sm:gap-4 text-xs text-[#52665A]">
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-[#E5E0D6] shadow-2xs">
            <div className="w-5 h-5 rounded-full bg-[#35483E] text-white flex items-center justify-center font-bold text-[10px]">
              {userInitial}
            </div>
            <span className="font-medium text-[#35483E]">{profile?.name || user?.name || "Patient"}</span>
          </div>

          <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-lg border border-[#E5E0D6] shadow-2xs">
            <Mail size={13} className="text-[#6B7F74]" />
            <span className="font-mono text-[11px] text-[#52665A]">{profile?.email || user?.email}</span>
          </div>

          {user?.is_verified ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium bg-[#E4EDE5] text-[#35483E] border border-[#D3DFD5] shadow-2xs">
              <ShieldCheck size={13} className="text-[#35483E]" />
              <span>{t("dashboard.verified_account", "Verified Account")}</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium bg-[#FAF0EE] text-[#B35D52] border border-[#F0D5D1] shadow-2xs">
              <ShieldAlert size={13} className="text-[#B35D52]" />
              <span>{t("dashboard.pending_verification", "Email Verification Pending")}</span>
            </span>
          )}

          <div className="flex items-center gap-1.5 text-[11px] text-[#6B7F74]">
            <Calendar size={12} />
            <span>
              {t("dashboard.member_since", "Member since")} {memberSinceFormatted}
            </span>
            <span>·</span>
            <span>
              {daysActive} {t("dashboard.active_days", "days active")}
            </span>
          </div>
        </div>
      </header>

      {/* ── 2. One Obvious Next Step (Intelligent State Recommendation) ── */}
      <section className="glossy-card p-5 sm:p-6 border border-[#E5E0D6] shadow-sm bg-gradient-to-r from-white via-[#FAF8F5] to-[#E4EDE5]/40 relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 relative z-10">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-[#35483E] text-white flex items-center justify-center shrink-0 shadow-2xs mt-0.5">
              {!profile?.profile_completed ? (
                <Sparkles size={18} />
              ) : predictions.length === 0 ? (
                <Heart size={18} className="fill-[#D9A19A] text-[#D9A19A]" />
              ) : (
                <Activity size={18} />
              )}
            </div>
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 text-[10px] font-mono tracking-wider text-[#52665A] uppercase font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-[#B35D52] animate-pulse" />
                <span>
                  {!profile?.profile_completed
                    ? "Recommended Priority · Clinical Baseline"
                    : predictions.length === 0
                    ? "Recommended Priority · First Evaluation"
                    : "Active Health Record · Recommended Next Action"}
                </span>
              </div>
              <h2 className="font-serif font-bold text-base sm:text-lg text-[#35483E] tracking-tight">
                {!profile?.profile_completed
                  ? "Action Recommended: Establish Your Clinical Baseline"
                  : predictions.length === 0
                  ? "Next Step: Perform Your First Cardiovascular Risk Assessment"
                  : `Latest Assessment: ${predictions[0].risk_level || "Standard"} Risk (${Math.round((predictions[0].probability || 0) * 100)}%)`}
              </h2>
              <p className="text-xs text-[#52665A] max-w-2xl leading-relaxed">
                {!profile?.profile_completed
                  ? "Configure your baseline demographics and measurements (Date of Birth, Height, Weight) to activate automated BMI tracking and age-adjusted cardiovascular reference standards."
                  : predictions.length === 0
                  ? "Your clinical baseline is established. Enter standard clinical biomarkers (resting blood pressure, cholesterol, stress ECG) to evaluate multi-model predictions and inspect SHAP biomarker attribution."
                  : `Conducted on ${new Date(predictions[0].created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })} via ${predictions[0].model_used || "Ensemble"} inference. You can inspect biomarker attribution, generate a clinical PDF report, or run a new risk screening.`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 self-start md:self-center flex-wrap">
            {!profile?.profile_completed ? (
              <button
                type="button"
                onClick={() => setIsEditModalOpen(true)}
                className="glossy-btn-primary flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-xs sm:text-sm text-white shadow-sm cursor-pointer"
              >
                <Edit3 size={14} />
                <span>Complete Clinical Baseline</span>
                <ArrowRight size={14} className="rtl:rotate-180" />
              </button>
            ) : predictions.length === 0 ? (
              <Link
                to="/predict"
                className="glossy-btn-primary flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-xs sm:text-sm text-white shadow-sm"
              >
                <Heart size={14} className="fill-current text-[#D9A19A]" />
                <span>Start First Assessment</span>
                <ArrowRight size={14} className="rtl:rotate-180" />
              </Link>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => generateReportFromPrediction(predictions[0], profile?.name, activePatientId)}
                  className="glossy-btn-secondary flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-xs sm:text-sm cursor-pointer shadow-2xs"
                  title="Generate printable PDF report from latest evaluation"
                >
                  <FileText size={14} />
                  <span>Download Latest PDF</span>
                </button>
                <Link
                  to="/predict"
                  className="glossy-btn-primary flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-xs sm:text-sm text-white shadow-sm"
                >
                  <Heart size={14} className="fill-current text-[#D9A19A]" />
                  <span>Start New Assessment</span>
                  <ArrowRight size={14} className="rtl:rotate-180" />
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* ── 3. Top Grid: Patient ID Card & Profile Completion Status ── */}
      <section className={isProfileComplete ? "w-full" : "grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch"}>
        {/* Dedicated Patient Identity Card */}
        <div className={`${isProfileComplete ? "w-full" : "lg:col-span-7"} glossy-card p-5 sm:p-6 border border-[#E5E0D6] shadow-sm flex flex-col justify-between space-y-4`}>
          {/* Card Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3.5 border-b border-[#E5E0D6] gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#E4EDE5] border border-[#D3DFD5] text-[#35483E] flex items-center justify-center shrink-0 shadow-2xs">
                <User size={18} />
              </div>
              <div>
                <h2 className="font-serif font-semibold text-base text-[#35483E] tracking-tight">
                  {t("dashboard.patient_identity_title", "Patient Identification (PID)")}
                </h2>
                <p className="text-[11px] text-[#6B7F74]">
                  {t(
                    "dashboard.patient_identity_desc",
                    "Unique identifier assigned for verified medical report generation and audit tracking."
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center shrink-0 self-start sm:self-center">
              {activePatientId ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-medium bg-[#E4EDE5] text-[#35483E] border border-[#D3DFD5] shadow-2xs">
                  <CheckCircle2 size={13} className="text-[#35483E]" />
                  <span>{t("dashboard.pid_status_active", "Active Permanent PID")}</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-medium bg-[#FAF0EE] text-[#B35D52] border border-[#F0D5D1] shadow-2xs">
                  <span className="w-2 h-2 rounded-full bg-[#B35D52] animate-pulse" />
                  <span>{t("dashboard.patient_id_pending", "Pending Email Verification")}</span>
                </span>
              )}
            </div>
          </div>

          {/* Distinguished Identity Fields: Patient Name and Patient ID */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4 my-1">
            {/* Separate Patient Legal Name Field */}
            <div className="p-3.5 sm:p-4 rounded-xl bg-[#F7F5F0]/80 border border-[#E5E0D6] flex flex-col justify-between space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-[#6B7F74]">
                <span className="flex items-center gap-1.5 font-medium">
                  <User size={12} className="text-[#35483E]" />
                  {t("dashboard.patient_name_label", "Patient Legal Name")}
                </span>
                <span className="text-[10px] text-[#52665A] bg-white px-2 py-0.5 rounded border border-[#E5E0D6] shadow-2xs">
                  {t("dashboard.verified_identity", "Official Identity")}
                </span>
              </div>
              <div className="pt-0.5">
                <p className="font-serif font-bold text-lg sm:text-xl text-[#35483E] truncate">
                  {profile?.name || user?.name || t("dashboard.not_specified", "Not specified")}
                </p>
                <p className="text-[11px] text-[#8A9990] mt-0.5">
                  {t("dashboard.patient_name_sub", "Recorded on file for clinical evaluation & reports")}
                </p>
              </div>
            </div>

            {/* Permanent Patient ID Badge with Copy Button */}
            <div className="p-3.5 sm:p-4 rounded-xl border-2 border-dashed border-[#D3DFD5] bg-[#E4EDE5]/30 flex flex-col justify-between space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-[#6B7F74]">
                <span className="flex items-center gap-1.5 font-medium">
                  <ShieldCheck size={12} className="text-[#35483E]" />
                  {t("dashboard.patient_id_label", "Permanent Patient ID")}
                </span>
                <span className="text-[10px] text-[#35483E] bg-[#E4EDE5] px-2 py-0.5 rounded border border-[#D3DFD5] font-semibold">
                  {activePatientId ? "Immutable" : "Pending"}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2.5 sm:gap-3 pt-0.5 min-w-0">
                <span className="font-mono text-base sm:text-lg lg:text-xl font-bold tracking-wider sm:tracking-widest text-[#35483E] whitespace-nowrap">
                  {activePatientId || t("dashboard.patient_id_placeholder", "CS-••••-••••")}
                </span>
                {activePatientId && (
                  <button
                    type="button"
                    onClick={handleCopyPid}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#E5E0D6] bg-white hover:bg-[#E4EDE5] text-[#52665A] hover:text-[#35483E] transition-all cursor-pointer shadow-2xs text-xs font-medium shrink-0"
                    title={t("dashboard.copy_pid", "Copy Patient ID")}
                  >
                    {copiedPid ? (
                      <>
                        <Check size={13} className="text-[#35483E]" />
                        <span className="text-[11px] text-[#35483E] font-semibold">{t("dashboard.copied", "Copied")}</span>
                      </>
                    ) : (
                      <>
                        <Copy size={13} />
                        <span className="text-[11px]">{t("dashboard.copy_id_btn", "Copy ID")}</span>
                      </>
                    )}
                  </button>
                )}
              </div>
              <p className="text-[11px] text-[#8A9990]">
                {t("dashboard.patient_id_sub", "Included on official A4 cardiovascular diagnostic PDFs")}
              </p>
            </div>
          </div>

          {/* Compact Architectural Security Note */}
          <div className="pt-2.5 border-t border-[#E5E0D6] flex items-center gap-2 text-[11px] text-[#6B7F74] leading-relaxed">
            <ShieldCheck size={14} className="text-[#35483E] shrink-0" />
            <span>
              {activePatientId ? (
                t(
                  "dashboard.patient_id_security_compact",
                  "Cryptographic, collision-resistant identifier persisted in the database. Never derived from personal information and permanently retired upon account deletion."
                )
              ) : (
                t(
                  "dashboard.patient_id_notice",
                  "Permanent patient-facing IDs are automatically generated and cryptographically registered upon completing email verification."
                )
              )}
            </span>
          </div>
        </div>

        {/* Profile Setup Status Card (Hidden when all 5 domains are genuinely complete) */}
        {!isProfileComplete && (
          <div className="lg:col-span-5 glossy-card p-5 sm:p-6 border border-[#E5E0D6] shadow-sm flex flex-col justify-between space-y-5">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-[#E5E0D6]">
                <div className="flex items-center gap-2">
                  <Sparkles size={16} className="text-[#35483E]" />
                  <h3 className="font-serif font-semibold text-sm sm:text-base text-[#35483E]">
                    {t("dashboard.profile_completion_title", "Profile Setup Status")}
                  </h3>
                </div>
                <span className="text-xs font-mono font-bold text-[#35483E] bg-[#E4EDE5] px-2.5 py-0.5 rounded-md border border-[#D3DFD5]">
                  {completionPercentage}%
                </span>
              </div>

              {/* Progress Bar */}
              <div className="mt-3.5 space-y-1.5">
                <div className="flex justify-between text-[11px] text-[#6B7F74]">
                  <span>
                    {configuredCount} of 5 domains configured
                  </span>
                  <span className="font-mono">{configuredCount} / 5</span>
                </div>
                <div className="h-2 rounded-full bg-[#E5E0D6] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#35483E] transition-all duration-500"
                    style={{ width: `${completionPercentage}%` }}
                  />
                </div>
              </div>

              {/* Domains Checklist */}
              <div className="mt-4 space-y-2">
                {[
                  {
                    title: t("dashboard.domain_account", "Account Credentials"),
                    configured: true,
                    desc: profile?.name || user?.name,
                  },
                  {
                    title: t("dashboard.domain_email", "Email Verification"),
                    configured: Boolean(user?.is_verified),
                    desc: user?.is_verified ? "Verified" : "Pending",
                  },
                  {
                    title: t("dashboard.domain_patient_id", "Permanent Patient ID"),
                    configured: Boolean(activePatientId),
                    desc: activePatientId ? activePatientId : "Pending verification",
                  },
                  {
                    title: t("dashboard.domain_demographics", "Date of Birth & Age"),
                    configured: Boolean(profile?.date_of_birth),
                    desc: profile?.date_of_birth ? `${profile.date_of_birth} (${profile.age || "--"}y)` : t("dashboard.status_pending", "Pending setup"),
                  },
                  {
                    title: t("dashboard.domain_measurements", "Height & Weight"),
                    configured: Boolean(profile?.height && profile?.weight),
                    desc: profile?.height && profile?.weight ? `${profile.height}cm · ${profile.weight}kg` : t("dashboard.status_pending", "Pending setup"),
                  },
                ].map((domain, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-white border border-[#E5E0D6] text-xs"
                  >
                    <div className="flex items-center gap-2">
                      {domain.configured ? (
                        <CheckCircle2 size={14} className="text-[#35483E] shrink-0" />
                      ) : (
                        <Clock size={14} className="text-[#8A9990] shrink-0" />
                      )}
                      <span className={domain.configured ? "text-[#35483E] font-medium" : "text-[#6B7F74]"}>
                        {domain.title}
                      </span>
                    </div>
                    <span
                      className={`font-mono text-[10px] px-2 py-0.5 rounded ${
                        domain.configured
                          ? "bg-[#E4EDE5] text-[#35483E] font-medium"
                          : "bg-[#F7F5F0] text-[#8A9990]"
                      }`}
                    >
                      {domain.configured ? t("dashboard.status_configured", "Configured") : t("dashboard.status_pending", "Pending")}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsEditModalOpen(true)}
              className="w-full glossy-btn-secondary py-2.5 px-4 rounded-xl text-xs font-semibold text-[#35483E] flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
            >
              <Edit3 size={14} />
              <span>{profile?.profile_completed ? "Update Clinical Baseline" : "Complete Profile Baseline"}</span>
            </button>
          </div>
        )}
      </section>

      {/* ── 3. Personal & Biometric Information (With Server-Enforced Cadences) ── */}
      <section className="glossy-card p-5 sm:p-7 border border-[#E5E0D6] shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#E5E0D6] gap-3">
          <div>
            <h2 className="font-serif font-semibold text-lg text-[#35483E] tracking-tight">
              {t("dashboard.personal_info_title", "Personal & Biometric Information")}
            </h2>
            <p className="text-xs text-[#6B7F74] mt-0.5">
              {t(
                "dashboard.personal_info_desc",
                "Baseline clinical parameters utilized for cardiovascular risk stratification."
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsEditModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#35483E] text-white hover:bg-[#2A3B32] transition-colors cursor-pointer shadow-xs"
            >
              <Edit3 size={13} />
              <span>{t("dashboard.edit_profile_btn", "Edit Baseline")}</span>
            </button>
          </div>
        </div>

        {/* Parameters Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Full Legal Name */}
          <div className="p-4 rounded-xl bg-white border border-[#E5E0D6] space-y-2">
            <div className="flex items-center justify-between text-xs text-[#6B7F74]">
              <div className="flex items-center gap-1.5">
                <User size={14} className="text-[#35483E]" />
                <span>{t("dashboard.full_name", "Full Legal Name")}</span>
              </div>
              <span className="text-[10px] font-mono bg-[#E4EDE5] text-[#35483E] px-1.5 py-0.5 rounded">
                {t("dashboard.status_configured", "Configured")}
              </span>
            </div>
            <p className="font-serif font-semibold text-base text-[#35483E] truncate">
              {profile?.name || user?.name || "Not specified"}
            </p>
            <p className="text-[11px] text-[#8A9990]">Recorded from account registration profile.</p>
          </div>

          {/* Email Address */}
          <div className="p-4 rounded-xl bg-white border border-[#E5E0D6] space-y-2">
            <div className="flex items-center justify-between text-xs text-[#6B7F74]">
              <div className="flex items-center gap-1.5">
                <Mail size={14} className="text-[#35483E]" />
                <span>{t("dashboard.email_address", "Email Address")}</span>
              </div>
              <span
                className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                  user?.is_verified ? "bg-[#E4EDE5] text-[#35483E]" : "bg-[#FAF0EE] text-[#B35D52]"
                }`}
              >
                {user?.is_verified ? "Verified" : "Pending"}
              </span>
            </div>
            <p className="font-mono text-sm text-[#35483E] truncate">{profile?.email || user?.email}</p>
            <p className="text-[11px] text-[#8A9990]">Used for secure notification delivery and reports.</p>
          </div>

          {/* Date of Birth */}
          <div className="p-4 rounded-xl bg-white border border-[#E5E0D6] space-y-2">
            <div className="flex items-center justify-between text-xs text-[#6B7F74]">
              <div className="flex items-center gap-1.5">
                <Calendar size={14} className="text-[#35483E]" />
                <span>{t("dashboard.dob", "Date of Birth")}</span>
              </div>
              <span
                className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                  profile?.date_of_birth ? "bg-[#E4EDE5] text-[#35483E]" : "bg-[#F7F5F0] text-[#8A9990]"
                }`}
              >
                {profile?.date_of_birth ? t("dashboard.status_configured", "Configured") : t("dashboard.not_configured", "Not configured")}
              </span>
            </div>
            <p className="font-mono text-sm text-[#35483E] font-medium">
              {profile?.date_of_birth || "— / — / ————"}
            </p>
            <div className="flex items-center justify-between text-[11px] text-[#6B7F74] pt-1">
              <span>{t("dashboard.cadence_dob_rule", "Updated at most once every 12 months.")}</span>
              {cooldowns?.date_of_birth && !cooldowns.date_of_birth.can_edit && (
                <span className="text-[10px] font-mono text-[#B35D52] bg-[#FAF0EE] px-1.5 py-0.5 rounded flex items-center gap-1">
                  <Lock size={10} />
                  <span>Locked</span>
                </span>
              )}
            </div>
          </div>

          {/* Calculated Age */}
          <div className="p-4 rounded-xl bg-white border border-[#E5E0D6] space-y-2">
            <div className="flex items-center justify-between text-xs text-[#6B7F74]">
              <div className="flex items-center gap-1.5">
                <Activity size={14} className="text-[#35483E]" />
                <span>{t("dashboard.calculated_age", "Calculated Age")}</span>
              </div>
              <span className="text-[10px] font-mono bg-[#E4EDE5] text-[#35483E] px-1.5 py-0.5 rounded">
                {t("dashboard.derived_from_dob", "Derived from DOB")}
              </span>
            </div>
            <p className="font-serif font-semibold text-base text-[#35483E]">
              {profile?.age !== null && profile?.age !== undefined ? `${profile.age} years old` : "Derived from DOB"}
            </p>
            <p className="text-[11px] text-[#6B7F74] leading-tight">
              {t(
                "dashboard.cadence_age_rule",
                "Calculated automatically from date of birth to prevent manual entry discrepancies."
              )}
            </p>
          </div>

          {/* Height */}
          <div className="p-4 rounded-xl bg-white border border-[#E5E0D6] space-y-2">
            <div className="flex items-center justify-between text-xs text-[#6B7F74]">
              <div className="flex items-center gap-1.5">
                <Ruler size={14} className="text-[#35483E]" />
                <span>{t("dashboard.height", "Height")}</span>
              </div>
              <span
                className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                  profile?.height ? "bg-[#E4EDE5] text-[#35483E]" : "bg-[#F7F5F0] text-[#8A9990]"
                }`}
              >
                {profile?.height ? t("dashboard.status_configured", "Configured") : t("dashboard.not_recorded", "Not recorded")}
              </span>
            </div>
            <p className="font-mono text-sm text-[#35483E] font-medium">
              {profile?.height ? `${profile.height} cm` : "-- cm"}
            </p>
            <div className="flex items-center justify-between text-[11px] text-[#6B7F74] pt-1">
              <span>{t("dashboard.cadence_height_rule", "Updated at most once every 6 months.")}</span>
              {cooldowns?.height && !cooldowns.height.can_edit && (
                <span className="text-[10px] font-mono text-[#B35D52] bg-[#FAF0EE] px-1.5 py-0.5 rounded flex items-center gap-1">
                  <Lock size={10} />
                  <span>Locked</span>
                </span>
              )}
            </div>
          </div>

          {/* Weight */}
          <div className="p-4 rounded-xl bg-white border border-[#E5E0D6] space-y-2">
            <div className="flex items-center justify-between text-xs text-[#6B7F74]">
              <div className="flex items-center gap-1.5">
                <Scale size={14} className="text-[#35483E]" />
                <span>{t("dashboard.weight", "Weight")}</span>
              </div>
              <span
                className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                  profile?.weight ? "bg-[#E4EDE5] text-[#35483E]" : "bg-[#F7F5F0] text-[#8A9990]"
                }`}
              >
                {profile?.weight ? t("dashboard.status_configured", "Configured") : t("dashboard.not_recorded", "Not recorded")}
              </span>
            </div>
            <p className="font-mono text-sm text-[#35483E] font-medium">
              {profile?.weight ? `${profile.weight} kg` : "-- kg"}
            </p>
            <div className="flex items-center justify-between text-[11px] text-[#6B7F74] pt-1">
              <span>{t("dashboard.cadence_weight_rule", "Updated at most once every 7 days.")}</span>
              {cooldowns?.weight && !cooldowns.weight.can_edit && (
                <span className="text-[10px] font-mono text-[#B35D52] bg-[#FAF0EE] px-1.5 py-0.5 rounded flex items-center gap-1">
                  <Lock size={10} />
                  <span>Locked</span>
                </span>
              )}
            </div>
          </div>

          {/* Live Calculated Body Mass Index (BMI) Card */}
          <div className="p-4 rounded-xl bg-white border border-[#E5E0D6] space-y-2.5 sm:col-span-2 lg:col-span-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-[#6B7F74]">
              <div className="flex items-center gap-1.5 font-medium text-[#35483E]">
                <Activity size={14} className="text-[#35483E]" />
                <span className="font-semibold">{t("dashboard.bmi_indicator", "Calculated Body Mass Index (BMI)")}</span>
              </div>
              {liveBmi ? (
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md font-mono text-[10px] font-semibold border ${liveBmi.color}`}>
                  {liveBmi.category}
                </span>
              ) : (
                <span className="text-[10px] font-mono bg-[#F7F5F0] text-[#8A9990] px-2 py-0.5 rounded">
                  Pending Height & Weight Setup
                </span>
              )}
            </div>

            <div className="flex flex-col sm:flex-row sm:items-baseline gap-2 sm:gap-4">
              <span className="font-mono text-2xl font-bold text-[#35483E]">
                {liveBmi ? `${liveBmi.value} kg/m²` : "— kg/m²"}
              </span>
              <p className="text-xs text-[#52665A]">
                {liveBmi
                  ? `Computed from baseline measurements (${profile?.height} cm, ${profile?.weight} kg).`
                  : "Establish your height and weight in the clinical baseline to automatically calculate BMI."}
              </p>
            </div>

            <div className="p-2.5 rounded-lg bg-[#F7F5F0] border border-[#E5E0D6]/80 text-[11px] text-[#6B7F74] flex items-start gap-2">
              <Info size={13} className="text-[#52665A] shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                <strong className="text-[#52665A]">Clinical Reference Standard:</strong> BMI is an epidemiological screening indicator, not an individual clinical diagnosis. Adult reference standards apply to individuals aged 18 and older.
              </p>
            </div>
          </div>
        </div>

        {/* Profile-Editing Integrity Policy Box */}
        <div className="p-4 rounded-xl bg-[#F7F5F0] border border-[#E5E0D6] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <Info size={17} className="text-[#35483E] shrink-0 mt-0.5" />
            <div className="space-y-1 text-xs text-[#52665A]">
              <h4 className="font-semibold text-[#35483E]">
                {t("dashboard.cadence_notice_title", "Profile-Editing Integrity Notice")}
              </h4>
              <p className="leading-relaxed text-[#6B7F74]">
                {t(
                  "dashboard.cadence_notice_desc",
                  "To ensure clinical consistency, physiological baselines feature structured update limits (Weight every 7 days, Height every 6 months, Date of Birth every 12 months). A verified clinical correction request process is available for legitimate mistakes."
                )}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsCorrectionModalOpen(true)}
            className="shrink-0 text-xs font-medium text-[#35483E] underline hover:text-[#2A3B32] transition-colors"
          >
            Submit Correction Request &rarr;
          </button>
        </div>
      </section>

      {/* ── 4. Primary Action Card: Predict Station ── */}
      <section className="glossy-card p-6 sm:p-8 border border-[#E5E0D6] shadow-sm relative overflow-hidden bg-gradient-to-br from-white via-white to-[#E4EDE5]/30">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-[#E4EDE5] text-[#35483E] text-xs font-mono font-medium">
              <Activity size={13} />
              <span>CLINICAL INFERENCE WORKSTATION</span>
            </div>

            <h2 className="font-serif font-bold text-2xl sm:text-3xl text-[#35483E] tracking-tight">
              {t("dashboard.action_card_title", "Cardiovascular Risk Assessment")}
            </h2>

            <p className="text-sm text-[#52665A] leading-relaxed">
              {t(
                "dashboard.action_card_desc",
                "Input 13 standard clinical biomarkers (hemodynamics, metabolic panels, and stress ECG) to evaluate multi-model predictions and inspect SHAP biomarker attribution."
              )}
            </p>
            <div className="pt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[#6B7F74] font-mono">
              <span>13 Biomarkers</span> · <span>5 ML Classifiers</span> · <span>SHAP Waterfalls</span> · <span>PDF Export</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <Link
              to="/predict"
              className="glossy-btn-primary flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl font-medium text-sm shadow-sm text-white"
            >
              <Heart size={16} className="fill-current text-[#D9A19A]" />
              <span>{t("dashboard.btn_start_assessment", "Start New Assessment")}</span>
              <ArrowRight size={15} className="rtl:rotate-180" />
            </Link>

            <Link
              to="/metrics"
              className="glossy-btn-secondary flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium text-xs sm:text-sm"
            >
              <BarChart2 size={15} />
              <span>{t("dashboard.btn_view_metrics", "Model Metrics")}</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ── 5. Recent Risk Assessments Section ── */}
      <section className="glossy-card p-5 sm:p-7 border border-[#E5E0D6] shadow-sm space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-[#E5E0D6]">
          <div>
            <h2 className="font-serif font-semibold text-lg text-[#35483E] tracking-tight">
              {t("dashboard.recent_assessments_title", "Recent Risk Assessments")}
            </h2>
            <p className="text-xs text-[#6B7F74] mt-0.5">
              {t("dashboard.recent_assessments_desc", "Historical predictions recorded under your authenticated account.")}
            </p>
          </div>

          {predictions.length > 0 && (
            <Link
              to="/history"
              className="text-xs font-medium text-[#35483E] hover:underline flex items-center gap-1"
            >
              <span>{t("dashboard.view_all_history", "View Full History")}</span>
              <ArrowRight size={13} className="rtl:rotate-180" />
            </Link>
          )}
        </div>

        {loadingHistory ? (
          <div className="py-12 flex flex-col items-center justify-center space-y-3">
            <div className="w-8 h-8 border-2 border-[#35483E] border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-[#6B7F74]">Loading clinical records...</span>
          </div>
        ) : predictions.length > 0 ? (
          <div className="space-y-3">
            {predictions.slice(0, 5).map((p) => {
              const probPercent = Math.round((p.probability || 0) * 100);
              const isHigh = p.risk_level === "High" || probPercent >= 60;
              const isMod = p.risk_level === "Moderate" || (probPercent >= 35 && probPercent < 60);
              const primaryDriver = getPrimaryDriver(p);

              return (
                <div
                  key={p.id}
                  className="p-4 rounded-xl bg-white border border-[#E5E0D6] hover:border-[#D5D0C6] transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs"
                >
                  <div className="flex items-start gap-3.5">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        isHigh
                          ? "bg-[#FAF0EE] text-[#B35D52]"
                          : isMod
                          ? "bg-[#FEF6E9] text-[#C47D2B]"
                          : "bg-[#E4EDE5] text-[#35483E]"
                      }`}
                    >
                      <Heart size={16} className={isHigh ? "fill-current" : ""} />
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-serif font-semibold text-sm text-[#35483E]">
                          {p.prediction === 1 ? "Heart Disease Indication" : "No Elevated Indication"}
                        </span>
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                            isHigh
                              ? "bg-[#FAF0EE] text-[#B35D52] font-semibold"
                              : isMod
                              ? "bg-[#FEF6E9] text-[#C47D2B] font-semibold"
                              : "bg-[#E4EDE5] text-[#35483E]"
                          }`}
                        >
                          {p.risk_level || (isHigh ? "High Risk" : isMod ? "Moderate Risk" : "Low Risk")}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-[11px] text-[#6B7F74]">
                        <span>
                          {new Date(p.created_at).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}{" "}
                          · {new Date(p.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                        <span>·</span>
                        <span className="capitalize">{p.model_used || "Ensemble"}</span>
                      </div>

                      {primaryDriver && (
                        <p className="text-[11px] text-[#52665A]">
                          <span className="text-[#8A9990]">Primary Biomarker Driver:</span>{" "}
                          <span className="font-medium text-[#35483E]">{primaryDriver}</span>
                        </p>
                      )}

                      {p.patient_name && (
                        <div className="flex items-center gap-1.5 text-[11px] text-[#52665A] flex-wrap pt-0.5">
                          <span className="text-[#8A9990]">Recorded Identity:</span>
                          <span className="font-semibold text-[#35483E]">{p.patient_name}</span>
                          {p.patient_id && (
                            <span className="font-mono text-[10px] text-[#52665A] bg-[#FAF8F5] px-1.5 py-0.5 rounded border border-[#E5E0D6]">
                              {p.patient_id}
                            </span>
                          )}
                          {p.name_was_corrected && (
                            <span className="text-[10px] text-[#B56E2B] bg-[#FBF5EE] border border-[#EBD3BC] px-1.5 py-0.5 rounded" title={`Profile legal name subsequently updated to ${p.current_profile_name}`}>
                              Identity Updated Post-Assessment
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col sm:items-end justify-center border-t sm:border-t-0 pt-3 sm:pt-0 border-[#E5E0D6] gap-2 shrink-0">
                    <div className="text-right">
                      <span className="font-serif font-bold text-lg text-[#35483E]">{probPercent}%</span>
                      <span className="text-[10px] text-[#8A9990] block uppercase tracking-wider">
                        Risk Probability
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap justify-end">
                      <button
                        type="button"
                        onClick={() => generateReportFromPrediction(p, profile?.name, activePatientId)}
                        className="inline-flex items-center gap-1 text-xs font-medium text-[#35483E] bg-[#E4EDE5] hover:bg-[#D3DFD5] border border-[#D3DFD5] px-2.5 py-1 rounded-lg transition-colors cursor-pointer shadow-2xs"
                        title="Generate printable PDF clinical report"
                      >
                        <FileText size={12} className="text-[#35483E]" />
                        <span>PDF Report</span>
                      </button>
                      <Link
                        to="/history"
                        className="text-xs font-medium text-[#52665A] hover:text-[#35483E] px-2.5 py-1 rounded-lg bg-[#F7F5F0] hover:bg-[#E4EDE5]/60 border border-[#E5E0D6] transition-colors"
                      >
                        Inspect
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Empty state for fresh accounts */
          <div className="py-12 px-4 rounded-xl border border-dashed border-[#D3DFD5] bg-[#F7F5F0]/60 text-center flex flex-col items-center justify-center space-y-4 max-w-xl mx-auto">
            <div className="w-12 h-12 rounded-2xl bg-[#E4EDE5] text-[#35483E] flex items-center justify-center shadow-xs">
              <Heart size={22} className="text-[#35483E]" />
            </div>
            <div className="space-y-1.5">
              <h3 className="font-serif font-semibold text-lg text-[#35483E]">
                {t("dashboard.empty_history_title", "No Assessment Records Yet")}
              </h3>
              <p className="text-xs text-[#6B7F74] leading-relaxed">
                {t(
                  "dashboard.empty_history_desc",
                  "You haven't completed any cardiovascular risk evaluations yet. Run your first assessment using clinical observations or preloaded research profiles to see results and SHAP attributions recorded here."
                )}
              </p>
            </div>
            <Link
              to="/predict"
              className="glossy-btn-primary flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-xs sm:text-sm shadow-sm text-white"
            >
              <Heart size={14} className="fill-current text-[#D9A19A]" />
              <span>{t("dashboard.btn_first_assessment", "Perform First Assessment")}</span>
            </Link>
          </div>
        )}
      </section>

      {/* ── 6. Account Management & Privacy (Danger Zone) ── */}
      <section className="glossy-card p-5 sm:p-7 border border-[#E5E0D6] shadow-sm space-y-5">
        <div className="flex items-center gap-2.5 text-[#B35D52] pb-3 border-b border-[#E5E0D6]">
          <AlertCircle size={18} />
          <h2 className="font-serif font-semibold text-base text-[#35483E] tracking-tight">
            {t("dashboard.danger_zone_title", "Account Management & Privacy")}
          </h2>
        </div>

        <p className="text-xs text-[#6B7F74]">
          {t("dashboard.danger_zone_desc", "Permanently delete your account, authentication credentials, and all recorded prediction history.")}
        </p>

        <div className="p-4 rounded-xl bg-white border border-[#E5E0D6] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1 text-xs">
            <span className="font-semibold text-[#35483E] block">Permanent Account & Record Deletion</span>
            <p className="text-[#6B7F74] leading-relaxed">
              Permanent deletion purges your profile, associated prediction records, permanent patient ID, and background Firebase authentication tokens. This action cannot be reversed.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowConfirm(true)}
            className="shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#F0D5D1] bg-[#FAF0EE] text-[#B35D52] hover:bg-[#F5E5E2] font-medium text-xs transition-colors cursor-pointer"
          >
            <Trash2 size={14} />
            <span>{t("dashboard.btn_delete_account", "Delete Account")}</span>
          </button>
        </div>

        {/* Confirmation Modal */}
        {showConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
            <div className="bg-white rounded-2xl p-6 sm:p-7 max-w-md w-full border border-[#E5E0D6] shadow-xl space-y-5 text-start">
              <div className="w-10 h-10 rounded-xl bg-[#FAF0EE] text-[#B35D52] flex items-center justify-center">
                <Trash2 size={20} />
              </div>

              <div className="space-y-1.5">
                <h3 className="font-serif font-bold text-lg text-[#35483E]">
                  {t("dashboard.confirm_delete_title", "Confirm Account Deletion")}
                </h3>
                <p className="text-xs text-[#6B7F74] leading-relaxed">
                  {t(
                    "dashboard.confirm_delete_warning",
                    "This action is immediate and cannot be undone. All clinical predictions, notes, permanent patient ID, and profile records will be permanently erased."
                  )}
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-[#52665A] block">
                  {t("dashboard.confirm_delete_input_label", 'Type "DELETE" to confirm deletion')}
                </label>
                <input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="DELETE"
                  className="glossy-input w-full px-3.5 py-2 text-xs font-mono"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowConfirm(false);
                    setConfirmText("");
                  }}
                  className="flex-1 py-2.5 px-4 rounded-xl border border-[#E5E0D6] bg-white text-xs font-medium text-[#52665A] hover:bg-[#F7F5F0]"
                >
                  {t("dashboard.btn_cancel", "Cancel")}
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={confirmText !== "DELETE" || deleting}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-[#B35D52] text-white text-xs font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#9B4E44] transition-colors"
                >
                  {deleting ? "Deleting..." : t("dashboard.btn_confirm_delete", "Yes, Permanently Delete")}
                </button>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ── 7. Profile Baseline Edit Modal ── */}
      {isEditModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/45 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget && !savingProfile) setIsEditModalOpen(false);
          }}
          role="presentation"
        >
          <div
            className="bg-white rounded-t-3xl sm:rounded-2xl max-w-xl w-full border border-[#E5E0D6] shadow-2xl flex flex-col text-start relative max-h-[92vh] sm:max-h-[88vh] overflow-hidden"
            role="dialog"
            aria-modal="true"
            aria-labelledby="baseline-modal-title"
          >
            {/* Header (Pinned) */}
            <div className="px-5 py-4 sm:px-6 sm:py-5 border-b border-[#E5E0D6] bg-[#FAF8F5]/90 backdrop-blur-xs flex items-start justify-between gap-4 shrink-0">
              <div className="space-y-1.5">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-medium uppercase tracking-wider bg-[#E4EDE5] text-[#35483E] border border-[#D3DFD5]">
                  <Sparkles size={11} className="text-[#35483E]" />
                  <span>{t("dashboard.baseline_modal_tag", "PHYSIOLOGICAL BASELINE PROFILE")}</span>
                </div>
                <h3 id="baseline-modal-title" className="font-serif font-bold text-lg sm:text-xl text-[#35483E] tracking-tight">
                  {t("dashboard.baseline_modal_title", "Clinical Profile Baseline")}
                </h3>
                <p className="text-xs text-[#52665A] leading-relaxed max-w-md">
                  {t(
                    "dashboard.baseline_modal_desc",
                    "Record your baseline demographics and biometrics (Age, Height, Weight, BMI) to provide epidemiological reference points for educational cardiovascular risk estimation."
                  )}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                aria-label={t("common.close", "Close")}
                className="p-1.5 sm:p-2 rounded-xl text-[#8A9990] hover:text-[#35483E] hover:bg-[#E4EDE5]/60 transition-colors cursor-pointer shrink-0"
              >
                <X size={18} />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form id="baseline-edit-form" onSubmit={handleSaveProfile} className="flex-1 overflow-y-auto px-5 py-5 sm:px-6 sm:py-6 space-y-5">
              {/* Patient Identity Badge (if available) */}
              {activePatientId && (
                <div className="p-3 sm:p-3.5 rounded-xl border border-[#D3DFD5] bg-[#E4EDE5]/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-[#E4EDE5] border border-[#D3DFD5] text-[#35483E] flex items-center justify-center shrink-0">
                      <ShieldCheck size={16} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono uppercase tracking-wider text-[#6B7F74]">
                          {t("dashboard.permanent_pid", "Permanent Patient ID")}
                        </span>
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-mono bg-white text-[#35483E] border border-[#D3DFD5]">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#35483E]" />
                          <span>{t("dashboard.status_verified", "Verified")}</span>
                        </span>
                      </div>
                      <div className="font-mono text-sm sm:text-base font-bold text-[#35483E] tracking-wider mt-0.5">
                        {activePatientId}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleCopyPid}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#E5E0D6] bg-white text-[#52665A] hover:text-[#35483E] hover:bg-[#E4EDE5] text-xs font-mono transition-colors self-start sm:self-auto cursor-pointer shadow-2xs"
                    title={t("dashboard.copy_pid", "Copy Patient ID")}
                  >
                    {copiedPid ? <Check size={13} className="text-[#35483E]" /> : <Copy size={13} />}
                    <span>{copiedPid ? t("dashboard.copied", "Copied") : t("dashboard.copy_pid", "Copy ID")}</span>
                  </button>
                </div>
              )}

              {/* Section 1: Full Legal Name */}
              <div className="space-y-1.5 p-3.5 sm:p-4 rounded-xl border border-[#E5E0D6] bg-[#FAF8F5]/60">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-[#35483E] flex items-center gap-1.5">
                    <User size={13} className="text-[#35483E]" />
                    <span>{t("dashboard.full_name", "Full Legal Name")}</span>
                  </label>
                  <div className="flex items-center gap-2">
                    {cooldowns?.name && !cooldowns.name.can_edit ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-mono text-[#B35D52] bg-[#FAF0EE] border border-[#F0D5D1] px-2 py-0.5 rounded-md">
                        <Lock size={10} />
                        <span>{t("dashboard.name_locked_badge", "Locked (48h window expired)")}</span>
                      </span>
                    ) : cooldowns?.name?.remaining_hours ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-mono text-[#2D7A58] bg-[#E4EDE5] border border-[#D3DFD5] px-2 py-0.5 rounded-md">
                        <span>{t("dashboard.name_edit_window_remaining", "{{hours}}h left to edit", { hours: cooldowns.name.remaining_hours })}</span>
                      </span>
                    ) : null}
                  </div>
                </div>

                <input
                  type="text"
                  required
                  disabled={cooldowns?.name && !cooldowns.name.can_edit}
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Dr. Sarah Jenkins"
                  className="glossy-input w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl disabled:opacity-60 disabled:bg-[#F7F5F0]"
                />

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[10px] text-[#6B7F74]">
                  <span>{t("dashboard.baseline_name_hint", "Used for verified clinical summary reports")}</span>
                  {cooldowns?.name && !cooldowns.name.can_edit && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditModalOpen(false);
                        setCorrectionData({
                          field_name: "name",
                          new_value: formData.name,
                          reason: "",
                        });
                        setIsCorrectionModalOpen(true);
                      }}
                      className="text-[#35483E] underline font-semibold hover:text-[#2D7A58] cursor-pointer text-start sm:text-end"
                    >
                      {t("dashboard.request_name_correction", "Request Verified Correction →")}
                    </button>
                  )}
                </div>
              </div>

              {/* Section 2: Date of Birth & Chronological Age Context */}
              <div className="space-y-2 p-3.5 sm:p-4 rounded-xl border border-[#E5E0D6] bg-[#FAF8F5]/60">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-[#35483E] flex items-center gap-1.5">
                    <Calendar size={13} className="text-[#35483E]" />
                    <span>{t("dashboard.dob", "Date of Birth")}</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-[#6B7F74]">
                      {t("dashboard.cadence_dob_badge", "12-month cadence")}
                    </span>
                    {cooldowns?.date_of_birth && !cooldowns.date_of_birth.can_edit && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-mono text-[#B35D52] bg-[#FAF0EE] border border-[#F0D5D1] px-2 py-0.5 rounded-md">
                        <Lock size={10} />
                        <span>{t("dashboard.cadence_locked", "Cadence locked")}</span>
                      </span>
                    )}
                  </div>
                </div>

                <div className="relative">
                  <input
                    type="date"
                    max={new Date().toISOString().split("T")[0]}
                    min="1900-01-01"
                    disabled={cooldowns?.date_of_birth && !cooldowns.date_of_birth.can_edit}
                    value={formData.date_of_birth}
                    onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                    className="glossy-input w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl disabled:opacity-55 disabled:bg-[#F7F5F0]"
                  />
                </div>

                {/* Age Context & Real-Time Calculation */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 text-[11px] text-[#6B7F74]">
                  <div className="flex items-center gap-1.5">
                    <Activity size={12} className="text-[#35483E] shrink-0" />
                    <span>
                      {formData.date_of_birth && calculateAge(formData.date_of_birth) !== null ? (
                        <span className="text-[#35483E] font-medium">
                          {t("dashboard.computed_age_preview", "Calculated Age")}:{" "}
                          <strong className="font-mono text-xs">{calculateAge(formData.date_of_birth)} yrs</strong>
                        </span>
                      ) : (
                        <span>{t("dashboard.dob_calculates_age_note", "Chronological age is calculated automatically from your date of birth.")}</span>
                      )}
                    </span>
                  </div>
                  {cooldowns?.date_of_birth && !cooldowns.date_of_birth.can_edit && (
                    <span className="text-[#B35D52] font-mono text-[10px] shrink-0">
                      {t("dashboard.next_permitted", "Next update")}: {new Date(cooldowns.date_of_birth.next_permitted_at).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>

              {/* Section 3: Anthropometric Biometrics (Paired Height & Weight) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold text-[#35483E] flex items-center gap-1.5">
                    <Scale size={13} className="text-[#35483E]" />
                    <span>{t("dashboard.anthropometric_title", "Anthropometric Biometrics")}</span>
                  </div>
                  <span className="text-[10px] text-[#6B7F74]">
                    {t("dashboard.paired_metrics_note", "Paired height & weight")}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* Height */}
                  <div className="space-y-1.5 p-3.5 rounded-xl border border-[#E5E0D6] bg-[#FAF8F5]/60">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-[#35483E] flex items-center gap-1.5">
                        <Ruler size={13} className="text-[#35483E]" />
                        <span>{t("dashboard.height", "Height")}</span>
                      </label>
                      {cooldowns?.height && !cooldowns.height.can_edit ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-mono text-[#B35D52] bg-[#FAF0EE] border border-[#F0D5D1] px-1.5 py-0.5 rounded">
                          <Lock size={9} />
                          <span>{t("dashboard.locked", "Locked")}</span>
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono text-[#6B7F74]">
                          {t("dashboard.cadence_height_badge", "6-month cadence")}
                        </span>
                      )}
                    </div>

                    <div className="relative flex items-center">
                      <input
                        type="number"
                        step="0.5"
                        min="50"
                        max="260"
                        disabled={cooldowns?.height && !cooldowns.height.can_edit}
                        placeholder="e.g. 175"
                        value={formData.height}
                        onChange={(e) => setFormData({ ...formData, height: e.target.value })}
                        className="glossy-input w-full ps-3.5 pe-12 py-2 text-xs sm:text-sm rounded-xl font-mono disabled:opacity-55 disabled:bg-[#F7F5F0]"
                      />
                      <div className="absolute end-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-[11px] font-mono font-semibold text-[#6B7F74] bg-[#E4EDE5] px-1.5 py-0.5 rounded border border-[#D3DFD5]">
                        cm
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-[#6B7F74]">
                      <span>{t("dashboard.range_height", "Range: 50.0 – 260.0 cm")}</span>
                      {cooldowns?.height && !cooldowns.height.can_edit && (
                        <span className="text-[#B35D52] font-mono">
                          {new Date(cooldowns.height.next_permitted_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Weight */}
                  <div className="space-y-1.5 p-3.5 rounded-xl border border-[#E5E0D6] bg-[#FAF8F5]/60">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-[#35483E] flex items-center gap-1.5">
                        <Scale size={13} className="text-[#35483E]" />
                        <span>{t("dashboard.weight", "Weight")}</span>
                      </label>
                      {cooldowns?.weight && !cooldowns.weight.can_edit ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-mono text-[#B35D52] bg-[#FAF0EE] border border-[#F0D5D1] px-1.5 py-0.5 rounded">
                          <Lock size={9} />
                          <span>{t("dashboard.locked", "Locked")}</span>
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono text-[#6B7F74]">
                          {t("dashboard.cadence_weight_badge", "7-day cadence")}
                        </span>
                      )}
                    </div>

                    <div className="relative flex items-center">
                      <input
                        type="number"
                        step="0.1"
                        min="20"
                        max="350"
                        disabled={cooldowns?.weight && !cooldowns.weight.can_edit}
                        placeholder="e.g. 70.5"
                        value={formData.weight}
                        onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                        className="glossy-input w-full ps-3.5 pe-12 py-2 text-xs sm:text-sm rounded-xl font-mono disabled:opacity-55 disabled:bg-[#F7F5F0]"
                      />
                      <div className="absolute end-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-[11px] font-mono font-semibold text-[#6B7F74] bg-[#E4EDE5] px-1.5 py-0.5 rounded border border-[#D3DFD5]">
                        kg
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-[#6B7F74]">
                      <span>{t("dashboard.range_weight", "Range: 20.0 – 350.0 kg")}</span>
                      {cooldowns?.weight && !cooldowns.weight.can_edit && (
                        <span className="text-[#B35D52] font-mono">
                          {new Date(cooldowns.weight.next_permitted_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Live Body Mass Index (BMI) Reference Preview */}
                {calculateBmi(formData.height, formData.weight) && (
                  <div className="space-y-1.5">
                    <div className={`p-3 rounded-xl border flex items-center justify-between gap-3 text-xs ${calculateBmi(formData.height, formData.weight).color}`}>
                      <div className="flex items-center gap-2">
                        <Activity size={14} className="shrink-0" />
                        <div>
                          <span className="font-semibold">{t("dashboard.bmi_indicator", "Calculated Body Mass Index (BMI)")}:</span>{" "}
                          <strong className="font-mono">{calculateBmi(formData.height, formData.weight).value} kg/m²</strong>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-md font-mono text-[10px] font-semibold tracking-wider bg-white/70 border border-current/20 shrink-0">
                        {calculateBmi(formData.height, formData.weight).category}
                      </span>
                    </div>
                    <p className="text-[10px] text-[#6B7F74] px-1 leading-normal">
                      Epidemiological screening indicator; adult reference standards apply to individuals aged 18 and older.
                    </p>
                  </div>
                )}
              </div>

              {/* Section 4: Data Cadence & Verified Correction Notice */}
              <div className="p-3.5 rounded-xl border border-[#E5E0D6] bg-white space-y-2 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 font-medium text-[#35483E]">
                    <ShieldCheck size={14} className="text-[#35483E]" />
                    <span>{t("dashboard.integrity_policy_title", "Clinical Integrity & Update Cadence")}</span>
                  </div>
                  {(cooldowns?.date_of_birth?.can_edit === false ||
                    cooldowns?.height?.can_edit === false ||
                    cooldowns?.weight?.can_edit === false) && (
                    <span className="text-[10px] font-mono text-[#B35D52] bg-[#FAF0EE] px-2 py-0.5 rounded-md border border-[#F0D5D1]">
                      {t("dashboard.fields_locked_badge", "Cooldown Active")}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-[#6B7F74] leading-relaxed">
                  {t(
                    "dashboard.integrity_policy_desc",
                    "CardioScan enforces clinical update cadences to safeguard risk modeling accuracy. If you need to rectify an administrative or typing error on a locked metric, you can submit an audited correction request."
                  )}
                </p>
                <div className="pt-1 flex items-center justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditModalOpen(false);
                      setIsCorrectionModalOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#35483E] hover:text-[#2A3B32] hover:underline cursor-pointer"
                  >
                    <RotateCcw size={12} />
                    <span>{t("dashboard.request_correction_action", "Request Verified Correction")} &rarr;</span>
                  </button>
                </div>
              </div>
            </form>

            {/* Pinned Action Footer */}
            <div className="px-5 py-3.5 sm:px-6 sm:py-4 border-t border-[#E5E0D6] bg-[#FAF8F5]/90 backdrop-blur-xs flex items-center justify-between gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="py-2.5 px-4 rounded-xl border border-[#E5E0D6] bg-white text-xs font-medium text-[#52665A] hover:bg-[#F7F5F0] hover:text-[#35483E] transition-colors cursor-pointer"
              >
                {t("dashboard.btn_cancel", "Cancel")}
              </button>
              <button
                type="submit"
                form="baseline-edit-form"
                disabled={savingProfile}
                className="glossy-btn-primary py-2.5 px-6 rounded-xl text-white text-xs font-semibold shadow-xs disabled:opacity-50 cursor-pointer flex items-center gap-2"
              >
                {savingProfile && (
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                )}
                <span>
                  {savingProfile
                    ? t("dashboard.saving_baseline", "Saving Baseline...")
                    : t("dashboard.save_baseline_btn", "Save Clinical Baseline")}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 8. Profile Correction Modal ── */}
      {isCorrectionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-6 sm:p-7 max-w-lg w-full border border-[#E5E0D6] shadow-xl space-y-5 text-start relative max-h-[90vh] overflow-y-auto">
            <button
              type="button"
              onClick={() => setIsCorrectionModalOpen(false)}
              className="absolute top-4 right-4 text-[#8A9990] hover:text-[#35483E] p-1 rounded-lg"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#FAF0EE] text-[#B35D52] flex items-center justify-center">
                <RotateCcw size={18} />
              </div>
              <div>
                <h3 className="font-serif font-bold text-lg text-[#35483E]">
                  {t("dashboard.modal_correct_title", "Request Profile Correction")}
                </h3>
                <p className="text-xs text-[#6B7F74]">
                  {t(
                    "dashboard.modal_correct_desc",
                    "Submit a verified correction for an administrative mistake or typing error."
                  )}
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveCorrection} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#35483E] block">
                  Field to Correct
                </label>
                <select
                  value={correctionData.field_name}
                  onChange={(e) => setCorrectionData({ ...correctionData, field_name: e.target.value })}
                  className="glossy-input w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white"
                >
                  <option value="date_of_birth">Date of Birth (YYYY-MM-DD)</option>
                  <option value="height">Height (cm)</option>
                  <option value="weight">Weight (kg)</option>
                  <option value="name">Full Legal Name</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#35483E] block">
                  Corrected New Value
                </label>
                <input
                  type={correctionData.field_name === "date_of_birth" ? "date" : "text"}
                  required
                  value={correctionData.new_value}
                  onChange={(e) => setCorrectionData({ ...correctionData, new_value: e.target.value })}
                  placeholder={
                    correctionData.field_name === "date_of_birth"
                      ? "YYYY-MM-DD"
                      : correctionData.field_name === "height"
                      ? "e.g. 174.5"
                      : correctionData.field_name === "weight"
                      ? "e.g. 68.2"
                      : "e.g. Dr. Sarah Jenkins"
                  }
                  className="glossy-input w-full px-3.5 py-2.5 text-xs sm:text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#35483E] block">
                  Justification / Rationale (Minimum 10 characters)
                </label>
                <textarea
                  required
                  rows={3}
                  value={correctionData.reason}
                  onChange={(e) => setCorrectionData({ ...correctionData, reason: e.target.value })}
                  placeholder="Detail the typing error or reason for correction..."
                  className="glossy-input w-full p-3 text-xs sm:text-sm resize-none"
                />
                <p className="text-[10px] text-[#8A9990]">
                  This explanation will be permanently recorded in the clinical security audit trail.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E5E0D6]">
                <button
                  type="button"
                  onClick={() => setIsCorrectionModalOpen(false)}
                  className="py-2.5 px-4 rounded-xl border border-[#E5E0D6] bg-white text-xs font-medium text-[#52665A] hover:bg-[#F7F5F0]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingCorrection}
                  className="glossy-btn-primary py-2.5 px-6 rounded-xl text-white text-xs font-semibold shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {savingCorrection ? "Submitting..." : "Submit Correction"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── 9. Respectful Page Ending ── */}
      <footer className="pt-8 border-t border-[#E5E0D6] space-y-4 text-center">
        <div className="max-w-2xl mx-auto space-y-1.5">
          <h4 className="text-xs font-semibold text-[#35483E]">
            {t("dashboard.educational_disclaimer_title", "Educational & Research Demonstration Only")}
          </h4>
          <p className="text-[11px] text-[#6B7F74] leading-relaxed">
            {t(
              "dashboard.educational_disclaimer_desc",
              "CardioScan risk assessments are designed for educational exploration and health awareness. They do not constitute clinical diagnosis or personalized medical advice."
            )}
          </p>
        </div>

        <div className="flex items-center justify-center gap-4 text-xs text-[#6B7F74]">
          <Link to="/terms" className="hover:text-[#35483E] transition-colors underline">
            Terms of Service
          </Link>
          <span>·</span>
          <Link to="/privacy" className="hover:text-[#35483E] transition-colors underline">
            Privacy Policy
          </Link>
          <span>·</span>
          <span>CardioScan v2.0</span>
        </div>
      </footer>
      </div>
    </div>
  );
}
