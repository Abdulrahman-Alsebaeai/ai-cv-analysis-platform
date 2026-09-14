"use client";

import { useI18n } from "@/lib/i18n";

function pct(n: number) {
  return `${Math.max(0, Math.min(100, Math.round(n * 100)))}%`;
}

export function ScoreBreakdown({ breakdown }: { breakdown: any | null }) {
  const { t } = useI18n();

  if (!breakdown) {
    return (
      <div className="card" style={{ padding: 18 }}>
        <div style={{ fontWeight: 950 }}>{t("لا توجد نتيجة تحليل بعد.", "No analysis result yet.")}</div>
        <div className="smallMuted" style={{ marginTop: 8 }}>
          {t("ستظهر درجة المطابقة والتفسير بعد تشغيل التحليل لهذا الملف.", "The fit score and explanation will appear after the analysis runs for this file.")}
        </div>
      </div>
    );
  }

  const sim = Number(breakdown.similarity ?? breakdown.semantic_similarity ?? 0);
  const distance = Number(breakdown.distance ?? 0);
  const vectorSim = Number(breakdown.vector_similarity ?? breakdown.similarity ?? 0);
  const localDomain = breakdown.local_domain_match || {};
  const localScore = Number(localDomain.score ?? 0);
  const exactRole = Boolean(localDomain.exact_role_match);
  const req = breakdown.requirements || {};
  const reqScore = Number(req.requirements_score ?? 0);
  const reqRaw = Number(req.requirements_score_raw ?? 0);
  const multiplier = Number(req.must_have_multiplier ?? 1);
  const yearsEst = Number(req.years_est ?? req.years_estimate ?? 0);
  const requiredYears = req.required_years ?? "—";
  const missingMust = Array.isArray(req.missing_must_have || req.missingMustHave) ? (req.missing_must_have || req.missingMustHave) : [];
  const matched = Array.isArray(req.matched) ? req.matched : [];
  const details = Array.isArray(req.details) ? req.details : [];

  return (
    <div className="grid" style={{ gap: 16 }}>
      <div className="grid statsGrid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
        <div className="kpiCard"><div className="kpiLabel">{t("التشابه الدلالي", "Semantic similarity")}</div><div className="kpiValue" style={{ fontSize: 26 }}>{pct(sim)}</div><div className="smallMuted">Vector {pct(vectorSim)} • Local {pct(localScore)} • D {distance.toFixed(3)}</div></div>
        <div className="kpiCard"><div className="kpiLabel">{t("درجة المتطلبات", "Requirements score")}</div><div className="kpiValue" style={{ fontSize: 26 }}>{pct(reqScore)}</div><div className="smallMuted">Raw {reqRaw.toFixed(3)}</div></div>
        <div className="kpiCard"><div className="kpiLabel">{t("المتطلبات الأساسية", "Must-have multiplier")}</div><div className="kpiValue" style={{ fontSize: 26 }}>{multiplier.toFixed(2)}x</div><div className="smallMuted">{t("غير المتوفرة", "Missing")}: {missingMust.length}</div></div>
        <div className="kpiCard"><div className="kpiLabel">{t("الخبرة المقدرة", "Estimated experience")}</div><div className="kpiValue" style={{ fontSize: 26 }}>{yearsEst.toFixed(1)}</div><div className="smallMuted">{t("المطلوب", "Required")}: {requiredYears}</div></div>
      </div>

      {localScore > 0 ? (
        <div className="card" style={{ boxShadow: "none", background: exactRole ? "rgba(34,197,94,.07)" : "rgba(40,89,255,.06)" }}>
          <div style={{ fontWeight: 950, marginBottom: 8 }}>{t("مطابقة المجال والمسمى", "Domain and role match")}</div>
          <div className="smallMuted" style={{ lineHeight: 1.9 }}>
            {t("درجة التحقق المحلي", "Local validation score")}: <b>{pct(localScore)}</b>
            {exactRole ? <> • {t("تم العثور على نفس المسمى المهني", "Exact professional role detected")}</> : null}
            {Array.isArray(localDomain.job_terms) && localDomain.job_terms.length ? <> • Job: {localDomain.job_terms.slice(0, 5).join(", ")}</> : null}
            {Array.isArray(localDomain.resume_terms) && localDomain.resume_terms.length ? <> • CV: {localDomain.resume_terms.slice(0, 5).join(", ")}</> : null}
          </div>
        </div>
      ) : null}

      {breakdown.explanation ? (
        <div className="card" style={{ boxShadow: "none", background: "rgba(248,251,255,.78)" }}>
          <div style={{ fontWeight: 950, marginBottom: 8 }}>{t("ملخص التفسير", "Explanation summary")}</div>
          <div className="smallMuted" style={{ lineHeight: 1.9 }}>{String(breakdown.explanation)}</div>
        </div>
      ) : null}

      <div className="grid" style={{ gridTemplateColumns: "1.2fr 1fr", gap: 16 }}>
        <div className="card" style={{ boxShadow: "none" }}>
          <div style={{ fontWeight: 950, marginBottom: 10 }}>{t("أعلى العناصر المطابقة", "Top matched requirements")}</div>
          {matched.length ? (
            <div className="grid" style={{ gap: 10 }}>
              {matched.slice(0, 8).map((item: any, index: number) => (
                <div key={index} className="card" style={{ boxShadow: "none", padding: 14, background: "rgba(34,197,94,.06)", borderColor: "rgba(34,197,94,.16)" }}>
                  <div className="cardRow">
                    <div style={{ fontWeight: 900 }}>{item.req_value}</div>
                    <span className="badge badge-success">{item.req_type}</span>
                  </div>
                  <div className="smallMuted" style={{ marginTop: 6 }}>{t("نسبة الاكتساب", "Earned")}: {Number(item.earned ?? 0).toFixed(1)} • {t("الوزن", "Weight")}: {Number(item.weight ?? 0).toFixed(2)}</div>
                </div>
              ))}
            </div>
          ) : <div className="smallMuted">{t("لا توجد عناصر مطابقة بارزة بعد.", "No strong matched items yet.")}</div>}
        </div>

        <div className="card" style={{ boxShadow: "none" }}>
          <div style={{ fontWeight: 950, marginBottom: 10 }}>{t("المتطلبات الأساسية الناقصة", "Missing must-have requirements")}</div>
          {missingMust.length ? (
            <div className="grid" style={{ gap: 10 }}>
              {missingMust.map((item: any, index: number) => (
                <div key={index} className="card" style={{ boxShadow: "none", padding: 14, background: "rgba(239,68,68,.05)", borderColor: "rgba(239,68,68,.16)" }}>
                  <div className="cardRow">
                    <div style={{ fontWeight: 900 }}>{item.req_value}</div>
                    <span className="badge badge-danger">{item.req_type}</span>
                  </div>
                  <div className="smallMuted" style={{ marginTop: 6 }}>{t("السبب", "Reason")}: {item.reason ?? t("غير متوفر", "Not satisfied")}</div>
                </div>
              ))}
            </div>
          ) : <div className="smallMuted">{t("لا توجد عناصر must-have مفقودة.", "No must-have items are missing.")}</div>}
        </div>
      </div>

      <div className="card" style={{ boxShadow: "none" }}>
        <div style={{ fontWeight: 950, marginBottom: 10 }}>{t("تفصيل جميع المتطلبات", "All requirements breakdown")}</div>
        {details.length ? (
          <div className="grid" style={{ gap: 10 }}>
            {details.map((item: any, index: number) => {
              const matched = Boolean(item.matched);
              const evidence = item.evidence || {};
              return (
                <details key={index} className="card" open={index < 3} style={{ boxShadow: "none", padding: 14, background: matched ? "rgba(34,197,94,.04)" : "rgba(15,23,42,.02)" }}>
                  <summary style={{ cursor: "pointer", listStyle: "none" }}>
                    <div className="cardRow">
                      <div style={{ fontWeight: 900 }}>
                        {matched ? "✅" : "•"} {item.req_value}
                        {item.must_have ? <span className="badge badge-danger" style={{ marginInlineStart: 8 }}>{t("أساسي", "Must-have")}</span> : null}
                      </div>
                      <div className="smallMuted">{item.req_type} • {pct(Number(item.match_score ?? 0))}</div>
                    </div>
                  </summary>
                  <div className="smallMuted" style={{ marginTop: 10, lineHeight: 1.9 }}>
                    <div>{t("الوزن", "Weight")}: <b>{Number(item.weight ?? 0).toFixed(2)}</b> • {t("النسبة", "Percent")}: <b>{Number(item.percent ?? 0).toFixed(1)}</b> • {t("المكتسب", "Earned")}: <b>{Number(item.earned ?? 0).toFixed(1)}</b></div>
                    <div>{t("السبب", "Reason")}: {item.reason ?? "—"}</div>
                  </div>
                  {evidence?.snippet ? (
                    <div className="card" style={{ marginTop: 12, boxShadow: "none", background: "rgba(255,255,255,.84)", borderStyle: "dashed" }}>
                      <div className="smallMuted" style={{ marginBottom: 6 }}>
                        {t("الدليل", "Evidence")} • {evidence.method ?? "—"}
                        {evidence.reranker_score != null ? ` • rerank ${Number(evidence.reranker_score).toFixed(3)}` : ""}
                        {evidence.embedding_score != null ? ` • emb ${Number(evidence.embedding_score).toFixed(3)}` : ""}
                      </div>
                      <div style={{ lineHeight: 1.9, whiteSpace: "pre-wrap" }}>{String(evidence.snippet)}</div>
                    </div>
                  ) : null}
                </details>
              );
            })}
          </div>
        ) : <div className="smallMuted">{t("لا توجد تفاصيل إضافية بعد.", "No additional requirement details yet.")}</div>}
      </div>
    </div>
  );
}
