import type { Metadata } from "next";
// Imported before next/font so the Latin @font-face comes last, as Google's
// CSS ordered it: where subsets overlap (e.g. combining marks), the last
// declared face wins, and glyphs must match what Google served.
import "./marketing-fonts.css";
import localFont from "next/font/local";
import "./marketing.css";
import { MarketingHeader } from "@/components/marketing/header";
import { MarketingFooter } from "@/components/marketing/footer";
import { SITE_URL } from "@/lib/site";

// IPI-1359 · NEXT-FONTS-001 — self-hosted; see src/app/layout.tsx. The other
// subsets live in ./marketing-fonts.css under family names pinned explicitly
// through localFont declarations. Google serves Cormorant Garamond as one variable
// file, so 500/600/700 share it exactly as they did before.
const cormorant = localFont({
  src: [
    { path: "../fonts/cormorant-garamond-latin.woff2", weight: "500" },
    { path: "../fonts/cormorant-garamond-latin.woff2", weight: "600" },
    { path: "../fonts/cormorant-garamond-latin.woff2", weight: "700" },
  ],
  variable: "--font-cormorant",
  adjustFontFallback: "Times New Roman",
  declarations: [
    { prop: "font-family", value: "cormorant" },
    {
      prop: "unicode-range",
      value:
        "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD",
    },
  ],
});

const outfit = localFont({
  src: "../fonts/outfit-latin.woff2",
  weight: "100 900",
  variable: "--font-outfit",
  declarations: [
    { prop: "font-family", value: "outfit" },
    {
      prop: "unicode-range",
      value:
        "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD",
    },
  ],
});

// Public marketing metadata — overrides the root layout's starter metadata so
// pages under the (marketing) group never inherit "Mastra + CopilotKit Starter".
// metadataBase (IPI-1064 · MARKETING-MEDIA-001, Sentry finding) resolves every
// relative openGraph.images path declared on child routes (each of the 5
// service pages' relative hero-image path) into an absolute URL. Reuses
// SITE_URL from lib/site.ts —
// the same preview-host-guarded source of truth sitemap.ts/robots.ts use — so
// no second URL helper and no per-page hostname literals.
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "iPix — AI-Powered Content Studio for Fashion & DTC Brands",
  description:
    "Plan, book, produce, and deliver on-brand fashion and e-commerce photography with iPix — the AI-powered content studio for fashion and DTC brands.",
};

// (marketing) group layout — public header/footer only. NO CopilotKit, NO
// OperatorPanel, NO ThreadsDrawer, NO auth. The `.marketing` class scopes the
// iPix brand tokens (marketing.css) so the operator theme is untouched.
export default function MarketingLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className={`marketing ${cormorant.variable} ${outfit.variable}`}>
      <MarketingHeader />
      <main>{children}</main>
      <MarketingFooter />
    </div>
  );
}