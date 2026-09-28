# Changelog

All notable verified changes to iPix are recorded here. This file follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added

- IPI-1294 / PR #258 — Standardized Linear workflow governance with mandatory four-template routing, documented exception and outage-handoff paths, clear `todo.md`/changelog ownership, and regression tests for the governance contract.
- PR #302 — Made human approval for the exact head SHA a mandatory merge gate. An agent may open, update, review and fully prepare a pull request but never merges one; merging requires explicit human approval for that same head, the pre-merge checklist reviewed against verified current-head evidence with no item silently unchecked, deleted or weakened, and the success criteria reviewed the same way. Green CI is the precondition for asking, not a substitute for approval.
- PR #303 — Required safe local-`main` synchronization before creating the next task branch. `git fetch origin --prune` must succeed and `main...origin/main` must read `0 0`; local-only commits are preserved on a branch rather than silently reset, and an unverifiable `0 0` is never treated as synchronization.

### Changed

### Deprecated

### Removed

### Fixed

### Security

<!-- Add only notable verified outcomes. Minor refactors, formatting, and unverified/planned work do not belong here. Link the Linear issue and PR when useful. -->
