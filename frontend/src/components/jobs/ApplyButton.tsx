"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";
import { useI18n } from "@/lib/i18n";

export default function ApplyButton({ jobId }: { jobId: string }) {
  const supabase = createClient();
  const router = useRouter();
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function apply() {
    setMsg(null);
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      router.push("/auth/login?next=" + encodeURIComponent(`/jobs/${jobId}`));
      return;
    }
    const { data, error } = await supabase.rpc("apply_to_job", { p_job_id: jobId });
    setLoading(false);
    if (error) {
      setMsg(error.message);
      return;
    }
    const candidateResumeId = typeof data === "string" ? data : (data as any)?.id ?? null;
    if (!candidateResumeId) {
      setMsg(t("تعذر إنشاء طلب التقديم. حاول مرة أخرى.", "Could not create the application. Please try again."));
      return;
    }
    router.push(`/applicant/applications/${candidateResumeId}`); router.refresh();
  }

  return (
    <div>
      <button onClick={apply} disabled={loading} className="btn btnPrimary">{loading ? t("جاري التقديم...", "Applying...") : t("تقديم الآن", "Apply now")}</button>
      {msg ? <div className="alert alertDanger" style={{ marginTop: 10 }}>{msg}</div> : null}
    </div>
  );
}
