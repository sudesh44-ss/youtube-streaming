"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { Language, translations } from "./translations";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => Promise<void>;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  language: "en",
  setLanguage: async () => {},
  t: (key: string) => key,
});

export const LANGUAGE_COOKIE = "app_language";

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>("en");

  // Read initial language on client mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem("app_language");
      if (stored === "hi" || stored === "en") {
        setLanguageState(stored);
        document.documentElement.lang = stored;
        return;
      }
      // Check cookie fallback
      const match = document.cookie.match(new RegExp(`(?:^|; )${LANGUAGE_COOKIE}=([^;]*)`));
      if (match && (match[1] === "hi" || match[1] === "en")) {
        setLanguageState(match[1] as Language);
        document.documentElement.lang = match[1];
      }
    } catch {
      // Non-fatal
    }
  }, []);

  const setLanguage = useCallback(async (newLang: Language) => {
    setLanguageState(newLang);
    try {
      localStorage.setItem("app_language", newLang);
      document.cookie = `${LANGUAGE_COOKIE}=${newLang}; path=/; max-age=31536000; SameSite=Lax`;
      document.documentElement.lang = newLang;
      window.dispatchEvent(new Event("languagechange"));

      // Synchronize with backend user preferences in background
      fetch("/api/user/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preferredLanguages: [newLang] }),
      }).catch(() => {});
    } catch {
      // Non-fatal
    }
  }, []);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>): string => {
      const dict = translations[language] || translations.en;
      let val = dict[key] || translations.en[key] || key;

      if (params) {
        for (const [k, v] of Object.entries(params)) {
          val = val.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
        }
      }

      return val;
    },
    [language]
  );

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useTranslation() {
  return useContext(LanguageContext);
}
