import Link from "next/link";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/authGuard";
import { createServerSupabase } from "@/lib/supabaseServer";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { getServerLang, tFromLang } from "@/lib/server-lang";

export const dynamic = "force-dynamic";

const STAGES = [
  { key: "submitted", ar: "تم التقديم", en: "Submitted" },
  { key: "shortlisted", ar: "القائمة المختصرة", en: "Shortlisted" },
  { key: "interview", ar: "مقابلة", en: "Interview" },
  { key: "rejected", ar: "مرفوض", en: "Rejected" },
  { key: "hired", ar: "تم التوظيف", en: "Hired" },
];

async function updateStage(jobId: string, formData: FormData) {
  "use server";
  await requireRole(["admin", "employer", "evaluator"]);
  const candidateResumeId = String(formData.get("candidate_resume_id") || "");
  const stage = String(formData.get("stage") || "");
  if (!candidateResumeId || !stage) return;
  const supabase = await createServerSupabase();
  await supabase.from("candidate_resumes").update({ stage }).eq("id", candidateResumeId).eq("job_id", jobId);
  revalidatePath(`/dashboard/jobs/${jobId}/pipeline`);
  revalidatePath(`/dashboard/jobs/${jobId}/candidates`);
  revalidatePath(`/dashboard/jobs/${jobId}/candidates/ranking`);
}

export async function PipelinePage({ params }: { params: { id: string } | Promise<{ id: string }> }) {
  const lang = await getServerLang();
  const t = (ar: string, en: string) => tFromLang(lang, ar, en);
  await requireRole(["admin", "employer", "evaluator"]);
  const supabase = await createServerSupabase();

  // فك وعود المسار بأمان
  const resolvedParams = await params;
  const id = resolvedParams.id;

  const { data: job } = await supabase.from("jobs").select("id,title").eq("id", id).maybeSingle();
  const { data: rows } = await supabase.from("candidate_resumes").select("id,job_id,status,stage,created_at,candidates(full_name,phone)").eq("job_id", id).order("created_at", { ascending: false });

  const groups = (rows ?? []).reduce((acc: any, r: any) => {
    const st = r.stage || "submitted";
    acc[st] = acc[st] ?? [];
    acc[st].push(r);
    return acc;
  }, {} as Record<string, any[]>);

  return (
    // التعديل 1: الحاوية الأم أصبحت flex-column لضمان الترتيب ومنع التمدد للخارج
    <div style={{ display: "flex", flexDirection: "column", gap: 24, width: "100%", maxWidth: "100%", overflowX: "hidden" }}>

      <div className="pageHeader">
        <div>
          <div className="eyebrow">Pipeline</div>
          <h1 className="pageTitle" style={{ marginTop: 10 }}>{job?.title ?? "—"}</h1>
          <div className="smallMuted" style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8, flexWrap: "wrap" }}>
            <Link href={`/dashboard/jobs/${id}/candidates`} className="dash-link">{t("المتقدمون", "Candidates")}</Link>
            <span className="dash-dot">•</span>
            <Link href={`/dashboard/jobs/${id}/candidates/ranking`} className="dash-link">{t("الترتيب", "Ranking")}</Link>
          </div>
        </div>
      </div>

      {/* التعديل 2: لوحة Kanban مرنة تدعم التمرير الأفقي بسلاسة تامة */}
      <div
        style={{
          display: "flex",
          gap: 16,
          overflowX: "auto",
          paddingBottom: 16,
          width: "100%",
          alignItems: "flex-start",
          scrollSnapType: "x mandatory"
        }}
      >
        {STAGES.map((col) => (
          <div
            key={col.key}
            className="card"
            style={{
              flex: "1 0 280px", // يضمن أن عرض العمود لا يقل عن 280 بكسل أبداً
              minHeight: 400,
              background: "linear-gradient(180deg, rgba(248, 251, 255, 0.95), rgba(244, 248, 255, 0.6))",
              border: "1px solid rgba(148, 163, 184, 0.15)",
              display: "flex",
              flexDirection: "column",
              scrollSnapAlign: "start"
            }}
          >
            <div className="cardRow" style={{ marginBottom: 16, borderBottom: "1px solid rgba(148, 163, 184, 0.1)", paddingBottom: 12 }}>
              <div style={{ fontWeight: 700, fontSize: 16, color: "var(--text)" }}>{t(col.ar, col.en)}</div>
              <span className="badge badge-primary" style={{ fontWeight: 800 }}>{(groups[col.key] ?? []).length}</span>
            </div>

            {/* بطاقات المرشحين داخل العمود مصطفة عمودياً */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {(groups[col.key] ?? []).map((r: any) => {
                const cand = Array.isArray(r.candidates) ? r.candidates?.[0] : r.candidates;
                return (
                  <div key={r.id} className="card" style={{ padding: 14, boxShadow: "var(--shadow-sm)", background: "#fff" }}>

                    <div className="cardRow" style={{ alignItems: "flex-start" }}>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: 15, wordBreak: "break-word" }}>{cand?.full_name ?? "—"}</div>
                        <div className="smallMuted" style={{ marginTop: 4, fontSize: 13 }} dir="ltr">{cand?.phone ?? ""}</div>
                      </div>
                      <Link href={`/dashboard/candidate-resumes/${r.id}`} className="dash-link" style={{ fontSize: 13, background: "rgba(40, 89, 255, 0.06)", padding: "4px 8px", borderRadius: 8 }}>
                        {t("تفاصيل", "Details")}
                      </Link>
                    </div>

                    <div style={{ marginTop: 12, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                      <StatusBadge status={r.status} />
                    </div>

                    {/* نموذج نقل المرشح محمي لكي لا ينفجر عرضياً */}
                    <form action={updateStage.bind(null, id)} style={{ marginTop: 16, display: "flex", gap: 8, alignItems: "center", width: "100%" }}>
                      <input type="hidden" name="candidate_resume_id" value={r.id} />
                      <select name="stage" defaultValue={r.stage || "submitted"} className="input" style={{ flex: 1, minWidth: 0, padding: "8px 10px", fontSize: 13, height: 36 }}>
                        {STAGES.map((stage) => (
                          <option key={stage.key} value={stage.key}>{t(stage.ar, stage.en)}</option>
                        ))}
                      </select>
                      <button className="btn btnPrimary" style={{ padding: "0 12px", height: 36, fontSize: 13 }}>
                        {t("حفظ", "Save")}
                      </button>
                    </form>

                  </div>
                );
              })}

              {(groups[col.key] ?? []).length === 0 ? (
                <div style={{ padding: 20, textAlign: "center" }} className="smallMuted">
                  {t("لا يوجد مرشحون في هذه المرحلة.", "No candidates in this stage.")}
                </div>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}