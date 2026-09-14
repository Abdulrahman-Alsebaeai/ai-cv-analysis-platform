"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n";

export function OrganizationBootstrapForm() {
  const { t } = useI18n();
  const [name, setName] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setLoading(true);

    const res = await fetch("/api/org/bootstrap", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name }),
    });

    setLoading(false);
    if (!res.ok) {
      setMsg(await res.text());
      return;
    }

    setMsg(t("✅ تم إنشاء الشركة وربط الحساب.", "✅ Organization created and linked."));
    window.location.href = "/dashboard/jobs";
  }

  const isSuccess = Boolean(msg?.startsWith("✅"));

  return (
    <form onSubmit={submit} className="grid" style={{ gap: 14, maxWidth: 560 }}>
      <div className="field">
        <label>{t("اسم الشركة", "Organization name")}</label>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} required placeholder={t("مثال: Acme Inc", "Example: Acme Inc")} />
      </div>
      <div className="actionsRow">
        <button className="btn btnPrimary" disabled={loading} type="submit">{loading ? t("جاري الإنشاء...", "Creating...") : t("إنشاء وربط", "Create and link")}</button>
      </div>
      {msg ? <div className={isSuccess ? "alert alertSuccess" : "alert alertDanger"}>{msg}</div> : null}
    </form>
  );
}
