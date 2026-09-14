/**
 * Lightweight env helpers.
 *
 * Why:
 * - A very common reason for "Failed to fetch" with Supabase is a missing/invalid
 *   NEXT_PUBLIC_SUPABASE_URL or key (often extra quotes/spaces).
 * - We validate and throw a clear error early.
 */

function clean(v: string | undefined | null): string {
  const s = String(v ?? "").trim();
  // remove wrapping quotes that people often copy/paste
  if (
    (s.startsWith('"') && s.endsWith('"')) ||
    (s.startsWith("'") && s.endsWith("'"))
  ) {
    return s.slice(1, -1).trim();
  }
  return s;
}

export function requireEnv(name: string): string {
  const v = clean(process.env[name]);
  if (!v) {
    throw new Error(
      `Missing env ${name}. Create a .env.local in frontend/ and set your Supabase/analysis values.`
    );
  }
  return v;
}

export function requireUrlEnv(name: string): string {
  const v = requireEnv(name);
  try {
    const u = new URL(v);
    if (u.protocol !== "http:" && u.protocol !== "https:") {
      throw new Error("protocol must be http/https");
    }
  } catch {
    throw new Error(
      `Invalid ${name}: "${v}". It must look like https://YOUR_PROJECT_REF.supabase.co (no quotes, no spaces).`
    );
  }
  return v.replace(/\/$/, "");
}

export function getSupabasePublicConfig() {
  const rawUrl = clean(process.env.NEXT_PUBLIC_SUPABASE_URL);
  if (!rawUrl) {
    throw new Error(
      "Missing env NEXT_PUBLIC_SUPABASE_URL. Create a .env.local in frontend/ and set your Supabase/analysis values."
    );
  }

  let url = rawUrl;
  try {
    const u = new URL(rawUrl);
    if (u.protocol !== "http:" && u.protocol !== "https:") {
      throw new Error("protocol must be http/https");
    }
  } catch {
    throw new Error(
      `Invalid NEXT_PUBLIC_SUPABASE_URL: "${rawUrl}". It must look like https://YOUR_PROJECT_REF.supabase.co (no quotes, no spaces).`
    );
  }
  url = url.replace(/\/$/, "");

  const key =
    clean(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) ||
    clean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  if (!key) {
    throw new Error(
      "Missing env NEXT_PUBLIC_SUPABASE_ANON_KEY. Create a .env.local in frontend/ and set your Supabase/analysis values."
    );
  }

  if (/\s/.test(key)) {
    throw new Error(
      "Supabase public key contains whitespace. Remove spaces/newlines from NEXT_PUBLIC_SUPABASE_ANON_KEY."
    );
  }

  return { url, key };
}


export function getAnalysisConfigOrThrow() {
  const base = clean(process.env.ANALYSIS_API_URL);
  const key = clean(process.env.ANALYSIS_API_KEY);
  if (!base) throw new Error("ANALYSIS_API_URL is missing");
  if (!key) throw new Error("ANALYSIS_API_KEY is missing");
  return { base: base.replace(/\/$/, ""), key };
}
