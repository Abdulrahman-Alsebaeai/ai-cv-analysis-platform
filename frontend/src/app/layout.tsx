import type { Metadata } from "next";
import { cookies } from "next/headers";
import "./globals.css";
import { LanguageProvider } from "@/lib/i18n";
import { LANG_COOKIE, dirFromLang, normalizeLang } from "@/lib/i18n-config";

export const metadata: Metadata = {
  title: "CV Platform",
  description: "Bilingual AI-powered resume analysis and candidate ranking platform",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const initialLang = normalizeLang(cookieStore.get(LANG_COOKIE)?.value);

  return (
    <html lang={initialLang} dir={dirFromLang(initialLang)} suppressHydrationWarning>
      <body>
        <LanguageProvider initialLang={initialLang}>{children}</LanguageProvider>
      </body>
    </html>
  );
}
