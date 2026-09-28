# Pre-merge test matrix

Use the cheapest reliable proof first, but do not stop before the task's observable risk is covered.

## Canonical order

```text
exact Git diff / scope check
→ Graphify before any Read/Grep/Glob/exploratory Bash code review
→ static/diff review
→ targeted Vitest/component/contract tests
→ typecheck
→ build when route/config/runtime behavior can change
→ localhost Playwright
→ preview Playwright when deployment/runtime integration matters
→ production smoke only when the task explicitly requires post-merge/live proof
```

Official guidance supports this split: Next.js recommends unit/component tests for synchronous code and E2E for async Server Components; Playwright recommends user-visible, isolated tests; GitHub requires status checks on the latest head/merge commit; Supabase recommends database/RLS tests with pgTAP/CLI.

## Always before merge for substantial code changes

- [ ] Exact diff and staged/untracked scope reviewed.
- [ ] Relevant targeted tests pass.
- [ ] `npm run typecheck` passes.
- [ ] `npm run build` passes when routes, Server Components, config, middleware, runtime adapters, or environment wiring changed.
- [ ] No required GitHub check is missing, stale, or green only on an older SHA.
- [ ] All actionable review threads are resolved with evidence.

## Documentation files are under test

`todo.md`, `changelog.md`, `AGENTS.md` and the skill files are read by `tests/skill-contracts.test.ts`. Editing any file a contract test reads means editing its test surface:

- run the contract test **after** the edit (`npm run test:skills`). Never assume prose that "looks right" still satisfies it — a rewrite can break a pinned structural contract while reading perfectly;
- when adding an assertion, pin the **structure** the document must keep (required headings, required labelled fields, required links) rather than transient wording. Content assertions freeze one moment's prose: they make the next honest update fail, and the usual repair is to delete the assertion, which removes the protection entirely;
- if a document is not yet covered by a contract test, covering it belongs to the change that starts relying on it.

## iPix path/risk matrix

| Change / risk | Cheapest required proof | Escalate when |
| -- | -- | -- |
| Pure helper / DTO / formatter | targeted Vitest | public behavior or route contract changes |
| React client component | component test + targeted Vitest | interaction/navigation/responsive behavior matters |
| Async Server Component / App Router page | server/static inspection + Playwright journey | auth/data/navigation is observable only in browser |
| Auth/session/navigation | auth unit/integration + unauthenticated/login/session E2E | cookie/session reuse or redirect behavior changed |
| Tenant/org authorization | targeted auth/DAL test + Org A/Org B E2E | RLS/RPC/database boundary changed |
| Supabase migration/RLS/RPC | SQL/pgTAP-style security fixture + fresh replay when migration history matters | live schema drift or production policy behavior is part of AC |
| CopilotKit/AG-UI runtime | runtime-family/route tests + `/info`/run contract | streaming, threads, interrupts, HITL, or browser chat changed |
| Mastra agent/tool/workflow | deterministic tool/workflow tests; inspect registered agent/workflow | real model behavior, suspend/resume, memory, or persistence is part of AC |
| Cloudinary signing/webhook | signature/config unit tests + RPC/state-machine fixture | real upload/delivery/webhook integration is required |
| UI migration / responsive | component/state tests + localhost Playwright desktop + 390px | deployment CSS/assets/runtime can differ in preview |
| Build/config/env/middleware | typecheck + production build | deployed environment bindings or preview behavior matter |

## Current iPix commands — verify before using

Current root scripts include `npm test`, `npm run typecheck`, `npm run build`, `npm run e2e`, `npm run e2e:production`, and Playwright debug/report commands. Do not invent commands; re-read `package.json` and CI if they change.

Use targeted Vitest first, for example:

```bash
npx vitest run <relevant-test-file...>
npm run typecheck
npm run build                    # when applicable
npm run e2e -- <relevant-spec>   # when a focused browser proof is sufficient
```

## Browser proof ladder

1. **Localhost** — fastest proof for route, auth, interaction, responsive and negative states. Current Playwright owns `:3015` and does not reuse the developer's `:3000` server.
2. **Preview** — use when deployment wiring, environment variables, middleware, edge/runtime behavior, asset delivery, or hosted integrations could differ from localhost. Use only the project's allowlisted preview host.
3. **Production smoke** — post-merge/live certification only unless the task explicitly authorizes otherwise. Never use production to manufacture fixture state.

Playwright tests should assert user-visible behavior, stay isolated, use resilient role/text locators and web-first assertions, and retain trace/screenshot evidence on failures.

## Failure-driven escalation

A failing test is evidence, not a reason to immediately broaden the suite. First identify the smallest failing boundary:

```text
failure
→ reproduce once
→ classify code / data / environment / flake / stale test
→ inspect trace/log/network only for that boundary
→ load owning domain skill/MCP
→ smallest fix
→ rerun failing test
→ rerun directly affected neighbors
→ then broader gate only if needed
```

