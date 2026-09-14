import Link from "next/link";
import { createServerSupabase } from "@/lib/supabaseServer";
import { createAdminSupabase } from "@/lib/supabaseAdmin";
import { getServerLang, tFromLang } from "@/lib/server-lang";

export const dynamic = "force-dynamic";

function normalizeErrorMessage(message?: string | null, t?: (ar: string, en: string) => string) {
    const msg = String(message ?? "").trim();
    if (!msg) return t("تعذر جلب الوظائف حاليًا.", "Could not fetch jobs right now.");
    if (/<!DOCTYPE html>/i.test(msg) || /<html/i.test(msg) || /Web server is down/i.test(msg) || /Error code 521/i.test(msg)) {
        return t("خدمة قاعدة البيانات غير متاحة حاليًا. حاول مرة أخرى بعد قليل.", "The database service is currently unavailable. Please try again in a moment.");
    }
    return msg;
}

export async function JobsPage() {
    const lang = await getServerLang();
    const t = (ar: string, en: string) => tFromLang(lang, ar, en);
    const locale = lang === "ar" ? "ar" : "en-US";

    const supabase = process.env.SUPABASE_SERVICE_ROLE_KEY ? createAdminSupabase() : await createServerSupabase();

    const { data: jobs, error } = await supabase
        .from("jobs")
        .select("id,title,location,is_remote,employment_type,created_at,status,description")
        .eq("status", "open")
        .order("created_at", { ascending: false });

    const friendlyError = normalizeErrorMessage(error?.message, t);

    return (
        <section className="section dash-container">
            <div className="dashboard-hero">
                <div className="card">
                    <div className="eyebrow">{t("وظائف عامة", "Open jobs")}</div>
                    <h1 className="pageTitle" style={{ marginTop: 12 }}>{t("استكشف الفرص المتاحة قبل تسجيل الدخول", "Explore available opportunities before signing in")}</h1>
                    <p className="smallMuted">
                        {t(
                            "تصفح الوظائف المنشورة، افهم تفاصيل كل دور، ثم سجّل الدخول فقط عندما تكون مستعدًا للتقديم أو متابعة طلباتك.",
                            "Browse published roles, understand the details of each opportunity, and sign in only when you are ready to apply or track your applications."
                        )}
                    </p>
                    <div className="actionsRow">
                        <Link href="/auth/register" className="btn btnPrimary">{t("أنشئ حسابًا", "Create account")}</Link>
                        <Link href="/auth/login" className="btn">{t("دخول", "Log in")}</Link>
                    </div>
                </div>
                <div className="dashboard-banner">
                    <img src="https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=1200&q=80" alt={t("فريق يناقش فرص العمل", "Team discussing job opportunities")} />
                    <div className="dashboard-bannerContent">
                        <div className="eyebrow" style={{ background: "rgba(255,255,255,.14)", color: "#fff", borderColor: "rgba(255,255,255,.18)" }}>{t("اكتشف الوظائف", "Discover jobs")}</div>
                        <div style={{ fontWeight: 700, fontSize: 24, marginTop: 8 }}>{t("صفحات أوضح، صور معبّرة، وتجربة أكثر احترافية", "Clearer pages, expressive imagery, and a more premium experience")}</div>
                    </div>
                </div>
            </div>

            {error ? (
                <div className="card">
                    <div className="alert alertDanger">{friendlyError}</div>
                </div>
            ) : null}

            <div className="grid">
                {(jobs ?? []).map((job: any) => (
                    <article className="card jobCard" key={job.id}>
                        <div className="jobCardTop">
                            <div className="jobCardTitleRow">
                                <div className="jobTitle">{job.title}</div>
                                <div className="jobMeta">
                                    <span className="badge badge-info">{job.is_remote ? t("عن بُعد", "Remote") : t("حضوري", "On-site")}</span>
                                    <span className="badge badge-muted">{job.employment_type ?? t("غير محدد", "Not specified")}</span>
                                    {job.location ? <span className="badge badge-muted">{job.location}</span> : null}
                                </div>
                            </div>
                        </div>

                        <p className="smallMuted" style={{ marginTop: 14, marginBottom: 0 }}>
                            {String(job.description ?? "").slice(0, 190) || t("وصف الدور غير متاح حاليًا.", "The role description is not available right now.")}
                            {String(job.description ?? "").length > 190 ? "…" : ""}
                        </p>

                        <div className="cardRow" style={{ marginTop: 18 }}>
                            <div className="smallMuted">
                                {t("آخر تحديث", "Updated")} : {new Date(job.created_at).toLocaleDateString(locale)}
                            </div>
                            <Link href={`/jobs/${job.id}`} className="btn btnPrimary">{t("عرض التفاصيل", "View details")}</Link>
                        </div>
                    </article>
                ))}
            </div>
        </section>
    );
}

export default JobsPage;