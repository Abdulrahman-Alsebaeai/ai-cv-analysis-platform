import { requireAuth } from "@/lib/authGuard";
import { createServerSupabase } from "@/lib/supabaseServer";
import { ApplicantProfileForm } from "@/components/applicant/ApplicantProfileForm";
import { getServerLang, tFromLang } from "@/lib/server-lang";

export const dynamic = "force-dynamic";

export async function ApplicantProfilePage() {
  const lang = await getServerLang();
  const t = (ar: string, en: string) => tFromLang(lang, ar, en);
  const { userId } = await requireAuth();
  const supabase = await createServerSupabase();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id,full_name,phone,role,company_id")
    .eq("id", userId)
    .maybeSingle();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, width: "100%" }}>

      {/* صورة الغلاف - بارتفاع ثابت يمنع التمدد */}
      <div
        style={{
          height: "240px",
          width: "100%",
          borderRadius: "30px",
          overflow: "hidden",
          boxShadow: "var(--shadow-lg)",
          border: "1px solid rgba(148, 163, 184, 0.14)",
          position: "relative"
        }}
      >
        <img
          src="https://images.unsplash.com/photo-1516321497487-e288fb19713f?auto=format&fit=crop&w=1400&q=80"
          alt={t("غلاف الملف الشخصي", "Profile cover")}
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        />
      </div>

      {/* البطاقة الرئيسية - مسحوبة للأعلى قليلاً لتتداخل مع الغلاف */}
      <div className="card" style={{ padding: 32, marginTop: "-50px", zIndex: 10, position: "relative" }}>

        {/* الترويسة والصورة الرمزية المتداخلة */}
        <div style={{ display: "flex", gap: "24px", alignItems: "flex-end", flexWrap: "wrap", marginTop: "-80px" }}>

          {/* الصورة الرمزية (Avatar) */}
          <div
            style={{
              width: "130px",
              height: "130px",
              borderRadius: "28px",
              overflow: "hidden",
              border: "5px solid rgba(255, 255, 255, 0.95)",
              boxShadow: "var(--shadow-md)",
              backgroundColor: "#fff",
              flexShrink: 0
            }}
          >
            <img
              src={`https://ui-avatars.com/api/?name=${encodeURIComponent(profile?.full_name || "U")}&background=2859ff&color=fff&size=160`}
              alt={t("الصورة الرمزية", "Avatar")}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </div>

          <div style={{ paddingBottom: "10px" }}>
            <div className="eyebrow">{t("الملف المهني", "Professional profile")}</div>
            <h1 className="pageTitle" style={{ marginTop: 10 }}>{profile?.full_name || t("الملف الشخصي", "Profile")}</h1>
            <p className="smallMuted" style={{ marginTop: 8, maxWidth: "600px" }}>
              {t("حدّث بياناتك لزيادة فرصك الوظيفية وإظهار ملفك بصورة أكثر احترافية.", "Update your details to strengthen your opportunities and present your profile more professionally.")}
            </p>
          </div>
        </div>

        {/* الإحصائيات (مدمجة بشبكة آمنة لا تتكسر) */}
        <div
          style={{
            display: "grid",
            gap: "16px",
            marginTop: "36px",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))"
          }}
        >
          <div className="kpiCard">
            <div className="kpiLabel">{t("الدور", "Role")}</div>
            <div className="kpiValue" style={{ fontSize: 22, textTransform: "capitalize" }}>
              {profile?.role ?? "Applicant"}
            </div>
          </div>
          <div className="kpiCard">
            <div className="kpiLabel">{t("الهاتف", "Phone")}</div>
            <div className="kpiValue" style={{ fontSize: 22 }}>
              {profile?.phone || "—"}
            </div>
          </div>
          <div className="kpiCard">
            <div className="kpiLabel">{t("اكتمال الملف", "Profile completion")}</div>
            <div className="kpiValue" style={{ fontSize: 22 }}>
              {profile?.full_name ? (profile?.phone ? "100%" : "80%") : "40%"}
            </div>
          </div>
        </div>

        {/* نموذج تعديل البيانات */}
        <div className="card" style={{ marginTop: 32, background: "rgba(248, 251, 255, 0.82)", boxShadow: "none", border: "1px solid rgba(148, 163, 184, 0.15)" }}>
          <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 16 }}>
            {t("البيانات الأساسية", "Basic Information")}
          </div>
          <ApplicantProfileForm
            initial={{
              full_name: profile?.full_name ?? "",
              phone: profile?.phone ?? "",
              role: (profile?.role as any) ?? "applicant"
            }}
          />
        </div>

      </div>
    </div>
  );
}