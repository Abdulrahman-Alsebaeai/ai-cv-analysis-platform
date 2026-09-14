import { createBrowserClient } from "@supabase/ssr";
import { getSupabasePublicConfig } from "./env";

let browserClient: ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
  if (browserClient) return browserClient;

  const { url, key } = getSupabasePublicConfig();

  browserClient = createBrowserClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
    global: {
      fetch: async (input, init) => {
        try {
          return await fetch(input, init);
        } catch {
          throw new Error(
            "تعذر الوصول إلى خدمة Supabase. تحقق من رابط المشروع، المفتاح العام، وحالة المشروع."
          );
        }
      },
    },
  });

  return browserClient;
}
