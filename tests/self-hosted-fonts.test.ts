import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * IPI-1359 · NEXT-FONTS-001 — the build must never fetch Google Fonts
 * (vercel/next.js#99114 fails Turbopack builds on some Google responses).
 * Each layout preloads the Latin subset with next/font/local and explicitly pins
 * the generated font family through declarations; the other subsets are plain
 * @font-face rules that must use that same family name, or non-Latin text would silently
 * fall back to Arial / Times New Roman.
 */
const root = process.cwd();
const read = (p: string) => readFileSync(path.resolve(root, p), "utf8");
const fontsDir = path.resolve(root, "src/app/fonts");

const LAYOUTS = [
  { layout: "src/app/layout.tsx", css: "src/app/fonts/fonts.css", fonts: ["inter", "geistMono"] },
  {
    layout: "src/app/(marketing)/layout.tsx",
    css: "src/app/(marketing)/marketing-fonts.css",
    fonts: ["cormorant", "outfit"],
  },
];

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return sourceFiles(full);
    return /\.(tsx?|jsx?|css)$/.test(name) ? [full] : [];
  });
}

describe("self-hosted fonts", () => {
  it("never loads fonts from Google at build time", () => {
    const offenders = sourceFiles(path.resolve(root, "src")).filter((file) =>
      /next\/font\/google|fonts\.(googleapis|gstatic)\.com/.test(readFileSync(file, "utf8")),
    );
    expect(offenders).toEqual([]);
  });

  it("pins each next/font/local family with the supported declarations API", () => {
    for (const { layout, fonts } of LAYOUTS) {
      const source = read(layout);
      for (const name of fonts) {
        const start = source.indexOf(`const ${name} = localFont(`);
        expect(start, `${layout}: ${name}`).toBeGreaterThanOrEqual(0);
        const nextFont = source.indexOf("const ", start + 1);
        const block = source.slice(start, nextFont === -1 ? undefined : nextFont);
        expect(block, `${layout}: ${name}`).toContain(`prop: "font-family"`);
        expect(block, `${layout}: ${name}`).toContain(`value: "${name}"`);
      }
    }
  });

  it("keeps production builds on the verified Turbopack path", () => {
    // Family names are pinned explicitly above, but this PR's offline-build and
    // pixel-parity evidence was certified on Turbopack. Keep an unverified
    // webpack switch from silently changing the production build contract.
    const scripts = Object.values(
      (JSON.parse(read("package.json")) as { scripts: Record<string, string> }).scripts,
    );
    const workflows = readdirSync(path.resolve(root, ".github/workflows")).map((f) =>
      read(`.github/workflows/${f}`),
    );
    for (const text of [...scripts, ...workflows, read("next.config.ts")]) {
      expect(text).not.toMatch(/--webpack\b/);
    }
  });

  for (const { layout, css, fonts } of LAYOUTS) {
    it(`${css} adds subsets under the family names next/font/local uses in ${layout}`, () => {
      const source = read(layout);
      for (const name of fonts) {
        expect(source).toContain(`const ${name} = localFont(`);
      }
      expect(source).toContain(`import "./${path.relative(path.dirname(layout), css)}";`);

      const families = new Set(
        [...read(css).matchAll(/font-family:\s*([^;]+);/g)].map((m) => m[1].trim()),
      );
      expect([...families].sort()).toEqual([...fonts].sort());
    });

    it(`every font file referenced by ${layout} and ${css} exists`, () => {
      const refs = [
        ...[...read(layout).matchAll(/"(\.\.?\/fonts\/[^"]+\.woff2)"/g)].map((m) =>
          path.resolve(root, path.dirname(layout), m[1]),
        ),
        ...[...read(css).matchAll(/url\("([^"]+\.woff2)"\)/g)].map((m) =>
          path.resolve(root, path.dirname(css), m[1]),
        ),
      ];
      expect(refs.length).toBeGreaterThan(0);
      for (const file of refs) expect(existsSync(file), file).toBe(true);
    });
  }

  it("ships no unused font file and keeps each font's OFL licence beside it", () => {
    const referenced = LAYOUTS.flatMap(({ layout, css }) => [read(layout), read(css)]).join("\n");
    const files = readdirSync(fontsDir);
    for (const woff2 of files.filter((f) => f.endsWith(".woff2"))) {
      expect(referenced, woff2).toContain(woff2);
    }
    for (const licence of [
      "Inter-OFL.txt",
      "GeistMono-OFL.txt",
      "CormorantGaramond-OFL.txt",
      "Outfit-OFL.txt",
    ]) {
      expect(files).toContain(licence);
      expect(readFileSync(path.join(fontsDir, licence), "utf8")).toContain(
        "SIL Open Font License, Version 1.1",
      );
    }
  });
});
