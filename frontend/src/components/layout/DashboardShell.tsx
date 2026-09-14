"use client";

import type { ReactNode } from "react";
import { SideNav, type NavSection } from "@/components/layout/SideNav";
import { TopNav } from "@/components/layout/TopNav";
import { useI18n } from "@/lib/i18n";

function Icon({ d }: { d: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d={d} stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

export function DashboardShell({ kind, children }: { kind: "applicant" | "evaluator"; children: ReactNode }) {
  const { t } = useI18n();

  const sections: NavSection[] =
    kind === "applicant"
      ? [
        {
          title: t("Applicant", "Applicant"),
          items: [
            { href: "/applicant/dashboard", label: t("نظرة عامة", "Overview"), icon: <Icon d="M4 10.5V6.5a2 2 0 0 1 2-2h4v6H4Zm0 3h6v6H6a2 2 0 0 1-2-2v-4Zm10-9h4a2 2 0 0 1 2 2v4h-6v-6Zm0 9h6v4a2 2 0 0 1-2 2h-4v-6Z" /> },
            { href: "/applicant/applications", label: t("طلباتي", "My applications"), icon: <Icon d="M8 7h8M8 12h8M8 17h5M6 3h12a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" /> },
            { href: "/applicant/notifications", label: t("الإشعارات", "Notifications"), icon: <Icon d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5m3 4a2 2 0 0 0 2-2h-4a2 2 0 0 0 2 2Z" /> },
            { href: "/applicant/profile", label: t("الملف الشخصي", "Profile"), icon: <Icon d="M20 21a7 7 0 0 0-16 0M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" /> },
          ],
        },
      ]
      : [
        {
          title: t("Recruiting", "Recruiting"),
          items: [
            { href: "/dashboard/jobs", label: t("الوظائف", "Jobs"), icon: <Icon d="M8 7h8M6 21h12a2 2 0 0 0 2-2V7a4 4 0 0 0-4-4h-8a4 4 0 0 0-4 4v12a2 2 0 0 0 2 2Z" /> },
            { href: "/dashboard/jobs/new", label: t("إنشاء وظيفة", "Create job"), icon: <Icon d="M12 5v14M5 12h14" /> },
            { href: "/dashboard/candidates", label: t("المرشحون", "Candidates"), icon: <Icon d="M20 21a7 7 0 0 0-16 0M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" /> },
            { href: "/dashboard/company", label: t("الشركة والفريق", "Company & team"), icon: <Icon d="M3 21h18M6 21V7a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v14M9 9h6M9 12h6M9 15h6" /> },
            { href: "/dashboard/onboarding", label: t("الإعداد الأولي", "Onboarding"), icon: <Icon d="M12 5v14M5 12h14" /> },
          ],
        },
      ];

  return (
    <div className="dash-shell">
      <SideNav
        brand={{
          title: "CV Platform",
          subtitle: kind === "applicant" ? t("Applicant intelligence workspace", "Applicant intelligence workspace") : t("Enterprise hiring intelligence", "Enterprise hiring intelligence"),
          href: kind === "applicant" ? "/applicant/dashboard" : "/dashboard/jobs",
        }}
        sections={sections}
      />
      <div className="dash-content">
        <TopNav kind={kind} />
        <div className="dash-main">
          <div className="dash-container">{children}</div>
        </div>
      </div>
    </div>
  );
}