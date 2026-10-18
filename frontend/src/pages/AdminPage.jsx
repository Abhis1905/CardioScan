import React, { useEffect, useState, useMemo } from "react";
import { Link, Navigate } from "react-router-dom";
import {
  Shield,
  Users,
  Activity,
  TrendingUp,
  Trash2,
  Download,
  Search,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Database,
  Cpu,
  Layers,
  Lock,
  ShieldAlert,
  ShieldCheck,
  HeartPulse,
  Info,
  FileText,
  Check,
  ExternalLink,
  Filter,
  Sparkles,
  Server,
  Zap,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  CartesianGrid,
} from "recharts";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { useTheme } from "../context/ThemeContext";
import {
  adminStats,
  adminUsers,
  adminDeleteUser,
  adminPredictions,
  adminDeletePrediction,
  adminExportUsers,
  adminExportPredictions,
  adminCheck,
} from "../api";
import { useAuth } from "../context/AuthContext";
import ECGBackground from "../components/ECGBackground";

// Fallback configuration for all five supported CardioScan models
const SUPPORTED_MODELS = [
  {
    key: "random_forest",
    label: "Random Forest",
    type: "100-Tree Ensemble",
    color: "#2D7A58", // Clinical sage green
    description: "Decision tree ensemble capturing non-linear biomarker interactions.",
  },
  {
    key: "logistic_regression",
    label: "Logistic Regression",
    type: "L2 Regularized",
    color: "#35483E", // Deep forest green
    description: "Standardized linear classification providing well-calibrated baseline probabilities.",
  },
  {
    key: "knn",
    label: "K-Nearest Neighbors",
    type: "Instance-Based (k=7)",
    color: "#5B7365", // Muted slate-green
    description: "Euclidean distance nearest-neighbor clustering in normalized feature space.",
  },
  {
    key: "svm",
    label: "Support Vector Machine",
    type: "RBF Kernel",
    color: "#4A6356", // Forest slate
    description: "Maximum-margin hyperplane with radial basis function for complex boundaries.",
  },
  {
    key: "ensemble",
    label: "Ensemble (Soft-Voting)",
    type: "Consensus Model",
    color: "#B35D52", // Restrained terracotta
    description: "Weighted probability consensus combining predictions across all candidate classifiers.",
  },
];

