"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";
import { useI18n } from "@/lib/i18n";

type ExistingResume = { storage_path: string; file_name: string | null; mime_type: string | null; created_at: string } | null;

function getSafeExt(fileName: string) {
  const parts = fileName.split(".");
  const rawExt = (parts.length > 1 ? parts.pop() : "") || "";
  const ext = rawExt.toLowerCase().replace(/[^a-z0-9]/g, "");
  return ext || "bin";
}

function makeSafeObjectName(originalName: string) {
  const ext = getSafeExt(originalName);
  const id = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}_${Math.random().toString(16).slice(2)}`;
  return `${id}.${ext}`;
}

export function ResumeUploader({ candidateResumeId, companyId, candidateId, jobId, existingResume }: { candidateResumeId: string; companyId: string; candidateId: string; jobId: string; existingResume: ExistingResume }) {
  const supabase = createClient();
  const router = useRouter();
  const { t } = useI18n();
  const [file, setFile] = useState<File | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const currentPath = useMemo(() => existingResume?.storage_path ?? null, [existingResume]);

  async function makeSignedUrl(path: string) {
    const { data, error } = await supabase.storage.from("resumes").createSignedUrl(path, 60);
    if (error) return null;
    return data?.signedUrl ?? null;
  }

  async function onUpload() {
    setMsg(null);
    setDownloadUrl(null);
    if (!file) {
      setMsg(t("اختر ملفًا أولًا.", "Choose a file first."));
      return;
    }

    const safeName = makeSafeObjectName(file.name);
    const path = `c/${companyId}/candidates/${candidateId}/${candidateResumeId}/${safeName}`;
    setLoading(true);

    const { error: upErr } = await supabase.storage.from("resumes").upload(path, file, { upsert: true, contentType: file.type });
    if (upErr) {
      setLoading(false);
      setMsg(`${t("فشل رفع الملف", "Upload failed")}: ${upErr.message}`);
      return;
    }

    const { error: updErr } = await supabase.from("candidate_resumes").update({ storage_path: path, file_name: file.name, mime_type: file.type || null, status: "queued" }).eq("id", candidateResumeId);
    if (updErr) {
      setLoading(false);
      setMsg(`${t("تم رفع الملف لكن فشل تحديث بيانات الطلب", "The file was uploaded but the application update failed")}: ${updErr.message}`);
      return;
    }

    let analysisOk = true;
    try {
      const res = await fetch(`/api/analysis/candidate-resumes/${candidateResumeId}/analyze`, { method: "POST" });
      if (!res.ok) analysisOk = false;
    } catch {
      analysisOk = false;
    }

    setLoading(false);
    setMsg(analysisOk ? t("✅ تم رفع السيرة الذاتية وتم إرسالها للتحليل تلقائيًا.", "✅ Resume uploaded and sent for analysis automatically.") : t("✅ تم رفع السيرة الذاتية، لكن تعذر تشغيل التحليل تلقائيًا.", "✅ Resume uploaded, but automatic analysis could not be started."));
    const signed = await makeSignedUrl(path);
    if (signed) setDownloadUrl(signed);
    router.refresh();
  }

  async function onLoadExisting() {
    if (!currentPath) return;
    const signed = await makeSignedUrl(currentPath);
    if (signed) setDownloadUrl(signed);
  }

  return (
    <div className="card" style={{ padding: 20 }}>
      <div className="cardRow" style={{ alignItems: "flex-start" }}>
        <div>
          <div style={{ fontWeight: 950, fontSize: 18 }}>{t("رفع أو استبدال السيرة الذاتية", "Upload or replace resume")}</div>
          <div className="smallMuted" style={{ marginTop: 6 }}>{t("الملفات المدعومة: PDF و DOCX. يبدأ التحليل تلقائيًا بعد الرفع الناجح.", "Supported formats: PDF and DOCX. Analysis starts automatically after a successful upload.")}</div>
        </div>
        <span className="badge badge-info">{jobId}</span>
      </div>

      {existingResume ? (
        <div className="card" style={{ marginTop: 16, boxShadow: "none", background: "rgba(248,251,255,.78)" }}>
          <div className="cardRow">
            <div>
              <div style={{ fontWeight: 900 }}>{existingResume.file_name ?? t("ملف مرفوع", "Uploaded file")}</div>
              <div className="smallMuted" style={{ marginTop: 6 }}>{t("آخر تحديث", "Last uploaded")}: {new Date(existingResume.created_at).toLocaleString()}</div>
            </div>
            <button type="button" onClick={onLoadExisting} className="btn btnSoft">{t("رابط مؤقت", "Temporary link")}</button>
          </div>
        </div>
      ) : null}

      <div className="upload-dropzone" style={{ marginTop: 16 }}>
        <div style={{ fontWeight: 900, fontSize: 16 }}>{t("اسحب الملف هنا أو اختره من جهازك", "Drop the file here or choose it from your device")}</div>
        <div className="smallMuted" style={{ marginTop: 8 }}>{t("يفضّل استخدام نسخة محدثة لتظهر نتائج أدق في درجة المطابقة.", "Use the latest version of your resume for more accurate fit results.")}</div>
        <input type="file" accept=".pdf,.docx" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="input" style={{ marginTop: 18 }} />
        {file ? <div className="smallMuted" style={{ marginTop: 10 }}>{t("الملف المختار", "Selected file")}: <b>{file.name}</b></div> : null}
      </div>

      <div className="actionsRow" style={{ marginTop: 16 }}>
        <button type="button" onClick={onUpload} disabled={loading} className="btn btnPrimary">{loading ? t("جاري الرفع...", "Uploading...") : t("رفع السيرة الذاتية", "Upload resume")}</button>
        {downloadUrl ? <a className="btn" href={downloadUrl} target="_blank" rel="noreferrer">{t("فتح الملف", "Open file")}</a> : null}
      </div>

      {msg ? <div className={msg.includes("✅") ? "alert alertSuccess" : "alert alertDanger"} style={{ marginTop: 14 }}>{msg}</div> : null}
    </div>
  );
}
