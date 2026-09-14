import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { updateSession } from "./src/lib/supabaseProxy";
import { getSupabasePublicConfig } from "./src/lib/env";

const PUBLIC_PATHS = ["/", "/jobs", "/auth/login", "/auth/register", "/auth/callback"];
const DASHBOARD_ROLES = ["admin", "employer", "evaluator", "recruiter", "viewer"];

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

function getConfigSafe() {
  try {
    return getSupabasePublicConfig();
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.startsWith("/api/")
  ) {
    return NextResponse.next();
  }

  const response = await updateSession(request);

  if (isPublicPath(pathname)) return response;

  const cfg = getConfigSafe();
  if (!cfg) return response;

  const supabase = createServerClient(cfg.url, cfg.key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value);
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const userId = user?.id;

  const needsApplicant = pathname.startsWith("/applicant");
  const needsDashboard = pathname.startsWith("/dashboard");

  if ((needsApplicant || needsDashboard) && !userId) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (!userId) return response;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  const role = String(profile?.role ?? (user.user_metadata as any)?.role ?? "applicant").toLowerCase();

  if (needsApplicant && role && role !== "applicant") {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard/jobs";
    return NextResponse.redirect(url);
  }

  if (needsDashboard) {
    if (role && !DASHBOARD_ROLES.includes(role)) {
      const url = request.nextUrl.clone();
      url.pathname = "/applicant/dashboard";
      return NextResponse.redirect(url);
    }

    if (pathname === "/dashboard") {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard/jobs";
      return NextResponse.redirect(url);
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};