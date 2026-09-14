"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n";

export function LandingPage() {
  const { t } = useI18n();

  const stats = [
    { label: t("سيرة ذاتية محللة", "Analyzed resumes"), value: "48K+" },
    { label: t("تسريع الفرز الأولي", "Faster screening"), value: "73%" },
    { label: t("دقة الترتيب", "Ranking accuracy"), value: "91%" },
    { label: t("شركات نشطة", "Active companies"), value: "120+" },
  ];

  const features = [
    {
      title: t("ترتيب ذكي قابل للتفسير", "Explainable smart ranking"),
      desc: t("فسّر النتيجة بلغة واضحة بدل الأرقام الجامدة عبر تحليل الدلالات العميقة.", "Explain results in clear language instead of raw numbers using deep semantic analysis."),
      icon: "🧠"
    },
    {
      title: t("مطابقة دقيقة للمتطلبات", "Precise requirement matching"),
      desc: t("راقب الـ must-have والمطابقات الناقصة والأدلة المستخرجة من السيرة بدقة.", "Track must-haves, missing matches, and evidence extracted from the resume with precision."),
      icon: "🎯"
    },
    {
      title: t("كشف الحشو والتكرار", "Stuffing detection"),
      desc: t("ميّز السير التي تعتمد على التلاعب بالكلمات المفتاحية قبل وصولها للقائمة القصيرة.", "Flag resumes that manipulate keywords before they reach your shortlist."),
      icon: "🛡️"
    },
    {
      title: t("تقارير وصادرات جاهزة", "Ready-made reports"),
      desc: t("صدّر CSV وPDF وأنشئ snapshots موثقة لنتائج الفرز والمقارنات بلمحة.", "Export CSV and PDF and create documented snapshots of screening results instantly."),
      icon: "📊"
    },
  ];

  return (
    <div style={{ overflowX: "hidden", backgroundColor: "#fff" }}>

      {/* --- HERO SECTION: THE KILLER PART --- */}
      <section style={{
        position: "relative",
        padding: "100px 0 60px",
        background: "radial-gradient(circle at 50% -20%, rgba(40, 89, 255, 0.15), transparent 50%)"
      }}>
        <div className="dash-container">
          <div style={{ display: "flex", flexWrap: "wrap", gap: "60px", alignItems: "center" }}>

            {/* Left Content */}
            <div style={{ flex: "1 1 500px", zIndex: 10 }}>

              <h1 style={{
                fontSize: "clamp(40px, 5vw, 72px)",
                fontWeight: 800,
                lineHeight: 1.05,
                letterSpacing: "-0.04em",
                color: "#0f172a",
                marginBottom: "24px"
              }}>
                {t("وظّف بذكاء،", "Hire smarter,")} <br />
                <span style={{ color: "var(--primary)", background: "linear-gradient(to right, var(--primary), #00a8ff)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                  {t("بوضوح مطلق.", "with absolute clarity.")}
                </span>
              </h1>
              <p className="hero-copy" style={{ fontSize: "20px", lineHeight: 1.6, color: "#475569", marginBottom: "40px", maxWidth: "550px" }}>
                {t(
                  "تجمع المنصة بين قوة التحليل الدلالي ووضوح التفسير البشري. انشر الوظائف، وافهم فوراً لماذا صعد مرشح وتراجع آخر.",
                  "Combining semantic intelligence with human-readable explanations. Post jobs and instantly understand why candidates rank the way they do."
                )}
              </p>

              <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
                <Link href="/auth/register" className="btn btnPrimary" style={{ height: "56px", padding: "0 32px", fontSize: "18px", borderRadius: "16px" }}>
                  {t("ابدأ الآن مجاناً", "Get started for free")}
                </Link>
                <Link href="/jobs" className="btn btnSoft" style={{ height: "56px", padding: "0 32px", fontSize: "18px", borderRadius: "16px" }}>
                  {t("تصفح الوظائف", "Browse jobs")}
                </Link>
              </div>

              <div style={{ marginTop: "48px", display: "flex", gap: "24px", opacity: 0.6, filter: "grayscale(1)" }}>
                {/* هنا يمكن وضع لوجوهات لشركات وهمية أو حقيقية */}
                <div style={{ fontWeight: 800, fontSize: "18px" }}>ENTERPRISE</div>
                <div style={{ fontWeight: 800, fontSize: "18px" }}>GLOBAL TECH</div>
                <div style={{ fontWeight: 800, fontSize: "18px" }}>SAAS PRO</div>
              </div>
            </div>

            {/* Right Visual: THE "KHALI" PART (Floating Dashboard) */}
            <div style={{ flex: "1 1 500px", position: "relative" }}>

              {/* Floating Element 1: Analysis Score */}
              <div style={{
                position: "absolute",
                top: "-20px",
                left: "-30px",
                zIndex: 20,
                background: "rgba(255, 255, 255, 0.9)",
                backdropFilter: "blur(20px)",
                padding: "20px",
                borderRadius: "24px",
                boxShadow: "0 20px 50px rgba(0,0,0,0.1)",
                border: "1px solid rgba(255,255,255,0.4)",
                width: "200px"
              }}>
                <div className="smallMuted" style={{ fontSize: "12px" }}>{t("درجة المطابقة", "Match Score")}</div>
                <div style={{ fontSize: "32px", fontWeight: 800, color: "var(--primary)", marginTop: "8px" }}>94.8%</div>
                <div style={{ width: "100%", height: "6px", background: "#f1f5f9", borderRadius: "10px", marginTop: "12px", overflow: "hidden" }}>
                  <div style={{ width: "94.8%", height: "100%", background: "var(--primary)" }} />
                </div>
              </div>

              {/* Floating Element 2: AI Insights */}
              <div style={{
                position: "absolute",
                bottom: "40px",
                right: "-20px",
                zIndex: 20,
                background: "#0f172a",
                padding: "20px",
                borderRadius: "24px",
                boxShadow: "0 20px 50px rgba(0,0,0,0.3)",
                color: "#fff",
                width: "240px"
              }}>
                <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "12px" }}>
                  <span style={{ fontSize: "18px" }}>✨</span>
                  <span style={{ fontSize: "13px", fontWeight: 600 }}>AI Insight</span>
                </div>
                <div style={{ fontSize: "14px", lineHeight: 1.5, opacity: 0.9 }}>
                  {t("المرشح يمتلك خبرة قوية في Node.js تتجاوز 5 سنوات.", "Candidate has strong Node.js experience exceeding 5 years.")}
                </div>
              </div>

              {/* Main Visual Image */}
              <div style={{
                borderRadius: "40px",
                overflow: "hidden",
                boxShadow: "0 40px 80px rgba(0,0,0,0.15)",
                transform: "perspective(1000px) rotateY(-5deg) rotateX(5deg)",
                border: "1px solid rgba(0,0,0,0.05)"
              }}>
                <img
                  src="https://images.unsplash.com/photo-1551434678-e076c223a692?auto=format&fit=crop&w=1200&q=80"
                  alt="Dashboard Preview"
                  style={{ width: "100%", height: "100%", display: "block", objectFit: "cover" }}
                />
              </div>

              {/* Background Glow */}
              <div style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                width: "120%",
                height: "120%",
                background: "radial-gradient(circle, rgba(40, 89, 255, 0.12), transparent 70%)",
                zIndex: -1
              }} />
            </div>

          </div>
        </div>
      </section>

      {/* --- STATS SECTION --- */}
      <section className="section" style={{ borderTop: "1px solid #f1f5f9" }}>
        <div className="dash-container">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "24px" }}>
            {stats.map((s) => (
              <div key={s.label} className="card" style={{ textAlign: "center", padding: "32px", border: "none", background: "#f8fbff" }}>
                <div style={{ fontSize: "40px", fontWeight: 800, color: "#0f172a", marginBottom: "8px" }}>{s.value}</div>
                <div className="smallMuted" style={{ fontWeight: 600 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --- FEATURES SECTION --- */}
      <section className="section dash-container" id="features">
        <div style={{ textAlign: "center", marginBottom: "60px" }}>
          <div className="eyebrow" style={{ color: "var(--primary)", background: "rgba(40,89,255,0.08)", marginBottom: "16px" }}>{t("لماذا نحن؟", "Why CV Platform?")}</div>
          <h2 className="section-title" style={{ fontSize: "40px" }}>{t("ذكاء اصطناعي يثق فيه الجميع", "AI your team can actually trust")}</h2>
        </div>

        <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "32px" }}>
          {features.map((f) => (
            <div key={f.title} className="card" style={{ padding: "40px", transition: "all 0.3s ease", cursor: "default" }}>
              <div style={{ fontSize: "48px", marginBottom: "24px" }}>{f.icon}</div>
              <h3 style={{ fontSize: "22px", fontWeight: 800, marginBottom: "16px", color: "#0f172a" }}>{f.title}</h3>
              <p style={{ color: "#64748b", lineHeight: 1.8, fontSize: "16px" }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* --- CTA SECTION: THE GRAND FINALE --- */}
      <section className="section dash-container" style={{ marginBottom: "80px" }}>
        <div style={{
          background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
          borderRadius: "40px",
          padding: "80px 40px",
          textAlign: "center",
          position: "relative",
          overflow: "hidden"
        }}>
          {/* Decorative light blur */}
          <div style={{ position: "absolute", top: "-50%", left: "-20%", width: "500px", height: "500px", background: "rgba(40, 89, 255, 0.15)", filter: "blur(100px)", borderRadius: "50%" }} />

          <div style={{ position: "relative", zIndex: 10 }}>
            <h2 style={{ color: "#fff", fontSize: "clamp(32px, 4vw, 48px)", fontWeight: 800, marginBottom: "24px", letterSpacing: "-1px" }}>
              {t("هل أنت جاهز لتغيير طريقة توظيفك؟", "Ready to transform your hiring process?")}
            </h2>
            <p style={{ color: "#94a3b8", fontSize: "20px", marginBottom: "40px", maxWidth: "700px", marginInline: "auto" }}>
              {t("انضم إلى مئات الشركات التي تتخذ قرارات توظيف أسرع وأكثر دقة اليوم.", "Join hundreds of companies making faster, more accurate hiring decisions today.")}
            </p>
            <div style={{ display: "flex", gap: "16px", justifyContent: "center", flexWrap: "wrap" }}>
              <Link href="/auth/register" className="btn btnPrimary" style={{ height: "60px", padding: "0 40px", fontSize: "18px", borderRadius: "16px", boxShadow: "0 10px 30px rgba(40, 89, 255, 0.4)" }}>
                {t("ابدأ رحلتك الآن", "Start your journey")}
              </Link>
              <Link href="/auth/login" className="btn btnGhost" style={{ height: "60px", padding: "0 40px", fontSize: "18px", color: "#fff", border: "1px solid rgba(255,255,255,0.1)" }}>
                {t("تسجيل الدخول", "Sign in")}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer Copyright */}
      <footer style={{ padding: "40px 0", borderTop: "1px solid #f1f5f9", textAlign: "center" }}>
        <p className="smallMuted">© 2026 CV Platform. {t("جميع الحقوق محفوظة.", "All rights reserved.")}</p>
      </footer>

    </div>
  );
}

export default LandingPage;