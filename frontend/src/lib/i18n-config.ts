export type AppLang = "ar" | "en";

export const LANG_COOKIE = "cv_lang";

export function normalizeLang(value: string | null | undefined): AppLang {
  return value === "en" ? "en" : "ar";
}

export function dirFromLang(lang: AppLang): "rtl" | "ltr" {
  return lang === "ar" ? "rtl" : "ltr";
}

export function pick(lang: AppLang, ar: string, en: string): string {
  return lang === "ar" ? ar : en;
}
