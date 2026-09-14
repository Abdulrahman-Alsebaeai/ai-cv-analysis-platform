import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabase } from "@/lib/supabaseServer";
import { createAdminSupabaseOrNull } from "@/lib/supabaseAdmin";
import { getSupabasePublicConfig } from "@/lib/env";
import { cleanFormValue, normalizeRole } from "@/lib/authHelpers";

export const runtime = "nodejs";

type ProfilePayload = {
  full_name?: string;
  phone?: string | null;
  role?: string;
  company_id?: string | null;
};

function readBearerToken(req: Request) {
  const value = req.headers.get("authorization") || "";
  const match = value.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}

function createTokenSupabase(accessToken: string) {
  const { url, key } = getSupabasePublicConfig();
  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });
}

export async function POST(req: Request) {
  const cookieSupabase = await createServerSupabase();

  let userClient: any = cookieSupabase;
  let {
    data: { user },
    error: userError,
  } = await cookieSupabase.auth.getUser();

  if (userError || !user) {
    const accessToken = readBearerToken(req);

    if (accessToken) {
      const tokenSupabase = createTokenSupabase(accessToken);
      const result = await tokenSupabase.auth.getUser(accessToken);
      user = result.data.user;
      userError = result.error;
      userClient = tokenSupabase;
    }
  }

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as ProfilePayload;
  const metadata = (user.user_metadata ?? {}) as Record<string, unknown>;

  const admin = createAdminSupabaseOrNull();
  const db = admin ?? userClient;

  // IMPORTANT: never wipe an existing company_id during login/profile sync.
  // The old implementation rebuilt the profile from auth metadata only; if metadata
  // did not contain company_id, employer accounts lost their company link and their
  // jobs disappeared from /dashboard/jobs because that page filters by company_id.
  const { data: existingProfile } = await db
    .from("profiles")
    .select("full_name,phone,role,company_id")
    .eq("id", user.id)
    .maybeSingle();

  const requestedCompanyId = cleanFormValue(body.company_id ?? "");
  const existingCompanyId = cleanFormValue(existingProfile?.company_id ?? "");
  const metadataCompanyId = cleanFormValue(metadata.company_id ?? "");

  const fullName = cleanFormValue(body.full_name || existingProfile?.full_name || metadata.full_name || user.email || "User");
  const phone = cleanFormValue(body.phone ?? existingProfile?.phone ?? metadata.phone ?? "") || null;
  const role = normalizeRole(body.role ?? existingProfile?.role ?? metadata.role ?? "applicant");
  const companyId = requestedCompanyId || existingCompanyId || metadataCompanyId || null;

  const profile = {
    id: user.id,
    full_name: fullName,
    phone,
    role,
    company_id: companyId,
  };

  const { error } = await db.from("profiles").upsert(profile, { onConflict: "id" });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, role, company_id: companyId });
}
