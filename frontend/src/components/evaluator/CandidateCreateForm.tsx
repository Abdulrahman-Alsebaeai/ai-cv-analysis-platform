"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabaseClient";
import { useI18n } from "@/lib/i18n";

export function CandidateCreateForm() {
  const supabase = createClient();
  const { t } = useI18n();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      setMsg(t("يجب تسجيل الدخول أولًا.", "You must sign in first."));
      return;
    }

    const { data: profile } = await supabase.from("profiles").select("company_id").eq("id", user.id).maybeSingle();
    const companyId = profile?.company_id;
    if (!companyId) {
      setLoading(false);
      setMsg(t("حسابك غير مربوط بشركة.", "Your account is not linked to a company."));
      return;
    }

    const { error } = await supabase.from("candidates").insert({
      company_id: companyId,
      full_name: fullName,
      email: email || null,
      phone: phone || null,
      created_by: user.id,
    });

    setLoading(false);
    if (error) {
      setMsg(error.message);
      return;
    }

    setMsg(t("✅ تم إضافة المرشح بنجاح.", "✅ Candidate added successfully."));
    window.location.href = "/dashboard/candidates";
  }

  const isSuccess = Boolean(msg?.startsWith("✅"));

  return (
    <form onSubmit={submit} className="grid" style={{ gap: 14, maxWidth: 580 }}>
      <div className="field">
        <label>{t("الاسم الكامل", "Full name")}</label>
        <input className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} required placeholder={t("مثال: أحمد محمد", "Example: Sarah Johnson")} />
      </div>
      <div className="field">
        <label>{t("البريد الإلكتروني", "Email")}</label>
        <input className="input" dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@example.com" />
      </div>
      <div className="field">
        <label>{t("رقم الهاتف", "Phone number")}</label>
        <input className="input" dir="ltr" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={t("اختياري", "Optional")} />
      </div>

      <div className="actionsRow">
        <button className="btn btnPrimary" disabled={loading} type="submit">{loading ? t("جاري الحفظ...", "Saving...") : t("إضافة المرشح", "Add candidate")}</button>
      </div>
      {msg ? <div className={isSuccess ? "alert alertSuccess" : "alert alertDanger"}>{msg}</div> : null}
    </form>
  );
}
