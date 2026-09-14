import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabaseServer";

const STAFF_ROLES = new Set(["admin", "employer", "evaluator", "recruiter", "viewer"]);

function toOne<T>(rel: T | T[] | null | undefined): T | null {
    if (!rel) return null;
    return Array.isArray(rel) ? (rel[0] ?? null) : rel;
}

export async function POST(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const supabase = await createServerSupabase();

    // Next.js 16: params is a Promise
    const { id: candidateResumeId } = await params;

    // 1) تأكد أن المستخدم مسجل دخول
    const {
        data: { user },
        error: userErr,
    } = await supabase.auth.getUser();

    if (userErr || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2) جلب candidate_resume + owner (candidate.user_id)
    //    + company_id للتحقق من staff
    const { data: cr, error: crErr } = await supabase
        .from("candidate_resumes")
        .select("id,company_id,candidate_id, candidate:candidates(user_id)")
        .eq("id", candidateResumeId)
        .maybeSingle();

    if (crErr || !cr) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const candidate = toOne<any>((cr as any).candidate);
    const ownerUserId = candidate?.user_id ?? null;

    // 3) سماح: صاحب الطلب أو موظف في نفس الشركة
    let allowed = ownerUserId === user.id;

    if (!allowed) {
        const { data: profile } = await supabase
            .from("profiles")
            .select("company_id,role")
            .eq("id", user.id)
            .maybeSingle();

        const role = String(profile?.role ?? "").toLowerCase();

        allowed =
            !!profile?.company_id &&
            profile.company_id === (cr as any).company_id &&
            STAFF_ROLES.has(role);
    }

    if (!allowed) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 4) استدعاء FastAPI مع API KEY (سيرفر-سايد فقط)
    const base = process.env.ANALYSIS_API_URL || "";
    if (!base) {
        return NextResponse.json({ error: "Missing ANALYSIS_API_URL" }, { status: 500 });
    }

    const apiKey = process.env.ANALYSIS_API_KEY || "";
    if (!apiKey) {
        return NextResponse.json({ error: "Missing ANALYSIS_API_KEY" }, { status: 500 });
    }

    const url = `${base.replace(/\/$/, "")}/analysis/candidate-resumes/${candidateResumeId}/analyze`;

    const resp = await fetch(url, {
        method: "POST",
        headers: {
            "x-api-key": apiKey,
            "content-type": "application/json",
        },
        body: "{}",
        cache: "no-store",
    });

    if (!resp.ok) {
        const text = await resp.text().catch(() => "");
        return NextResponse.json(
            { error: "Analysis service error", details: text.slice(0, 800) },
            { status: 502 }
        );
    }

    const json = await resp.json().catch(() => ({}));
    return NextResponse.json({ ok: true, result: json }, { status: 200 });
}