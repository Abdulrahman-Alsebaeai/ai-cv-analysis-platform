import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabaseServer";
import { destinationForRole, isSafeInternalPath, normalizeRole } from "@/lib/authHelpers";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const url = request.nextUrl.clone();
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next");

  if (code) {
    const supabase = await createServerSupabase();
    await supabase.auth.exchangeCodeForSession(code).catch(() => null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const role = normalizeRole(user?.user_metadata?.role);
    const destination = isSafeInternalPath(next) ? next : destinationForRole(role);
    return NextResponse.redirect(new URL(destination, request.url));
  }

  return NextResponse.redirect(new URL("/auth/login", request.url));
}
