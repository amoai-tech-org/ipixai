import type { Metadata } from "next";
// Imported before next/font so the Latin @font-face comes last, as Google's
// CSS ordered it: where subsets overlap (e.g. combining marks), the last
// declared face wins, and glyphs must match what Google served.
import "./fonts/fonts.css";
import localFont from "next/font/local";
import "./globals.css";
import "@copilotkit/react-core/v2/styles.css";
import { Analytics } from "@vercel/analytics/next";

// IPI-1359 · NEXT-FONTS-001 — fonts are self-hosted so a build never depends
// on Google Fonts (vercel/next.js#99114: an odd Google Fonts response can fail
// a Turbopack build). Only the Latin subset is preloaded here, as before; the
// other subsets live in ./fonts/fonts.css under the same family names. Each
// localFont call pins that family explicitly through the supported declarations API.
const inter = localFont({
  src: "./fonts/inter-latin.woff2",
  weight: "100 900",
  variable: "--font-inter",
  declarations: [
    { prop: "font-family", value: "inter" },
    {
      prop: "unicode-range",
      value:
        "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD",
    },
  ],
});

const geistMono = localFont({
  src: "./fonts/geist-mono-latin.woff2",
  weight: "100 900",
  variable: "--font-geist-mono",
  declarations: [
    { prop: "font-family", value: "geistMono" },
    {
      prop: "unicode-range",
      value:
        "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD",
    },
  ],
});

export const metadata: Metadata = {
  title: "Mastra + CopilotKit Starter",
  description: "A starter demo connecting a Mastra agent to CopilotKit.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      {/*
        suppressHydrationWarning: browser extensions (e.g. Grammarly) inject
        attributes like data-gr-ext-installed onto <body> before React hydrates,
        which would otherwise surface as a hydration mismatch on first load.
        This only relaxes the check for <body>'s own attributes (one level deep);
        everything rendered inside <body> is still fully hydration-checked.
      */}
      <body
        className={`${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        {children}
        {/* The analytics script (/_vercel/insights/script.js) is served only on
            Vercel (which sets VERCEL=1 at build and runtime); anywhere else, such
            as the CI production build, requesting it is a guaranteed 404. */}
        {process.env.VERCEL ? <Analytics /> : null}
      </body>
    </html>
  );
}
