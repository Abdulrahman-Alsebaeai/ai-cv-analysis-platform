import { CandidateCreateForm } from "@/components/evaluator/CandidateCreateForm";
import { requireRole } from "@/lib/authGuard";
import { redirect } from "next/navigation";
import { getServerLang, tFromLang } from "@/lib/server-lang";

export async function NewCandidatePage() {
  const lang = await getServerLang();
  const t = (ar: string, en: string) => tFromLang(lang, ar, en);
  const { companyId } = await requireRole(["admin", "recruiter", "employer"]);

  if (!companyId) redirect("/dashboard/onboarding");

  return (
    // التخلص من grid واستخدام الترتيب العمودي المرن لحماية الصفحة
    <div style={{ display: "flex", flexDirection: "column", gap: 24, width: "100%", maxWidth: "100%" }}>

      <div className="pageHeader">
        <div>
          <div className="eyebrow">{t("إضافة سريعة", "Quick create")}</div>
          <h1 className="pageTitle" style={{ marginTop: 10 }}>
            {t("إضافة مرشح", "Add candidate")}
          </h1>
          <div className="smallMuted" style={{ marginTop: 8 }}>
            {t("سجّل البيانات الأساسية فقط ثم أكمل رفع الملفات وربط الوظائف لاحقًا.", "Capture the essential details first, then upload resumes and link jobs later.")}
          </div>
        </div>
      </div>

      {/* حماية البطاقة وإعطاؤها عرضاً متجاوباً مع حد أقصى للحفاظ على أناقة النموذج */}
      <div className="card" style={{ maxWidth: 780, width: "100%", minWidth: 0 }}>
        <CandidateCreateForm />
      </div>

    </div>
  );
}