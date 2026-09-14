"use client";

import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n";

export default function LanguageToggle() {
  const router = useRouter();
  const { lang, setLang } = useI18n();

  const choose = (next: "ar" | "en") => {
    setLang(next);
    router.refresh();
  };

  return (
    <div className="lang-switch" aria-label="language switcher">
      <button
        type="button"
        className={lang === "ar" ? "btn btnSoft" : "btn btnGhost"}
        onClick={() => choose("ar")}
        aria-pressed={lang === "ar"}
      >
        AR
      </button>
      <button
        type="button"
        className={lang === "en" ? "btn btnSoft" : "btn btnGhost"}
        onClick={() => choose("en")}
        aria-pressed={lang === "en"}
      >
        EN
      </button>
    </div>
  );
}
