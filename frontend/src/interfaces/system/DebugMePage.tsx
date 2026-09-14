import { requireAuth } from "@/lib/authGuard";
import { createServerSupabase } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

export async function DebugMePage() {
    const { userId } = await requireAuth();
    const supabase = await createServerSupabase();

    const { data: who } = await supabase.rpc("whoami"); // <-- مهم
    const { data: userRes } = await supabase.auth.getUser();

    const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id, full_name, role, company_id")
        .eq("id", userId)
        .maybeSingle();


    return (
        <main style={{ padding: 24 }}>
            <pre>{JSON.stringify({ userId, whoami: who, email: userRes?.user?.email, profile }, null, 2)}</pre>
        </main>
    );
}
