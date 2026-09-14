import Link from "next/link";
import { requireAuth } from "@/lib/authGuard";
import { createServerSupabase } from "@/lib/supabaseServer";
import { getServerLang, tFromLang } from "@/lib/server-lang";

export const dynamic = "force-dynamic";

type NotificationRow = {
  id: string;
  title?: string | null;
  body?: string | null;
  type?: string | null;
  message?: string | null;
  meta?: any;
  created_at: string;
};

export async function ApplicantNotificationsPage() {
  const lang = await getServerLang();
  const t = (ar: string, en: string) => tFromLang(lang, ar, en);
  const { userId } = await requireAuth();
  const supabase = await createServerSupabase();

  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);

  const rows = (data ?? []) as NotificationRow[];

  return (
    // التعديل الأول: استخدام flex column للحاوية الرئيسية بدلاً من grid
    <div style={{ display: "flex", flexDirection: "column", gap: 24, width: "100%" }}>
      <div className="pageHeader">
        <div>
          <div className="eyebrow">{t("التحديثات", "Updates")}</div>
          <h1 className="pageTitle" style={{ marginTop: 10 }}>
            {t("الإشعارات", "Notifications")}
          </h1>
        </div>
        <Link href="/applicant/applications" className="btn">
          {t("طلباتي", "My applications")}
        </Link>
      </div>

      <div
        className="grid statsGrid"
        style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}
      >
        <div className="kpiCard">
          <div className="kpiLabel">{t("إجمالي الإشعارات", "Total notifications")}</div>
          <div className="kpiValue">{rows.length}</div>
        </div>
        <div className="kpiCard">
          <div className="kpiLabel">{t("آخر إشعار", "Latest update")}</div>
          <div className="kpiValue" style={{ fontSize: 20 }}>
            {rows[0]?.created_at
              ? new Date(rows[0].created_at).toLocaleDateString(
                lang === "ar" ? "ar" : "en-US"
              )
              : "—"}
          </div>
        </div>
      </div>

      {error ? <div className="alert alertDanger">{error.message}</div> : null}

      {/* التعديل الثاني: عرض قائمة الإشعارات كقائمة عمودية (فوق بعض) بدلاً من أعمدة متداخلة */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {rows.map((n) => {
          const title = (n.title ?? n.type ?? t("إشعار", "Notification")) as string;
          const body = (n.body ?? n.message ?? "") as string;
          const appId = n?.meta?.application_id || n?.meta?.applicationId;

          return (
            <div key={n.id} className="card notificationCard">
              <div className="cardRow">
                <div>
                  <div style={{ fontWeight: 700 }}>{title}</div>
                  <div className="smallMuted" style={{ marginTop: 6 }}>
                    {new Date(n.created_at).toLocaleString(
                      lang === "ar" ? "ar" : "en-US"
                    )}
                  </div>
                </div>
                {appId ? (
                  <Link href={`/applicant/applications/${appId}`} className="btn">
                    {t("عرض التقديم", "View application")}
                  </Link>
                ) : (
                  <span className="badge badge-muted">
                    {t("تحديث عام", "General update")}
                  </span>
                )}
              </div>
              <p style={{ marginTop: 14, marginBottom: 0, lineHeight: 1.9 }}>
                {body}
              </p>
            </div>
          );
        })}
      </div>

      {!error && rows.length === 0 ? (
        <div className="card">
          <div className="smallMuted">{t("لا توجد إشعارات بعد.", "No notifications yet.")}</div>
        </div>
      ) : null}
    </div>
  );
}