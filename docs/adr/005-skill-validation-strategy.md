# ADR 005 — Validate skills with contract tests; require evals only for behaviour-shaping skills

**Status:** Accepted · 2026-09-28
**Context:** An audit of all 53 skills found only 3 shipping `evals/evals.json` (`pr`, `mastra`, `shadcn`), while the official skill-creator workflow treats test cases plus a benchmark as the core improvement loop. The question is whether that gap is a defect. It is mostly not: this repository's skills are dominated by procedural and operational content (agent lifecycle, verification gates, vendor setup references), not by output-transforming tasks with objectively checkable results — and 18 of them are vendored and hash-locked, so their evals belong upstream. Meanwhile the repository already runs five contract suites that no upstream guidance asks for: `skill-tree-contract`, `skill-registry-contract`, `skill-contract`, `skill-reference-contract`, and `skill-consolidation-contract`.

**Decision:** **Contract tests are the merge gate; behavioural evals are not.** The five suites above run in CI on every PR and own structure, registry inventory, trigger routing, reference integrity, and vendored provenance. They are deterministic, cheap, and catch the regressions this repository actually suffers.

`evals/evals.json` is **required for a skill whose purpose is to change what the model decides or does**, because for those the contract suites cannot tell whether the skill works — only whether it is well-formed. The tranche that must gain an eval set when it is next materially modified:

`tasks`, `task-verifier`, `mermaid-diagrams`, `explain`, `domain-modeling`, `requirements`, `writing-plans`, `pr`

(`pr`, `mastra`, and `shadcn` already have one.) Each set follows the official schema — realistic prompts first, assertions added only where a result can be checked objectively, and `should-trigger` / `should-not-trigger` trigger queries that include genuine near-misses rather than obvious negatives.

Evals are **not required** for pure lookup/reference skills, for skills whose output is subjective (forcing assertions onto writing or design quality produces false confidence, not rigour), or for **vendored skills**: `skills-lock.json` hash-locks 18 skills from `testomatio/skills`, `mattpocock/skills` and `DietrichGebert/ponytail`, and any reference tree carrying an `UPSTREAM.md` is a vendor snapshot. An eval added to one of those is discarded by the next sync — contribute it upstream instead.

**Do not:** treat a contract test as evidence that a skill *changes behaviour*; they prove shape, not effect. Do not convert this into a blanket "every skill needs evals" mandate — the cost is dozens of eval sets kept green, and most would assert nothing meaningful. Do not add an eval to a vendored tree. Do not edit a vendored skill in place for any reason.
