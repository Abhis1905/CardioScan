import React, { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Database,
  Activity,
  Search,
  Filter,
  AlertTriangle,
  Info,
  ShieldAlert,
  ArrowRight,
  Layers,
  ChevronDown,
  ChevronUp,
  FileText,
  BarChart2,
  RefreshCw,
  GitBranch,
  X,
  SlidersHorizontal,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useTheme } from "../context/ThemeContext";
import ECGBackground from "../components/ECGBackground";
import { getDatasetStats } from "../api";

export default function DataPage() {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const isDark = Boolean(theme?.dark);
  const isRTL = i18n.language === "ar";

  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [expandedFeature, setExpandedFeature] = useState(null);
  const [activeTab, setActiveTab] = useState("table"); // "table" | "cards"

  const fetchData = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await getDatasetStats();
      setStats(res.data);
    } catch (err) {
      console.error("Failed to load dataset statistics:", err);
      setLoadError(err?.response?.data?.detail || err?.message || "Failed to load dataset statistics.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filter features
  const filteredFeatures = useMemo(() => {
    if (!stats?.features_metadata) return [];
    return stats.features_metadata.filter((f) => {
      const matchesCategory =
        selectedCategory === "all" || f.category.toLowerCase() === selectedCategory.toLowerCase();
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        f.key.toLowerCase().includes(q) ||
        f.name.toLowerCase().includes(q) ||
        (f.description && f.description.toLowerCase().includes(q)) ||
        (f.clinical_relevance && f.clinical_relevance.toLowerCase().includes(q));
      return matchesCategory && matchesSearch;
    });
  }, [stats?.features_metadata, selectedCategory, searchQuery]);

  const categories = useMemo(() => {
    if (!stats?.features_metadata) return ["all"];
    const cats = new Set(stats.features_metadata.map((f) => f.category));
    return ["all", ...Array.from(cats)];
  }, [stats?.features_metadata]);

  // Loading skeleton
  if (loading) {
    return (
      <div className="w-full min-h-[calc(100vh-4rem)] bg-[#F7F5F0] dark:bg-[#17191B] text-[#35483E] dark:text-[#F2F3F3] py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-8 animate-pulse">
          <div className="space-y-3">
            <div className="h-4 w-48 bg-black/5 rounded" />
            <div className="h-10 w-96 bg-black/10 rounded" />
            <div className="h-4 w-2/3 bg-black/5 rounded" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-28 bg-white/70 border border-[#E5E0D6] rounded-2xl" />
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="h-64 bg-white/70 border border-[#E5E0D6] rounded-2xl" />
            <div className="h-64 bg-white/70 border border-[#E5E0D6] rounded-2xl" />
          </div>
          <div className="h-96 bg-white/70 border border-[#E5E0D6] rounded-2xl" />
        </div>
      </div>
    );
  }

  // Error fallback
  if (loadError || !stats) {
    return (
      <div className="w-full min-h-[calc(100vh-4rem)] bg-[#F7F5F0] text-[#35483E] flex items-center justify-center py-20 px-4">
        <div className="max-w-md w-full bg-white/95 border border-[#E5E0D6] rounded-2xl p-8 text-center space-y-4 shadow-sm">
          <div className="w-12 h-12 rounded-full bg-[#FAF0EE] text-[#B35D52] flex items-center justify-center mx-auto">
            <AlertTriangle size={24} />
          </div>
          <h2 className="font-serif text-xl font-bold text-[#35483E]">Dataset Service Unavailable</h2>
          <p className="text-xs sm:text-sm text-[#52665A]">
            {loadError || "Could not retrieve dataset metadata and audit figures from CardioScan backend."}
          </p>
          <button
            onClick={fetchData}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#35483E] text-white text-xs font-semibold hover:bg-[#2D3F36] transition-colors shadow-xs"
          >
            <RefreshCw size={14} />
            <span>Retry Connection</span>
          </button>
        </div>
      </div>
    );
  }

  const { audit, provenance, target_breakdown, quality_status, features_metadata } = stats;
  const rawRows = audit?.total_raw_rows || stats.shape[0];
  const uniqueRows = audit?.total_unique_rows || 302;
  const duplicateRows = audit?.duplicate_rows || 723;
  const duplicatePct = audit?.duplicate_pct || 70.54;

  const rawPos = target_breakdown?.raw?.["1"]?.count || stats.target_distribution[1] || 526;
  const rawNeg = target_breakdown?.raw?.["0"]?.count || stats.target_distribution[0] || 499;
  const rawPosPct = target_breakdown?.raw?.["1"]?.pct || ((rawPos / rawRows) * 100).toFixed(1);
  const rawNegPct = target_breakdown?.raw?.["0"]?.pct || ((rawNeg / rawRows) * 100).toFixed(1);

  const uniqPos = target_breakdown?.unique?.["1"]?.count || 164;
  const uniqNeg = target_breakdown?.unique?.["0"]?.count || 138;
  const uniqPosPct = target_breakdown?.unique?.["1"]?.pct || ((uniqPos / uniqueRows) * 100).toFixed(1);
  const uniqNegPct = target_breakdown?.unique?.["0"]?.pct || ((uniqNeg / uniqueRows) * 100).toFixed(1);

  return (
    <div
      className="w-full min-h-[calc(100vh-4rem)] relative selection:bg-[#E4EDE5] selection:text-[#35483E] transition-colors duration-300 bg-[#F7F5F0] dark:bg-[#17191B] text-[#35483E] dark:text-[#F2F3F3]"
      dir={isRTL ? "rtl" : "ltr"}
    >
      <ECGBackground />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-10 relative z-10">
        {/* ── Page Header ── */}
        <header className="space-y-3 scroll-mt-24">
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-[#52665A]">
            <div className="w-1.5 h-1.5 rounded-full bg-[#B35D52] animate-pulse" />
            <span>
              {t("data_page.badge", "Cardiovascular Machine Learning · Dataset Provenance & Methodology")}
            </span>
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-normal text-[#35483E] tracking-tight leading-tight">
            {t("data_page.title_main", "Clinical Dataset Architecture &")}{" "}
            <span className="italic font-serif text-[#B35D52]">
              {t("data_page.title_accent", "Provenance Audit")}
            </span>
          </h1>
          <p className="text-[#52665A] max-w-3xl text-xs sm:text-sm leading-relaxed">
            {t(
              "data_page.subtitle",
              "Explore verified statistics, data provenance, deduplication integrity, and clinical feature definitions for the 13 physiological parameters supporting CardioScan's candidate machine learning classifiers."
            )}
          </p>
        </header>

        {/* ── Healthcare Research Notice & Privacy Banner ── */}
        <section
          aria-label="Research & Educational Cohort Notice"
          className="rounded-2xl bg-[#E4EDE5]/90 dark:bg-[#202326] border border-[#D3DFD5] dark:border-[#373C40] p-5 sm:p-6 text-[#35483E] dark:text-[#F2F3F3] shadow-2xs"
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-[#35483E] dark:bg-[#282C30] text-white flex items-center justify-center shrink-0 shadow-2xs border border-transparent dark:border-[#373C40]">
              <ShieldAlert size={20} className="text-[#D9A19A]" />
            </div>
            <div className="space-y-1 flex-1">
              <h2 className="text-sm font-semibold tracking-wide text-[#35483E] dark:text-[#F2F3F3]">
                {t(
                  "data_page.privacy_banner_title",
                  "Research & Educational Cohort Notice: Strict Privacy & De-Identification"
                )}
              </h2>
              <p className="text-xs sm:text-sm text-[#52665A] dark:text-[#B2B7BB] leading-relaxed">
                {t(
                  "data_page.privacy_banner_desc",
                  "CardioScan operates exclusively on historical, de-identified academic research data originating from the 1988 Cleveland Clinic Foundation study. To safeguard patient privacy and prevent misuse as an Electronic Health Record (EHR), patient-level records are not browsable or downloadable. Statistical aggregations shown here reflect research cohorts and do not constitute clinical diagnosis or medical device clearance."
                )}
              </p>
            </div>
          </div>
        </section>

        {/* ── SECTION A: Verified Dataset Overview (KPI Cards) ── */}
        <section aria-label="Dataset Key Metrics" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-mono uppercase tracking-widest text-[#52665A]">
              {t("data_page.kpi_section_title", "Verified Dataset Profile & Cohort Integrity")}
            </h2>
            <span className="text-[11px] font-mono text-[#8A9990]">
              {provenance?.collection_year ? `Origin: ${provenance.collection_year}` : "Origin: 1988"}
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5 sm:gap-4">
            {/* KPI 1: Raw Records */}
            <div className="rounded-2xl p-4 sm:p-5 bg-white/90 border border-[#E5E0D6] shadow-2xs hover:shadow-xs transition-shadow">
              <span className="text-xs text-[#52665A] font-medium block mb-1">
                {t("data_page.kpi_raw_rows", "Raw Compilation")}
              </span>
              <p className="font-serif text-2xl sm:text-3xl font-bold text-[#35483E] tracking-tight">
                {rawRows.toLocaleString()}
              </p>
              <p className="text-[11px] text-[#8A9990] mt-1">
                {t("data_page.kpi_raw_rows_sub", "Total records in Kaggle source file")}
              </p>
            </div>

            {/* KPI 2: Unique Patients */}
            <div className="rounded-2xl p-4 sm:p-5 bg-white/90 border border-[#E5E0D6] shadow-2xs hover:shadow-xs transition-shadow">
              <span className="text-xs text-[#52665A] font-medium block mb-1">
                {t("data_page.kpi_unique_rows", "Unique Patients")}
              </span>
              <p className="font-serif text-2xl sm:text-3xl font-bold text-[#2D7A58] tracking-tight">
                {uniqueRows.toLocaleString()}
              </p>
              <p className="text-[11px] text-[#8A9990] mt-1">
                {t("data_page.kpi_unique_rows_sub", "Verified distinct clinical observations")}
              </p>
            </div>

            {/* KPI 3: Duplicate Rows */}
            <div className="rounded-2xl p-4 sm:p-5 bg-white/90 border border-[#E5E0D6] shadow-2xs hover:shadow-xs transition-shadow">
              <span className="text-xs text-[#52665A] font-medium block mb-1">
                {t("data_page.kpi_dupes", "Duplicate Copies")}
              </span>
              <p className="font-serif text-2xl sm:text-3xl font-bold text-[#B35D52] tracking-tight">
                {duplicateRows}
                <span className="text-sm font-normal text-[#B35D52]/80 ml-1">({duplicatePct}%)</span>
              </p>
              <p className="text-[11px] text-[#8A9990] mt-1">
                {t("data_page.kpi_dupes_sub", "Systematic multi-copy replication")}
              </p>
            </div>

            {/* KPI 4: Features */}
            <div className="rounded-2xl p-4 sm:p-5 bg-white/90 border border-[#E5E0D6] shadow-2xs hover:shadow-xs transition-shadow">
              <span className="text-xs text-[#52665A] font-medium block mb-1">
                {t("data_page.kpi_features", "Clinical Predictors")}
              </span>
              <p className="font-serif text-2xl sm:text-3xl font-bold text-[#35483E] tracking-tight">
                {features_metadata?.length || 13}
              </p>
              <p className="text-[11px] text-[#8A9990] mt-1">
                {t("data_page.kpi_features_sub", "Hemodynamics, labs, and stress ECG")}
              </p>
            </div>

            {/* KPI 5: Target Variable */}
            <div className="rounded-2xl p-4 sm:p-5 bg-white/90 border border-[#E5E0D6] shadow-2xs hover:shadow-xs transition-shadow">
              <span className="text-xs text-[#52665A] font-medium block mb-1">
                {t("data_page.kpi_target", "Target Diagnosis")}
              </span>
              <p className="font-serif text-xl sm:text-2xl font-bold text-[#35483E] tracking-tight">
                CAD (≥50%)
              </p>
              <p className="text-[11px] text-[#8A9990] mt-1">
                {t("data_page.kpi_target_sub", "Angiographic arterial narrowing")}
              </p>
            </div>

            {/* KPI 6: Unique Prevalence */}
            <div className="rounded-2xl p-4 sm:p-5 bg-white/90 border border-[#E5E0D6] shadow-2xs hover:shadow-xs transition-shadow">
              <span className="text-xs text-[#52665A] font-medium block mb-1">
                {t("data_page.kpi_prevalence", "Cohort Prevalence")}
              </span>
              <p className="font-serif text-2xl sm:text-3xl font-bold text-[#35483E] tracking-tight">
                {uniqPosPct}%
              </p>
              <p className="text-[11px] text-[#8A9990] mt-1">
                {t("data_page.kpi_prevalence_sub", `${uniqPos} positive / ${uniqNeg} negative`)}
              </p>
            </div>
          </div>
        </section>

        {/* ── Provenance & Data Quality Status (2 Cards) ── */}
        <section aria-label="Provenance and Quality" className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Card 1: Provenance */}
          <div className="rounded-2xl p-6 bg-white/90 border border-[#E5E0D6] shadow-2xs space-y-4">
            <div className="flex items-center gap-2.5 pb-2 border-b border-[#E5E0D6]">
              <Database size={18} className="text-[#35483E]" />
              <h3 className="font-serif text-lg font-bold text-[#35483E]">
                {t("data_page.provenance_card_title", "Dataset Source & Clinical Provenance")}
              </h3>
            </div>
            <dl className="space-y-3 text-xs sm:text-sm">
              <div className="flex flex-col sm:flex-row sm:justify-between py-1 border-b border-[#F0EBE1]">
                <dt className="text-[#52665A] font-medium">Dataset Origin</dt>
                <dd className="font-semibold text-[#35483E] sm:text-right">
                  {provenance?.dataset_name || "UCI Cleveland Heart Disease Study"}
                </dd>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between py-1 border-b border-[#F0EBE1]">
                <dt className="text-[#52665A] font-medium">Principal Investigators</dt>
                <dd className="text-[#35483E] sm:text-right">
                  Robert Detrano, M.D., Ph.D. et al. (1988)
                </dd>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between py-1 border-b border-[#F0EBE1]">
                <dt className="text-[#52665A] font-medium">Clinical Institution</dt>
                <dd className="text-[#35483E] sm:text-right">
                  Cleveland Clinic Foundation & V.A. Medical Center, Long Beach
                </dd>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between py-1 border-b border-[#F0EBE1]">
                <dt className="text-[#52665A] font-medium">Distribution Source</dt>
                <dd className="text-[#35483E] sm:text-right">
                  UCI ML Repository (via 1,025-row Kaggle synthetic replication)
                </dd>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between py-1">
                <dt className="text-[#52665A] font-medium">Target Ground Truth</dt>
                <dd className="text-[#35483E] sm:text-right font-medium">
                  Selective coronary catheterization (≥ 50% diameter reduction)
                </dd>
              </div>
            </dl>
          </div>

          {/* Card 2: Data Quality Status */}
          <div className="rounded-2xl p-6 bg-white/90 border border-[#E5E0D6] shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#E5E0D6]">
              <div className="flex items-center gap-2.5">
                <Activity size={18} className="text-[#B35D52]" />
                <h3 className="font-serif text-lg font-bold text-[#35483E]">
                  {t("data_page.quality_card_title", "Scientific Quality Audit Status")}
                </h3>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#FAF0EE] text-[#B35D52] border border-[#F0D5D1]">
                Audit Disclosed
              </span>
            </div>

            <div className="space-y-3 text-xs sm:text-sm">
              <div className="p-3 rounded-xl bg-[#FAF9F5] border border-[#E5E0D6] space-y-1">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#35483E]">
                  <GitBranch size={14} className="text-[#B35D52]" />
                  <span>Exact Duplicate Records (70.5%)</span>
                </div>
                <p className="text-xs text-[#52665A]">
                  723 rows are exact multi-copy clones of the 302 unique patients. Un-deduplicated splits cause severe 97.1% test data leakage.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-[#FAF9F5] border border-[#E5E0D6] space-y-1">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#35483E]">
                  <AlertTriangle size={14} className="text-[#B35D52]" />
                  <span>Historical Missingness Sentinels</span>
                </div>
                <p className="text-xs text-[#52665A]">
                  Zero null cells, but historical non-standard missing codes exist: <code className="bg-black/5 px-1 py-0.5 rounded font-mono">ca=4</code> (4 unique records) and <code className="bg-black/5 px-1 py-0.5 rounded font-mono">thal=0</code> (2 unique records).
                </p>
              </div>

              <div className="p-3 rounded-xl bg-[#FAF9F5] border border-[#E5E0D6] space-y-1">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#35483E]">
                  <Info size={14} className="text-[#52665A]" />
                  <span>Referral Spectrum & Demographic Bias</span>
                </div>
                <p className="text-xs text-[#52665A]">
                  68.2% male cohort of symptomatic hospital referrals. Disease prevalence (54.3%) cannot be generalized to asymptomatic community populations.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── SECTION B: Interactive Feature Explorer ── */}
        <section aria-label="Feature Explorer" className="rounded-2xl p-6 bg-white/90 border border-[#E5E0D6] shadow-2xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E5E0D6]">
            <div>
              <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-[#52665A] mb-1">
                <Layers size={13} />
                <span>Feature Schema & Biological Definitions</span>
              </div>
              <h3 className="font-serif text-2xl font-bold text-[#35483E]">
                Clinical Predictor Catalog ({filteredFeatures.length} / {features_metadata?.length || 13})
              </h3>
            </div>

            {/* View switcher */}
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setActiveTab("table")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  activeTab === "table"
                    ? "bg-[#35483E] text-white dark:bg-[#789580] dark:text-[#17191B] font-semibold"
                    : "bg-[#F7F5F0] dark:bg-[#282C30] text-[#52665A] dark:text-[#B2B7BB] hover:bg-[#E5E0D6] dark:hover:bg-[#32373C] hover:text-[#35483E] dark:hover:text-[#F2F3F3]"
                }`}
              >
                Table View
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("cards")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  activeTab === "cards"
                    ? "bg-[#35483E] text-white dark:bg-[#789580] dark:text-[#17191B] font-semibold"
                    : "bg-[#F7F5F0] dark:bg-[#282C30] text-[#52665A] dark:text-[#B2B7BB] hover:bg-[#E5E0D6] dark:hover:bg-[#32373C] hover:text-[#35483E] dark:hover:text-[#F2F3F3]"
                }`}
              >
                Detailed Cards
              </button>
            </div>
          </div>

          {/* Search & Filters */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8A9990] dark:text-[#8C9399]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by feature name, abbreviation (e.g. thalach, oldpeak), or clinical description..."
                className="w-full pl-10 pr-9 py-2 rounded-xl border border-[#E5E0D6] dark:border-[#373C40] bg-[#F7F5F0]/60 dark:bg-[#17191B] text-xs sm:text-sm text-[#35483E] dark:text-[#F2F3F3] placeholder-[#8A9990] dark:placeholder-[#8C9399] focus:outline-none focus:ring-2 focus:ring-[#35483E]/20 dark:focus:ring-[#789580]/30 focus:border-[#35483E] dark:focus:border-[#789580] transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8A9990] hover:text-[#35483E] dark:text-[#8C9399] dark:hover:text-[#F2F3F3]"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
              <SlidersHorizontal size={14} className="text-[#8A9990] dark:text-[#8C9399] shrink-0 mr-1 hidden sm:block" />
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize shrink-0 transition-all ${
                    selectedCategory === cat
                      ? "bg-[#35483E] text-white dark:bg-[#789580] dark:text-[#17191B] shadow-2xs font-semibold"
                      : "bg-[#F7F5F0] dark:bg-[#282C30] text-[#52665A] dark:text-[#B2B7BB] border border-transparent dark:border-[#373C40] hover:bg-[#E4EDE5] dark:hover:bg-[#32373C] hover:text-[#35483E] dark:hover:text-[#F2F3F3]"
                  }`}
                >
                  {cat === "all" ? "All Categories" : cat}
                </button>
              ))}
            </div>
          </div>

          {/* Table View */}
          {activeTab === "table" ? (
            <div className="overflow-x-auto rounded-xl border border-[#E5E0D6] dark:border-[#373C40]">
              <table className="w-full text-left text-xs sm:text-sm border-collapse">
                <thead>
                  <tr className="bg-[#F7F5F0] dark:bg-[#282C30] border-b border-[#E5E0D6] dark:border-[#373C40] text-[#52665A] dark:text-[#B2B7BB] font-semibold">
                    <th className="py-3 px-4">Feature & Code</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Data Type & Unit</th>
                    <th className="py-3 px-4">Valid Range</th>
                    <th className="py-3 px-4">Cohort Stats (Unique N=302)</th>
                    <th className="py-3 px-4 text-center">Linear Correlation (r)</th>
                    <th className="py-3 px-4 text-right">Missingness</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E0D6]/70 dark:divide-[#373C40]">
                  {filteredFeatures.map((f) => {
                    const isPositive = f.corr_unique > 0;
                    return (
                      <tr
                        key={f.key}
                        className="hover:bg-[#F7F5F0]/60 dark:hover:bg-[#282C30]/50 transition-colors cursor-pointer"
                        onClick={() => setExpandedFeature(expandedFeature === f.key ? null : f.key)}
                      >
                        <td className="py-3 px-4">
                          <div className="font-semibold text-[#35483E] dark:text-[#F2F3F3]">{f.name}</div>
                          <code className="text-[11px] font-mono text-[#52665A] dark:text-[#B2B7BB] bg-black/5 dark:bg-[#17191B] px-1.5 py-0.5 rounded">
                            {f.key}
                          </code>
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-block px-2 py-0.5 rounded-md text-[11px] font-medium bg-[#E4EDE5] dark:bg-[#282C30] text-[#35483E] dark:text-[#F2F3F3] border border-transparent dark:border-[#373C40]">
                            {f.category}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-[#52665A] dark:text-[#B2B7BB]">
                          <div>{f.data_type}</div>
                          {f.unit && <div className="text-[11px] font-mono text-[#8A9990] dark:text-[#8C9399]">{f.unit}</div>}
                        </td>
                        <td className="py-3 px-4 font-mono text-xs text-[#35483E] dark:text-[#F2F3F3]">
                          {f.valid_range_documented}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-mono text-xs text-[#35483E] dark:text-[#F2F3F3]">
                            {f.data_type.includes("Continuous") || f.data_type.includes("Integer") ? (
                              <span>
                                {f.mean_unique} ± {f.std_unique}
                              </span>
                            ) : (
                              <span className="text-[#52665A] dark:text-[#B2B7BB] italic">Discrete Levels</span>
                            )}
                          </div>
                          <div className="text-[11px] text-[#8A9990] dark:text-[#8C9399]">
                            Range: [{f.min_observed} – {f.max_observed}]
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`inline-block font-mono font-semibold px-2 py-0.5 rounded text-xs ${
                              isPositive
                                ? "bg-[#FAF0EE] dark:bg-[#261B1A] text-[#B35D52] dark:text-[#E08A80] border border-transparent dark:border-[#4A2D2A]"
                                : "bg-[#EBF3ED] dark:bg-[#1D2923] text-[#2D7A58] dark:text-[#789580] border border-transparent dark:border-[#2D4536]"
                            }`}
                          >
                            {f.corr_unique > 0 ? `+${f.corr_unique.toFixed(3)}` : f.corr_unique.toFixed(3)}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          {f.missing_count_unique > 0 ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#B35D52] dark:text-[#E08A80] bg-[#FAF0EE] dark:bg-[#261B1A] px-2 py-0.5 rounded-md border border-transparent dark:border-[#4A2D2A]">
                              <AlertTriangle size={11} />
                              <span>{f.missing_count_unique} sentinel ({f.missing_pct_unique}%)</span>
                            </span>
                          ) : (
                            <span className="text-[11px] text-[#2D7A58] dark:text-[#789580] font-medium">0 nulls</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            /* Cards View */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredFeatures.map((f) => {
                const isPositive = f.corr_unique > 0;
                const isExp = expandedFeature === f.key;
                return (
                  <div
                    key={f.key}
                    className="rounded-xl p-5 border border-[#E5E0D6] dark:border-[#373C40] bg-[#F7F5F0]/40 dark:bg-[#202326] hover:bg-[#F7F5F0] dark:hover:bg-[#282C30] transition-colors space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-serif font-bold text-base text-[#35483E] dark:text-[#F2F3F3]">{f.name}</h4>
                          <code className="text-xs font-mono text-[#52665A] dark:text-[#B2B7BB] bg-black/5 dark:bg-[#17191B] px-1.5 py-0.5 rounded">
                            {f.key}
                          </code>
                        </div>
                        <span className="inline-block mt-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-[#E4EDE5] dark:bg-[#282C30] text-[#35483E] dark:text-[#F2F3F3] border border-transparent dark:border-[#373C40]">
                          {f.category}
                        </span>
                      </div>
                      <span
                        className={`font-mono font-bold text-xs px-2.5 py-1 rounded-md ${
                          isPositive
                            ? "bg-[#FAF0EE] dark:bg-[#261B1A] text-[#B35D52] dark:text-[#E08A80] border border-transparent dark:border-[#4A2D2A]"
                            : "bg-[#EBF3ED] dark:bg-[#1D2923] text-[#2D7A58] dark:text-[#789580] border border-transparent dark:border-[#2D4536]"
                        }`}
                      >
                        r = {f.corr_unique > 0 ? `+${f.corr_unique.toFixed(3)}` : f.corr_unique.toFixed(3)}
                      </span>
                    </div>

                    <p className="text-xs text-[#52665A] dark:text-[#B2B7BB] leading-relaxed">{f.description}</p>

                    <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-[#E5E0D6] dark:border-[#373C40]">
                      <div>
                        <span className="text-[#8A9990] dark:text-[#8C9399] block text-[11px]">Type & Unit:</span>
                        <span className="font-medium text-[#35483E] dark:text-[#F2F3F3]">
                          {f.data_type} {f.unit ? `(${f.unit})` : ""}
                        </span>
                      </div>
                      <div>
                        <span className="text-[#8A9990] dark:text-[#8C9399] block text-[11px]">Observed Range:</span>
                        <span className="font-mono text-[#35483E] dark:text-[#F2F3F3]">
                          {f.min_observed} – {f.max_observed}
                        </span>
                      </div>
                    </div>

                    {/* Expand button for categories */}
                    {f.categories && (
                      <button
                        type="button"
                        onClick={() => setExpandedFeature(isExp ? null : f.key)}
                        className="inline-flex items-center gap-1 text-xs font-medium text-[#35483E] dark:text-[#789580] hover:text-[#B35D52] dark:hover:text-[#8BA792] pt-1 transition-colors"
                      >
                        <span>{isExp ? "Hide Level Definitions" : "View Discrete Level Definitions"}</span>
                        {isExp ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                    )}

                    {isExp && f.categories && (
                      <div className="mt-2 p-3 rounded-lg bg-white dark:bg-[#17191B] border border-[#E5E0D6] dark:border-[#373C40] space-y-1.5 text-xs">
                        <span className="text-[11px] font-mono text-[#8A9990] dark:text-[#8C9399] block mb-1">
                          DISCRETE ENCODING DICTIONARY:
                        </span>
                        {Object.entries(f.categories).map(([k, v]) => (
                          <div key={k} className="flex items-start gap-2">
                            <code className="font-mono font-bold text-[#35483E] dark:text-[#F2F3F3] bg-black/5 dark:bg-[#282C30] px-1 py-0.5 rounded">
                              {k}
                            </code>
                            <span className="text-[#52665A] dark:text-[#B2B7BB]">{v}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ── SECTION C: Dataset Quality & Duplication Analysis ── */}
        <section aria-label="Duplication and Quality Audit" className="rounded-2xl p-6 bg-white/90 border border-[#E5E0D6] shadow-2xs space-y-6">
          <div className="flex items-center gap-2.5 pb-2 border-b border-[#E5E0D6]">
            <GitBranch size={20} className="text-[#B35D52]" />
            <div>
              <h3 className="font-serif text-xl font-bold text-[#35483E]">
                {t("data_page.dupe_title", "Duplication Frequency Audit & Data Leakage Analysis")}
              </h3>
              <p className="text-xs text-[#52665A]">
                Investigating row replication structure and its impact on model generalization benchmarks.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Duplication Frequency Distribution */}
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-[#35483E] uppercase tracking-wide">
                Patient Replication Breakdown
              </h4>
              <p className="text-xs text-[#52665A] leading-relaxed">
                Analysis of <code className="font-mono bg-black/5 px-1 rounded">backend/heart.csv</code> confirms that all 1,025 rows represent repeated copies of exactly 302 unique patients. Not a single row appears only once:
              </p>

              <div className="space-y-2.5">
                <div className="p-3.5 rounded-xl bg-[#F7F5F0] border border-[#E5E0D6] flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-xs text-[#35483E]">187 Unique Patients</span>
                    <p className="text-[11px] text-[#52665A]">Cloned exactly 3 times each</p>
                  </div>
                  <span className="font-mono font-bold text-sm text-[#35483E]">561 rows (54.7%)</span>
                </div>

                <div className="p-3.5 rounded-xl bg-[#F7F5F0] border border-[#E5E0D6] flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-xs text-[#35483E]">114 Unique Patients</span>
                    <p className="text-[11px] text-[#52665A]">Cloned exactly 4 times each</p>
                  </div>
                  <span className="font-mono font-bold text-sm text-[#35483E]">456 rows (44.5%)</span>
                </div>

                <div className="p-3.5 rounded-xl bg-[#F7F5F0] border border-[#E5E0D6] flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-xs text-[#35483E]">1 Unique Patient (Age 38, Male)</span>
                    <p className="text-[11px] text-[#52665A]">Cloned 8 times</p>
                  </div>
                  <span className="font-mono font-bold text-sm text-[#35483E]">8 rows (0.8%)</span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#E4EDE5]/60 border border-[#D3DFD5] text-xs text-[#35483E] leading-relaxed">
                <strong>Empirical Deduplication Proof:</strong> In the deduplicated set of 302 rows, zero rows share the same combination of (age, sex, resting BP, cholesterol). This demonstrates systematic synthetic replication rather than natural coincidental patients.
              </div>
            </div>

            {/* Test Leakage & Evaluation Impact */}
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-[#35483E] uppercase tracking-wide">
                Evaluation Leakage in Standard Splits
              </h4>
              <p className="text-xs text-[#52665A] leading-relaxed">
                When machine learning practitioners split <code className="font-mono bg-black/5 px-1 rounded">heart.csv</code> using standard random 80/20 train/test partitioning without deduplication:
              </p>

              <div className="p-4 rounded-xl bg-[#FAF0EE] border border-[#F0D5D1] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#B35D52]">Held-Out Test Partition (N=205)</span>
                  <span className="font-mono font-bold text-sm text-[#B35D52]">97.1% Leaked</span>
                </div>
                <div className="h-2 rounded-full bg-[#F0D5D1] overflow-hidden">
                  <div className="h-full rounded-full bg-[#B35D52]" style={{ width: "97.1%" }} />
                </div>
                <p className="text-xs text-[#52665A] leading-relaxed">
                  <strong>199 out of 205 test samples</strong> are identical copies of rows present in the training partition. Only <strong>2 unique patients (6 samples)</strong> were genuinely unseen by the model!
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-[#F7F5F0] border border-[#E5E0D6] text-xs text-[#52665A] leading-relaxed space-y-2">
                <div className="font-semibold text-[#35483E]">Scientific Rectification:</div>
                <p>
                  This massive overlap allowed deep decision tree models (Random Forest) to achieve an artificial 98.5% accuracy and an AUC of 1.000. Under CardioScan's <strong>Zero-Leakage 5-Fold Cross-Validation</strong> on the 302 unique patients, true generalization is approximately <strong>82.5%</strong> across all models.
                </p>
                <Link
                  to="/metrics"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#35483E] hover:text-[#B35D52] pt-1"
                >
                  <span>Review Cross-Validation Benchmarks on Metrics Page</span>
                  <ArrowRight size={13} />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ── SECTION D: Target Variable & Class Distribution ── */}
        <section aria-label="Class Distribution" className="rounded-2xl p-6 bg-white/90 border border-[#E5E0D6] shadow-2xs space-y-6">
          <div className="flex items-center gap-2.5 pb-2 border-b border-[#E5E0D6]">
            <Activity size={20} className="text-[#35483E]" />
            <div>
              <h3 className="font-serif text-xl font-bold text-[#35483E]">
                {t("data_page.target_title", "Target Diagnosis Definition & Class Distribution")}
              </h3>
              <p className="text-xs text-[#52665A]">
                Evaluating label balance in raw versus deduplicated patient cohorts.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Raw Dataset Distribution */}
            <div className="p-5 rounded-xl bg-[#F7F5F0]/60 dark:bg-[#202326] border border-[#E5E0D6] dark:border-[#373C40] space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-serif font-bold text-base text-[#35483E] dark:text-[#F2F3F3]">
                  Raw Compilation (N = {rawRows})
                </span>
                <span className="text-xs font-mono text-[#52665A] dark:text-[#B2B7BB]">Kaggle File Distribution</span>
              </div>

              {/* Progress bar */}
              <div className="h-6 rounded-xl bg-black/5 dark:bg-black/30 overflow-hidden flex border border-[#E5E0D6] dark:border-[#373C40]">
                <div
                  className="bg-[#2D7A58] h-full flex items-center justify-center text-[11px] font-mono font-bold text-white transition-all"
                  style={{ width: `${rawNegPct}%` }}
                  title={`Healthy: ${rawNeg} (${rawNegPct}%)`}
                >
                  {rawNegPct}%
                </div>
                <div
                  className="bg-[#B35D52] h-full flex items-center justify-center text-[11px] font-mono font-bold text-white transition-all"
                  style={{ width: `${rawPosPct}%` }}
                  title={`Heart Disease: ${rawPos} (${rawPosPct}%)`}
                >
                  {rawPosPct}%
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-lg bg-white dark:bg-[#282C30] border border-[#E5E0D6] dark:border-[#373C40]">
                  <div className="flex items-center gap-1.5 text-[#2D7A58] dark:text-[#5EAD81] font-semibold mb-1">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#2D7A58] dark:bg-[#5EAD81]" />
                    <span>Absence of CAD (0)</span>
                  </div>
                  <p className="font-mono text-sm font-bold text-[#35483E] dark:text-[#F2F3F3]">{rawNeg} patients</p>
                  <p className="text-[11px] text-[#8A9990] dark:text-[#8C9399]">&lt; 50% stenosis on angiogram</p>
                </div>
                <div className="p-3 rounded-lg bg-white dark:bg-[#282C30] border border-[#E5E0D6] dark:border-[#373C40]">
                  <div className="flex items-center gap-1.5 text-[#B35D52] dark:text-[#E08A80] font-semibold mb-1">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#B35D52] dark:bg-[#E08A80]" />
                    <span>Presence of CAD (1)</span>
                  </div>
                  <p className="font-mono text-sm font-bold text-[#35483E] dark:text-[#F2F3F3]">{rawPos} patients</p>
                  <p className="text-[11px] text-[#8A9990] dark:text-[#8C9399]">≥ 50% stenosis on angiogram</p>
                </div>
              </div>
            </div>

            {/* Deduplicated Cohort Distribution */}
            <div className="p-5 rounded-xl bg-[#F7F5F0]/60 dark:bg-[#202326] border border-[#E5E0D6] dark:border-[#373C40] space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-serif font-bold text-base text-[#35483E] dark:text-[#F2F3F3]">
                  Unique Patients (N = {uniqueRows})
                </span>
                <span className="text-xs font-mono text-[#2D7A58] dark:text-[#5EAD81] font-semibold">True Clinical Cohort</span>
              </div>

              {/* Progress bar */}
              <div className="h-6 rounded-xl bg-black/5 dark:bg-black/30 overflow-hidden flex border border-[#E5E0D6] dark:border-[#373C40]">
                <div
                  className="bg-[#2D7A58] h-full flex items-center justify-center text-[11px] font-mono font-bold text-white transition-all"
                  style={{ width: `${uniqNegPct}%` }}
                  title={`Healthy: ${uniqNeg} (${uniqNegPct}%)`}
                >
                  {uniqNegPct}%
                </div>
                <div
                  className="bg-[#B35D52] h-full flex items-center justify-center text-[11px] font-mono font-bold text-white transition-all"
                  style={{ width: `${uniqPosPct}%` }}
                  title={`Heart Disease: ${uniqPos} (${uniqPosPct}%)`}
                >
                  {uniqPosPct}%
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-lg bg-white dark:bg-[#282C30] border border-[#E5E0D6] dark:border-[#373C40]">
                  <div className="flex items-center gap-1.5 text-[#2D7A58] dark:text-[#5EAD81] font-semibold mb-1">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#2D7A58] dark:bg-[#5EAD81]" />
                    <span>Absence of CAD (0)</span>
                  </div>
                  <p className="font-mono text-sm font-bold text-[#35483E] dark:text-[#F2F3F3]">{uniqNeg} patients</p>
                  <p className="text-[11px] text-[#8A9990] dark:text-[#8C9399]">&lt; 50% stenosis on angiogram</p>
                </div>
                <div className="p-3 rounded-lg bg-white dark:bg-[#282C30] border border-[#E5E0D6] dark:border-[#373C40]">
                  <div className="flex items-center gap-1.5 text-[#B35D52] dark:text-[#E08A80] font-semibold mb-1">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#B35D52] dark:bg-[#E08A80]" />
                    <span>Presence of CAD (1)</span>
                  </div>
                  <p className="font-mono text-sm font-bold text-[#35483E] dark:text-[#F2F3F3]">{uniqPos} patients</p>
                  <p className="text-[11px] text-[#8A9990] dark:text-[#8C9399]">≥ 50% stenosis on angiogram</p>
                </div>
              </div>
            </div>
          </div>

          {/* Epidemiological Prevalence Notice */}
          <div className="p-4 rounded-xl bg-[#FAF0EE]/70 dark:bg-[#261B1A] border border-[#F0D5D1] dark:border-[#4A2D2A] text-xs text-[#35483E] dark:text-[#F2F3F3] space-y-1">
            <div className="flex items-center gap-2 font-bold text-[#B35D52] dark:text-[#E08A80]">
              <AlertTriangle size={15} />
              <span>Crucial Epidemiological Limitation: Referral Population vs. General Public</span>
            </div>
            <p className="text-[#52665A] dark:text-[#B2B7BB] leading-relaxed">
              The observed ~54% disease prevalence reflects a hospital referral cohort of symptomatic individuals undergoing diagnostic cardiac catheterization at the Cleveland Clinic. This prevalence must <strong className="text-[#35483E] dark:text-[#F2F3F3]">never</strong> be interpreted as the background prevalence of coronary artery disease in the general asymptomatic population, which is substantially lower (&lt; 5–10% in comparable age brackets). Applying models trained on high-prevalence referral data to unselected screening populations produces high rates of false positives.
            </p>
          </div>
        </section>

        {/* ── SECTION E: Preprocessing & Evaluation Pipeline Integrity ── */}
        <section aria-label="Preprocessing Pipeline" className="rounded-2xl p-6 bg-white/90 border border-[#E5E0D6] shadow-2xs space-y-6">
          <div className="flex items-center gap-2.5 pb-2 border-b border-[#E5E0D6]">
            <Layers size={20} className="text-[#35483E]" />
            <div>
              <h3 className="font-serif text-xl font-bold text-[#35483E]">
                {t("data_page.pipeline_title", "Preprocessing Pipeline & Scientific Boundaries")}
              </h3>
              <p className="text-xs text-[#52665A]">
                Transparent documentation of data transformations, scalers, and unresolved modeling boundaries.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Step 1 */}
            <div className="p-4 rounded-xl bg-[#F7F5F0] dark:bg-[#202326] border border-[#E5E0D6] dark:border-[#373C40] space-y-2">
              <span className="font-mono text-xs font-bold text-[#B35D52] dark:text-[#E08A80]">STAGE 01</span>
              <h4 className="font-serif font-bold text-sm text-[#35483E] dark:text-[#F2F3F3]">Input Sanitization</h4>
              <p className="text-xs text-[#52665A] dark:text-[#B2B7BB] leading-relaxed">
                Inference payloads are validated against strict physiological boundaries (e.g. blood pressure 60–250 mm Hg, cholesterol 100–600 mg/dL).
              </p>
            </div>

            {/* Step 2 */}
            <div className="p-4 rounded-xl bg-[#F7F5F0] dark:bg-[#202326] border border-[#E5E0D6] dark:border-[#373C40] space-y-2">
              <span className="font-mono text-xs font-bold text-[#B35D52] dark:text-[#E08A80]">STAGE 02</span>
              <h4 className="font-serif font-bold text-sm text-[#35483E] dark:text-[#F2F3F3]">StandardScaler Scaling</h4>
              <p className="text-xs text-[#52665A] dark:text-[#B2B7BB] leading-relaxed">
                Standardization is fit strictly on continuous parameters for Logistic Regression, KNN, and SVM. Decision trees (Random Forest) operate on raw features.
              </p>
            </div>

            {/* Step 3 */}
            <div className="p-4 rounded-xl bg-[#F7F5F0] dark:bg-[#202326] border border-[#E5E0D6] dark:border-[#373C40] space-y-2">
              <span className="font-mono text-xs font-bold text-[#B35D52] dark:text-[#E08A80]">STAGE 03</span>
              <h4 className="font-serif font-bold text-sm text-[#35483E] dark:text-[#F2F3F3]">Categorical Representation</h4>
              <p className="text-xs text-[#52665A] dark:text-[#B2B7BB] leading-relaxed">
                Categorical variables (<code className="font-mono text-[11px] text-[#35483E] dark:text-[#F2F3F3] bg-black/5 dark:bg-[#17191B] px-1 rounded">cp</code>, <code className="font-mono text-[11px] text-[#35483E] dark:text-[#F2F3F3] bg-black/5 dark:bg-[#17191B] px-1 rounded">restecg</code>, <code className="font-mono text-[11px] text-[#35483E] dark:text-[#F2F3F3] bg-black/5 dark:bg-[#17191B] px-1 rounded">slope</code>, <code className="font-mono text-[11px] text-[#35483E] dark:text-[#F2F3F3] bg-black/5 dark:bg-[#17191B] px-1 rounded">thal</code>) are preserved as integer levels to maintain legacy inference compatibility.
              </p>
            </div>

            {/* Step 4 */}
            <div className="p-4 rounded-xl bg-[#F7F5F0] dark:bg-[#202326] border border-[#E5E0D6] dark:border-[#373C40] space-y-2">
              <span className="font-mono text-xs font-bold text-[#B35D52] dark:text-[#E08A80]">STAGE 04</span>
              <h4 className="font-serif font-bold text-sm text-[#35483E] dark:text-[#F2F3F3]">Partition Safeguards</h4>
              <p className="text-xs text-[#52665A] dark:text-[#B2B7BB] leading-relaxed">
                Offline evaluation uses Stratified 5-Fold Cross-Validation on deduplicated unique patients with scalers encapsulated strictly inside training folds.
              </p>
            </div>
          </div>

          {/* Unresolved Limitations Box */}
          <div className="p-4 rounded-xl bg-[#FAF9F5] dark:bg-[#202326] border border-[#E5E0D6] dark:border-[#373C40] space-y-2 text-xs">
            <div className="flex items-center gap-2 font-bold text-[#35483E] dark:text-[#F2F3F3]">
              <FileText size={15} className="text-[#52665A] dark:text-[#8C9399]" />
              <span>Full Scientific Transparency: Unresolved Dataset Limitations</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-[#52665A] dark:text-[#B2B7BB] leading-relaxed">
              <li>
                <strong>Historical Single-Center Origin:</strong> Data was collected in 1988 at Cleveland Clinic Foundation; clinical testing protocols and diagnostic thresholds have evolved substantially over the past four decades.
              </li>
              <li>
                <strong>Sentinel Missing Values in Tree Splitting:</strong> In decision tree models, sentinel values (<code className="font-mono text-[11px]">ca=4</code> and <code className="font-mono text-[11px]">thal=0</code>) are treated as numerical categories rather than imputed, which could introduce branch artifacts.
              </li>
              <li>
                <strong>Integer Representation of Nominal Categories:</strong> Chest pain types (<code className="font-mono text-[11px]">cp</code>) and thalassemia (<code className="font-mono text-[11px]">thal</code>) are modeled as integer scales rather than one-hot encoded dummy variables in the legacy bundle.
              </li>
              <li>
                <strong>Zero Prospective Clinical Clearance:</strong> Statistical benchmark performance on this retrospective dataset does not prove clinical efficacy or safety. CardioScan is intended solely for cardiovascular literacy and machine learning education.
              </li>
            </ul>
          </div>
        </section>
      </main>
    </div>
  );
}
