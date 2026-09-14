"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";
import { useI18n } from "@/lib/i18n";

export default function LogoutButton() {
  const supabase = createClient();
  const router = useRouter();
  const { t } = useI18n();

  async function logout() {
    await supabase.auth.signOut();
    router.push("/auth/login");
    router.refresh();
  }

  return (
    <button onClick={logout} className="btn" type="button" aria-label={t("تسجيل الخروج", "Log out")}>
      {t("تسجيل الخروج", "Log out")}
    </button>
  );
}
