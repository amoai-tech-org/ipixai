# Mastra + CopilotKit runtime family

This file records the currently installed compatibility family. `package.json` and `package-lock.json` are the executable source of truth; update this file only when the pinned family changes.

## Current pins

| Package | Version |
|---|---:|
| `@copilotkit/runtime` | 1.73.3 |
| `@copilotkit/react-core` | 1.73.3 |
| `@copilotkit/channels` | 0.11.0 |
| `@ag-ui/client` | 0.0.59 |
| `@ag-ui/mastra` | 1.1.4 |
| `@mastra/core` | 1.71.0 |
| `@mastra/memory` | 1.32.1 |
| `@mastra/pg` | 1.27.1 |
| `@mastra/client-js` | 1.50.0 |
| `mastra` | 1.31.3 |
| `next` | 16.3.5 |

## Runtime contract

- Hosted Mastra storage is Postgres-backed through the guarded store in `src/mastra/pg-store.ts`.
- The hosted store uses the private `mastra` schema with `disableInit: true`; repository migrations own schema changes.
- Local development may use the approved local fallback when hosted storage is intentionally absent.
- CopilotKit request identity and Mastra resource scope are derived server-side.
- Planner conversation continuity is durable, not process-local: prior **normal message history** is stored in `mastra.*` and supplied to the next same-thread model call, including after a full process restart. Thread-only facts must not leak into another thread of the same resource, and must not arrive through resource-scoped Working Memory.
- Runtime packages should be upgraded as a tested compatibility family, not one package at a time without verification.

## Verification order

1. inspect `package.json`, lockfile, and installed types;
2. run targeted runtime/storage tests;
3. run `npm run typecheck`;
4. run `npm test`;
5. run `npm run build` when the change affects the deployed runtime.
6. run the two-sided memory proof when the change touches Planner memory, thread identity, or the `mastra` schema: `npx vitest run tests/mem-001-message-history.test.ts` proves the message-history → model-prompt contract, and `npx tsx scripts/mem-001-restart-proof.mjs` proves it across a real process A → process B restart (needs `MASTRA_DATABASE_URL`; CI runs it in the `mem-001-restart-history` job).

Historical pin decisions and migration plans are preserved under [`../archive/mastra/`](../archive/mastra/).
