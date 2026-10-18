import React, { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Globe } from "lucide-react";

const LANGUAGES = [
  { code: "en", label: "English", flag: "🇺🇸" },
  { code: "hi", label: "हिंदी", flag: "🇮🇳" },
  { code: "es", label: "Español", flag: "🇪🇸" },
  { code: "fr", label: "Français", flag: "🇫🇷" },
  { code: "de", label: "Deutsch", flag: "🇩🇪" },
  { code: "ar", label: "العربية", flag: "🇸🇦" },
  { code: "zh", label: "中文", flag: "🇨🇳" },
  { code: "pt", label: "Português", flag: "🇧🇷" },
];

export default function LanguageSwitcher({ variant = "default" }) {
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  const currentCode = (i18n.resolvedLanguage || i18n.language || "en").split("-")[0];
  const current = LANGUAGES.find((l) => l.code === currentCode) || LANGUAGES[0];
  const isSage = variant === "sage";
  const isForest = variant === "forest" || isSage;
  const isLight = variant === "light" || isForest;

  // Dismiss on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && open) {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  const selectLanguage = (code) => {
    i18n.changeLanguage(code);
    try {
      localStorage.setItem("i18nextLng", code);
    } catch (_) {}
    if (typeof document !== "undefined") {
      document.documentElement.dir = code === "ar" ? "rtl" : "ltr";
      document.documentElement.lang = code;
    }
    setOpen(false);
  };

  return (
    <div className="relative inline-block text-start" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label="Select application language"
        className={`flex items-center gap-1.5 transition-all focus:outline-none focus:ring-2 ${
          isSage
            ? "px-2.5 py-1.5 rounded-lg border border-[#E5E0D6] bg-white text-[#52665A] hover:text-[#35483E] hover:bg-[#F7F5F0] hover:border-[#D5D0C6] text-xs shadow-2xs focus:ring-[#35483E]/20"
            : isForest
            ? "px-2.5 py-1.5 rounded-lg border border-[#E3E1D9] bg-white text-[#626D68] hover:text-[#174A3B] hover:bg-[#F7F6F2] hover:border-[#D5D2C9] text-xs shadow-2xs focus:ring-[#174A3B]/30"
            : isLight
            ? "px-2.5 py-1.5 rounded-lg border border-[#D5D2C9] bg-white text-[#475569] hover:text-[#0F172A] hover:bg-[#F4F2EC] hover:border-[#C5C2B9] text-xs shadow-2xs focus:ring-[#BE123C]/50"
            : "px-3 py-1.5 rounded-lg border border-slate-700/50 text-slate-400 hover:text-white hover:border-slate-600 text-sm focus:ring-[#BE123C]/50"
        }`}
      >
        <Globe size={13} className={isSage ? "text-[#52665A]" : isForest ? "text-[#626D68]" : isLight ? "text-[#64748B]" : "text-slate-400"} />
        <span>{current.flag}</span>
        <span className="hidden sm:inline font-medium">{current.label}</span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden="true" />
          <div
            className={`absolute right-0 rtl:right-auto rtl:left-0 top-10 z-50 py-1.5 min-w-[160px] shadow-xl ${
              isSage
                ? "bg-white border border-[#E5E0D6] rounded-xl text-[#35483E]"
                : isForest
                ? "bg-white border border-[#E3E1D9] rounded-xl text-[#202923]"
                : isLight
                ? "bg-white border border-[#E0DED7] rounded-xl text-[#1E293B]"
                : "glass-card border border-slate-700/50 rounded-lg"
            }`}
            role="listbox"
            aria-label="Available languages"
          >
            {LANGUAGES.map((lang) => {
              const isSelected = currentCode === lang.code;
              return (
                <button
                  key={lang.code}
                  type="button"
                  role="option"
                  data-lang={lang.code}
                  aria-selected={isSelected}
                  onClick={() => selectLanguage(lang.code)}
                  className={`w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-start transition-all ${
                    isSage
                      ? isSelected
                        ? "bg-[#E4EDE5] text-[#35483E] font-semibold"
                        : "text-[#52665A] hover:bg-[#F7F5F0] hover:text-[#35483E]"
                      : isForest
                      ? isSelected
                        ? "bg-[#F7F6F2] text-[#174A3B] font-semibold"
                        : "text-[#626D68] hover:bg-[#F7F6F2] hover:text-[#202923]"
                      : isLight
                      ? isSelected
                        ? "bg-[#FAF9F6] text-[#BE123C] font-semibold"
                        : "text-[#475569] hover:bg-[#FAF9F6] hover:text-[#0F172A]"
                      : isSelected
                      ? "text-crimson-400"
                      : "text-slate-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <span className="text-sm">{lang.flag}</span>
                  <span>{lang.label}</span>
                  {isSelected && (
                    <span className={`ms-auto font-bold ${isSage ? "text-[#B35D52]" : isForest ? "text-[#C87565]" : isLight ? "text-[#BE123C]" : "text-crimson-400"}`}>
                      ✓
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
