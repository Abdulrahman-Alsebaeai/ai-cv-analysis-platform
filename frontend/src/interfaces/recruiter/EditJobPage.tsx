import Link from "next/link";
import { requireRole } from "@/lib/authGuard";
import { createServerSupabase } from "@/lib/supabaseServer";
import { JobEditForm } from "@/components/jobs/JobEditForm";
import { isUuid } from "@/lib/validators";
import { getServerLang, tFromLang } from "@/lib/server-lang";

export const dynamic = "force-dynamic";

export async function EditJobPage({ params }: { params: { id: string } | Promise<{ id: string }> }) {
  const lang = await getServerLang();
  const t = (ar: string, en: string) => tFromLang(lang, ar, en);
  await requireRole(["admin", "employer", "evaluator"]);

  const resolvedParams = await params;
  const id = resolvedParams.id;

  if (!isUuid(id)) {
    return <div className="alert alertDanger">{t("معرّف الوظيفة غير صحيح.", "Invalid job identifier.")}</div>;
  }

  const supabase = await createServerSupabase();
  const { data: job, error } = await supabase
    .from("jobs")
    .select("id,title,description,location,is_remote,employment_type,status,updated_at")
    .eq("id", id)
    .maybeSingle();

  const { count } = await supabase
    .from("candidate_resumes")
    .select("*", { count: "exact", head: true })
    .eq("job_id", id);

  if (error || !job) {
    return <div className="alert alertDanger">{t("لم يتم العثور على الوظيفة.", "The job could not be found.")}</div>;
  }

  return (
    // التعديل الجذري: استخدام flex-column لترتيب الصفحة عمودياً بنسبة 100% ومنع التداخل
    <div style={{ display: "flex", flexDirection: "column", gap: 24, width: "100%", maxWidth: "100%" }}>

      <div className="pageHeader">
        <div>
          <div className="eyebrow">{t("تعديل الوظيفة", "Edit job")}</div>
          <h1 className="pageTitle" style={{ marginTop: 10 }}>{job.title}</h1>
          <div className="smallMuted" style={{ marginTop: 6 }}>
            {t("آخر تحديث", "Last updated")}: {job.updated_at ? new Date(job.updated_at).toLocaleDateString(lang === "ar" ? "ar" : "en-US") : "—"}
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <Link href={`/dashboard/jobs/${job.id}/requirements`} className="btn">
            {t("المتطلبات", "Requirements")}
          </Link>
          <Link href={`/dashboard/jobs/${job.id}`} className="btn btnSoft">
            {t("العودة للوظيفة", "Back to job")}
          </Link>
        </div>
      </div>

      {(count ?? 0) > 0 ? (
        <div className="alert alertWarning" style={{ margin: 0 }}>
          {t("يوجد مرشحون مرتبطون بهذه الوظيفة. قد تؤثر التعديلات على نتائج الترتيب الحالية.", "Candidates are already linked to this job. Changes may affect the current ranking results.")}
        </div>
      ) : null}

      {/* إعطاء البطاقة minWidth: 0 لحمايتها من أي نصوص طويلة قد تكسر التصميم داخل النموذج */}
      <div className="card" style={{ minWidth: 0, width: "100%" }}>
        <JobEditForm job={job as any} />
      </div>

    </div>
  );
}