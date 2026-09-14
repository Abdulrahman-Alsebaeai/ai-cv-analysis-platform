import Link from "next/link";
import { requireAuth } from "@/lib/authGuard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { getServerLang, tFromLang } from "@/lib/server-lang";

type JobRel =
  | {
    title: string;
    location: string | null;
    is_remote: boolean;
    employment_type: string | null;
  }
  | {
    title: string;
    location: string | null;
    is_remote: boolean;
    employment_type: string | null;
  }[]
  | null;

type ScoreRel =
  | {
    final_score: number | null;
    updated_at: string;
  }
  | {
    final_score: number | null;
    updated_at: string;
  }[]
  | null;

type CandidateResumeListItem = {
  id: string;
  status: string | null;
  created_at: string;
  job_id: string;
  file_name: string | null;
  storage_path: string | null;
  job: JobRel;
  score: ScoreRel;
  candidate: { user_id: string } | { user_id: string }[] | null;
};

function jobToOne(job: JobRel) {
  return Array.isArray(job) ? job?.[0] ?? null : job;
}

function scoreToOne(score: ScoreRel) {
  return Array.isArray(score) ? score?.[0] ?? null : score;
}

export async function ApplicantDashboard() {
  const lang = await getServerLang();
  const t = (ar: string, en: string) => tFromLang(lang, ar, en);
  const { userId, supabase } = await requireAuth();

  const { data, error } = await supabase
    .from("candidate_resumes")
    .select(
      `
      id,status,created_at,job_id,file_name,storage_path,
      job:jobs(title,location,is_remote,employment_type),
      score:candidate_scores(final_score,updated_at),
      candidate:candidates!inner(user_id)
      `
    )
    .eq("candidate.user_id", userId)
    .order("created_at", { ascending: false })
    .limit(4);

  const items = (data ?? []) as CandidateResumeListItem[];
  const completed = items.filter(
    (i) => i.status === "done" || i.status === "analyzed"
  ).length;

  return (
    <div>
      <div className="dashboard-hero">
        <div className="card">
          <div className="eyebrow">{t("لوحة المتقدم", "Applicant dashboard")}</div>
          <h1 className="pageTitle" style={{ marginTop: 12 }}>
            {t(
              "تابع طلباتك، ملفك الشخصي، والتقييمات من مكان واحد",
              "Track your applications, profile, and scores from one place"
            )}
          </h1>
          <p className="smallMuted">
            {t(
              "تم إعادة تنسيق هذه المساحة لتكون أوضح بصريًا وتدعم العربية والإنجليزية مع بطاقات أكثر احترافية.",
              "This workspace has been refreshed with cleaner visuals and proper Arabic-English support using more polished cards."
            )}
          </p>
          <div className="info-strip">
            <div className="info-pill">
              <div className="smallMuted">{t("إجمالي الطلبات", "Total applications")}</div>
              <div className="kpiValue" style={{ marginTop: 4, fontSize: 28 }}>
                {items.length}
              </div>
            </div>
            <div className="info-pill">
              <div className="smallMuted">{t("طلبات مكتملة", "Completed")}</div>
              <div className="kpiValue" style={{ marginTop: 4, fontSize: 28 }}>
                {completed}
              </div>
            </div>
            <div className="info-pill">
              <div className="smallMuted">{t("آخر تحديث", "Latest update")}</div>
              <div style={{ marginTop: 10, fontWeight: 700 }}>
                {items[0]?.created_at
                  ? new Date(items[0].created_at).toLocaleDateString(
                    lang === "ar" ? "ar" : "en-US"
                  )
                  : "—"}
              </div>
            </div>
          </div>
          <div className="actionsRow">
            <Link href="/jobs" className="btn btnPrimary">
              {t("استكشف الوظائف", "Explore jobs")}
            </Link>
            <Link href="/applicant/profile" className="btn">
              {t("تحديث الملف الشخصي", "Update profile")}
            </Link>
          </div>
        </div>
        <div className="dashboard-banner">
          <img
            src="https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80"
            alt={t("شخص يخطط لمساره المهني", "Person planning a career path")}
          />
          <div className="dashboard-bannerContent">
            <div
              className="eyebrow"
              style={{
                background: "rgba(255,255,255,.14)",
                color: "#fff",
                borderColor: "rgba(255,255,255,.18)",
              }}
            >
              {t("رحلتك المهنية", "Your career journey")}
            </div>
            <div style={{ fontWeight: 700, fontSize: 24, marginTop: 10 }}>
              {t(
                "واجهة أوضح لمتابعة التقديمات خطوة بخطوة",
                "A clearer way to follow your applications step by step"
              )}
            </div>
          </div>
        </div>
      </div>

      {error ? (
        <div className="card">
          <div className="alert alertDanger">
            {t("خطأ في جلب التقديمات", "Error loading applications")}: {error.message}
          </div>
        </div>
      ) : null}

      <div className="grid">
        {items.map((a) => {
          const j = jobToOne(a.job);
          const s = scoreToOne(a.score);

          return (
            <Link
              key={a.id}
              href={`/applicant/applications/${a.id}`}
              className="card"
              style={{ textDecoration: "none" }}
            >
              <div className="cardRow">
                <div>
                  <div style={{ fontWeight: 700 }}>
                    {j?.title ?? t("غير محدد", "Not specified")}
                  </div>
                  <div className="smallMuted">
                    {j?.is_remote ? t("عن بُعد", "Remote") : t("حضوري", "On-site")} •{" "}
                    {j?.employment_type ?? t("دوام", "Employment")}{" "}
                    {j?.location ? ` • ${j.location}` : ""}
                  </div>
                </div>
                <StatusBadge status={a.status} />
              </div>
              <div className="smallMuted" style={{ marginTop: 12 }}>
                {a.file_name
                  ? `${t("الملف", "File")}: ${a.file_name}`
                  : t("لا يوجد ملف مرفق بعد", "No attached file yet")}
              </div>
              {s?.final_score != null ? (
                <div style={{ marginTop: 12, fontWeight: 700 }}>
                  {t("التقييم", "Score")}: {Number(s.final_score).toFixed(1)}
                </div>
              ) : null}
            </Link>
          );
        })}
      </div>

      {!error && items.length === 0 ? (
        <div className="card" style={{ marginTop: 16 }}>
          <div className="smallMuted">
            {t("لم تقم بأي تقديمات حتى الآن.", "You have not submitted any applications yet.")}
          </div>
          <div style={{ marginTop: 12 }}>
            <Link href="/jobs" className="btn btnPrimary">
              {t("ابدأ الآن", "Start now")}
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}