---
name: tasks
description: >
  Standard for creating, enriching, executing, and tracking iPix Linear IPI tasks.
  Use for new task setup, task rewrites, Lumina-to-iPix migrations, file/workflow plans,
  progress trackers, executable Linear prompts, pre-commit quality gates, GitHub PR creation,
  review-comment troubleshooting, and post-merge proof. Defines the task standard; it does not
  replace task-verifier Done checks.
metadata:
  version: "1.14.0"
---

# tasks — iPix Linear task specification standard

**Purpose:** define and execute substantial iPix Linear work end-to-end while keeping live Linear as the resumable progress/evidence contract.

## Ownership

```text
tasks
= define + execute substantial iPix task work end-to-end

domain skills
= implementation-specific contracts for Supabase, Mastra, CopilotKit, Cloudinary, Next.js, etc.

task-verifier
= independent evidence gate that proves claims and Done
```

The Linear issue is the live task-specific execution runbook and progress source of truth.

## Top Task Snapshot — mandatory

Put this immediately after the title so a product/operator can understand the task before reading implementation detail:

```text
What changes: <2–4 plain-English lines>
Real-world example: <actor → action → visible/durable result>
Faster/better approach: <smallest safe proven path>
Current status: <Todo / In Progress / Blocked + verified progress %>
Tech stack touched: <only affected systems>
Skills/MCPs: <only tools actually required and why>
Production-ready when: <one observable success sentence>
```

If any line is unknown, say `Needs verification` instead of guessing.

## Linear template routing — mandatory

Before creating or materially restructuring a substantial `IPI-*` issue, select the approved workspace template by work type:

```text
Production/release certification?
→ Production Readiness / Release Gate

Confirmed failure requiring root-cause repair?
→ Forensic Error Audit & Fix

Audit/research only with no implementation?
→ iPix Task Audit & Implementation Plan

Otherwise
→ Universal Engineering Task
```

Rules:
- Search Linear first for an existing issue with the same TASK-ID or materially overlapping scope before creating anything new.
- Existing-issue decision:
  - Same work item with the correct or usable template structure → reuse/update it.
  - Same work item with a wrong or missing template association → preserve the issue/history, migrate its body and fields to the closest applicable template structure, and record the mismatch. If current Linear tooling cannot change the template association after creation, do not create a duplicate solely to change template metadata.
  - Existing issue is completed/canceled historical work, materially different scope, or requires creation-only form/template behavior → create a new correctly templated issue, link the old issue, and record the reason/relationship.
  - Assignment alone is not a reason to duplicate work; preserve or intentionally change ownership.
- For a new issue, apply the actual Linear template through the template field. Do not recreate it from memory.
- Do not pass a replacement free-form description during template creation; that would discard the template body. Apply the template first, then fill/correct its sections.
- Preserve the closest applicable template structure when materially rewriting an existing issue.
- Fill only relevant sections; use `Needs verification` rather than inventing values.
- Before implementation, use one of two explicit paths:
  - **Standard path:** verify template/type, project/milestone, dependencies/blockers, relations, observable outcome, acceptance criteria, verification plan, and exact next action.
  - **Exception path:** if a genuinely non-standard issue cannot use an approved template, document the concrete reason in the issue and preserve these required fields.

If Linear is temporarily unavailable, use `todo.md` only as a temporary handoff with the same required state/evidence fields, then reconcile that handoff back into Linear before marking the issue Done.

### Cross-tool handoff and completion

Linear remains the authoritative per-task execution record. Keep a concise handoff in the issue with: current verified state, last completed checkpoint, blocker, exact next action, branch/PR, and exact SHA when available. `todo.md` may point to that task for local session continuity but must not duplicate the full backlog.

## PR follow-up loop — mandatory after PR opens

Opening a PR starts the review loop; it does not finish the task. After the PR opens or after any new push:

1. Refresh the PR's exact head/base, current `main`, unresolved review threads, submitted reviews, required checks, and mergeability.
2. Treat reviewer suggestions as hypotheses: classify each review thread as `VALID`, `PARTIAL`, or `NOISE` using current code, installed versions/types, runtime evidence, and current official sources.
3. For every `VALID`/actionable part, reproduce the problem or add the smallest failing regression/contract first when practical, identify root cause, then implement the smallest safe fix. Do not bundle unrelated cleanup.
4. Re-run the structural maintainability review on touched/load-bearing files and classify candidates as `KEEP / REFACTOR NOW / FOLLOW-UP`; move worthwhile out-of-scope work to a linked Linear issue instead of expanding the PR.
5. Run the cheapest decisive targeted proof, then the risk-matched broader suite. Re-check current `main` and required exact-head checks after every push.
6. Reply in each actionable thread with the exact fix commit and evidence; resolve a thread only after the fix and evidence exist. Leave threads needing human input unresolved.
7. Update the PR title/body so a reviewer can understand the real-world outcome, user/system journey, scope, touched tech stack, findings/fixes, verification, pre-merge checklist, production-ready success criteria, post-merge actions, and exact load-bearing references.
8. Repeat this loop after every push because comments, mergeability, base SHA, and checks can change.

