"use client";

import { useI18n } from "@/lib/i18n";

export function StatusBadge({ status }: { status?: string | null }) {
  const { t } = useI18n();
  const s = String(status ?? "").toLowerCase();

  const map: Record<string, { label: string; bg: string; fg: string }> = {
    uploaded: { label: t("تم الرفع", "Uploaded"), bg: "rgba(59,130,246,.12)", fg: "rgb(37,99,235)" },
    queued: { label: t("بالانتظار", "Queued"), bg: "rgba(245,158,11,.12)", fg: "rgb(217,119,6)" },
    processing: { label: t("قيد المعالجة", "Processing"), bg: "rgba(245,158,11,.12)", fg: "rgb(217,119,6)" },
    done: { label: t("مكتمل", "Done"), bg: "rgba(34,197,94,.12)", fg: "rgb(22,163,74)" },
    failed: { label: t("فشل", "Failed"), bg: "rgba(239,68,68,.12)", fg: "rgb(220,38,38)" },
    submitted: { label: t("تم التقديم", "Submitted"), bg: "rgba(59,130,246,.12)", fg: "rgb(37,99,235)" },
    analyzing: { label: t("جاري التحليل", "Analyzing"), bg: "rgba(245,158,11,.12)", fg: "rgb(217,119,6)" },
    analyzed: { label: t("تم التحليل", "Analyzed"), bg: "rgba(34,197,94,.12)", fg: "rgb(22,163,74)" },
    shortlisted: { label: t("قائمة مختصرة", "Shortlisted"), bg: "rgba(14,165,233,.14)", fg: "rgb(3,105,161)" },
    interview: { label: t("مقابلة", "Interview"), bg: "rgba(124,58,237,.12)", fg: "rgb(109,40,217)" },
    rejected: { label: t("مرفوض", "Rejected"), bg: "rgba(239,68,68,.12)", fg: "rgb(220,38,38)" },
    hired: { label: t("تم التوظيف", "Hired"), bg: "rgba(16,185,129,.12)", fg: "rgb(5,150,105)" },
    open: { label: t("مفتوحة", "Open"), bg: "rgba(34,197,94,.12)", fg: "rgb(22,163,74)" },
    closed: { label: t("مغلقة", "Closed"), bg: "rgba(107,114,128,.12)", fg: "rgb(75,85,99)" },
    hidden: { label: t("مخفية", "Hidden"), bg: "rgba(107,114,128,.12)", fg: "rgb(75,85,99)" },
    draft: { label: t("مسودة", "Draft"), bg: "rgba(15,23,42,.06)", fg: "rgb(51,65,85)" },
  };

  const fallbackLabel = status ? status : t("غير محدد", "Unknown");
  const v = map[s] ?? { label: fallbackLabel, bg: "rgba(107,114,128,.10)", fg: "rgb(75,85,99)" };

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "6px 10px",
        borderRadius: 999,
        fontWeight: 900,
        fontSize: 12,
        background: v.bg,
        color: v.fg,
        border: "1px solid rgba(0,0,0,.06)",
      }}
    >
      {v.label}
    </span>
  );
}
