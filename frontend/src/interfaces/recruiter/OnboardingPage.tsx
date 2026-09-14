import { requireRole } from "@/lib/authGuard";
import { createServerSupabase } from "@/lib/supabaseServer";
import { redirect } from "next/navigation";
import { OrganizationBootstrapForm } from "@/components/evaluator/OrganizationBootstrapForm";
import { getServerLang, tFromLang } from "@/lib/server-lang";

export const dynamic = "force-dynamic";

export async function OnboardingPage() {
  const lang = await getServerLang();
  const t = (ar: string, en: string) => tFromLang(lang, ar, en);
  const { userId } = await requireRole(["admin", "recruiter", "viewer", "employer", "evaluator"]);
  const supabase = await createServerSupabase();

  const { data: profile } = await supabase.from("profiles").select("company_id,role,full_name").eq("id", userId).maybeSingle();
  if (profile?.company_id) redirect("/dashboard/jobs");

  return (
    // التعديل 1: الحاوية الأم أصبحت flex-column لحماية الترتيب العمودي ومنع التمدد العرضي
    <div style={{ display: "flex", flexDirection: "column", gap: 24, width: "100%", maxWidth: "100%", overflowX: "hidden" }}>

      <div className="pageHeader">
        <div>
          <div className="eyebrow">{t("التهيئة الأولى", "Onboarding")}</div>
          <h1 className="pageTitle" style={{ marginTop: 10 }}>{t("ابدأ إعداد مساحة العمل", "Start setting up your workspace")}</h1>
          <div className="smallMuted" style={{ marginTop: 8, maxWidth: "700px", lineHeight: 1.7 }}>
            {t("أنشئ منظمة جديدة أو أكمل الانضمام عبر الدعوة التي وصلك بريدها الإلكتروني.", "Create a new organization or complete your invited join flow using the email invitation you received.")}
          </div>
        </div>
      </div>

      {/* التعديل 2: تخطيط مرن (Flex Wrap) بدلاً من التقسيم الثابت 1fr 1fr */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 24, alignItems: "stretch", width: "100%" }}>

        {/* العمود الأول: نموذج إنشاء الشركة */}
        <div className="card" style={{ flex: "1 1 450px", minWidth: 0, maxWidth: "100%" }}>
          <div style={{ fontWeight: 700, fontSize: 18 }}>{t("الخيار الأول", "Option one")}</div>
          <div className="smallMuted" style={{ marginTop: 8 }}>{t("أنشئ شركة جديدة وابدأ ضبط الفريق والوظائف من البداية.", "Create a new company and start configuring your team and jobs from scratch.")}</div>
          <div style={{ marginTop: 24 }}>
            <OrganizationBootstrapForm />
          </div>
        </div>

        {/* العمود الثاني: بانر تعليمات الانضمام (مع حماية ارتفاع الصورة) */}
        <div
          className="dashboard-banner"
          style={{
            flex: "1 1 400px",
            minWidth: 0,
            maxWidth: "100%",
            height: "100%",
            minHeight: "320px",
            position: "relative",
            borderRadius: 24,
            overflow: "hidden",
            boxShadow: "var(--shadow-md)"
          }}
        >
          <img
            src="https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1200&q=80"
            alt={t("بداية إعداد مساحة العمل", "Setting up the workspace")}
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", zIndex: 0 }}
          />

          <div
            className="dashboard-bannerContent"
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 1,
              display: "flex",
              flexDirection: "column",
              justifyContent: "flex-end",
              padding: "32px",
              background: "linear-gradient(to top, rgba(15, 23, 42, 0.85) 0%, rgba(15,23,42,0.1) 80%, transparent 100%)",
              color: "#fff"
            }}
          >
            <div className="eyebrow" style={{ background: "rgba(255,255,255,.14)", color: "#fff", borderColor: "rgba(255,255,255,.18)", alignSelf: "flex-start" }}>
              {t("خيار الانضمام", "Join flow")}
            </div>
            <div style={{ fontWeight: 700, fontSize: 22, marginTop: 16, lineHeight: 1.5, textShadow: "0 2px 8px rgba(0,0,0,0.4)" }}>
              {t("إذا تمت دعوتك، سجّل الدخول بنفس البريد ليتم ربطك بالشركة تلقائيًا.", "If you were invited, sign in with the same email to be linked to the organization automatically.")}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}