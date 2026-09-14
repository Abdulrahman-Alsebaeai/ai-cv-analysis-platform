import Link from "next/link";
import { requireRole } from "@/lib/authGuard";
import { createServerSupabase } from "@/lib/supabaseServer";
import { isUuid } from "@/lib/validators";
import { JobForm } from "@/components/jobs/JobForm";
import { getServerLang, tFromLang } from "@/lib/server-lang";

export const dynamic = "force-dynamic";

export async function NewJobPage() {
  const lang = await getServerLang();
  const t = (ar: string, en: string) => tFromLang(lang, ar, en);
  const { userId } = await requireRole(["admin", "employer", "evaluator"]);
  const supabase = await createServerSupabase();

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("company_id")
    .eq("id", userId)
    .maybeSingle();
  const companyId = profile?.company_id;

  if (error || !isUuid(companyId)) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 24, width: "100%", maxWidth: "100%" }}>
        <div className="pageHeader">
          <div>
            <h1 className="pageTitle">{t("إنشاء وظيفة جديدة", "Create new job")}</h1>
            <div className="smallMuted" style={{ marginTop: 8 }}>
              {t("يجب ربط الحساب بمنظمة قبل النشر.", "Your account must be linked to an organization before publishing.")}
            </div>
          </div>
          <Link href="/dashboard/company" className="btn">
            {t("إعداد الشركة", "Company setup")}
          </Link>
        </div>
        <div className="card">
          <div className="alert alertDanger">
            {t("لا يمكن إنشاء وظيفة قبل ربط الحساب بـ company_id صحيح.", "A valid company_id is required before creating a job.")}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, width: "100%", maxWidth: "100%", overflowX: "hidden" }}>

      <div className="pageHeader">
        <div>
          <div className="eyebrow">{t("إنشاء وظيفة", "Create job")}</div>
          <h1 className="pageTitle" style={{ marginTop: 10 }}>
            {t("ابدأ وظيفة جديدة بخطوات واضحة", "Start a new role with a clear professional flow")}
          </h1>
        </div>
        <Link href="/dashboard/jobs" className="btn">
          {t("رجوع", "Back")}
        </Link>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 24, alignItems: "flex-start", width: "100%" }}>

        {/* 
          السر هنا: 
          تمت إضافة overflowWrap و wordBreak لإجبار النصوص المتصلة على الكسر.
          وتمت إضافة overflow: hidden لمنع أي عنصر داخلي من التمدد خارج البطاقة.
        */}
        <div
          className="card"
          style={{
            flex: "1 1 500px",
            minWidth: 0,
            maxWidth: "100%",
            overflow: "hidden",
            overflowWrap: "anywhere",  /* يجبر النص الطويل على النزول لسطر جديد */
            wordBreak: "break-word"    /* يكسر الكلمات التي لا تحتوي على مسافات */
          }}
        >
          <JobForm companyId={companyId} createdBy={userId} />
        </div>

        <div
          style={{
            flex: "1 1 350px",
            minWidth: 0,
            maxWidth: "100%",
            display: "flex",
            flexDirection: "column",
            gap: 24
          }}
        >
          <div className="card">
            <div style={{ fontWeight: 700, fontSize: 18 }}>{t("هيكل النموذج", "Form flow")}</div>
            <div className="timelineList" style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 20 }}>

              <div className="timelineItem" style={{ display: "flex", gap: 14 }}>
                <div style={{ width: 14, height: 14, borderRadius: "50%", background: "var(--primary)", marginTop: 4, flexShrink: 0, boxShadow: "0 0 0 4px rgba(40, 89, 255, 0.1)" }} />
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>{t("معلومات أساسية", "Basic information")}</div>
                  <div className="smallMuted" style={{ marginTop: 4 }}>{t("العنوان والموقع ونمط العمل والحالة.", "Title, location, work mode, and status.")}</div>
                </div>
              </div>

              <div className="timelineItem" style={{ display: "flex", gap: 14 }}>
                <div style={{ width: 14, height: 14, borderRadius: "50%", background: "var(--primary)", marginTop: 4, flexShrink: 0, boxShadow: "0 0 0 4px rgba(40, 89, 255, 0.1)" }} />
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>{t("الوصف والمتطلبات", "Description and requirements")}</div>
                  <div className="smallMuted" style={{ marginTop: 4 }}>{t("أضف وصفًا واضحًا ثم انتقل للمحرر التفصيلي للأوزان والمتطلبات.", "Add a clear description, then continue to the requirement and weight editor.")}</div>
                </div>
              </div>

              <div className="timelineItem" style={{ display: "flex", gap: 14 }}>
                <div style={{ width: 14, height: 14, borderRadius: "50%", background: "var(--primary)", marginTop: 4, flexShrink: 0, boxShadow: "0 0 0 4px rgba(40, 89, 255, 0.1)" }} />
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>{t("النشر والتشغيل", "Publish and operate")}</div>
                  <div className="smallMuted" style={{ marginTop: 4 }}>{t("ارفع السير الذاتية، شغّل التحليل، وراجع الترتيب والـ pipeline.", "Upload resumes, run analysis, then review ranking and pipeline.")}</div>
                </div>
              </div>

            </div>
          </div>

          <div className="dashboard-banner" style={{ height: "280px", minHeight: "280px", position: "relative", borderRadius: 24, overflow: "hidden", boxShadow: "var(--shadow-md)" }}>
            <img
              src="https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1200&q=80"
              alt={t("فريق يخطط لوظيفة جديدة", "Team planning a new role")}
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", zIndex: 0 }}
            />

            <div className="dashboard-bannerContent" style={{ position: "absolute", inset: 0, zIndex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: "24px", background: "linear-gradient(to top, rgba(15, 23, 42, 0.8) 0%, transparent 100%)", color: "#fff" }}>
              <div className="eyebrow" style={{ background: "rgba(255,255,255,.14)", color: "#fff", borderColor: "rgba(255,255,255,.18)", alignSelf: "flex-start" }}>
                {t("نشر احترافي", "Professional publishing")}
              </div>
              <div style={{ fontWeight: 700, fontSize: 22, marginTop: 12, textShadow: "0 2px 8px rgba(0,0,0,0.4)" }}>
                {t("بطاقة معاينة حيّة للوصف العام للوظيفة", "A live premium preview for the job summary")}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}