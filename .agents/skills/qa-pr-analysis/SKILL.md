---
name: qa-pr-analysis
description: Analyze a pull request from both requirements intent and code-diff perspectives. Use when someone asks what a PR is supposed to do, whether it actually does it, whether its scope matches the linked ticket, or what to test — and to derive testable acceptance criteria from a diff without performing a full code review. Use it even when the request is phrased as "is this PR any good?", "does this match the ticket?", or "what should I check before merging?" rather than as an explicit PR-analysis request.
license: MIT
metadata:
  source: consolidated from testomatio/skills qa-pr-requirements-analyzer + pull-request-diff-analyzer
  version: 1.0.0-ipix
---

# QA PR Analysis

One PR-analysis entry point with three explicit modes:

- **Intent mode** — what the PR is supposed to do from title/body/comments/linked issue.
- **Diff mode** — what the code actually changes from files/diff/commits.
- **Combined mode** — compare intent versus diff. Use this by default for QA review or merge-readiness work.

Analysis only. Do not modify code.

## Step 1 — Resolve PR context

Accept, in order:
1. PR number or URL from the user.
2. Open PR for the current branch.
3. Ticket/issue key plus its linked PR.

Resolve base/head, title, body, comments/reviews when relevant, linked tickets/issues, and changed files. Do not fabricate unavailable issue content. If a source cannot be retrieved, mark it `NOT VERIFIED` and continue with the evidence that exists.

## Step 2 — Intent mode

Read human-written context first:
- PR title and description
- comments/review discussion that clarify scope
- linked Linear/Jira/GitHub issue and acceptance criteria
- attached diagrams/images when they contain requirements

Establish:
- requested user/business outcome
- source-of-truth hierarchy for this PR
- explicit acceptance criteria
- in-scope requirements
- missing/out-of-scope requirements
- extra behavior present in the PR but not requested
- ambiguities or conflicting requirements

Do not invent requirements. Edge cases belong here only when the ticket/PR/domain makes them relevant.

## Step 3 — Diff mode

Inspect changed files and the actual diff. Determine:
- PR type: feature, bugfix, refactor, docs, CI, deps, or mixed
- one-sentence description of what changed
- affected source files and product areas
- behavior added/removed/changed
- testable acceptance criteria supported by the implementation

Skip deep architecture/code-quality review; that belongs to `code-review` or the owning domain skill.

If there is no source behavior change (docs/tests/config/CI/deps only), say so explicitly and do not invent behavioral acceptance criteria.

## Step 4 — Combined mode

Compare intent and implementation:

- ✅ **In scope:** requirement is represented by the PR.
- ⚠️ **Missing / out of scope:** requirement has no matching implementation evidence.
- ➕ **Extra:** changed behavior has no matching requirement evidence.
- ❓ **Ambiguous:** evidence is incomplete or conflicting.

Treat these as evidence-based scope findings, not assumptions about developer intent.

## Output

### PR Analysis

**PR:** <title>
**Branch:** <head> → <base>
**Type:** <feature | bugfix | refactor | docs | ci | deps | mixed>

**Source of Truth**
- PR description: <present / empty / NOT VERIFIED>
- Linked issue/task: <resolved / unavailable / NOT VERIFIED>
- Most reliable source: <source + why>

**Intent**
<1–2 sentences describing what the PR is supposed to accomplish>

**Actual Changes**
<one sentence describing what the diff changes>

**Impacted Areas**
- <meaningful area>

**Scope Verification**
- ✅ In scope: <requirement → implementation evidence>
- ⚠️ Missing / out of scope: <requirement with no implementation evidence>
- ➕ Extra: <implementation with no requirement evidence>
- ❓ Ambiguous: <unclear point + missing evidence>

**Acceptance Criteria**
- <action> → <expected result>

Omit empty categories instead of writing filler.

## Intent-only output

When the user asks only what the PR should do, keep the `Source of Truth`, `Intent`, `Scope Verification`, ambiguities, and acceptance criteria; do not inspect implementation more deeply than needed to confirm file scope.

## Diff-only output

When the user asks only what changed, return:

### PR Diff Summary

**PR Type:** ...
**Branch:** ...
**Changes:** <one sentence>
**Affected Files:**
- ...

**Impacted Areas:**
- ...

**Acceptance Criteria:**
- <action> → <expected result>

## Rules

- Requirements-not-implementation language in intent mode.
- User-visible/testable language for acceptance criteria.
- No generic statements such as “minor fixes” or “code cleanup”.
- No invented linked-ticket content.
- No deep code review from this skill.
- If the PR description is empty, derive a tentative summary from branch/commits/diff and label that derivation explicitly.
- If every changed file is non-source, state: `No source code behavior changed. Behavioral acceptance criteria are not applicable.`

## References

- Filled combined/intention example: [references/summary-example.md](references/summary-example.md)
- QA risk review after this analysis: `../qa-review/SKILL.md`
- Test case generation: `../qa-write-test-cases/SKILL.md`
