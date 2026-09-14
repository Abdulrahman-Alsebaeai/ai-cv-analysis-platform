import Link from "next/link";
import { requireRole } from "@/lib/authGuard";
import { createServerSupabase } from "@/lib/supabaseServer";
import { redirect } from "next/navigation";
import { getServerLang, tFromLang } from "@/lib/server-lang";

export const dynamic = "force-dynamic";

export async function JobDetailsPage({ params }: { params: { id: string } | Promise<{ id: string }> }) {
  const lang = await getServerLang();
  const t = (ar: string, en: string) => tFromLang(lang, ar, en);
  const { companyId } = await requireRole(["admin", "recruiter", "viewer", "employer", "evaluator"]);
  if (!companyId) redirect("/dashboard/onboarding");

  // فك الوعود بطريقة آمنة
  const resolvedParams = await params;
  const jobId = resolvedParams.id;
  const supabase = await createServerSupabase();

  const { data: job } = await supabase.from("jobs").select("id,title,description,status,requirements_generated_at,location,is_remote,employment_type").eq("id", jobId).maybeSingle();
  if (!job) return <div className="card">{t("الوظيفة غير موجودة", "Job not found")}</div>;

  const { data: reqs } = await supabase.from("job_requirements").select("id,job_id,req_type,req_value,weight,must_have,source").eq("job_id", jobId).order("must_have", { ascending: false });
  const { count: candidateCount } = await supabase.from("candidate_resumes").select("*", { count: "exact", head: true }).eq("job_id", jobId);
  const { data: scores } = await supabase.from("candidate_scores").select("final_score,candidate_resume_id,candidate_resumes!inner(job_id)").eq("candidate_resumes.job_id", jobId);

  const analyzed = (scores ?? []).length;
  const avgScore = analyzed ? (scores ?? []).reduce((sum: number, row: any) => sum + Number(row.final_score || 0), 0) / analyzed : 0;

  return (
    // التعديل 1: الحاوية الأم أصبحت flex-column لضمان الترتيب العمودي الصحيح وحماية العرض
    <div style={{ display: "flex", flexDirection: "column", gap: 24, width: "100%", maxWidth: "100%", overflowX: "hidden" }}>

      <div className="pageHeader">
        <div>
          <div className="eyebrow">{t("نظرة عامة على الوظيفة", "Job overview")}</div>
          <h1 className="pageTitle" style={{ marginTop: 10 }}>{job.title}</h1>
          <div className="smallMuted" style={{ marginTop: 8 }}>
            {job.is_remote ? t("عن بُعد", "Remote") : t("حضوري", "On-site")}
            <span className="dash-dot" style={{ margin: "0 8px" }}>•</span>
            {job.employment_type ?? "—"}
            {job.location ? (
              <>
                <span className="dash-dot" style={{ margin: "0 8px" }}>•</span>
                {job.location}
              </>
            ) : null}
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <Link className="btn btnPrimary" href={`/dashboard/jobs/${jobId}/candidates/ranking`}>{t("الترتيب", "Ranking")}</Link>
          <Link className="btn" href={`/dashboard/jobs/${jobId}/candidates`}>{t("المرشحون", "Candidates")}</Link>
          <Link className="btn" href={`/dashboard/jobs/${jobId}/requirements`}>{t("المتطلبات", "Requirements")}</Link>
        </div>
      </div>

      {/* الإحصائيات: ستلتف بذكاء بفضل auto-fit */}
      <div className="grid statsGrid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
        <div className="kpiCard">
          <div className="kpiLabel">{t("الحالة", "Status")}</div>
          <div className="kpiValue" style={{ fontSize: 24, textTransform: "capitalize" }}>{String(job.status || "—")}</div>
        </div>
        <div className="kpiCard">
          <div className="kpiLabel">{t("المرشحون", "Candidates")}</div>
          <div className="kpiValue" style={{ fontSize: 24 }}>{candidateCount ?? 0}</div>
        </div>
        <div className="kpiCard">
          <div className="kpiLabel">{t("المحللون", "Analyzed")}</div>
          <div className="kpiValue" style={{ fontSize: 24 }}>{analyzed}</div>
        </div>
        <div className="kpiCard">
          <div className="kpiLabel">{t("متوسط الدرجة", "Average score")}</div>
          <div className="kpiValue" style={{ fontSize: 24 }}>{Math.round(avgScore * 100)}%</div>
        </div>
        <div className="kpiCard">
          <div className="kpiLabel">{t("المتطلبات", "Requirements")}</div>
          <div className="kpiValue" style={{ fontSize: 24 }}>{reqs?.length ?? 0}</div>
        </div>
      </div>

      {/* 
        التعديل 2: 
        استبدال شبكة "1.1fr .9fr" بنظام flex-wrap ذكي يسمح للأقسام بالاصطفاف أو النزول عمودياً
      */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 24, alignItems: "flex-start", width: "100%" }}>

        {/* العمود الأول: وصف الوظيفة (محمي بـ overflowWrap لكسر الكلمات المتصلة الطويلة) */}
        <div
          className="card"
          style={{
            flex: "1 1 500px",
            minWidth: 0,
            maxWidth: "100%",
            overflowWrap: "anywhere",
            wordBreak: "break-word"
          }}
        >
          <div style={{ fontWeight: 700, fontSize: 18 }}>{t("وصف الوظيفة", "Job description")}</div>
          <div className="smallMuted" style={{ marginTop: 8 }}>{t("استخدم هذه النسخة كمرجع عند مراجعة الترتيب والمتطلبات.", "Use this version as a reference when reviewing ranking and requirements.")}</div>
          <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.95, marginTop: 18, fontSize: "15px" }}>
            {job.description}
          </div>
        </div>

        {/* العمود الثاني: الروابط الجانبية وملخص المتطلبات */}
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
            <div style={{ fontWeight: 700, fontSize: 18 }}>{t("روابط التشغيل السريعة", "Quick operations")}</div>
            <div className="dash-linkGroup" style={{ marginTop: 16 }}>
              <Link href={`/dashboard/jobs/${jobId}/edit`} className="dash-link">{t("تعديل الوظيفة", "Edit job")}</Link>
              <Link href={`/dashboard/jobs/${jobId}/requirements`} className="dash-link">{t("تحرير المتطلبات", "Edit requirements")}</Link>
              <Link href={`/dashboard/jobs/${jobId}/candidates`} className="dash-link">{t("رفع المرشحين", "Upload candidates")}</Link>
              <Link href={`/dashboard/jobs/${jobId}/pipeline`} className="dash-link">Pipeline</Link>
              <Link href={`/dashboard/jobs/${jobId}/snapshots`} className="dash-link">{t("النسخ المجمّدة", "Snapshots")}</Link>
            </div>
          </div>

          <div className="card">
            <div style={{ fontWeight: 700, fontSize: 18 }}>{t("ملخص المتطلبات", "Requirements summary")}</div>
            <div className="smallMuted" style={{ marginTop: 8 }}>
              {t("آخر توليد تلقائي", "Last generated")}: {job.requirements_generated_at ? String(job.requirements_generated_at).slice(0, 19) : "—"}
            </div>

            {/* عرض المتطلبات كـ Badges بشكل متناسق */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 16 }}>
              {(reqs ?? []).slice(0, 10).map((req: any) => (
                <span
                  key={req.id}
                  className={req.must_have ? "badge badge-danger" : "badge badge-muted"}
                  style={{ fontSize: 12, padding: "6px 12px" }}
                >
                  {req.req_value}
                </span>
              ))}
              {(reqs ?? []).length > 10 && (
                <span className="badge badge-muted" style={{ fontSize: 12, padding: "6px 12px" }}>
                  +{reqs!.length - 10} {t("أخرى", "more")}
                </span>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}