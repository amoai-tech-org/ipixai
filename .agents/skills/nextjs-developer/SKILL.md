---
name: nextjs-developer
description: >
  Next.js App Router hub for this repo (UI :3000) — RSC, Server Actions, routing,
  data fetching, generateMetadata, loading/error boundaries, next/image. Use whenever
  building or editing page.tsx, layout.tsx, route handlers, server actions, or App Router
  structure. For proxy.ts, next.config.ts, Turbopack, async params/cookies, caching APIs
  also load references/ipix-16.md or satellite nextjs-16. For Supabase auth use
  ipix-supabase (references/auth/nextjs.md) — NOT archived nextjs-supabase-auth.
  For perf/CWV use vercel-react-best-practices (pick one primary on small tasks). NOT for
  CopilotKit, Mastra, or Supabase edge/migrations.
license: MIT
metadata:
  author: https://github.com/Jeffallan
  version: "2.0.0"
  domain: frontend
  role: specialist
  scope: implementation
---

# Next.js Developer — iPixai hub

Single entry point for App Router work in `src/app/`. Load **`references/` on demand** — do not paste reference bodies here.

**Stack:** Next.js (starter lockfile) · React 19 · Turbopack · App Router · port **3000** (`npm run dev:ui`). Never combined `npm run dev`.

---

## When to load what

| Task | Load |
|------|------|
| New route, layout, RSC, Server Action, metadata | This skill + reference row below |
| `proxy.ts`, `next.config.ts`, v16 caching, Turbopack | [references/ipix-16.md](references/ipix-16.md) or [nextjs-16](../nextjs-16/SKILL.md) |
| Supabase auth, cookies, callback, session | [ipix-supabase](../ipix-supabase/SKILL.md) → `references/auth/nextjs.md` |
| Core Web Vitals, bundle, image perf | [vercel-react-best-practices](../vercel-react-best-practices/SKILL.md) |
| Client hooks / Suspense leaf | `vercel-react-best-practices` (react-patterns was not copied) |

**Do not load together on small tasks:** this hub + `vercel-react-best-practices` — pick architecture OR perf as primary.

---

## iPix rules (non-negotiable)

- **Never add `middleware.ts`** — network gate is `app/src/proxy.ts` only (IPI2-127).
- **`getMastra()`** only inside route handlers — never at module top-level (`CLAUDE.md`).
- Data layer: Supabase SSR + Mastra + CopilotKit — not generic ORM examples in references.
- Validate: `cd app && npm run lint && npm run typecheck && npm test` (+ `npm run build` when routes/config change).
- **`error.tsx` gap:** most operator routes still lack error boundaries — add when touching async segments.

---

## Reference guide

| Topic | File | Load when |
|-------|------|-----------|
| **Next.js 16 / iPix platform** | [ipix-16.md](references/ipix-16.md) | proxy, config, caching, MCP debug |
| App Router | [app-router.md](references/app-router.md) | layouts, route groups, conventions |
| Server Components | [server-components.md](references/server-components.md) | RSC, streaming, client boundaries |
| Server Actions | [server-actions.md](references/server-actions.md) | forms, mutations, revalidation |
| Data fetching | [data-fetching.md](references/data-fetching.md) | fetch, ISR, tags |
| Deployment | [deployment.md](references/deployment.md) | Vercel, env, production build |

---

## MUST / MUST NOT

### MUST

- App Router (`app/`) only — no Pages Router
- Server Components by default; `'use client'` at leaf only
- Explicit `fetch` cache / `next.revalidate` — no implicit caching assumptions
- `generateMetadata` or static `metadata` for SEO
- `next/image` for content images

### MUST NOT

- Add `middleware.ts` (use `proxy.ts`)
- Fetch secrets in Client Components
- Skip `loading.tsx` on new async list routes
- Deploy without `cd app && npm run build` green

---

## Workflow

1. Architecture — routes, layouts, RSC vs client split
2. Implement — page/layout + data layer (Supabase server client)
3. Platform check — ipix-16 if touching config/proxy/caching
4. Verify — lint · typecheck · test · build in `app/`

---

## Archived (do not load)

| Was | Use instead |
|-----|-------------|
| `archive/nextjs-best-practices` | This hub + `vercel-react-best-practices` for perf |
| `archive/nextjs-supabase-auth` | `ipix-supabase` → `references/auth/nextjs.md` |
| `archive/nextjs-app-router-patterns` | `references/app-router.md` |

[Upstream docs](https://jeffallan.github.io/claude-skills/skills/frontend/nextjs-developer/)

---

## PR review mode

When reviewing changed Next.js code, verify against the installed Next.js version and focus on material regressions:

- secrets/service-role credentials remain server-only; client state is never authorization;
- route handlers and Server Actions authenticate and authorize tenant-scoped reads/writes;
- user/tenant data does not become accidentally static/cached;
- `proxy.ts` preserves Supabase session refresh and protected-route behavior; do not introduce `middleware.ts`;
- runtime/deployment changes remain compatible with the repository's current deployment ownership;
- prefer targeted route/component tests plus `npm run typecheck`; require a production build only when runtime/build behavior is in scope.
