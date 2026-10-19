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
            ? "px-2.5 py-1.5 rounded-lg border border-[#E5E0D6] dark:border-[#373C40] bg-white dark:bg-[#202326] text-[#52665A] dark:text-[#B2B7BB] hover:text-[#35483E] dark:hover:text-[#F2F3F3] hover:bg-[#F7F5F0] dark:hover:bg-[#282C30] hover:border-[#D5D0C6] dark:hover:border-[#4B5257] text-xs shadow-2xs focus:ring-[#35483E]/20 dark:focus:ring-[#789580]/30"
            : isForest
            ? "px-2.5 py-1.5 rounded-lg border border-[#E3E1D9] dark:border-[#373C40] bg-white dark:bg-[#202326] text-[#626D68] dark:text-[#B2B7BB] hover:text-[#174A3B] dark:hover:text-[#F2F3F3] hover:bg-[#F7F6F2] dark:hover:bg-[#282C30] hover:border-[#D5D2C9] dark:hover:border-[#4B5257] text-xs shadow-2xs focus:ring-[#174A3B]/30 dark:focus:ring-[#789580]/30"
            : isLight
            ? "px-2.5 py-1.5 rounded-lg border border-[#D5D2C9] dark:border-[#373C40] bg-white dark:bg-[#202326] text-[#475569] dark:text-[#B2B7BB] hover:text-[#0F172A] dark:hover:text-[#F2F3F3] hover:bg-[#F4F2EC] dark:hover:bg-[#282C30] hover:border-[#C5C2B9] dark:hover:border-[#4B5257] text-xs shadow-2xs focus:ring-[#BE123C]/50 dark:focus:ring-[#789580]/30"
            : "px-3 py-1.5 rounded-lg border border-slate-700/50 text-slate-400 hover:text-white hover:border-slate-600 text-sm focus:ring-[#BE123C]/50"
        }`}
      >
        <Globe size={13} className={isSage ? "text-[#52665A] dark:text-[#B2B7BB]" : isForest ? "text-[#626D68] dark:text-[#B2B7BB]" : isLight ? "text-[#64748B] dark:text-[#B2B7BB]" : "text-slate-400"} />
        <span>{current.flag}</span>
        <span className="hidden sm:inline font-medium">{current.label}</span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden="true" />
          <div
            className={`absolute right-0 rtl:right-auto rtl:left-0 top-10 z-50 py-1.5 min-w-[160px] shadow-xl ${
              isSage
                ? "bg-white dark:bg-[#202326] border border-[#E5E0D6] dark:border-[#373C40] rounded-xl text-[#35483E] dark:text-[#F2F3F3]"
                : isForest
                ? "bg-white dark:bg-[#202326] border border-[#E3E1D9] dark:border-[#373C40] rounded-xl text-[#202923] dark:text-[#F2F3F3]"
                : isLight
                ? "bg-white dark:bg-[#202326] border border-[#E0DED7] dark:border-[#373C40] rounded-xl text-[#1E293B] dark:text-[#F2F3F3]"
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
                        ? "bg-[#E4EDE5] dark:bg-[#282C30] text-[#35483E] dark:text-[#F2F3F3] font-semibold"
                        : "text-[#52665A] dark:text-[#B2B7BB] hover:bg-[#F7F5F0] dark:hover:bg-[#282C30] hover:text-[#35483E] dark:hover:text-[#F2F3F3]"
                      : isForest
                      ? isSelected
                        ? "bg-[#F7F6F2] dark:bg-[#282C30] text-[#174A3B] dark:text-[#F2F3F3] font-semibold"
                        : "text-[#626D68] dark:text-[#B2B7BB] hover:bg-[#F7F6F2] dark:hover:bg-[#282C30] hover:text-[#202923] dark:hover:text-[#F2F3F3]"
                      : isLight
                      ? isSelected
                        ? "bg-[#FAF9F6] dark:bg-[#282C30] text-[#BE123C] dark:text-[#F2F3F3] font-semibold"
                        : "text-[#475569] dark:text-[#B2B7BB] hover:bg-[#FAF9F6] dark:hover:bg-[#282C30] hover:text-[#0F172A] dark:hover:text-[#F2F3F3]"
                      : isSelected
                      ? "text-crimson-400"
                      : "text-slate-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <span className="text-sm">{lang.flag}</span>
                  <span>{lang.label}</span>
                  {isSelected && (
                    <span className={`ms-auto font-bold ${isSage ? "text-[#B35D52] dark:text-[#D9A19A]" : isForest ? "text-[#C87565] dark:text-[#D9A19A]" : isLight ? "text-[#BE123C] dark:text-[#D9A19A]" : "text-crimson-400"}`}>
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
