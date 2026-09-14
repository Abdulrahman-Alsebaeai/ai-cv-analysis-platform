import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabaseServer";
const STAFF_ROLES = new Set(["admin", "employer", "evaluator", "recruiter", "viewer"]);
const STAFF_WRITE_ROLES = new Set(["admin", "employer", "evaluator", "recruiter"]);
export async function getAuthenticatedUserContext() {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) as NextResponse };
  const { data: profile } = await supabase.from("profiles").select("company_id,role,full_name").eq("id", data.user.id).maybeSingle();
  return { supabase, user: data.user, profile: { company_id: profile?.company_id ?? null, role: String(profile?.role ?? "").toLowerCase(), full_name: profile?.full_name ?? null } };
}
export async function requireRecruiterJobAccess(jobId: string, write = false) {
  const ctx = await getAuthenticatedUserContext();
  if ("error" in ctx) return ctx;
  if (!STAFF_ROLES.has(ctx.profile.role) || (write && !STAFF_WRITE_ROLES.has(ctx.profile.role))) return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) as NextResponse };
  const { data: job, error } = await ctx.supabase.from("jobs").select("id,company_id").eq("id", jobId).maybeSingle();
  if (error || !job) return { error: NextResponse.json({ error: "Job not found" }, { status: 404 }) as NextResponse };
  if (!ctx.profile.company_id || ctx.profile.company_id !== job.company_id) return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) as NextResponse };
  return { ...ctx, job };
}
