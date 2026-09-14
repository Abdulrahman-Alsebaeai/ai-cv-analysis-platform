import Link from "next/link";
import { requireAuth } from "@/lib/authGuard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ResumeUploader } from "@/components/applicant/ResumeUploader";
import { ScoreBreakdown } from "@/components/evaluator/ScoreBreakdown";
import { getServerLang, tFromLang } from "@/lib/server-lang";

type JobRel =
  | {
    id: string;
    title: string;
    description: string;
    location: string | null;
    is_remote: boolean;
    employment_type: string | null;
  }
  | {
    id: string;
    title: string;
    description: string;
    location: string | null;
    is_remote: boolean;
    employment_type: string | null;
  }[]
  | null;

type CandidateResumeDetails = {
  id: string;
  status: string | null;
  created_at: string;
  job_id: string;
  company_id: string;
  candidate_id: string;
  storage_path: string | null;
  file_name: string | null;
  mime_type: string | null;
  job: JobRel;
  candidate: { user_id: string } | { user_id: string }[] | null;
};

function jobToOne(job: JobRel) {
  if (!job) return null;
  return Array.isArray(job) ? job?.[0] ?? null : job;
}

export async function ApplicantApplicationDetailsPage({
  params,
  searchParams,
}: {
  params: { id: string } | Promise<{ id: string }>;
  searchParams?: { tab?: string } | Promise<{ tab?: string }>;
}) {
  const lang = await getServerLang();
  const t = (ar: string, en: string) => tFromLang(lang, ar, en);
  const { userId, supabase } = await requireAuth();

  // استخراج الـ ID والتبويب النشط بطريقة آمنة
  const resolvedParams = await params;
  const id = resolvedParams.id;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const activeTab = resolvedSearchParams.tab || "overview";

  const { data, error: crErr } = await supabase
    .from("candidate_resumes")
    .select(
      `
      id,status,created_at,job_id,company_id,candidate_id,storage_path,file_name,mime_type,
      job:jobs(id,title,description,location,is_remote,employment_type),
      candidate:candidates!inner(user_id)
      `
    )
    .eq("id", id)
    .eq("candidate.user_id", userId)
    .maybeSingle();

  const cr = data as CandidateResumeDetails | null;

  if (crErr || !cr) {
    return (
      <main className="card">
        <h1 className="pageTitle">{t("التقديم غير موجود", "Application not found")}</h1>
      </main>
    );
  }

  const job = jobToOne(cr.job);

  const { data: scoreRow } = await supabase
    .from("candidate_scores")
    .select("final_score,raw_score,penalty,breakdown,updated_at")
    .eq("candidate_resume_id", cr.id)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const existingResume = cr.storage_path
    ? {
      storage_path: cr.storage_path,
      file_name: cr.file_name,
      mime_type: cr.mime_type,
      created_at: cr.created_at,
    }
    : null;

  // ستايلات التبويبات الفاخرة
  const tabStyle = (isActive: boolean) => ({
    padding: "12px 24px",
    borderRadius: "999px",
    fontWeight: 700,
    fontSize: "15px",
    textDecoration: "none",
    backgroundColor: isActive ? "rgba(40, 89, 255, 0.08)" : "transparent",
    color: isActive ? "#1744db" : "#5f6f86",
    border: isActive ? "1px solid rgba(40, 89, 255, 0.12)" : "1px solid transparent",
    transition: "all 0.25s ease",
    whiteSpace: "nowrap" as const,
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, width: "100%" }}>

      {/* 1. الترويسة الرئيسية */}
      <div className="pageHeader">
        <div>
          <div className="eyebrow">{t("تفاصيل التقديم", "Application details")}</div>
          <h1 className="pageTitle" style={{ marginTop: 10 }}>
            {job?.title ?? "—"}
          </h1>
          <div className="smallMuted">
            {job?.is_remote ? t("عن بُعد", "Remote") : t("حضوري", "On-site")}
            <span className="dash-dot" style={{ margin: "0 8px" }}>•</span>
            {job?.employment_type ?? "—"}
            {job?.location ? (
              <>
                <span className="dash-dot" style={{ margin: "0 8px" }}>•</span>
                {job.location}
              </>
            ) : null}
          </div>
        </div>
        <StatusBadge status={cr.status} />
      </div>

      {/* 2. بطاقات الإحصائيات (دائماً ظاهرة بالأعلى) */}
      <div
        className="grid statsGrid"
        style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}
      >
        <div className="kpiCard">
          <div className="kpiLabel">{t("الحالة", "Status")}</div>
          <div className="kpiValue" style={{ fontSize: 24 }}>
            {String(cr.status ?? "—")}
          </div>
        </div>
        <div className="kpiCard">
          <div className="kpiLabel">{t("آخر تحديث", "Last update")}</div>
          <div className="kpiValue" style={{ fontSize: 20 }}>
            {new Date(scoreRow?.updated_at ?? cr.created_at).toLocaleDateString(
              lang === "ar" ? "ar" : "en-US"
            )}
          </div>
        </div>
        <div className="kpiCard">
          <div className="kpiLabel">{t("الدرجة النهائية", "Final score")}</div>
          <div className="kpiValue" style={{ fontSize: 24 }}>
            {scoreRow?.final_score != null
              ? `${Math.round(Number(scoreRow.final_score) * 100)}%`
              : "—"}
          </div>
        </div>
        <div className="kpiCard">
          <div className="kpiLabel">{t("العقوبة", "Penalty")}</div>
          <div className="kpiValue" style={{ fontSize: 24 }}>
            {scoreRow?.penalty != null ? Number(scoreRow.penalty).toFixed(3) : "—"}
          </div>
        </div>
      </div>

      {/* 3. شريط التبويبات (Tabs Navigation) */}
      <div
        style={{
          display: "flex",
          gap: 8,
          borderBottom: "1px solid rgba(148, 163, 184, 0.22)",
          paddingBottom: 16,
          marginTop: 8,
          overflowX: "auto"
        }}
      >
        <Link href={`/applicant/applications/${id}?tab=overview`} style={tabStyle(activeTab === "overview")}>
          {t("الملف والمرفقات", "Resume & Attachments")}
        </Link>
        <Link href={`/applicant/applications/${id}?tab=analysis`} style={tabStyle(activeTab === "analysis")}>
          {t("التحليل والتقييم", "Analysis & Score")}
        </Link>
        <Link href={`/applicant/applications/${id}?tab=job`} style={tabStyle(activeTab === "job")}>
          {t("وصف الوظيفة", "Job Description")}
        </Link>
      </div>

      {/* 4. محتوى التبويبات */}
      <div style={{ display: "flex", flexDirection: "column", gap: 18, minWidth: 0 }}>

        {/* تبويب: الملف والمرفقات */}
        {activeTab === "overview" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div className="card">
              <div style={{ fontWeight: 700, fontSize: 18 }}>
                {t("ملخص التقديم", "Application summary")}
              </div>
              <div className="info-strip" style={{ marginTop: 16 }}>
                <div className="info-pill">
                  <div className="smallMuted">{t("الملف الحالي", "Current file")}</div>
                  <div style={{ fontWeight: 700, marginTop: 8, wordBreak: "break-all" }}>
                    {cr.file_name ?? t("لم يتم الرفع بعد", "Not uploaded yet")}
                  </div>
                </div>
                <div className="info-pill">
                  <div className="smallMuted">Raw score</div>
                  <div style={{ fontWeight: 700, marginTop: 8 }}>
                    {scoreRow?.raw_score != null
                      ? Number(scoreRow.raw_score).toFixed(3)
                      : "—"}
                  </div>
                </div>
              </div>
            </div>

            <ResumeUploader
              candidateResumeId={cr.id}
              companyId={cr.company_id}
              candidateId={cr.candidate_id}
              jobId={cr.job_id}
              existingResume={existingResume}
            />
          </div>
        )}

        {/* تبويب: التحليل والتقييم */}
        {activeTab === "analysis" && (
          <div className="card">
            <div className="cardRow">
              <div>
                <div style={{ fontWeight: 700, fontSize: 20 }}>
                  {t("نتيجة التحليل التفصيلية", "Detailed Analysis Result")}
                </div>
                <div className="smallMuted" style={{ marginTop: 6 }}>
                  {t(
                    "عرض شامل لدرجة المطابقة، تلبية المتطلبات، والأسباب المستخرجة من السيرة الذاتية.",
                    "A comprehensive view of fit score, requirements met, and extracted reasons."
                  )}
                </div>
              </div>
              {scoreRow?.final_score != null ? (
                <span className="badge badge-info" style={{ fontSize: 16, padding: "8px 16px" }}>
                  {Math.round(Number(scoreRow.final_score) * 100)}%
                </span>
              ) : null}
            </div>

            {/* هنا مكون ScoreBreakdown سيأخذ العرض بالكامل ولن ينضغط أبداً */}
            <div style={{ marginTop: 24, overflowX: "auto" }}>
              <ScoreBreakdown breakdown={scoreRow?.breakdown ?? null} />
            </div>
          </div>
        )}

        {/* تبويب: وصف الوظيفة */}
        {activeTab === "job" && (
          <div className="card">
            <div style={{ fontWeight: 700, fontSize: 20 }}>
              {t("وصف الوظيفة والمتطلبات", "Job Description & Requirements")}
            </div>
            <div className="smallMuted" style={{ marginTop: 8 }}>
              {t(
                "راجع هذه التفاصيل لمعرفة المهارات والخبرات التي يبحث عنها صاحب العمل.",
                "Review these details to understand the skills and experiences the employer is looking for."
              )}
            </div>
            <div style={{ whiteSpace: "pre-wrap", lineHeight: 2, marginTop: 24, fontSize: "16px" }}>
              {job?.description ?? "—"}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}