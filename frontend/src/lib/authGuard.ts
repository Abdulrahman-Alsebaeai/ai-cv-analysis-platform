import { redirect } from "next/navigation";
import { createServerSupabase } from "./supabaseServer";
import { createAdminSupabaseOrNull } from "./supabaseAdmin";
import { appRoutes } from "./appRoutes";
import { destinationForRole, normalizeRole, type AuthRole } from "./authHelpers";

export type Role = AuthRole;

function homeByRole(role: Role) {
  return role === "applicant" ? appRoutes.applicant.dashboard : appRoutes.recruiter.jobs;
}

export async function requireAuth() {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase.auth.getUser();
  const user = data?.user;

  if (error || !user) redirect(appRoutes.public.login);

  return { userId: user.id, supabase, user };
}

function clean(value: unknown) {
  return String(value ?? "").trim();
}

async function recoverCompanyIdFromCreatedJobs(db: any, userId: string) {
  const { data } = await db
    .from("jobs")
    .select("company_id")
    .eq("created_by", userId)
    .not("company_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return clean(data?.company_id) || null;
}

export async function requireRole(allowed: Role[]) {
  const { userId, supabase, user } = await requireAuth();
  const admin = createAdminSupabaseOrNull();
  const db = admin ?? supabase;

  const { data: profile } = await db
    .from("profiles")
    .select("role,company_id,full_name,phone")
    .eq("id", userId)
    .maybeSingle();

  const meta = (user.user_metadata as Record<string, unknown>) ?? {};
  const role = normalizeRole(profile?.role ?? meta.role);
  let companyId = clean(profile?.company_id) || clean(meta.company_id) || null;
  const fullName = clean(profile?.full_name ?? meta.full_name ?? user.email ?? "User") || "User";
  const phone = clean(profile?.phone ?? meta.phone ?? "") || null;

  // If a previous login/profile sync accidentally removed company_id, recover it
  // from jobs created by this recruiter so the dashboard can show their jobs again.
  if (!companyId && role !== "applicant") {
    companyId = await recoverCompanyIdFromCreatedJobs(db, userId);
  }

  try {
    await db.from("profiles").upsert(
      {
        id: userId,
        role,
        company_id: companyId,
        full_name: fullName,
        phone,
      },
      { onConflict: "id" }
    );
  } catch {
    // Authentication should not fail only because profile sync failed.
  }

  if (!allowed.includes(role)) redirect(homeByRole(role));

  return { userId, role, companyId, supabase };
}

export function defaultAuthDestination(role: Role) {
  return destinationForRole(role);
}
