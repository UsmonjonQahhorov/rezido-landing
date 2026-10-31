import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, Inter, Space_Grotesk } from "next/font/google";

import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { getDictionary } from "@/i18n";
import { DEFAULT_LOCALE, OG_LOCALES } from "@/i18n/config";
import { env } from "@/lib/env";

import "./globals.css";

/*
 * The three brand typefaces (Rezido Brand Identity v1.0), self-hosted by next/font.
 * Uzbek Latin — including o‘ and g‘ — is covered by the `latin` subset. Add `cyrillic`
 * to Inter and IBM Plex Mono when the Russian locale ships.
 */
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "700"],
  variable: "--font-space-grotesk",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-inter",
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["500", "600"],
  variable: "--font-plex-mono",
  display: "swap",
});

const dict = getDictionary();

export const metadata: Metadata = {
  metadataBase: env.siteUrl,
  title: {
    default: dict.meta.title,
    template: `%s — ${dict.meta.siteName}`,
  },
  description: dict.meta.description,
  applicationName: dict.meta.siteName,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: dict.meta.siteName,
    locale: OG_LOCALES[DEFAULT_LOCALE],
    title: dict.meta.title,
    description: dict.meta.description,
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: dict.meta.title,
    description: dict.meta.description,
  },
  formatDetection: { telephone: false, email: false, address: false },
};

export const viewport: Viewport = {
  themeColor: "#fbf4e7",
  colorScheme: "light",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang={DEFAULT_LOCALE}
      className={`${spaceGrotesk.variable} ${inter.variable} ${plexMono.variable}`}
    >
      <body className="flex min-h-dvh flex-col">
        <a
          href="#main"
          className="sr-only z-[60] rounded-md bg-ink px-4 py-2 text-sm font-semibold text-ink-inverse focus:not-sr-only focus:fixed focus:left-4 focus:top-3"
        >
          {dict.common.skipToContent}
        </a>
        <SiteHeader />
        <main id="main" className="flex-1">
          {children}
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}
