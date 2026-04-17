import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { CheckCircle, XCircle, Loader, Mail, RefreshCw } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import axios from "axios";

const API = process.env.REACT_APP_API_URL || "http://localhost:8000";

export default function VerifyEmailPage() {
  const [searchParams]  = useSearchParams();
  const [status, setStatus]   = useState("loading");   // loading | success | error | expired
  const [message, setMessage] = useState("");
  const [email, setEmail]     = useState("");
  const [resendStatus, setResendStatus] = useState("idle"); // idle | sending | sent | error
  const [resendMsg, setResendMsg]       = useState("");
  const [cooldown, setCooldown]         = useState(0);

  const { loginUser } = useAuth();
  const navigate = useNavigate();

  // ── Verify on mount ─────────────────────────────────────────────────────────
  useEffect(() => {
    const token = searchParams.get("token");
    if (!token) {
      setStatus("error");
      setMessage("No verification token found in the link. Please check your email for the correct link.");
      return;
    }

    axios
      .get(`${API}/auth/verify-email?token=${encodeURIComponent(token)}`)
      .then(({ data }) => {
        loginUser(data.token, data.user);
        setStatus("success");
        setMessage(`Welcome to CardioScan, ${data.user.name}!`);
        setTimeout(() => navigate("/"), 3000);
      })
      .catch((err) => {
        const data     = err?.response?.data || {};
        const expired  = data.expired === true;
        setEmail(data.email || "");
        setStatus(expired ? "expired" : "error");
        setMessage(data.error || "Verification failed. The link may be invalid.");
      });
 
}, []);


  // ── Cooldown ticker ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  // ── Resend handler ──────────────────────────────────────────────────────────
  const handleResend = async () => {
    if (!email || resendStatus === "sending" || cooldown > 0) return;
    setResendStatus("sending");
    setResendMsg("");
    try {
      const { data } = await axios.post(`${API}/auth/resend-verification`, { email });
      setResendStatus("sent");
      setResendMsg(data.message || "Verification email sent! Check your inbox.");
      setCooldown(120); // 2-minute cooldown shown to user
    } catch (err) {
      const data = err?.response?.data || {};
      setResendStatus("error");
      setResendMsg(data.error || "Failed to resend. Please try again.");
      if (data.wait_minutes) setCooldown(data.wait_minutes * 60);
    }
  };

  // ── UI helpers ───────────────────────────────────────────────────────────────
  const fmtCooldown = (s) => (s >= 60 ? `${Math.ceil(s / 60)}m` : `${s}s`);

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="glass-card p-10 text-center">

          {/* ── Loading ── */}
          {status === "loading" && (
            <>
              <div className="w-20 h-20 rounded-full bg-crimson-500/20 border border-crimson-500/30 flex items-center justify-center mx-auto mb-6">
                <Loader size={36} className="text-crimson-400 animate-spin" />
              </div>
              <h2 className="font-display text-2xl font-bold text-white mb-3">
                Verifying your email…
              </h2>
              <p className="text-slate-400 text-sm">Please wait a moment.</p>
            </>
          )}

          {/* ── Success ── */}
          {status === "success" && (
            <>
              <div className="w-20 h-20 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mx-auto mb-6">
                <CheckCircle size={40} className="text-emerald-400" />
              </div>
              <h2 className="font-display text-2xl font-bold text-white mb-3">
                Email Verified! 🎉
              </h2>
              <p className="text-slate-400 text-sm mb-2">{message}</p>
              <p className="text-slate-500 text-xs">Redirecting you to the app…</p>
            </>
          )}

          {/* ── Expired link ── */}
          {status === "expired" && (
            <>
              <div className="w-20 h-20 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center mx-auto mb-6">
                <Mail size={40} className="text-amber-400" />
              </div>
              <h2 className="font-display text-2xl font-bold text-white mb-3">
                Link Expired
              </h2>
              <p className="text-slate-400 text-sm mb-6">
                Your verification link has expired (links are valid for 24 hours). Click below to get a fresh one.
              </p>

              {/* Resend section */}
              <ResendSection
                email={email}
                status={resendStatus}
                message={resendMsg}
                cooldown={cooldown}
                fmtCooldown={fmtCooldown}
                onResend={handleResend}
              />

              <Link to="/login" className="block mt-6 text-slate-500 hover:text-slate-400 text-sm">
                Back to Login
              </Link>
            </>
          )}

          {/* ── Error ── */}
          {status === "error" && (
            <>
              <div className="w-20 h-20 rounded-full bg-crimson-500/20 border border-crimson-500/30 flex items-center justify-center mx-auto mb-6">
                <XCircle size={40} className="text-crimson-400" />
              </div>
              <h2 className="font-display text-2xl font-bold text-white mb-3">
                Verification Failed
              </h2>
              <p className="text-slate-400 text-sm mb-6">{message}</p>

              {email && (
                <ResendSection
                  email={email}
                  status={resendStatus}
                  message={resendMsg}
                  cooldown={cooldown}
                  fmtCooldown={fmtCooldown}
                  onResend={handleResend}
                />
              )}

              <Link
                to="/login"
                className="block mt-6 text-crimson-400 hover:text-crimson-300 font-medium text-sm"
              >
                Back to Login →
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Resend sub-component ────────────────────────────────────────────────────
function ResendSection({ email, status, message, cooldown, fmtCooldown, onResend }) {
  return (
    <div className="space-y-3">
      {email && (
        <p className="text-slate-500 text-xs mb-1">
          Sending to: <span className="text-slate-300">{email}</span>
        </p>
      )}

      <button
        onClick={onResend}
        disabled={status === "sending" || cooldown > 0}
        className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl
                   bg-crimson-600 hover:bg-crimson-500 disabled:opacity-50 disabled:cursor-not-allowed
                   text-white font-semibold text-sm transition-colors"
      >
        {status === "sending" ? (
          <>
            <Loader size={16} className="animate-spin" />
            Sending…
          </>
        ) : cooldown > 0 ? (
          <>
            <RefreshCw size={16} />
            Resend in {fmtCooldown(cooldown)}
          </>
        ) : (
          <>
            <Mail size={16} />
            {status === "sent" ? "Resend Again" : "Resend Verification Email"}
          </>
        )}
      </button>

      {message && (
        <p
          className={`text-xs mt-2 ${
            status === "sent" ? "text-emerald-400" : "text-crimson-400"
          }`}
        >
          {message}
        </p>
      )}

      {status !== "sent" && (
        <p className="text-slate-600 text-xs">
          Don't forget to check your spam/junk folder.
        </p>
      )}
    </div>
  );
}