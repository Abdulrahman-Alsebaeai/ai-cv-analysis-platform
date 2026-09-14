"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n";

export function InviteMemberForm() {
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"viewer" | "recruiter">("viewer");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setLoading(true);

    const res = await fetch("/api/org/invite", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, role }),
    });

    setLoading(false);
    if (!res.ok) {
      setMsg(await res.text());
      return;
    }
    setMsg(t("✅ تم إرسال الدعوة.", "✅ Invitation sent."));
    setEmail("");
  }

  const isSuccess = Boolean(msg?.startsWith("✅"));

  return (
    <form onSubmit={submit} className="grid" style={{ gap: 14, maxWidth: 560 }}>
      <div className="field">
        <label>{t("البريد الإلكتروني", "Email")}</label>
        <input className="input" dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="email@example.com" />
      </div>
      <div className="field">
        <label>{t("الدور", "Role")}</label>
        <select className="select" value={role} onChange={(e) => setRole(e.target.value as any)}>
          <option value="viewer">{t("قارئ فقط", "Viewer")}</option>
          <option value="recruiter">{t("مسؤول توظيف", "Recruiter")}</option>
        </select>
      </div>
      <div className="actionsRow">
        <button className="btn btnPrimary" disabled={loading} type="submit">{loading ? t("جاري الإرسال...", "Sending...") : t("إرسال الدعوة", "Send invitation")}</button>
      </div>
      {msg ? <div className={isSuccess ? "alert alertSuccess" : "alert alertDanger"}>{msg}</div> : null}
    </form>
  );
}
