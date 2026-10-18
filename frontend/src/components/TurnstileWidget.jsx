import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from "react";
import { ShieldCheck, RefreshCw, AlertCircle } from "lucide-react";

const SCRIPT_URL = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
const DEFAULT_SITE_KEY = "1x00000000000000000000AA"; // Cloudflare official dummy pass key for dev/testing

/**
 * Cloudflare Turnstile bot protection widget.
 *
 * Props:
 * - onVerify: (token: string) => void
 * - onError: (errorCode?: string) => void
 * - onExpire: () => void
 * - theme: "dark" | "light" | "auto" (default: "dark")
 * - size: "normal" | "compact" | "flexible" (default: "normal")
 * - className: string (optional)
 *
 * Exposes imperatively via ref:
 * - reset(): resets the widget to request a new token
 */
const TurnstileWidget = forwardRef(function TurnstileWidget(
  { onVerify, onError, onExpire, theme = "dark", size = "normal", className = "" },
  ref
) {
  const containerRef = useRef(null);
  const widgetIdRef = useRef(null);
  const [status, setStatus] = useState("loading"); // "loading" | "ready" | "verified" | "error" | "expired"
  const [errorMessage, setErrorMessage] = useState(null);

  const siteKey = process.env.REACT_APP_TURNSTILE_SITE_KEY || DEFAULT_SITE_KEY;

  // Expose reset() via ref
  useImperativeHandle(ref, () => ({
    reset: () => {
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.reset(widgetIdRef.current);
          setStatus("ready");
          setErrorMessage(null);
        } catch (e) {
          console.warn("Turnstile reset error:", e);
        }
      }
    },
  }));

  const renderWidget = () => {
    if (!window.turnstile || !containerRef.current) return;

    // Remove any previous widget instance
    if (widgetIdRef.current) {
      try {
        window.turnstile.remove(widgetIdRef.current);
      } catch (_) {}
      widgetIdRef.current = null;
    }

    try {
      const id = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        theme: theme,
        size: size,
        callback: (token) => {
          setStatus("verified");
          setErrorMessage(null);
          if (onVerify) onVerify(token);
        },
        "error-callback": (code) => {
          setStatus("error");
          setErrorMessage("Verification challenge failed. Please retry.");
          if (onError) onError(code);
        },
        "expired-callback": () => {
          setStatus("expired");
          setErrorMessage("Verification expired. Please verify again.");
          if (onExpire) onExpire();
        },
      });
      widgetIdRef.current = id;
      setStatus("ready");
    } catch (err) {
      console.warn("Failed to render Turnstile widget:", err);
      setStatus("error");
      setErrorMessage("Could not load bot protection widget.");
    }
  };

  useEffect(() => {
    let isMounted = true;

    // 1. If Turnstile is already on the page, render immediately
    if (window.turnstile) {
      renderWidget();
      return;
    }

    // 2. Check if script tag already exists in document
    let scriptTag = document.querySelector(`script[src="${SCRIPT_URL}"]`);
    if (!scriptTag) {
      scriptTag = document.createElement("script");
      scriptTag.src = SCRIPT_URL;
      scriptTag.async = true;
      scriptTag.defer = true;
      document.head.appendChild(scriptTag);
    }

    const checkInterval = setInterval(() => {
      if (window.turnstile) {
        clearInterval(checkInterval);
        if (isMounted) {
          renderWidget();
        }
      }
    }, 100);

    const timeout = setTimeout(() => {
      clearInterval(checkInterval);
      if (isMounted && !window.turnstile) {
        setStatus("error");
        setErrorMessage("Bot protection failed to load. Please check your network.");
      }
    }, 12000);

    return () => {
      isMounted = false;
      clearInterval(checkInterval);
      clearTimeout(timeout);
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch (_) {}
        widgetIdRef.current = null;
      }
    };
  }, [siteKey, theme, size]);

  const handleRetry = () => {
    setStatus("loading");
    setErrorMessage(null);
    renderWidget();
  };

  return (
    <div className={`my-3 flex flex-col items-center justify-center min-h-[68px] ${className}`}>
      {/* Loading state */}
      {status === "loading" && (
        <div
          className={
            theme === "light"
              ? "flex items-center gap-2 py-2.5 px-4 rounded-xl bg-[#F7F5F0] border border-[#E5E0D6] text-[#52665A] text-xs font-medium"
              : "flex items-center gap-2 py-3 px-4 rounded-xl bg-slate-900/60 border border-slate-800 text-slate-400 text-xs"
          }
        >
          <RefreshCw
            size={14}
            className={`animate-spin ${theme === "light" ? "text-[#35483E]" : "text-rose-400"}`}
          />
          <span>Initializing bot protection...</span>
        </div>
      )}

      {/* Error state */}
      {status === "error" && (
        <div
          className={
            theme === "light"
              ? "flex flex-col items-center gap-2 p-3 rounded-xl bg-[#FDF6F5] border border-[#EAC8C4] text-[#8C3A32] text-xs text-center w-full max-w-sm"
              : "flex flex-col items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs text-center w-full max-w-sm"
          }
        >
          <div className="flex items-center gap-1.5 font-medium">
            <AlertCircle size={14} className={theme === "light" ? "text-[#B35D52]" : "text-rose-400"} />
            <span>{errorMessage || "Verification challenge failed."}</span>
          </div>
          <button
            type="button"
            onClick={handleRetry}
            className={
              theme === "light"
                ? "flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#F5E2E0] text-[#7A2821] hover:bg-[#EDD4D1] transition-all text-xs font-semibold cursor-pointer"
                : "flex items-center gap-1.5 px-3 py-1 rounded-lg bg-rose-500/20 text-rose-200 hover:bg-rose-500/30 transition-all text-xs font-semibold cursor-pointer"
            }
          >
            <RefreshCw size={12} />
            <span>Retry verification</span>
          </button>
        </div>
      )}

      {/* Container where Cloudflare injects the iframe */}
      <div
        ref={containerRef}
        className={`flex justify-center w-full ${status === "loading" || status === "error" ? "hidden" : "block"}`}
      />
    </div>
  );
});

export default TurnstileWidget;
