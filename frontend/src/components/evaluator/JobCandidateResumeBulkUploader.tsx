"use client";

import { useCallback, useMemo, useState } from "react";
import { createClient } from "@/lib/supabaseClient";
import { useI18n } from "@/lib/i18n";

type Item = {
  file: File;
  nameGuess: string;
  stage: "queued" | "creating_candidate" | "creating_resume" | "uploading" | "finalizing" | "done" | "failed";
  message?: string;
};

function guessName(filename: string) {
  const base = filename.replace(/\.[^/.]+$/, "");
  return base.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim() || "Candidate";
}

export function JobCandidateResumeBulkUploader({ jobId }: { jobId: string }) {
  const { t } = useI18n();
  const supabase = useMemo(() => createClient(), []);
  const [items, setItems] = useState<Item[]>([]);
  const [dragOver, setDragOver] = useState(false);

  const canAccept = (f: File) => {
    const n = f.name.toLowerCase();
    return n.endsWith(".pdf") || n.endsWith(".docx");
  };

  const addFiles = useCallback((files: File[]) => {
    const accepted = files.filter(canAccept);
    const mapped = accepted.map((file) => ({ file, nameGuess: guessName(file.name), stage: "queued" as const }));
    setItems((prev) => [...mapped, ...prev]);
  }, []);

  function stageLabel(stage: Item["stage"]) {
    const map: Record<Item["stage"], string> = {
      queued: t("في الانتظار", "Queued"),
      creating_candidate: t("إنشاء مرشح", "Creating candidate"),
      creating_resume: t("إنشاء سجل السيرة", "Creating resume"),
      uploading: t("رفع الملف", "Uploading"),
      finalizing: t("تحديث البيانات", "Finalizing"),
      done: t("مكتمل", "Done"),
      failed: t("فشل", "Failed"),
    };
    return map[stage];
  }

  async function processOne(idx: number) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, stage: "creating_candidate", message: "" } : it)));

    const { data: u } = await supabase.auth.getUser();
    if (!u.user) {
      setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, stage: "failed", message: t("يجب تسجيل الدخول.", "You need to sign in.") } : it)));
      return;
    }

    const { data: profile } = await supabase.from("profiles").select("company_id").eq("id", u.user.id).maybeSingle();
    const companyId = profile?.company_id;
    if (!companyId) {
      setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, stage: "failed", message: t("حسابك غير مربوط بشركة.", "Your account is not linked to a company.") } : it)));
      return;
    }

    const item = items[idx];
    const file = item.file;

    const { data: cand, error: cErr } = await supabase.from("candidates").insert({ company_id: companyId, full_name: item.nameGuess, created_by: u.user.id }).select("id").single();
    if (cErr || !cand?.id) {
      setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, stage: "failed", message: cErr?.message ?? t("فشل إنشاء المرشح.", "Failed to create candidate.") } : it)));
      return;
    }

    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, stage: "creating_resume" } : it)));

    const { data: created, error: rErr } = await supabase.from("candidate_resumes").insert({ company_id: companyId, job_id: jobId, candidate_id: cand.id, file_name: file.name, mime_type: file.type || null, status: "uploaded" }).select("id").single();
    if (rErr || !created?.id) {
      setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, stage: "failed", message: rErr?.message ?? t("فشل إنشاء سجل السيرة.", "Failed to create resume record.") } : it)));
      return;
    }

    const resumeId = created.id as string;
    const path = `c/${companyId}/jobs/${jobId}/${resumeId}/${file.name}`;
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, stage: "uploading" } : it)));

    const up = await supabase.storage.from("resumes").upload(path, file, { upsert: true, contentType: file.type || undefined });
    if (up.error) {
      setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, stage: "failed", message: up.error.message } : it)));
      return;
    }

    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, stage: "finalizing" } : it)));
    const { error: upErr } = await supabase.from("candidate_resumes").update({ storage_path: path }).eq("id", resumeId);
    if (upErr) {
      setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, stage: "failed", message: upErr.message } : it)));
      return;
    }

    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, stage: "done", message: t("✅ تم الرفع.", "✅ Uploaded.") } : it)));
  }

  async function processAll() {
    for (let i = items.length - 1; i >= 0; i--) {
      if (items[i].stage === "queued") {
        await processOne(i);
      }
    }
    window.location.reload();
  }

  return (
    <div className="card soft">
      <div className="panelHeader">
        <div>
          <div className="eyebrow">{t("رفع جماعي", "Bulk upload")}</div>
          <h3 className="section-title" style={{ marginTop: 10 }}>{t("ارفع عدة سير ذاتية دفعة واحدة", "Upload multiple resumes in one step")}</h3>
          <div className="smallMuted">{t("الملفات المدعومة: PDF و DOCX. سيتم إنشاء المرشح وربط ملفه بالوظيفة تلقائيًا.", "Supported formats: PDF and DOCX. Each file creates a candidate and links the resume to this job.")}</div>
        </div>
      </div>

      <div
        onDragEnter={() => setDragOver(true)}
        onDragLeave={() => setDragOver(false)}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); addFiles(Array.from(e.dataTransfer.files ?? [])); }}
        style={{ border: "2px dashed rgba(40,89,255,.18)", padding: 22, borderRadius: 22, background: dragOver ? "rgba(40,89,255,.06)" : "rgba(255,255,255,.52)" }}
      >
        <div style={{ fontWeight: 950 }}>{t("اسحب الملفات هنا أو اخترها يدويًا", "Drag files here or pick them manually")}</div>
        <div className="smallMuted" style={{ marginTop: 6 }}>PDF / DOCX</div>
        <div className="actionsRow" style={{ marginTop: 16 }}>
          <input className="input" style={{ maxWidth: 320 }} type="file" multiple accept=".pdf,.docx" onChange={(e) => addFiles(Array.from(e.target.files ?? []))} />
          <button className="btn btnPrimary" type="button" disabled={!items.some((x) => x.stage === "queued")} onClick={processAll}>{t("رفع الكل", "Upload all")}</button>
        </div>
      </div>

      {items.length ? (
        <div className="timeline" style={{ marginTop: 14 }}>
          {items.map((it, idx) => (
            <div key={idx} className="card flat" style={{ padding: 14 }}>
              <div className="rowStack">
                <div>
                  <div className="tableCellTitle">{it.file.name}</div>
                  <div className="smallMuted">{t("الاسم المقترح", "Suggested name")}: {it.nameGuess}</div>
                  {it.message ? <div className="smallMuted">{it.message}</div> : null}
                </div>
                <div className="actionsRow">
                  <span className={it.stage === "done" ? "badge badge-success" : it.stage === "failed" ? "badge badge-danger" : "badge badge-info"}>{stageLabel(it.stage)}</span>
                  {it.stage === "queued" ? <button className="btn" type="button" onClick={() => processOne(idx)}>{t("رفع", "Upload")}</button> : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="emptyState" style={{ marginTop: 14 }}>
          <div className="emptyIcon">CV</div>
          <div className="tableCellTitle">{t("لا توجد ملفات مضافة بعد", "No files added yet")}</div>
          <div className="smallMuted">{t("ابدأ بإضافة عدة سير ذاتية لتشغيل التحليل الجماعي لاحقًا.", "Add several resumes to continue with bulk analysis later.")}</div>
        </div>
      )}
    </div>
  );
}
