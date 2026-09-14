"use client";

import { useI18n } from "@/lib/i18n";

export function StuffingBadge({ warnings }: { warnings: any }) {
  const { t } = useI18n();
  const suspected = Boolean(warnings?.is_suspected);
  if (!suspected) {
    return <span className="badge badge-success">{t("سليم", "Clean")}</span>;
  }

  const score = Number(warnings?.stuffing_score ?? 0);
  const penalty = Number(warnings?.penalty ?? 0);

  return (
    <span
      className="badge badge-danger"
      title={`stuffing_score=${score.toFixed(3)} penalty=${penalty.toFixed(3)}`}
      style={{ gap: 8 }}
    >
      <span>⚠</span>
      <span>{t("حشو كلمات", "Keyword stuffing")}</span>
      <span style={{ opacity: 0.8 }}>{Math.round(score * 100)}%</span>
    </span>
  );
}
