import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Heart, Mail, ArrowLeft, CheckCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { forgotPassword } from "../api";
import { auth, sendPasswordResetEmail } from "../firebase";
import LanguageSwitcher from "../components/LanguageSwitcher";

function LeftPanel() {
  const { t } = useTranslation();

  return (
    <div className="hidden lg:flex lg:col-span-5 flex-col justify-between p-10 xl:p-12 glossy-panel text-[#35483E] relative overflow-hidden text-start">
      {/* Brand Header */}
      <div className="space-y-4 relative z-10">
        <Link to="/" className="inline-flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-[#35483E] text-white flex items-center justify-center transition-transform group-hover:scale-105 shadow-xs">
            <Heart size={18} className="fill-[#D9A19A] text-[#D9A19A]" />
          </div>
          <div>
            <span className="font-serif font-bold text-2xl tracking-tight text-[#35483E] block">
              Cardio<span className="text-[#B35D52]">Scan</span>
            </span>
          </div>
        </Link>

        <div className="pt-2">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-[#D6E3D8] border border-[#C5D5C8] text-[#35483E] text-xs font-mono font-semibold tracking-wide uppercase">
            {t("auth.panel_badge", "Cardiovascular Health & ML")}
          </span>
        </div>
      </div>

      {/* Center Copy & Editorial Highlights */}
      <div className="my-auto py-8 space-y-7 relative z-10">
        <div className="space-y-3">
          <h2 className="font-serif text-3xl xl:text-4xl font-bold text-[#35483E] leading-tight">
            {t("auth.forgot_panel_title", "Account security & password recovery.")}
          </h2>
          <p className="text-[#52665A] text-sm leading-relaxed max-w-md">
            {t(
              "auth.forgot_panel_desc",
              "Securely recover access to your CardioScan assessment history and saved patient models with verified email instructions."
            )}
          </p>
        </div>

        {/* Steps editorial section */}
        <div className="pt-2 space-y-4">
          <div className="flex items-center gap-2">
            <span className="h-px w-6 bg-[#C5D5C8]" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#35483E]">
              {t("auth.forgot_panel_section_title", "Password recovery steps")}
            </h3>
            <span className="h-px flex-1 bg-[#C5D5C8]" />
          </div>

          <div className="space-y-3.5">
            {/* Step 1 */}
            <div className="flex items-start gap-3.5 text-start">
              <span className="font-mono text-xs font-bold text-[#B35D52] mt-0.5 px-2 py-0.5 rounded bg-[#DCE7DE] border border-[#CCDCD0] shrink-0">
                01
              </span>
              <div className="space-y-0.5">
                <h4 className="font-semibold text-xs text-[#35483E]">
                  {t("auth.forgot_step1_title", "Verified email delivery")}
                </h4>
                <p className="text-[12px] text-[#52665A] leading-relaxed">
                  {t(
                    "auth.forgot_step1_desc",
                    "A secure, single-use reset link is dispatched directly to your registered inbox."
                  )}
                </p>
              </div>
            </div>

            <div className="border-t border-[#D5E1D7] w-full" />

            {/* Step 2 */}
            <div className="flex items-start gap-3.5 text-start">
              <span className="font-mono text-xs font-bold text-[#B35D52] mt-0.5 px-2 py-0.5 rounded bg-[#DCE7DE] border border-[#CCDCD0] shrink-0">
                02
              </span>
              <div className="space-y-0.5">
                <h4 className="font-semibold text-xs text-[#35483E]">
                  {t("auth.forgot_step2_title", "Confidential recovery")}
                </h4>
                <p className="text-[12px] text-[#52665A] leading-relaxed">
                  {t(
                    "auth.forgot_step2_desc",
                    "Account data and saved assessments remain protected throughout the reset process."
                  )}
                </p>
              </div>
            </div>

            <div className="border-t border-[#D5E1D7] w-full" />

            {/* Step 3 */}
            <div className="flex items-start gap-3.5 text-start">
              <span className="font-mono text-xs font-bold text-[#B35D52] mt-0.5 px-2 py-0.5 rounded bg-[#DCE7DE] border border-[#CCDCD0] shrink-0">
                03
              </span>
              <div className="space-y-0.5">
                <h4 className="font-semibold text-xs text-[#35483E]">
                  {t("auth.forgot_step3_title", "Immediate resumption")}
                </h4>
                <p className="text-[12px] text-[#52665A] leading-relaxed">
                  {t(
                    "auth.forgot_step3_desc",
                    "Update your credentials and return directly to your educational dashboard."
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Editorial Disclaimer */}
      <div className="pt-6 border-t border-[#D3DFD5] relative z-10">
        <p className="text-xs text-[#52665A] leading-relaxed italic">
          {t(
            "auth.panel_quote",
            "Educational tool for cardiovascular literacy and statistical machine-learning exploration. Non-diagnostic."
          )}
        </p>
      </div>
    </div>
  );
}

export default function ForgotPasswordPage() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  // Safe visual inspection flag
  const isTestSent =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("test_sent") === "true";
  const [sent, setSent] = useState(isTestSent);
  const [sentEmail, setSentEmail] = useState(isTestSent ? "alex.doe@example.com" : "");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      try {
        await sendPasswordResetEmail(auth, email.trim());
      } catch (fbErr) {
        if (fbErr.code === "auth/invalid-email") {
          toast.error(t("auth.invalid_email", "Please enter a valid email address."));
          setLoading(false);
          return;
        }
        // Fallback for native CardioScan accounts
        try {
          await forgotPassword(email.trim());
        } catch (_) {}
      }
      setSentEmail(email.trim());
      setSent(true);
    } catch (err) {
      toast.error(t("auth.something_went_wrong", "Something went wrong. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="min-h-screen bg-[#F7F5F0] text-[#35483E] flex flex-col justify-between p-3.5 sm:p-6 lg:p-10 selection:bg-[#E4EDE5] selection:text-[#35483E] w-full min-w-0 max-w-full overflow-x-hidden">
        {/* Top Header */}
        <header className="w-full max-w-md mx-auto flex items-center justify-between py-2 mb-3 min-w-0">
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-[#52665A] hover:text-[#35483E] transition-colors py-1 px-1 rounded-md"
          >
            <ArrowLeft size={15} className="rtl:rotate-180" />
            <span>{t("auth.back_login", "Back to Login")}</span>
          </Link>
          <LanguageSwitcher variant="sage" />
        </header>

        {/* Central Confirmation Card */}
        <main className="w-full max-w-md mx-auto my-auto py-2 sm:py-4 min-w-0">
          {/* Mobile Identity */}
          <div className="flex justify-center items-center gap-2.5 mb-6">
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="w-8 h-8 rounded-lg bg-[#35483E] text-white flex items-center justify-center shadow-xs">
                <Heart size={16} className="fill-[#D9A19A] text-[#D9A19A]" />
              </div>
              <span className="font-serif font-bold text-xl text-[#35483E]">
                Cardio<span className="text-[#B35D52]">Scan</span>
              </span>
            </Link>
          </div>

          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 220, damping: 20 }}
            className="glossy-card rounded-2xl p-6 sm:p-8 text-center relative w-full max-w-full"
          >
            <div className="glossy-sheen-sweep" />

            {/* Restrained Success Indicator */}
            <div className="w-16 h-16 rounded-2xl bg-[#E4EDE5] border border-[#D3DFD5] flex items-center justify-center mx-auto mb-4 shadow-xs">
              <CheckCircle size={32} className="text-[#35483E]" />
            </div>

            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#35483E] tracking-tight mb-2">
              {t("auth.check_email", "Check your email!")}
            </h1>

            <p className="text-sm text-[#52665A] mb-2 leading-relaxed">
              {t("auth.reset_link_sent_to", "We sent a password reset link to:")}
            </p>

            {/* Email Pill Badge */}
            <div className="font-mono font-semibold text-xs sm:text-sm text-[#35483E] dark:text-[#F2F3F3] bg-[#FAF8F5] dark:bg-[#202326] border border-[#E5E0D6] dark:border-[#373C40] px-3.5 py-1.5 rounded-lg inline-block my-3 break-all shadow-2xs">
              {sentEmail || email}
            </div>

            <p className="text-xs text-[#52665A] dark:text-[#B2B7BB] mb-6 leading-relaxed max-w-xs mx-auto">
              {t(
                "auth.reset_email_instruction",
                "Click the link in the email to reset your password. Check your spam folder if you do not see it within a few minutes."
              )}
            </p>

            {/* Return to Login Action Button */}
            <div className="space-y-3 pt-2">
              <Link
                to="/login"
                className="w-full h-11 rounded-xl glossy-btn-primary text-white text-sm font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#35483E]/30 focus:ring-offset-2"
              >
                <ArrowLeft size={16} className="rtl:rotate-180 shrink-0" />
                <span>{t("auth.back_login", "Back to Login")}</span>
              </Link>

              <button
                type="button"
                onClick={() => {
                  setSent(false);
                  setEmail("");
                }}
                className="w-full h-10 rounded-xl glossy-btn-secondary text-[#35483E] dark:text-[#F2F3F3] text-xs font-semibold cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-[#35483E]/20"
              >
                <span>{t("auth.request_new_link", "Request a new reset link")}</span>
              </button>
            </div>
          </motion.div>
        </main>

        {/* Footer */}
        <footer className="w-full max-w-md mx-auto py-2 text-center text-xs text-[#52665A]/80">
          <p>© {new Date().getFullYear()} CardioScan · {t("auth.brand_subtitle", "Cardiovascular ML")}</p>
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F5F0] text-[#35483E] grid grid-cols-1 lg:grid-cols-12 selection:bg-[#E4EDE5] selection:text-[#35483E] w-full max-w-full overflow-x-hidden">
      {/* Left Editorial Panel (lg only) */}
      <LeftPanel />

      {/* Right Form Panel */}
      <div className="lg:col-span-7 flex flex-col justify-between min-h-screen p-3.5 sm:p-6 lg:p-10 w-full min-w-0 max-w-full">
        {/* Top Header Navigation */}
        <header className="w-full max-w-md mx-auto flex items-center justify-between py-2 mb-3 min-w-0">
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-[#52665A] hover:text-[#35483E] transition-colors py-1 px-1 rounded-md"
          >
            <ArrowLeft size={15} className="rtl:rotate-180" />
            <span>{t("auth.back_login", "Back to Login")}</span>
          </Link>

          <LanguageSwitcher variant="sage" />
        </header>

        {/* Central Form Container */}
        <main className="w-full max-w-md mx-auto my-auto py-2 sm:py-4 min-w-0">
          {/* Mobile Identity */}
          <div className="lg:hidden flex items-center gap-2.5 mb-5">
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="w-8 h-8 rounded-lg bg-[#35483E] text-white flex items-center justify-center shadow-xs">
                <Heart size={16} className="fill-[#D9A19A] text-[#D9A19A]" />
              </div>
              <span className="font-serif font-bold text-xl text-[#35483E]">
                Cardio<span className="text-[#B35D52]">Scan</span>
              </span>
            </Link>
          </div>

          <div className="glossy-card rounded-2xl p-5 sm:p-8 text-start relative w-full max-w-full">
            <div className="glossy-sheen-sweep" />
            {/* Title & Subtitle */}
            <div className="mb-6 space-y-1.5">
              <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#35483E] tracking-tight">
                {t("auth.forgot_title", "Forgot password?")}
              </h1>
              <p className="text-sm text-[#52665A] leading-relaxed">
                {t("auth.forgot_sub", "Enter your email and we'll send you a reset link")}
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label
                  htmlFor="email"
                  className="block text-xs font-semibold uppercase tracking-wider text-[#35483E] dark:text-[#F2F3F3]"
                >
                  {t("auth.email", "Email")}
                </label>
                <div className="relative group">
                  <Mail
                    size={16}
                    className="absolute left-3.5 rtl:left-auto rtl:right-3.5 top-1/2 -translate-y-1/2 text-[#52665A] dark:text-[#8C9399] group-focus-within:text-[#35483E] dark:group-focus-within:text-[#789580] transition-colors pointer-events-none"
                  />
                  <input
                    id="email"
                    type="email"
                    name="email"
                    autoComplete="email"
                    enterKeyHint="done"
                    placeholder={t("auth.email_placeholder", "name@example.com")}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full h-11 px-3.5 pl-10 rtl:pl-3.5 rtl:pr-10 rounded-xl glossy-input text-[#35483E] dark:text-[#F2F3F3] dark:bg-[#202326] dark:border-[#373C40] dark:focus:border-[#789580] text-sm placeholder:text-[#8A9990] dark:placeholder:text-[#8C9399] focus:outline-none transition-all shadow-2xs"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading || !email.trim()}
                  className="w-full h-11 rounded-xl glossy-btn-primary text-white text-sm font-semibold transition-all flex items-center justify-center gap-2.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#35483E]/30 focus:ring-offset-2"
                >
                  {loading ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                        className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full shrink-0"
                      />
                      <span>{t("auth.sending", "Sending...")}</span>
                    </>
                  ) : (
                    <>
                      <Mail size={16} className="shrink-0" />
                      <span>{t("auth.send_reset", "Send Reset Link")}</span>
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Back to Login Link */}
            <div className="mt-6 pt-5 border-t border-[#E5E0D6] text-center">
              <p className="text-xs sm:text-sm text-[#52665A]">
                {t("auth.have_account", "Already have an account?")}{" "}
                <Link
                  to="/login"
                  className="font-semibold text-[#35483E] hover:text-[#1E2B24] underline underline-offset-4 decoration-[#C5D5C8] hover:decoration-[#35483E] transition-colors inline-flex items-center gap-1"
                >
                  <span>{t("auth.sign_in", "Sign In")}</span>
                </Link>
              </p>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="w-full max-w-md mx-auto py-2 text-center text-xs text-[#52665A]/80">
          <p>© {new Date().getFullYear()} CardioScan · {t("auth.brand_subtitle", "Cardiovascular ML")}</p>
        </footer>
      </div>
    </div>
  );
}
