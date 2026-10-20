import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { Heart, ArrowLeft, Shield, Lock, Eye, Database, FileText, AlertCircle } from "lucide-react";

export default function PrivacyPage() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-[#FAF9F6] dark:bg-[#17191B] text-[#1E293B] dark:text-[#F2F3F3] font-sans antialiased selection:bg-[#BE123C] selection:text-white">
      {/* ── 1. Header ──────────────────────────────────────────────────────── */}
      <header className="border-b border-[#E7E5DF] dark:border-[#373C40] bg-[#FAF9F6]/95 dark:bg-[#17191B]/95 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-7 h-7 rounded-lg bg-[#BE123C] text-white flex items-center justify-center transition-transform group-hover:scale-105 shadow-2xs">
              <Heart size={14} className="fill-white" />
            </div>
            <span className="font-serif font-bold text-lg tracking-tight text-[#0F172A] dark:text-[#F2F3F3]">
              Cardio<span className="text-[#BE123C]">Scan</span>
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-[#475569] dark:text-[#B2B7BB] hover:text-[#0F172A] dark:hover:text-[#F2F3F3] px-3 py-1.5 rounded-lg hover:bg-[#F4F2EC] dark:hover:bg-[#282C30] transition-colors"
            >
              <ArrowLeft size={13} />
              <span>Back to Home</span>
            </Link>

            <Link
              to="/predict"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#0F172A] text-white text-xs font-medium hover:bg-[#1E293B] dark:bg-[#789580] dark:text-[#111315] dark:hover:bg-[#8BA792] transition-colors shadow-xs"
            >
              <span>Start Assessment</span>
            </Link>
          </div>
        </div>
      </header>

      {/* ── 2. Content ─────────────────────────────────────────────────────── */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-14 text-left space-y-8">
        {/* Title & Metadata */}
        <div className="space-y-3 border-b border-[#E7E5DF] dark:border-[#373C40] pb-6">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-[#BE123C]/10 border border-[#BE123C]/20 text-[#BE123C] text-[11px] font-mono font-semibold tracking-wide uppercase">
            <Shield size={12} />
            <span>Legal Documentation</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-serif text-[#0F172A] dark:text-[#F2F3F3] tracking-tight">
            Privacy Policy
          </h1>

          <p className="text-xs text-[#64748B] dark:text-[#8C9399]">
            Effective Date: October 11, 2026 · Version 1.0 (Educational Scope)
          </p>
        </div>

        {/* Advisory Callout */}
        <div className="p-4 sm:p-5 rounded-xl border border-amber-200 bg-amber-50/60 dark:border-[#574422] dark:bg-[#2F2618] text-xs text-amber-950 dark:text-[#FEF3C7] space-y-2">
          <div className="flex items-center gap-2 font-bold text-amber-900 dark:text-[#FDE68A]">
            <AlertCircle size={15} className="shrink-0 text-amber-700 dark:text-[#FCD34D]" />
            <span>Educational Research Notice & Owner Review Required</span>
          </div>
          <p className="leading-relaxed">
            CardioScan is strictly an educational tool and machine-learning research exploration project. It is not a commercial clinical service, healthcare provider, or medical device. This policy describes our actual current data practices based on the application’s technical implementation. Statements in this document require formal legal and administrative review by the project owner before commercial deployment.
          </p>
        </div>

        {/* Section 1: Scope */}
        <section className="space-y-3">
          <h2 className="text-xl font-serif font-bold text-[#0F172A] dark:text-[#F2F3F3]">
            1. Scope and Purpose
          </h2>
          <p className="text-xs sm:text-sm text-[#475569] dark:text-[#B2B7BB] leading-relaxed">
            This Privacy Policy explains how CardioScan handles data when you visit our website, use our interactive cardiovascular risk simulation, or create an account. We are committed to transparency, data minimization, and truthful representation of how your information is handled.
          </p>
        </section>

        {/* Section 2: Anonymous vs Authenticated */}
        <section className="space-y-3">
          <h2 className="text-xl font-serif font-bold text-[#0F172A] dark:text-[#F2F3F3]">
            2. Anonymous Assessments vs. Account-Based Features
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            <div className="p-4 rounded-xl border border-[#E0DED7] dark:border-[#373C40] bg-white dark:bg-[#202326] space-y-2 shadow-2xs">
              <div className="flex items-center gap-2 text-xs font-bold text-[#0F172A] dark:text-[#F2F3F3]">
                <Eye size={14} className="text-[#BE123C] dark:text-[#D9A19A]" />
                <span>Anonymous Assessments</span>
              </div>
              <p className="text-xs text-[#475569] dark:text-[#B2B7BB] leading-relaxed">
                You can run cardiovascular assessments completely anonymously. We do not require your name, email address, government identifier, or telephone number. For unauthenticated sessions, the 13 clinical measurements you enter are evaluated in-memory by our machine learning models and are not saved in our database.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-[#E0DED7] dark:border-[#373C40] bg-white dark:bg-[#202326] space-y-2 shadow-2xs">
              <div className="flex items-center gap-2 text-xs font-bold text-[#0F172A] dark:text-[#F2F3F3]">
                <Database size={14} className="text-[#BE123C] dark:text-[#D9A19A]" />
                <span>Account-Based History</span>
              </div>
              <p className="text-xs text-[#475569] dark:text-[#B2B7BB] leading-relaxed">
                If you choose to create an account or sign in with Google, we store your account profile (email and name) and associate your prediction assessments with your user account ID. This enables you to track historical estimates, compare profiles, and view past feature attributions in your History dashboard.
              </p>
            </div>
          </div>
        </section>

        {/* Section 3: Information We Collect */}
        <section className="space-y-3">
          <h2 className="text-xl font-serif font-bold text-[#0F172A] dark:text-[#F2F3F3]">
            3. Information We Collect
          </h2>
          <ul className="space-y-2.5 text-xs sm:text-sm text-[#475569] dark:text-[#B2B7BB] leading-relaxed">
            <li className="flex items-start gap-2">
              <span className="text-[#BE123C] dark:text-[#D9A19A] font-bold">•</span>
              <span>
                <strong>Account Information:</strong> When registering, we collect your email address, display name, and a securely salted password hash (via bcrypt). If you sign in via Google OAuth, we receive your email, display name, and Firebase User ID.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#BE123C] dark:text-[#D9A19A] font-bold">•</span>
              <span>
                <strong>Cardiovascular Assessment Signals:</strong> The 13 standard clinical parameters you provide for evaluation (such as age, resting blood pressure, total cholesterol, resting ECG rhythm, and exercise ST depression).
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#BE123C] dark:text-[#D9A19A] font-bold">•</span>
              <span>
                <strong>PDF Report Inputs:</strong> When generating a client-side clinical report, you may enter a patient name for the printout. This name is processed locally inside your browser and is not stored in our database.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#BE123C] dark:text-[#D9A19A] font-bold">•</span>
              <span>
                <strong>Technical and Security Metadata:</strong> IP addresses, browser user-agents, and bot-verification tokens processed during authentication requests to prevent abuse.
              </span>
            </li>
          </ul>
        </section>

        {/* Section 4: Sub-processors */}
        <section className="space-y-3">
          <h2 className="text-xl font-serif font-bold text-[#0F172A] dark:text-[#F2F3F3]">
            4. Third-Party Service Providers (Sub-Processors)
          </h2>
          <p className="text-xs sm:text-sm text-[#475569] dark:text-[#B2B7BB] leading-relaxed">
            We partner with reliable infrastructure providers to deliver authentication, bot protection, and transactional notifications:
          </p>
          <div className="space-y-2 text-xs text-[#475569] dark:text-[#B2B7BB]">
            <div className="p-3 rounded-lg border border-[#E7E5DF] dark:border-[#373C40] bg-white dark:bg-[#202326] flex items-start gap-3">
              <Lock size={15} className="text-[#64748B] dark:text-[#8C9399] shrink-0 mt-0.5" />
              <div>
                <strong className="text-[#0F172A] dark:text-[#F2F3F3] block">Firebase Authentication (Google LLC)</strong>
                <span>Provides federated identity tokens, Google Sign-In, and account credential security.</span>
              </div>
            </div>
            <div className="p-3 rounded-lg border border-[#E7E5DF] dark:border-[#373C40] bg-white dark:bg-[#202326] flex items-start gap-3">
              <Shield size={15} className="text-[#64748B] dark:text-[#8C9399] shrink-0 mt-0.5" />
              <div>
                <strong className="text-[#0F172A] dark:text-[#F2F3F3] block">Cloudflare Turnstile</strong>
                <span>Provides privacy-preserving CAPTCHA verification without collecting behavioral tracking cookies.</span>
              </div>
            </div>
            <div className="p-3 rounded-lg border border-[#E7E5DF] dark:border-[#373C40] bg-white dark:bg-[#202326] flex items-start gap-3">
              <FileText size={15} className="text-[#64748B] dark:text-[#8C9399] shrink-0 mt-0.5" />
              <div>
                <strong className="text-[#0F172A] dark:text-[#F2F3F3] block">Resend</strong>
                <span>Dispatches transactional account verification emails and password reset instructions.</span>
              </div>
            </div>
          </div>
        </section>

        {/* Section 5: Data Retention & User Rights */}
        <section className="space-y-3">
          <h2 className="text-xl font-serif font-bold text-[#0F172A] dark:text-[#F2F3F3]">
            5. Data Retention and Your Rights
          </h2>
          <p className="text-xs sm:text-sm text-[#475569] dark:text-[#B2B7BB] leading-relaxed">
            You retain ownership and control of your account data:
          </p>
          <ul className="space-y-2 text-xs sm:text-sm text-[#475569] dark:text-[#B2B7BB] leading-relaxed">
            <li className="flex items-start gap-2">
              <span className="text-[#BE123C] dark:text-[#D9A19A] font-bold">•</span>
              <span>
                <strong>Right to Access:</strong> You can view all saved prediction records and feature attributions in your History page at any time.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#BE123C] dark:text-[#D9A19A] font-bold">•</span>
              <span>
                <strong>Right to Deletion:</strong> You can delete individual prediction records or delete your entire account through the Profile settings. Account deletion triggers an immediate cascade delete that permanently erases all associated prediction records from our database.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#BE123C] dark:text-[#D9A19A] font-bold">•</span>
              <span>
                <strong>No Data Selling:</strong> We do not sell, rent, monetize, or broker personal data or health measurements to third parties or advertisers.
              </span>
            </li>
          </ul>
        </section>

        {/* Section 6: Medical Disclaimer */}
        <section className="space-y-3">
          <h2 className="text-xl font-serif font-bold text-[#0F172A] dark:text-[#F2F3F3]">
            6. Medical Data and HIPAA Disclaimer
          </h2>
          <p className="text-xs sm:text-sm text-[#475569] dark:text-[#B2B7BB] leading-relaxed">
            CardioScan is not a covered entity under the Health Insurance Portability and Accountability Act (HIPAA) or an accredited medical diagnostic laboratory. CardioScan provides statistical machine-learning estimates for educational exploration only. You should not submit confidential medical records, protected health information (PHI), or emergency health data to this platform.
          </p>
        </section>

        {/* Section 7: Inquiries */}
        <section className="space-y-3 pt-4 border-t border-[#E7E5DF] dark:border-[#373C40]">
          <h2 className="text-xl font-serif font-bold text-[#0F172A] dark:text-[#F2F3F3]">
            7. Contact and Project Governance
          </h2>
          <p className="text-xs sm:text-sm text-[#475569] dark:text-[#B2B7BB] leading-relaxed">
            For questions regarding this privacy policy or to exercise your data deletion rights, contact the project administrator:
          </p>
          <p className="text-xs font-mono text-[#0F172A] dark:text-[#F2F3F3] bg-white dark:bg-[#202326] p-3 rounded-lg border border-[#E0DED7] dark:border-[#373C40] inline-block">
            Project Contact: {process.env.REACT_APP_CONTACT_EMAIL || "contact@cardioscan.app"}
          </p>
        </section>
      </main>

      {/* ── 3. Footer ──────────────────────────────────────────────────────── */}
      <footer className="border-t border-[#E7E5DF] dark:border-[#373C40] bg-[#F4F2EC] dark:bg-[#111315] py-8 px-4 sm:px-6 text-xs text-[#64748B] dark:text-[#8C9399]">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-left">
          <div>
            <span className="font-serif font-bold text-[#0F172A] dark:text-[#F2F3F3]">CardioScan</span>
            <span className="mx-2">·</span>
            <span>Cardiovascular Health & ML Exploration</span>
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <Link to="/" className="hover:text-[#0F172A] dark:hover:text-[#F2F3F3] transition-colors">Home</Link>
            <Link to="/privacy" className="text-[#BE123C] dark:text-[#D9A19A] font-semibold">Privacy Policy</Link>
            <Link to="/terms" className="hover:text-[#0F172A] dark:hover:text-[#F2F3F3] transition-colors">Terms & Conditions</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
