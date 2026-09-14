import Link from "next/link";
import { requireRole } from "@/lib/authGuard";
import { createServerSupabase } from "@/lib/supabaseServer";
import { redirect } from "next/navigation";
import { getServerLang, tFromLang } from "@/lib/server-lang";

export const dynamic = "force-dynamic";

export async function JobSnapshotsPage({ params }: { params: { id: string } | Promise<{ id: string }> }) {
  const lang = await getServerLang();
  const t = (ar: string, en: string) => tFromLang(lang, ar, en);
  const { companyId } = await requireRole(["admin", "recruiter", "viewer", "employer", "evaluator"]);
  if (!companyId) redirect("/dashboard/onboarding");

  // فك وعود المسار بطريقة آمنة
  const resolvedParams = await params;
  const jobId = resolvedParams.id;
  const supabase = await createServerSupabase();

  const { data: snaps } = await supabase
    .from("job_analysis_snapshots")
    .select("id,created_at,note")
    .eq("job_id", jobId)
    .order("created_at", { ascending: false });

  const { data: job } = await supabase
    .from("jobs")
    .select("title")
    .eq("id", jobId)
    .maybeSingle();

  return (
    // استبدال className="grid" بحاوية Flexbox عمودية مرنة ومحمية بالكامل
    <div style={{ display: "flex", flexDirection: "column", gap: 24, width: "100%", maxWidth: "100%", overflowX: "hidden" }}>

      <div className="pageHeader">
        <div>
          <div className="eyebrow">{t("النسخ المجمّدة", "Snapshots")}</div>
          <h1 className="pageTitle" style={{ marginTop: 10 }}>{job?.title ?? "—"}</h1>
          <div className="smallMuted" style={{ marginTop: 8, maxWidth: "700px", lineHeight: 1.7 }}>
            {t("حفظ رسمي لنتائج الترتيب والدرجات في لحظة محددة للمراجعة أو المشاركة لاحقًا.", "A formal frozen record of ranking results and scores at a given moment for later review or sharing.")}
          </div>
        </div>
        <Link className="btn" href={`/dashboard/jobs/${jobId}/candidates/ranking`}>
          {t("العودة للترتيب", "Back to ranking")}
        </Link>
      </div>

      <div className="grid" style={{ width: "100%" }}>
        {(snaps ?? []).map((s: any, index: number) => (
          <Link
            key={s.id}
            href={`/dashboard/snapshots/${s.id}`}
            className="card"
            style={{ textDecoration: "none", minWidth: 0, display: "flex", flexDirection: "column", justifyContent: "space-between" }}
          >
            <div className="cardRow">
              <div>
                <div style={{ fontWeight: 700, fontSize: 18 }}>
                  {t("لقطة محفوظة", "Saved snapshot")} #{index + 1}
                </div>
                <div className="smallMuted" style={{ marginTop: 6 }}>
                  {new Date(s.created_at).toLocaleString(lang === "ar" ? "ar" : "en-US")}
                </div>
              </div>
              <span className="badge badge-info" style={{ whiteSpace: "nowrap" }}>
                {t("قراءة فقط", "Read-only")}
              </span>
            </div>
            {s.note ? (
              <div className="smallMuted" style={{ marginTop: 16, wordBreak: "break-word", lineHeight: 1.6 }}>
                {s.note}
              </div>
            ) : null}
          </Link>
        ))}

        {(!snaps || snaps.length === 0) ? (
          <div className="card" style={{ gridColumn: "1 / -1", textAlign: "center", padding: 40 }}>
            <div className="smallMuted">
              {t("لا توجد snapshots محفوظة بعد.", "No snapshots have been saved yet.")}
            </div>
          </div>
        ) : null}
      </div>

    </div>
  );
}