"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabaseClient";
import { useI18n } from "@/lib/i18n";

export function ApplicantProfileForm({ initial }: { initial: { full_name: string; phone: string; role: "applicant" | "evaluator" | "employer" | "admin" } }) {
  const supabase = createClient();
  const { t } = useI18n();
  const [fullName, setFullName] = useState(initial.full_name);
  const [phone, setPhone] = useState(initial.phone);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      setMsg(t("يجب تسجيل الدخول.", "You need to sign in."));
      return;
    }

    const { error } = await supabase.from("profiles").upsert({ id: user.id, full_name: fullName, phone: phone || null });

    setLoading(false);
    if (error) {
      setMsg(error.message);
      return;
    }
    setMsg(t("✅ تم حفظ البيانات.", "✅ Profile saved."));
  }

  return (
    <form onSubmit={save} className="grid" style={{ gap: 18 }}>
      <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
        <label>
          <span style={{ display: "block", fontWeight: 900, marginBottom: 8 }}>{t("الاسم الكامل", "Full name")}</span>
          <input value={fullName} onChange={(e) => setFullName(e.target.value)} required className="input" />
          <span className="smallMuted" style={{ display: "block", marginTop: 6 }}>{t("سيظهر هذا الاسم في طلباتك وحسابك داخل المنصة.", "This name appears across your account and application records.")}</span>
        </label>

        <label>
          <span style={{ display: "block", fontWeight: 900, marginBottom: 8 }}>{t("رقم الهاتف", "Phone number")}</span>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={t("اختياري", "Optional")} className="input" dir="ltr" />
          <span className="smallMuted" style={{ display: "block", marginTop: 6 }}>{t("يساعد فرق التوظيف على التواصل معك بسرعة أكبر عند الحاجة.", "This helps hiring teams reach you faster when needed.")}</span>
        </label>
      </div>

      <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
        <div className="info-pill"><div className="smallMuted">{t("الدور الحالي", "Current role")}</div><div style={{ fontWeight: 950, marginTop: 8 }}>{initial.role}</div></div>
        <div className="info-pill"><div className="smallMuted">{t("اكتمال الملف", "Profile completion")}</div><div style={{ fontWeight: 950, marginTop: 8 }}>{fullName ? (phone ? "100%" : "80%") : "40%"}</div></div>
      </div>

      <div className="actionsRow">
        <button className="btn btnPrimary" disabled={loading} type="submit">{loading ? t("جاري الحفظ...", "Saving...") : t("حفظ التعديلات", "Save changes")}</button>
      </div>

      {msg ? <div className={msg.startsWith("✅") ? "alert alertSuccess" : "alert alertDanger"}>{msg}</div> : null}
    </form>
  );
}
