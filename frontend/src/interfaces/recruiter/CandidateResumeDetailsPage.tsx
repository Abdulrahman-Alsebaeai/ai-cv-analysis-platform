import Link from "next/link";
import { revalidatePath } from "next/cache";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/authGuard";
import { createServerSupabase } from "@/lib/supabaseServer";
import { createAdminSupabase } from "@/lib/supabaseAdmin";
import { ScoreBreakdown } from "@/components/evaluator/ScoreBreakdown";
import { StuffingDetails } from "@/components/evaluator/StuffingDetails";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { getServerLang, tFromLang } from "@/lib/server-lang";

export const dynamic = "force-dynamic";

async function getOriginFromHeaders() {
  const h = headers();
  const proto = (await h).get("x-forwarded-proto") ?? "http";
  const host = (await h).get("x-forwarded-host") ?? (await h).get("host") ?? "localhost:3000";
  return `${proto}://${host}`;
}

async function analyzeCandidateResume(candidateResumeId: string, jobId: string) {
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

export async function CandidateResumeDetailsPage({ params, searchParams }: { params: { id: string } | Promise<{ id: string }>; searchParams?: { analyze?: string; msg?: string } | Promise<{ analyze?: string; msg?: string }> }) {
  const lang = await getServerLang();
  const t = (ar: string, en: string) => tFromLang(lang, ar, en);
  await requireRole(["admin", "recruiter", "viewer", "employer", "evaluator"]);
  const { id } = await params;
  const sp = (await searchParams) ?? {};
  const supabase = await createServerSupabase();

  const { data: cr, error: crErr } = await supabase.from("candidate_resumes").select("id,job_id,candidate_id,company_id,status,stage,created_at,file_name,mime_type,storage_path, candidates(full_name,email,phone)").eq("id", id).maybeSingle();
  if (crErr || !cr) return <div className="alert alertDanger">{t("لم يتم العثور على السيرة الذاتية.", "Resume not found.")}</div>;

  const cand = Array.isArray((cr as any).candidates) ? (cr as any).candidates?.[0] : (cr as any).candidates;
  let scoreRow: any = null;
  const { data: scores } = await supabase.from("candidate_scores").select("final_score,raw_score,penalty,warnings,breakdown,updated_at").eq("candidate_resume_id", cr.id).order("updated_at", { ascending: false }).limit(1);
  scoreRow = scores?.[0] ?? null;

  let signedUrl: string | null = null;
  let signedErrMsg: string | null = null;
  if (cr.storage_path) {
    const { data: s1, error: s1Err } = await supabase.storage.from("resumes").createSignedUrl(cr.storage_path, 60);
    if (!s1Err) signedUrl = s1?.signedUrl ?? null;
    else {
      signedErrMsg = s1Err.message;
      if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
        try {
          const admin = createAdminSupabase();
          const { data: s2, error: s2Err } = await admin.storage.from("resumes").createSignedUrl(cr.storage_path, 60);
          if (!s2Err) signedUrl = s2?.signedUrl ?? null;
          if (s2Err) signedErrMsg = s2Err.message;
        } catch (e: any) {
          signedErrMsg = e?.message ?? String(e);
        }
      }
    }
  }

  const warnings = scoreRow?.warnings ?? scoreRow?.breakdown?.warnings ?? null;

  return (
    // التعديل الأول: جعل الحاوية الأم فليكس عمودي، تمنع الخروج العرضي (overflowX: hidden)
    <div style={{ display: "flex", flexDirection: "column", gap: 24, width: "100%", maxWidth: "100%", overflowX: "hidden" }}>

      {sp.analyze ? (
        <div className={sp.analyze === "ok" ? "alert alertSuccess" : "alert alertDanger"} style={{ wordBreak: "break-word" }}>
          {sp.analyze === "ok" ? t("✅ تم إرسال الطلب للتحليل. حدّث الصفحة بعد قليل لرؤية النتيجة.", "✅ Analysis started. Refresh shortly to see the result.") : t("⚠️ تعذر تشغيل التحليل الآن.", "⚠️ Could not run the analysis right now.")}{sp.analyze !== "ok" && sp.msg ? ` ${sp.msg}` : ""}
        </div>
      ) : null}

      <div className="pageHeader">
        <div>
          <div className="eyebrow">{t("مراجعة السيرة الذاتية", "Resume review")}</div>
          <h1 className="pageTitle" style={{ marginTop: 10 }}>{cand?.full_name ?? t("مرشح", "Candidate")}</h1>
          <div className="smallMuted" style={{ wordBreak: "break-all" }}>{cr.file_name ?? "—"}</div>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <StatusBadge status={cr.status} />
          <Link className="btn" href={`/dashboard/jobs/${cr.job_id}/candidates`}>{t("رجوع", "Back")}</Link>
        </div>
      </div>

      {/* التعديل الثاني: استبدال التقسيم الثابت (1.1fr 0.9fr) بتخطيط فليكس مرن يتوزع حسب الشاشة */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 24, alignItems: "flex-start", width: "100%" }}>

        {/* العمود الأيمن/الأيسر الأول (عارض الملف): يأخذ مساحة كافية وينزل سطر لو الشاشة صغيرة */}
        <div
          className="card"
          style={{
            flex: "1 1 500px",
            minWidth: 0,
            maxWidth: "100%",
            display: "flex",
            flexDirection: "column"
          }}
        >
          <div className="cardRow">
            <div>
              <div style={{ fontWeight: 700, fontSize: 18 }}>{t("عارض الملف", "Resume viewer")}</div>
              <div className="smallMuted" style={{ marginTop: 6 }}>{t("معاينة مباشرة للملف مع وصول سريع إلى التحليل وإعادة التشغيل.", "Direct file preview with quick access to analysis and rerun actions.")}</div>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {signedUrl ? <a className="btn" href={signedUrl} target="_blank" rel="noreferrer">{t("فتح الملف", "Open file")}</a> : null}
              <form action={analyzeCandidateResume.bind(null, cr.id, cr.job_id)}>
                <button className="btn btnPrimary" type="submit">{t("إعادة التحليل", "Reanalyze")}</button>
              </form>
            </div>
          </div>

          <div className="info-strip" style={{ marginTop: 24 }}>
            <div className="info-pill"><div className="smallMuted">Email</div><div style={{ fontWeight: 700, marginTop: 8, wordBreak: "break-all" }}>{cand?.email ?? "—"}</div></div>
            <div className="info-pill"><div className="smallMuted">{t("الهاتف", "Phone")}</div><div style={{ fontWeight: 700, marginTop: 8 }}>{cand?.phone ?? "—"}</div></div>
            <div className="info-pill"><div className="smallMuted">{t("المرحلة", "Stage")}</div><div style={{ fontWeight: 700, marginTop: 8 }}>{cr.stage ?? "submitted"}</div></div>
          </div>

          <div style={{ marginTop: 24, border: "1px solid rgba(148, 163, 184, 0.22)", borderRadius: 20, overflow: "hidden", background: "#f8fbff", flexGrow: 1 }}>
            {signedUrl ? (
              <iframe src={signedUrl} title="Resume Viewer" style={{ width: "100%", height: 720, border: 0, display: "block" }} />
            ) : (
              <div style={{ padding: 32, textAlign: "center" }} className="smallMuted">
                {t("لا يمكن إنشاء رابط عرض/تحميل الآن.", "Could not create a preview/download link right now.")}{signedErrMsg ? ` ${signedErrMsg}` : ""}
              </div>
            )}
          </div>
        </div>

        {/* العمود الثاني (النتائج والتحليل): يأخذ مساحة ويتجاوب مع الشاشة */}
        <div
          style={{
            flex: "1 1 400px",
            minWidth: 0,
            maxWidth: "100%",
            display: "flex",
            flexDirection: "column",
            gap: 24
          }}
        >
          {/* بطاقة النتيجة */}
          <div className="card" style={{ position: "sticky", top: 84 }}>
            <div className="eyebrow">{t("النتيجة", "Result")}</div>
            <div className="kpiValue" style={{ marginTop: 12, fontSize: 48, fontWeight: 900 }}>
              {scoreRow?.final_score != null ? `${Math.round(Number(scoreRow.final_score) * 100)}%` : "—"}
            </div>
            <div className="smallMuted" style={{ marginTop: 8 }}>
              {t("آخر تحديث", "Last updated")}: {scoreRow?.updated_at ? new Date(scoreRow.updated_at).toLocaleString(lang === "ar" ? "ar" : "en-US") : "—"}
            </div>

            <div className="info-strip" style={{ marginTop: 20 }}>
              <div className="info-pill"><div className="smallMuted">Raw Score</div><div style={{ fontWeight: 700, marginTop: 8 }}>{scoreRow?.raw_score != null ? Number(scoreRow.raw_score).toFixed(3) : "—"}</div></div>
              <div className="info-pill"><div className="smallMuted">Penalty</div><div style={{ fontWeight: 700, marginTop: 8 }}>{scoreRow?.penalty != null ? Number(scoreRow.penalty).toFixed(3) : "—"}</div></div>
            </div>
          </div>

          {/* بطاقة تفاصيل التحليل */}
          <div className="card" style={{ minWidth: 0, overflow: "hidden" }}>
            <div style={{ fontWeight: 700, fontSize: 18 }}>{t("تفاصيل التحليل", "Analysis breakdown")}</div>
            {/* إضافة overflowX: auto للجدول لحمايته من التمدد */}
            <div style={{ marginTop: 16, overflowX: "auto", paddingBottom: 8 }}>
              <ScoreBreakdown breakdown={scoreRow?.breakdown ?? null} />
            </div>
          </div>

          {/* بطاقة تحليل الحشو */}
          <div className="card" style={{ minWidth: 0, overflow: "hidden" }}>
            <div style={{ fontWeight: 700, fontSize: 18 }}>{t("تحليل الحشو والتكرار", "Stuffing and repetition analysis")}</div>
            <div style={{ marginTop: 16, overflowX: "auto", paddingBottom: 8 }}>
              <StuffingDetails warnings={warnings} />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}