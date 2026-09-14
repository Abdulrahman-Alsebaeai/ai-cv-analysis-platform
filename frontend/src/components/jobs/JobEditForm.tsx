"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";
import { useI18n } from "@/lib/i18n";

type Job = { id: string; title: string; description: string; location: string | null; is_remote: boolean; employment_type: string | null; status: string };

export function JobEditForm({ job }: { job: Job }) {
  const supabase = createClient();
  const router = useRouter();
  const { t } = useI18n();

  const [title, setTitle] = useState(job.title ?? "");
  const [description, setDescription] = useState(job.description ?? "");
  const [location, setLocation] = useState(job.location ?? "");
  const [employmentType, setEmploymentType] = useState(job.employment_type ?? "full-time");
  const [isRemote, setIsRemote] = useState(!!job.is_remote);
  const [status, setStatus] = useState(job.status === "hidden" ? "hidden" : "open");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const previewMeta = useMemo(() => [isRemote ? t("عن بُعد", "Remote") : t("حضوري", "On-site"), employmentType, location || t("الموقع غير محدد", "Location not set")], [employmentType, isRemote, location, t]);
  const isSuccess = Boolean(msg?.startsWith("✅"));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setLoading(true);

    const { error } = await supabase.from("jobs").update({ title, description, location: location || null, employment_type: employmentType, is_remote: isRemote, status }).eq("id", job.id);

    setLoading(false);
    if (error) {
      setMsg(error.message);
      return;
    }

    setMsg(t("✅ تم تحديث الوظيفة.", "✅ Job updated."));
    router.refresh();
  }

  return (
    <div className="twoCol">
      <form onSubmit={onSubmit} className="card" style={{ display: "grid", gap: 16 }}>
        <div>
          <div className="eyebrow">{t("تحديث الدور", "Update role")}</div>
          <h3 className="section-title" style={{ marginTop: 10 }}>{t("حرر البيانات مع الحفاظ على الاتساق الحالي", "Edit the role while preserving the current workflow")}</h3>
        </div>

        <div className="field"><label>{t("عنوان الوظيفة", "Job title")}</label><input className="input" value={title} onChange={(e) => setTitle(e.target.value)} required /></div>
        <div className="field"><label>{t("وصف الوظيفة", "Job description")}</label><textarea className="textarea" value={description} onChange={(e) => setDescription(e.target.value)} required rows={8} /></div>

        <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
          <div className="field"><label>{t("الموقع", "Location")}</label><input className="input" value={location} onChange={(e) => setLocation(e.target.value)} placeholder={t("اختياري", "Optional")} /></div>
          <div className="field"><label>{t("نوع التوظيف", "Employment type")}</label><select className="select" value={employmentType} onChange={(e) => setEmploymentType(e.target.value)}><option value="full-time">{t("دوام كامل", "Full-time")}</option><option value="part-time">{t("دوام جزئي", "Part-time")}</option><option value="contract">{t("عقد", "Contract")}</option></select></div>
          <div className="field"><label>{t("الحالة", "Status")}</label><select className="select" value={status} onChange={(e) => setStatus(e.target.value)}><option value="open">{t("مفتوحة", "Open")}</option><option value="hidden">{t("مخفية", "Hidden")}</option></select></div>
        </div>

        <label className="switchRow"><input type="checkbox" checked={isRemote} onChange={(e) => setIsRemote(e.target.checked)} /><span>{t("هذا الدور متاح عن بُعد", "This role is remote")}</span></label>

        <div className="actionsRow"><button className="btn btnPrimary" disabled={loading} type="submit">{loading ? t("جاري الحفظ...", "Saving...") : t("حفظ التعديلات", "Save changes")}</button></div>
        {msg ? <div className={isSuccess ? "alert alertSuccess" : "alert alertDanger"}>{msg}</div> : null}
      </form>

      <aside className="card soft sideSticky">
        <div className="eyebrow">{t("ملخص سريع", "Quick summary")}</div>
        <h3 className="section-title" style={{ marginTop: 10 }}>{title}</h3>
        <div className="jobMeta" style={{ marginTop: 10 }}>{previewMeta.map((item) => <span key={item} className="badge badge-muted">{item}</span>)}</div>
        <p className="smallMuted" style={{ marginTop: 16 }}>{description}</p>
      </aside>
    </div>
  );
}
