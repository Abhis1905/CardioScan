import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import en from "./locales/en.json";
import hi from "./locales/hi.json";
import es from "./locales/es.json";
import fr from "./locales/fr.json";
import de from "./locales/de.json";
import ar from "./locales/ar.json";
import zh from "./locales/zh.json";
import pt from "./locales/pt.json";

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      hi: { translation: hi },
      es: { translation: es },
      fr: { translation: fr },
      de: { translation: de },
      ar: { translation: ar },
      zh: { translation: zh },
      pt: { translation: pt },
    },
    fallbackLng: "en",
    supportedLngs: ["en", "hi", "es", "fr", "de", "ar", "zh", "pt"],
    nonExplicitSupportedLngs: true,
    cleanCode: true,
    detection: {
      order: ["localStorage", "navigator"],
      lookupLocalStorage: "i18nextLng",
      caches: ["localStorage"],
    },
    interpolation: { escapeValue: false },
  });

const syncDirection = (lng) => {
  if (typeof document === "undefined") return;
  const code = (lng || "en").split("-")[0];
  document.documentElement.dir = code === "ar" ? "rtl" : "ltr";
  document.documentElement.lang = code;
};

i18n.on("languageChanged", syncDirection);
syncDirection(i18n.resolvedLanguage || i18n.language);

export default i18n;
