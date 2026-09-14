"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { StuffingBadge } from "./StuffingBadge";
import { useI18n } from "@/lib/i18n";

function pickTopSkills(breakdown: any): string[] {
  const req = breakdown?.requirements;
  const details = req?.details ?? req?.matched ?? [];
  return (details as any[])
    .filter((d) => String(d?.req_type ?? "").toLowerCase() === "skill")
    .sort((a, b) => Number(b?.earned ?? 0) - Number(a?.earned ?? 0))
    .map((d) => String(d?.req_value ?? ""))
    .filter(Boolean)
    .slice(0, 4);
}

function hasMustHaveMissing(breakdown: any): boolean {
  const req = breakdown?.requirements;
  const missingMust = req?.missing_must_have ?? req?.missingMustHave ?? [];
  if (Array.isArray(missingMust) && missingMust.length > 0) return true;
  const missing = req?.missing ?? [];
  return (missing as any[]).some((m) => Boolean(m?.must_have));
}

function percent(score: number): string {
  if (!Number.isFinite(score) || score <= 0) return "—";
  return `${Math.round(Math.max(0, Math.min(100, score * 100)))}%`;
}

export function CandidateRankingTable({ rows }: { rows: any[] }) {
  const { t } = useI18n();
  const [q, setQ] = useState("");
  const [minScore, setMinScore] = useState<number>(0);
  const [onlyDone, setOnlyDone] = useState(true);

  const normalized = useMemo(() => {
    return (rows ?? []).map((r) => {
      const scoreRow = Array.isArray(r.candidate_scores) ? r.candidate_scores?.[0] : r.candidate_scores;
      const finalScore = Number(scoreRow?.final_score ?? 0);
      const rawScore = scoreRow?.raw_score ?? null;
      const penalty = scoreRow?.penalty ?? null;
      const warnings = scoreRow?.warnings ?? scoreRow?.breakdown?.warnings ?? null;
      const breakdown = scoreRow?.breakdown ?? null;
      const cand = Array.isArray(r.candidates) ? r.candidates?.[0] : r.candidates;
      const name = String(cand?.full_name ?? t("مرشح", "Candidate"));
      return {
        ...r,
        finalScore,
        rawScore,
        penalty,
        warnings,
        name,
        warningMust: breakdown ? hasMustHaveMissing(breakdown) : false,
        stuffing: Boolean(warnings?.is_suspected),
        topSkills: breakdown ? pickTopSkills(breakdown) : [],
        breakdown,
      };
    });
  }, [rows, t]);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return normalized
      .filter((r) => (onlyDone ? (String(r.status || "").toLowerCase().includes("done") || String(r.status || "").toLowerCase().includes("analyzed")) : true))
      .filter((r) => r.finalScore >= minScore)
      .filter((r) => (qq ? (r.name.toLowerCase().includes(qq) || String(r.file_name).toLowerCase().includes(qq)) : true))
      .sort((a, b) => b.finalScore - a.finalScore);
  }, [normalized, q, minScore, onlyDone]);

  const summary = useMemo(() => {
    const analyzed = filtered.filter((r) => r.finalScore > 0).length;
    const avg = analyzed ? filtered.reduce((sum, r) => sum + r.finalScore, 0) / analyzed : 0;
    const suspicious = filtered.filter((r) => r.stuffing).length;
    const mustIssues = filtered.filter((r) => r.warningMust).length;
    return { analyzed, avg, suspicious, mustIssues };
  }, [filtered]);

  return (
    <div className="grid" style={{ gap: 16 }}>
      <div className="grid statsGrid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
        <div className="kpiCard"><div className="kpiLabel">{t("إجمالي المرشحين", "Total candidates")}</div><div className="kpiValue">{filtered.length}</div></div>
        <div className="kpiCard"><div className="kpiLabel">{t("المحللون", "Analyzed")}</div><div className="kpiValue">{summary.analyzed}</div></div>
        <div className="kpiCard"><div className="kpiLabel">{t("متوسط الدرجة", "Average score")}</div><div className="kpiValue">{percent(summary.avg)}</div></div>
        <div className="kpiCard"><div className="kpiLabel">{t("سير مشبوهة", "Suspicious resumes")}</div><div className="kpiValue">{summary.suspicious}</div></div>
        <div className="kpiCard"><div className="kpiLabel">{t("مخالفات must-have", "Must-have issues")}</div><div className="kpiValue">{summary.mustIssues}</div></div>
      </div>

      <div className="card" style={{ padding: 16 }}>
        <div className="filterBar">
          <div className="filterGroup">
            <span className="badge badge-muted">{t("فلاتر", "Filters")}</span>
            <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("ابحث بالاسم أو الملف", "Search by candidate or file")} style={{ minWidth: 260 }} />
            <input className="input" type="number" value={minScore} onChange={(e) => setMinScore(Number(e.target.value || 0))} min={0} max={1} step={0.01} placeholder={t("الحد الأدنى للدرجة", "Minimum score")} style={{ width: 160 }} />
            <label className="smallMuted" style={{ display: "inline-flex", alignItems: "center", gap: 8, fontWeight: 800 }}>
              <input type="checkbox" checked={onlyDone} onChange={(e) => setOnlyDone(e.target.checked)} />
              {t("عرض الملفات المحللة فقط", "Analyzed only")}
            </label>
          </div>
          <div className="smallMuted">{t("النتائج", "Results")}: {filtered.length}</div>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div className="tableWrap">
          <table className="dataTable">
            <thead>
              <tr>
                <th>{t("المرشح", "Candidate")}</th>
                <th>{t("الدرجة النهائية", "Final score")}</th>
                <th>{t("نسبة القبول", "Acceptance")}</th>
                <th>{t("الحالة", "Status")}</th>
                <th>{t("التحذيرات", "Warnings")}</th>
                <th>{t("أبرز المهارات", "Top skills")}</th>
                <th>{t("إجراء", "Action")}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id}>
                  <td>
                    <div style={{ fontWeight: 950 }}>{r.name}</div>
                    <div className="smallMuted" style={{ marginTop: 4 }}>{r.file_name}</div>
                    <div className="smallMuted" style={{ marginTop: 6 }}>
                      Raw <b>{r.rawScore != null ? Number(r.rawScore).toFixed(3) : "—"}</b>
                      <span className="dash-dot">•</span>
                      Penalty <b>{r.penalty != null ? Number(r.penalty).toFixed(3) : "—"}</b>
                    </div>
                    {r.warningMust ? <div style={{ marginTop: 8 }}><span className="badge badge-danger">{t("متطلب أساسي ناقص", "Missing must-have")}</span></div> : null}
                  </td>
                  <td>
                    <div style={{ fontWeight: 950 }}>{r.finalScore ? r.finalScore.toFixed(3) : "—"}</div>
                    <div style={{ marginTop: 10, width: 140, maxWidth: "100%", height: 8, background: "rgba(15,23,42,.08)", borderRadius: 999, overflow: "hidden" }}>
                      <div style={{ width: `${Math.max(0, Math.min(100, r.finalScore * 100))}%`, height: "100%", background: "linear-gradient(90deg, var(--primary), var(--accent))" }} />
                    </div>
                  </td>
                  <td><span className="badge badge-info">{percent(r.finalScore)}</span></td>
                  <td><StatusBadge status={r.status} /></td>
                  <td><StuffingBadge warnings={r.warnings} /></td>
                  <td>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {(r.topSkills ?? []).length ? (r.topSkills ?? []).map((skill: string) => <span key={skill} className="badge badge-muted">{skill}</span>) : <span className="smallMuted">—</span>}
                    </div>
                  </td>
                  <td><Link className="btn" href={`/dashboard/candidate-resumes/${r.id}`}>{t("فتح", "Open")}</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 ? <div style={{ padding: 18 }} className="smallMuted">{t("لا توجد نتائج مطابقة للفلاتر الحالية.", "No results match the current filters.")}</div> : null}
      </div>
    </div>
  );
}
