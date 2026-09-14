import { createServerSupabase } from "@/lib/supabaseServer";
import { createAdminSupabase } from "@/lib/supabaseAdmin";
import ApplyButton from "@/components/jobs/ApplyButton";
import { getServerLang, tFromLang } from "@/lib/server-lang";

export const dynamic = "force-dynamic";

export async function JobDetailsPage({ params }: { params: { id: string } | Promise<{ id: string }> }) {
  const lang = await getServerLang();
  const t = (ar: string, en: string) => tFromLang(lang, ar, en);
  const { id } = await params;
  const supabase = process.env.SUPABASE_SERVICE_ROLE_KEY ? createAdminSupabase() : await createServerSupabase();

  const { data: job, error } = await supabase
    .from("jobs")
    .select("id,title,description,location,is_remote,employment_type,status")
    .eq("id", id)
    .maybeSingle();

  if (error || !job) {
    return (
      <div className="card" style={{ marginTop: 12 }}>
        <h1 style={{ marginTop: 0 }}>{t("الوظيفة غير موجودة", "Job not found")}</h1>
        <p className="smallMuted" style={{ marginBottom: 0 }}>
          {t("قد تكون الوظيفة غير موجودة أو أن الوصول العام لها غير متاح حاليًا.", "This job may not exist or public access may not be available right now.")}
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="dashboard-hero">
        <div className="card">
          <div className="eyebrow">{t("تفاصيل الوظيفة", "Job details")}</div>
          <h1 className="pageTitle" style={{ marginTop: 12 }}>{job.title}</h1>
          <div className="jobMeta" style={{ marginTop: 12 }}>
            <span className="badge badge-info">{job.is_remote ? t("عن بُعد", "Remote") : t("حضوري", "On-site")}</span>
            <span className="badge badge-muted">{job.employment_type ?? t("غير محدد", "Not specified")}</span>
            <span className="badge badge-muted">{job.location ?? t("بدون موقع", "No location")}</span>
          </div>
          <p className="smallMuted" style={{ marginTop: 16 }}>
            {t("راجع الوصف بعناية ثم قدّم عندما تكون مستعدًا. الواجهة الآن تدعم العربية والإنجليزية بشكل متماسك حتى داخل الصفحات العامة.", "Review the description carefully, then apply when you are ready. The interface now supports Arabic and English consistently across public pages.")}
          </p>
          <div className="actionsRow">
            <ApplyButton jobId={job.id} />
          </div>
        </div>

        <div className="dashboard-banner">
          <img src="https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1200&q=80" alt={t("مقابلة عمل", "Job interview scene")} />
          <div className="dashboard-bannerContent">
            <div className="eyebrow" style={{ background: "rgba(255,255,255,.14)", color: "#fff", borderColor: "rgba(255,255,255,.18)" }}>{t("فرصة مهنية", "Career opportunity")}</div>
            <div style={{ fontWeight: 700, fontSize: 22, marginTop: 10 }}>{t("كل التفاصيل في بطاقة واحدة واضحة", "Everything you need in one clear view")}</div>
          </div>
        </div>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>{t("وصف الوظيفة", "Job description")}</h2>
        <p style={{ whiteSpace: "pre-wrap", lineHeight: 1.9, marginBottom: 0 }}>
          {job.description ?? ""}
        </p>
      </div>
    </div>
  );
}