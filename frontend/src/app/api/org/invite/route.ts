import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabaseServer";
import { createAdminSupabase } from "@/lib/supabaseAdmin";

export async function POST(req: Request) {
    const supabase = await createServerSupabase();
    const { data } = await supabase.auth.getUser();
    if (!data.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabase
        .from("profiles")
        .select("company_id,role")
        .eq("id", data.user.id)
        .maybeSingle();

    if (!profile?.company_id) return new NextResponse("Missing company_id", { status: 400 });

    // allow only writers/admin to invite
    const role = String(profile.role || "");
    if (!["admin", "recruiter", "employer"].includes(role)) {
        return new NextResponse("Forbidden", { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const email = String(body?.email || "").trim();
    const invitedRole = String(body?.role || "viewer");

    if (!email) return new NextResponse("Missing email", { status: 400 });
    if (!["viewer", "recruiter"].includes(invitedRole)) return new NextResponse("Invalid role", { status: 400 });

    const admin = createAdminSupabase();

    const { error } = await admin.auth.admin.inviteUserByEmail(email, {
        data: {
            role: invitedRole,
            company_id: profile.company_id,
        },
    });

    if (error) return new NextResponse(error.message, { status: 400 });

    return NextResponse.json({ ok: true });
}