STOP before merge if an actionable thread is unresolved, a required check is red/pending, strict-main is stale, the PR/Linear task disagree materially, or auth/security/tenant/data/provider behavior is unverified for a touched boundary.

## Post-merge local-main synchronization — mandatory before next task

After a PR merges, complete the applicable post-merge proof in [post-merge.md](references/post-merge.md), then synchronize local `main` before creating the next task branch/worktree. The safe sequence is: fetch remote truth → inspect divergence → preserve any local-only commits → fast-forward local `main` only when safe → prove `main...origin/main = 0 0`. Never silently reset local-only work. Do not automatically rebase active feature branches merely because another PR merged; update them only when dependency, conflict, or strict-main policy requires it.

At the Done gate, explicitly decide whether the change requires durable docs and/or a changelog entry:

- behavior, architecture, contracts, runbooks, or user journeys changed → update the canonical `docs/**` in the same PR; GitBook publishes after merge;
- notable shipped product, security, reliability, or operational change → update `changelog.md`;
- neither applies → record the reason briefly in the task/PR.

## Mandatory task structure

Every substantial executable `IPI-*` task must be organized as an **executable dependency-ordered runbook**, not a detached research pack. Use this order when applicable:

1. Plain-English title + top summary — `IPI-NNN · SPEC — Real-world outcome`, followed by a short description a product/operator can understand.
2. Agent Contract.
3. Progress Tracker + Current Handoff.
4. Summary + Faster/better approach — explicitly ask: “Is there a better, faster, simpler, or more efficient way to complete this task?” and use it when equally or more reliable.
5. Real-world user journey / workflow — actor → action → system steps → observable outcome.
6. Tech stack + affected systems — only the stack actually touched by this task.
7. Skills / MCP / CLI / dashboards — exact tools to use and why.
8. Known Context / verified current state — audit current code/runtime/live contracts before assuming a gap.
9. Audit findings — errors, red flags, failure points, blockers, missing pieces, fixes/improvements, and evidence-backed scores when useful.
10. Definition of Done / measurable acceptance criteria.
11. Requirement vs Recommended Implementation.
12. Architecture connections + ownership, including Mermaid user-journey/architecture diagrams when they reduce ambiguity.
13. Dependencies / blockers / related tasks.
14. Reference Appendix / research summary — compact only, never the execution source.
15. Pre-gate / readiness checks.
16. STOP conditions / decision branches.
17. Ordered Implementation Runbook — authoritative execution section, in dependency order.
18. Security / data / query / performance contract when relevant.
19. Test strategy — cheapest reliable proof first.
20. User/AI journey certification when applicable.
21. Pre-commit / pre-merge checklist + PR / exact-head CI.
22. Production-ready checklist + success criteria.
23. Post-merge actions / tests / observable verification.
24. Final report / residual risks / next task.
25. Mermaid reasoning pass where it exposes current→target state, ownership, dependencies, or failure/recovery paths; otherwise record an explicit N/A reason.

For agent-prompt structure, read [agent-instructions.md](references/agent-instructions.md).
For detailed layout, read [task-format.md](references/task-format.md).
For every task that uses external or Lumina references, also read [external-reference-mapping.md](references/external-reference-mapping.md); it supplements `task-format.md` and does not introduce a second action vocabulary.
For progress rules, read [progress-tracker.md](references/progress-tracker.md).
For Lumina migrations, also read [migration-lumina.md](references/migration-lumina.md).
Before commit, read [pre-commit.md](references/pre-commit.md), then choose the risk-matched verification set from [pre-merge-tests.md](references/pre-merge-tests.md).
For PR creation/troubleshooting, read [github-pr.md](references/github-pr.md), [review-comments.md](references/review-comments.md), [domain-routing.md](references/domain-routing.md), [research-evidence.md](references/research-evidence.md), and [github-actions.md](references/github-actions.md).
For user-facing or AI-native workflows, read [user-journey-testing.md](references/user-journey-testing.md).
For UI-heavy work, read [ui-review.md](references/ui-review.md).
For every substantial task, also read `../mermaid-diagrams/SKILL.md` and use Mermaid as a reasoning/error-discovery gate, not only as presentation.
After merge, read [post-merge.md](references/post-merge.md). Keep task and PR lifecycle behavior centralized in this `tasks` skill; do not create parallel lifecycle skills.

