# Changelog

All notable verified changes to iPix are recorded here. This file follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added

- IPI-1294 / PR #258 — Standardized Linear workflow governance with mandatory four-template routing, documented exception and outage-handoff paths, clear `todo.md`/changelog ownership, and regression tests for the governance contract.
- IPI-1050 · MEM-001 — Proved Planner conversation continuity is durable rather than process-local: prior normal message history reaches the next same-thread model call after a real process restart, a thread-only fact does not leak into another thread of the same resource, and the fact arrives as message history rather than resource-scoped Working Memory. Adds `tests/mem-001-message-history.test.ts`, `scripts/mem-001-restart-proof.mjs`, and the `mem-001-restart-history` CI gate wired into the Production release dependencies.

### Changed

### Deprecated

### Removed

### Fixed

### Security

<!-- Add only notable verified outcomes. Minor refactors, formatting, and unverified/planned work do not belong here. Link the Linear issue and PR when useful. -->
