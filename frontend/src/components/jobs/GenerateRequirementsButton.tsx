"use client";

import { useState } from "react";

export function GenerateRequirementsButton({ jobId }: { jobId: string }) {
    const [loading, setLoading] = useState(false);
    const [msg, setMsg] = useState<string | null>(null);

    async function run(mode: "suggest" | "generate") {
        setMsg(null);
        setLoading(true);

        const res = await fetch(`/api/analysis/jobs/${jobId}/requirements/${mode}`, { method: "POST" });
        setLoading(false);

        if (!res.ok) {
            setMsg(await res.text());
            return;
        }

        if (mode === "generate") {
            setMsg("✅ تم توليد المتطلبات وإضافتها (auto). سيتم تحديث الصفحة.");
            window.location.reload();
        } else {
            const json = await res.json();
            setMsg(`✅ اقتراحات جاهزة: ${(json?.requirements?.length ?? 0)} متطلب`);
            // optionally you can render preview later
        }
    }

    return (
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <button className="btn" type="button" disabled={loading} onClick={() => run("suggest")}>
                {loading ? "..." : "Suggest requirements"}
            </button>
            <button className="btn btnPrimary" type="button" disabled={loading} onClick={() => run("generate")}>
                {loading ? "..." : "Generate requirements from JD"}
            </button>
            {msg ? <span style={{ color: msg.startsWith("✅") ? "green" : "crimson" }}>{msg}</span> : null}
        </div>
    );
}
