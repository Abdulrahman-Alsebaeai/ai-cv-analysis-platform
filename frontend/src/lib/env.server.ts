import "server-only";

function clean(v?: string) {
    if (!v) return "";
    return v.trim().replace(/^"|"$/g, "").replace(/^'|'$/g, "");
}

export function getSupabaseServiceRoleKeyOrThrow() {
    const key = clean(process.env.SUPABASE_SERVICE_ROLE_KEY);
    if (!key) {
        throw new Error(
            "Missing env SUPABASE_SERVICE_ROLE_KEY. Put it in backend/.env (server only). Do NOT use NEXT_PUBLIC_ for this key."
        );
    }
    return key;
}