import Link from "next/link";
import { requireRole } from "@/lib/authGuard";
import { createServerSupabase } from "@/lib/supabaseServer";
import { redirect } from "next/navigation";
import { CandidateResumeUploader } from "@/components/evaluator/CandidateResumeUploader";
import { getServerLang, tFromLang } from "@/lib/server-lang";

export const dynamic = "force-dynamic";

export async function CandidateDetailsPage({ params }: { params: { id: string } | Promise<{ id: string }> }) {
  const lang = await getServerLang();
  const t = (ar: string, en: string) => tFromLang(lang, ar, en);
  const { companyId } = await requireRole(["admin", "recruiter", "viewer", "employer", "evaluator"]);
  if (!companyId) redirect("/dashboard/onboarding");

  const resolvedParams = await params;
  const id = resolvedParams.id;
  const supabase = await createServerSupabase();

  const { data: cand } = await supabase
    .from("candidates")
    .select("id,full_name,email,phone")
    .eq("id", id)
    .maybeSingle();

  const { data: jobs } = await supabase
    .from("jobs")
    .select("id,title,status")
    .order("created_at", { ascending: false });

  const { data: resumes } = await supabase
    .from("candidate_resumes")
    .select("id,job_id,file_name,status,created_at, candidate_scores(final_score), jobs(title)")
    .eq("candidate_id", id)
    .order("created_at", { ascending: false });

  return (
    // الحاوية الأم: مرنة، تمنع الخروج عن العرض، وترتب الأقسام عمودياً
    <div style={{ display: "flex", flexDirection: "column", gap: 24, width: "100%", maxWidth: "100%", overflowX: "hidden" }}>

      {/* الترويسة */}
      <div className="pageHeader">
        <div>
          <div className="eyebrow">{t("مركز المرشح", "Candidate hub")}</div>
          <h1 className="pageTitle" style={{ marginTop: 10 }}>{cand?.full_name ?? t("مرشح", "Candidate")}</h1>
          <div className="smallMuted" style={{ marginTop: 8, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <span>{cand?.email ?? "—"}</span>
            <span className="dash-dot">•</span>
            <span dir="ltr">{cand?.phone ?? "—"}</span>
          </div>
        </div>
      </div>

      {/* الإحصائيات السريعة */}
      <div className="grid statsGrid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
        <div className="kpiCard">
          <div className="kpiLabel">{t("الملفات", "Resumes")}</div>
          <div className="kpiValue" style={{ fontSize: 24 }}>{resumes?.length ?? 0}</div>
        </div>
        <div className="kpiCard">
          <div className="kpiLabel">{t("وظائف مرتبطة", "Linked jobs")}</div>
          <div className="kpiValue" style={{ fontSize: 24 }}>{new Set((resumes ?? []).map((r: any) => r.job_id)).size}</div>
        </div>
      </div>

      {/* 
        التخطيط المرن (Flex Wrap): 
        يحل محل grid-template-columns: 1fr 1fr الذي كان يخرب الشاشة 
      */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 24, alignItems: "flex-start", width: "100%" }}>

        {/* العمود الأول: رفع السيرة (يأخذ مساحة 400 بكسل على الأقل وينكمش إذا لزم الأمر) */}


        <div className="card" style={{ flex: "1 1 400px", minWidth: 0, maxWidth: "100%" }}>
          <div style={{ fontWeight: 700, fontSize: 18 }}>{t("رفع سيرة وربطها بوظيفة", "Upload and link a resume")}</div>
          <div className="smallMuted" style={{ marginTop: 8 }}>{t("اختر الوظيفة المستهدفة ثم ارفع ملف السيرة الذاتية لتحليله.", "Pick the target job and upload the resume file for analysis.")}</div>
          <div style={{ marginTop: 24 }}>
            <CandidateResumeUploader candidateId={id} jobs={jobs ?? []} />
          </div>
        </div>

        {/* العمود الثاني: قائمة السير المرفوعة (يأخذ مساحة أكبر قليلاً 500 بكسل) */}
        <div className="card" style={{ flex: "1 1 500px", minWidth: 0, maxWidth: "100%", padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "18px 20px", fontWeight: 700, fontSize: 18, borderBottom: "1px solid var(--border)", background: "rgba(15,23,42,0.02)" }}>
            {t("السير الذاتية المرفوعة", "Uploaded resumes")}
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            {(resumes ?? []).map((r: any) => {
              const score = Array.isArray(r.candidate_scores) ? r.candidate_scores?.[0] : r.candidate_scores;
              const job = Array.isArray(r.jobs) ? r.jobs?.[0] : r.jobs;

              return (
                <div key={r.id} style={{ padding: "16px 20px", borderBottom: "1px solid rgba(148, 163, 184, 0.12)", display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap", transition: "background 0.2s ease" }}>

                  {/* أيقونة جمالية للملف */}
                  <div style={{ width: 42, height: 42, borderRadius: 12, background: "rgba(40,89,255,0.08)", color: "var(--primary)", display: "grid", placeItems: "center", flexShrink: 0 }}>
                    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                  </div>

                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ fontWeight: 700, wordBreak: "break-all", lineHeight: 1.4 }}>{r.file_name}</div>
                    <div className="smallMuted" style={{ marginTop: 4, fontWeight: 500 }}>{job?.title ?? "—"}</div>

                    <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                      <span className="badge badge-muted" style={{ fontSize: 11, padding: "4px 8px" }}>
                        {t("الحالة", "Status")}: {r.status}
                      </span>
                      {score?.final_score != null && (
                        <span className="badge badge-primary" style={{ fontSize: 11, padding: "4px 8px" }}>
                          {t("الدرجة", "Score")}: {Math.round(Number(score.final_score) * 100)}%
                        </span>
                      )}
                    </div>
                  </div>

                  <Link className="btn btnSoft" style={{ minHeight: 36, padding: "6px 16px", fontSize: 13 }} href={`/dashboard/candidate-resumes/${r.id}`}>
                    {t("فتح", "Open")}
                  </Link>
                </div>
              );
            })}
          </div>

          {(!resumes || resumes.length === 0) ? (
            <div style={{ padding: 32, textAlign: "center" }} className="smallMuted">
              {t("لا توجد ملفات مرتبطة بهذا المرشح بعد.", "No files linked to this candidate yet.")}
            </div>
          ) : null}
        </div>

      </div>
    </div>
  );
}