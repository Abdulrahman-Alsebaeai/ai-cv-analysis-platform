import Link from "next/link";
import { createServerSupabase } from "@/lib/supabaseServer";
import LogoutButton from "@/components/common/LogoutButton";
import LanguageToggle from "@/components/common/LanguageToggle";
import { getServerLang, tFromLang } from "@/lib/server-lang";

export const dynamic = "force-dynamic";

function Brand({ lang }: { lang: "ar" | "en" }) {
  return (
    <Link href="/" className="public-brand">
      <span className="public-brandMark">CV</span>
      <span>
        <div>CV Platform</div>
        <div className="smallMuted" style={{ fontSize: 12, marginTop: 2 }}>
          {tFromLang(lang, "Enterprise Hiring Intelligence", "Enterprise Hiring Intelligence")}
        </div>
      </span>
    </Link>
  );
}

async function getCurrentUserSafe() {
  try {
    const supabase = await createServerSupabase();
    const { data } = await supabase.auth.getUser();
    return data?.user ?? null;
  } catch {
    return null;
  }
}

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUserSafe();
  const lang = await getServerLang();
  const t = (ar: string, en: string) => tFromLang(lang, ar, en);

  return (
    <div>
      <header className="public-header">
        <nav className="public-nav">
          <Brand lang={lang} />

          <div className="public-links">
            <Link href="/">{t("الرئيسية", "Home")}</Link>
            <Link href="/jobs">{t("الوظائف", "Jobs")}</Link>
            <a href="/#how-it-works">{t("كيف تعمل", "How it works")}</a>
            <a href="/#features">{t("المزايا", "Features")}</a>
            <a href="/#contact">{t("تواصل", "Contact")}</a>
          </div>

          <div className="public-actions">
            <LanguageToggle />
            <Link href="/jobs" className="btn btnSoft">{t("تصفح الوظائف", "Browse jobs")}</Link>
            {user ? (
              <>
                <Link href="/applicant/dashboard" className="btn">{t("لوحة المتقدم", "Applicant dashboard")}</Link>
                <Link href="/dashboard/jobs" className="btn btnPrimary">{t("لوحة التوظيف", "Recruiting dashboard")}</Link>
                <LogoutButton />
              </>
            ) : (
              <>
                <Link href="/auth/login" className="btn">{t("تسجيل الدخول", "Log in")}</Link>
                <Link href="/auth/register" className="btn btnPrimary">{t("ابدأ الآن", "Get started")}</Link>
              </>
            )}
          </div>
        </nav>
      </header>

      <main>{children}</main>

      <footer className="footer">
        <div className="footer-grid" id="contact">
          <div>
            <div className="public-brand" style={{ marginBottom: 10 }}>
              <span className="public-brandMark">CV</span>
              <span>CV Platform</span>
            </div>
            <p className="smallMuted" style={{ margin: 0, maxWidth: 520 }}>
              {t(
                "منصة Enterprise Hiring Intelligence لفرق التوظيف الحديثة: نشر وظائف، استقبال سير ذاتية، تحليل قابل للتفسير، وترتيب موثوق جاهز للتصدير.",
                "An Enterprise Hiring Intelligence platform for modern recruiting teams: publish roles, receive resumes, run explainable analysis, and export reliable rankings."
              )}
            </p>
          </div>

          <div>
            <div style={{ fontWeight: 900, marginBottom: 10 }}>{t("المنصة", "Platform")}</div>
            <div className="smallMuted" style={{ display: "grid", gap: 8 }}>
              <Link href="/jobs">{t("الوظائف المفتوحة", "Open jobs")}</Link>
              <a href="/#features">{t("المزايا الأساسية", "Core features")}</a>
              <a href="/#how-it-works">{t("رحلة الاستخدام", "Usage journey")}</a>
            </div>
          </div>

          <div>
            <div style={{ fontWeight: 900, marginBottom: 10 }}>{t("الحلول", "Solutions")}</div>
            <div className="smallMuted" style={{ display: "grid", gap: 8 }}>
              <span>{t("لفرق التوظيف", "For recruiters")}</span>
              <span>{t("للتقييم الداخلي", "For internal review")}</span>
              <span>{t("للمتقدمين", "For applicants")}</span>
            </div>
          </div>

          <div>
            <div style={{ fontWeight: 900, marginBottom: 10 }}>{t("الثقة والدعم", "Trust & support")}</div>
            <div className="smallMuted" style={{ display: "grid", gap: 8 }}>
              <span>{t("تقارير جاهزة للتصدير", "Export-ready reports")}</span>
              <span>{t("دعم العربية والإنجليزية", "Arabic and English support")}</span>
              <span>{t("خصوصية ومعالجة مؤقتة", "Privacy-aware temporary processing")}</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
