import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabaseServer";

export async function POST(req: Request) {
    const supabase = await createServerSupabase();
    const { data } = await supabase.auth.getUser();
    if (!data.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const name = String(body?.name || "").trim();
    if (!name) return NextResponse.json({ error: "Missing company name" }, { status: 400 });

    // call DB function bootstrap_company
    const { data: rpcData, error } = await supabase.rpc("bootstrap_company", { p_name: name });

    if (error) return new NextResponse(error.message, { status: 400 });

    return NextResponse.json({ ok: true, company_id: rpcData });
}
