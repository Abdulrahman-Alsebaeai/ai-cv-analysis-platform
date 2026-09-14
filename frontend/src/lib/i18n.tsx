"use client";

import { createContext, useContext, useMemo, useState } from "react";
import { AppLang, LANG_COOKIE, dirFromLang, normalizeLang, pick } from "@/lib/i18n-config";

type I18nValue = {
  lang: AppLang;
  dir: "rtl" | "ltr";
  setLang: (lang: AppLang) => void;
  toggleLang: () => void;
  t: (ar: string, en: string) => string;
};

const I18nContext = createContext<I18nValue | null>(null);

function syncLang(lang: AppLang) {
  if (typeof document === "undefined") return;
  const dir = dirFromLang(lang);
  document.documentElement.lang = lang;
  document.documentElement.dir = dir;
  document.cookie = `${LANG_COOKIE}=${lang}; path=/; max-age=31536000; samesite=lax`;
  try {
    window.localStorage.setItem(LANG_COOKIE, lang);
  } catch {}
}

export function LanguageProvider({ initialLang, children }: { initialLang: AppLang; children: React.ReactNode }) {
  const [lang, setLangState] = useState<AppLang>(normalizeLang(initialLang));

  const setLang = (nextLang: AppLang) => {
    const normalized = normalizeLang(nextLang);
    syncLang(normalized);
    setLangState(normalized);
  };

  const value = useMemo<I18nValue>(() => ({
    lang,
    dir: dirFromLang(lang),
    setLang,
    toggleLang: () => setLang(lang === "ar" ? "en" : "ar"),
    t: (ar, en) => pick(lang, ar, en),
  }), [lang]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const value = useContext(I18nContext);
  if (!value) throw new Error("useI18n must be used inside LanguageProvider");
  return value;
}
