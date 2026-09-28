# Architecture Decision Records

Short, dated decisions. New complexity must cite an ADR or open a new one.

| ID | Decision |
| -- | -------- |
| [001](./001-node-first.md) | Node/Vercel first; Cloudflare Worker deferred |
| [002](./002-mastra-owns-ai-memory.md) | Mastra owns AI persistence; app tables own product truth |
| [003](./003-supabase-owns-tenancy.md) | Supabase Auth + org membership own identity |
| [004](./004-compatibility-bundle.md) | CopilotKit + AG-UI + Mastra + AI SDK upgrade as one bundle |
| [005](./005-skill-validation-strategy.md) | Contract tests gate skills; evals required only for behaviour-shaping skills |

Do not recreate ALS, Worker PG shims, or `MASTRA_STORAGE_MODE=noop` without a new ADR.