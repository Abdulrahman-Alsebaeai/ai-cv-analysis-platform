import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { cookies, headers } from "next/headers";
import { requireRole } from "@/lib/authGuard";
import { createServerSupabase } from "@/lib/supabaseServer";
import { JobCandidateResumeBulkUploader } from "@/components/evaluator/JobCandidateResumeBulkUploader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { getServerLang, tFromLang } from "@/lib/server-lang";

export const dynamic = "force-dynamic";

async function getOriginFromHeaders() {
  const h = headers();
  const proto = (await h).get("x-forwarded-proto") ?? "http";
  const host = (await h).get("x-forwarded-host") ?? (await h).get("host") ?? "localhost:3000";
  return `${proto}://${host}`;
}

async function analyzeAll(jobId: string) {
  "use server";
  await requireRole(["admin", "recruiter", "viewer", "employer", "evaluator"]);
  const apiUrl = process.env.ANALYSIS_API_URL;
  if (!apiUrl) redirect(`/dashboard/jobs/${jobId}/candidates?analyze=failed&msg=ANALYSIS_API_URL%20is%20missing`);

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
  redirect(`/dashboard/jobs/${jobId}/candidates?${qp.toString()}`);
}

async function analyzeOne(candidateResumeId: string, jobId: string) {
  "use server";
  await requireRole(["admin", "recruiter", "viewer", "employer", "evaluator"]);
  const origin = await getOriginFromHeaders();
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.getAll().map((c) => `${c.name}=${c.value}`).join("; ");

  let ok = false;
  let errMsg: string | null = null;
  try {
    const res = await fetch(`${origin}/api/analysis/candidate-resumes/${candidateResumeId}/analyze`, { method: "POST", cache: "no-store", headers: cookieHeader ? { cookie: cookieHeader } : {} });
    if (res.ok) ok = true;
    else errMsg = await res.text();
  } catch (e: any) {
    errMsg = e?.message ?? String(e);
  }

  revalidatePath(`/dashboard/candidate-resumes/${candidateResumeId}`);
  revalidatePath(`/dashboard/jobs/${jobId}/candidates`);
  revalidatePath(`/dashboard/jobs/${jobId}/candidates/ranking`);
  revalidatePath(`/dashboard/jobs/${jobId}/pipeline`);

  const qp = new URLSearchParams();
  qp.set("analyze", ok ? "ok" : "failed");
  if (!ok && errMsg) qp.set("msg", errMsg.slice(0, 600));
  redirect(`/dashboard/candidate-resumes/${candidateResumeId}?${qp.toString()}`);
}

