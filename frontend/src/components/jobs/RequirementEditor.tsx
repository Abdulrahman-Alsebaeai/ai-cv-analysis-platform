"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";
import { GenerateRequirementsButton } from "./GenerateRequirementsButton";
import { useI18n } from "@/lib/i18n";

type Req = { id?: string; job_id: string; req_type: string; req_value: string; weight: number; must_have: boolean; source?: string };

function makeRequirementId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c) =>
    (Number(c) ^ (Math.random() * 16 >> (Number(c) / 4))).toString(16),
  );
}

const TYPE_OPTIONS = [
  { value: "skill", labelAr: "مهارة", labelEn: "Skill" },
  { value: "years", labelAr: "سنوات خبرة", labelEn: "Years" },
  { value: "education", labelAr: "تعليم", labelEn: "Education" },
  { value: "language", labelAr: "لغة", labelEn: "Language" },
  { value: "cert", labelAr: "شهادة", labelEn: "Certification" },
  { value: "keyword", labelAr: "كلمة مفتاحية", labelEn: "Keyword" },
  { value: "free_text", labelAr: "نص حر", labelEn: "Free text" },
];

export function RequirementEditor({ jobId, initialRequirements }: { jobId: string; initialRequirements: Req[] }) {
  const supabase = createClient();
  const router = useRouter();
  const { t } = useI18n();
  const [rows, setRows] = useState<Req[]>((initialRequirements ?? []).map((r) => ({ ...r, job_id: jobId, weight: Number(r.weight ?? 1) })));
  const [msg, setMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const stats = useMemo(() => {
    const total = rows.length;
    const must = rows.filter((r) => r.must_have).length;
    const totalWeight = rows.reduce((sum, r) => sum + Number(r.weight || 0), 0);
    return { total, must, totalWeight };
  }, [rows]);

  function addRow() {
    setRows((prev) => [...prev, { id: makeRequirementId(), job_id: jobId, req_type: "skill", req_value: "", weight: 1, must_have: false, source: "manual" }]);
  }

  function updateRow(i: number, patch: Partial<Req>) {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  function removeRow(i: number) {
    setRows((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function save() {
    setMsg(null);
    setSaving(true);
    const existingIds = (initialRequirements ?? []).map((r) => r.id).filter(Boolean) as string[];
    const keptIds = rows.map((r) => r.id).filter(Boolean) as string[];
    const removedIds = existingIds.filter((id) => !keptIds.includes(id));
    const toUpsert = rows
      .filter((r) => String(r.req_value ?? "").trim())
      .map((r) => ({
        id: r.id || makeRequirementId(),
        job_id: jobId,
        req_type: r.req_type,
        req_value: String(r.req_value ?? "").trim(),
        weight: Number(r.weight ?? 1),
        must_have: Boolean(r.must_have),
        source: r.source ?? "manual",
      }));

    if (removedIds.length) {
      const { error: de } = await supabase.from("job_requirements").delete().in("id", removedIds);
      if (de) {
        setSaving(false);
        setMsg(de.message);
        return;
      }
    }

    if (toUpsert.length) {
      const { error } = await supabase.from("job_requirements").upsert(toUpsert, { onConflict: "id" });
      if (error) {
        setSaving(false);
        setMsg(error.message);
        return;
      }
    }

    setSaving(false);
    setMsg(t("✅ تم حفظ المتطلبات.", "✅ Requirements saved."));
    router.refresh();
  }

  async function deleteAuto() {
    setMsg(null);
    setSaving(true);
    const { error } = await supabase.from("job_requirements").delete().eq("job_id", jobId).eq("source", "auto");
    setSaving(false);
    if (error) return setMsg(error.message);
    setMsg(t("✅ تم حذف المتطلبات المولدة آليًا.", "✅ Auto-generated requirements removed."));
    router.refresh();
  }

  const weightRatio = Math.min(100, Math.round((stats.totalWeight / Math.max(1, stats.total * 2)) * 100));
  const isSuccess = Boolean(msg?.startsWith("✅"));

  return (
    // التغيير الأول: استخدام 'stack' بدلاً من 'grid' لترتيب العناصر عمودياً وجعل الجدول في الأسفل
    <div className="stack" style={{ gap: 24, width: "100%" }}>

      {/* القسم العلوي (البطاقة والإحصائيات) */}
      <div className="card hero-card">
        <div className="panelHeader">
          <div>
            <div className="eyebrow">{t("Requirements Studio", "Requirements Studio")}</div>
            <h2 className="section-title" style={{ marginTop: 10 }}>{t("حوّل وصف الوظيفة إلى شروط قابلة للتحرير", "Turn the job description into editable hiring requirements")}</h2>
            <div className="smallMuted" style={{ marginTop: 6 }}>{t("اضبط الأوزان، فعّل must-have، وولّد اقتراحات AI ثم احفظ التغييرات بدون التأثير على المنطق الحالي.", "Tune weights, enable must-have, generate AI suggestions, and save changes without touching the existing logic.")}</div>
          </div>
          <div className="tool-row" style={{ marginTop: 14 }}>
            <GenerateRequirementsButton jobId={jobId} />
            <button className="btn" type="button" onClick={addRow}>+ {t("إضافة متطلب", "Add requirement")}</button>
            <button className="btn btnSoft" type="button" disabled={saving} onClick={deleteAuto}>{t("حذف التوليد الآلي", "Delete auto-generated")}</button>
            <button className="btn btnPrimary" type="button" disabled={saving} onClick={save}>{saving ? t("جاري الحفظ...", "Saving...") : t("حفظ التغييرات", "Save changes")}</button>
          </div>
        </div>

        <div className="metric-grid" style={{ marginTop: 24 }}>
          <div className="metric-card"><div className="metric-label">{t("إجمالي المتطلبات", "Total requirements")}</div><div className="metric-value">{stats.total}</div></div>
          <div className="metric-card"><div className="metric-label">{t("المتطلبات الأساسية", "Must-have")}</div><div className="metric-value">{stats.must}</div></div>
          <div className="metric-card"><div className="metric-label">{t("مجموع الأوزان", "Total weight")}</div><div className="metric-value">{stats.totalWeight.toFixed(1)}</div></div>
          <div className="metric-card">
            <div className="metric-label">{t("توازن الأوزان", "Weight health")}</div>
            <div className="metric-value">{weightRatio}%</div>
            <div className="weightMeter" style={{ marginTop: 10 }}><span style={{ width: `${weightRatio}%` }} /></div>
          </div>
        </div>
      </div>

      {/* رسائل التنبيه */}
      {msg ? <div className={isSuccess ? "alert alertSuccess" : "alert alertDanger"}>{msg}</div> : null}

      {/* القسم السفلي (الجدول) */}
      {/* التغيير الثاني: إضافة حاوية التمرير الأفقي وعرض أدنى لحماية الجدول من الانضغاط */}
      <div style={{ overflowX: "auto", width: "100%", paddingBottom: "16px" }}>
        <div className="dataTable" style={{ minWidth: "950px" }}>

          <div className="requirementRowHeader">
            <div>{t("النوع", "Type")}</div>
            <div>{t("القيمة", "Value")}</div>
            <div>{t("الوزن", "Weight")}</div>
            <div style={{ textAlign: "center" }}>{t("أساسي", "Must-have")}</div>
            <div style={{ textAlign: "center" }}>{t("المصدر", "Source")}</div>
            <div style={{ textAlign: "center" }}>{t("إجراء", "Action")}</div>
          </div>

          {rows.map((r, i) => (
            <div key={r.id ?? `new-${i}`} className="requirementRow">
              <select className="select" value={r.req_type} onChange={(e) => updateRow(i, { req_type: e.target.value })}>
                {TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{t(o.labelAr, o.labelEn)}</option>)}
              </select>

              <div className="field">
                <input className="input" value={r.req_value} onChange={(e) => updateRow(i, { req_value: e.target.value, source: r.source ?? "manual" })} placeholder={t("مثال: Python أو Bachelor", "Example: Python or Bachelor")} />
              </div>

              <div className="field" style={{ gap: 8 }}>
                <input type="range" min={0} max={10} step={0.1} value={r.weight} onChange={(e) => updateRow(i, { weight: Number(e.target.value) })} style={{ width: "100%" }} />
                <div className="rowStack">
                  <span className="badge badge-info">{Number(r.weight).toFixed(1)}</span>
                  <div className="weightMeter" style={{ flex: 1, marginInlineStart: 8 }}>
                    <span style={{ width: `${Math.min(100, Number(r.weight) * 10)}%` }} />
                  </div>
                </div>
              </div>

              <label className="switchRow" style={{ justifyContent: "center", minHeight: 46, margin: 0 }}>
                <input type="checkbox" style={{ width: 18, height: 18 }} checked={Boolean(r.must_have)} onChange={(e) => updateRow(i, { must_have: e.target.checked })} />
                <span className="smallMuted">{t("نعم", "Yes")}</span>
              </label>

              <div style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
                <span className={r.source === "auto" ? "badge badge-primary" : "badge badge-muted"}>
                  {r.source ?? "manual"}
                </span>
              </div>

              <div style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
                <button className="btn btnGhost" type="button" onClick={() => removeRow(i)} style={{ color: "var(--danger)" }}>
                  {t("حذف", "Delete")}
                </button>
              </div>
            </div>
          ))}

          {rows.length === 0 ? (
            <div className="tableRow" style={{ gridTemplateColumns: "1fr", textAlign: "center", padding: "30px 16px" }}>
              <div className="smallMuted" style={{ fontSize: "1.1rem" }}>{t("لا توجد متطلبات بعد. ابدأ بالإضافة الآن.", "No requirements yet.")}</div>
            </div>
          ) : null}

        </div>
      </div>

    </div>
  );
}