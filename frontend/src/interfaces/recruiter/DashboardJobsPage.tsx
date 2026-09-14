import Link from "next/link";
import { requireRole } from "@/lib/authGuard";
import { createAdminSupabaseOrNull } from "@/lib/supabaseAdmin";
import { JobStatusToggle } from "@/components/evaluator/JobStatusToggle";
import { isUuid } from "@/lib/validators";
import { getServerLang, tFromLang } from "@/lib/server-lang";

export const dynamic = "force-dynamic";

type JobRow = {
  id: string;
  title: string;
  status: string;
  created_at: string;
  company_id?: string | null;
  created_by?: string | null;
};

function formatStatus(status: string, t: (ar: string, en: string) => string) {
  if (status === "open") return { label: t("مفتوحة", "Open"), tone: "success" as const };
  if (status === "closed") return { label: t("مغلقة", "Closed"), tone: "danger" as const };
  if (status === "draft") return { label: t("مسودة", "Draft"), tone: "muted" as const };
  if (status === "hidden") return { label: t("مخفية", "Hidden"), tone: "muted" as const };
  return { label: status, tone: "muted" as const };
}

export async function DashboardJobsPage() {
  const lang = await getServerLang();
  const t = (ar: string, en: string) => tFromLang(lang, ar, en);

  const { userId, companyId, supabase } = await requireRole([
    "admin",
    "employer",
    "evaluator",
    "recruiter",
  ]);

  const admin = createAdminSupabaseOrNull();
  const db: any = admin ?? supabase;

  let jobsData: JobRow[] = [];
  let error: any = null;

  if (isUuid(companyId)) {
    const result = await db
      .from("jobs")
      .select("id,title,status,created_at,company_id,created_by")
      .or(`company_id.eq.${companyId},created_by.eq.${userId}`)
      .order("created_at", { ascending: false });

    jobsData = (result.data ?? []) as JobRow[];
    error = result.error;
  } else {
    const result = await db
      .from("jobs")
      .select("id,title,status,created_at,company_id,created_by")
      .eq("created_by", userId)
      .order("created_at", { ascending: false });

    jobsData = (result.data ?? []) as JobRow[];
    error = result.error;
  }

  const jobs = jobsData ?? [];

  const ownedJobWithCompany = jobs.find(
    (job) => job.created_by === userId && isUuid(job.company_id)
  );

  if (ownedJobWithCompany?.company_id && ownedJobWithCompany.company_id !== companyId) {
    await db
      .from("profiles")
      .update({ company_id: ownedJobWithCompany.company_id })
      .eq("id", userId);
  }

  const jobIds = jobs.map((job) => job.id);
  let counts: Record<string, number> = {};

  if (jobIds.length) {
    const { data: rows } = await db
      .from("candidate_resumes")
      .select("job_id")
      .in("job_id", jobIds);

    counts =
      (rows ?? []).reduce((acc: Record<string, number>, row: any) => {
        acc[row.job_id] = (acc[row.job_id] ?? 0) + 1;
        return acc;
      }, {}) ?? {};
  }

  return (
    // استخدام flex-column يضمن عدم تداخل الأقسام ببعضها
    <div style={{ display: "flex", flexDirection: "column", gap: 24, width: "100%" }}>

      <div className="dashboard-hero">
        <div className="card" style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <div>
            <div className="eyebrow">{t("إدارة الوظائف", "Jobs management")}</div>

            <h1 className="pageTitle" style={{ marginTop: 12 }}>
              {t(
                "تابع الوظائف، المتقدمين، وقرارات الفرز من لوحة واحدة",
                "Track jobs, applicants, and screening decisions from one dashboard"
              )}
            </h1>

            <p className="smallMuted" style={{ fontSize: "16px", lineHeight: 1.8 }}>
              {t(
                "تعرض هذه الصفحة الوظائف المرتبطة بشركتك أو التي أنشأتها من نفس الحساب.",
                "This page shows jobs linked to your company or created by your account."
              )}
            </p>
          </div>

          <div className="actionsRow" style={{ marginTop: 24 }}>
            <Link href="/dashboard/jobs/new" className="btn btnPrimary">
              + {t("إنشاء وظيفة", "Create job")}
            </Link>

            <Link href="/dashboard/candidates" className="btn">
              {t("المرشحون", "Candidates")}
            </Link>
          </div>
        </div>

        {/* تحديد ارتفاع ثابت للـ Banner لكي لا تنفجر الصورة وتخرب التصميم */}
        <div className="dashboard-banner" style={{ height: "340px", minHeight: "340px", position: "relative", borderRadius: 28, overflow: "hidden" }}>
          <img
            src="https://images.unsplash.com/photo-1556740749-887f6717d7e4?auto=format&fit=crop&w=1200&q=80"
            alt={t("فريق توظيف يستخدم لوحة تحكم", "Recruiting team using a dashboard")}
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", zIndex: 0 }}
          />

          {/* تغليف المحتوى بطبقة مظللة (Overlay) لضمان وضوح النص */}
          <div className="dashboard-bannerContent" style={{ position: "absolute", inset: 0, zIndex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: "24px", background: "linear-gradient(to top, rgba(15, 23, 42, 0.85) 0%, rgba(15, 23, 42, 0.2) 60%, transparent 100%)", color: "#fff" }}>
            <div
              className="eyebrow"
              style={{
                background: "rgba(255,255,255,.14)",
                color: "#fff",
                borderColor: "rgba(255,255,255,.18)",
                alignSelf: "flex-start"
              }}
            >
              {t("لوحة احترافية", "Professional workspace")}
            </div>

            <div style={{ fontWeight: 900, fontSize: 24, marginTop: 12, textShadow: "0 2px 10px rgba(0,0,0,0.3)" }}>
              {t(
                "كل وظيفة مع حالة واضحة وروابط سريعة",
                "Every job with clear status and quick actions"
              )}
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="card" style={{ borderColor: "rgba(239,68,68,0.35)" }}>
          <div className="alert alertDanger">
            {t("خطأ أثناء جلب الوظائف", "Error loading jobs")}: {error.message}
          </div>
        </div>
      )}

      {/* ترتيب كروت الوظائف باستخدام الجريد */}
      <div className="grid">
        {jobs.map((job) => {
          const status = formatStatus(job.status, t);
          const applicants = counts[job.id] ?? 0;

          return (
            <div key={job.id} className="card jobCard" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <div className="jobCardTop">
                <div className="jobCardTitleRow" style={{ width: "100%" }}>
                  <div className="rowStack" style={{ width: "100%", alignItems: "flex-start" }}>
                    <div className="jobTitle">{job.title}</div>
                    <div className="jobCardActions">
                      <JobStatusToggle jobId={job.id} currentStatus={job.status} />
                    </div>
                  </div>

                  <div className="jobMeta" style={{ marginTop: 8 }}>
                    <span className={`badge badge-${status.tone}`}>
                      {status.label}
                    </span>

                    <span className="badge badge-muted">
                      {t("المتقدمون", "Applicants")}: {applicants}
                    </span>
                  </div>
                </div>
              </div>

              <div className="dash-linkGroup" style={{ marginTop: 24, paddingTop: 16, borderTop: "1px solid rgba(148, 163, 184, 0.12)" }}>
                <Link href={`/dashboard/jobs/${job.id}`} className="dash-link">
                  {t("تفاصيل الوظيفة", "Job details")}
                </Link>

                <Link href={`/dashboard/jobs/${job.id}/requirements`} className="dash-link">
                  {t("المتطلبات", "Requirements")}
                </Link>

                <Link href={`/dashboard/jobs/${job.id}/candidates`} className="dash-link">
                  {t("المتقدمون", "Applicants")}
                </Link>

                <Link href={`/dashboard/jobs/${job.id}/candidates/ranking`} className="dash-link">
                  {t("الترتيب", "Ranking")}
                </Link>

                <Link href={`/dashboard/jobs/${job.id}/pipeline`} className="dash-link">
                  Pipeline
                </Link>

                <Link href={`/dashboard/jobs/${job.id}/edit`} className="dash-link">
                  {t("تعديل", "Edit")}
                </Link>

                <Link href={`/jobs/${job.id}`} className="dash-link">
                  {t("عرض", "View")}
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      {!error && jobs.length === 0 && (
        <div className="card" style={{ marginTop: 16, padding: 32, textAlign: "center" }}>
          <p style={{ margin: 0, fontSize: "16px", color: "var(--muted)" }}>
            {t(
              "لا توجد وظائف ظاهرة لهذا الحساب. إذا كنت أنشأت وظيفة سابقًا، فتأكد أن حساب صاحب العمل هو نفس الحساب الذي أنشأ الوظيفة.",
              "No jobs are visible for this account. If you created a job before, make sure this is the same employer account."
            )}
          </p>
        </div>
      )}
    </div>
  );
}