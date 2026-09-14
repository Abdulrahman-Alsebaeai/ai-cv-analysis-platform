"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";
import { useI18n } from "@/lib/i18n";
import {
  authErrorMessage,
  destinationForRole,
  isSafeInternalPath,
  normalizeRole,
  type AuthRole,
} from "@/lib/authHelpers";

export function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next");
  const { t } = useI18n();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setMsg(null);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
      if (error) {
        const friendly = authErrorMessage(error.message);
        setMsg(t(friendly.ar, friendly.en));
        return;
      }
      router.replace(destinationForRole(normalizeRole(data.user?.user_metadata?.role)));
      router.refresh();
    } catch (err) {
      setMsg(t("فشل الاتصال بالخدمة.", "Service connection failed."));
    } finally { setLoading(false); }
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", backgroundColor: "#fff" }}>
      {/* الجانب الأيمن: المحتوى البصري (ظاهر في الشاشات الكبيرة فقط) */}
      <div className="auth-visual-side" style={{
        flex: "1.1",
        background: "linear-gradient(145deg, #0f172a 0%, #1e293b 100%)",
        padding: "60px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        color: "#fff",
        position: "relative",
        overflow: "hidden"
      }}>
        {/* تأثير ضوئي خلفي */}
        <div style={{ position: "absolute", top: "-10%", right: "-10%", width: "400px", height: "400px", background: "rgba(40, 89, 255, 0.15)", filter: "blur(100px)", borderRadius: "50%" }} />

        <div>
          <div style={{ fontSize: "24px", fontWeight: 800, letterSpacing: "-1px", marginBottom: "40px" }}>CV<span style={{ color: "var(--primary)" }}>Platform</span></div>
          <h1 style={{ fontSize: "clamp(32px, 3.5vw, 48px)", fontWeight: 800, lineHeight: 1.1, maxWidth: "500px", letterSpacing: "-1.5px" }}>
            {t("الذكاء الاصطناعي في خدمة التوظيف.", "AI-powered hiring intelligence.")}
          </h1>
          <p style={{ marginTop: "24px", fontSize: "18px", color: "#94a3b8", maxWidth: "450px", lineHeight: 1.6 }}>
            {t("منصة متكاملة لتحليل السير الذاتية واكتشاف أفضل الكفاءات بسرعة ودقة متناهية.", "A unified platform to analyze resumes and discover top talent with extreme speed.")}
          </p>
        </div>

        <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", padding: "24px", borderRadius: "24px", backdropFilter: "blur(10px)" }}>
          <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
            <div style={{ width: "12px", height: "12px", borderRadius: "50%", background: "var(--success)" }} />
            <span style={{ fontSize: "14px", fontWeight: 600, color: "#cbd5e1" }}>{t("النظام يعمل بكفاءة", "System online & secure")}</span>
          </div>
        </div>
      </div>

      {/* الجانب الأيسر: نموذج الدخول */}
      <div style={{ flex: "1", display: "flex", alignItems: "center", justifyContent: "center", padding: "40px" }}>
        <div style={{ width: "100%", maxWidth: "400px" }}>
          <div style={{ marginBottom: "40px" }}>
            <h2 style={{ fontSize: "32px", fontWeight: 800, letterSpacing: "-1px", color: "#0f172a" }}>{t("تسجيل الدخول", "Sign in")}</h2>
            <p className="smallMuted" style={{ marginTop: "8px" }}>{t("أدخل بياناتك للوصول إلى لوحة التحكم", "Enter your credentials to continue")}</p>
          </div>

          <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <div className="field">
              <label className="fieldLabel" style={{ fontSize: "14px", color: "#475569" }}>{t("البريد الإلكتروني", "Email address")}</label>
              <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="name@company.com"
                style={{ height: "48px", borderRadius: "12px", border: "1.5px solid #e2e8f0", fontSize: "15px" }} />
            </div>

            <div className="field">
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                <label className="fieldLabel" style={{ fontSize: "14px", color: "#475569", marginBottom: 0 }}>{t("كلمة المرور", "Password")}</label>
                <Link href="#" style={{ fontSize: "13px", fontWeight: 600, color: "var(--primary)" }}>{t("نسيت كلمة المرور؟", "Forgot?")}</Link>
              </div>
              <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••"
                style={{ height: "48px", borderRadius: "12px", border: "1.5px solid #e2e8f0", fontSize: "15px" }} />
            </div>

            <button className="btn btnPrimary" disabled={loading} style={{ height: "50px", borderRadius: "12px", fontSize: "16px", fontWeight: 700, marginTop: "10px" }}>
              {loading ? t("جاري الدخول...", "Signing in...") : t("دخول", "Continue")}
            </button>

            {msg && <div className="alert alertDanger" style={{ borderRadius: "12px", fontSize: "14px", padding: "12px" }}>{msg}</div>}
          </form>

          <div style={{ marginTop: "40px", paddingTop: "24px", borderTop: "1px solid #f1f5f9", textAlign: "center" }}>
            <span style={{ color: "#64748b", fontSize: "14px" }}>{t("ليس لديك حساب؟", "New here?")}</span>{" "}
            <Link href="/auth/register" style={{ color: "#0f172a", fontWeight: 700, fontSize: "14px", marginInlineStart: "4px" }}>{t("أنشئ حساباً جديداً", "Create an account")}</Link>
          </div>
        </div>
      </div>
    </div>
  );
}