## Explicit action vocabulary

Never use `adapt` by itself. Use: **COPY**, **COPY + CLEAN**, **COPY + CLEAN TOKENS**, **PORT**, **REIMPLEMENT USING CURRENT iPix PATTERN**, **EXTRACT + REUSE**, **COPY UI STRUCTURE + REWRITE DATA/WORKFLOW LOGIC**, **REWRITE**, **MOVE TO IPI-XXX · TASK-ID — Full Task Name**, or **DROP**.

## Ticket decomposition — vertical slices first

When a task must be split, prefer **tracer-bullet vertical slices** over layer-by-layer tickets. Each child ticket should deliver one narrow, complete, independently demoable or verifiable outcome across every layer it genuinely needs.

Rules:
- Each slice must fit in one fresh agent context when practical.
- Declare real blocking edges explicitly; a ticket with no blockers may run in parallel.
- Do not create separate "DB", "API", "UI", and "tests" tickets when none is useful alone.
- Prefer the smallest end-to-end behavior: for example, "operator creates one shoot draft" may include schema/API/UI/tests in one ticket.
- Prefactoring may be a prerequisite ticket when it makes the vertical slice materially simpler or safer.

### Wide-refactor exception — expand → migrate → contract

A wide mechanical refactor whose blast radius cannot stay green as a vertical slice should use **expand → migrate → contract** instead:

1. **Expand:** introduce the new contract beside the old without breaking callers.
2. **Migrate:** move callers in independently green batches sized by the real dependency graph.
3. **Contract:** remove the old contract only after every migration batch is proven complete.

If even migration batches cannot stay green independently, use an explicit integration branch and a final integrate-and-verify ticket. Do not pretend a horizontal breaking change is a tracer bullet.

## Required execution behavior

- For substantial code work or cross-file dependency/blast-radius discovery, use Graphify first when `graphify-out/graph.json` exists: run `PATH="$HOME/.local/bin:$PATH" graphify query "<question>"`, then use `graphify path` / `graphify explain` for focused relationships and the wiki index for broad navigation. For a narrow docs/config-only task with an already-known target where Graphify adds no useful proof, use direct inspection and record `Graphify: N/A — <reason>`.
- Inspect current clean `origin/main` before trusting the issue text.
- Reuse current iPix implementation before Lumina or custom code.
- Before implementation, classify risk domains: auth/tenant, Supabase schema/migration, privileged DB function/RPC, consequential AI/HITL, external side effect/webhook, payment/publishing, production config, dependency/Action. Any high-risk domain requires Adversarial task-verifier coverage.
- For Mastra work, also classify applicable risk domains: **agent registry/identity, model/provider, tool schema, tool authority, external side effect, RequestContext/tenant context, memory resource/thread scope, persistent storage, streaming/Stop/abort, workflow, suspend/resume, HITL approval, MCP, observability/evals, Mastra package-family change**. Tenant identity, memory ownership, consequential tools, approval/resume, callback/webhook continuation, persistent storage, cancellation, MCP auth, or package-family changes automatically require Adversarial task-verifier coverage.
- Record verification ownership: **WHAT must be proven → task-verifier; HOW domain correctness is proven → owning domain skill; automated regression → test/CI owner.**
- For Supabase/Postgres work, identify applicable proof classes before coding: catalog, behavioral, authorization/tenant, migration replay, performance/exposure, live read-only. Route the HOW to `ipix-supabase`; never reconstruct an existing DB object from memory or task prose.
- For Mastra work, identify applicable proof classes before coding: registry/config, deterministic primitive, model behavior, authority/context, memory, persistence/restart, HITL artifact, resume/recovery, streaming/abort, side-effect idempotency, observability/evals, exact runtime. Route the HOW to `mastra`; do not let one proof class substitute for another.
- Implement one file/group at a time; do not bulk-copy folders.
- For Lumina migrations, classify mixed-responsibility files at the **symbol/behavior/invariant** level, not one blanket action per file. Pin immutable source SHAs and record current owner/source of truth, legacy risk, target, and proof for every reused behavior.

