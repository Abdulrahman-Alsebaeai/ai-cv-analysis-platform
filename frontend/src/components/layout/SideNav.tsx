"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useI18n } from "@/lib/i18n";

export type NavItem = {
  href: string;
  label: string;
  icon?: ReactNode;
};

export type NavSection = {
  title?: string;
  items: NavItem[];
};

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

export function SideNav({
  brand,
  sections,
}: {
  brand: { title: string; subtitle?: string; href?: string };
  sections: NavSection[];
}) {
  const pathname = usePathname() ?? "/";
  const { t } = useI18n();

  return (
    <aside className="dash-sidebar">
      <div className="dash-brand">
        <Link href={brand.href ?? "/"} className="dash-brandLink">
          <div className="dash-brandTitle">{brand.title}</div>
          {brand.subtitle ? <div className="dash-brandSubtitle">{brand.subtitle}</div> : null}
        </Link>
      </div>

      <nav className="dash-nav" aria-label={t("القائمة", "Navigation")}>
        {sections.map((sec, idx) => (
          <div key={idx} className="dash-navSection">
            {sec.title ? <div className="dash-navTitle">{sec.title}</div> : null}
            <div className="dash-navItems">
              {sec.items.map((it) => {
                const active = isActive(pathname, it.href);
                return (
                  <Link key={it.href} href={it.href} className={"dash-navItem" + (active ? " is-active" : "")} aria-current={active ? "page" : undefined}>
                    {it.icon ? <span className="dash-navIcon" aria-hidden>{it.icon}</span> : null}
                    <span className="dash-navLabel">{it.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="dash-sidebarFooter">
        <div className="dash-hint">
          {t(
            "منصة Hiring Intelligence مع واجهة ثنائية اللغة، تحليل قابل للتفسير، وتقارير جاهزة للتصدير.",
            "Hiring Intelligence platform with bilingual UI, explainable analysis, and export-ready reporting."
          )}
        </div>
      </div>
    </aside>
  );
}