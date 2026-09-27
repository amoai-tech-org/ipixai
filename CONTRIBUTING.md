# Contributing

Canonical repository: [amoai-tech/ipixai](https://github.com/amoai-tech/ipixai).

## Local development

1. `npm ci`
2. First-time secret protection: run `npm run secrets:protect`, then verify with `npm run secrets:check`.
3. Secrets — Dotenvx is the canonical **local** injector (see `AGENTS.md` § Secrets / Dotenvx). Local app values live in encrypted `.env.local`; deployment secrets stay in their provider stores. Run servers **separately**:
   - `npm run dev:ui` — Next.js on port 3000
   - `npm run dev:agent` — Mastra on port 4111

   First-time setup: copy the relevant names from `.env.example` into `.env.local`, set values locally, then encrypt with `npx dotenvx encrypt -f .env.local`. Never commit `.env.local` or `.env.keys`.
4. Do not run combined `npm run dev` (blocked until DEV-STAB-001 is fixed).
5. Do not run `npm run build` while either dev server is up.

## Pull requests

- One concern per PR and per commit.
- Prefer squash merge.
- CI must pass (`npm ci` + `npm run build`).
- Do not import the old `/home/sk/ipix` Worker/Mastra tree unless a current failure proves it is required.

See `AGENTS.md` for agent-facing conventions.