export async function JobCandidatesPage({ params, searchParams }: { params: { id: string } | Promise<{ id: string }>; searchParams?: { analyze?: string; msg?: string } | Promise<{ analyze?: string; msg?: string }> }) {
  const lang = await getServerLang();
  const t = (ar: string, en: string) => tFromLang(lang, ar, en);
  const { companyId } = await requireRole(["admin", "recruiter", "viewer", "employer", "evaluator"]);
  if (!companyId) redirect("/dashboard/onboarding");

  // فك الوعود بطريقة آمنة لمتغيرات المسار
  const resolvedParams = await params;
  const jobId = resolvedParams.id;
  const sp = (await searchParams) ?? {};

  const supabase = await createServerSupabase();

  const { data: job } = await supabase.from("jobs").select("id,title").eq("id", jobId).maybeSingle();
  const { data: resumes, error: resErr } = await supabase.from("candidate_resumes").select("id,file_name,status,created_at,candidates(full_name)").eq("job_id", jobId).order("created_at", { ascending: false });

  const ids = (resumes ?? []).map((r: any) => r.id);
  const scoreMap = new Map<string, any>();
  if (ids.length) {
    const { data: scores } = await supabase.from("candidate_scores").select("candidate_resume_id,final_score,updated_at").in("candidate_resume_id", ids).order("updated_at", { ascending: false });
    for (const s of scores ?? []) {
      if (!scoreMap.has((s as any).candidate_resume_id)) scoreMap.set((s as any).candidate_resume_id, s);
    }
  }

  const suspiciousCount = Array.from(scoreMap.values()).filter((row: any) => Boolean(row?.warnings?.is_suspected)).length;

  return (
    // استبدال className="grid" بحاوية Flexbox عمودية مرنة ومحمية من التمدد
    <div style={{ display: "flex", flexDirection: "column", gap: 24, width: "100%", maxWidth: "100%", overflowX: "hidden" }}>

      {sp.analyze ? (
        <div className={sp.analyze === "ok" ? "alert alertSuccess" : "alert alertDanger"} style={{ wordBreak: "break-word" }}>
          {sp.analyze === "ok" ? t("✅ تم إرسال طلب التحليل.", "✅ Analysis request sent.") : t("⚠️ تعذر تشغيل التحليل.", "⚠️ Could not run analysis.")}
          {sp.analyze !== "ok" && sp.msg ? ` ${sp.msg}` : ""}
        </div>
      ) : null}

      <div className="pageHeader">
        <div>
          <div className="eyebrow">{t("تشغيل المرشحين", "Candidate operations")}</div>
          <h1 className="pageTitle" style={{ marginTop: 10 }}>{t("مرشحو الوظيفة", "Job candidates")} — {job?.title ?? "—"}</h1>
          <div className="smallMuted" style={{ marginTop: 8 }}>{t("ارفع الملفات، شغّل التحليل، وانتقل مباشرة إلى الترتيب أو الـ pipeline.", "Upload files, run the analysis, and jump directly to ranking or pipeline.")}</div>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <form action={analyzeAll.bind(null, jobId)}>
            <button className="btn btnPrimary" type="submit">{t("حلّل الجميع", "Analyze all")}</button>
          </form>
          <Link className="btn btnSoft" href={`/dashboard/jobs/${jobId}/candidates/ranking`}>{t("الترتيب", "Ranking")}</Link>
          <Link className="btn btnSoft" href={`/dashboard/jobs/${jobId}/pipeline`}>Pipeline</Link>
        </div>
      </div>

      {/* الإحصائيات - تركنا شبكة الإحصائيات (statsGrid) لأنها مصممة لتلتف تلقائياً (auto-fit) بشكل سليم */}
      <div className="grid statsGrid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
        <div className="kpiCard"><div className="kpiLabel">{t("إجمالي الملفات", "Total files")}</div><div className="kpiValue" style={{ fontSize: 24 }}>{resumes?.length ?? 0}</div></div>
        <div className="kpiCard"><div className="kpiLabel">{t("تم تحليلها", "Analyzed")}</div><div className="kpiValue" style={{ fontSize: 24 }}>{Array.from(scoreMap.keys()).length}</div></div>
        <div className="kpiCard"><div className="kpiLabel">{t("سير مشبوهة", "Suspicious resumes")}</div><div className="kpiValue" style={{ fontSize: 24 }}>{suspiciousCount}</div></div>
      </div>

      {/* 
        التخطيط السليم بدلاً من grid-template-columns: 1.05fr .95fr
        نستخدم flex-wrap بحيث تصطف العناصر جانب بعضها إذا كان هناك مساحة (شاشة حاسوب)
        أو تترتب عمودياً إذا كانت الشاشة صغيرة (جوال/تابلت).
      */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 24, alignItems: "flex-start", width: "100%" }}>

        {/* العمود الأول: أداة الرفع المجمّع */}
        <div style={{ flex: "1 1 450px", minWidth: 0, maxWidth: "100%" }}>
          <JobCandidateResumeBulkUploader jobId={jobId} />
        </div>

        {/* العمود الثاني: قائمة الملفات المرفوعة */}
        <div className="card" style={{ flex: "1 1 400px", minWidth: 0, maxWidth: "100%", padding: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>

          <div style={{ padding: "18px 20px", fontWeight: 700, fontSize: 18, borderBottom: "1px solid var(--border)", background: "rgba(15,23,42,0.02)" }}>
            {t("الملفات المرفوعة", "Uploaded candidates")} <span style={{ color: "var(--muted)", fontWeight: 500, marginInlineStart: 4 }}>({resumes?.length ?? 0})</span>
          </div>

          {resErr ? <div style={{ margin: 16 }} className="alert alertDanger">{resErr.message}</div> : null}

          <div style={{ display: "flex", flexDirection: "column" }}>
            {(resumes ?? []).map((r: any) => {
              const cand = Array.isArray(r.candidates) ? r.candidates?.[0] : r.candidates;
              const sc = scoreMap.get(r.id) ?? null;

              return (
                <div key={r.id} style={{ padding: "16px 20px", borderBottom: "1px solid rgba(148, 163, 184, 0.12)", display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>

                  {/* بيانات المرشح والملف */}
                  <div style={{ flex: "1 1 200px", minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 16 }}>{cand?.full_name ?? t("مرشح", "Candidate")}</div>
                    <div className="smallMuted" style={{ marginTop: 4, wordBreak: "break-all", lineHeight: 1.4 }}>{r.file_name}</div>
                    <div style={{ display: "flex", gap: 8, marginTop: 8, alignItems: "center", flexWrap: "wrap" }}>
                      <span className="smallMuted" style={{ fontSize: 13 }}>{t("الدرجة", "Score")}: <b style={{ color: "var(--text)" }}>{sc?.final_score != null ? `${Math.round(Number(sc.final_score) * 100)}%` : "—"}</b></span>
                      <StatusBadge status={r.status} />
                    </div>
                  </div>

                  {/* أزرار الإجراءات */}
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                    <form action={analyzeOne.bind(null, r.id, jobId)}>
                      <button className="btn" style={{ minHeight: 36, padding: "6px 14px", fontSize: 13 }} type="submit">
                        {t("تحليل", "Analyze")}
                      </button>
                    </form>
                    <Link className="btn btnSoft" style={{ minHeight: 36, padding: "6px 14px", fontSize: 13 }} href={`/dashboard/candidate-resumes/${r.id}`}>
                      {t("فتح", "Open")}
                    </Link>
                  </div>

                </div>
              );
            })}
          </div>

          {!resumes || resumes.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center" }} className="smallMuted">
              {t("لا توجد ملفات بعد لهذه الوظيفة.", "No files have been uploaded for this job yet.")}
            </div>
          ) : null}

        </div>
      </div>
    </div>
  );
}