import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { Heart, ArrowLeft, ShieldAlert, Cpu, CheckCircle2, AlertTriangle, FileText } from "lucide-react";

export default function TermsPage() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#1E293B] font-sans antialiased selection:bg-[#BE123C] selection:text-white">
      {/* ── 1. Header ──────────────────────────────────────────────────────── */}
      <header className="border-b border-[#E7E5DF] bg-[#FAF9F6]/95 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-7 h-7 rounded-lg bg-[#BE123C] text-white flex items-center justify-center transition-transform group-hover:scale-105 shadow-2xs">
              <Heart size={14} className="fill-white" />
            </div>
            <span className="font-serif font-bold text-lg tracking-tight text-[#0F172A]">
              Cardio<span className="text-[#BE123C]">Scan</span>
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-[#475569] hover:text-[#0F172A] px-3 py-1.5 rounded-lg hover:bg-[#F4F2EC] transition-colors"
            >
              <ArrowLeft size={13} />
              <span>Back to Home</span>
            </Link>

            <Link
              to="/predict"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#0F172A] text-white text-xs font-medium hover:bg-[#1E293B] transition-colors shadow-xs"
            >
              <span>Start Assessment</span>
            </Link>
          </div>
        </div>
      </header>

      {/* ── 2. Content ─────────────────────────────────────────────────────── */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-14 text-left space-y-8">
        {/* Title & Metadata */}
        <div className="space-y-3 border-b border-[#E7E5DF] pb-6">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-[#BE123C]/10 border border-[#BE123C]/20 text-[#BE123C] text-[11px] font-mono font-semibold tracking-wide uppercase">
            <FileText size={12} />
            <span>Legal Documentation</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-serif text-[#0F172A] tracking-tight">
            Terms & Conditions
          </h1>

          <p className="text-xs text-[#64748B]">
            Effective Date: October 11, 2026 · Version 1.0 (Educational Scope)
          </p>
        </div>

        {/* Advisory Callout */}
        <div className="p-4 sm:p-5 rounded-xl border border-amber-200 bg-amber-50/60 text-xs text-amber-950 space-y-2">
          <div className="flex items-center gap-2 font-bold text-amber-900">
            <AlertTriangle size={15} className="shrink-0 text-amber-700" />
            <span>Educational Research Terms & Owner Review Required</span>
          </div>
          <p className="leading-relaxed">
            CardioScan is strictly an academic demonstration and health literacy educational tool. By accessing or using this application, you acknowledge and agree that CardioScan does not provide medical diagnosis, treatment, or clinical patient management. Statements in these Terms require formal legal review by the application owner before commercial launch.
          </p>
        </div>

        {/* Section 1: Agreement */}
        <section className="space-y-3">
          <h2 className="text-xl font-serif font-bold text-[#0F172A]">
            1. Agreement to Terms
          </h2>
          <p className="text-xs sm:text-sm text-[#475569] leading-relaxed">
            By visiting the CardioScan website, interacting with its simulation leavers, or running cardiovascular model evaluations, you signify your agreement to these Terms & Conditions. If you do not agree with any part of these terms, you should not access or use the application.
          </p>
        </section>

        {/* Section 2: Non-Medical Nature */}
        <section className="space-y-3">
          <h2 className="text-xl font-serif font-bold text-[#0F172A]">
            2. Purely Educational and Non-Medical Nature
          </h2>
          <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/50 text-xs text-rose-950 space-y-2">
            <div className="flex items-center gap-2 font-bold text-rose-900">
              <ShieldAlert size={15} className="text-[#BE123C]" />
              <span>Critical Health Disclaimer</span>
            </div>
            <p className="leading-relaxed">
              CardioScan is NOT an FDA-cleared, CE-marked, or clinically validated medical device. It is NOT intended to diagnose, cure, mitigate, treat, or prevent any cardiovascular disease or medical condition. Outputs provided by CardioScan represent mathematical pattern recognition and must never replace an individualized clinical consultation, physical exam, or laboratory diagnosis by a licensed physician or cardiologist.
            </p>
          </div>
        </section>

        {/* Section 3: Emergency Situations */}
        <section className="space-y-3">
          <h2 className="text-xl font-serif font-bold text-[#0F172A]">
            3. Medical Emergencies
          </h2>
          <p className="text-xs sm:text-sm text-[#475569] leading-relaxed">
            Never disregard professional medical advice or delay seeking urgent medical attention because of information viewed on CardioScan. If you are experiencing symptoms of an acute myocardial infarction (heart attack), severe chest tightness, pain radiating down the left arm or jaw, unexplained breathlessness, cold sweats, or dizziness, call emergency services (such as 911 or 112) or proceed to the nearest emergency room immediately.
          </p>
        </section>

        {/* Section 4: Machine Learning Model Boundaries */}
        <section className="space-y-3">
          <h2 className="text-xl font-serif font-bold text-[#0F172A]">
            4. Machine Learning Model Scope & Scientific Boundaries
          </h2>
          <p className="text-xs sm:text-sm text-[#475569] leading-relaxed">
            CardioScan’s computational predictions are subject to explicit scientific boundaries:
          </p>
          <ul className="space-y-2 text-xs sm:text-sm text-[#475569] leading-relaxed">
            <li className="flex items-start gap-2">
              <span className="text-[#BE123C] font-bold">•</span>
              <span>
                <strong>Historical Dataset Origin:</strong> Models are trained on the 1988 Cleveland Clinic Foundation benchmark cohort in the UCI Machine Learning Repository. The source dataset contains 1,025 rows, resolving to 302 unique records after exact duplicate removal. Evaluated test metrics cannot be presumed to generalize to modern, diverse global populations.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#BE123C] font-bold">•</span>
              <span>
                <strong>Model Architecture:</strong> Predictions are computed via a three-model consensus ensemble (Logistic Regression, Random Forest, and K-Nearest Neighbors) evaluated via majority voting, alongside an independently selectable Support Vector Machine (SVM).
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#BE123C] font-bold">•</span>
              <span>
                <strong>Attribution vs. Biological Causation:</strong> Feature contribution scores show algorithm weighting within training records; they do not establish biological cause and effect in any human individual.
              </span>
            </li>
          </ul>
        </section>

        {/* Section 5: Acceptable Use */}
        <section className="space-y-3">
          <h2 className="text-xl font-serif font-bold text-[#0F172A]">
            5. Acceptable Use
          </h2>
          <p className="text-xs sm:text-sm text-[#475569] leading-relaxed">
            You agree to use CardioScan solely for personal educational exploration, academic study, and health awareness. You agree not to:
          </p>
          <ul className="space-y-1.5 text-xs sm:text-sm text-[#475569] leading-relaxed">
            <li className="flex items-start gap-2">
              <span className="text-[#BE123C] font-bold">•</span>
              <span>Deploy or use CardioScan in clinical workflows or patient care triage without regulatory authorization.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#BE123C] font-bold">•</span>
              <span>Probe, scan, or reverse-engineer the API backend through automated denial-of-service scripts.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#BE123C] font-bold">•</span>
              <span>Submit malicious payloads or false identity tokens during authentication.</span>
            </li>
          </ul>
        </section>

        {/* Section 6: Accounts & Passwords */}
        <section className="space-y-3">
          <h2 className="text-xl font-serif font-bold text-[#0F172A]">
            6. User Accounts and Credentials
          </h2>
          <p className="text-xs sm:text-sm text-[#475569] leading-relaxed">
            If you create an account, you are responsible for maintaining the confidentiality of your login credentials. You are responsible for all activities that occur under your authenticated session. You agree to notify us immediately of any unauthorized account access.
          </p>
        </section>

        {/* Section 7: Warranties & Liability */}
        <section className="space-y-3">
          <h2 className="text-xl font-serif font-bold text-[#0F172A]">
            7. Disclaimer of Warranties and Limitation of Liability
          </h2>
          <p className="text-xs sm:text-sm text-[#475569] leading-relaxed">
            CardioScan is provided on an &quot;AS IS&quot; and &quot;AS AVAILABLE&quot; basis without warranties of any kind, whether express or implied, including warranties of merchantability, fitness for a particular clinical purpose, or non-infringement. In no event shall the authors, maintainers, or contributors of CardioScan be liable for any direct, indirect, incidental, special, or consequential damages arising out of your use of or reliance on the estimates produced by this educational tool.
          </p>
        </section>

        {/* Section 8: Inquiries */}
        <section className="space-y-3 pt-4 border-t border-[#E7E5DF]">
          <h2 className="text-xl font-serif font-bold text-[#0F172A]">
            8. Questions and Project Inquiries
          </h2>
          <p className="text-xs sm:text-sm text-[#475569] leading-relaxed">
            For academic questions or technical feedback regarding these Terms, contact:
          </p>
          <p className="text-xs font-mono text-[#0F172A] bg-white p-3 rounded-lg border border-[#E0DED7] inline-block">
            Project Contact: admin@example.com
          </p>
        </section>
      </main>

      {/* ── 3. Footer ──────────────────────────────────────────────────────── */}
      <footer className="border-t border-[#E7E5DF] bg-[#F4F2EC] py-8 px-4 sm:px-6 text-xs text-[#64748B]">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-left">
          <div>
            <span className="font-serif font-bold text-[#0F172A]">CardioScan</span>
            <span className="mx-2">·</span>
            <span>Cardiovascular Health & ML Exploration</span>
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <Link to="/" className="hover:text-[#0F172A] transition-colors">Home</Link>
            <Link to="/privacy" className="hover:text-[#0F172A] transition-colors">Privacy Policy</Link>
            <Link to="/terms" className="text-[#BE123C] font-semibold">Terms & Conditions</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
