import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Heart,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  X,
  ExternalLink,
  Menu,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Shield,
  Layers,
  Database,
  Sliders,
  Cpu,
  BarChart2
} from "lucide-react";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "../components/LanguageSwitcher";
import AnatomicalHeart from "../components/AnatomicalHeart";

export default function LandingPage() {
  const { t, i18n } = useTranslation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [technicalDetailsExpanded, setTechnicalDetailsExpanded] = useState(false);

  // Interactive Story Levers: How Risk Compounding Operates in ML
  const [bpLevel, setBpLevel] = useState("elevated"); // "normal" | "elevated" | "high"
  const [cholLevel, setCholLevel] = useState("borderline"); // "desirable" | "borderline" | "high"
  const [stressLevel, setStressLevel] = useState("strained"); // "normal" | "strained" | "ischemic"


  // Smooth scroll support for hash anchors on page load or refresh
  useEffect(() => {
    if (window.location.hash) {
      const id = window.location.hash.replace("#", "");
      const element = document.getElementById(id);
      if (element) {
        setTimeout(() => {
          element.scrollIntoView({ behavior: "smooth" });
        }, 100);
      }
    }
  }, []);

  // Dismiss mobile menu on Escape key press
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mobileMenuOpen]);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  // Compute the combined story narrative based on user's interactive levers
  const getSynergyStory = () => {
    const isBpHigh = bpLevel === "high";
    const isCholHigh = cholLevel === "high";
    const isStressIschemic = stressLevel === "ischemic";
    const isAllNormal = bpLevel === "normal" && cholLevel === "desirable" && stressLevel === "normal";

    if (isAllNormal) {
      return {
        badge: t("landing.combine.story_all_normal_badge", "Illustrative Baseline"),
        headline: t("landing.combine.story_all_normal_headline", "Harmonious Physiological State"),
        body: t("landing.combine.story_all_normal_body", "Arterial walls experience low mechanical shear stress, circulating blood lipids remain within desirable clearance ranges, and electrocardiogram waveforms show adequate myocardial oxygen perfusion. In this scenario, the algorithm assigns a low statistical likelihood of coronary artery disease."),
        riskTier: t("landing.combine.story_all_normal_tier", "Illustrative Low Risk"),
        colorClass: "text-emerald-950 bg-emerald-50/80 border-emerald-200",
        gaugeWidth: "18%",
        gaugeColor: "bg-emerald-600",
      };
    }

    if (isBpHigh && isCholHigh && isStressIschemic) {
      return {
        badge: t("landing.combine.story_all_high_badge", "Compounding Factors"),
        headline: t("landing.combine.story_all_high_headline", "High Mechanical Shear + Lipid Accumulation + Ischemia"),
        body: t("landing.combine.story_all_high_body", "Elevated blood pressure creates microscopic endothelial lesions in arterial walls. High circulating cholesterol particles infiltrate these lesions to form inflammatory atherosclerotic plaques. When physical exertion increases myocardial oxygen demand, narrowed arteries cannot supply enough blood, producing ST-segment depression. When all three signals compound, the model's estimated risk surges."),
        riskTier: t("landing.combine.story_all_high_tier", "Illustrative Elevated Risk"),
        colorClass: "text-rose-950 bg-rose-50/80 border-rose-200",
        gaugeWidth: "88%",
        gaugeColor: "bg-rose-600",
      };
    }

    if (isBpHigh || isCholHigh || isStressIschemic) {
      return {
        badge: t("landing.combine.story_isolated_badge", "Isolated Strain"),
        headline: t("landing.combine.story_isolated_headline", "Isolated Signal Elevation with Partial Compensation"),
        body: t("landing.combine.story_isolated_body", "One primary marker is markedly elevated, placing sustained strain on either the vascular tree, metabolic clearance, or cardiac reserve. However, other compensatory indicators remain normal. Clinical algorithms weigh both the elevated signal and the protective factors to assign an intermediate risk profile."),
        riskTier: t("landing.combine.story_isolated_tier", "Illustrative Moderate Risk"),
        colorClass: "text-amber-950 bg-amber-50/80 border-amber-200",
        gaugeWidth: "52%",
        gaugeColor: "bg-amber-600",
      };
    }

    return {
      badge: t("landing.combine.story_borderline_badge", "Watchful Baseline"),
      headline: t("landing.combine.story_borderline_headline", "Borderline Interplay of Multiple Mild Indicators"),
      body: t("landing.combine.story_borderline_body", "Multiple signals are slightly outside optimal reference ranges without crossing into severe pathology. Machine learning classifiers evaluate whether subtle borderline shifts compound toward clinical significance. This demonstrates why comprehensive multi-parameter screening is clinically valuable."),
      riskTier: t("landing.combine.story_borderline_tier", "Illustrative Mild / Borderline Risk"),
      colorClass: "text-blue-950 bg-blue-50/80 border-blue-200",
      gaugeWidth: "34%",
      gaugeColor: "bg-blue-600",
    };
  };

  const storyResult = getSynergyStory();



  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#1E293B] font-sans antialiased selection:bg-[#BE123C] selection:text-white">
      {/* ── 1. Skip Link & Editorial Masthead Header ─────────────────────── */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-[#BE123C] focus:text-white focus:rounded-md focus:shadow-md text-xs font-medium"
      >
        Skip to main content
      </a>

      <header className="border-b border-[#E7E5DF] bg-[#FAF9F6]/95 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Masthead Identity (Left) */}
          <Link to="/" className="flex items-center gap-2.5 group shrink-0">
            <div className="w-7 h-7 rounded-lg bg-[#BE123C] text-white flex items-center justify-center transition-transform group-hover:scale-105 shadow-2xs">
              <Heart size={14} className="fill-white" />
            </div>
            <div className="flex items-center">
              <span className="font-serif font-bold text-lg tracking-tight text-[#0F172A]">
                Cardio<span className="text-[#BE123C]">Scan</span>
              </span>
              <span className="hidden xl:inline-block ml-2.5 pl-2.5 border-l border-[#D5D2C9] text-[11px] text-[#64748B] font-sans whitespace-nowrap">
                {t("landing.nav.subtitle", "Cardiovascular ML")}
              </span>
            </div>
          </Link>

          {/* Desktop Editorial Navigation (Center) - Visible on lg (>= 1024px) */}
          <nav
            aria-label="Desktop primary navigation"
            className="hidden lg:flex items-center gap-4 xl:gap-6 text-sm font-medium text-[#334155]"
          >
            <a
              href="#how-it-works"
              className="hover:text-[#0F172A] transition-colors whitespace-nowrap px-1 py-1"
            >
              {t("landing.nav.how_it_works", "How It Works")}
            </a>
            <a
              href="#why-signals-compound"
              className="hover:text-[#0F172A] transition-colors whitespace-nowrap px-1 py-1"
            >
              {t("landing.nav.why_combine", "Why Signals Combine")}
            </a>
            <a
              href="#boundaries"
              className="hover:text-[#0F172A] transition-colors whitespace-nowrap px-1 py-1"
            >
              {t("landing.nav.scope_limits", "Scope & Limits")}
            </a>
            <a
              href="#research"
              className="text-[#BE123C] hover:text-[#9F1239] transition-colors font-semibold whitespace-nowrap px-1 py-1"
            >
              {t("landing.nav.methodology", "Methodology")}
            </a>
          </nav>

          {/* Desktop Action Group (Right) - Visible on lg (>= 1024px) */}
          <div className="hidden lg:flex items-center gap-2.5 xl:gap-3 shrink-0">
            <LanguageSwitcher variant="light" />

            <Link
              to="/login"
              className="h-9 px-3.5 inline-flex items-center text-sm font-medium text-[#334155] hover:text-[#0F172A] hover:bg-[#F4F2EC] rounded-lg transition-colors whitespace-nowrap"
            >
              {t("landing.nav.sign_in", "Sign In")}
            </Link>

            <Link
              to="/predict"
              className="h-9 px-4 inline-flex items-center gap-1.5 rounded-lg bg-[#0F172A] text-white text-sm font-medium hover:bg-[#1E293B] transition-colors shadow-xs whitespace-nowrap"
            >
              <span>{t("landing.nav.start_assessment", "Start Assessment")}</span>
              <ArrowRight size={13} />
            </Link>
          </div>

          {/* Tablet & Mobile Controls (< 1024px) */}
          <div className="flex lg:hidden items-center gap-2">
            <LanguageSwitcher variant="light" />

            <Link
              to="/predict"
              className="hidden sm:inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-[#0F172A] text-white text-xs font-medium hover:bg-[#1E293B] transition-colors shadow-xs whitespace-nowrap"
            >
              <span>{t("landing.nav.start", "Start")}</span>
              <ArrowRight size={12} />
            </Link>

            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-[#D5D2C9] bg-white text-[#1E293B] hover:bg-[#F4F2EC] hover:border-[#C5C2B9] transition-colors focus:outline-none focus:ring-2 focus:ring-[#BE123C]/50"
              aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>

        {/* Mobile & Tablet Drawer Menu (< 1024px) */}
        {mobileMenuOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-[#0F172A]/25 backdrop-blur-2xs z-40 lg:hidden"
              onClick={() => setMobileMenuOpen(false)}
              aria-hidden="true"
            />

            {/* Menu Panel */}
            <div className="relative z-50 lg:hidden border-b border-[#E7E5DF] bg-[#FAF9F6] shadow-lg px-4 sm:px-6 py-5 space-y-4 text-start max-w-7xl mx-auto">
              <nav aria-label="Mobile and tablet navigation" className="space-y-1">
                <a
                  href="#how-it-works"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-between py-3 px-3.5 rounded-lg text-sm text-[#1E293B] font-medium hover:bg-[#F4F2EC] transition-colors"
                >
                  <span>{t("landing.nav.how_it_works", "How It Works")}</span>
                  <ArrowRight size={14} className="text-[#94A3B8]" />
                </a>
                <a
                  href="#why-signals-compound"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-between py-3 px-3.5 rounded-lg text-sm text-[#1E293B] font-medium hover:bg-[#F4F2EC] transition-colors"
                >
                  <span>{t("landing.nav.why_combine", "Why Signals Combine")}</span>
                  <ArrowRight size={14} className="text-[#94A3B8]" />
                </a>
                <a
                  href="#boundaries"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-between py-3 px-3.5 rounded-lg text-sm text-[#1E293B] font-medium hover:bg-[#F4F2EC] transition-colors"
                >
                  <span>{t("landing.nav.scope_limits", "Scope & Limits")}</span>
                  <ArrowRight size={14} className="text-[#94A3B8]" />
                </a>
                <a
                  href="#research"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-between py-3 px-3.5 rounded-lg text-sm text-[#BE123C] font-semibold hover:bg-[#BE123C]/5 transition-colors"
                >
                  <span>{t("landing.nav.methodology", "Methodology")}</span>
                  <ArrowRight size={14} className="text-[#BE123C]" />
                </a>
              </nav>

              <div className="pt-3 border-t border-[#E7E5DF] space-y-3">
                <div className="flex items-center justify-between px-3.5 py-2.5 rounded-lg bg-[#F4F2EC]/60 border border-[#E7E5DF]">
                  <span className="text-sm text-[#475569] font-medium">{t("landing.nav.language", "Language")}</span>
                  <LanguageSwitcher variant="light" />
                </div>

                <div className="grid grid-cols-2 gap-2.5 pt-1">
                  <Link
                    to="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="h-11 inline-flex items-center justify-center border border-[#D5D2C9] rounded-xl bg-white text-[#0F172A] text-sm font-semibold hover:bg-[#F4F2EC] transition-colors shadow-2xs"
                  >
                    {t("landing.nav.sign_in", "Sign In")}
                  </Link>
                  <Link
                    to="/predict"
                    onClick={() => setMobileMenuOpen(false)}
                    className="h-11 inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#0F172A] text-white text-sm font-semibold hover:bg-[#1E293B] transition-colors shadow-xs"
                  >
                    <span>{t("landing.nav.start_assessment", "Start Assessment")}</span>
                    <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
            </div>
          </>
        )}
      </header>

      {/* ── 2. The Hero: Clear Purpose with Refined Anatomical Heart ─────── */}
      <section id="main-content" className="pt-10 sm:pt-14 pb-12 sm:pb-14 px-4 sm:px-6 max-w-5xl mx-auto text-start">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
          {/* Main Hero Copy (Left column on desktop) */}
          <div className="lg:col-span-7 space-y-5">
            {/* ── Editorial Header: Overline, ECG Waveform Accent & Badge ── */}
            <div className="space-y-3">
              {/* 1. Small editorial overline */}
              <div className="inline-flex items-center gap-2 text-[10.5px] sm:text-[11px] font-mono font-semibold tracking-[0.18em] uppercase text-[#4F8278]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#BE123C] shrink-0" aria-hidden="true" />
                <span>
                  {t("landing.hero.overline_research", "Cardiovascular Research")}
                  <span className="mx-2 text-[#4F8278]/70 font-semibold" aria-hidden="true">·</span>
                  {t("landing.hero.overline_ml", "Machine Learning")}
                </span>
              </div>

              {/* 2. Refined ECG Waveform Accent */}
              <div className="flex items-center" aria-hidden="true">
                <svg
                  className="w-full h-auto max-w-[270px] sm:max-w-[290px] overflow-visible"
                  viewBox="0 0 290 22"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <defs>
                    <linearGradient id="heroEcgGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#4F8278" stopOpacity="0.15" />
                      <stop offset="14%" stopColor="#4F8278" stopOpacity="0.75" />
                      <stop offset="36%" stopColor="#4F8278" stopOpacity="0.8" />
                      <stop offset="40%" stopColor="#BE123C" stopOpacity="1" />
                      <stop offset="45%" stopColor="#BE123C" stopOpacity="1" />
                      <stop offset="49%" stopColor="#4F8278" stopOpacity="0.8" />
                      <stop offset="85%" stopColor="#4F8278" stopOpacity="0.6" />
                      <stop offset="100%" stopColor="#4F8278" stopOpacity="0.15" />
                    </linearGradient>
                  </defs>
                  {/* Base fine stroke in muted sage with restrained crimson heartbeat peak */}
                  <path
                    d="M 0,11 L 56,11 C 61,11 64,8 68,8 C 72,8 75,11 80,11 L 100,11 L 104,13.5 L 111,1.5 L 118,20.5 L 123,11 L 142,11 C 147,11 152,6 158,6 C 164,6 168,11 174,11 L 290,11"
                    stroke="url(#heroEcgGrad)"
                    strokeWidth="1.25"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {/* Smooth, calm travelling highlight along the ECG line */}
                  <path
                    className="hero-ecg-pulse"
                    d="M 0,11 L 56,11 C 61,11 64,8 68,8 C 72,8 75,11 80,11 L 100,11 L 104,13.5 L 111,1.5 L 118,20.5 L 123,11 L 142,11 C 147,11 152,6 158,6 C 164,6 168,11 174,11 L 290,11"
                    stroke="#BE123C"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>

              {/* 3. Existing Badge */}
              <div className="pt-0.5">
                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-[#BE123C]/10 border border-[#BE123C]/20 text-[#BE123C] text-[11px] font-mono font-semibold tracking-wide uppercase">
                  <span>{t("landing.hero.badge", "Cardiovascular Health & ML Exploration")}</span>
                </div>
              </div>
            </div>

            <h1 className="text-3xl sm:text-5xl font-serif text-[#0F172A] tracking-tight leading-[1.16]">
              {t("landing.hero.title", "Your heart has a story. Understand the signals.")}
            </h1>

            <p className="text-base sm:text-lg text-[#334155] leading-relaxed">
              {t("landing.hero.description", "CardioScan helps students, researchers, and individuals explore how standard cardiovascular measurements, like blood pressure, cholesterol, and exercise stress readings, interact. Enter numbers from an existing medical report or test with sample profiles to examine how machine-learning models estimate statistical risk patterns for educational exploration.")}
            </p>

            {/* Primary & Secondary Action CTAs */}
            <div className="pt-2 flex flex-wrap items-center gap-3.5">
              <Link
                to="/predict"
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-lg bg-[#0F172A] text-white text-sm sm:text-base font-semibold hover:bg-[#1E293B] transition-colors shadow-xs"
              >
                <span>{t("landing.nav.start_assessment", "Start Assessment")}</span>
                <ArrowRight size={15} />
              </Link>

              <a
                href="#how-it-works"
                className="inline-flex items-center gap-2 px-5 py-3.5 rounded-lg border border-[#D5D2C9] bg-white text-[#1E293B] text-sm sm:text-base font-semibold hover:bg-[#F4F2EC] transition-colors"
              >
                <span>{t("landing.hero.how_cardioscan_works", "How CardioScan Works")}</span>
                <ChevronDown size={15} className="text-[#64748B]" />
              </a>
            </div>

            {/* Clear Prerequisites & Educational Clarification */}
            <div className="pt-3 border-t border-[#E7E5DF] space-y-1.5 text-sm text-[#334155] leading-relaxed">
              <p>
                <strong className="text-[#0F172A]">{t("landing.hero.what_you_need_label", "What you need:")}</strong> {t("landing.hero.what_you_need_desc", "Numbers from a routine checkup or blood test (resting blood pressure, cholesterol, glucose). You can also test with preloaded synthetic examples without personal data.")}
              </p>
              <p className="text-xs sm:text-[13px] text-[#475569] leading-relaxed">
                {t("landing.hero.disclaimer", "Educational tool for health awareness. Results represent statistical model estimates, not an individual clinical diagnosis.")}
              </p>
            </div>
          </div>

          {/* Refined Anatomical Heart Interactive Panel (Right column on desktop) */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center">
            <div className="w-full border border-[#E0DED7] rounded-2xl bg-white p-5 sm:p-6 shadow-xs relative">
              <div className="flex items-center justify-between border-b border-[#F0EFEA] pb-2.5 mb-2 text-xs">
                <span className="font-mono text-[#475569] uppercase tracking-wider font-semibold">
                  {t("landing.heart.header_title", "INSIDE YOUR HEART")}
                </span>
                <span className="text-[#BE123C] font-mono font-semibold">
                  {t("landing.heart.header_vars", "13 clinical input variables")}
                </span>
              </div>

              {/* The Interactive Vector Anatomical Heart with vessel light and region explanations */}
              <AnatomicalHeart className="py-1" />

              <p className="text-sm text-start text-[#334155] pt-3.5 border-t border-[#F0EFEA] leading-relaxed">
                {t("landing.heart.overview", "Your heart relies on a network of blood vessels to deliver oxygen. CardioScan explores how measurements such as blood pressure, cholesterol and exercise-related signals relate to a model's estimate.")}
              </p>

              <p className="text-xs text-center text-[#64748B] pt-2 italic">
                {t("landing.heart.disclaimer", "Educational illustration · Not a patient-specific scan")}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 3. How CardioScan Works: Simple 3-Step Sequence ───────────────── */}
      <section id="how-it-works" className="py-12 sm:py-14 px-4 sm:px-6 max-w-5xl mx-auto border-t border-[#E7E5DF] scroll-mt-24">
        <div className="space-y-3 mb-9 text-start">
          <span className="text-xs font-mono uppercase tracking-wider text-[#BE123C] font-semibold block">
            {t("landing.how.badge", "Three Clear Steps")}
          </span>
          <h2 className="text-2xl sm:text-3xl font-serif text-[#0F172A]">
            {t("landing.how.title", "How CardioScan works")}
          </h2>
          <p className="text-base text-[#334155] leading-relaxed max-w-2xl">
            {t("landing.how.subtitle", "A transparent machine-learning pipeline connecting routine measurements to pattern evaluation.")}
          </p>
        </div>

        {/* 3 Step Editorial Layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-start">
          {/* Step 1 */}
          <div className="p-5 sm:p-6 rounded-2xl border border-[#E0DED7] bg-white space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-bold text-[#BE123C] bg-[#BE123C]/10 px-2.5 py-1 rounded">
                Step 01
              </span>
              <Sliders size={18} className="text-[#64748B]" />
            </div>
            <h3 className="text-base sm:text-lg font-bold text-[#0F172A]">{t("landing.how.step1_title", "Enter clinical inputs")}</h3>
            <p className="text-sm sm:text-[15px] text-[#334155] leading-relaxed">
              {t("landing.how.step1_desc", "Provide up to 13 routine cardiovascular measurements from laboratory panels, resting vitals, or treadmill exercise stress tests. You can also explore preloaded clinical archetypes.")}
            </p>
          </div>

          {/* Step 2 */}
          <div className="p-5 sm:p-6 rounded-2xl border border-[#E0DED7] bg-white space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-bold text-[#BE123C] bg-[#BE123C]/10 px-2.5 py-1 rounded">
                Step 02
              </span>
              <Cpu size={18} className="text-[#64748B]" />
            </div>
            <h3 className="text-base sm:text-lg font-bold text-[#0F172A]">{t("landing.how.step2_title", "Evaluate through 3 machine-learning models")}</h3>
            <p className="text-sm sm:text-[15px] text-[#334155] leading-relaxed">
              {t("landing.how.step2_desc", "Logistic Regression, Random Forest, and K-Nearest Neighbors analyze non-linear patterns concurrently. A majority-voting consensus determines whether statistical indicators lean elevated or baseline.")}
            </p>
          </div>

          {/* Step 3 */}
          <div className="p-5 sm:p-6 rounded-2xl border border-[#E0DED7] bg-white space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-bold text-[#BE123C] bg-[#BE123C]/10 px-2.5 py-1 rounded">
                Step 03
              </span>
              <BarChart2 size={18} className="text-[#64748B]" />
            </div>
            <h3 className="text-base sm:text-lg font-bold text-[#0F172A]">{t("landing.how.step3_title", "Inspect feature contributions and simulate changes")}</h3>
            <p className="text-sm sm:text-[15px] text-[#334155] leading-relaxed">
              {t("landing.how.step3_desc", "Review mathematical feature attribution rankings to see which signals influenced the calculation most. Use What-If simulation sliders to observe how shifting numbers modifies estimated risk.")}
            </p>
          </div>
        </div>
      </section>

      {/* ── 4. Why Measurements Work Together: Interactive Demonstration ──── */}
      <section id="why-signals-compound" className="py-12 sm:py-14 px-4 sm:px-6 max-w-5xl mx-auto border-t border-[#E7E5DF] scroll-mt-24">
        <div className="space-y-3 mb-8 text-start">
          <span className="text-xs font-mono uppercase tracking-wider text-[#BE123C] font-semibold block">
            {t("landing.combine.badge", "Interactive Demonstration")}
          </span>
          <h2 className="text-2xl sm:text-3xl font-serif text-[#0F172A]">
            {t("landing.combine.title", "Why measurements work together")}
          </h2>
          <p className="text-base text-[#334155] leading-relaxed max-w-2xl">
            {t("landing.combine.subtitle", "In cardiovascular health, individual numbers rarely tell the complete story. Adjust the three controls below to observe how multiple signals compound in predictive modeling.")}
          </p>
        </div>

        {/* Interactive Demonstrator Card */}
        <div className="border border-[#E0DED7] rounded-2xl bg-white p-5 sm:p-7 shadow-xs space-y-6">
          {/* Header Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#F0EFEA] pb-3">
            <div>
              <span className="text-sm sm:text-base font-bold text-[#0F172A] block">
                {t("landing.combine.card_title", "Educational Simulation · Illustrative Synthetic Profile")}
              </span>
              <span className="text-xs sm:text-sm text-[#475569]">
                {t("landing.combine.card_subtitle", "Click any level to observe how simulated multi-parameter interactions compound")}
              </span>
            </div>
            <span className="text-xs font-mono bg-amber-50 text-amber-900 border border-amber-200 px-2.5 py-1 rounded font-medium self-start sm:self-auto">
              {t("landing.combine.synthetic_badge", "Synthetic Example Only")}
            </span>
          </div>

          {/* 3 Interactive Levers with Plain-English Explanations */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-start">
            {/* Lever 1: Blood Pressure */}
            <div className="p-4 rounded-xl border border-[#E7E5DF] bg-[#FAF9F6] space-y-3">
              <div>
                <span className="text-xs font-mono font-bold text-[#475569] block">INPUT 01 · trestbps</span>
                <h4 className="text-sm sm:text-base font-bold text-[#0F172A]">{t("landing.combine.lever1_title", "Resting Blood Pressure")}</h4>
                <p className="text-xs sm:text-[13px] text-[#475569] leading-snug mt-1">
                  {t("landing.combine.lever1_desc", "Physical outward force against artery walls. Higher pressure causes mechanical wear over time.")}
                </p>
              </div>

              <div className="grid grid-cols-3 gap-1.5 pt-1">
                {[
                  { id: "normal", label: t("landing.combine.lever1_normal", "Normal"), value: "118" },
                  { id: "elevated", label: t("landing.combine.lever1_stage1", "Stage 1"), value: "136" },
                  { id: "high", label: t("landing.combine.lever1_stage2", "Stage 2"), value: "162" },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setBpLevel(item.id)}
                    className={`py-2.5 px-1.5 rounded-lg text-center transition-all min-h-[52px] flex flex-col items-center justify-center ${
                      bpLevel === item.id
                        ? "bg-[#0F172A] text-white shadow-xs font-semibold"
                        : "bg-white text-[#475569] border border-[#E2DFD6] hover:bg-[#F4F2EC]"
                    }`}
                  >
                    <div className="text-xs font-semibold leading-tight">{item.label}</div>
                    <div className="text-xs font-mono opacity-85 mt-1">{item.value} <span className="text-[10px]">mmHg</span></div>
                  </button>
                ))}
              </div>
            </div>

            {/* Lever 2: Serum Cholesterol */}
            <div className="p-4 rounded-xl border border-[#E7E5DF] bg-[#FAF9F6] space-y-3">
              <div>
                <span className="text-xs font-mono font-bold text-[#475569] block">INPUT 02 · chol</span>
                <h4 className="text-sm sm:text-base font-bold text-[#0F172A]">{t("landing.combine.lever2_title", "Total Serum Cholesterol")}</h4>
                <p className="text-xs sm:text-[13px] text-[#475569] leading-snug mt-1">
                  {t("landing.combine.lever2_desc", "Circulating lipid particles. Excess particles can collect in arterial walls where wear occurs.")}
                </p>
              </div>

              <div className="grid grid-cols-3 gap-1.5 pt-1">
                {[
                  { id: "desirable", label: t("landing.combine.lever2_desirable", "Desirable"), value: "175" },
                  { id: "borderline", label: t("landing.combine.lever2_borderline", "Borderline"), value: "218" },
                  { id: "high", label: t("landing.combine.lever2_high", "High"), value: "268" },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setCholLevel(item.id)}
                    className={`py-2.5 px-1.5 rounded-lg text-center transition-all min-h-[52px] flex flex-col items-center justify-center ${
                      cholLevel === item.id
                        ? "bg-[#0F172A] text-white shadow-xs font-semibold"
                        : "bg-white text-[#475569] border border-[#E2DFD6] hover:bg-[#F4F2EC]"
                    }`}
                  >
                    <div className="text-xs font-semibold leading-tight">{item.label}</div>
                    <div className="text-xs font-mono opacity-85 mt-1">{item.value} <span className="text-[10px]">mg/dL</span></div>
                  </button>
                ))}
              </div>
            </div>

            {/* Lever 3: Exercise Response */}
            <div className="p-4 rounded-xl border border-[#E7E5DF] bg-[#FAF9F6] space-y-3">
              <div>
                <span className="text-xs font-mono font-bold text-[#475569] block">INPUT 03 · oldpeak</span>
                <h4 className="text-sm sm:text-base font-bold text-[#0F172A]">{t("landing.combine.lever3_title", "Stress ECG Response")}</h4>
                <p className="text-xs sm:text-[13px] text-[#475569] leading-snug mt-1">
                  {t("landing.combine.lever3_desc", "Waveform sag on ECG during exertion. Indicates whether heart muscle receives enough oxygen under stress.")}
                </p>
              </div>

              <div className="grid grid-cols-3 gap-1.5 pt-1">
                {[
                  { id: "normal", label: t("landing.combine.lever3_baseline", "Baseline"), value: "0.0mm" },
                  { id: "strained", label: t("landing.combine.lever3_mild", "Mild Sag"), value: "1.2mm" },
                  { id: "ischemic", label: t("landing.combine.lever3_marked", "Marked Sag"), value: "2.8mm" },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setStressLevel(item.id)}
                    className={`py-2.5 px-1.5 rounded-lg text-center transition-all min-h-[52px] flex flex-col items-center justify-center ${
                      stressLevel === item.id
                        ? "bg-[#0F172A] text-white shadow-xs font-semibold"
                        : "bg-white text-[#475569] border border-[#E2DFD6] hover:bg-[#F4F2EC]"
                    }`}
                  >
                    <div className="text-xs font-semibold leading-tight">{item.label}</div>
                    <div className="text-xs font-mono opacity-85 mt-1">{item.value}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Dynamic Story Feedback Box */}
          <div className={`p-5 sm:p-6 rounded-xl border transition-all duration-300 text-start ${storyResult.colorClass}`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-2.5">
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm font-bold uppercase tracking-wider">
                  {storyResult.riskTier}
                </span>
                <span className="text-xs opacity-75 font-mono">({storyResult.badge})</span>
              </div>
              <span className="text-xs font-mono opacity-90">{t("landing.combine.synergy_response", "Simulated Synergy Response")}</span>
            </div>

            {/* Visual Risk Gauge */}
            <div className="w-full h-2.5 bg-black/10 rounded-md overflow-hidden mb-3.5">
              <div
                className={`h-full transition-all duration-300 rounded-md ${storyResult.gaugeColor}`}
                style={{ width: storyResult.gaugeWidth }}
              />
            </div>

            <h3 className="text-base sm:text-lg font-bold mb-1.5">{storyResult.headline}</h3>
            <p className="text-sm sm:text-base leading-relaxed opacity-95">{storyResult.body}</p>

            <div className="mt-3.5 pt-2.5 border-t border-black/10 text-xs sm:text-[13px] opacity-90 flex items-start gap-2">
              <HelpCircle size={15} className="shrink-0 mt-0.5" />
              <span>
                {t("landing.combine.edu_note", "Educational note: In real patients, individual genetics, vascular anatomy, and clinical history determine cardiac health. Machine learning models evaluate mathematical correlations within training records, not individual patient biology.")}
              </span>
            </div>
          </div>
        </div>
      </section>


      {/* ── 6. What Machine Learning Can and Cannot Do ───────────────────── */}
      <section id="boundaries" className="py-12 sm:py-14 px-4 sm:px-6 max-w-5xl mx-auto border-t border-[#E7E5DF] scroll-mt-24">
        <div className="space-y-3 mb-8 text-start">
          <span className="text-xs font-mono uppercase tracking-wider text-[#BE123C] font-semibold block">
            {t("landing.scope.badge", "Scope & Limitations")}
          </span>
          <h2 className="text-2xl sm:text-3xl font-serif text-[#0F172A]">
            {t("landing.scope.title", "What machine learning can and cannot do")}
          </h2>
          <p className="text-base text-[#334155] leading-relaxed max-w-2xl">
            {t("landing.scope.subtitle", "Machine learning is an effective pattern-recognition tool, but it operates with clear boundaries. Understanding what the model can and cannot tell you is essential for safe, informed health exploration.")}
          </p>
        </div>

        {/* Side-by-side comparison */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-start">
          {/* What it CAN do */}
          <div className="p-5 sm:p-6 rounded-2xl border border-emerald-200 bg-emerald-50/60 space-y-4">
            <div className="flex items-center gap-2.5 text-sm sm:text-base font-bold uppercase tracking-wider text-emerald-950">
              <CheckCircle2 size={18} className="text-emerald-700 shrink-0" />
              <span>{t("landing.scope.can_title", "What CardioScan CAN do")}</span>
            </div>
            <ul className="space-y-3 text-sm sm:text-[15px] text-emerald-950 leading-relaxed">
              <li className="flex items-start gap-2">
                <span className="text-emerald-700 font-bold shrink-0">•</span>
                <span>
                  <strong>{t("landing.scope.can_1_bold", "Identify complex multi-variable patterns:")}</strong> {t("landing.scope.can_1_text", "Evaluates non-linear relationships across all 13 indicators simultaneously, which is difficult to synthesize by mental math alone.")}
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-700 font-bold shrink-0">•</span>
                <span>
                  <strong>{t("landing.scope.can_2_bold", "Highlight mathematical contributors:")}</strong> {t("landing.scope.can_2_text", "Calculates feature attribution showing which variables moved the algorithm's calculation most for a specific profile.")}
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-700 font-bold shrink-0">•</span>
                <span>
                  <strong>{t("landing.scope.can_3_bold", "Enable interactive exploration:")}</strong> {t("landing.scope.can_3_text", "Allows you to simulate how hypothetical changes (such as lowering blood pressure or cholesterol) shift model predictions.")}
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-700 font-bold shrink-0">•</span>
                <span>
                  <strong>{t("landing.scope.can_4_bold", "Compare multiple model families:")}</strong> {t("landing.scope.can_4_text", "Lets you contrast how linear models, decision tree ensembles, instance-based clusters, and support vector machines interpret the same inputs.")}
                </span>
              </li>
            </ul>
          </div>

          {/* What it CANNOT do */}
          <div className="p-5 sm:p-6 rounded-2xl border border-amber-200 bg-amber-50/60 space-y-4">
            <div className="flex items-center gap-2.5 text-sm sm:text-base font-bold uppercase tracking-wider text-amber-950">
              <AlertCircle size={18} className="text-amber-700 shrink-0" />
              <span>{t("landing.scope.cannot_title", "What CardioScan CANNOT do")}</span>
            </div>
            <ul className="space-y-3 text-sm sm:text-[15px] text-amber-950 leading-relaxed">
              <li className="flex items-start gap-2">
                <span className="text-amber-700 font-bold shrink-0">•</span>
                <span>
                  <strong>{t("landing.scope.cannot_1_bold", "Diagnose individual medical conditions:")}</strong> {t("landing.scope.cannot_1_text", "A statistical correlation in historical data does not equal an individualized medical diagnosis. Only a qualified physician can evaluate your clinical condition.")}
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-700 font-bold shrink-0">•</span>
                <span>
                  <strong>{t("landing.scope.cannot_2_bold", "Substitute for comprehensive laboratory testing:")}</strong> {t("landing.scope.cannot_2_text", "The 13 variables represent a specific subset of cardiovascular markers, not a complete diagnostic workup such as direct catheterization or coronary angiography.")}
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-700 font-bold shrink-0">•</span>
                <span>
                  <strong>{t("landing.scope.cannot_3_bold", "Predict sudden acute cardiovascular events:")}</strong> {t("landing.scope.cannot_3_text", "Models estimate baseline statistical patterns from historical data, not the imminent timing, plaque rupture risk, or acute likelihood of a heart attack.")}
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-700 font-bold shrink-0">•</span>
                <span>
                  <strong>{t("landing.scope.cannot_4_bold", "Prescribe medication or therapeutic treatments:")}</strong> {t("landing.scope.cannot_4_text", "CardioScan is strictly an educational tool. Never alter, discontinue, or initiate medications based on algorithmic estimates.")}
                </span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* ── 7. Research & Methodology (In-Page Accessible Section) ────────── */}
      <section id="research" className="py-12 sm:py-14 px-4 sm:px-6 max-w-5xl mx-auto border-t border-[#E7E5DF] scroll-mt-24">
        <div className="space-y-3 mb-8 text-start">
          <span className="text-xs font-mono uppercase tracking-wider text-[#BE123C] font-semibold block">
            {t("landing.research.badge", "Methodology & Provenance")}
          </span>
          <h2 className="text-2xl sm:text-3xl font-serif text-[#0F172A]">
            {t("landing.research.title", "Research and methodology")}
          </h2>
          <p className="text-base text-[#334155] leading-relaxed max-w-2xl">
            {t("landing.research.subtitle", "CardioScan is trained on open historical clinical research data. Here is how the models, training pipeline, and attribution calculations are constructed.")}
          </p>
        </div>

        {/* 4 Clean Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-start mb-5">
          {/* Card 1: Dataset */}
          <div className="p-5 sm:p-6 rounded-2xl border border-[#E0DED7] bg-white space-y-3 shadow-xs">
            <div className="flex items-center gap-2.5 text-sm sm:text-base font-bold text-[#0F172A]">
              <Database size={17} className="text-[#BE123C] shrink-0" />
              <span>{t("landing.research.card1_title", "The Dataset Origin & Deduplication")}</span>
            </div>
            <p className="text-sm sm:text-[15px] text-[#334155] leading-relaxed">
              {t("landing.research.card1_desc", "CardioScan uses the 13-feature heart disease dataset originating from the 1988 Cleveland Clinic Foundation study in the UCI Machine Learning Repository. The source file contains 1,025 total records, which resolves to 302 unique records after exact duplicate removal. The target variable denotes angiographic coronary artery disease (≥ 50% diameter narrowing in one or more major coronary vessels).")}
            </p>
          </div>

          {/* Card 2: Algorithms */}
          <div className="p-5 sm:p-6 rounded-2xl border border-[#E0DED7] bg-white space-y-3 shadow-xs">
            <div className="flex items-center gap-2.5 text-sm sm:text-base font-bold text-[#0F172A]">
              <Cpu size={17} className="text-[#BE123C] shrink-0" />
              <span>{t("landing.research.card2_title", "Model Architectures & Ensemble")}</span>
            </div>
            <p className="text-sm sm:text-[15px] text-[#334155] leading-relaxed">
              {t("landing.research.card2_desc", "Predictions are computed using four supervised learning algorithms: Logistic Regression (L2 regularization baseline), Random Forest (100 decision trees), K-Nearest Neighbors (k=5, Euclidean metric), and Support Vector Machine (RBF kernel with Platt probability estimation). The consensus risk tier uses majority voting across Logistic Regression, Random Forest, and KNN, while SVM is available as an independent selectable model.")}
            </p>
          </div>

          {/* Card 3: Feature Explanations */}
          <div className="p-5 sm:p-6 rounded-2xl border border-[#E0DED7] bg-white space-y-3 shadow-xs">
            <div className="flex items-center gap-2.5 text-sm sm:text-base font-bold text-[#0F172A]">
              <BarChart2 size={17} className="text-[#BE123C] shrink-0" />
              <span>{t("landing.research.card3_title", "Feature Attribution Engine")}</span>
            </div>
            <p className="text-sm sm:text-[15px] text-[#334155] leading-relaxed">
              {t("landing.research.card3_desc", "Feature attributions are calculated via sampling-based marginal probability shifts against background reference distributions. A fixed random seed (seed 42) ensures identical explanation values for identical inputs. These attribution scores describe mathematical algorithm weighting within the model, not biological cause and effect.")}
            </p>
          </div>

          {/* Card 4: Performance & Boundaries */}
          <div className="p-5 sm:p-6 rounded-2xl border border-[#E0DED7] bg-white space-y-3 shadow-xs">
            <div className="flex items-center gap-2.5 text-sm sm:text-base font-bold text-[#0F172A]">
              <Shield size={17} className="text-[#BE123C] shrink-0" />
              <span>{t("landing.research.card4_title", "Performance & Population Boundaries")}</span>
            </div>
            <p className="text-sm sm:text-[15px] text-[#334155] leading-relaxed">
              {t("landing.research.card4_desc", "Model accuracy depends strictly on the dataset and evaluation protocol. Because the training data reflects a specific hospital referral cohort from 1988 with 302 unique records, evaluated test scores cannot be assumed to generalize to modern, diverse clinical patient populations. CardioScan is an educational exploration tool and is not clinically deployable or diagnostically validated.")}
            </p>
          </div>
        </div>

        {/* Secondary Expandable Deep-Dive for Interested Researchers */}
        <div className="border border-[#E0DED7] rounded-xl bg-white overflow-hidden text-start shadow-xs">
          <button
            type="button"
            onClick={() => setTechnicalDetailsExpanded(!technicalDetailsExpanded)}
            className="w-full p-4 sm:p-5 flex items-center justify-between hover:bg-[#FAF9F6] transition-colors"
            aria-expanded={technicalDetailsExpanded}
          >
            <div className="flex items-center gap-2.5 text-sm sm:text-base font-bold text-[#0F172A]">
              <Layers size={17} className="text-[#64748B] shrink-0" />
              <span>{t("landing.research.deep_dive_btn", "Deep-Dive Technical Specifications & Data Pipeline")}</span>
            </div>
            <span className="text-xs sm:text-sm text-[#BE123C] font-semibold flex items-center gap-1">
              <span>{technicalDetailsExpanded ? t("landing.research.hide_details", "Hide details") : t("landing.research.view_specs", "View technical specs")}</span>
              {technicalDetailsExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </span>
          </button>

          {technicalDetailsExpanded && (
            <div className="p-5 sm:p-6 border-t border-[#F0EFEA] bg-[#FAF9F6] space-y-4 text-sm text-[#334155] leading-relaxed">
              <div>
                <h4 className="font-semibold text-sm sm:text-base text-[#0F172A] mb-1">{t("landing.research.spec1_title", "Data Preprocessing & Normalization")}</h4>
                <p>
                  {t("landing.research.spec1_desc", "Continuous features (`age`, `trestbps`, `chol`, `thalach`, `oldpeak`) are standardized using `StandardScaler` fitted on the training split to prevent data leakage. Categorical predictors (`cp`, `restecg`, `slope`, `thal`) are numerically encoded adhering to original Cleveland Clinic protocols. Missing values in `ca` and `thal` are handled via median imputation.")}
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-sm sm:text-base text-[#0F172A] mb-1">{t("landing.research.spec2_title", "Voting Logic & Decision Thresholds")}</h4>
                <p>
                  {t("landing.research.spec2_desc", "The consensus ensemble evaluates the predictions of Logistic Regression, Random Forest, and KNN concurrently. If two or more models predict elevated risk (> 0.50 probability threshold), the consensus flag is assigned as positive. Standalone SVM operates with Platt scaling (probability=True) to output continuous probability estimates.")}
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-sm sm:text-base text-[#0F172A] mb-1">{t("landing.research.spec3_title", "Inference Performance")}</h4>
                <p>
                  {t("landing.research.spec3_desc", "The inference pipeline executes the complete 3-model ensemble and 13 feature attributions in milliseconds on standard hardware, enabling fluid updates in the What-If simulation workspace.")}
                </p>
              </div>

              <div className="pt-3 border-t border-[#E7E5DF] flex flex-wrap gap-2.5">
                <Link
                  to="/metrics"
                  className="px-3.5 py-2 rounded-lg border border-[#D5D2C9] bg-white text-[#0F172A] hover:bg-[#F4F2EC] font-semibold text-xs sm:text-sm flex items-center gap-1.5"
                >
                  <span>{t("landing.research.metrics_link", "Open Metrics & ROC Dashboard")}</span>
                  <ExternalLink size={13} />
                </Link>
                <Link
                  to="/data"
                  className="px-3.5 py-2 rounded-lg border border-[#D5D2C9] bg-white text-[#0F172A] hover:bg-[#F4F2EC] font-semibold text-xs sm:text-sm flex items-center gap-1.5"
                >
                  <span>{t("landing.research.data_link", "Explore Raw Dataset Distribution")}</span>
                  <ExternalLink size={13} />
                </Link>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── 8. Final CTA and Essential Safety / Privacy Information ───────── */}
      <section className="py-12 sm:py-14 px-4 sm:px-6 max-w-5xl mx-auto border-t border-[#E7E5DF]">
        <div className="border border-[#DCD9D1] rounded-2xl bg-white p-6 sm:p-10 text-start space-y-6 shadow-xs">
          <div className="max-w-2xl space-y-2.5">
            <span className="text-xs font-mono uppercase tracking-wider text-[#BE123C] font-semibold">
              {t("landing.cta.badge", "Ready to Explore?")}
            </span>
            <h2 className="text-2xl sm:text-3xl font-serif text-[#0F172A]">
              {t("landing.cta.title", "Understand what your numbers may be saying")}
            </h2>
            <p className="text-base sm:text-lg text-[#334155] leading-relaxed">
              {t("landing.cta.subtitle", "Gather numbers from your recent routine checkup or blood panel to see how machine-learning algorithms evaluate your cardiovascular profile.")}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="pt-1 flex flex-wrap items-center gap-3.5">
            <Link
              to="/predict"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-lg bg-[#0F172A] text-white text-sm sm:text-base font-semibold hover:bg-[#1E293B] transition-colors shadow-xs"
            >
              <span>{t("landing.nav.start_assessment", "Start Assessment")}</span>
              <ArrowRight size={15} />
            </Link>

            <Link
              to="/login"
              className="inline-flex items-center gap-2 px-5 py-3.5 rounded-lg border border-[#D5D2C9] bg-white text-[#1E293B] text-sm sm:text-base font-semibold hover:bg-[#FAF9F6] transition-colors"
            >
              <span>{t("landing.cta.signin_btn", "Sign in to Save History")}</span>
            </Link>
          </div>

          {/* Concise Safety and Privacy Information near CTA */}
          <div className="pt-3.5 border-t border-[#F0EFEA] space-y-2 text-sm text-[#334155] leading-relaxed">
            <div className="flex items-start gap-2">
              <span className="font-semibold text-[#0F172A] shrink-0 text-sm">{t("landing.cta.privacy_label", "Privacy:")}</span>
              <span>
                {t("landing.cta.privacy_text", "Assessments can be performed without providing your name, contact details, or personal identity. If you create an account to save history, your email is stored securely solely for authentication.")}
              </span>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-semibold text-[#0F172A] shrink-0 text-sm">{t("landing.cta.notice_label", "Notice:")}</span>
              <span>
                {t("landing.cta.notice_text", "CardioScan provides educational model estimates and does not diagnose disease or prescribe treatment. Always discuss clinical tests with a licensed healthcare provider.")}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ── 9. Minimal Respectful Footer ─────────────────────────────────── */}
      <footer className="border-t border-[#E7E5DF] bg-[#F4F2EC] py-12 px-4 sm:px-6 text-xs sm:text-sm text-[#475569]">
        <div className="max-w-5xl mx-auto space-y-6 text-start">
          {/* Complete Medical Disclaimer */}
          <div className="p-4 sm:p-5 rounded-xl border border-[#DFDCD3] bg-white text-xs sm:text-[13px] leading-relaxed text-[#475569] space-y-1.5">
            <span className="font-semibold text-xs sm:text-sm text-[#0F172A] block">{t("landing.footer.disclaimer_title", "Educational & Health Literacy Notice:")}</span>
            <p>
              {t("landing.footer.disclaimer_text", "CardioScan is strictly an educational tool designed to promote cardiovascular health literacy and demonstrate clinical machine learning methods. It is not an FDA-cleared diagnostic device and cannot substitute for professional medical advice, clinical diagnosis, or individualized treatment plans from a licensed healthcare provider. If you suspect you are experiencing symptoms of a heart attack or cardiovascular emergency, contact emergency services immediately.")}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
            <div>
              <span className="font-serif font-bold text-[#0F172A]">CardioScan</span>
              <span className="mx-2">·</span>
              <span>{t("landing.footer.project_desc", "An educational project for cardiovascular literacy")}</span>
              <span className="mx-2">·</span>
              <a
                href="https://www.linkedin.com/in/1905-abhishek/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#0F172A] hover:text-[#BE123C] font-semibold transition-colors"
              >
                {t("landing.footer.made_by", "Made by Abhishek")}
              </a>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs sm:text-sm">
              <a href="#research" className="hover:text-[#0F172A] transition-colors">
                {t("landing.footer.methodology", "Methodology")}
              </a>
              <Link to="/predict" className="hover:text-[#0F172A] transition-colors">
                {t("landing.footer.predictor", "Predictor")}
              </Link>
              <Link to="/metrics" className="hover:text-[#0F172A] transition-colors">
                {t("landing.footer.metrics", "Metrics")}
              </Link>
              <Link to="/data" className="hover:text-[#0F172A] transition-colors">
                {t("landing.footer.dataset", "Dataset")}
              </Link>
              <Link to="/privacy" className="hover:text-[#0F172A] transition-colors">
                {t("landing.footer.privacy", "Privacy Policy")}
              </Link>
              <Link to="/terms" className="hover:text-[#0F172A] transition-colors">
                {t("landing.footer.terms", "Terms & Conditions")}
              </Link>
              <Link to="/login" className="hover:text-[#0F172A] transition-colors">
                {t("landing.footer.signin", "Sign In")}
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
