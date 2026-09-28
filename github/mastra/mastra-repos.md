# Mastra / CopilotKit / Supabase reference repositories

Local clones: `github/mastra/clones/` (gitignored). Do not commit nested git repos into [amoai-tech/ipixai](https://github.com/amoai-tech/ipixai).

These contain runnable source and setup instructions. **Not executed here with real credentials.** Treat community starters as **patterns only** — never copy their Mastra versions or migrations into iPixai.

iPixai's installed family is recorded in [`docs/mastra/runtime-family.md`](../../docs/mastra/runtime-family.md) — do not restate a version here; a second copy is how the two drift apart. Inspect the published packages at those pinned versions, not only `mastra-ai/mastra` `main`.

## Top 5 to clone and examine first

Fastest useful comparison: **CopilotKit example (integration) + `@mastra/pg@1.13.0` (storage contract) + TheDistance starter (Supabase workflow).**

| Rank | Clone | Why |
| ---: | ----- | --- |
| 1 | CopilotKit `examples/integrations/mastra` (sparse) | Canonical CopilotKit + AG-UI + Next.js route; same family as iPixai |
| 2 | `npm pack @mastra/pg@1.13.0` (+ sparse `stores/pg` on mastra-ai/mastra) | Exact storage/schema contract for Core 1.41.0-era PG |
| 3 | [thedistance/mastra-supabase-starter](https://github.com/thedistance/mastra-supabase-starter) | Complete Auth + Postgres memory + pgvector + migrations + Vitest |
| 4 | [mastra-ai/mastra-auth-examples](https://github.com/mastra-ai/mastra-auth-examples) | Official Supabase auth samples |
| 5 | [mastra-ai/ui-dojo](https://github.com/mastra-ai/ui-dojo) | AG-UI / CopilotKit / Mastra UI patterns |

Then, if needed: `hamchowderr/mastra-base` (Docker/CI), `mastra-ai/workshops` (exercises), `jorgepedraza88/saas-starter-ai` (old 0.x architecture only).

## Best 10 (full list)

| Rank | Repository | Useful for iPix | Important warning |
| ---: | ---------- | --------------- | ----------------- |
| 1 | [CopilotKit/CopilotKit — Mastra example](https://github.com/CopilotKit/CopilotKit/tree/main/examples/integrations/mastra) | Canonical CopilotKit bridge, AG-UI, Next.js route and local agents | No Supabase or PostgreSQL. Exact iPix Core/CopilotKit family. |
| 2 | [mastra-ai/mastra](https://github.com/mastra-ai/mastra) | `PostgresStore` source, pooler tests, initialization, schema and memory behavior | `main` is newer than iPix. Inspect published `@mastra/pg@1.13.0`, not only `main`. |
| 3 | [thedistance/mastra-supabase-starter](https://github.com/thedistance/mastra-supabase-starter) | Best complete Supabase example: Auth, PostgreSQL memory, pgvector, migrations and Vitest | Uses Core `1.54.0`, Memory `1.24.0`, PG `1.18.0`; patterns only, never copy versions or migrations directly. |
| 4 | [mastra-ai/mastra-auth-examples](https://github.com/mastra-ai/mastra-auth-examples) | Official Supabase authentication examples | Older and does not prove CopilotKit tenant authorization. |
| 5 | [hamchowderr/mastra-base](https://github.com/hamchowderr/mastra-base) | Node 22, Docker, Supabase, PostgreSQL memory, CI, evals and environment validation | Uses caret dependencies and a newer/different package family. |
| 6 | [jorgepedraza88/saas-starter-ai](https://github.com/jorgepedraza88/saas-starter-ai) | Next.js, Supabase SSR Auth, Mastra PostgreSQL and E2E tests | Old Mastra `0.x` generation; architecture reference only. |
| 7 | [mastra-ai/workshops](https://github.com/mastra-ai/workshops) | Active official agent, memory, workflow and tool exercises | Not a production Supabase persistence example. |
| 8 | [mastra-ai/ui-dojo](https://github.com/mastra-ai/ui-dojo) | AG-UI, CopilotKit and Mastra UI integration patterns | Uses Core `1.50.0` and CopilotKit `1.62.1`, not the iPix family. |
| 9 | [ssdeanx/secure-rag-multi-agent](https://github.com/ssdeanx/secure-rag-multi-agent) | Supabase Auth, RBAC, RAG, tests and multi-agent security ideas | Large and based on old Mastra `0.x`; do not port wholesale. |
| 10 | [mastra-ai/template-company-knowledge](https://github.com/mastra-ai/template-company-knowledge) | Official PostgreSQL, memory and RAG structure | Uses `latest` dependencies and lacks strong test evidence. |

## Do not prioritize

- [wardpeet-mastra/supabase-mastra](https://github.com/wardpeet-mastra/supabase-mastra) — experimental dated canary packages.
- [akuya-ekorot/mastra-supabase](https://github.com/akuya-ekorot/mastra-supabase) — too little verified setup.
- [alpacaconsultants/mastra-copilotkit](https://github.com/alpacaconsultants/mastra-copilotkit) — did not resolve during verification.
- [amoai-tech/mastra-supabase-starter](https://github.com/amoai-tech/mastra-supabase-starter) — fork of TheDistance; examine **upstream** first. Local extra copy may exist at `/home/sk/mastra-supabase-starter`.

Do not clone rank 9–10 until the top 5 have been read.

## Clone layout

```text
github/mastra/
  mastra-repos.md          ← this file (tracked)
  clones/                  ← gitignored
    CopilotKit/            ← sparse: examples/integrations/mastra
    mastra/                ← sparse: stores/pg auth/supabase packages/memory
    mastra-supabase-starter/
    mastra-auth-examples/
    mastra-base/
    saas-starter-ai/
    workshops/
    ui-dojo/
    pg-1.13.0/             ← npm pack extract
```

## Clone commands

From repo root:

```bash
mkdir -p github/mastra/clones
cd github/mastra/clones

git clone --depth 1 https://github.com/thedistance/mastra-supabase-starter.git
git clone --depth 1 https://github.com/mastra-ai/mastra-auth-examples.git
git clone --depth 1 https://github.com/hamchowderr/mastra-base.git
git clone --depth 1 https://github.com/jorgepedraza88/saas-starter-ai.git
git clone --depth 1 https://github.com/mastra-ai/workshops.git
git clone --depth 1 https://github.com/mastra-ai/ui-dojo.git

git clone --depth 1 --filter=blob:none --sparse \
  https://github.com/CopilotKit/CopilotKit.git
( cd CopilotKit && git sparse-checkout set examples/integrations/mastra )

git clone --depth 1 --filter=blob:none --sparse \
  https://github.com/mastra-ai/mastra.git
( cd mastra && git sparse-checkout set stores/pg auth/supabase packages/memory )

mkdir -p pg-1.13.0
( cd pg-1.13.0 && npm pack @mastra/pg@1.13.0 && tar -xzf mastra-pg-1.13.0.tgz )
```