Stop and update the task if the failure exposes a changed source of truth, new migration/RPC/service requirement, cross-tenant leak, nondeterministic shared test state, or a dependency/version mismatch.

## Flaky-test gate

Retries are diagnostic evidence, not permission to merge instability. For critical journeys, a test that fails and only passes on retry is a failure until the root cause is understood. Prefer Playwright `failOnFlakyTests: true` or `--fail-on-flaky-tests` for critical CI lanes. Record flaky/race findings separately from deterministic product failures.

Critical iPix journeys should include auth, tenant isolation, Brand → Shoot → Planner, approval/save paths, and any task-specific P0 journey. Do not globally enable a stricter flaky gate without first auditing the current suite and owning existing flakes; apply it to a dedicated critical lane first when necessary.

## Production-build and preview browser strategy

Use browser proof in three levels:

1. **Local dev E2E** — fastest proof for UI/route/auth/tenant behavior.
2. **Production-build local smoke** — `npm run build` + production server when Next.js build/RSC/config/middleware behavior is part of the risk.
3. **Preview E2E** — use an allowlisted iPix preview when deployed env, auth callbacks, middleware, Cloudinary delivery, hosted CopilotKit/Mastra routing, or runtime configuration could differ from localhost.

Do not run preview/browser certification for pure helpers or isolated server logic already proved by cheaper tests. Preview failures must be classified as code, deployment/config, secrets/env, external service, or flake before changing product code.

## Current iPix pre-merge gaps to assess — do not silently change CI

**These are a point-in-time snapshot, not a live fact.** Before citing any gap below as still true, re-verify it directly (`package.json`, `playwright.config.ts`, current CI workflow) — the repo changes independently of this file, and a gap fixed elsewhere without updating this list would otherwise be cited as still-open.

These are verified observations from the current repo and should become explicit follow-up decisions when relevant:

1. **No root lint script.** `package.json` has no `lint`; do not invent one in task instructions. Typecheck/tests/build are the current static gates. If linting is desired, create/own that change separately.
2. **Normal E2E uses a Next dev server.** Current Playwright owns `localhost:3015` via `next dev --turbopack`. Next.js recommends E2E against production code for closer production behavior. For route/config/Server Component regressions, consider a separate build→start browser smoke or preview lane rather than assuming dev E2E proves production build behavior.
3. **CI retries can hide flakiness.** Current Playwright uses 2 CI retries but does not enable `failOnFlakyTests`. Playwright can fail CI on any flaky retry with `failOnFlakyTests: true` / `--fail-on-flaky-tests`. Consider this for critical journeys so retry-success is not treated as clean.
4. **Planner E2E has a real hosted model dependency.** A required test that depends on model quota/network can fail independently of deterministic code correctness. Keep deterministic runtime/tool/workflow tests as the primary merge gate; use live-model proof only for behavior that cannot be certified deterministically, and label external-provider failures distinctly.
5. **Preview certification is not the same as localhost CI.** The current Playwright config supports allowlisted iPix Vercel previews through `E2E_BASE_URL`; use preview proof when env bindings, deployed middleware/runtime, asset delivery, or integration credentials are material to the task.
6. **Database CI is already strong but mixed styles exist.** Current CI includes targeted SQL ACL/security fixtures and a full Supabase fresh replay. Prefer the existing targeted fixture for a small DB change; use fresh replay only when migration-chain/fresh-install behavior is actually at risk. Supabase's canonical CLI path is `supabase test db` with pgTAP for database tests.

Do not put optional improvements on the critical path unless the task's risk requires them.

## Agent prompt

```text
Choose the smallest pre-merge test set that proves the risks introduced by this change. Start with exact Git diff/scope. Before any Read, Grep, Glob, or exploratory Bash codebase inspection, run Graphify when graphify-out/graph.json exists and use the scoped result to choose the static review surface. Map changed behavior to the test matrix, run targeted unit/component/SQL/integration tests first, then typecheck/build, then localhost browser proof, production-build smoke, preview E2E, or live-provider tests only when the risk requires them. For auth/tenant changes include negative and Org A/Org B proof; for critical Playwright journeys treat retry-pass as flaky until understood. Before citing any "current iPix pre-merge gap" from this file, re-verify it against package.json/CI directly rather than assuming it is still true. Record each command, result, environment, tested SHA, and any skipped/N/A gate with reason. Stop merge readiness on unexplained P0/P1 failures or flakes.
```

## User-journey gate

For user-facing or AI-native workflows, apply [user-journey-testing.md](user-journey-testing.md). Test the complete business outcome across UI, services, data, authorization, integrations, approvals, and persistence rather than certifying isolated pages. For AI-native journeys, Playwright alone is insufficient: add AI quality and guardrail evidence when applicable.
