"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";
import { useI18n } from "@/lib/i18n";

export function JobForm({ companyId, createdBy }: { companyId: string; createdBy: string }) {
  const supabase = createClient();
  const router = useRouter();
  const { t } = useI18n();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [employmentType, setEmploymentType] = useState("full-time");
  const [isRemote, setIsRemote] = useState(false);
  const [status, setStatus] = useState<"open" | "hidden">("open");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const descCount = description.trim().length;
  const previewMeta = useMemo(() => [isRemote ? t("عن بُعد", "Remote") : t("حضوري", "On-site"), employmentType, location || t("الموقع غير محدد", "Location not set")], [employmentType, isRemote, location, t]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setLoading(true);

    const { data, error } = await supabase
      .from("jobs")
      .insert({ company_id: companyId, title, description, location: location || null, employment_type: employmentType, is_remote: isRemote, status, created_by: createdBy })
      .select("id")
      .single();

    setLoading(false);
    if (error) {
      setMsg(error.message);
      return;
    }
    router.push(`/dashboard/jobs/${data.id}/requirements`);
  }

  return (
    <div className="twoCol">
      <form onSubmit={submit} className="card" style={{ display: "grid", gap: 16 }}>
        <div>
          <div className="eyebrow">{t("المرحلة 1", "Step 1")}</div>
          <h3 className="section-title" style={{ marginTop: 10 }}>{t("معلومات الوظيفة الأساسية", "Basic job information")}</h3>
        </div>

        <div className="field">
          <label>{t("عنوان الوظيفة", "Job title")}</label>
          <input className="input" placeholder={t("مثال: Frontend Engineer", "Example: Frontend Engineer")} value={title} onChange={(e) => setTitle(e.target.value)} required />
        </div>

        <div className="field">
          <label>{t("وصف الوظيفة", "Job description")}</label>
          <textarea className="textarea" placeholder={t("اكتب ملخصًا واضحًا للمسؤوليات والمتطلبات والمهارات المطلوبة…", "Write a clear summary of responsibilities, requirements, and skills…")} value={description} onChange={(e) => setDescription(e.target.value)} required rows={8} />
          <div className="fieldHint">{t("الإرشاد: حافظ على الوصف منظمًا ليسهل توليد المتطلبات لاحقًا.", "Tip: keep the description structured so requirement generation works better later.")} • {descCount} {t("حرف", "chars")}</div>
        </div>

        <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
          <div className="field">
            <label>{t("الموقع", "Location")}</label>
            <input className="input" placeholder={t("اختياري", "Optional")} value={location} onChange={(e) => setLocation(e.target.value)} />
          </div>
          <div className="field">
            <label>{t("نوع التوظيف", "Employment type")}</label>
            <select className="select" value={employmentType} onChange={(e) => setEmploymentType(e.target.value)}>
              <option value="full-time">{t("دوام كامل", "Full-time")}</option>
              <option value="part-time">{t("دوام جزئي", "Part-time")}</option>
              <option value="contract">{t("عقد", "Contract")}</option>
            </select>
          </div>
          <div className="field">
            <label>{t("الحالة", "Status")}</label>
            <select className="select" value={status} onChange={(e) => setStatus(e.target.value as any)}>
              <option value="open">{t("مفتوحة", "Open")}</option>
              <option value="hidden">{t("مخفية", "Hidden")}</option>
            </select>
          </div>
        </div>

        <label className="switchRow"><input type="checkbox" checked={isRemote} onChange={(e) => setIsRemote(e.target.checked)} /><span>{t("هذا الدور متاح عن بُعد", "This role is remote")}</span></label>

        <div className="actionsRow">
          <button disabled={loading} type="submit" className="btn btnPrimary">{loading ? t("جاري الحفظ...", "Saving...") : t("حفظ والانتقال إلى المتطلبات", "Save and continue to requirements")}</button>
          {msg ? <span className="badge badge-danger">{msg}</span> : null}
        </div>
      </form>

      <aside className="card soft sideSticky">
        <div className="eyebrow">{t("معاينة مباشرة", "Live preview")}</div>
        <h3 className="section-title" style={{ marginTop: 10 }}>{title || t("عنوان الوظيفة سيظهر هنا", "Job title will appear here")}</h3>
        <div className="jobMeta" style={{ marginTop: 10 }}>{previewMeta.map((item) => <span key={item} className="badge badge-muted">{item}</span>)}</div>
        <p className="smallMuted" style={{ marginTop: 16 }}>{description || t("عندما تبدأ بكتابة الوصف ستظهر المعاينة هنا لتساعدك على ضبط الصياغة قبل النشر.", "As you type the description, the preview will appear here to help refine the job before publishing.")}</p>
      </aside>
    </div>
  );
}
