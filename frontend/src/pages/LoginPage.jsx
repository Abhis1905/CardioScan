import React, { useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Heart,
  Mail,
  Lock,
  LogIn,
  Eye,
  EyeOff,
  ArrowLeft,
  Shield,
  Cpu,
  BarChart2,
  AlertCircle
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { login, resendVerification, firebaseAuth } from "../api";
import {
  auth,
  signInWithEmailAndPassword,
  signInWithPopup,
  googleProvider,
  sendEmailVerification,
  signOut,
} from "../firebase";
import { useAuth } from "../context/AuthContext";
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
            {t("auth.panel_title", "A closer look at the signals behind heart health.")}
          </h2>
          <p className="text-[#52665A] text-sm leading-relaxed max-w-md">
            {t("auth.panel_desc", "Explore how clinical measurements can reveal patterns associated with heart disease. CardioScan brings machine-learning predictions and explainable insights together in one educational experience.")}
          </p>
        </div>

        {/* Inside a CardioScan assessment — Refined editorial section */}
        <div className="pt-2 space-y-4">
          <div className="flex items-center gap-2">
            <span className="h-px w-6 bg-[#C5D5C8]" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#35483E]">
              {t("auth.panel_section_title", "Inside a CardioScan assessment")}
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
                  {t("auth.panel_step1_title", "One set of signals")}
                </h4>
                <p className="text-[12px] text-[#52665A] leading-relaxed">
                  {t("auth.panel_step1_desc", "Thirteen clinical measurements form the input to the educational assessment.")}
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
                  {t("auth.panel_step2_title", "Different perspectives")}
                </h4>
                <p className="text-[12px] text-[#52665A] leading-relaxed">
                  {t("auth.panel_step2_desc", "Compare the outputs of Logistic Regression, Random Forest and KNN, and see how the ensemble combines their votes.")}
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
                  {t("auth.panel_step3_title", "Understand the result")}
                </h4>
                <p className="text-[12px] text-[#52665A] leading-relaxed">
                  {t("auth.panel_step3_desc", "Explore contributing features and hypothetical changes without treating the output as a medical diagnosis.")}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Editorial Disclaimer */}
      <div className="pt-6 border-t border-[#D3DFD5] relative z-10">
        <p className="text-xs text-[#52665A] leading-relaxed italic">
          {t("auth.panel_quote", "Educational tool for cardiovascular literacy and statistical machine-learning exploration. Non-diagnostic.")}
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  const { t } = useTranslation();
  const [form, setForm] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(true);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [notVerified, setNotVerified] = useState(false);
  const [resending, setResending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState(null);
  const turnstileRef = useRef(null);
  const { loginUser } = useAuth();
  const navigate = useNavigate();

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
    setLoading(true);
    setNotVerified(false);
    try {
      // 1. Try Firebase Authentication first
      let idToken = null;
      try {
        const userCredential = await signInWithEmailAndPassword(auth, form.email.trim(), form.password);
        if (!userCredential.user.emailVerified) {
          await signOut(auth);
          setNotVerified(true);
          setLoading(false);
          return;
        }
        idToken = await userCredential.user.getIdToken();
      } catch (fbErr) {
        // Fallback for pre-existing native accounts
        if (fbErr.code === "auth/user-not-found" || fbErr.code === "auth/invalid-credential") {
          try {
            const { data } = await login({ ...form, turnstile_token: turnstileToken });
            setSuccess(true);
            setTimeout(() => {
              loginUser(data.token, data.user);
              navigate("/predict");
            }, 800);
            return;
          } catch (nativeErr) {
            if (nativeErr?.response?.data?.not_verified) {
              setNotVerified(true);
              setLoading(false);
              return;
            }
            throw fbErr;
          }
        }
        throw fbErr;
      }

      // 2. Exchange verified Firebase ID token for internal CardioScan JWT
      const { data } = await firebaseAuth(idToken, turnstileToken);
      setSuccess(true);
      setTimeout(() => {
        loginUser(data.token, data.user);
        navigate("/predict");
      }, 800);
    } catch (err) {
      turnstileRef.current?.reset();
      setTurnstileToken(null);
      if (err?.response?.data?.code === "account_exists_conflict" || err?.response?.status === 409) {
        toast.error(t("auth.account_conflict", "An account with this email already exists with a different sign-in method. Automatic linking is disabled for security."));
      } else if (
        err.code === "auth/wrong-password" ||
        err.code === "auth/invalid-credential" ||
        err.code === "auth/user-not-found"
      ) {
        toast.error(t("auth.invalid_credentials", "Invalid email or password."));
      } else if (err.code === "auth/too-many-requests") {
        toast.error(t("auth.too_many_attempts", "Too many attempts. Please try again later."));
      } else {
        toast.error(err?.response?.data?.error || err?.message || t("auth.login_failed", "Login failed"));
      }
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (!turnstileToken) {
      toast.error(t("auth.bot_check_google_prompt", "Please complete the bot protection check before signing in with Google."));
      return;
    }
    if (!agreeTerms) {
      toast.error(t("auth.must_agree_terms", "Please accept the Terms & Conditions and Privacy Policy."));
      return;
    }
    setGoogleLoading(true);
    try {
      const userCredential = await signInWithPopup(auth, googleProvider);
      const idToken = await userCredential.user.getIdToken();
      const { data } = await firebaseAuth(idToken, turnstileToken);
      setSuccess(true);
      setTimeout(() => {
        loginUser(data.token, data.user);
        navigate("/predict");
      }, 800);
    } catch (err) {
      turnstileRef.current?.reset();
      setTurnstileToken(null);
      if (err.code === "auth/popup-closed-by-user") {
        // User closed the popup, do not show error
      } else if (err?.response?.data?.code === "account_exists_conflict" || err?.response?.status === 409) {
        toast.error(t("auth.account_conflict", "An account with this email already exists with a different sign-in method. Automatic linking is disabled for security."));
      } else {
        toast.error(err?.response?.data?.error || err?.message || t("auth.google_failed", "Google sign-in failed"));
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, form.email.trim(), form.password);
      await sendEmailVerification(cred.user);
      await signOut(auth);
      toast.success(t("auth.verification_resent", "Verification email resent! Check your inbox."));
    } catch (err) {
      try {
        await resendVerification(form.email.trim());
        toast.success(t("auth.verification_resent", "Verification email resent! Check your inbox."));
      } catch (legacyErr) {
        toast.error(legacyErr?.response?.data?.error || t("auth.resend_failed", "Could not resend verification email"));
      }
    } finally {
      setResending(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-[#F7F5F0] flex items-center justify-center p-4">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 220, damping: 18 }}
          className="flex flex-col items-center gap-4 glossy-card rounded-2xl p-8 max-w-sm w-full shadow-sm text-center relative"
        >
          <div className="glossy-sheen-sweep" />
          <div className="w-16 h-16 rounded-2xl bg-[#E4EDE5] border border-[#D3DFD5] flex items-center justify-center shadow-xs">
            <Heart size={32} className="text-[#35483E] fill-[#D9A19A]" />
          </div>
          <p className="font-serif text-2xl font-bold text-[#35483E]">
            {t("auth.login_success", "Welcome back!")}
          </p>
          <div className="h-1 w-24 rounded-full bg-[#35483E]" />
        </motion.div>
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
            to="/"
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-[#52665A] hover:text-[#35483E] transition-colors py-1 px-1 rounded-md"
          >
            <ArrowLeft size={15} className="rtl:rotate-180" />
            <span>{t("auth.back_to_home", "Back to Home")}</span>
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
                {t("auth.welcome_back", "Welcome back")}
              </h1>
              <p className="text-sm text-[#52665A] leading-relaxed">
                {t("auth.signin_sub", "Sign in to your CardioScan account")}
              </p>
            </div>

            {/* Email Not Verified Alert */}
            <AnimatePresence>
              {notVerified && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-5 p-4 rounded-xl bg-[#FAF6EE] border border-[#E8DEC8] text-[#443825] overflow-hidden shadow-2xs"
                >
                  <div className="flex items-center gap-2 text-sm font-bold text-[#35483E] mb-1">
                    <AlertCircle size={16} className="shrink-0 text-[#B35D52]" />
                    <span>{t("auth.email_not_verified", "Email not verified")}</span>
                  </div>
                  <p className="text-xs text-[#5D523E] leading-relaxed mb-3">
                    {t("auth.verify_email_prompt", "Please verify your email before logging in.")}
                  </p>
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={resending}
                    className="text-xs font-semibold px-3.5 py-1.5 rounded-lg bg-[#EFE5D0] border border-[#D8C7A8] text-[#35483E] hover:bg-[#E6DAC3] transition-colors disabled:opacity-60 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#35483E]/20"
                  >
                    {resending ? t("auth.sending", "Sending...") : t("auth.resend_verification", "Resend verification email")}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email Input */}
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
                    autoComplete="username"
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
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="password"
                    className="block text-xs font-semibold uppercase tracking-wider text-[#35483E] dark:text-[#F2F3F3]"
                  >
                    {t("auth.password", "Password")}
                  </label>
                  <Link
                    to="/forgot-password"
                    className="text-xs font-semibold text-[#52665A] dark:text-[#B2B7BB] hover:text-[#35483E] dark:hover:text-[#F2F3F3] transition-colors underline-offset-4 hover:underline focus:outline-none focus:ring-1 focus:ring-[#35483E] dark:focus:ring-[#789580] rounded"
                  >
                    {t("auth.forgot_password", "Forgot password?")}
                  </Link>
                </div>
                <div className="relative group">
                  <Lock
                    size={16}
                    className="absolute left-3.5 rtl:left-auto rtl:right-3.5 top-1/2 -translate-y-1/2 text-[#52665A] dark:text-[#8C9399] group-focus-within:text-[#35483E] dark:group-focus-within:text-[#789580] transition-colors pointer-events-none"
                  />
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    name="password"
                    autoComplete="current-password"
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
                    aria-label={showPassword ? t("auth.hide_password", "Hide password") : t("auth.show_password", "Show password")}
                    className="absolute right-2.5 rtl:right-auto rtl:left-2.5 top-1/2 -translate-y-1/2 text-[#52665A] dark:text-[#8C9399] hover:text-[#35483E] dark:hover:text-[#F2F3F3] hover:bg-[#E4EDE5]/60 dark:hover:bg-[#282C30] p-1.5 rounded-lg transition-colors focus:outline-none focus:ring-1 focus:ring-[#35483E] dark:focus:ring-[#789580]"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Bot Protection Widget */}
              <div className="pt-1 overflow-x-auto max-w-full flex justify-center">
                <TurnstileWidget
                  ref={turnstileRef}
                  theme="light"
                  onVerify={(token) => setTurnstileToken(token)}
                  onError={() => setTurnstileToken(null)}
                  onExpire={() => setTurnstileToken(null)}
                />
              </div>

              {/* Terms & Conditions Checkbox */}
              <div className="flex items-start gap-2.5 pt-1 text-start">
                <input
                  type="checkbox"
                  id="agreeTerms"
                  name="agreeTerms"
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                  required
                  className="mt-0.5 h-4 w-4 rounded border-[#E5E0D6] dark:border-[#373C40] text-[#35483E] dark:text-[#789580] dark:bg-[#202326] focus:ring-[#35483E]/25 dark:focus:ring-[#789580]/30 cursor-pointer accent-[#35483E] dark:accent-[#789580]"
                />
                <label htmlFor="agreeTerms" className="text-xs text-[#52665A] dark:text-[#B2B7BB] leading-snug cursor-pointer select-none">
                  {t("auth.agree_terms_prefix", "I agree to the")}{" "}
                  <Link
                    to="/terms"
                    target="_blank"
                    className="text-[#35483E] dark:text-[#F2F3F3] font-medium underline underline-offset-2 decoration-[#C5D5C8] dark:decoration-[#373C40] hover:decoration-[#35483E] dark:hover:decoration-[#789580] hover:text-[#24332B] dark:hover:text-[#FFFFFF] transition-colors"
                  >
                    {t("auth.terms_and_conditions", "Terms & Conditions")}
                  </Link>{" "}
                  {t("auth.and", "and")}{" "}
                  <Link
                    to="/privacy"
                    target="_blank"
                    className="text-[#35483E] dark:text-[#F2F3F3] font-medium underline underline-offset-2 decoration-[#C5D5C8] dark:decoration-[#373C40] hover:decoration-[#35483E] dark:hover:decoration-[#789580] hover:text-[#24332B] dark:hover:text-[#FFFFFF] transition-colors"
                  >
                    {t("auth.privacy_policy", "Privacy Policy")}
                  </Link>
                </label>
              </div>

              {/* Submit Button */}
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
                      <span>{t("auth.signing_in", "Signing in...")}</span>
                    </>
                  ) : (
                    <>
                      <LogIn size={16} className="rtl:rotate-180 shrink-0" />
                      <span>{t("auth.sign_in", "Sign In")}</span>
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Separator Divider */}
            <div className="relative my-5 flex items-center justify-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#E5E0D6] dark:border-[#373C40]"></div>
              </div>
              <span className="relative bg-[#FAF8F5] dark:bg-[#202326] border border-[#E5E0D6] dark:border-[#373C40] rounded-full px-3 py-0.5 text-[11px] font-mono uppercase tracking-widest text-[#52665A] dark:text-[#8C9399] font-semibold">
                {t("auth.or_divider", "or")}
              </span>
            </div>

            {/* Google Sign In Button */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading || googleLoading || !turnstileToken || !agreeTerms}
              className="w-full h-11 flex items-center justify-center gap-3 rounded-xl glossy-btn-secondary text-[#35483E] dark:text-[#F2F3F3] text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#35483E]/20"
            >
              {googleLoading ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                    className="w-4 h-4 border-2 border-[#35483E]/25 dark:border-[#F2F3F3]/25 border-t-[#35483E] dark:border-t-[#F2F3F3] rounded-full shrink-0"
                  />
                  <span>{t("auth.connecting", "Connecting...")}</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>{t("auth.continue_with_google", "Continue with Google")}</span>
                </>
              )}
            </button>

            {/* Registration Navigation Link */}
            <div className="mt-6 pt-5 border-t border-[#E5E0D6] dark:border-[#373C40] text-center">
              <p className="text-xs sm:text-sm text-[#52665A] dark:text-[#B2B7BB]">
                {t("auth.no_account", "Don't have an account?")}{" "}
                <Link
                  to="/register"
                  className="font-semibold text-[#35483E] dark:text-[#F2F3F3] hover:text-[#1E2B24] dark:hover:text-[#FFFFFF] underline underline-offset-4 decoration-[#C5D5C8] dark:decoration-[#373C40] hover:decoration-[#35483E] dark:hover:decoration-[#789580] transition-colors"
                >
                  {t("auth.sign_up", "Sign up")}
                </Link>
              </p>
            </div>
          </div>
        </main>

        {/* Footer info */}
        <footer className="w-full max-w-md mx-auto py-2 text-center text-xs text-[#52665A]/80">
          <p>© {new Date().getFullYear()} CardioScan · {t("auth.brand_subtitle", "Cardiovascular ML")}</p>
        </footer>
      </div>
    </div>
  );
}
