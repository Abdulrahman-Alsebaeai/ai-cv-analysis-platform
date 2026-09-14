import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/authGuard";
import { createServerSupabase } from "@/lib/supabaseServer";
import { CandidateRankingTable } from "@/components/evaluator/CandidateRankingTable";
import { ExportAndSnapshotBar } from "@/components/evaluator/ExportAndSnapshotBar";
import { getServerLang, tFromLang } from "@/lib/server-lang";

export const dynamic = "force-dynamic";

async function analyzeAll(jobId: string) {
  "use server";
  await requireRole(["admin", "recruiter", "viewer", "employer", "evaluator"]);

  const apiUrl = process.env.ANALYSIS_API_URL;
  if (!apiUrl) redirect(`/dashboard/jobs/${jobId}/candidates/ranking?analyze=failed&msg=ANALYSIS_API_URL%20is%20missing`);

  let ok = false;
  let errMsg: string | null = null;
  try {
    const res = await fetch(`${apiUrl}/analysis/jobs/${jobId}/analyze-candidates`, { method: "POST", headers: { "x-api-key": process.env.ANALYSIS_API_KEY || "" }, cache: "no-store" });
    if (res.ok) ok = true;
    else errMsg = await res.text();
  } catch (e: any) {
    errMsg = e?.message ?? String(e);
  }

  revalidatePath(`/dashboard/jobs/${jobId}/candidates`);
  revalidatePath(`/dashboard/jobs/${jobId}/candidates/ranking`);
  revalidatePath(`/dashboard/jobs/${jobId}/pipeline`);

  const qp = new URLSearchParams();
  qp.set("analyze", ok ? "ok" : "failed");
  if (!ok && errMsg) qp.set("msg", errMsg.slice(0, 600));
  redirect(`/dashboard/jobs/${jobId}/candidates/ranking?${qp.toString()}`);
}

export async function JobCandidateRankingPage({ params, searchParams }: { params: { id: string } | Promise<{ id: string }>; searchParams?: { analyze?: string; msg?: string } | Promise<{ analyze?: string; msg?: string }> }) {
  const lang = await getServerLang();
  const t = (ar: string, en: string) => tFromLang(lang, ar, en);
  const { companyId } = await requireRole(["admin", "recruiter", "viewer", "employer", "evaluator"]);
  if (!companyId) redirect("/dashboard/onboarding");

  // فك الوعود بطريقة آمنة ومتوافقة مع Next.js 15
  const resolvedParams = await params;
  const jobId = resolvedParams.id;
  const sp = (await searchParams) ?? {};
  const supabase = await createServerSupabase();

  const { data: job } = await supabase.from("jobs").select("id,title").eq("id", jobId).maybeSingle();
  const { data: resumes } = await supabase.from("candidate_resumes").select("id,file_name,status,candidates(full_name)").eq("job_id", jobId);
  const ids = (resumes ?? []).map((r: any) => r.id);
  const scoreMap = new Map<string, any>();
  if (ids.length) {
    const { data: scores } = await supabase.from("candidate_scores").select("candidate_resume_id,final_score,raw_score,penalty,warnings,breakdown,updated_at").in("candidate_resume_id", ids).order("updated_at", { ascending: false });
    for (const s of scores ?? []) {
      if (!scoreMap.has((s as any).candidate_resume_id)) scoreMap.set((s as any).candidate_resume_id, s);
    }
  }
  const rows = (resumes ?? []).map((r: any) => ({ ...r, candidate_scores: scoreMap.get(r.id) ? [scoreMap.get(r.id)] : [] }));

  return (
    // التعديل 1: الحاوية الرئيسية أصبحت Flexbox عمودي يمنع التداخل ويحمي العرض (overflowX: hidden)
    <div style={{ display: "flex", flexDirection: "column", gap: 24, width: "100%", maxWidth: "100%", overflowX: "hidden" }}>

      {sp.analyze ? (
        <div className={sp.analyze === "ok" ? "alert alertSuccess" : "alert alertDanger"} style={{ wordBreak: "break-word" }}>
          {sp.analyze === "ok" ? t("✅ تم إرسال طلب التحليل لجميع المرشحين.", "✅ Analysis request sent for all candidates.") : t("⚠️ تعذر تشغيل التحليل.", "⚠️ Could not run analysis.")}
          {sp.analyze !== "ok" && sp.msg ? ` ${sp.msg}` : ""}
        </div>
      ) : null}

      <div className="pageHeader">
        <div>
          <div className="eyebrow">{t("مركز الترتيب", "Ranking center")}</div>
          <h1 className="pageTitle" style={{ marginTop: 10 }}>{t("ترتيب المرشحين", "Candidate ranking")} — {job?.title ?? "—"}</h1>
          <div className="smallMuted" style={{ marginTop: 8, maxWidth: "700px", lineHeight: 1.7 }}>
            {t("مقارنة نهائية مبنية على final score مع التحذيرات والمهارات الأبرز ونواقص must-have.", "A final comparison based on final score with warnings, top skills, and missing must-have requirements.")}
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <form action={analyzeAll.bind(null, jobId)}>
            <button className="btn btnPrimary" type="submit">{t("حلّل الجميع", "Analyze all")}</button>
          </form>
          <ExportAndSnapshotBar jobId={jobId} />
          <Link className="btn" href={`/dashboard/jobs/${jobId}/snapshots`}>{t("النسخ المجمّدة", "Snapshots")}</Link>
          <Link className="btn btnSoft" href={`/dashboard/jobs/${jobId}/candidates`}>{t("المرشحون", "Candidates")}</Link>
        </div>
      </div>

      {/* التعديل 2: حاوية تحمي الجدول بـ overflowX: auto ليتمكن المستخدم من التمرير داخل الجدول براحة تامة */}
      <div style={{ width: "100%", minWidth: 0, overflowX: "auto", paddingBottom: 16 }}>
        <CandidateRankingTable rows={(rows as any) ?? []} />
      </div>

    </div>
  );
}