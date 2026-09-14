import { requireRole } from "@/lib/authGuard";
import { createServerSupabase } from "@/lib/supabaseServer";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getServerLang, tFromLang } from "@/lib/server-lang";

export const dynamic = "force-dynamic";

export async function SnapshotViewPage({ params }: { params: { snapshotId: string } | Promise<{ snapshotId: string }> }) {
  const lang = await getServerLang();
  const t = (ar: string, en: string) => tFromLang(lang, ar, en);
  const { companyId } = await requireRole(["admin", "recruiter", "viewer", "employer", "evaluator"]);
  if (!companyId) redirect("/dashboard/onboarding");

  // فك وعود المسار بطريقة آمنة
  const resolvedParams = await params;
  const snapshotId = resolvedParams.snapshotId;

  const supabase = await createServerSupabase();

  const { data: snap } = await supabase.from("job_analysis_snapshots").select("id,job_id,created_at,note").eq("id", snapshotId).maybeSingle();
  const { data: items } = await supabase.from("job_snapshot_candidates").select("id,final_score,raw_score,penalty,warnings,breakdown,candidate_resumes(file_name),candidates(full_name)").eq("snapshot_id", snapshotId);
  const sorted = (items ?? []).sort((a: any, b: any) => Number(b.final_score || 0) - Number(a.final_score || 0));

  return (
    // التعديل 1: الحاوية الأم أصبحت Flexbox عمودي لمنع تداخل الترويسة مع الجدول
    <div style={{ display: "flex", flexDirection: "column", gap: 24, width: "100%", maxWidth: "100%", overflowX: "hidden" }}>

      <div className="pageHeader">
        <div>
          <div className="eyebrow">{t("نسخة مجمّدة رسمية", "Official frozen snapshot")}</div>
          <h1 className="pageTitle" style={{ marginTop: 10 }}>{t("عرض اللقطة", "Snapshot view")}</h1>
          <div className="smallMuted" style={{ marginTop: 8 }}>
            {snap?.created_at ? new Date(snap.created_at).toLocaleString(lang === "ar" ? "ar" : "en-US") : ""}
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <span className="badge badge-muted" style={{ fontWeight: 700 }}>{t("قراءة فقط", "Read-only")}</span>
          {snap?.job_id ? (
            <Link className="btn btnSoft" href={`/dashboard/jobs/${snap.job_id}/snapshots`}>
              {t("العودة", "Back")}
            </Link>
          ) : null}
        </div>
      </div>

      {/* الإحصائيات ستلتف بذكاء بفضل auto-fit */}
      <div className="grid statsGrid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
        <div className="kpiCard">
          <div className="kpiLabel">{t("عدد العناصر", "Items")}</div>
          <div className="kpiValue" style={{ fontSize: 24 }}>{sorted.length}</div>
        </div>
        <div className="kpiCard">
          <div className="kpiLabel">{t("أعلى درجة", "Top score")}</div>
          <div className="kpiValue" style={{ fontSize: 24 }}>
            {sorted.length ? `${Math.round(Number(sorted[0]?.final_score || 0) * 100)}%` : "—"}
          </div>
        </div>
      </div>

      {snap?.note ? (
        <div className="card" style={{ borderInlineStart: "4px solid var(--primary)" }}>
          <div style={{ fontWeight: 700, fontSize: 16 }}>{t("ملاحظة اللقطة", "Snapshot note")}</div>
          <div className="smallMuted" style={{ marginTop: 10, lineHeight: 1.6, fontSize: 15 }}>{snap.note}</div>
        </div>
      ) : null}

      <div className="card" style={{ padding: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>

        {/* التعديل 2: حاوية الجدول مع خاصية التمرير الأفقي لحماية عرض الصفحة */}
        <div style={{ overflowX: "auto", width: "100%" }}>
          <table className="dataTable" style={{ width: "100%", borderCollapse: "collapse", textAlign: lang === "ar" ? "right" : "left" }}>
            <thead>
              <tr style={{ background: "rgba(15,23,42,0.02)", borderBottom: "1px solid var(--border)" }}>
                <th style={{ padding: "16px", fontWeight: 700 }}>#</th>
                <th style={{ padding: "16px", fontWeight: 700, whiteSpace: "nowrap" }}>{t("المرشح", "Candidate")}</th>
                <th style={{ padding: "16px", fontWeight: 700, whiteSpace: "nowrap" }}>{t("الملف", "File")}</th>
                <th style={{ padding: "16px", fontWeight: 700, whiteSpace: "nowrap" }}>{t("الدرجة النهائية", "Final score")}</th>
                <th style={{ padding: "16px", fontWeight: 700 }}>Raw</th>
                <th style={{ padding: "16px", fontWeight: 700 }}>Penalty</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((it: any, idx: number) => {
                const cand = Array.isArray(it.candidates) ? it.candidates?.[0] : it.candidates;
                const cr = Array.isArray(it.candidate_resumes) ? it.candidate_resumes?.[0] : it.candidate_resumes;
                return (
                  <tr key={it.id} style={{ borderBottom: "1px solid rgba(148, 163, 184, 0.1)" }}>
                    <td style={{ padding: "16px", color: "var(--muted)" }}>{idx + 1}</td>
                    <td style={{ padding: "16px", fontWeight: 700 }}>{cand?.full_name ?? t("مرشح", "Candidate")}</td>
                    <td style={{ padding: "16px", color: "var(--muted)", fontSize: "14px", wordBreak: "break-all" }}>{cr?.file_name ?? "—"}</td>
                    <td style={{ padding: "16px" }}>
                      <span className="badge badge-info" style={{ fontWeight: 800, fontSize: "14px" }}>
                        {Math.round(Number(it.final_score || 0) * 100)}%
                      </span>
                    </td>
                    <td style={{ padding: "16px", fontFamily: "monospace" }}>{Number(it.raw_score || 0).toFixed(3)}</td>
                    <td style={{ padding: "16px", fontFamily: "monospace", color: Number(it.penalty) > 0 ? "var(--danger)" : "inherit" }}>
                      {Number(it.penalty || 0).toFixed(3)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {sorted.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center" }} className="smallMuted">
            {t("لا يوجد عناصر داخل هذه اللقطة.", "There are no items in this snapshot.")}
          </div>
        ) : null}

      </div>
    </div>
  );
}