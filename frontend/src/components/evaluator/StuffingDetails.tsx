"use client";

import { useI18n } from "@/lib/i18n";

export function StuffingDetails({ warnings }: { warnings: any }) {
  const { t } = useI18n();

  if (!warnings) {
    return <div className="smallMuted">{t("لا توجد إشارات حشو مسجلة.", "No stuffing signals were recorded.")}</div>;
  }

  const suspected = Boolean(warnings.is_suspected);
  const reps = Array.isArray(warnings.repeated_terms) ? warnings.repeated_terms : [];
  const reasons = Array.isArray(warnings.reasons) ? warnings.reasons : [];

  return (
    <div className="grid" style={{ gap: 14 }}>
      <div className="grid statsGrid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
        <div className="kpiCard">
          <div className="kpiLabel">{t("الحالة", "Status")}</div>
          <div className="kpiValue" style={{ fontSize: 22, color: suspected ? "var(--danger)" : "var(--success)" }}>
            {suspected ? t("مشتبه", "Suspected") : t("منخفض", "Low risk")}
          </div>
        </div>
        <div className="kpiCard">
          <div className="kpiLabel">Stuffing score</div>
          <div className="kpiValue" style={{ fontSize: 22 }}>{Number(warnings.stuffing_score ?? 0).toFixed(3)}</div>
        </div>
        <div className="kpiCard">
          <div className="kpiLabel">Penalty</div>
          <div className="kpiValue" style={{ fontSize: 22 }}>{Number(warnings.penalty ?? 0).toFixed(3)}</div>
        </div>
        <div className="kpiCard">
          <div className="kpiLabel">Keyword density</div>
          <div className="kpiValue" style={{ fontSize: 22 }}>{Number(warnings.keyword_density ?? 0).toFixed(3)}</div>
        </div>
      </div>

      {reasons.length ? (
        <div className="card" style={{ background: "rgba(248,251,255,.72)", boxShadow: "none" }}>
          <div style={{ fontWeight: 950, marginBottom: 10 }}>{t("أسباب التحذير", "Warning reasons")}</div>
          <ul className="smallMuted" style={{ margin: 0, paddingInlineStart: 18, lineHeight: 1.9 }}>
            {reasons.map((reason: string, index: number) => (
              <li key={index}>{reason}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div>
        <div style={{ fontWeight: 950, marginBottom: 10 }}>{t("المصطلحات المتكررة", "Repeated terms")}</div>
        {reps.length ? (
          <div className="grid" style={{ gap: 10 }}>
            {reps.map((item: any, idx: number) => (
              <div key={`${item.term}-${idx}`} className="card" style={{ boxShadow: "none", padding: 16 }}>
                <div className="cardRow" style={{ alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontWeight: 950 }}>{item.term}</div>
                    <div className="smallMuted" style={{ marginTop: 4 }}>{t("تكرار مرتفع مقارنة بحجم السيرة.", "High repetition compared with the resume size.")}</div>
                  </div>
                  <span className="badge badge-warning">{t("مكرر", "Repeated")}</span>
                </div>
                <div className="info-strip" style={{ marginTop: 14 }}>
                  <div className="info-pill"><div className="smallMuted">{t("العدد", "Count")}</div><div style={{ fontWeight: 950, marginTop: 6 }}>{item.count}</div></div>
                  <div className="info-pill"><div className="smallMuted">Density / 1000</div><div style={{ fontWeight: 950, marginTop: 6 }}>{item.density_per_1000}</div></div>
                  <div className="info-pill"><div className="smallMuted">Context hits</div><div style={{ fontWeight: 950, marginTop: 6 }}>{item.context_hits}</div></div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="smallMuted">{t("لا توجد مصطلحات متكررة بشكل لافت.", "No notable repeated terms were found.")}</div>
        )}
      </div>
    </div>
  );
}
