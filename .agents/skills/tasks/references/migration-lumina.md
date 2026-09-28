# Lumina → iPix V2 migration task rules

Lumina is a reuse source, not architecture authority. Current iPix `origin/main` and verified live contracts win.

## Core rule — classify behavior, not whole files

A Lumina source file may mix reusable business logic with obsolete runtime, auth, persistence, transport, provider, or security assumptions. **Never assign one blanket migration action to a mixed-responsibility file.** Split the source into rows by symbol, behavior, invariant, schema, helper, side effect, or test contract.

Example:

| Lumina source | Symbol / behavior | Classification | Explicit action | Current owner | Legacy risk | iPix target | Required proof |
| -- | -- | -- | -- | -- | -- | -- | -- |
| `app/src/mastra/agents/index.ts` | Planner stage ordering | business invariant | **EXTRACT + REUSE** | Mastra Planner | low | current Planner instructions/tests | natural-language routing + sequence test |
| same file | narrow Planner tool set | authority invariant | **REIMPLEMENT USING CURRENT iPix PATTERN** | Mastra | excessive agency if copied broadly | current agent registry | tool inventory + wrong-tool negative test |
| same file | Cloudflare `resolveAgentModel` | runtime/provider plumbing | **DROP** | current provider/runtime owner | stale runtime | — | static absence |
| `workflows/shoot-wizard.ts` | trusted reference IDs frozen at review | workflow invariant | **REIMPLEMENT USING CURRENT iPix PATTERN** | APPROVAL-001 | stale/replayed references | current approval artifact | resume/revision test |
| same file | hard-coded channel defaults | mutable product/domain truth | **DROP** | current domain/Supabase truth | stale values | TOOL-001/current data source | data-contract proof |
| same file | boolean rejection branch | known legacy defect | **DROP** | APPROVAL-001 | rejection can re-suspend | discriminated review result | explicit reject test |

## Required migration matrix

For every migrated source, record:

| Lumina/current source | Main URL | Pinned URL | Symbol / behavior | Classification | Explicit action | Current owner / source of truth | Legacy risk | iPix target | Proof |
| -- | -- | -- | -- | -- | -- | -- | -- | -- | -- |
| `<file>` | `<main URL>` | `<immutable commit URL>` | `<symbol/invariant>` | `<business/schema/test/runtime/auth/write/...>` | `<COPY / PORT / REIMPLEMENT / ...>` | `<owner>` | `<risk>` | `<target>` | `<test/evidence>` |

Rules:

- Pin every Lumina source used to an immutable commit SHA; also include the `main` URL for convenience.
- Before finalizing reuse, check whether the upstream Lumina file changed after the pinned SHA (commit history/PRs on `main` for that path) — a bugfix, security patch, or deprecation landed after pinning can otherwise be carried forward silently. Record what was checked and the result.
- Never bulk-copy a Lumina folder and fix it later.
- Never treat a whole mixed-responsibility file as `PORT` or `DROP` when useful and unsafe behaviors coexist.
- Never copy Lumina auth/tenant/data assumptions without proving they match current iPix.
- Never carry JWTs, service-role keys, provider credentials, or other secrets inside agent/tool/workflow input, working memory, suspend data, workflow snapshots, or model-visible context.
- Browser/page context IDs are claims until server-verified against the authenticated operator/org.
- Approval must bind to the exact validated artifact/revision/hash the human reviewed; any mutation invalidates stale approval.
- `approved: false`, cancel, close, timeout, disconnect, malformed payload, and stale revision must have explicit fail-closed semantics; truthy/falsy shortcuts are not an approval state machine.
- A resume path must not silently recompute a materially different proposal after approval. Freeze or reload the exact reviewed artifact.
- External callbacks/webhooks that resume workflows must bind the expected run + external job/crawl ID, reject mismatch/replay, and be idempotent.
- Provider/model failure must not fall through into stale or empty data that appears successful or `draft_ready`.
- Reuse current iPix DAL/auth/tenant/UI/domain-write primitives before introducing wrappers from Lumina.
- Preserve user-visible behavior only when it still matches the desired iPix outcome.
- Move unrelated workflow ownership to the exact Linear task instead of vague `defer` language.
- Drop fake/demo/sample data, obsolete routes, stale contexts, fabricated evidence, dead CTAs, old Worker/DurableAgent/Hyperdrive transport assumptions, and legacy interrupt/resume shims unless a current failure proves they are required.
- Treat Lumina tests as specifications/invariants, not automatic proof that the implementation should be copied.
- When reuse comes from outside `amoai-tech`, record source provenance/license compatibility before copying code or assets.

## Mastra-specific migration classes

When the source touches Mastra, classify each relevant behavior as one or more of:

`agent registry/identity` · `model/provider` · `tool schema` · `tool authority` · `external side effect` · `RequestContext/tenant context` · `memory resource/thread scope` · `persistent storage` · `streaming/Stop/abort` · `workflow` · `suspend/resume` · `HITL approval` · `MCP` · `observability/evals` · `package-family/runtime glue`.

Any migration involving tenant identity, memory ownership, consequential tools, approval, resume, callbacks, persistent storage, cancellation, MCP auth, or dependency-family changes requires Adversarial `task-verifier` coverage.

## Preferred implementation order

```text
verify current iPix
→ identify current owner/source of truth
→ pin Lumina SHA
→ inspect only load-bearing Lumina files
→ split each mixed file into behavior-level rows
→ classify keep/reimplement/drop risks
→ verify installed dependency source/types + current live contracts
→ data/types/DAL/domain contracts first
→ agent/tool/workflow behavior
→ UI/transport only where current architecture requires it
→ targeted tests from migrated invariants
→ negative/retry/restart/tenant/HITL proof
→ browser/runtime proof only when needed
```

## Mandatory false-green questions

Before marking a migrated Mastra behavior complete, ask:

- Could a forced `toolChoice` test pass while natural language selects the wrong tool?
- Could a stale/shared thread make persistence appear to work?
- Could the user approve revision N while revision N+1 is executed or saved?
- Could rejection simply suspend again rather than reject?
- Could Stop end the visible stream while downstream provider/tool work continues?
- Could a callback or duplicate resume repeat a durable side effect?
- Could a browser-supplied org/brand/shoot ID bypass server verification?
- Could provider failure expose stale prior output as a successful draft?
- Could a secret be persisted in workflow snapshot or model-visible context?

If yes, add the missing proof before implementation is considered complete.

## Agent prompt

```text
Audit current iPix first, then evaluate the pinned Lumina source as a reuse reference rather than architecture authority. Split every mixed-responsibility Lumina file into symbol/behavior-level migration rows; never assign one blanket action to a file containing both reusable and unsafe logic. For each row record source URLs, classification, explicit action, current owner/source of truth, legacy risk, iPix target, and proof. Before finalizing reuse of a pinned Lumina source, check whether the upstream file changed after the pinned SHA and record the result. Reuse business invariants, deterministic logic and tests where still valid; reimplement auth, tenant, HITL, resume, storage, provider and write boundaries on current iPix primitives. Treat browser context as claims, bind approval to an immutable reviewed artifact/revision/hash, keep secrets out of workflow snapshots/model context, make callbacks/resume idempotent, and fail closed on provider errors. Implement one bounded behavior/file group at a time and verify it before continuing. Stop if current iPix already solves the requirement, if migration would create a second source of truth, or if a legacy runtime workaround is being copied without a current reproduced failure.
```
