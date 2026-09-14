"use client";

import { useI18n } from "@/lib/i18n";

export function TeamMembersTable({ rows }: { rows: any[] }) {
  const { t } = useI18n();

  return (
    <div className="dataTable">
      <div className="tableHead" style={{ gridTemplateColumns: "1.8fr 1fr 1fr" }}>
        <div>{t("الاسم", "Name")}</div>
        <div>{t("الدور", "Role")}</div>
        <div>{t("تاريخ الانضمام", "Joined")}</div>
      </div>

      {(rows ?? []).map((r) => (
        <div key={r.id} className="tableRow" style={{ gridTemplateColumns: "1.8fr 1fr 1fr" }}>
          <div>
            <div className="tableCellTitle">{r.full_name ?? r.id}</div>
            {r.phone ? <div className="smallMuted">{r.phone}</div> : null}
          </div>
          <div><span className="badge badge-primary">{r.role}</span></div>
          <div className="smallMuted">{String(r.created_at ?? "").slice(0, 10)}</div>
        </div>
      ))}

      {!rows || rows.length === 0 ? <div className="tableRow" style={{ gridTemplateColumns: "1fr" }}><div className="smallMuted">{t("لا يوجد أعضاء بعد.", "No team members yet.")}</div></div> : null}
    </div>
  );
}
