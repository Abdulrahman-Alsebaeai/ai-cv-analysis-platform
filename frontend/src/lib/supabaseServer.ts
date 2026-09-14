import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

import { getSupabasePublicConfig } from "./env";

export async function createServerSupabase() {
  // Next.js قد تكون cookies() sync أو async حسب الإصدار؛ نتعامل مع الحالتين.
  const maybe = cookies() as any;
  const cookieStore = typeof maybe?.then === "function" ? await maybe : maybe;

  const { url: supabaseUrl, key: supabaseAnonKey } = getSupabasePublicConfig();

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }: any) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Components قد تمنع set() أحياناً - تجاهل
        }
      },
    },
  });
}
