import React, { useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { Heart, Lock, CheckCircle, AlertCircle, ArrowLeft, Eye, EyeOff, LogIn } from "lucide-react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { resetPassword } from "../api";
import { auth, confirmPasswordReset } from "../firebase";
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
            {t("auth.reset_panel_title", "Create your new password.")}
          </h2>
          <p className="text-[#52665A] text-sm leading-relaxed max-w-md">
            {t(
              "auth.reset_panel_desc",
              "Choose a strong, unique password to secure your CardioScan profile and educational assessment records."
            )}
          </p>
        </div>

        {/* Steps editorial section */}
        <div className="pt-2 space-y-4">
          <div className="flex items-center gap-2">
            <span className="h-px w-6 bg-[#C5D5C8]" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#35483E]">
              {t("auth.reset_panel_section_title", "Password standards")}
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
                  {t("auth.reset_step1_title", "Minimum 6 characters")}
                </h4>
                <p className="text-[12px] text-[#52665A] leading-relaxed">
                  {t(
                    "auth.reset_step1_desc",
                    "Required baseline for educational account security."
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
                  {t("auth.reset_step2_title", "Instant update")}
                </h4>
                <p className="text-[12px] text-[#52665A] leading-relaxed">
                  {t(
                    "auth.reset_step2_desc",
                    "Your new password takes effect immediately across all sessions."
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
                  {t("auth.reset_step3_title", "Direct access")}
                </h4>
                <p className="text-[12px] text-[#52665A] leading-relaxed">
                  {t(
                    "auth.reset_step3_desc",
                    "Sign in immediately upon completing the password update."
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

export default function ResetPasswordPage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const [form, setForm] = useState({ password: "", confirm: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Test inspection flags for safe browser verification
  const isTestToken = searchParams.get("test_token") === "true";
  const isTestDone = searchParams.get("test_done") === "true";

  const [done, setDone] = useState(isTestDone);
  const token = searchParams.get("token");
  const oobCode = searchParams.get("oobCode");
  const resetCode = isTestToken ? "test_code_valid" : oobCode || token;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirm) {
      toast.error(t("auth.passwords_do_not_match", "Passwords do not match."));
      return;
    }
    if (form.password.length < 6) {
      toast.error(t("auth.password_too_short", "Password must be at least 6 characters"));
      return;
    }
    setLoading(true);
    try {
      if (oobCode) {
        await confirmPasswordReset(auth, oobCode, form.password);
      } else {
        await resetPassword(token, form.password);
      }
      setDone(true);
      setTimeout(() => navigate("/login"), 3000);
    } catch (err) {
      const msg =
        err?.code === "auth/invalid-action-code" || err?.code === "auth/expired-action-code"
          ? t("auth.invalid_link_desc", "This password reset link is invalid or has already been used.")
          : err?.response?.data?.error ||
            err?.message ||
            t("auth.something_went_wrong", "Something went wrong. Please try again.");
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  // State 1: Password reset completed successfully
  if (done) {
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
              {t("auth.reset_success_title", "Password Reset Successfully!")}
            </h1>

            <p className="text-sm text-[#52665A] mb-2 leading-relaxed">
              {t(
                "auth.reset_success_desc",
                "Your password has been updated. You can now sign in with your new credentials."
              )}
            </p>

            <p className="text-xs text-[#52665A] mb-6 italic">
              {t("auth.redirecting_to_login", "Redirecting to sign in...")}
            </p>

            <Link
              to="/login"
              className="w-full h-11 rounded-xl glossy-btn-primary text-white text-sm font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#35483E]/30 focus:ring-offset-2"
            >
              <LogIn size={16} className="rtl:rotate-180 shrink-0" />
              <span>{t("auth.sign_in_now", "Sign In Now")}</span>
            </Link>
          </motion.div>
        </main>

        {/* Footer */}
        <footer className="w-full max-w-md mx-auto py-2 text-center text-xs text-[#52665A]/80">
          <p>© {new Date().getFullYear()} CardioScan · {t("auth.brand_subtitle", "Cardiovascular ML")}</p>
        </footer>
      </div>
    );
  }

  // State 2: Invalid or missing reset link
  if (!resetCode) {
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

        {/* Central Invalid Link Card */}
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

            {/* Muted Terracotta Alert Icon */}
            <div className="w-16 h-16 rounded-2xl bg-[#FAF0EE] border border-[#F0D5D0] flex items-center justify-center mx-auto mb-4 shadow-xs">
              <AlertCircle size={32} className="text-[#B35D52]" />
            </div>

            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#35483E] tracking-tight mb-2">
              {t("auth.invalid_link_title", "Invalid or Expired Link")}
            </h1>

            <p className="text-sm text-[#52665A] mb-6 leading-relaxed max-w-xs mx-auto">
              {t(
                "auth.invalid_link_desc",
                "This password reset link is invalid or has already been used."
              )}
            </p>

            <div className="space-y-3 pt-2">
              <Link
                to="/forgot-password"
                className="w-full h-11 rounded-xl glossy-btn-primary text-white text-sm font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#35483E]/30 focus:ring-offset-2"
              >
                <span>{t("auth.request_new_link", "Request a new reset link")}</span>
              </Link>

              <Link
                to="/login"
                className="w-full h-10 rounded-xl glossy-btn-secondary text-[#35483E] text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-[#35483E]/20"
              >
                <ArrowLeft size={14} className="rtl:rotate-180 shrink-0" />
                <span>{t("auth.back_login", "Back to Login")}</span>
              </Link>
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

  // State 3: Active reset password form
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
                {t("auth.reset_title", "Reset password")}
              </h1>
              <p className="text-sm text-[#52665A] leading-relaxed">
                {t("auth.reset_sub", "Enter your new password below")}
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* New Password */}
              <div className="space-y-1.5">
                <label
                  htmlFor="new-password"
                  className="block text-xs font-semibold uppercase tracking-wider text-[#35483E] dark:text-[#F2F3F3]"
                >
                  {t("auth.new_password", "New Password")}
                </label>
                <div className="relative group">
                  <Lock
                    size={16}
                    className="absolute left-3.5 rtl:left-auto rtl:right-3.5 top-1/2 -translate-y-1/2 text-[#52665A] dark:text-[#8C9399] group-focus-within:text-[#35483E] dark:group-focus-within:text-[#789580] transition-colors pointer-events-none"
                  />
                  <input
                    id="new-password"
                    type={showPassword ? "text" : "password"}
                    name="password"
                    autoComplete="new-password"
                    enterKeyHint="next"
                    placeholder={t("auth.password_placeholder", "••••••••")}
                    value={form.password}
                    onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                    required
                    className="w-full h-11 px-3.5 pl-10 pr-11 rtl:pl-11 rtl:pr-10 rounded-xl glossy-input text-[#35483E] dark:text-[#F2F3F3] dark:bg-[#202326] dark:border-[#373C40] dark:focus:border-[#789580] text-sm placeholder:text-[#8A9990] dark:placeholder:text-[#8C9399] focus:outline-none transition-all shadow-2xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={
                      showPassword
                        ? t("auth.hide_password", "Hide password")
                        : t("auth.show_password", "Show password")
                    }
                    className="absolute right-2.5 rtl:right-auto rtl:left-2.5 top-1/2 -translate-y-1/2 text-[#52665A] dark:text-[#8C9399] hover:text-[#35483E] dark:hover:text-[#F2F3F3] hover:bg-[#E4EDE5]/60 dark:hover:bg-[#282C30] p-1.5 rounded-lg transition-colors focus:outline-none focus:ring-1 focus:ring-[#35483E] dark:focus:ring-[#789580]"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <div className="flex items-center gap-2 pt-0.5 text-xs text-[#52665A] dark:text-[#B2B7BB]">
                  <span
                    className={`inline-block w-2 h-2 rounded-full transition-colors ${
                      form.password.length >= 6 ? "bg-[#35483E] dark:bg-[#789580]" : "bg-[#D9A19A]"
                    }`}
                  />
                  <span>{t("auth.password_min_length", "Must be at least 6 characters")}</span>
                </div>
              </div>

              {/* Confirm Password */}
              <div className="space-y-1.5">
                <label
                  htmlFor="confirm-password"
                  className="block text-xs font-semibold uppercase tracking-wider text-[#35483E] dark:text-[#F2F3F3]"
                >
                  {t("auth.confirm_password", "Confirm Password")}
                </label>
                <div className="relative group">
                  <Lock
                    size={16}
                    className="absolute left-3.5 rtl:left-auto rtl:right-3.5 top-1/2 -translate-y-1/2 text-[#52665A] dark:text-[#8C9399] group-focus-within:text-[#35483E] dark:group-focus-within:text-[#789580] transition-colors pointer-events-none"
                  />
                  <input
                    id="confirm-password"
                    type={showConfirm ? "text" : "password"}
                    name="confirm"
                    autoComplete="new-password"
                    enterKeyHint="done"
                    placeholder={t("auth.password_placeholder", "••••••••")}
                    value={form.confirm}
                    onChange={(e) => setForm((f) => ({ ...f, confirm: e.target.value }))}
                    required
                    className="w-full h-11 px-3.5 pl-10 pr-11 rtl:pl-11 rtl:pr-10 rounded-xl glossy-input text-[#35483E] dark:text-[#F2F3F3] dark:bg-[#202326] dark:border-[#373C40] dark:focus:border-[#789580] text-sm placeholder:text-[#8A9990] dark:placeholder:text-[#8C9399] focus:outline-none transition-all shadow-2xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    aria-label={
                      showConfirm
                        ? t("auth.hide_password", "Hide password")
                        : t("auth.show_password", "Show password")
                    }
                    className="absolute right-2.5 rtl:right-auto rtl:left-2.5 top-1/2 -translate-y-1/2 text-[#52665A] dark:text-[#8C9399] hover:text-[#35483E] dark:hover:text-[#F2F3F3] hover:bg-[#E4EDE5]/60 dark:hover:bg-[#282C30] p-1.5 rounded-lg transition-colors focus:outline-none focus:ring-1 focus:ring-[#35483E] dark:focus:ring-[#789580]"
                  >
                    {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {form.confirm && form.password !== form.confirm && (
                  <p className="text-xs text-[#B35D52] dark:text-[#D9A19A] flex items-center gap-1.5 pt-0.5">
                    <AlertCircle size={13} className="shrink-0" />
                    <span>{t("auth.passwords_do_not_match", "Passwords do not match.")}</span>
                  </p>
                )}
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading || form.password.length < 6 || form.password !== form.confirm}
                  className="w-full h-11 rounded-xl glossy-btn-primary text-white text-sm font-semibold transition-all flex items-center justify-center gap-2.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#35483E]/30 focus:ring-offset-2"
                >
                  {loading ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                        className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full shrink-0"
                      />
                      <span>{t("auth.resetting", "Updating password...")}</span>
                    </>
                  ) : (
                    <>
                      <Lock size={16} className="shrink-0" />
                      <span>{t("auth.reset_btn", "Reset Password")}</span>
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
