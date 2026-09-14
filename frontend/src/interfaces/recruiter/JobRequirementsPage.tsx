import { createServerSupabase } from "@/lib/supabaseServer";
import { requireRole } from "@/lib/authGuard";
import { RequirementEditor } from "@/components/jobs/RequirementEditor";
import Link from "next/link";
import { isUuid } from "@/lib/validators";
import { getServerLang, tFromLang } from "@/lib/server-lang";

export const dynamic = "force-dynamic";

export async function JobRequirementsPage({ params }: { params: { id: string } | Promise<{ id: string }> }) {
  const lang = await getServerLang();
  const t = (ar: string, en: string) => tFromLang(lang, ar, en);

  // فك الوعود بطريقة آمنة
  const resolvedParams = await params;
  const id = resolvedParams.id;

  const { userId } = await requireRole(["admin", "employer", "evaluator"]);
  const supabase = await createServerSupabase();

  const { data: profile, error: pErr } = await supabase
    .from("profiles")
    .select("company_id, role")
    .eq("id", userId)
    .maybeSingle();

  const companyId = profile?.company_id;

  if (pErr || !isUuid(companyId)) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 24, width: "100%" }}>
        <div className="alert alertDanger">
          {t("حسابك غير مربوط بشركة أو القيمة ليست UUID صحيح.", "Your account is not linked to a company or the value is not a valid UUID.")}
        </div>
      </div>
    );
  }

  if (!isUuid(id)) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 24, width: "100%" }}>
        <div className="alert alertDanger">
          {t("معرّف الوظيفة غير صحيح.", "Invalid job identifier.")}
        </div>
      </div>
    );
  }

  const { data: job, error: jobErr } = await supabase
    .from("jobs")
    .select("id,title,description,status,company_id")
    .eq("id", id)
    .eq("company_id", companyId)
    .maybeSingle();

  if (jobErr || !job) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 24, width: "100%" }}>
        <div className="alert alertDanger">
          {t("لا يمكن العثور على الوظيفة أو ليست ضمن شركتك.", "The job could not be found or does not belong to your company.")}
        </div>
      </div>
    );
  }

  const { data: reqs, error: reqErr } = await supabase
    .from("job_requirements")
    .select("*")
    .eq("job_id", job.id)
    .order("created_at", { ascending: true });

  if (reqErr) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 24, width: "100%" }}>
        <div className="alert alertDanger">
          {t("خطأ في جلب المتطلبات", "Error loading requirements")}: {reqErr.message}
        </div>
      </div>
    );
  }

  return (
    // استبدال className="grid" بـ الترتيب العمودي المرن والمحمي من التمدد
    <div style={{ display: "flex", flexDirection: "column", gap: 24, width: "100%", maxWidth: "100%", overflowX: "hidden" }}>

      <div className="pageHeader">
        <div>
          <div className="eyebrow">{t("استوديو المتطلبات", "Requirements studio")}</div>
          <h1 className="pageTitle" style={{ marginTop: 10 }}>{t("المتطلبات والأوزان", "Requirements and weights")}</h1>
          <div className="smallMuted" style={{ marginTop: 6, fontWeight: 600 }}>{job.title}</div>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <Link href={`/dashboard/jobs/${job.id}`} className="btn">{t("الوظيفة", "Job")}</Link>
          <Link href={`/dashboard/jobs/${job.id}/candidates`} className="btn btnSoft">{t("المتقدمون", "Candidates")}</Link>
        </div>
      </div>

      {/* 
        حاوية محرر المتطلبات:
        إضافة minWidth: 0 و width: 100% لضمان عدم تجاوز المحرر لحجم الشاشة
      */}
      <div className="card" style={{ minWidth: 0, width: "100%", padding: "24px" }}>
        <RequirementEditor jobId={job.id} initialRequirements={reqs ?? []} />
      </div>

    </div>
  );
}