"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";
import { useI18n } from "@/lib/i18n";

export function RegisterPage() {
  const router = useRouter();
  const { t } = useI18n();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setMsg(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: { data: { full_name: fullName.trim(), role: "applicant" } },
      });
      if (error) { setMsg(error.message); return; }
      router.replace("/applicant/dashboard");
    } catch (err) { setMsg("Error occurred."); } finally { setLoading(false); }
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", backgroundColor: "#fff" }}>
      {/* الجانب الأيمن التوضيحي */}
      <div className="auth-visual-side" style={{
        flex: "1",
        background: "#f8fafc",
        padding: "60px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        borderInlineEnd: "1px solid #e2e8f0"
      }}>
        <div style={{ maxWidth: "440px" }}>
          <div className="eyebrow" style={{ color: "var(--primary)", background: "rgba(40,89,255,0.08)", marginBottom: "24px" }}>{t("انضم للمستقبل", "Join the future")}</div>
          <h1 style={{ fontSize: "40px", fontWeight: 800, color: "#0f172a", letterSpacing: "-1px", lineHeight: 1.2 }}>
            {t("حلّل سيرتك الذاتية في ثوانٍ.", "Resume analysis in seconds.")}
          </h1>
          <p style={{ marginTop: "20px", fontSize: "17px", color: "#64748b", lineHeight: 1.7 }}>
            {t("انضم إلى آلاف المتقدمين الذين يستخدمون تقنياتنا للوصول إلى الوظيفة المثالية.", "Join thousands of applicants using our tech to land their dream job.")}
          </p>

          <div style={{ marginTop: "48px", display: "grid", gap: "20px" }}>
            {[
              { title: t("تحليل دقيق", "Precision Analysis"), desc: t("استخراج ذكي للمهارات والخبرات.", "Smart extraction of skills.") },
              { title: t("مطابقة ذكية", "Smart Matching"), desc: t("ربط مباشر بأفضل الوظائف المتاحة.", "Direct matching with top jobs.") }
            ].map((feat, i) => (
              <div key={i} style={{ display: "flex", gap: "16px" }}>
                <div style={{ width: "24px", height: "24px", borderRadius: "50%", background: "var(--primary)", color: "#fff", display: "grid", placeItems: "center", flexShrink: 0 }}>✓</div>
                <div>
                  <div style={{ fontWeight: 700, color: "#0f172a" }}>{feat.title}</div>
                  <div style={{ fontSize: "14px", color: "#64748b" }}>{feat.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* الجانب الأيسر: نموذج التسجيل */}
      <div style={{ flex: "1.2", display: "flex", alignItems: "center", justifyContent: "center", padding: "40px" }}>
        <div style={{ width: "100%", maxWidth: "420px" }}>
          <h2 style={{ fontSize: "32px", fontWeight: 800, letterSpacing: "-1px", marginBottom: "8px" }}>{t("إنشاء حساب", "Get started")}</h2>
          <p className="smallMuted" style={{ marginBottom: "40px" }}>{t("ابدأ رحلتك المهنية اليوم مجاناً", "Create an account to start your journey")}</p>

          <form onSubmit={onSubmit} style={{ display: "grid", gap: "20px" }}>
            <div className="field">
              <label className="fieldLabel">{t("الاسم الكامل", "Full name")}</label>
              <input className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} required placeholder="John Doe"
                style={{ height: "48px", borderRadius: "12px", border: "1.5px solid #e2e8f0" }} />
            </div>

            <div className="field">
              <label className="fieldLabel">{t("البريد الإلكتروني", "Email address")}</label>
              <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="name@example.com"
                style={{ height: "48px", borderRadius: "12px", border: "1.5px solid #e2e8f0" }} />
            </div>

            <div className="field">
              <label className="fieldLabel">{t("كلمة المرور", "Password")}</label>
              <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="At least 8 characters"
                style={{ height: "48px", borderRadius: "12px", border: "1.5px solid #e2e8f0" }} />
            </div>

            <button className="btn btnPrimary" disabled={loading} style={{ height: "52px", borderRadius: "12px", fontSize: "16px", fontWeight: 700, marginTop: "12px" }}>
              {loading ? t("جاري المعالجة...", "Creating account...") : t("إنشاء حسابي", "Create account")}
            </button>

            {msg && <div className="alert alertDanger" style={{ borderRadius: "12px" }}>{msg}</div>}
          </form>

          <div style={{ marginTop: "32px", textAlign: "center", fontSize: "14px", color: "#64748b" }}>
            {t("لديك حساب بالفعل؟", "Already have an account?")}{" "}
            <Link href="/auth/login" style={{ color: "#0f172a", fontWeight: 700 }}>{t("سجّل الدخول", "Log in")}</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RegisterPage;