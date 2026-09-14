import { requireRole } from "@/lib/authGuard";
import { createServerSupabase } from "@/lib/supabaseServer";
import Link from "next/link";
import { InviteMemberForm } from "@/components/evaluator/InviteMemberForm";
import { TeamMembersTable } from "@/components/evaluator/TeamMembersTable";
import { getServerLang, tFromLang } from "@/lib/server-lang";

export const dynamic = "force-dynamic";

export async function CompanyPage() {
  const lang = await getServerLang();
  const t = (ar: string, en: string) => tFromLang(lang, ar, en);
  const { companyId } = await requireRole(["admin", "recruiter", "viewer", "employer", "evaluator"]);
  const supabase = await createServerSupabase();

  if (!companyId) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16, width: "100%" }}>
        <div className="card" style={{ borderInlineStart: "4px solid var(--danger)" }}>
          <p style={{ margin: 0, fontWeight: 700, color: "var(--danger)", fontSize: "16px" }}>
            {t("حسابك غير مرتبط بشركة بعد.", "Your account is not linked to a company yet.")}
          </p>
          <div style={{ marginTop: 16 }}>
            <Link href="/dashboard/onboarding" className="btn btnPrimary">
              {t("اذهب إلى الإعداد الأولي", "Go to onboarding")}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const { data: company } = await supabase.from("companies").select("id,name,created_at").eq("id", companyId).maybeSingle();
  const { data: members } = await supabase.from("profiles").select("id,full_name,phone,role,created_at").eq("company_id", companyId).order("created_at", { ascending: false });

  return (
    // الحاوية الأم: تمنع الـ Grid العشوائي وتفرض ترتيباً عمودياً محمياً
    <div style={{ display: "flex", flexDirection: "column", gap: 24, width: "100%", maxWidth: "100%", overflowX: "hidden" }}>

      <div className="pageHeader">
        <div>
          <div className="eyebrow">{t("الشركة والفريق", "Company and team")}</div>
          <h1 className="pageTitle" style={{ marginTop: 10 }}>{company?.name ?? "—"}</h1>
          <div className="smallMuted" style={{ marginTop: 6 }}>
            {t("مساحة إدارة أعضاء الفريق والأدوار والدعوات.", "A workspace for managing members, roles, and invitations.")}
          </div>
        </div>
      </div>

      {/* الإحصائيات: تلتف تلقائياً */}
      <div className="grid statsGrid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
        <div className="kpiCard">
          <div className="kpiLabel">{t("أعضاء الفريق", "Team members")}</div>
          <div className="kpiValue" style={{ fontSize: 24 }}>{members?.length ?? 0}</div>
        </div>
        <div className="kpiCard">
          <div className="kpiLabel">{t("تاريخ الإنشاء", "Created")}</div>
          <div className="kpiValue" style={{ fontSize: 20 }}>
            {company?.created_at ? new Date(company.created_at).toLocaleDateString(lang === "ar" ? "ar" : "en-US") : "—"}
          </div>
        </div>
      </div>

      {/* 
        التنسيق المرن (Flex Wrap):
        يضمن عدم تداخل "نموذج الدعوة" مع "جدول الأعضاء" 
        ويحمي الجداول من تمديد الصفحة عرضياً.
      */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 24, alignItems: "flex-start", width: "100%" }}>

        {/* العمود الأول: دعوة عضو جديد */}
        <div className="card" style={{ flex: "1 1 400px", minWidth: 0, maxWidth: "100%" }}>
          <div style={{ fontWeight: 700, fontSize: 18 }}>{t("دعوة عضو جديد", "Invite a new member")}</div>
          <p className="smallMuted" style={{ marginTop: 8, lineHeight: 1.6 }}>
            {t("سيتم إرسال دعوة بالبريد، وعند قبولها سيرتبط العضو تلقائيًا بنفس الشركة.", "An email invitation will be sent, and once accepted the member will automatically join the same company.")}
          </p>
          <div style={{ marginTop: 24 }}>
            <InviteMemberForm />
          </div>
        </div>

        {/* العمود الثاني: قائمة أعضاء الفريق */}
        <div className="card" style={{ flex: "1 1 550px", minWidth: 0, maxWidth: "100%", padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "18px 20px", borderBottom: "1px solid var(--border)", background: "rgba(15,23,42,0.02)", fontWeight: 700, fontSize: 16 }}>
            {t("أعضاء الفريق", "Team members")}
          </div>

          {/* حاوية تمرير للجدول لحماية عرض الصفحة */}
          <div style={{ overflowX: "auto", width: "100%" }}>
            <TeamMembersTable rows={members ?? []} />
          </div>

          {(!members || members.length === 0) && (
            <div style={{ padding: 32, textAlign: "center" }} className="smallMuted">
              {t("لا يوجد أعضاء في الفريق بعد.", "No team members yet.")}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}