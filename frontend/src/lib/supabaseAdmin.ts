import "server-only";

import { createClient } from "@supabase/supabase-js";
import { getSupabasePublicConfig } from "./env";
import { getSupabaseServiceRoleKeyOrThrow } from "./env.server";

function clean(v: string | undefined | null): string {
  const s = String(v ?? "").trim();
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    return s.slice(1, -1).trim();
  }
  return s;
}

export function createAdminSupabase() {
  const { url } = getSupabasePublicConfig();
  const serviceKey = getSupabaseServiceRoleKeyOrThrow();

  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function createAdminSupabaseOrNull() {
  const serviceKey = clean(process.env.SUPABASE_SERVICE_ROLE_KEY);
  if (!serviceKey) return null;

  const { url } = getSupabasePublicConfig();
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
