import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import {
  Heart,
  Mail,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
  RefreshCw,
  LogIn,
  CheckCircle2,
  Clock,
  Copy,
  Check,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import { verifyEmail, resendVerification } from "../api";
import { auth, applyActionCode } from "../firebase";
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
            {t("auth.verify_panel_title", "Verify your email address.")}
          </h2>
          <p className="text-[#52665A] text-sm leading-relaxed max-w-md">
            {t(
              "auth.verify_panel_desc",
              "Confirming your email protects your CardioScan assessment history and ensures secure access to machine-learning insights."
            )}
          </p>
        </div>

        {/* Steps editorial section */}
        <div className="pt-2 space-y-4">
          <div className="flex items-center gap-2">
            <span className="h-px w-6 bg-[#C5D5C8]" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#35483E]">
              {t("auth.verify_panel_section_title", "Why email verification matters")}
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
                  {t("auth.verify_step1_title", "Account integrity")}
                </h4>
                <p className="text-[12px] text-[#52665A] leading-relaxed">
                  {t(
                    "auth.verify_step1_desc",
                    "Ensures that your assessment records remain confidential and securely tied to you."
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
                  {t("auth.verify_step2_title", "Instant activation")}
                </h4>
                <p className="text-[12px] text-[#52665A] leading-relaxed">
                  {t(
                    "auth.verify_step2_desc",
                    "One click unlocks full access to models, prediction history, and analytics."
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
                  {t("auth.verify_step3_title", "Reliable recovery")}
                </h4>
                <p className="text-[12px] text-[#52665A] leading-relaxed">
                  {t(
                    "auth.verify_step3_desc",
                    "Maintains a verified path for password recovery and account security alerts."
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

export default function VerifyEmailPage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState("loading"); // loading | success | error | expired | pending | already_verified
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [patientId, setPatientId] = useState("");
  const [copiedPid, setCopiedPid] = useState(false);
  const [resendStatus, setResendStatus] = useState("idle"); // idle | sending | sent | error
  const [resendMsg, setResendMsg] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [checking, setChecking] = useState(false);

  const { user, loginUser } = useAuth();
  const navigate = useNavigate();

  const handleCopyPid = (pidToCopy) => {
    if (!pidToCopy) return;
    navigator.clipboard.writeText(pidToCopy);
    setCopiedPid(true);
    toast.success(t("dashboard.pid_copied", "Patient ID copied to clipboard"));
    setTimeout(() => setCopiedPid(false), 2000);
  };

  // ── Verify on mount ─────────────────────────────────────────────────────────
  useEffect(() => {
    // 1. Safe visual inspection parameter for browser tests
    const testStatus = searchParams.get("test_status");
    const testEmail = searchParams.get("test_email") || searchParams.get("email");
    const testPid = searchParams.get("test_pid");
    if (testStatus) {
      setStatus(testStatus);
      if (testEmail) setEmail(testEmail);
      if (testPid) {
        setPatientId(testPid);
      } else if (testStatus === "success") {
        setPatientId("CS-7B9K-2M4X");
      }
      if (testStatus === "success") {
        setMessage(
          t(
            "auth.verify_success_desc",
            "Your email address has been verified. You now have full access to CardioScan."
          )
        );
      } else if (testStatus === "expired") {
        setEmail(testEmail || "alex.doe@example.com");
        setMessage(
          t(
            "auth.verify_expired_desc",
            "Your verification link has expired (links are valid for 24 hours). Enter your email below to request a fresh one."
          )
        );
      } else if (testStatus === "error") {
        setEmail(testEmail || "alex.doe@example.com");
        setMessage(
          t(
            "auth.verify_invalid_desc",
            "This verification link is invalid or has already been used. If you have already verified your email, you can sign in directly."
          )
        );
      } else if (testStatus === "already_verified") {
        setEmail(testEmail || "alex.doe@example.com");
        setMessage(
          t(
            "auth.verify_already_desc",
            "This email address is already verified. You can sign in to your CardioScan account directly."
          )
        );
      } else if (testStatus === "pending") {
        setEmail(testEmail || "alex.doe@example.com");
      }
      return;
    }

    const token = searchParams.get("token");
    const oobCode = searchParams.get("oobCode");
    const emailParam = searchParams.get("email");
    if (emailParam) setEmail(emailParam);

    // 2. Firebase Action Code flow
    if (oobCode) {
      setStatus("loading");
      applyActionCode(auth, oobCode)
        .then(() => {
          setStatus("success");
          setMessage(
            t(
              "auth.verify_success_desc",
              "Your email address has been verified. You now have full access to CardioScan."
            )
          );
        })
        .catch((err) => {
          if (err?.code === "auth/expired-action-code") {
            setStatus("expired");
            setMessage(
              t(
                "auth.verify_expired_desc",
                "Your verification link has expired (links are valid for 24 hours). Enter your email below to request a fresh one."
              )
            );
          } else if (err?.code === "auth/invalid-action-code") {
            setStatus("error");
            setMessage(
              t(
                "auth.verify_invalid_desc",
                "This verification link is invalid or has already been used. If you have already verified your email, you can sign in directly."
              )
            );
          } else {
            setStatus("error");
            setMessage(
              err?.message ||
                t(
                  "auth.verify_invalid_desc",
                  "This verification link is invalid or has already been used."
                )
            );
          }
        });
      return;
    }

    // 3. Backend token verification flow
    if (token) {
      setStatus("loading");
      verifyEmail(token)
        .then(({ data }) => {
          if (data?.token && data?.user) {
            loginUser(data.token, data.user);
          }
          if (data?.user?.patient_id) {
            setPatientId(data.user.patient_id);
          }
          setStatus("success");
          setMessage(
            data?.message ||
              t(
                "auth.verify_success_desc",
                "Your email address has been verified. You now have full access to CardioScan."
              )
          );
        })
        .catch((err) => {
          const data = err?.response?.data || {};
          const expired = data.expired === true;
          setEmail(data.email || emailParam || "");
          setStatus(expired ? "expired" : "error");
          setMessage(
            data.error ||
              t(
                "auth.verify_invalid_desc",
                "Verification failed. The link may be invalid or expired."
              )
          );
        });
      return;
    }

    // 4. Default: User landed on verification page (e.g. from registration or login notice)
    setStatus("pending");
  }, [searchParams, navigate, loginUser, t]);

  // ── Cooldown countdown ticker ───────────────────────────────────────────────
  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  const fmtCooldown = (s) => {
    if (s <= 0) return "";
    const m = Math.floor(s / 60);
    const rem = s % 60;
    if (m > 0) return `${m}m ${rem}s`;
    return `${rem}s`;
  };

  // ── Resend handler ──────────────────────────────────────────────────────────
  const handleResend = async (e) => {
    if (e) e.preventDefault();
    if (!email.trim() || resendStatus === "sending" || cooldown > 0) {
      if (!email.trim()) {
        toast.error(t("auth.invalid_email", "Please enter a valid email address."));
      }
      return;
    }
    setResendStatus("sending");
    setResendMsg("");
    try {
      const { data } = await resendVerification(email.trim());
      setResendStatus("sent");
      const successText =
        data.message ||
        t(
          "auth.verification_resent",
          "Verification email sent! Check your inbox (and spam folder)."
        );
      setResendMsg(successText);
      setCooldown(120); // 2-minute cooldown
      toast.success(successText);
    } catch (err) {
      const data = err?.response?.data || {};
      const errMsg =
        data.error ||
        err?.message ||
        t("auth.resend_failed", "Could not resend verification email");

      if (errMsg.toLowerCase().includes("already verified")) {
        setStatus("already_verified");
        setMessage(
          t(
            "auth.verify_already_desc",
            "This email address is already verified. You can sign in to your CardioScan account directly."
          )
        );
        toast.success(
          t(
            "auth.verify_already_desc",
            "This email address is already verified. You can sign in to your CardioScan account directly."
          )
        );
        return;
      }

      setResendStatus("error");
      setResendMsg(errMsg);
      toast.error(errMsg);
      if (data.wait_minutes) {
        setCooldown(data.wait_minutes * 60);
      }
    }
  };

  // ── Check Verification Status ──────────────────────────────────────────────
  const handleCheckStatus = async () => {
    if (checking) return;
    setChecking(true);
    try {
      // If Firebase user is signed in on client
      if (auth.currentUser) {
        await auth.currentUser.reload();
        if (auth.currentUser.emailVerified) {
          if (user?.patient_id) {
            setPatientId(user.patient_id);
          }
          setStatus("success");
          setMessage(
            t(
              "auth.verify_success_desc",
              "Your email address has been verified. You now have full access to CardioScan."
            )
          );
          toast.success(
            t(
              "auth.verify_success_desc",
              "Your email address has been verified. You now have full access to CardioScan."
            )
          );
          return;
        }
      }

      // Check via resend endpoint if email provided
      if (email.trim()) {
        try {
          await resendVerification(email.trim());
          toast.info(
            t(
              "auth.still_pending_notice",
              "Verification is still pending. We resent a fresh link to your inbox."
            )
          );
          setCooldown(120);
        } catch (checkErr) {
          const checkData = checkErr?.response?.data || {};
          const msg = checkData.error || "";
          if (msg.toLowerCase().includes("already verified")) {
            setStatus("already_verified");
            toast.success(
              t(
                "auth.verify_already_desc",
                "This email address is already verified. You can sign in to your CardioScan account directly."
              )
            );
            return;
          }
          if (checkData.wait_minutes) {
            setCooldown(checkData.wait_minutes * 60);
          }
          toast.info(
            t(
              "auth.email_not_yet_verified",
              "Email not verified yet. Please check your inbox."
            )
          );
        }
      } else {
        toast.error(t("auth.invalid_email", "Please enter a valid email address."));
      }
    } catch (_) {
      toast.info(
        t(
          "auth.email_not_yet_verified",
          "Email not verified yet. Please check your inbox."
        )
      );
    } finally {
      setChecking(false);
    }
  };

  // ── State 1: Loading / Verifying ───────────────────────────────────────────
  if (status === "loading") {
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

        {/* Central Loading Card */}
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
            initial={{ scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 220, damping: 20 }}
            className="glossy-card rounded-2xl p-6 sm:p-8 text-center relative w-full max-w-full"
          >
            <div className="glossy-sheen-sweep" />

            {/* Restrained Loading Indicator */}
            <div className="w-16 h-16 rounded-2xl bg-[#E4EDE5] border border-[#D3DFD5] flex items-center justify-center mx-auto mb-4 shadow-xs">
              <RefreshCw size={28} className="text-[#35483E] animate-spin" />
            </div>

            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#35483E] tracking-tight mb-2">
              {t("auth.verifying_title", "Verifying your email...")}
            </h1>

            <p className="text-sm text-[#52665A] leading-relaxed max-w-xs mx-auto">
              {t(
                "auth.verifying_desc",
                "Please wait a moment while we verify your credentials."
              )}
            </p>
          </motion.div>
        </main>

        <footer className="w-full max-w-md mx-auto py-4 text-center text-xs text-[#52665A] mt-auto">
          © 2026 CardioScan · Cardiovascular Health & ML
        </footer>
      </div>
    );
  }

  // ── State 2: Success / Verified ───────────────────────────────────────────
  if (status === "success") {
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
              {t("auth.verify_success_title", "Email Verified Successfully!")}
            </h1>

            <p className="text-sm text-[#52665A] mb-4 leading-relaxed">
              {message ||
                t(
                  "auth.verify_success_desc",
                  "Your email address has been verified. You now have full access to CardioScan."
                )}
            </p>

            {/* Permanent Patient ID Badge (Assigned upon email verification) */}
            {(patientId || user?.patient_id || (searchParams.get("test_status") === "success")) && (
              <div className="my-5 p-4 rounded-xl bg-[#E4EDE5]/70 border border-[#CCDCD0] text-start space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-[#52665A]">
                    {t("dashboard.permanent_pid", "Permanent Patient ID")}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#D6E3D8] text-[#35483E] border border-[#C5D5C8]">
                    <CheckCircle2 size={10} className="text-[#35483E]" />
                    {t("dashboard.pid_status_active", "Active Baseline")}
                  </span>
                </div>
                <div className="flex items-center justify-between bg-white/80 border border-[#CCDCD0] rounded-lg px-3 py-2">
                  <span className="font-mono text-base sm:text-lg font-bold tracking-widest text-[#35483E]">
                    {patientId || user?.patient_id || "CS-7B9K-2M4X"}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopyPid(patientId || user?.patient_id || "CS-7B9K-2M4X")}
                    className="inline-flex items-center gap-1 text-xs font-medium text-[#35483E] hover:text-[#233129] px-2.5 py-1 rounded bg-[#E4EDE5] hover:bg-[#D6E3D8] border border-[#C5D5C8] transition-colors"
                  >
                    {copiedPid ? (
                      <>
                        <Check size={12} className="text-[#35483E]" />
                        <span>{t("dashboard.copied", "Copied")}</span>
                      </>
                    ) : (
                      <>
                        <Copy size={12} className="text-[#35483E]" />
                        <span>{t("dashboard.copy_pid", "Copy")}</span>
                      </>
                    )}
                  </button>
                </div>
                <p className="text-[11px] text-[#52665A] leading-normal">
                  {t(
                    "auth.pid_assigned_note",
                    "Assigned permanently upon email verification. Retained for your clinical records."
                  )}
                </p>
              </div>
            )}

            <div className="space-y-2.5 mt-6">
              {user || searchParams.get("token") || searchParams.get("test_status") ? (
                <>
                  <button
                    type="button"
                    onClick={() => navigate("/profile?setup=true")}
                    className="glossy-btn-primary w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl font-medium text-white transition-all shadow-xs cursor-pointer"
                  >
                    <span>{t("auth.btn_complete_profile", "Complete Profile Baseline →")}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate("/dashboard")}
                    className="w-full py-2.5 px-4 text-xs sm:text-sm font-medium text-[#52665A] hover:text-[#35483E] transition-colors rounded-xl bg-transparent hover:bg-[#E4EDE5]/50 border border-transparent hover:border-[#CCDCD0] cursor-pointer"
                  >
                    {t("auth.btn_skip_to_dashboard", "Continue to Dashboard")}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => navigate("/login")}
                  className="glossy-btn-primary w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl font-medium text-white transition-all shadow-xs cursor-pointer"
                >
                  <LogIn size={16} />
                  <span>{t("auth.sign_in_now", "Sign In Now")}</span>
                </button>
              )}
            </div>
          </motion.div>
        </main>

        <footer className="w-full max-w-md mx-auto py-4 text-center text-xs text-[#52665A] mt-auto">
          © 2026 CardioScan · Cardiovascular Health & ML
        </footer>
      </div>
    );
  }

  // ── State 3: Already Verified ─────────────────────────────────────────────
  if (status === "already_verified") {
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

            <div className="w-16 h-16 rounded-2xl bg-[#E4EDE5] border border-[#D3DFD5] flex items-center justify-center mx-auto mb-4 shadow-xs">
              <CheckCircle2 size={32} className="text-[#35483E]" />
            </div>

            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#35483E] tracking-tight mb-2">
              {t("auth.verify_already_title", "Email Already Verified")}
            </h1>

            <p className="text-sm text-[#52665A] mb-6 leading-relaxed">
              {t(
                "auth.verify_already_desc",
                "This email address is already verified. You can sign in to your CardioScan account directly."
              )}
            </p>

            <button
              type="button"
              onClick={() => navigate("/login")}
              className="glossy-btn-primary w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl font-medium text-white transition-all shadow-xs cursor-pointer"
            >
              <LogIn size={16} />
              <span>{t("auth.sign_in_now", "Sign In Now")}</span>
            </button>
          </motion.div>
        </main>

        <footer className="w-full max-w-md mx-auto py-4 text-center text-xs text-[#52665A] mt-auto">
          © 2026 CardioScan · Cardiovascular Health & ML
        </footer>
      </div>
    );
  }

  // ── States 4, 5, 6: Pending / Expired / Error with Resend Form ───────────────
  const isExpired = status === "expired";
  const isError = status === "error";

  return (
    <div className="min-h-screen bg-[#F7F5F0] text-[#35483E] flex flex-col justify-between p-3.5 sm:p-6 lg:p-10 selection:bg-[#E4EDE5] selection:text-[#35483E] w-full min-w-0 max-w-full overflow-x-hidden">
      {/* Top Header Navigation */}
      <header className="w-full max-w-6xl mx-auto flex items-center justify-between py-2 mb-3 min-w-0">
        <Link
          to="/login"
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-[#52665A] hover:text-[#35483E] transition-colors py-1 px-1 rounded-md"
        >
          <ArrowLeft size={15} className="rtl:rotate-180" />
          <span>{t("auth.back_login", "Back to Login")}</span>
        </Link>
        <LanguageSwitcher variant="sage" />
      </header>

      {/* Main Container - 12-column responsive layout */}
      <div className="w-full max-w-6xl mx-auto my-auto py-2 sm:py-4 min-w-0">
        <div className="grid grid-cols-1 lg:grid-cols-12 rounded-3xl overflow-hidden border border-[#E5E0D6] shadow-xl bg-white/40 backdrop-blur-md min-w-0">
          {/* Editorial Left Hero Panel (Desktop) */}
          <LeftPanel />

          {/* Form & Actions Area */}
          <div className="lg:col-span-7 flex flex-col justify-center items-center p-4 sm:p-8 lg:p-12 relative min-w-0 w-full">
            {/* Mobile Header Brand (hidden on desktop) */}
            <div className="lg:hidden flex justify-center items-center gap-2.5 mb-6">
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
              initial={{ scale: 0.98, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 220, damping: 20 }}
              className="w-full max-w-md glossy-card rounded-2xl p-6 sm:p-8 relative"
            >
              <div className="glossy-sheen-sweep" />

              {/* Status Header Badge */}
              <div className="flex items-center gap-3 mb-4">
                {isError ? (
                  <div className="w-12 h-12 rounded-xl bg-[#FAF0EE] border border-[#F0D5D0] flex items-center justify-center shrink-0 shadow-xs">
                    <AlertCircle size={24} className="text-[#B35D52]" />
                  </div>
                ) : isExpired ? (
                  <div className="w-12 h-12 rounded-xl bg-[#FAF0EE] border border-[#F0D5D0] flex items-center justify-center shrink-0 shadow-xs">
                    <Clock size={24} className="text-[#B35D52]" />
                  </div>
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-[#E4EDE5] border border-[#D3DFD5] flex items-center justify-center shrink-0 shadow-xs">
                    <Mail size={24} className="text-[#35483E]" />
                  </div>
                )}

                <div>
                  <h1 className="font-serif text-xl sm:text-2xl font-bold text-[#35483E] tracking-tight">
                    {isError
                      ? t("auth.verify_invalid_title", "Verification Link Invalid")
                      : isExpired
                      ? t("auth.verify_expired_title", "Verification Link Expired")
                      : t("auth.verify_pending_title", "Verify Your Email")}
                  </h1>
                </div>
              </div>

              {/* Description */}
              <p className="text-sm text-[#52665A] leading-relaxed mb-6">
                {isError
                  ? message ||
                    t(
                      "auth.verify_invalid_desc",
                      "This verification link is invalid or has already been used. If you have already verified your email, you can sign in directly."
                    )
                  : isExpired
                  ? message ||
                    t(
                      "auth.verify_expired_desc",
                      "Your verification link has expired (links are valid for 24 hours). Enter your email below to request a fresh one."
                    )
                  : t(
                      "auth.verify_pending_desc",
                      "We dispatched a verification link to your inbox. Click the link inside to activate your account."
                    )}
              </p>

              {/* Interactive Resend Form */}
              <form onSubmit={handleResend} className="space-y-4">
                <div>
                  <label
                    htmlFor="verify-email-input"
                    className="block text-xs font-bold text-[#35483E] uppercase tracking-wider mb-2"
                  >
                    {t("auth.enter_registered_email", "Registered Email")}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 start-0 ps-3.5 flex items-center pointer-events-none text-[#52665A]/60">
                      <Mail size={16} />
                    </div>
                    <input
                      id="verify-email-input"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={t("auth.email_placeholder", "name@example.com")}
                      required
                      autoComplete="email"
                      className="glossy-input w-full ps-10 pe-4 py-2.5 rounded-xl text-sm"
                    />
                  </div>
                </div>

                {/* Primary Resend Action */}
                <button
                  type="submit"
                  disabled={resendStatus === "sending" || cooldown > 0 || !email.trim()}
                  className="glossy-btn-primary w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl font-medium text-white transition-all shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {resendStatus === "sending" ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" />
                      <span>{t("auth.sending", "Sending...")}</span>
                    </>
                  ) : cooldown > 0 ? (
                    <>
                      <Clock size={16} />
                      <span>{t("auth.resend_cooldown", { time: fmtCooldown(cooldown) })}</span>
                    </>
                  ) : (
                    <>
                      <Mail size={16} />
                      <span>
                        {resendStatus === "sent"
                          ? t("auth.resend_verification", "Resend verification email")
                          : t("auth.resend_verification", "Resend verification email")}
                      </span>
                    </>
                  )}
                </button>

                {/* Check Verification Status Secondary Action */}
                <button
                  type="button"
                  onClick={handleCheckStatus}
                  disabled={checking || !email.trim()}
                  className="glossy-btn-secondary w-full flex items-center justify-center gap-2 py-2.5 px-6 rounded-xl font-medium transition-all shadow-xs cursor-pointer text-xs sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {checking ? (
                    <>
                      <RefreshCw size={14} className="animate-spin text-[#35483E]" />
                      <span>{t("auth.checking_status", "Checking status...")}</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={15} className="text-[#35483E]" />
                      <span>{t("auth.check_status_btn", "Check Verification Status")}</span>
                    </>
                  )}
                </button>
              </form>

              {/* Status & Feedback message */}
              {resendMsg && (
                <div
                  className={`mt-4 p-3 rounded-xl text-xs flex items-start gap-2 ${
                    resendStatus === "sent"
                      ? "bg-[#E4EDE5] border border-[#D3DFD5] text-[#35483E]"
                      : "bg-[#FAF0EE] border border-[#F0D5D0] text-[#B35D52]"
                  }`}
                >
                  {resendStatus === "sent" ? (
                    <CheckCircle size={15} className="shrink-0 text-[#35483E] mt-0.5" />
                  ) : (
                    <AlertCircle size={15} className="shrink-0 text-[#B35D52] mt-0.5" />
                  )}
                  <span className="leading-relaxed">{resendMsg}</span>
                </div>
              )}

              {/* Spam folder notice */}
              <div className="mt-5 pt-4 border-t border-[#E5E0D6] text-center space-y-3">
                <p className="text-xs text-[#52665A]/80 leading-relaxed">
                  {t(
                    "auth.check_spam_notice",
                    "Don't forget to check your spam or junk folder if you don't see the email."
                  )}
                </p>

                <div>
                  <Link
                    to="/login"
                    className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[#35483E] hover:underline"
                  >
                    <span>{t("auth.back_login", "Back to Login")}</span>
                  </Link>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Global Footer */}
      <footer className="w-full max-w-6xl mx-auto py-4 text-center text-xs text-[#52665A] mt-auto">
        © 2026 CardioScan · Cardiovascular Health & ML
      </footer>
    </div>
  );
}