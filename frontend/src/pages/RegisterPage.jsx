import React, { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Heart,
  Mail,
  Lock,
  User,
  UserPlus,
  CheckCircle,
  Eye,
  EyeOff,
  ArrowLeft,
  RefreshCw,
  Clock,
  MailCheck,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { verifyTurnstile, resendVerification, register } from "../api";
import {
  auth,
  createUserWithEmailAndPassword,
  updateProfile,
  sendEmailVerification,
  signOut,
  signInWithEmailAndPassword,
  isFirebaseConfigured,
} from "../firebase";
import TurnstileWidget from "../components/TurnstileWidget";
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
            {t("auth.register_panel_title") === "Create your educational profile."
              ? "Understand your heart. Explore the science."
              : t("auth.register_panel_title", "Understand your heart. Explore the science.")}
          </h2>
          <p className="text-[#52665A] text-sm leading-relaxed max-w-md">
            {t(
              "auth.register_panel_desc",
              "Join CardioScan to explore how machine-learning models evaluate cardiovascular risk patterns, save assessment runs, and examine feature contributions over time."
            )}
          </p>
        </div>

        {/* Account benefits editorial section */}
        <div className="pt-2 space-y-4">
          <div className="flex items-center gap-2">
            <span className="h-px w-6 bg-[#C5D5C8]" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#35483E]">
              {t("auth.register_panel_section_title", "With a CardioScan account")}
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
                  {t("auth.register_step1_title", "Personal assessment history")}
                </h4>
                <p className="text-[12px] text-[#52665A] leading-relaxed">
                  {t(
                    "auth.register_step1_desc",
                    "Save your inputs and track risk scenario evaluations securely across sessions."
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
                  {t("auth.register_step2_title", "Model consensus comparison")}
                </h4>
                <p className="text-[12px] text-[#52665A] leading-relaxed">
                  {t(
                    "auth.register_step2_desc",
                    "Compare predictions from Logistic Regression, Random Forest, and KNN side by side."
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
                  {t("auth.register_step3_title", "Transparent feature insights")}
                </h4>
                <p className="text-[12px] text-[#52665A] leading-relaxed">
                  {t(
                    "auth.register_step3_desc",
                    "Understand which clinical measurements drive model outputs without diagnostic claims."
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

export default function RegisterPage() {
  const { t } = useTranslation();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false); // Unchecked by default
  const [loading, setLoading] = useState(false);

  // Check test_success query parameter for safe visual verification without creating accounts
  const isTestSuccess =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("test_success") === "true";
  const [registered, setRegistered] = useState(isTestSuccess);
  const [registeredEmail, setRegisteredEmail] = useState(
    isTestSuccess ? "alex.doe@example.com" : ""
  );
  const [emailSendFailed, setEmailSendFailed] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [turnstileToken, setTurnstileToken] = useState(null);
  const turnstileRef = useRef(null);

  // Cooldown timer tick
  useEffect(() => {
    if (cooldown <= 0) return;
    const interval = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldown]);

  const fmtCooldown = (s) => {
    if (s <= 0) return "";
    const m = Math.floor(s / 60);
    const rem = s % 60;
    if (m > 0) return `${m}m ${rem}s`;
    return `${rem}s`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!turnstileToken) {
      toast.error(t("auth.bot_check_prompt", "Please complete the bot protection check."));
      return;
    }
    if (!agreeTerms) {
      toast.error(t("auth.must_agree_terms", "Please accept the Terms & Conditions and Privacy Policy."));
      return;
    }
    if (form.password.length < 6) {
      toast.error(t("auth.password_too_short", "Password must be at least 6 characters"));
      return;
    }
    setLoading(true);

    // Verify Turnstile bot protection token server-side before creating account
    try {
      await verifyTurnstile(turnstileToken);
    } catch (turnstileErr) {
      turnstileRef.current?.reset();
      setTurnstileToken(null);
      toast.error(
        turnstileErr?.response?.data?.error ||
          t("auth.bot_verification_failed", "Bot verification failed. Please try again.")
      );
      setLoading(false);
      return;
    }

    if (!isFirebaseConfigured || !auth) {
      try {
        await register({ ...form, turnstile_token: turnstileToken });
        setRegisteredEmail(form.email.trim());
        setRegistered(true);
        setLoading(false);
        setCooldown(120);
        return;
      } catch (err) {
        turnstileRef.current?.reset();
        setTurnstileToken(null);
        toast.error(err?.response?.data?.error || t("auth.registration_failed", "Registration failed. Please try again."));
        setLoading(false);
        return;
      }
    }

    let userCredential = null;
    try {
      userCredential = await createUserWithEmailAndPassword(auth, form.email.trim(), form.password);
      if (form.name.trim()) {
        try {
          await updateProfile(userCredential.user, { displayName: form.name.trim() });
        } catch (_) {}
      }
    } catch (err) {
      turnstileRef.current?.reset();
      setTurnstileToken(null);
      let msg = t("auth.registration_failed", "Registration failed. Please try again.");
      if (err.code === "auth/email-already-in-use") {
        msg = t("auth.email_already_in_use", "This email is already registered. Please sign in.");
      } else if (err.code === "auth/invalid-email") {
        msg = t("auth.invalid_email", "Please enter a valid email address.");
      } else if (err.code === "auth/weak-password") {
        msg = t("auth.weak_password", "Password is too weak. Please choose a stronger password.");
      } else if (err?.message) {
        msg = err.message;
      }
      toast.error(msg);
      setLoading(false);
      return;
    }

    // Account creation succeeded. Dispatch verification email
    try {
      await sendEmailVerification(userCredential.user);
    } catch (sendErr) {
      console.warn("Failed to dispatch initial verification email:", sendErr);
      setEmailSendFailed(true);
      toast.error(
        t(
          "auth.account_created_resend_prompt",
          "Account created, but verification email could not be sent. You can resend it below."
        )
      );
    } finally {
      await signOut(auth);
    }

    setRegisteredEmail(form.email.trim());
    setRegistered(true);
    setLoading(false);
    setCooldown(120); // 2-minute cooldown after initial send
  };

  const handleResend = async () => {
    if (resending || cooldown > 0) return;
    if (!registeredEmail.trim()) {
      toast.error(t("auth.invalid_email", "Please enter a valid email address."));
      return;
    }
    setResending(true);

    // If simulated visual testing mode, do not trigger real API/Firebase calls
    if (isTestSuccess) {
      setTimeout(() => {
        setResending(false);
        setCooldown(120);
        setEmailSendFailed(false);
        toast.success(t("auth.verification_resent", "Verification email resent! Check your inbox."));
      }, 500);
      return;
    }

    try {
      if (form.password && isFirebaseConfigured && auth) {
        const cred = await signInWithEmailAndPassword(auth, registeredEmail, form.password);
        await sendEmailVerification(cred.user);
        await signOut(auth);
      } else {
        await resendVerification(registeredEmail);
      }
      setEmailSendFailed(false);
      setCooldown(120);
      toast.success(t("auth.verification_resent", "Verification email resent! Check your inbox."));
    } catch (err) {
      try {
        const { data } = await resendVerification(registeredEmail);
        setEmailSendFailed(false);
        if (data?.wait_minutes) {
          setCooldown(data.wait_minutes * 60);
        } else {
          setCooldown(120);
        }
        toast.success(t("auth.verification_resent", "Verification email resent! Check your inbox."));
      } catch (legacyErr) {
        const errMsg =
          legacyErr?.response?.data?.error ||
          t("auth.resend_failed", "Could not resend email. Please try logging in to resend.");
        toast.error(errMsg);
        if (legacyErr?.response?.data?.wait_minutes) {
          setCooldown(legacyErr.response.data.wait_minutes * 60);
        }
      }
    } finally {
      setResending(false);
    }
  };

  if (registered) {
    return (
      <div className="min-h-screen bg-[#F7F5F0] text-[#35483E] flex flex-col justify-between p-3.5 sm:p-6 lg:p-10 selection:bg-[#E4EDE5] selection:text-[#35483E] w-full min-w-0 max-w-full overflow-x-hidden">
        {/* Top Header */}
        <header className="w-full max-w-md mx-auto flex items-center justify-between py-2 mb-3 min-w-0">
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-[#52665A] hover:text-[#35483E] transition-colors py-1 px-1 rounded-md"
          >
            <ArrowLeft size={15} className="rtl:rotate-180" />
            <span>{t("auth.back_to_signin", "Back to Sign In")}</span>
          </Link>
          <LanguageSwitcher variant="sage" />
        </header>

        {/* Central Registration Success Card */}
        <main className="w-full max-w-md mx-auto my-auto py-2 sm:py-4 min-w-0">
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

            {/* Pale Sage Check Badge */}
            <div className="w-16 h-16 rounded-2xl bg-[#E4EDE5] border border-[#D3DFD5] flex items-center justify-center mx-auto mb-4 shadow-xs">
              <CheckCircle size={32} className="text-[#35483E]" />
            </div>

            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#35483E] tracking-tight mb-2">
              {emailSendFailed
                ? t("auth.account_created_heading", "Account Created!")
                : t("auth.check_email", "Check your email!")}
            </h1>

            <p className="text-sm text-[#52665A] mb-2 leading-relaxed">
              {emailSendFailed
                ? t("auth.trouble_sending_link", "We had trouble sending the verification link automatically to:")
                : t("auth.sent_verification_link", "We sent a verification link to:")}
            </p>

            <div className="inline-flex items-center gap-2 font-mono font-semibold text-xs sm:text-sm text-[#35483E] dark:text-[#F2F3F3] bg-[#F7F5F0] dark:bg-[#202326] border border-[#E5E0D6] dark:border-[#373C40] px-3.5 py-1.5 rounded-xl my-3 break-all shadow-2xs max-w-full">
              <Mail size={14} className="text-[#52665A] dark:text-[#8C9399] shrink-0" />
              <span className="truncate">{registeredEmail}</span>
            </div>

            <p className="text-xs text-[#52665A] dark:text-[#B2B7BB] mb-6 leading-relaxed">
              {emailSendFailed
                ? t(
                    "auth.account_created_resend_prompt",
                    "Account created, but verification email could not be sent. You can resend it below."
                  )
                : t(
                    "auth.verification_instruction",
                    "Click the link in the email to activate your account. Check your spam folder if you do not see it within a few minutes."
                  )}
            </p>

            {/* Clear Next Step Actions */}
            <div className="space-y-3">
              <Link
                to={`/verify-email?email=${encodeURIComponent(registeredEmail)}&status=pending`}
                className="glossy-btn-primary w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl font-medium text-white transition-all shadow-xs cursor-pointer text-sm"
              >
                <MailCheck size={16} />
                <span>{t("auth.continue_to_verification", "Continue to Verification")}</span>
              </Link>

              <button
                type="button"
                id="register-resend-btn"
                onClick={handleResend}
                disabled={resending || cooldown > 0}
                className="glossy-btn-secondary w-full flex items-center justify-center gap-2 py-2.5 px-6 rounded-xl font-medium transition-all shadow-xs cursor-pointer text-xs sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed text-[#35483E] dark:text-[#F2F3F3]"
              >
                {resending ? (
                  <>
                    <RefreshCw size={14} className="animate-spin text-[#35483E] dark:text-[#F2F3F3]" />
                    <span>{t("auth.sending", "Sending...")}</span>
                  </>
                ) : cooldown > 0 ? (
                  <>
                    <Clock size={14} />
                    <span>{t("auth.resend_cooldown", { time: fmtCooldown(cooldown) })}</span>
                  </>
                ) : (
                  <>
                    <RefreshCw size={14} />
                    <span>{t("auth.resend_verification", "Resend verification email")}</span>
                  </>
                )}
              </button>
            </div>

            {/* Notice and Return Link */}
            <div className="mt-5 pt-4 border-t border-[#E5E0D6] dark:border-[#373C40] text-center space-y-2">
              <p className="text-[11px] text-[#52665A]/80 dark:text-[#8C9399] leading-relaxed">
                {t("auth.check_spam_notice", "Don't forget to check your spam or junk folder if you don't see the email.")}
              </p>
              <div>
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#52665A] dark:text-[#B2B7BB] hover:text-[#35483E] dark:hover:text-[#F2F3F3] transition-colors"
                >
                  <ArrowLeft size={13} className="rtl:rotate-180" />
                  <span>{t("auth.back_to_signin", "Back to Sign In")}</span>
                </Link>
              </div>
            </div>
          </motion.div>
        </main>

        {/* Footer */}
        <footer className="w-full max-w-md mx-auto text-center py-2 text-xs text-[#52665A]">
          © 2026 CardioScan · {t("auth.brand_subtitle", "Cardiovascular Health & ML")}
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F5F0] text-[#35483E] grid lg:grid-cols-12 selection:bg-[#E4EDE5] selection:text-[#35483E]">
      {/* Left Editorial Panel (lg only) */}
      <LeftPanel />

      {/* Right Form Panel */}
      <div className="lg:col-span-7 flex flex-col justify-between min-h-screen p-3.5 sm:p-6 lg:p-10">
        {/* Top Header Navigation */}
        <header className="w-full max-w-md mx-auto flex items-center justify-between py-2 mb-3">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-[#52665A] hover:text-[#35483E] transition-colors py-1 px-1 rounded-md"
          >
            <ArrowLeft size={15} className="rtl:rotate-180" />
            <span>{t("auth.back_to_home", "Back to Home")}</span>
          </Link>

          <LanguageSwitcher variant="sage" />
        </header>

        {/* Central Form Container */}
        <main className="w-full max-w-md mx-auto my-auto py-2 sm:py-4">
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

          <div className="glossy-card rounded-2xl p-5 sm:p-8 text-start relative">
            <div className="glossy-sheen-sweep" />
            {/* Title & Subtitle */}
            <div className="mb-6 space-y-1.5">
              <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#35483E] tracking-tight">
                {t("auth.create_account", "Create account")}
              </h1>
              <p className="text-sm text-[#52665A] leading-relaxed">
                {t("auth.create_sub", "Start predicting and tracking heart health")}
              </p>
            </div>

            {/* Registration Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Full Name Input */}
              <div className="space-y-1.5">
                <label
                  htmlFor="register-name"
                  className="block text-xs font-semibold uppercase tracking-wider text-[#35483E] dark:text-[#F2F3F3]"
                >
                  {t("auth.full_name", "Full Name")}
                </label>
                <div className="relative group">
                  <User
                    size={16}
                    className="absolute left-3.5 rtl:left-auto rtl:right-3.5 top-1/2 -translate-y-1/2 text-[#52665A] dark:text-[#8C9399] group-focus-within:text-[#35483E] dark:group-focus-within:text-[#789580] transition-colors pointer-events-none"
                  />
                  <input
                    id="register-name"
                    type="text"
                    name="name"
                    autoComplete="name"
                    enterKeyHint="next"
                    placeholder={t("auth.name_placeholder", "e.g. John Doe")}
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    required
                    className="w-full h-11 px-3.5 pl-10 rtl:pl-3.5 rtl:pr-10 rounded-xl glossy-input text-[#35483E] dark:text-[#F2F3F3] dark:bg-[#202326] dark:border-[#373C40] dark:focus:border-[#789580] text-sm placeholder:text-[#8A9990] dark:placeholder:text-[#8C9399] focus:outline-none transition-all shadow-2xs"
                  />
                </div>
              </div>

              {/* Email Input */}
              <div className="space-y-1.5">
                <label
                  htmlFor="register-email"
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
                    id="register-email"
                    type="email"
                    name="email"
                    autoComplete="email"
                    enterKeyHint="next"
                    placeholder={t("auth.email_placeholder", "name@example.com")}
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    required
                    className="w-full h-11 px-3.5 pl-10 rtl:pl-3.5 rtl:pr-10 rounded-xl glossy-input text-[#35483E] dark:text-[#F2F3F3] dark:bg-[#202326] dark:border-[#373C40] dark:focus:border-[#789580] text-sm placeholder:text-[#8A9990] dark:placeholder:text-[#8C9399] focus:outline-none transition-all shadow-2xs"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-1.5">
                <label
                  htmlFor="register-password"
                  className="block text-xs font-semibold uppercase tracking-wider text-[#35483E] dark:text-[#F2F3F3]"
                >
                  {t("auth.password", "Password")}
                </label>
                <div className="relative group">
                  <Lock
                    size={16}
                    className="absolute left-3.5 rtl:left-auto rtl:right-3.5 top-1/2 -translate-y-1/2 text-[#52665A] dark:text-[#8C9399] group-focus-within:text-[#35483E] dark:group-focus-within:text-[#789580] transition-colors pointer-events-none"
                  />
                  <input
                    id="register-password"
                    type={showPassword ? "text" : "password"}
                    name="password"
                    autoComplete="new-password"
                    enterKeyHint="done"
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
                {/* Clear Password Requirements Note */}
                <p className="text-[12px] text-[#52665A] dark:text-[#B2B7BB] flex items-center gap-1.5 pt-0.5">
                  <span
                    className={`inline-block w-1.5 h-1.5 rounded-full transition-colors ${
                      form.password.length >= 6 ? "bg-[#35483E] dark:bg-[#789580]" : "bg-[#D9A19A]"
                    }`}
                  />
                  <span>{t("auth.password_min_length", "Must be at least 6 characters")}</span>
                </p>
              </div>

              {/* Bot Protection Widget */}
              <div className="pt-1 overflow-x-auto max-w-full flex justify-center min-h-[65px] items-center">
                <TurnstileWidget
                  ref={turnstileRef}
                  theme="light"
                  onVerify={(token) => setTurnstileToken(token)}
                  onError={() => setTurnstileToken(null)}
                  onExpire={() => setTurnstileToken(null)}
                />
              </div>

              {/* Terms & Conditions Checkbox (Mandatory, Unchecked by default) */}
              <div className="flex items-start gap-2.5 pt-1 text-start">
                <input
                  type="checkbox"
                  id="agreeTermsRegister"
                  name="agreeTerms"
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                  required
                  className="mt-0.5 h-4 w-4 rounded border-[#E5E0D6] dark:border-[#373C40] text-[#35483E] dark:text-[#789580] dark:bg-[#202326] focus:ring-[#35483E]/25 dark:focus:ring-[#789580]/30 cursor-pointer accent-[#35483E] dark:accent-[#789580]"
                />
                <label
                  htmlFor="agreeTermsRegister"
                  className="text-xs text-[#52665A] dark:text-[#B2B7BB] leading-snug cursor-pointer select-none"
                >
                  {t("auth.agree_terms_prefix", "I agree to the")}{" "}
                  <Link
                    to="/terms"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#35483E] dark:text-[#F2F3F3] font-medium underline underline-offset-2 decoration-[#C5D5C8] dark:decoration-[#373C40] hover:decoration-[#35483E] dark:hover:decoration-[#789580] hover:text-[#24332B] dark:hover:text-[#FFFFFF] transition-colors"
                  >
                    {t("auth.terms_and_conditions", "Terms & Conditions")}
                  </Link>{" "}
                  {t("auth.and", "and")}{" "}
                  <Link
                    to="/privacy"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#35483E] dark:text-[#F2F3F3] font-medium underline underline-offset-2 decoration-[#C5D5C8] dark:decoration-[#373C40] hover:decoration-[#35483E] dark:hover:decoration-[#789580] hover:text-[#24332B] dark:hover:text-[#FFFFFF] transition-colors"
                  >
                    {t("auth.privacy_policy", "Privacy Policy")}
                  </Link>
                </label>
              </div>

              {/* Create Account Button (Disabled until acceptance and bot check) */}
              <div className="pt-1">
                <button
                  type="submit"
                  disabled={loading || !turnstileToken || !agreeTerms}
                  className="w-full h-11 rounded-xl glossy-btn-primary text-white text-sm font-semibold transition-all flex items-center justify-center gap-2.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#35483E]/30 focus:ring-offset-2"
                >
                  {loading ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                        className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full shrink-0"
                      />
                      <span>{t("auth.creating_account", "Creating account...")}</span>
                    </>
                  ) : (
                    <>
                      <UserPlus size={16} className="rtl:rotate-180 shrink-0" />
                      <span>{t("auth.create_btn", "Create Account")}</span>
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Link back to Sign In */}
            <div className="mt-6 pt-5 border-t border-[#E5E0D6] dark:border-[#373C40] text-center">
              <p className="text-xs text-[#52665A] dark:text-[#B2B7BB]">
                {t("auth.have_account", "Already have an account?")}{" "}
                <Link
                  to="/login"
                  className="font-semibold text-[#B35D52] hover:text-[#91463D] dark:text-[#D9A19A] dark:hover:text-[#B35D52] transition-colors"
                >
                  {t("auth.sign_in", "Sign In")}
                </Link>
              </p>
            </div>
          </div>
        </main>

        {/* Bottom Copyright Footer */}
        <footer className="w-full max-w-md mx-auto text-center py-2 text-xs text-[#52665A] dark:text-[#8C9399]">
          © 2026 CardioScan · {t("auth.brand_subtitle", "Cardiovascular Health & ML")}
        </footer>
      </div>
    </div>
  );
}
