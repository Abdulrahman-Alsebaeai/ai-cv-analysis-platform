"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabaseClient";
import { useI18n } from "@/lib/i18n";

export function CandidateResumeUploader({ candidateId, jobs }: { candidateId: string; jobs: Array<{ id: string; title: string; status?: string }> }) {
  const supabase = createClient();
  const { t } = useI18n();
  const jobOptions = jobs.filter((j) => j.status !== "closed");
  const [jobId, setJobId] = useState(jobOptions[0]?.id ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function upload(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);

    if (!file) return setMsg(t("اختر ملفًا أولًا.", "Choose a file first."));
    if (!jobId) return setMsg(t("اختر وظيفة لربط الملف بها.", "Select a job to link this resume to."));

    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      setMsg(t("يجب تسجيل الدخول.", "You need to sign in."));
      return;
    }

    const { data: profile } = await supabase.from("profiles").select("company_id").eq("id", user.id).maybeSingle();
    const companyId = profile?.company_id;
    if (!companyId) {
      setLoading(false);
      setMsg(t("حسابك غير مربوط بشركة.", "Your account is not linked to a company."));
      return;
    }

    const { data: created, error: insErr } = await supabase
      .from("candidate_resumes")
      .insert({ company_id: companyId, job_id: jobId, candidate_id: candidateId, file_name: file.name, mime_type: file.type || null, status: "uploaded" })
      .select("id")
      .single();

    if (insErr || !created?.id) {
      setLoading(false);
      setMsg(insErr?.message ?? t("فشل إنشاء سجل السيرة الذاتية.", "Failed to create the resume record."));
      return;
    }

    const resumeId = created.id as string;
    const path = `c/${companyId}/candidates/${candidateId}/${resumeId}/${file.name}`;

    const up = await supabase.storage.from("resumes").upload(path, file, { upsert: true, contentType: file.type || undefined });
    if (up.error) {
      setLoading(false);
      setMsg(up.error.message);
      return;
    }

    const { error: upErr } = await supabase.from("candidate_resumes").update({ storage_path: path }).eq("id", resumeId);
    setLoading(false);

    if (upErr) {
      setMsg(upErr.message);
      return;
    }

    setMsg(t("✅ تم رفع الملف وربطه بالوظيفة.", "✅ Resume uploaded and linked to the job."));
    window.location.reload();
  }

  const isSuccess = Boolean(msg?.startsWith("✅"));

  return (
    <form onSubmit={upload} className="grid" style={{ gap: 14, maxWidth: 620 }}>
      <div className="field">
        <label>{t("الوظيفة المرتبطة", "Linked job")}</label>
        <select className="select" value={jobId} onChange={(e) => setJobId(e.target.value)}>
          {jobOptions.map((j) => <option key={j.id} value={j.id}>{j.title}</option>)}
        </select>
      </div>
      <div className="field">
        <label>{t("ملف السيرة الذاتية", "Resume file")}</label>
        <input className="input" type="file" accept=".pdf,.docx" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        <div className="fieldHint">{t("الامتدادات المدعومة: PDF و DOCX.", "Supported formats: PDF and DOCX.")}</div>
      </div>
      <div className="actionsRow">
        <button className="btn btnPrimary" disabled={loading} type="submit">{loading ? t("جاري الرفع...", "Uploading...") : t("رفع وربط السيرة", "Upload and link resume")}</button>
      </div>
      {msg ? <div className={isSuccess ? "alert alertSuccess" : "alert alertDanger"}>{msg}</div> : null}
    </form>
  );
}