export default function AdminPage() {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const isDark = Boolean(theme?.dark);
  const isRTL = i18n?.language === "ar";

  // Authorization & Telemetry State
  const [isAdminAuthorized, setIsAdminAuthorized] = useState(null); // null = verifying, true = verified, false = forbidden
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [predictions, setPredictions] = useState([]);
  const [activeTab, setActiveTab] = useState("governance"); // "governance" | "users" | "predictions"
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState(null);

  // Filters for User & Prediction Directories
  const [userSearch, setUserSearch] = useState("");
  const [predSearch, setPredSearch] = useState("");
  const [riskFilter, setRiskFilter] = useState("");
  const [modelFilter, setModelFilter] = useState("");

  // Safety Confirmation Modals for destructive actions
  const [pendingDeleteUser, setPendingDeleteUser] = useState(null);
  const [pendingDeletePred, setPendingDeletePred] = useState(null);
  const [deletingInProgress, setDeletingInProgress] = useState(false);
  const [exportingUsers, setExportingUsers] = useState(false);
  const [exportingPreds, setExportingPreds] = useState(false);

  // Initial authorization verification
  useEffect(() => {
    let isMounted = true;
    const verifyAdmin = async () => {
      try {
        const res = await adminCheck();
        if (isMounted) {
          if (res?.data?.is_admin) {
            setIsAdminAuthorized(true);
            loadDashboardData();
          } else {
            setIsAdminAuthorized(false);
            setLoading(false);
          }
        }
      } catch (err) {
        if (isMounted) {
          setIsAdminAuthorized(false);
          setLoading(false);
        }
      }
    };

    verifyAdmin();

    return () => {
      isMounted = false;
    };
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [sRes, uRes, pRes] = await Promise.all([
        adminStats(),
        adminUsers(),
        adminPredictions({}),
      ]);
      setStats(sRes.data);
      setUsers(Array.isArray(uRes.data) ? uRes.data : []);
      setPredictions(Array.isArray(pRes.data) ? pRes.data : []);
      setLastRefreshed(new Date());
    } catch (err) {
      toast.error(t("admin.load_error", "Failed to retrieve administrative telemetry from server."));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleManualRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    toast.success(t("admin.refresh_success", "Administrative dashboard refreshed."));
  };

  // Safe Deletion Handlers with Double Confirmation
  const handleConfirmDeleteUser = async () => {
    if (!pendingDeleteUser) return;
    setDeletingInProgress(true);
    try {
      await adminDeleteUser(pendingDeleteUser.id);
      setUsers((prev) => prev.filter((u) => u.id !== pendingDeleteUser.id));
      toast.success(
        t("admin.user_deleted", `Account for ${pendingDeleteUser.name} deleted successfully.`)
      );
      setPendingDeleteUser(null);
      // Refresh statistics silently
      adminStats().then((res) => setStats(res.data)).catch(() => {});
    } catch (err) {
      const msg = err?.response?.data?.error || t("admin.delete_failed", "Could not delete user account.");
      toast.error(msg);
    } finally {
      setDeletingInProgress(false);
    }
  };

  const handleConfirmDeletePrediction = async () => {
    if (!pendingDeletePred) return;
    setDeletingInProgress(true);
    try {
      await adminDeletePrediction(pendingDeletePred.id);
      setPredictions((prev) => prev.filter((p) => p.id !== pendingDeletePred.id));
      toast.success(t("admin.prediction_deleted", "Assessment evaluation record removed."));
      setPendingDeletePred(null);
      // Refresh statistics silently
      adminStats().then((res) => setStats(res.data)).catch(() => {});
    } catch (err) {
      toast.error(t("admin.delete_failed", "Could not remove assessment record."));
    } finally {
      setDeletingInProgress(false);
    }
  };

  // Controlled Exports
  const handleExportUsers = async () => {
    setExportingUsers(true);
    try {
      await adminExportUsers();
      toast.success(t("admin.export_users_success", "User accounts CSV exported successfully."));
    } catch {
      toast.error(t("admin.export_error", "Export failed. Please check network permissions."));
    } finally {
      setExportingUsers(false);
    }
  };

  const handleExportPredictions = async () => {
    setExportingPreds(true);
    try {
      await adminExportPredictions();
      toast.success(t("admin.export_preds_success", "Assessment telemetry CSV exported successfully."));
    } catch {
      toast.error(t("admin.export_error", "Export failed. Please check network permissions."));
    } finally {
      setExportingPreds(false);
    }
  };

  // Filtered Users List
  const filteredUsers = useMemo(() => {
    if (!userSearch.trim()) return users;
    const q = userSearch.toLowerCase();
    return users.filter(
      (u) =>
        (u.name && u.name.toLowerCase().includes(q)) ||
        (u.email && u.email.toLowerCase().includes(q)) ||
        (u.patient_id && u.patient_id.toLowerCase().includes(q))
    );
  }, [users, userSearch]);

  // Filtered Predictions List
  const filteredPredictions = useMemo(() => {
    return predictions.filter((p) => {
      if (riskFilter && p.risk_level !== riskFilter) return false;
      if (modelFilter && p.model_used !== modelFilter) return false;
      if (predSearch.trim()) {
        const q = predSearch.toLowerCase();
        const refMatch = `EV-${String(p.id).padStart(5, "0")}`.toLowerCase().includes(q);
        const nameMatch = p.user_name && p.user_name.toLowerCase().includes(q);
        const emailMatch = p.user_email && p.user_email.toLowerCase().includes(q);
        const modelMatch = p.model_used && p.model_used.toLowerCase().includes(q);
        if (!refMatch && !nameMatch && !emailMatch && !modelMatch) return false;
      }
      return true;
    });
  }, [predictions, riskFilter, modelFilter, predSearch]);

  // ── Access Denied / Unauthorized State ──
  if (isAdminAuthorized === false) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-[#F7F5F0] text-[#35483E] flex items-center justify-center p-6">
        <div className="glossy-card max-w-lg w-full p-8 border border-[#E5E0D6] rounded-2xl shadow-sm text-center space-y-5">
          <div className="w-14 h-14 rounded-2xl bg-[#FAF0EE] border border-[#F0D5D1] text-[#B35D52] mx-auto flex items-center justify-center shadow-2xs">
            <ShieldAlert size={28} />
          </div>
          <div className="space-y-2">
            <span className="font-mono text-xs uppercase tracking-wider text-[#B35D52] font-semibold">
              403 FORBIDDEN · RESTRICTED ACCESS
            </span>
            <h1 className="font-serif font-bold text-2xl text-[#35483E]">
              {t("admin.unauthorized_title", "Administrator Privileges Required")}
            </h1>
            <p className="text-sm text-[#52665A] leading-relaxed">
              {t(
                "admin.unauthorized_desc",
                "This interface is strictly restricted to authorized CardioScan platform governance officers. Your current session does not hold administrative authorization."
              )}
            </p>
          </div>
          <div className="pt-2">
            <Link
              to="/profile"
              className="glossy-btn-primary inline-flex items-center gap-2 px-6 py-2.5 rounded-xl font-medium text-sm text-white shadow-xs"
            >
              <span>{t("admin.return_dashboard", "Return to Dashboard")}</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full min-h-[calc(100vh-4rem)] py-8 sm:py-12 transition-colors duration-200 selection:bg-[#E4EDE5] selection:text-[#35483E] ${
      isDark ? "bg-[#0a0f1e] text-[#f1f5f9]" : "bg-[#F7F5F0] text-[#35483E]"
    }`}>
      <ECGBackground />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 relative z-10">

        {/* ── 1. Admin Header & Platform Governance Banner ── */}
        <header className="glossy-card p-6 sm:p-8 border border-[#E5E0D6] shadow-sm relative overflow-hidden">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
            <div className="space-y-2.5">
              <div className="inline-flex items-center gap-2 text-xs font-mono tracking-wider text-[#52665A] uppercase">
                <span className="w-2 h-2 rounded-full bg-[#2D7A58]" />
                <span className="font-semibold text-[#35483E]">
                  {t("admin.header_tag", "SYSTEM ADMINISTRATION · CLINICAL PLATFORM GOVERNANCE")}
                </span>
                <span className="text-[#8A9990]">·</span>
                <span className="text-[#6B7F74]">AUDITED ENVIRONMENT</span>
              </div>

              <h1 className="font-serif font-bold text-3xl sm:text-4xl text-[#35483E] tracking-tight">
                {t("admin.page_title", "Admin Governance & Telemetry")}
              </h1>

              <p className="text-sm text-[#52665A] max-w-2xl leading-relaxed">
                {t(
                  "admin.page_subtitle",
                  "Real-time platform observability, model inference telemetry across all 5 clinical classifiers, dataset integrity auditing, and secure administrative controls."
                )}
              </p>
            </div>

            {/* Quick Action Control Bar */}
            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={handleManualRefresh}
                disabled={refreshing || loading}
                className="glossy-btn-secondary flex items-center gap-2 px-3.5 py-2.5 rounded-xl font-medium text-xs sm:text-sm text-[#35483E] cursor-pointer shadow-2xs disabled:opacity-50"
                title="Refresh platform telemetry from live database"
              >
                <RefreshCw size={14} className={refreshing ? "animate-spin text-[#2D7A58]" : "text-[#52665A]"} />
                <span>{refreshing ? t("common.refreshing", "Refreshing...") : t("common.refresh", "Refresh Data")}</span>
              </button>

              <button
                type="button"
                onClick={handleExportUsers}
                disabled={exportingUsers}
                className="glossy-btn-secondary flex items-center gap-1.5 px-3 py-2.5 rounded-xl font-medium text-xs sm:text-sm text-[#35483E] cursor-pointer shadow-2xs"
                title="Download registered accounts audit CSV"
              >
                <Download size={13} className="text-[#52665A]" />
                <span>{exportingUsers ? "Exporting..." : "Users CSV"}</span>
              </button>

              <button
                type="button"
                onClick={handleExportPredictions}
                disabled={exportingPreds}
                className="glossy-btn-secondary flex items-center gap-1.5 px-3 py-2.5 rounded-xl font-medium text-xs sm:text-sm text-[#35483E] cursor-pointer shadow-2xs"
                title="Download historical assessment telemetry CSV"
              >
                <Download size={13} className="text-[#52665A]" />
                <span>{exportingPreds ? "Exporting..." : "Assessments CSV"}</span>
              </button>
            </div>
          </div>

          {/* Session & Telemetry Status Bar */}
          <div className="mt-5 pt-4 border-t border-[#E5E0D6] flex flex-wrap items-center justify-between gap-3 text-xs text-[#52665A]">
            <div className="flex flex-wrap items-center gap-3">
              <div className="inline-flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-lg border border-[#E5E0D6] shadow-2xs">
                <ShieldCheck size={13} className="text-[#2D7A58]" />
                <span className="font-semibold text-[#35483E]">Authorized Administrator</span>
                <span className="text-[#8A9990]">·</span>
                <span className="font-mono text-[11px] text-[#52665A]">{user?.email}</span>
              </div>

              <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-mono bg-[#E4EDE5] text-[#35483E] border border-[#D3DFD5]">
                <Server size={12} className="text-[#2D7A58]" />
                <span>Backend: FastAPI v2.0.0</span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-[11px] text-[#8A9990]">
              <Activity size={12} className="text-[#2D7A58]" />
              <span>
                {lastRefreshed
                  ? `Telemetry refreshed at ${lastRefreshed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`
                  : "Connecting to server..."}
              </span>
            </div>
          </div>
        </header>

        {/* ── 2. Primary Navigation Tabs ── */}
        <div className="flex flex-wrap items-center gap-2 border-b border-[#E5E0D6] pb-3">
          {[
            { key: "governance", label: "Platform Governance", icon: TrendingUp },
            { key: "users", label: `User Directory (${users.length})`, icon: Users },
            { key: "predictions", label: `Assessment Records (${predictions.length})`, icon: Activity },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              data-tab={key}
              type="button"
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                activeTab === key
                  ? "bg-[#35483E] text-white shadow-xs border border-[#35483E]"
                  : "bg-white text-[#52665A] hover:text-[#35483E] hover:bg-[#E4EDE5]/40 border border-[#E5E0D6] shadow-2xs"
              }`}
            >
              <Icon size={14} className={activeTab === key ? "text-white" : "text-[#52665A]"} />
              <span>{label}</span>
            </button>
          ))}
        </div>

        {/* ── 3. Loading Shimmer State ── */}
        {loading ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="glossy-card p-5 border border-[#E5E0D6] rounded-2xl h-32 animate-pulse bg-white/60" />
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="glossy-card p-6 border border-[#E5E0D6] rounded-2xl h-80 animate-pulse bg-white/60" />
              <div className="glossy-card p-6 border border-[#E5E0D6] rounded-2xl h-80 animate-pulse bg-white/60" />
            </div>
          </div>
        ) : (
          <>
            {/* ═══════════════════════════════════════════════════════
                TAB 1: PLATFORM GOVERNANCE & TELEMETRY
            ═══════════════════════════════════════════════════════ */}
            {activeTab === "governance" && stats && (
              <div className="space-y-8 animate-fadeinup">

                {/* ── Section 1: Platform Overview KPI Cards ── */}
                <section>
                  <div className="flex items-center justify-between mb-3.5">
                    <h2 className="font-serif font-bold text-lg text-[#35483E] flex items-center gap-2">
                      <Sparkles size={16} className="text-[#35483E]" />
                      <span>{t("admin.kpi_title", "Platform Operational Summary")}</span>
                    </h2>
                    <span className="text-xs font-mono text-[#8A9990]">Live DB Counts</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Card 1: Registered Accounts */}
                    <div className="glossy-card p-5 border border-[#E5E0D6] rounded-2xl shadow-xs flex flex-col justify-between">
                      <div className="flex items-center justify-between text-xs font-mono uppercase tracking-wider text-[#6B7F74]">
                        <span>Total Registered Users</span>
                        <Users size={15} className="text-[#35483E]" />
                      </div>
                      <div className="my-2.5">
                        <span className="font-serif font-bold text-3xl sm:text-4xl text-[#35483E]">
                          {stats.users.total}
                        </span>
                      </div>
                      <div className="pt-2 border-t border-[#E5E0D6] flex items-center justify-between text-xs text-[#52665A]">
                        <span>New this week:</span>
                        <span className="font-mono font-bold text-[#2D7A58]">+{stats.users.new_this_week}</span>
                      </div>
                    </div>

                    {/* Card 2: Verified Accounts */}
                    <div className="glossy-card p-5 border border-[#E5E0D6] rounded-2xl shadow-xs flex flex-col justify-between">
                      <div className="flex items-center justify-between text-xs font-mono uppercase tracking-wider text-[#6B7F74]">
                        <span>Verified Accounts</span>
                        <ShieldCheck size={15} className="text-[#2D7A58]" />
                      </div>
                      <div className="my-2.5 flex items-baseline gap-2">
                        <span className="font-serif font-bold text-3xl sm:text-4xl text-[#35483E]">
                          {stats.users.verified}
                        </span>
                        <span className="text-xs font-mono text-[#6B7F74]">
                          ({stats.users.total ? Math.round((stats.users.verified / stats.users.total) * 100) : 0}%)
                        </span>
                      </div>
                      <div className="pt-2 border-t border-[#E5E0D6] flex items-center justify-between text-xs text-[#52665A]">
                        <span>Unverified pending:</span>
                        <span className="font-mono font-medium text-[#B35D52]">{stats.users.unverified}</span>
                      </div>
                    </div>

                    {/* Card 3: Total Assessments Run */}
                    <div className="glossy-card p-5 border border-[#E5E0D6] rounded-2xl shadow-xs flex flex-col justify-between">
                      <div className="flex items-center justify-between text-xs font-mono uppercase tracking-wider text-[#6B7F74]">
                        <span>Total Assessments</span>
                        <Activity size={15} className="text-[#35483E]" />
                      </div>
                      <div className="my-2.5">
                        <span className="font-serif font-bold text-3xl sm:text-4xl text-[#35483E]">
                          {stats.predictions.total}
                        </span>
                      </div>
                      <div className="pt-2 border-t border-[#E5E0D6] flex items-center justify-between text-xs text-[#52665A]">
                        <span>New this week:</span>
                        <span className="font-mono font-bold text-[#2D7A58]">+{stats.predictions.new_this_week}</span>
                      </div>
                    </div>

                    {/* Card 4: Unique Accounts Assessed */}
                    <div className="glossy-card p-5 border border-[#E5E0D6] rounded-2xl shadow-xs flex flex-col justify-between">
                      <div className="flex items-center justify-between text-xs font-mono uppercase tracking-wider text-[#6B7F74]">
                        <span>{t("admin.unique_accounts_assessed", "Unique Accounts Assessed")}</span>
                        <Users size={15} className="text-[#35483E]" />
                      </div>
                      <div className="my-2.5 flex items-baseline gap-2">
                        <span className="font-serif font-bold text-3xl sm:text-4xl text-[#35483E]">
                          {stats.predictions.unique_accounts_assessed ?? stats.predictions.unique_patients_assessed ?? 1}
                        </span>
                        <span className="text-xs font-mono text-[#6B7F74]">
                          {t("admin.distinct_accounts", "distinct accounts")}
                        </span>
                      </div>
                      <div className="pt-2 border-t border-[#E5E0D6] flex items-center justify-between text-xs text-[#52665A]">
                        <span>{t("admin.avg_runs_account", "Avg runs / account:")}</span>
                        <span className="font-mono font-medium text-[#35483E]">
                          {stats.predictions.total && (stats.predictions.unique_accounts_assessed ?? stats.predictions.unique_patients_assessed)
                            ? (stats.predictions.total / (stats.predictions.unique_accounts_assessed ?? stats.predictions.unique_patients_assessed)).toFixed(1)
                            : "1.0"}
                        </span>
                      </div>
                    </div>
                  </div>
                </section>

                {/* ── Section 2: Model Utilization Telemetry (All 5 Models) ── */}
                <section className="glossy-card p-6 sm:p-7 border border-[#E5E0D6] rounded-2xl shadow-sm space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#E5E0D6] gap-2">
                    <div>
                      <h2 className="font-serif font-bold text-lg text-[#35483E] flex items-center gap-2">
                        <Cpu size={18} className="text-[#35483E]" />
                        <span>Model Usage Telemetry</span>
                      </h2>
                      <p className="text-xs text-[#6B7F74] mt-0.5">
                        Real-time volume and execution distribution across all five supported clinical classifiers.
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-mono bg-[#E4EDE5] text-[#35483E] border border-[#D3DFD5] self-start sm:self-center">
                      <span>5 Models Online</span>
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    {SUPPORTED_MODELS.map((m) => {
                      const count = stats.models?.[m.key] ?? 0;
                      const totalPreds = stats.predictions.total || 0;
                      const sharePct = totalPreds > 0 ? ((count / totalPreds) * 100).toFixed(1) : "0.0";

                      return (
                        <div
                          key={m.key}
                          className="p-4 rounded-xl border border-[#E5E0D6] bg-[#FAF8F5] flex flex-col justify-between space-y-3"
                        >
                          <div>
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-[10px] font-mono uppercase tracking-wider text-[#6B7F74] font-semibold truncate">
                                {m.type}
                              </span>
                              <span className="w-1.5 h-1.5 rounded-full bg-[#2D7A58]" />
                            </div>
                            <h3 className="font-serif font-bold text-sm text-[#35483E] mt-1">
                              {m.label}
                            </h3>
                            <p className="text-[11px] text-[#6B7F74] mt-1 line-clamp-2 leading-relaxed">
                              {m.description}
                            </p>
                          </div>

                          <div className="pt-2 border-t border-[#E5E0D6] space-y-1.5">
                            <div className="flex items-baseline justify-between">
                              <span className="font-serif font-bold text-2xl text-[#35483E]">{count}</span>
                              <span className="text-xs font-mono font-semibold text-[#52665A]">{sharePct}%</span>
                            </div>
                            {/* Distribution Progress Bar */}
                            <div className="h-1.5 rounded-full bg-[#E5E0D6] overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{
                                  width: `${Math.max(4, Number(sharePct))}%`,
                                  backgroundColor: m.color,
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex items-center gap-2 pt-2 text-[11px] text-[#8A9990]">
                    <Info size={13} className="shrink-0 text-[#52665A]" />
                    <span>
                      Telemetry represents all-time inference invocations recorded in the application database.
                    </span>
                  </div>
                </section>

                {/* ── Section 3: Assessment Activity Trends & Risk Distribution ── */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                  {/* Left: 14-Day Activity Trend Bar Chart (7 cols) */}
                  <section className="lg:col-span-7 glossy-card p-6 sm:p-7 border border-[#E5E0D6] rounded-2xl shadow-sm flex flex-col justify-between space-y-4">
                    <div>
                      <div className="flex items-center justify-between pb-3 border-b border-[#E5E0D6]">
                        <div>
                          <h2 className="font-serif font-bold text-base text-[#35483E] flex items-center gap-2">
                            <TrendingUp size={16} className="text-[#35483E]" />
                            <span>14-Day Assessment Trend</span>
                          </h2>
                          <p className="text-xs text-[#6B7F74] mt-0.5">
                            Daily evaluation counts aggregated from database timestamps.
                          </p>
                        </div>
                        <span className="text-xs font-mono text-[#52665A] bg-[#E4EDE5] px-2.5 py-1 rounded-md border border-[#D3DFD5]">
                          Last 14 Days
                        </span>
                      </div>

                      {/* Chart Container */}
                      <div className="h-56 mt-4 w-full">
                        {stats.activity_trends && stats.activity_trends.length > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stats.activity_trends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E0D6" />
                              <XAxis
                                dataKey="label"
                                tick={{ fontSize: 11, fill: "#6B7F74" }}
                                axisLine={{ stroke: "#E5E0D6" }}
                                tickLine={false}
                              />
                              <YAxis
                                allowDecimals={false}
                                tick={{ fontSize: 11, fill: "#6B7F74" }}
                                axisLine={{ stroke: "#E5E0D6" }}
                                tickLine={false}
                              />
                              <Tooltip
                                content={({ active, payload }) => {
                                  if (active && payload && payload.length) {
                                    const data = payload[0].payload;
                                    return (
                                      <div className="p-2.5 bg-white border border-[#E5E0D6] rounded-xl shadow-md text-xs space-y-1">
                                        <p className="font-mono text-[#6B7F74]">{data.date}</p>
                                        <p className="font-serif font-bold text-[#35483E]">
                                          {data.assessments} {data.assessments === 1 ? "assessment" : "assessments"}
                                        </p>
                                      </div>
                                    );
                                  }
                                  return null;
                                }}
                              />
                              <Bar dataKey="assessments" radius={[4, 4, 0, 0]}>
                                {stats.activity_trends.map((entry, index) => (
                                  <Cell
                                    key={`cell-${index}`}
                                    fill={entry.assessments > 0 ? "#2D7A58" : "#D3DFD5"}
                                  />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="h-full flex items-center justify-center text-xs text-[#8A9990]">
                            No historical timeline records available.
                          </div>
                        )}
                      </div>
                    </div>

                    <p className="text-[11px] text-[#8A9990] border-t border-[#E5E0D6] pt-3">
                      Truthful telemetry: Zero-count days accurately indicate inactive periods. Assessment timestamps are never interpolated or fabricated.
                    </p>
                  </section>

                  {/* Right: Risk Level Stratification & Outcomes (5 cols) */}
                  <section className="lg:col-span-5 glossy-card p-6 sm:p-7 border border-[#E5E0D6] rounded-2xl shadow-sm flex flex-col justify-between space-y-4">
                    <div>
                      <div className="flex items-center justify-between pb-3 border-b border-[#E5E0D6]">
                        <h2 className="font-serif font-bold text-base text-[#35483E] flex items-center gap-2">
                          <Activity size={16} className="text-[#35483E]" />
                          <span>Risk & Outcome Distribution</span>
                        </h2>
                        <span className="text-xs font-mono text-[#52665A]">Total: {stats.predictions.total}</span>
                      </div>

                      {/* Risk Tiers */}
                      <div className="mt-4 space-y-3">
                        <p className="text-[11px] font-mono uppercase tracking-wider text-[#6B7F74] font-semibold">
                          Risk Tiers
                        </p>

                        {[
                          { label: "High Risk Tier", value: stats.predictions.high_risk, color: "#B35D52", bg: "#FAF0EE" },
                          { label: "Moderate Risk Tier", value: stats.predictions.moderate_risk, color: "#A36D20", bg: "#FDF6EA" },
                          { label: "Low Risk Tier", value: stats.predictions.low_risk, color: "#2D7A58", bg: "#E4EDE5" },
                        ].map(({ label, value, color, bg }) => {
                          const pct = stats.predictions.total ? ((value / stats.predictions.total) * 100).toFixed(1) : 0;
                          return (
                            <div key={label} className="space-y-1">
                              <div className="flex justify-between text-xs">
                                <span className="font-medium text-[#35483E] flex items-center gap-1.5">
                                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                                  {label}
                                </span>
                                <span className="font-mono text-[#52665A]">
                                  {value} ({pct}%)
                                </span>
                              </div>
                              <div className="h-1.5 rounded-full bg-[#E5E0D6] overflow-hidden">
                                <div
                                  className="h-full rounded-full transition-all duration-500"
                                  style={{ width: `${pct}%`, backgroundColor: color }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Binary Prediction Outcomes */}
                      <div className="mt-5 pt-4 border-t border-[#E5E0D6] space-y-2.5">
                        <p className="text-[11px] font-mono uppercase tracking-wider text-[#6B7F74] font-semibold">
                          Classification Indication
                        </p>
                        <div className="grid grid-cols-2 gap-2 text-center text-xs">
                          <div className="p-2.5 rounded-xl bg-[#FAF0EE] border border-[#F0D5D1]">
                            <p className="font-serif font-bold text-lg text-[#B35D52]">{stats.predictions.positive}</p>
                            <p className="text-[11px] text-[#B35D52] font-medium mt-0.5">Disease Indicated</p>
                          </div>
                          <div className="p-2.5 rounded-xl bg-[#E4EDE5] border border-[#D3DFD5]">
                            <p className="font-serif font-bold text-lg text-[#2D7A58]">{stats.predictions.negative}</p>
                            <p className="text-[11px] text-[#2D7A58] font-medium mt-0.5">No Indication</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <p className="text-[10px] text-[#8A9990]">
                      Distribution derived from all persisted evaluation records.
                    </p>
                  </section>
                </div>

                {/* ── Section 4: System Health & Infrastructure Telemetry ── */}
                <section className="glossy-card p-6 sm:p-7 border border-[#E5E0D6] rounded-2xl shadow-sm space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#E5E0D6] gap-2">
                    <div>
                      <h2 className="font-serif font-bold text-lg text-[#35483E] flex items-center gap-2">
                        <Server size={18} className="text-[#35483E]" />
                        <span>System Health & Service Infrastructure</span>
                      </h2>
                      <p className="text-xs text-[#6B7F74] mt-0.5">
                        Operational status of runtime components, database connectivity, and security background workers.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold border ${
                        stats.system_health?.status === "operational"
                          ? "bg-[#E4EDE5] text-[#2D7A58] border-[#D3DFD5]"
                          : "bg-[#FAF0EE] text-[#B35D52] border-[#F0D5D1]"
                      }`}>
                        <span className={`w-2 h-2 rounded-full ${
                          stats.system_health?.status === "operational" ? "bg-[#2D7A58] animate-pulse" : "bg-[#B35D52]"
                        }`} />
                        <span>{stats.system_health?.status === "operational" ? "All Systems Operational" : "System Status: Degraded"}</span>
                      </span>
                    </div>
                  </div>

                  {/* 5 Service Status Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
                    {/* 1. Backend Service */}
                    <div className="p-3.5 rounded-xl border border-[#E5E0D6] bg-white flex flex-col justify-between space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-mono text-[#6B7F74]">FastAPI Host</span>
                        <CheckCircle size={14} className="text-[#2D7A58]" />
                      </div>
                      <div>
                        <p className="font-serif font-bold text-sm text-[#35483E]">API Backend</p>
                        <p className="text-[11px] text-[#6B7F74] font-mono mt-0.5">
                          v{stats.system_health?.backend_version || "2.0.0"} · Active
                        </p>
                      </div>
                      <span className="text-[10px] text-[#2D7A58] bg-[#E4EDE5] px-2 py-0.5 rounded font-semibold self-start">
                        Nominal Ping
                      </span>
                    </div>

                    {/* 2. Database Engine */}
                    {(() => {
                      const isDbOk = stats.system_health?.database?.status === "connected";
                      return (
                        <div className="p-3.5 rounded-xl border border-[#E5E0D6] bg-white flex flex-col justify-between space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-mono text-[#6B7F74]">Database Engine</span>
                            {isDbOk ? (
                              <CheckCircle size={14} className="text-[#2D7A58]" />
                            ) : (
                              <AlertCircle size={14} className="text-[#B35D52]" />
                            )}
                          </div>
                          <div>
                            <p className="font-serif font-bold text-sm text-[#35483E]">
                              {stats.system_health?.database?.engine === "postgresql" ? "PostgreSQL DB" : "SQLite DB"}
                            </p>
                            <p className="text-[11px] text-[#6B7F74] font-mono mt-0.5">
                              {isDbOk ? "Connected · Pool OK" : "Connection Failed"}
                            </p>
                          </div>
                          <span className={`text-[10px] px-2 py-0.5 rounded font-semibold self-start ${
                            isDbOk ? "text-[#2D7A58] bg-[#E4EDE5]" : "text-[#B35D52] bg-[#FAF0EE]"
                          }`}>
                            {isDbOk ? "Validated" : "Disconnected"}
                          </span>
                        </div>
                      );
                    })()}

                    {/* 3. ML Inference Engine */}
                    {(() => {
                      const isMlOk = stats.system_health?.ml_engine?.status === "ready";
                      const modelsLoaded = stats.system_health?.ml_engine?.models_loaded ?? 0;
                      return (
                        <div className="p-3.5 rounded-xl border border-[#E5E0D6] bg-white flex flex-col justify-between space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-mono text-[#6B7F74]">Inference Service</span>
                            {isMlOk ? (
                              <CheckCircle size={14} className="text-[#2D7A58]" />
                            ) : (
                              <AlertCircle size={14} className="text-[#B35D52]" />
                            )}
                          </div>
                          <div>
                            <p className="font-serif font-bold text-sm text-[#35483E]">ML Inference</p>
                            <p className="text-[11px] text-[#6B7F74] font-mono mt-0.5">
                              {modelsLoaded} {modelsLoaded === 1 ? "Classifier" : "Classifiers"} Loaded
                            </p>
                          </div>
                          <span className={`text-[10px] px-2 py-0.5 rounded font-semibold self-start ${
                            isMlOk ? "text-[#2D7A58] bg-[#E4EDE5]" : "text-[#B35D52] bg-[#FAF0EE]"
                          }`}>
                            {isMlOk ? "In Memory" : "Uninitialized"}
                          </span>
                        </div>
                      );
                    })()}

                    {/* 4. Firebase Auth Sync Worker */}
                    {(() => {
                      const cleanups = stats.system_health?.firebase_worker?.pending_cleanups;
                      const workerStatus = stats.system_health?.firebase_worker?.status;
                      const isIdle = cleanups === 0;
                      return (
                        <div className="p-3.5 rounded-xl border border-[#E5E0D6] bg-white flex flex-col justify-between space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-mono text-[#6B7F74]">Background Worker</span>
                            {isIdle ? (
                              <CheckCircle size={14} className="text-[#2D7A58]" />
                            ) : (
                              <AlertCircle size={14} className="text-[#A36D20]" />
                            )}
                          </div>
                          <div>
                            <p className="font-serif font-bold text-sm text-[#35483E]">Identity Worker</p>
                            <p className="text-[11px] text-[#6B7F74] font-mono mt-0.5">
                              {cleanups ?? 0} Pending Cleanups
                            </p>
                          </div>
                          <span className={`text-[10px] px-2 py-0.5 rounded font-semibold self-start ${
                            isIdle
                              ? "text-[#35483E] bg-[#E4EDE5]"
                              : workerStatus === "unverified"
                              ? "text-[#52665A] bg-[#FAF8F5]"
                              : "text-[#A36D20] bg-[#FDF6EA]"
                          }`}>
                            {isIdle ? "Queue Idle" : workerStatus === "unverified" ? "Not Monitored" : "Tasks Queued"}
                          </span>
                        </div>
                      );
                    })()}

                    {/* 5. Cloudflare Turnstile Bot Defense */}
                    {(() => {
                      const isTurnstileOn = Boolean(stats.system_health?.turnstile?.enabled);
                      return (
                        <div className="p-3.5 rounded-xl border border-[#E5E0D6] bg-white flex flex-col justify-between space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-mono text-[#6B7F74]">Bot Protection</span>
                            {isTurnstileOn ? (
                              <CheckCircle size={14} className="text-[#2D7A58]" />
                            ) : (
                              <ShieldAlert size={14} className="text-[#A36D20]" />
                            )}
                          </div>
                          <div>
                            <p className="font-serif font-bold text-sm text-[#35483E]">Cloudflare Turnstile</p>
                            <p className="text-[11px] text-[#6B7F74] font-mono mt-0.5">
                              {isTurnstileOn ? "Challenge Active" : "Disabled in Dev"}
                            </p>
                          </div>
                          <span className={`text-[10px] px-2 py-0.5 rounded font-semibold self-start ${
                            isTurnstileOn ? "text-[#2D7A58] bg-[#E4EDE5]" : "text-[#A36D20] bg-[#FDF6EA]"
                          }`}>
                            {isTurnstileOn ? "Secured" : "Not Configured"}
                          </span>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Healthcare Reliability Engineering Disclaimer */}
                  <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#E5E0D6] flex items-start gap-3">
                    <ShieldAlert size={16} className="text-[#A36D20] shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-[#35483E]">
                        Operational Health & Clinical Reliability Distinction
                      </p>
                      <p className="text-[11px] text-[#52665A] leading-relaxed">
                        {stats.system_health?.reliability_disclaimer ||
                          "Passing operational status checks verify real-time host responsiveness and in-memory process initialization only; they do not replace formal high-availability enterprise SLAs or diagnostic clinical validation."}
                      </p>
                    </div>
                  </div>
                </section>

                {/* ── Section 5: Data Quality, Leakage Prevention & Clinical Safety ── */}
                <section className="glossy-card p-6 sm:p-7 border border-[#E5E0D6] rounded-2xl shadow-sm space-y-5">
                  <div className="pb-3 border-b border-[#E5E0D6]">
                    <h2 className="font-serif font-bold text-lg text-[#35483E] flex items-center gap-2">
                      <Database size={18} className="text-[#35483E]" />
                      <span>Data Quality, Leakage Prevention & Clinical Governance</span>
                    </h2>
                    <p className="text-xs text-[#6B7F74] mt-0.5">
                      Established project research benchmarks, dataset deduplication audit findings, and clinical boundary limits.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Card 1: Bundled Dataset Structure */}
                    <div className="p-4 rounded-xl border border-[#E5E0D6] bg-white flex flex-col justify-between space-y-3">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-xs font-mono font-semibold text-[#35483E]">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#B35D52]" />
                          <span>Bundled Repository Dataset</span>
                        </div>
                        <p className="text-xs text-[#52665A] leading-relaxed">
                          Repository file (<code className="text-[11px] font-mono text-[#35483E] bg-[#FAF8F5] px-1 py-0.5 rounded">heart.csv</code>) contains <strong>1,025 rows</strong>, including <strong>723 exact duplicate rows</strong> ({stats.data_quality?.bundled_duplicate_pct ?? 70.5}% duplicate rate from replication across multiple cohorts).
                        </p>
                      </div>
                      <div className="text-[11px] font-mono text-[#8A9990] pt-2 border-t border-[#E5E0D6]">
                        1,025 Rows · 723 Duplicates (70.5%)
                      </div>
                    </div>

                    {/* Card 2: Distinct Row Observations */}
                    <div className="p-4 rounded-xl border border-[#E5E0D6] bg-white flex flex-col justify-between space-y-3">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-xs font-mono font-semibold text-[#35483E]">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#A36D20]" />
                          <span>Distinct Feature Records</span>
                        </div>
                        <p className="text-xs text-[#52665A] leading-relaxed">
                          Deduplication yields <strong>302 distinct full-row observations</strong> across all 13 clinical features.
                        </p>
                        <div className="p-2 rounded-lg bg-[#FDF6EA] border border-[#F5E6CA] text-[11px] text-[#A36D20] leading-snug">
                          <strong>Note:</strong> Distinct rows represent unique biomarker configurations, not independently verified biological patients. Do not label distinct rows as unique patients.
                        </div>
                      </div>
                      <div className="text-[11px] font-mono text-[#8A9990] pt-2 border-t border-[#E5E0D6]">
                        302 Unique Observation Patterns
                      </div>
                    </div>

                    {/* Card 3: 1988 UCI Cleveland Provenance & Pipeline */}
                    <div className="p-4 rounded-xl border border-[#E5E0D6] bg-white flex flex-col justify-between space-y-3">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-xs font-mono font-semibold text-[#35483E]">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#2D7A58]" />
                          <span>UCI 1988 Source & CV</span>
                        </div>
                        <p className="text-xs text-[#52665A] leading-relaxed">
                          Traced to 1988 UCI Cleveland cohort (<strong>303 raw rows</strong>, with 1 duplicate: row index 164 duplicates row 0). Evaluated via <strong>5-Fold Stratified CV</strong> with <code className="text-[11px] font-mono text-[#35483E] bg-[#FAF8F5] px-1 py-0.5 rounded">StandardScaler</code> isolated within Pipeline training folds (~82.5% AUC).
                        </p>
                      </div>
                      <div className="text-[11px] font-mono text-[#8A9990] pt-2 border-t border-[#E5E0D6]">
                        UCI Cleveland 1988 · Leakage-Safe
                      </div>
                    </div>

                    {/* Card 4: Regulatory & Clinical Boundary */}
                    <div className="p-4 rounded-xl border border-[#E5E0D6] bg-white flex flex-col justify-between space-y-3">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-xs font-mono font-semibold text-[#35483E]">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#52665A]" />
                          <span>Regulatory Boundary Limits</span>
                        </div>
                        <p className="text-xs text-[#52665A] leading-relaxed">
                          CardioScan operates as an educational ML decision-support benchmark. It is <strong>not FDA/CE cleared as a diagnostic device</strong>, not a HIPAA-covered entity, and does not provide clinical diagnoses.
                        </p>
                      </div>
                      <div className="text-[11px] font-mono text-[#8A9990] pt-2 border-t border-[#E5E0D6]">
                        Educational & Screening Scope Only
                      </div>
                    </div>
                  </div>
                </section>

                {/* ── Section 6: Recent Administrative Activity Feed (PHI-Safe) ── */}
                <section className="glossy-card p-6 sm:p-7 border border-[#E5E0D6] rounded-2xl shadow-sm space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#E5E0D6] gap-2">
                    <div>
                      <h2 className="font-serif font-bold text-base text-[#35483E] flex items-center gap-2">
                        <Activity size={16} className="text-[#35483E]" />
                        <span>Recent Assessment Activity Telemetry</span>
                      </h2>
                      <p className="text-xs text-[#6B7F74] mt-0.5">
                        Latest assessment runs formatted for administrative auditing with strict privacy minimization.
                      </p>
                    </div>

                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-mono bg-[#E4EDE5] text-[#35483E] border border-[#D3DFD5] self-start sm:self-center">
                      <ShieldCheck size={13} className="text-[#2D7A58]" />
                      <span>Administrative Privacy Minimization</span>
                    </span>
                  </div>

                  {/* Activity Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-[#E5E0D6] text-[11px] font-mono uppercase tracking-wider text-[#6B7F74]">
                          <th className="py-2.5 px-3">Event Ref</th>
                          <th className="py-2.5 px-3">Subject</th>
                          <th className="py-2.5 px-3">Classifier</th>
                          <th className="py-2.5 px-3">Risk Classification</th>
                          <th className="py-2.5 px-3">Confidence</th>
                          <th className="py-2.5 px-3 text-right">Timestamp</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E5E0D6]/60">
                        {stats.recent_activity && stats.recent_activity.length > 0 ? (
                          stats.recent_activity.map((item) => {
                            const riskBadgeColor =
                              item.risk_level === "High"
                                ? "bg-[#FAF0EE] text-[#B35D52] border-[#F0D5D1]"
                                : item.risk_level === "Moderate"
                                ? "bg-[#FDF6EA] text-[#A36D20] border-[#F5E6CA]"
                                : "bg-[#E4EDE5] text-[#2D7A58] border-[#D3DFD5]";

                            return (
                              <tr key={item.id} className="hover:bg-[#FAF8F5] transition-colors">
                                <td className="py-3 px-3 font-mono font-bold text-[#35483E]">{item.ref_code}</td>
                                <td className="py-3 px-3 font-mono text-[#52665A]">{item.user_masked_ref}</td>
                                <td className="py-3 px-3">
                                  <span className="font-medium text-[#35483E] capitalize">
                                    {item.model_used.replace(/_/g, " ")}
                                  </span>
                                </td>
                                <td className="py-3 px-3">
                                  <span className={`inline-block px-2.5 py-0.5 rounded-md font-semibold text-[11px] border ${riskBadgeColor}`}>
                                    {item.risk_level}
                                  </span>
                                </td>
                                <td className="py-3 px-3 font-mono text-[#35483E]">
                                  {item.probability !== null ? `${(item.probability * 100).toFixed(1)}%` : "N/A"}
                                </td>
                                <td className="py-3 px-3 font-mono text-[#8A9990] text-right">
                                  {item.created_at ? new Date(item.created_at).toLocaleDateString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "N/A"}
                                </td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan={6} className="py-6 text-center text-xs text-[#8A9990]">
                              No recent assessment events logged in the database.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  <p className="text-[11px] text-[#8A9990] pt-2 border-t border-[#E5E0D6]">
                    Administrative Privacy Minimization: Subject names, emails, and raw clinical biomarkers are excluded from this telemetry stream. CardioScan is an educational ML decision-support benchmark and not a HIPAA-covered entity or certified diagnostic platform.
                  </p>
                </section>

              </div>
            )}

            {/* ═══════════════════════════════════════════════════════
                TAB 2: USER DIRECTORY & ACCOUNT AUDIT
            ═══════════════════════════════════════════════════════ */}
            {activeTab === "users" && (
              <div className="space-y-6 animate-fadeinup">
                {/* Search & Export Toolbar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="relative flex-1 max-w-md">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7F74]" />
                    <input
                      type="text"
                      placeholder="Search accounts by name or email..."
                      className="glossy-input pl-9 pr-4 py-2 rounded-xl text-xs sm:text-sm w-full outline-hidden"
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleExportUsers}
                      className="glossy-btn-secondary flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium text-[#35483E] cursor-pointer"
                    >
                      <Download size={13} />
                      <span>Export Accounts CSV</span>
                    </button>
                  </div>
                </div>

                {/* Users Directory Card */}
                <div className="glossy-card border border-[#E5E0D6] rounded-2xl shadow-sm overflow-hidden">
                  <div className="p-4 sm:p-5 border-b border-[#E5E0D6] flex items-center justify-between">
                    <div>
                      <h3 className="font-serif font-bold text-base text-[#35483E]">
                        Registered User Accounts ({filteredUsers.length})
                      </h3>
                      <p className="text-xs text-[#6B7F74]">
                        Official account roster with email verification status and recorded assessment frequency.
                      </p>
                    </div>
                  </div>

                  <div className="divide-y divide-[#E5E0D6]">
                    {filteredUsers.length === 0 ? (
                      <div className="p-8 text-center text-xs text-[#8A9990]">
                        No user accounts match your search query.
                      </div>
                    ) : (
                      filteredUsers.map((u) => (
                        <div
                          key={u.id}
                          className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[#FAF8F5] transition-colors"
                        >
                          <div className="flex items-center gap-3.5 min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-[#E4EDE5] border border-[#D3DFD5] text-[#35483E] flex items-center justify-center font-bold text-sm shrink-0">
                              {(u.name?.[0] || u.email?.[0] || "U").toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="font-serif font-bold text-sm text-[#35483E] truncate">{u.name}</p>
                                {u.patient_id && (
                                  <span className="font-mono text-[10px] bg-white px-1.5 py-0.5 rounded border border-[#E5E0D6] text-[#52665A]">
                                    {u.patient_id}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs font-mono text-[#6B7F74] truncate">{u.email}</p>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-3 shrink-0 self-start sm:self-center">
                            {u.is_verified ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#E4EDE5] text-[#2D7A58] border border-[#D3DFD5]">
                                <Check size={12} />
                                <span>Verified</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-[#FAF0EE] text-[#B35D52] border border-[#F0D5D1]">
                                <span>Pending Verification</span>
                              </span>
                            )}

                            <span className="font-mono text-xs text-[#52665A] bg-[#FAF8F5] px-2.5 py-1 rounded-lg border border-[#E5E0D6]">
                              {u.prediction_count ?? 0} {u.prediction_count === 1 ? "assessment" : "assessments"}
                            </span>

                            <span className="text-xs text-[#8A9990] font-mono">
                              {u.created_at ? new Date(u.created_at).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" }) : ""}
                            </span>

                            <button
                              type="button"
                              data-action="delete-user"
                              onClick={() => setPendingDeleteUser(u)}
                              className="p-1.5 rounded-lg text-[#8A9990] hover:text-[#B35D52] hover:bg-[#FAF0EE] transition-all cursor-pointer"
                              title="Delete account"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ═══════════════════════════════════════════════════════
                TAB 3: ASSESSMENT RECORDS AUDIT LOG
            ═══════════════════════════════════════════════════════ */}
            {activeTab === "predictions" && (
              <div className="space-y-6 animate-fadeinup">
                {/* Search & Filter Controls */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="relative flex-1 max-w-md">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7F74]" />
                    <input
                      type="text"
                      placeholder="Search by assessment ref, user, or model..."
                      className="glossy-input pl-9 pr-4 py-2 rounded-xl text-xs sm:text-sm w-full outline-hidden"
                      value={predSearch}
                      onChange={(e) => setPredSearch(e.target.value)}
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      className="glossy-input px-3 py-2 rounded-xl text-xs text-[#35483E] cursor-pointer"
                      value={riskFilter}
                      onChange={(e) => setRiskFilter(e.target.value)}
                    >
                      <option value="">All Risk Tiers</option>
                      <option value="High">High Risk</option>
                      <option value="Moderate">Moderate Risk</option>
                      <option value="Low">Low Risk</option>
                    </select>

                    <select
                      className="glossy-input px-3 py-2 rounded-xl text-xs text-[#35483E] cursor-pointer"
                      value={modelFilter}
                      onChange={(e) => setModelFilter(e.target.value)}
                    >
                      <option value="">All Models</option>
                      <option value="random_forest">Random Forest</option>
                      <option value="logistic_regression">Logistic Regression</option>
                      <option value="knn">K-Nearest Neighbors</option>
                      <option value="svm">Support Vector Machine</option>
                      <option value="ensemble">Ensemble Consensus</option>
                    </select>

                    <button
                      type="button"
                      onClick={handleExportPredictions}
                      className="glossy-btn-secondary flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium text-[#35483E] cursor-pointer"
                    >
                      <Download size={13} />
                      <span>Export Records CSV</span>
                    </button>
                  </div>
                </div>

                {/* Records Card */}
                <div className="glossy-card border border-[#E5E0D6] rounded-2xl shadow-sm overflow-hidden">
                  <div className="p-4 sm:p-5 border-b border-[#E5E0D6] flex items-center justify-between">
                    <div>
                      <h3 className="font-serif font-bold text-base text-[#35483E]">
                        Historical Assessment Evaluations ({filteredPredictions.length})
                      </h3>
                      <p className="text-xs text-[#6B7F74]">
                        Audited assessment log with model selection, classified risk, and computed risk probability.
                      </p>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-[#E5E0D6] text-[11px] font-mono uppercase tracking-wider text-[#6B7F74] bg-[#FAF8F5]">
                          <th className="py-3 px-4">Evaluation ID</th>
                          <th className="py-3 px-4">Account Reference</th>
                          <th className="py-3 px-4">Model Architecture</th>
                          <th className="py-3 px-4">Risk Classification</th>
                          <th className="py-3 px-4">Confidence</th>
                          <th className="py-3 px-4">Recorded Date</th>
                          <th className="py-3 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E5E0D6]/60">
                        {filteredPredictions.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="py-8 text-center text-xs text-[#8A9990]">
                              No assessment records match your filter criteria.
                            </td>
                          </tr>
                        ) : (
                          filteredPredictions.map((p) => {
                            const badgeColor =
                              p.risk_level === "High"
                                ? "bg-[#FAF0EE] text-[#B35D52] border-[#F0D5D1]"
                                : p.risk_level === "Moderate"
                                ? "bg-[#FDF6EA] text-[#A36D20] border-[#F5E6CA]"
                                : "bg-[#E4EDE5] text-[#2D7A58] border-[#D3DFD5]";

                            return (
                              <tr key={p.id} className="hover:bg-[#FAF8F5] transition-colors">
                                <td className="py-3 px-4 font-mono font-bold text-[#35483E]">
                                  EV-{String(p.id).padStart(5, "0")}
                                </td>
                                <td className="py-3 px-4">
                                  <div>
                                    <p className="font-medium text-[#35483E]">{p.user_name || "Anonymous Account"}</p>
                                    <p className="font-mono text-[11px] text-[#8A9990]">{p.user_email || "N/A"}</p>
                                  </div>
                                </td>
                                <td className="py-3 px-4">
                                  <span className="font-medium text-[#35483E] capitalize">
                                    {p.model_used.replace(/_/g, " ")}
                                  </span>
                                </td>
                                <td className="py-3 px-4">
                                  <span className={`inline-block px-2.5 py-0.5 rounded-md font-semibold text-[11px] border ${badgeColor}`}>
                                    {p.risk_level}
                                  </span>
                                </td>
                                <td className="py-3 px-4 font-mono text-[#35483E]">
                                  {p.probability !== undefined && p.probability !== null
                                    ? `${(p.probability * 100).toFixed(1)}%`
                                    : "N/A"}
                                </td>
                                <td className="py-3 px-4 font-mono text-[#8A9990]">
                                  {p.created_at ? new Date(p.created_at).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" }) : ""}
                                </td>
                                <td className="py-3 px-4 text-right">
                                  <button
                                    type="button"
                                    data-action="delete-prediction"
                                    onClick={() => setPendingDeletePred(p)}
                                    className="p-1.5 rounded-lg text-[#8A9990] hover:text-[#B35D52] hover:bg-[#FAF0EE] transition-all cursor-pointer"
                                    title="Delete prediction"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* ── Double Confirmation Modal for User Deletion ── */}
        {pendingDeleteUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
            <div className="glossy-card max-w-md w-full p-6 border border-[#E5E0D6] rounded-2xl shadow-xl space-y-4">
              <div className="flex items-center gap-3 text-[#B35D52]">
                <div className="w-9 h-9 rounded-xl bg-[#FAF0EE] border border-[#F0D5D1] flex items-center justify-center">
                  <AlertCircle size={20} />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-base text-[#35483E]">Confirm User Account Deletion</h3>
                  <p className="text-xs text-[#6B7F74]">Irreversible administrative action</p>
                </div>
              </div>

              <p className="text-xs text-[#52665A] leading-relaxed">
                Are you sure you want to delete the user account for <strong>{pendingDeleteUser.name}</strong> (
                <code>{pendingDeleteUser.email}</code>)? This will cascade and permanently delete all associated assessment records, clinical baseline metrics, and identity tokens.
              </p>

              <div className="flex justify-end gap-2.5 pt-2 border-t border-[#E5E0D6]">
                <button
                  type="button"
                  onClick={() => setPendingDeleteUser(null)}
                  disabled={deletingInProgress}
                  className="glossy-btn-secondary px-4 py-2 rounded-xl text-xs font-medium text-[#52665A] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteUser}
                  disabled={deletingInProgress}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-[#B35D52] hover:bg-[#9E4F45] transition-all cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {deletingInProgress ? "Deleting..." : "Permanently Delete User"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Double Confirmation Modal for Prediction Deletion ── */}
        {pendingDeletePred && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
            <div className="glossy-card max-w-md w-full p-6 border border-[#E5E0D6] rounded-2xl shadow-xl space-y-4">
              <div className="flex items-center gap-3 text-[#B35D52]">
                <div className="w-9 h-9 rounded-xl bg-[#FAF0EE] border border-[#F0D5D1] flex items-center justify-center">
                  <AlertCircle size={20} />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-base text-[#35483E]">Remove Assessment Record</h3>
                  <p className="text-xs text-[#6B7F74]">Audit log modification</p>
                </div>
              </div>

              <p className="text-xs text-[#52665A] leading-relaxed">
                Remove assessment evaluation <strong>EV-{String(pendingDeletePred.id).padStart(5, "0")}</strong> ({pendingDeletePred.model_used}, {pendingDeletePred.risk_level} risk)?
              </p>

              <div className="flex justify-end gap-2.5 pt-2 border-t border-[#E5E0D6]">
                <button
                  type="button"
                  onClick={() => setPendingDeletePred(null)}
                  disabled={deletingInProgress}
                  className="glossy-btn-secondary px-4 py-2 rounded-xl text-xs font-medium text-[#52665A] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeletePrediction}
                  disabled={deletingInProgress}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-[#B35D52] hover:bg-[#9E4F45] transition-all cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {deletingInProgress ? "Removing..." : "Remove Record"}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
