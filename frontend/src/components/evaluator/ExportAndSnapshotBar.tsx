"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n";

export function ExportAndSnapshotBar({ jobId }: { jobId: string }) {
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function snapshot() {
    setMsg(null);
    setLoading(true);
    const res = await fetch(`/api/snapshots/jobs/${jobId}/create`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ note: "" }),
    });
    setLoading(false);
    if (!res.ok) return setMsg(await res.text());
    const j = await res.json();
    setMsg(t(`✅ تم إنشاء Snapshot: ${j.snapshot_id}`, `✅ Snapshot created: ${j.snapshot_id}`));
  }

  const isSuccess = Boolean(msg?.startsWith("✅"));

  return (
    <div className="tool-row">
      <a className="btn" href={`/api/export/jobs/${jobId}/ranking/csv`} target="_blank" rel="noreferrer">CSV</a>
      <a className="btn" href={`/api/export/jobs/${jobId}/ranking/json`} target="_blank" rel="noreferrer">JSON</a>
      <a className="btn btnPrimary" href={`/api/export/jobs/${jobId}/report/pdf`} target="_blank" rel="noreferrer">PDF</a>
      <button className="btn btnSoft" type="button" onClick={snapshot} disabled={loading}>{loading ? t("جاري الإنشاء...", "Creating...") : t("إنشاء Snapshot", "Create snapshot")}</button>
      {msg ? <span className={isSuccess ? "badge badge-success" : "badge badge-danger"}>{msg}</span> : null}
    </div>
  );
}
