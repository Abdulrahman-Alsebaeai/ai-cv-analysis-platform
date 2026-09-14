"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import LogoutButton from "@/components/common/LogoutButton";
import LanguageToggle from "@/components/common/LanguageToggle";
import { useI18n } from "@/lib/i18n";

function titleFromPath(kind: "applicant" | "evaluator", pathname: string, t: (ar: string, en: string) => string) {
  const p = pathname || "/";

  if (kind === "applicant") {
    if (p.includes("/applications/") && p !== "/applicant/applications") return t("تفاصيل التقديم", "Application details");
    if (p.startsWith("/applicant/dashboard")) return t("لوحة المتقدم", "Applicant dashboard");
    if (p.startsWith("/applicant/applications")) return t("طلباتي", "My applications");
    if (p.startsWith("/applicant/notifications")) return t("الإشعارات", "Notifications");
    if (p.startsWith("/applicant/profile")) return t("الملف الشخصي", "Profile");
    return t("مساحة المتقدم", "Applicant workspace");
  }

  if (p.includes("/requirements")) return t("المتطلبات والأوزان", "Requirements & weights");
  if (p.includes("/pipeline")) return t("مسار التوظيف", "Hiring pipeline");
  if (p.includes("/ranking") || p.includes("/candidate-resumes/")) return t("التحليل والترتيب", "Analysis & ranking");
  if (p.includes("/candidates/new")) return t("إضافة مرشح", "New candidate");
  if (p.includes("/candidates/")) return t("ملف المرشح", "Candidate profile");
  if (p.includes("/jobs/new")) return t("إنشاء وظيفة", "Create job");
  if (p.includes("/jobs/") && p.includes("/edit")) return t("تعديل الوظيفة", "Edit job");
  if (p.includes("/jobs/")) return t("تفاصيل الوظيفة", "Job details");
  if (p.startsWith("/dashboard/jobs")) return t("لوحة الوظائف", "Jobs dashboard");
  if (p.startsWith("/dashboard/candidates")) return t("المرشحون", "Candidates");
  if (p.startsWith("/dashboard/company")) return t("المنظمة والفريق", "Organization & team");
  if (p.startsWith("/dashboard/onboarding")) return t("الإعداد الأولي", "Onboarding");
  return t("لوحة التوظيف", "Recruiting dashboard");
}

function subtitleFromPath(kind: "applicant" | "evaluator", pathname: string, t: (ar: string, en: string) => string) {
  if (kind === "applicant") {
    return t("تابع تقديماتك، نتائجك، وملفك المهني من واجهة موحّدة.", "Track your applications, scores, and profile from one unified workspace.");
  }
  if (pathname.includes("/ranking")) return t("اعرض الترتيب، التحذيرات، والنتائج القابلة للتصدير بوضوح.", "Review ranking, warnings, and export-ready results in one place.");
  if (pathname.includes("/requirements")) return t("اضبط الأوزان والمتطلبات الأساسية قبل تشغيل الترتيب النهائي.", "Tune weights and must-have requirements before final ranking.");
  return t("تشغيل التوظيف، التحليل، وخطوات المراجعة من لوحة Enterprise واحدة.", "Run hiring operations, analysis, and review workflows from one Enterprise workspace.");
}

export function TopNav({ kind }: { kind: "applicant" | "evaluator" }) {
  const pathname = usePathname() ?? "/";
  const { t } = useI18n();
  const title = titleFromPath(kind, pathname, t);
  const subtitle = subtitleFromPath(kind, pathname, t);

  return (
    <header className="dash-topbar">
      <div className="dash-topbarInner">
        <div className="dash-topbarLeft">
          <div className="dash-titleWrap">
            <div className="dash-title">{title}</div>
            <div className="dash-subtitle">
              <Link href="/jobs" className="dash-link">{t("استعراض الوظائف العامة", "Browse public jobs")}</Link>
              <span className="dash-dot">•</span>
              <span className="dash-muted">{subtitle}</span>
            </div>
          </div>
        </div>

        <div className="dash-topbarRight">
          <div className="dash-search" role="search">
            <input className="dash-searchInput" placeholder={t("بحث سريع داخل الصفحة…", "Quick search in this page…")} aria-label={t("بحث", "Search")} />
          </div>
          <LanguageToggle />
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}