- Every implementation group must contain an explicit **Checkpoint:** block with the exact success criterion, proof command/test/runtime evidence, and STOP rule. “Checkpoint implied by tests” is not enough.
- Every task must include a concise **Current-state audit** before implementation: what exists, what is missing, errors/red flags/failure points/blockers, recommended fixes, and what must not be rebuilt.
- Every substantial task must name the **affected tech stack** and the **skills/MCPs/CLIs/dashboards** actually required. Do not dump the whole platform stack.
- Put a plain-English **real-world user journey** near the top. For cross-system or AI-native work, add Mermaid for the journey and any material ownership/trust/failure path.
- Include evidence-based **scores/grades /100** only when useful; mark them provisional when evidence is incomplete and explain deductions.
- Before merge, include an explicit production-readiness checklist and the risk-matched tests from `pre-merge-tests.md`; after merge, include the exact actions/tests from `post-merge.md`.
- For every important external/Lumina URL, place the **full URL inside the exact implementation step that uses it**. Each URL-bearing step must state: Inspect → explicit action → current owner/source of truth → exact iPix target → reuse/adapt → defer/drop → avoided custom work → constraints → checkpoint. A detached reference table is summary only.
- If the same source informs multiple steps, repeat the full URL in each step with a narrower instruction for the exact invariant used there; never write only `same URL` in the execution runbook.
- For mutable GitHub sources, keep the human-readable branch URL for navigation but resolve and record an immutable commit SHA/pinned URL in implementation/PR evidence.
- Run the cheapest reliable proof after each file/group before moving on.
- Keep requirement/user outcome separate from the recommended implementation so current evidence can improve the plan without changing the goal.
- Provide known relevant context, explicit IF → THEN edge cases, successful-stop conditions, and invalid-assumption STOP conditions.
- Use examples for ambiguous migration/reuse instructions instead of vague verbs.
- Before commit, run the pre-commit defect-prevention gate, local automated review when available, and the risk-matched pre-merge test matrix; verify load-bearing external contracts.
- Treat PR comments as hypotheses: classify, route to the owning domain skill/MCP, verify, then fix/reply/resolve with evidence.
- Define affected business-critical user journeys and certify both system correctness and AI correctness when AI participates.
- Named third-party testing/review tools are not iPix defaults unless this repository contains a pinned, reproducible setup or an explicit approved task owns the adoption decision. Explorbot is the currently selected exploratory-testing pilot; it is not a mandatory merge gate until a repository-owned path is approved.
- Run a Mermaid reasoning pass before implementation: draw current state, target state, material boundaries, dependencies/blockers, and negative/recovery paths; use the diagram to identify missing owners, second sources of truth, auth/tenant gaps, HITL bypass, duplicate side effects, circular dependencies, unowned failures, and missing evidence.
- For each substantive task section/file group, add the smallest diagram that exposes the relevant relationship/state/sequence or explicitly record `Diagram: N/A — no meaningful relationship/state/sequence to model`. Do not add decorative filler diagrams.
- If code inspection disproves a planned diagram, update the diagram and Linear plan before coding; never force implementation to match a stale diagram.
- Update Linear progress after every verified checkpoint.
- If a completed checkpoint regresses, uncheck it and reduce the percentage.
- Never set `100%` or Linear `Done` until post-merge observable verification passes.

## Progress formula

```text
Overall completion % =
verified applicable leaf units with `Done [x]`
÷ total applicable leaf units
× 100
```

Parent workflow rows are roll-ups only when expanded into child rows. Implementation/Verification boxes are gates, not separate percentage units. Verified `N/A` leaf units are excluded from the denominator. Round to the nearest whole percent.

## Faster/better approach

At task start and each major phase ask once: **Is there a better, faster, more efficient way to complete this without weakening evidence?** Use that path.

## Handoff contract

A different agent must be able to resume from the Linear issue alone and know: current state, verified progress, exact next file/workflow, evidence, blockers, and remaining Done gates.

## Core agent prompt

```text
You are executing one substantial iPix Linear task. Read this skill, the Mermaid reasoning skill, and only the domain references applicable to the current phase. Verify current code/runtime before trusting task assumptions. Before coding, diagram current → target state, material ownership/trust boundaries, dependencies/blockers, and failure/recovery paths; use the diagrams to challenge the plan. For each substantive section/file group, add the smallest useful diagram or an explicit N/A reason. Keep the user outcome separate from the proposed implementation, use the smallest safe solution, and record evidence after each checkpoint. Use the owning domain skill/MCP for uncertain external contracts. For Mastra/Lumina work, classify behavior-level reuse and independent Mastra proof classes before coding. Do not speculate about files or APIs you have not inspected. Stop and update Linear when a STOP condition or diagrammed failure path invalidates the plan. Finish only when the observable Definition of Done and required post-merge proof are verified.
```
