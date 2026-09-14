import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

import { getSupabasePublicConfig } from "./env";

function getConfigSafe() {
  try {
    return getSupabasePublicConfig();
  } catch {
    return null;
  }
}

// Middleware helper لتحديث جلسة Supabase عبر الكوكيز
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const cfg = getConfigSafe();
  if (!cfg) return response;

  const supabase = createServerClient(cfg.url, cfg.key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }: any) => {
          request.cookies.set(name, value);
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  // يضمن قراءة المستخدم/الجلسة وتحديث الكوكيز عند الحاجة
  await supabase.auth.getUser().catch(() => null);

  return response;
}
