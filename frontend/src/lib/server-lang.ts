import { cookies } from "next/headers";
import { AppLang, LANG_COOKIE, normalizeLang, pick } from "@/lib/i18n-config";

export async function getServerLang(): Promise<AppLang> {
  const store = await cookies();
  return normalizeLang(store.get(LANG_COOKIE)?.value);
}

export function tFromLang(lang: AppLang, ar: string, en: string): string {
  return pick(lang, ar, en);
}
