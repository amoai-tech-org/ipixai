# Changelog

All notable verified changes to iPix are recorded here. This file follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added

- IPI-1294 / PR #258 — Standardized Linear workflow governance with mandatory four-template routing, documented exception and outage-handoff paths, clear `todo.md`/changelog ownership, and regression tests for the governance contract.
- IPI-1050 · MEM-001 — Proved Planner conversation continuity is durable rather than process-local: prior normal message history reaches the next same-thread model call after a real process restart, a thread-only fact does not leak into another thread of the same resource, and the fact arrives as message history rather than resource-scoped Working Memory. Adds `tests/mem-001-message-history.test.ts`, `scripts/mem-001-restart-proof.mjs`, and the `mem-001-restart-history` CI gate wired into the Production release dependencies.
- PR #302 — Made human approval for the exact head SHA a mandatory merge gate. An agent may open, update, review and fully prepare a pull request but never merges one; merging requires explicit human approval for that same head, the pre-merge checklist reviewed against verified current-head evidence with no item silently unchecked, deleted or weakened, and the success criteria reviewed the same way. Green CI is the precondition for asking, not a substitute for approval.
- PR #303 — Required safe local-`main` synchronization before creating the next task branch. `git fetch origin --prune` must succeed and `main...origin/main` must read `0 0`; local-only commits are preserved on a branch rather than silently reset, and an unverifiable `0 0` is never treated as synchronization.
- PR #305 — Encoded four merge-time practices into the tasks standard: durable records (`changelog.md`, `docs/**`, stale handoffs and trackers) are updated in the same PR as the change rather than as a follow-up; contract tests are run after editing any file they read; doc-contract assertions pin structure rather than transient prose; and a suggested cross-reference is opened and verified before it is cited.

### Changed

### Deprecated

### Removed

### Fixed

- IPI-1117 · HOST-RUNNER-001 — Added tenant-authorized private Supabase Realtime coordination for active Planner runs so a request handled by one Vercel process can be discovered, reconnected to, and stopped from another process with exact `runId` fencing; stale Stop requests cannot cancel a newer run.
- `docs/mastra/runtime-family.md` — corrected the pinned Mastra/CopilotKit family table, which still listed the pre-IPI-1332 versions (`@copilotkit/runtime` 1.68.1, `@mastra/core` 1.63.2, `@mastra/pg` 1.22.2) rather than the installed 1.73.3 / 1.71.0 / 1.27.1.

### Security

<!-- Add only notable verified outcomes. Minor refactors, formatting, and unverified/planned work do not belong here. Link the Linear issue and PR when useful. -->