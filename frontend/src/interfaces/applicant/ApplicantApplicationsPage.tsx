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

export async function ApplicantApplicationsPage() {
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
    .order("created_at", { ascending: false });

  const items = (data ?? []) as CandidateResumeListItem[];

  return (
    <div className="stack"> {/* تم تغيير الكلاس من grid إلى stack لترتيب الأقسام عمودياً */}
      <div className="pageHeader">
        <div>
          <div className="eyebrow">{t("إدارة التقديمات", "Application tracking")}</div>
          <h1 className="pageTitle" style={{ marginTop: 10 }}>
            {t("طلباتي", "My applications")}
          </h1>
          <div className="smallMuted">
            {t(
              "تتبّع حالة كل تقديم وملف السيرة المرتبط به من مكان واحد.",
              "Track the state of every application and its attached resume from one place."
            )}
          </div>
        </div>
        <Link href="/jobs" className="btn btnPrimary">
          {t("تصفح الوظائف", "Browse jobs")}
        </Link>
      </div>

      <div
        className="grid statsGrid"
        style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}
      >
        <div className="kpiCard">
          <div className="kpiLabel">{t("إجمالي التقديمات", "Total applications")}</div>
          <div className="kpiValue">{items.length}</div>
        </div>
        <div className="kpiCard">
          <div className="kpiLabel">{t("مكتملة التحليل", "Analyzed")}</div>
          <div className="kpiValue">
            {items.filter((i) => ["done", "analyzed"].includes(String(i.status))).length}
          </div>
        </div>
        <div className="kpiCard">
          <div className="kpiLabel">{t("بانتظار رفع ملف", "Waiting for resume")}</div>
          <div className="kpiValue">
            {items.filter((i) => !i.storage_path).length}
          </div>
        </div>
      </div>

      {error ? (
        <div className="alert alertDanger">
          {t("خطأ في جلب التقديمات", "Error loading applications")}: {error.message}
        </div>
      ) : null}

      <div className="grid"> {/* هنا Grid صحيح لترتيب البطاقات بجانب بعضها */}
        {items.map((a) => {
          const j = jobToOne(a.job);
          const s = scoreToOne(a.score);
          const hasCv = !!a.storage_path;

          return (
            <Link
              key={a.id}
              href={`/applicant/applications/${a.id}`}
              className="card"
              style={{ textDecoration: "none" }}
            >
              <div className="cardRow">
                <div>
                  <div style={{ fontWeight: 700, fontSize: 18 }}>
                    {j?.title ?? "—"}
                  </div>
                  <div className="smallMuted" style={{ marginTop: 6 }}>
                    {j?.is_remote ? t("عن بُعد", "Remote") : t("حضوري", "On-site")} •{" "}
                    {j?.employment_type ?? "—"} • {j?.location ?? "—"}
                  </div>
                </div>
                <StatusBadge status={a.status} />
              </div>
              <div className="info-strip" style={{ marginTop: 16 }}>
                <div className="info-pill">
                  <div className="smallMuted">{t("الملف", "Resume")}</div>
                  <div style={{ fontWeight: 700, marginTop: 8 }}>
                    {hasCv
                      ? a.file_name ?? t("ملف مرفوع", "Uploaded file")
                      : t("غير مرفوع", "Not uploaded")}
                  </div>
                </div>
                <div className="info-pill">
                  <div className="smallMuted">{t("التقييم", "Score")}</div>
                  <div style={{ fontWeight: 700, marginTop: 8 }}>
                    {s?.final_score != null
                      ? `${Math.round(Number(s.final_score) * 100)}%`
                      : "—"}
                  </div>
                </div>
                <div className="info-pill">
                  <div className="smallMuted">{t("التاريخ", "Date")}</div>
                  <div style={{ fontWeight: 700, marginTop: 8 }}>
                    {new Date(a.created_at).toLocaleDateString(
                      lang === "ar" ? "ar" : "en-US"
                    )}
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {!error && items.length === 0 ? (
        <div className="card">
          <div className="smallMuted">
            {t("لا توجد تقديمات بعد. ابدأ من صفحة الوظائف.", "No applications yet. Start from the jobs page.")}
          </div>
        </div>
      ) : null}
    </div>
  );
}