import Link from "next/link";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/authGuard";
import { createServerSupabase } from "@/lib/supabaseServer";
import { getServerLang, tFromLang } from "@/lib/server-lang";

export const dynamic = "force-dynamic";

export async function CandidatesIndexPage() {
  const lang = await getServerLang();
  const t = (ar: string, en: string) => tFromLang(lang, ar, en);
  const { companyId } = await requireRole(["admin", "recruiter", "viewer", "employer", "evaluator"]);
  if (!companyId) redirect("/dashboard/onboarding");

  const supabase = await createServerSupabase();
  const { data: rows, error } = await supabase
    .from("candidates")
    .select("id,full_name,email,phone,created_at")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  return (
    // التعديل 1: استبدال grid بـ flex-column لضمان الترتيب العمودي السليم للحاوية الأم
    <div style={{ display: "flex", flexDirection: "column", gap: 24, width: "100%", maxWidth: "100%" }}>

      <div className="pageHeader">
        <div>
          <div className="eyebrow">{t("قاعدة المرشحين", "Candidate directory")}</div>
          <h1 className="pageTitle" style={{ marginTop: 10 }}>{t("المرشحون", "Candidates")}</h1>
          <div className="smallMuted" style={{ marginTop: 6, maxWidth: "600px" }}>
            {t("قائمة موحدة للمرشحين داخل شركتك مع وصول سريع إلى الملفات المرتبطة بهم.", "A unified company-wide list with fast access to linked files and activity.")}
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link className="btn btnPrimary" href="/dashboard/candidates/new">
            + {t("إضافة مرشح", "Add candidate")}
          </Link>
          <Link className="btn" href="/dashboard/jobs">
            {t("الوظائف", "Jobs")}
          </Link>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: "hidden", display: "flex", flexDirection: "column", width: "100%" }}>

        <div style={{ padding: "18px 24px", fontWeight: 700, fontSize: "16px", borderBottom: "1px solid var(--border)", background: "rgba(15,23,42,0.02)" }}>
          {t("المرشحون", "Candidates")} <span style={{ color: "var(--muted)", fontWeight: 500, marginInlineStart: 6 }}>({rows?.length ?? 0})</span>
        </div>

        {error ? <div className="alert alertDanger" style={{ margin: 24 }}>{error.message}</div> : null}

        {/* التعديل 2: حاوية الجدول مع خاصية overflow-x: auto لمنع الجدول من تمديد الصفحة */}
        <div style={{ overflowX: "auto", width: "100%" }}>
          <table className="dataTable" style={{ width: "100%", borderCollapse: "collapse", textAlign: lang === "ar" ? "right" : "left" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)", background: "rgba(248, 251, 255, 0.6)" }}>
                <th style={{ padding: "16px 24px", color: "var(--muted)", fontWeight: 600, fontSize: "13px", textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>{t("الاسم", "Name")}</th>
                <th style={{ padding: "16px 24px", color: "var(--muted)", fontWeight: 600, fontSize: "13px", textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>Email</th>
                <th style={{ padding: "16px 24px", color: "var(--muted)", fontWeight: 600, fontSize: "13px", textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>{t("الهاتف", "Phone")}</th>
                <th style={{ padding: "16px 24px", color: "var(--muted)", fontWeight: 600, fontSize: "13px", textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>{t("تاريخ الإنشاء", "Created at")}</th>
                <th style={{ padding: "16px 24px", color: "var(--muted)", fontWeight: 600, fontSize: "13px", textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap", width: "100px" }}>{t("إجراء", "Action")}</th>
              </tr>
            </thead>
            <tbody>
              {(rows ?? []).map((c: any) => (
                <tr key={c.id} style={{ borderBottom: "1px solid rgba(148, 163, 184, 0.1)" }}>
                  <td style={{ padding: "16px 24px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                      <img
                        src={`https://ui-avatars.com/api/?name=${encodeURIComponent(c.full_name || "C")}&background=eff4ff&color=2859ff&size=80`}
                        alt={c.full_name ?? "Candidate"}
                        style={{ width: 42, height: 42, borderRadius: "50%", objectFit: "cover", boxShadow: "0 2px 8px rgba(40,89,255,0.12)" }}
                      />
                      <div style={{ fontWeight: 700, fontSize: "15px", color: "var(--text)" }}>{c.full_name ?? t("مرشح", "Candidate")}</div>
                    </div>
                  </td>
                  <td style={{ padding: "16px 24px", color: "#475569", fontSize: "14.5px" }}>{c.email ?? "—"}</td>
                  <td style={{ padding: "16px 24px", color: "#475569", fontSize: "14.5px", whiteSpace: "nowrap" }}>{c.phone ?? "—"}</td>
                  <td style={{ padding: "16px 24px", color: "var(--muted)", fontSize: "14px", whiteSpace: "nowrap" }}>
                    {c.created_at ? new Date(c.created_at).toLocaleDateString(lang === "ar" ? "ar" : "en-US", { year: 'numeric', month: 'short', day: 'numeric' }) : "—"}
                  </td>
                  <td style={{ padding: "16px 24px" }}>
                    <Link
                      className="btn btnSoft"
                      style={{ minHeight: "36px", padding: "6px 16px", fontSize: "13.5px" }}
                      href={`/dashboard/candidates/${c.id}`}
                    >
                      {t("فتح", "Open")}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!error && (!rows || rows.length === 0) ? (
          <div style={{ padding: 40, textAlign: "center", display: "flex", flexDirection: "column", gap: 10, alignItems: "center" }}>
            <div style={{ width: 48, height: 48, borderRadius: "50%", background: "rgba(40, 89, 255, 0.08)", color: "var(--primary)", display: "grid", placeItems: "center", fontSize: 20 }}>
              <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
            </div>
            <div className="smallMuted">{t("لا يوجد مرشحون بعد.", "No candidates yet.")}</div>
          </div>
        ) : null}

      </div>
    </div>
  );
}