"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabaseClient";
import { useI18n } from "@/lib/i18n";

export function JobStatusToggle({ jobId, currentStatus }: { jobId: string; currentStatus: string }) {
  const supabase = createClient();
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(currentStatus);
  const [msg, setMsg] = useState<string | null>(null);

  async function toggle() {
    setMsg(null);
    setLoading(true);
    const next = status === "open" ? "hidden" : "open";
    const { error } = await supabase.from("jobs").update({ status: next }).eq("id", jobId);
    setLoading(false);
    if (error) {
      setMsg(error.message);
      return;
    }
    setStatus(next);
  }

  return (
    <div style={{ textAlign: "left" }}>
      <button onClick={toggle} disabled={loading} className="btn" style={{ padding: "8px 10px" }}>
        {loading ? "..." : status === "open" ? t("إخفاء", "Hide") : t("نشر", "Publish")}
      </button>
      {msg ? <div style={{ color: "crimson", fontSize: 12, marginTop: 6 }}>{msg}</div> : null}
    </div>
  );
}
