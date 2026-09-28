# AGENTS.md

Canonical repository instructions for coding agents working on [amoai-tech/ipixai](https://github.com/amoai-tech/ipixai) (default branch `main`). Format: [AGENTS.md](https://agents.md/). Human setup belongs in `README.md` and `CONTRIBUTING.md`.

**Precedence, highest first:**

1. an explicit instruction from the user in chat — it overrides everything below;
2. the closest `AGENTS.md` to the file being edited. Nested files exist today: `.claude/skills/vercel-react-best-practices/AGENTS.md` governs that skill's subtree, not this root file;
3. **this root file** — the repository-wide agent contract;
4. `.claude/CLAUDE.md` — a Claude-only overlay. It may add Claude-specific detail; it must not restate or override repository-wide rules;
5. domain `SKILL.md` files, project markdown, then Linear prose — until independently verified against the tiers in [Source of truth](#source-of-truth--higher-wins).

This repository is the iPix CopilotKit + Mastra runtime. Implement here, in `amoai-tech/ipixai`. Do not implement from a different checkout, or from the old repository name `amo-tech-ai/ipix`.

## Canonical engineering workflow

For every substantial executable `IPI-*` task:

```text
live Linear task
→ .claude/skills/tasks/SKILL.md
→ relevant domain skill(s)
→ verify current origin/main + runtime
→ Mermaid reasoning pass
→ smallest safe implementation
→ cheapest decisive tests
→ task-verifier independently challenges evidence
→ exact-head PR review + CI
→ merge
→ exact-main post-merge proof
→ synchronize local `main` with `origin/main`
→ verify `main...origin/main = 0 0`
→ real-world certification when required
→ Linear 100% / Done
```

Ownership:

- `tasks` = define and execute substantial work; task structure, progress, PR, generic user-journey and post-merge standards.
- domain skills = implementation HOW for Supabase, Mastra, CopilotKit/AG-UI, Next.js, Cloudinary, etc.
- `task-verifier` = independently challenge WHAT remains unproven; it does not become another implementation lifecycle.
- Linear = live task-specific plan, blocker, evidence, progress, and Done source of truth.
- CI/tests = repeatable automated proof.

`tasks` is the only task/PR lifecycle skill. Do not create parallel lifecycle skills.

## Fastest safe path

At task start and each major phase ask once:

> Is there a better, faster, more efficient way to complete this without weakening evidence?

Use that path.

Preferred order:

```text
Graphify / dependency discovery
→ read only load-bearing files
→ existing iPix implementation
→ installed dependency / official feature / CLI / SDK / starter
→ smallest necessary custom change
→ targeted test
→ broader proof only if the risk requires it
```

Do not redesign architecture unless evidence proves the current design cannot satisfy the requirement.

## Mermaid reasoning — required for substantial tasks

Mermaid is an engineering reasoning and defect-prevention tool, not decorative documentation. Follow `.claude/skills/mermaid-diagrams/SKILL.md`.

Every substantial task must perform a diagram pass covering the applicable current state, target state, architecture/ownership, dependencies/blockers, negative/recovery paths, and verification path.

For every substantive task section or file/workflow group, add the smallest useful diagram or explicitly record:

```text
Diagram: N/A — no meaningful relationship/state/sequence to model.
```

Use diagrams to actively look for:

- missing owner or duplicate source of truth;
- browser/client authorization or tenant-trust gaps;
- hidden writes or side effects;
- AI/HITL approval bypass or approval detached from exact artifact/revision/hash;
- duplicate retry/resume/callback effects;
- race conditions or circular dependencies;
- external failures without recovery/rollback;
- stale/deprecated routes, skills, providers, or architecture;
- secret exposure to client/model/memory/snapshot/trace;
- final states with no observable test/readback proving them.

If a load-bearing red flag appears, correct the task/architecture before coding. A diagram defines expected structure; tests/runtime evidence prove actual behavior.

## Setup commands

```bash
npm ci

# Dotenvx is built into the local scripts
npm run dev:ui     # Next.js :3000
npm run dev:agent  # Mastra :4111

# Coding agents launch with the separate least-privilege .env.agent; app/test env files stay outside the agent process
# First-time local setup: cp .env.agent.example .env.agent
npm run agent:claude
npm run agent:codex
```

Combined `npm run dev` is blocked by **DEV-STAB-001** because of the watcher/fork storm. Do not use `concurrently` for UI + agent.

Do not run `npm run build` while `:3000` or `:4111` is listening (`scripts/dev-guard.mjs`). Restart a dev server after adding dependencies.

Graphify before spanning-file search. `graphify` is a **user-local binary**, not a repository dependency: it lives at `$HOME/.local/bin/graphify` and is invoked with that directory on `PATH`. Treat it as optional infrastructure — if the binary is absent, fall back to targeted `grep`/`glob` reading of the load-bearing paths and record `Graphify: N/A — binary unavailable` rather than stalling. If the binary is present but `graphify-out/graph.json` is absent, build the graph once; **this repository does not ship a prebuilt graph**, so never assume one exists. Then update it after source changes and query it:

```bash
PATH="$HOME/.local/bin:$PATH" graphify .
PATH="$HOME/.local/bin:$PATH" graphify update .
PATH="$HOME/.local/bin:$PATH" graphify query "<question>"
```

Graph: `graphify-out/graph.json` (generated local state; do not commit it).

## Source of truth — higher wins

1. Current clean `origin/main` on this repository.
2. Installed package types and lockfile.
3. Safely inspected live/runtime state, schema, tests, and CI.
4. Official version-specific vendor docs.
5. Current official docs.
6. Project markdown, which may be stale.
7. Linear prose and external examples until independently verified.

Never implement from stale docs, a dirty checkout, another repository, or task prose contradicted by current code/runtime.

## Architecture boundaries

- Supabase/Postgres = durable application truth where specified.
- RLS + explicit server/domain authorization = tenant protection.
- Mastra = agents, tools, workflows, memory orchestration, HITL, evals.
- CopilotKit/AG-UI = interactive AI UX/transport.
- Cloudinary = image/video media workflows.
- Commerce providers = commerce truth where specified.
- GitHub Actions = automated exact-head/exact-main proof.
- Linear = task/evidence/Done source of truth.

Never treat browser `orgId`, `user_metadata`, or service-role possession as authorization.

## Testing instructions

Re-read `package.json` and the changed path before choosing commands; never invent missing scripts.

Use the cheapest reliable proof first:

```text
static inspection
→ targeted unit/contract test
→ targeted integration / SQL / RLS / RPC proof
→ npm test when the root suite is relevant
→ npm run typecheck
→ npm run build when required
→ Playwright/browser journey when required
→ live/runtime proof when required
```

**`npm test` and `npx vitest run` are not the same check.** `npm test` runs `vitest run`, but npm first executes `pretest`, which is `npm run secrets:check` (`scripts/check-local-secrets.mjs`). `npx vitest run` bypasses that gate entirely. Use `npm test` when you mean "the repository's test gate"; when you use `npx vitest run <path>` for a targeted proof, say so and run `npm run secrets:check` separately at least once before finishing.

Important proof classes are independent. One cannot substitute for another: authorization, persistence, restart, idempotency/concurrency, model routing, HITL exact-artifact proof, downstream abort, real user journey, and post-merge runtime proof each require their own evidence when in scope.

Before finishing a substantial change:

1. Run the targeted proof for the changed behavior.
2. Run `npm test` when the root suite is relevant.
3. Run `npm run typecheck`.
4. Run `npm run build` when the changed risk or CI requires production-build proof and dev ports are free.
5. Run browser/runtime journey when UI/chat acceptance criteria require it.
6. Run Org A vs Org B proof when tenant isolation is in scope.
7. Run `task-verifier` Standard; Adversarial is automatic for auth/RLS/tenant, consequential AI/HITL, migrations/data integrity, destructive writes, payments/publishing, production/release/config, secrets/webhooks/security-sensitive dependencies, and equivalent Mastra persistence/resume/cancellation/auth risks.

Any BLOCKER or failed required evidence means **BLOCKED / UNVERIFIED**. Never use a numeric score to override a blocker.

## Supabase safety

For tasks touching data/auth/runtime, inspect the existing contract before creating anything:

- project/schema/role identity;
- tables and relationships/FKs;
- indexes;
- RLS/policies;
- RPC/functions/grants;
- `SECURITY DEFINER` behavior;
- triggers;
- Edge Functions when relevant;
- migration/type drift;
- relevant security findings.

Default writes: local `supabase start`. Hosted reads use the approved non-production target unless the task explicitly says otherwise.

**Known breakage — `supabase start` fails in this repository (verified 2026-09-28).** The pinned CLI (`supabase` 2.116.0) aborts before touching Docker:

```text
$ supabase start
failed to parse config: missing private key
```

Cause is bisected, not guessed: the dotenvx-encrypted `.env.local` (values are `encrypted:…`, plus `DOTENV_PUBLIC_KEY_LOCAL`) is the trigger. The identical `supabase/config.toml` run from a directory *without* `.env.local` passes config parsing and starts containers. It is not `config.toml`, not the ambient shell environment, and not `.env.keys`, `.env.test`, `.env.agent`, or `.env.legacy-retired` — each was tested individually.

Two verified workarounds, in order of preference:

1. **Disposable Postgres plus this repository's own migrations.** Start any local Postgres, create the login role, then apply the pinned `mastra` migrations **in timestamp order** (`20260722093028_mastra_schema_pinned_1_12_0` → `20260722094055_mastra_runtime_grants_and_rls` → `20260822070000_ipi1008_mastra_workflow_definitions` → `20260927194500_ipi1332_mastra_1_71_schema_delta`). `127.0.0.1` is on the `src/mastra/pg-store.ts` allowlist. This is what the `mem-001-restart-history` CI job does, and it needs no new DDL.
2. **Run the Supabase CLI from a copy of `supabase/` outside this working tree**, so `.env.local` is not discoverable from the CLI's working directory.

Do not silently fall back to a second database provider to work around this. Report the breakage rather than working around it invisibly, and do not delete `.env.local` (the app needs it).

Production/hosted writes are forbidden by default. An explicit Linear task may authorize a hosted synthetic proof only with verified project identity, synthetic IDs/namespaces, non-interference baseline/after proof, required guards such as `disableInit: true`, cleanup, and explicit authorization.

Never `supabase db push` against production. Stop if project, schema, role, or read/write boundary is uncertain.

## AI governance

**Humans decide. AI assists.**

Consequential actions follow:

```text
AI proposes
→ human reviews
→ exact approved artifact/action is revalidated server-side
→ authorized idempotent action executes
→ durable result is recorded/read back
```

Do not autonomously publish, pay, delete, or commit sensitive business state.

## Code style

- TypeScript (`.ts` / `.tsx`), `strict: true`.
- App in `src/`; Mastra in `src/mastra/`.
- Smallest correct change; follow the `ponytail` skill (`.agents/skills/ponytail/SKILL.md`) — reuse what already exists here before writing anything new.
- One concern per commit/PR; do not mix unrelated cleanup.
- Full Linear names: `IPI-NNN · TASK-ID — Full title`, where `TASK-ID` is the real spec identifier such as `BRAND-001`, `DASH-MAIN-002`, or `MIGRATE-TEMPLATE`.

Rules: `.cursor/rules/`. Canonical skill source tree: `.agents/skills/`. Claude discovers shared skills through symlinks under `.claude/skills/`; `.cursor/skills` may point at the Claude discovery layer. Registry SSOT: `.agents/skills/registry.json`. The index `.claude/skills/index-skills.md` is generated from that registry; update it with `npm run skills:index`, never by hand.

**One-real-copy rule:** by default, a skill has one real directory in the repository. Shared/cross-agent skills belong in `.agents/skills/<skill>/`; `.claude/skills/<skill>` must be a symlink to that canonical directory. Do not maintain copied skill directories in both trees. Existing iPix/Claude-only skills that have not yet been migrated may remain under `.claude/skills/` temporarily. Any other temporary exception must be explicitly approved and documented in the owning task/PR with the authoritative copy, reason, and removal checkpoint; otherwise stop instead of creating a duplicate. New shared skills and migrated skills must use `.agents/skills/` as their real home.

## PR instructions

- Title: `IPI-NNN · TASK-ID — Plain English title`. This is **machine-enforced**: CodeRabbit's pre-merge "Title check" fails the PR and blocks merge when the identifier, the middle dot, the spec identifier, or a plain-English outcome is missing (observed on PR #304). Fix the title; do not argue the check away.
- One coherent concern; no unrelated dirty files.
- Keep security/dependency diffs separate unless both are required for the same acceptance criteria.
- PR description should include summary, faster/better approach, material architecture/user-flow Mermaid, what changed/did not change, tests/evidence, merge STOP conditions, and post-merge actions.
- Exact-head evidence only: after every push, re-check required CI and review findings against the new head.
- Review comments are hypotheses until verified against current code/runtime.
- No unresolved BLOCKER/HIGH before merge.
- Merge ≠ Done. Canonical post-merge rules: `.claude/skills/tasks/references/post-merge.md`.
- After merge, safely synchronize local `main` with `origin/main` before creating the next task branch/worktree; preserve local-only commits first, and do not reset them silently. If synchronization cannot be completed safely — or the fetch itself fails — hand it to the human owner rather than starting the next task on an unverified base.

### Merge authority — human approval is mandatory

An agent may open, update, review and fully prepare a pull request. Merging is a **human action**: an agent hands the pull request back to a human owner for the merge, however green the checks look.

Merging requires all three of the following:

1. **Explicit human approval for that exact head SHA.** Green CI is the precondition for *asking*, not a substitute for approval. An approval given for an earlier revision does not carry to a new push — re-request it.
2. **The PR body's pre-merge checklist reviewed against every original item.** Each item stays present and is marked passed with verified current-head evidence, explicitly N/A or blocked with a reason, or failed. Silently unchecking, deleting or weakening an item is prohibited — the point is that nothing leaves the list unaccounted for.
3. **The PR body's success criteria reviewed the same way,** with every original criterion still present and any unprovable, changed or descoped criterion marked explicitly rather than deleted or weakened.

If any gate cannot be satisfied — including when a required check cannot run because of a tooling or infrastructure failure — leave the PR open, say exactly which item is missing, and hand it back to that human owner. Escalate rather than work around: there is **no agent-side override**, and no emergency path in which an agent merges. The human owner can always merge, so an unavailable gate blocks the merge decision rather than deadlocking the repository.

## Linear task execution

For substantial executable `IPI-*` work, load `.claude/skills/tasks/SKILL.md` before planning or implementation and only the domain skills relevant to the task.

### Linear template routing — mandatory

For every new substantial `IPI-*` issue, use one approved Linear workspace template. Do not create a free-form issue when an approved template fits.

- Normal feature/fix → `Universal Engineering Task`
- Audit/research only; no implementation → `iPix Task Audit & Implementation Plan`
- Confirmed bug/root-cause repair → `Forensic Error Audit & Fix`
- Production/release certification → `Production Readiness / Release Gate`

Before creating an issue: search Linear for an existing issue with the same TASK-ID or materially overlapping scope before creating anything new.

Existing-issue decision:
- Same work item with the correct or usable template structure → reuse/update it.
- Same work item with a wrong or missing template association → preserve the issue/history, migrate its body and fields to the closest applicable template structure, and record the mismatch. If current Linear tooling cannot change the template association after creation, do not create a duplicate solely to change template metadata.
- Existing issue is completed/canceled historical work, materially different scope, or requires creation-only form/template behavior → create a new correctly templated issue, link the old issue, and record the reason/relationship.
- Assignment alone is not a reason to duplicate work; preserve or intentionally change ownership.

If a new issue is required, apply the template through Linear's template field; do not replace the template body with a free-form description. Fill only relevant sections and write `Needs verification` for unknown facts. When materially correcting an existing issue, preserve the closest applicable template structure.

**When the template field is unreachable (tooling gap).** The template field is only settable through tooling that exposes it. As of 2026-09-28 the sanctioned fallback `linear-cli` (0.3.28) has no `--template` flag, so a session without a template-capable Linear MCP cannot apply one. This is a third case — neither a non-standard issue nor a Linear outage. Handle it thus: create the issue with the closest approved template's structure written into the body, state in the body that the template field could not be set and why, record the tooling version, and continue. Do not block the task, and do not create a duplicate later solely to attach template metadata.

**Identifiers are assigned, not chosen.** Linear assigns `IPI-NNN` at creation, so the `IPI-NNN · TASK-ID — Full title` form cannot be set in the create call. Create as `TASK-ID — Full title`, then rename to include the assigned identifier. A missing identifier in the title is drift, not a style preference.

Before implementation, use one of two explicit paths:

- **Standard path:** verify template/type, project/milestone, dependencies/blockers, relations, observable outcome, acceptance criteria, verification plan, and exact next action.
- **Exception path:** if a genuinely non-standard issue cannot use an approved template, document the concrete reason in the issue before implementation and preserve the same required outcome/evidence fields.

In either path, keep the issue resumable by another agent from Linear alone. If Linear is temporarily unavailable, use `todo.md` only as a temporary handoff with the same required state/evidence fields, then reconcile that handoff back into Linear before marking the issue Done.

After opening or updating a PR, follow the mandatory **PR follow-up loop** in `.claude/skills/tasks/SKILL.md`: refresh current review/check/main state, validate every suggestion before changing code, fix proven root causes with evidence, update the PR, and repeat until the exact-head merge gate is clean.

Before coding:

1. Re-read the live Linear issue, dependencies, blockers, and acceptance criteria.
2. Graphify before broad reading.
3. Inspect a clean current `origin/main` worktree for multi-step work.
4. Verify load-bearing external claims from official sources and installed source/types.
5. Inspect Supabase read-only when DB truth matters.
6. Correct stale task assumptions before implementation.
7. Define applicable risk classes, Mermaid views, STOP conditions, and proof classes.
8. Run `task-verifier` at the risk-matched depth.

Keep Linear updated with verified progress, evidence, blockers, and the exact next action so another agent can resume from the issue alone.

## Reuse before custom

Reduce custom code in this order:

1. This repo (`graphify` + existing code/helpers).
2. Official/vendor dashboard feature.
3. Official CLI or GitHub Action.
4. Installed dependency/module.
5. Official SDK/starter/example/tutorial/recipe from a maintained official repository.
6. Small adapter.
7. Smallest necessary custom implementation.

Critical API names, versions, auth behavior, RLS assumptions, env keys, and URLs must be verified against current official evidence and installed source/types before implementation.

## Secrets / Dotenvx

- Dotenvx is the canonical local secret-injection path. The repo pins `@dotenvx/dotenvx`; do not depend on a developer's global version.
- Use the repository scripts as the Dotenvx integration boundary; do not hand-roll an alternate loader. Next.js and non-Next runtimes may use different repository-managed Dotenvx integrations, so verify `package.json` and the lockfile before changing them.
- `.env.local` is the canonical local app/runtime file. Plain `.env` is retired; if a tool recreates it, migrate required names to their owning file and remove it. `.env.legacy-retired` is encrypted rollback-only state and normal app/test scripts do not load it. `.env.test` owns QA/E2E values. `.env.agent` is a separate least-privilege file for coding-agent credentials and starts empty by default.
- Production/deployment secrets remain provider-managed (for example Vercel, GitHub Actions, Supabase, or Cloudflare). Local Dotenvx files are not production secret truth.
- Coding agents must not be launched with the full `.env`/`.env.local`. Use `npm run agent:claude` or `npm run agent:codex`, which load only `.env.agent` and redact exact secret matches from stdout/stderr.
- `--redact` is output protection, not an authorization boundary: the child process can read values loaded into it. Keep `.env.agent` minimal; service-role keys, database credentials, deployment tokens, and production credentials belong to their owning app/test/provider secret paths instead of `.env.agent`.
- Real `.env*` files and `.env.keys` stay gitignored. Private keys must be owner-only (`chmod 600`) and must never appear in chat, logs, PRs, Linear, or model context. A dated backup such as `.env.keys.pre-repair.<stamp>` is a **second, unmanaged copy of the same private keys**: it does not inherit the rule that protects `.env.keys`. Give it `chmod 600` if it must exist at all, delete it once the repair is verified, and never leave it in place as permanent state.
- Never print, echo, `cat`, `dotenvx get`, or otherwise reveal secret values. Verify only variable names + presence.
- Never use `dotenvx run --debug`, `dotenvx decrypt --stdout`, or any command that produces unmasked key/private-key output or otherwise prints secret values in agent or CI logs. Prefer names/presence checks and repository wrappers.
- The legacy Infisical local binding is retired after names-only parity verification. Do not recreate it or use `infisical run` as the local secret path; local injection stays on Dotenvx and deployment secrets stay provider-managed.

### Test credentials (.env.test)

- `.env.test` (gitignored) holds QA credentials (dedicated non-production accounts only) plus test-only settings (`E2E_BASE_URL`, `E2E_SERVER`, opt-in flags); CI uses the same names as GitHub secrets.
- Playwright loads `.env.test` plus canonical `.env.local` through Dotenvx; agents may run tests but must never print, echo, or paste their values.
- Never put passwords/tokens in chat, PRs, Linear, or logs. Use existing QA accounts/session state, or create test users through the normal sign-up flow. If a task seems to need a credential value, stop and ask the user to set it in `.env.test` or CI secrets instead.
- Check presence by name only. Missing → report the name and stop.
- `E2E_BASE_URL` may only be localhost or an iPix Vercel Preview, never Production. If a Production check is needed, ask the user first; the production smoke suite is separate.
- Live-write tests need a dedicated QA brand and explicit approval. The Brand Intelligence journey (`e2e/brand-intelligence-journey.spec.ts`) runs only when `E2E_BRAND_INTEL_ALLOW_WRITES=1` and `E2E_BRAND_INTEL_BRAND_ID` is a valid UUID; otherwise it is skipped.

## Completion claims

Do not claim production-ready, persistence, authentication, tenant isolation, consequential approval safety, or Linear Done because code exists, a test passes, or a PR merged.

Done requires the observable user/business outcome, risk-matched evidence, exact-head PR proof, and required post-merge exact-main/runtime verification. Missing evidence is **BLOCKED** or **UNVERIFIED**.

## Explain

Use plain English first. Get to the point. For engineering work report:

- Result
- Problem / blocker
- Faster/better approach
- Changes
- Verification
- Next action
