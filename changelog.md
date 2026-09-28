# Changelog

All notable verified changes to iPix are recorded here. This file follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added

- IPI-1294 / PR #258 — Standardized Linear workflow governance with mandatory four-template routing, documented exception and outage-handoff paths, clear `todo.md`/changelog ownership, and regression tests for the governance contract.
- IPI-1050 · MEM-001 — Proved Planner conversation continuity is durable rather than process-local: prior normal message history reaches the next same-thread model call after a real process restart, a thread-only fact does not leak into another thread of the same resource, and the fact arrives as message history rather than resource-scoped Working Memory. Adds `tests/mem-001-message-history.test.ts`, `scripts/mem-001-restart-proof.mjs`, and the `mem-001-restart-history` CI gate wired into the Production release dependencies.
- PR #302 — Made human approval for the exact head SHA a mandatory merge gate. An agent may open, update, review and fully prepare a pull request but never merges one; merging requires explicit human approval for that same head, the pre-merge checklist reviewed against verified current-head evidence with no item silently unchecked, deleted or weakened, and the success criteria reviewed the same way. Green CI is the precondition for asking, not a substitute for approval.
- PR #303 — Required safe local-`main` synchronization before creating the next task branch. `git fetch origin --prune` must succeed and `main...origin/main` must read `0 0`; local-only commits are preserved on a branch rather than silently reset, and an unverifiable `0 0` is never treated as synchronization.
- PR #305 — Encoded four merge-time practices into the tasks standard: durable records (`changelog.md`, `docs/**`, stale handoffs and trackers) are updated in the same PR as the change rather than as a follow-up; contract tests are run after editing any file they read; doc-contract assertions pin structure rather than transient prose; and a suggested cross-reference is opened and verified before it is cited.
- IPI-1370 · AGENT-DOCS-001 — Added `tests/agent-docs-contract.test.ts`, which fails when `AGENTS.md` or `CLAUDE.md` references a repository path or an `npm run` script that no longer exists, when a machine-local absolute path reappears in `AGENTS.md`, when `CLAUDE.md` restates a section `AGENTS.md` owns, or when the merge-authority rule loses its "no agent-side override" clause.

### Changed

### Deprecated

### Removed

### Fixed

- `docs/mastra/runtime-family.md` — corrected the pinned Mastra/CopilotKit family table, which still listed the pre-IPI-1332 versions (`@copilotkit/runtime` 1.68.1, `@mastra/core` 1.63.2, `@mastra/pg` 1.22.2) rather than the installed 1.73.3 / 1.71.0 / 1.27.1.
- IPI-1370 · AGENT-DOCS-001 — Corrected the agent contract files. `AGENTS.md` no longer documents `supabase start` as a working default (it fails with `failed to parse config: missing private key`, caused by the dotenvx-encrypted `.env.local`), and states the scope precisely: this is a local-environment defect, not a repository-wide one, since CI has no `.env.local` and the `supabase-fresh-replay` job runs the real `supabase start` plus `supabase db reset --local` path successfully on every pull request. It now records the bisected cause and two verified workarounds. Removed a machine-local absolute path from the portable format, documented the full precedence chain including the nested `AGENTS.md` files that already exist, documented that `npm test` runs `pretest: secrets:check` while `npx vitest run` bypasses it, added a path for when Linear's template field is unreachable from the available tooling, documented the assign-then-rename issue-identifier procedure, flagged the PR title check as machine-enforced, stated Graphify's user-local prerequisite, and added a rule for stray `.env.keys` backups. `CLAUDE.md` was reduced to its genuinely Claude-specific delta (goal, launch boundary, built-in accelerators, skill authoring, response-style delta) with pointers to `AGENTS.md` for the 13 repository-wide sections it had duplicated; its PR #106-gated instruction was corrected to record that the follow-up is outstanding, not historical. `.gitignore` now covers `/.kilo/`, which had been excluded only by the unshared `.git/info/exclude`.

### Security

<!-- Add only notable verified outcomes. Minor refactors, formatting, and unverified/planned work do not belong here. Link the Linear issue and PR when useful. -->