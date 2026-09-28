# External Reference → Implementation Mapping Supplement

Use this for every substantial executable iPix Linear task that cites external documentation, GitHub repositories, starters, examples, recipes, SDKs, CLIs, vendor docs, or legacy/Lumina references.

This file **supplements, rather than replaces**, [`task-format.md`](./task-format.md) and the governing [`tasks` skill](../SKILL.md). All requirements in those files remain mandatory. In particular, every external source still needs `Inspect`, an approved implementation `Action`, `Current owner / truth`, `Constraints`, and a complete `Checkpoint` with a STOP rule.

The four classes in this file are **tracking classifications**, not a second implementation-action vocabulary.

## Rule

A detached reference list is not an implementation plan.

Every external reference used by an executable task must be attached to the exact implementation step that consumes it.

Required mapping:

```text
exact URL
→ exact source file/example/section/symbol
→ tracking class: COPY / ADAPT / MODEL / REFERENCE ONLY
→ Inspect: exact API/symbol/pattern to read
→ approved Action from tasks/SKILL.md
→ Current owner / truth in iPix
→ exact behavior/pattern to reuse
→ exact behavior/infrastructure to defer/drop/do not copy
→ exact iPix destination
→ exact implementation change
→ applicable version/auth/tenant/license/cost constraints
→ exact verification
→ Checkpoint: observable PASS + evidence
→ STOP condition
```

If a URL cannot be connected to a concrete implementation or verification step, remove it from the executable runbook and keep it only in background/research notes.

## Tracking classifications vs implementation actions

Use exactly one **tracking class** per reference:

- **COPY** — source is compatible enough to reproduce closely. Still verify current installed APIs, auth, tenancy, and versions.
- **ADAPT** — reuse the source pattern, shape, algorithm, component, or contract, but modify it for current iPix architecture.
- **MODEL** — use it as an architecture/UX/workflow model; do not copy code directly.
- **REFERENCE ONLY** — use it to validate behavior, constraints, terminology, or API expectations; no direct implementation reuse.

Then state a separate approved **Action** from the governing task skill. Never use `ADAPT` by itself as the implementation action.

Approved actions remain:

- **COPY**
- **COPY + CLEAN**
- **COPY + CLEAN TOKENS**
- **PORT**
- **REIMPLEMENT USING CURRENT iPix PATTERN**
- **EXTRACT + REUSE**
- **COPY UI STRUCTURE + REWRITE DATA/WORKFLOW LOGIC**
- **REWRITE**
- **MOVE TO IPI-XXX · TASK-ID — Full Task Name**
- **DROP**

Examples:

- Tracking class **ADAPT** + Action **REIMPLEMENT USING CURRENT iPix PATTERN** for an official integration example whose API shape is useful but whose demo auth/persistence is incompatible.
- Tracking class **COPY** + Action **COPY + CLEAN** for tenant-neutral deterministic legacy logic that only needs cleanup.
- Tracking class **REFERENCE ONLY** + Action **REIMPLEMENT USING CURRENT iPix PATTERN** when official docs validate a contract but current iPix code remains the implementation owner.

## Mandatory step format

These fields supplement, rather than replace, the full external-source requirements in `task-format.md`; all of those requirements remain mandatory for every external source.

Every URL-bearing implementation step must include this structure:

```markdown
### Step N — <plain-English implementation outcome>

**Destination**
- `src/.../target.ts`
- `src/.../target.test.ts`

**Reference 1**
- **URL:** https://github.com/vendor/repo/tree/<pinned-sha>/examples/example-name
- **Tracking class:** ADAPT
- **Inspect:** `examples/example-name/src/file.ts` → `functionName()` / `ComponentName`; read the exact typed streaming/request/HITL pattern.
- **Action:** REIMPLEMENT USING CURRENT iPix PATTERN
- **Current owner / truth:** `src/.../existing-owner.ts` plus installed package types/runtime; these win on conflict.
- **Target:** `src/.../target.ts` → `targetFunction()`
- **Reuse / adapt:** reuse the typed streaming/request/HITL behavior that is compatible with current iPix.
- **Defer / drop / do not copy:** demo auth, browser-trusted tenant IDs, in-memory persistence, sample provider, obsolete routing, or unrelated infrastructure.
- **Avoided custom work:** use the vendor-supported primitive instead of creating a second transport/workflow/auth layer.
- **Constraints:** installed version, server-derived org authorization, source-of-truth boundaries, plan/cost/license/deprecation limits when relevant.
- **Change:** implement only the remaining iPix-specific gap.
- **Verify:** `npm test -- <targeted test>` plus the exact runtime/browser/database proof required by this behavior.

**Checkpoint**
- **PASS when:** <observable result>
- **Evidence:** <command/test/readback/CI/browser proof>
- **STOP if:** <condition that invalidates the plan or requires re-planning>
```

## Exact source requirement

Do not cite only a repository root or documentation homepage when a narrower source exists.

Prefer:

```text
URL to exact docs page
+ exact heading/API
```

or:

```text
URL to exact GitHub example/revision
+ exact file path
+ exact function/component/type
```

For mutable GitHub sources:

1. Keep the readable branch URL for navigation when useful.
2. Resolve the source commit SHA before implementation.
3. Record a pinned commit/blob/tree URL in implementation or PR evidence.

## Exact iPix destination requirement

Do not write vague destinations such as:

```text
apply to Planner
update auth
wire into frontend
```

Use exact targets:

```text
src/mastra/agents/production-planner.ts → tools array
src/app/api/copilotkit/route.ts → authenticated runtime setup
src/lib/auth/resolve-active-org.ts → resolveActiveOrg()
tests/tenant-isolation.test.ts → Org A/B negative case
```

When the exact destination does not exist yet, say explicitly:

```text
Create: src/.../new-file.ts
```

## Verification requirement

Verification must prove the reused or reimplemented behavior, not merely that code compiles.

Examples:

- component pattern → targeted component test + browser behavior
- RLS/auth pattern → Org A/Org B negative proof
- Mastra memory pattern → restart/persistence proof
- CopilotKit stream pattern → authenticated stream + stop/reconnect proof
- HITL pattern → exact-artifact approve/reject/resume proof
- webhook pattern → signature + retry/idempotency proof
- migration pattern → fresh replay + catalog/readback proof
- Cloudinary pattern → signed upload + exact asset/version readback

Use the cheapest decisive proof first, then broader proof only when the risk requires it.

## Reference quality order

Prefer:

```text
current iPix implementation
→ installed source/types
→ official version-specific docs
→ maintained official GitHub example/starter
→ official SDK/CLI recipe
→ proven legacy/Lumina reference
→ maintained community reference only when official material is insufficient
```

Do not copy archived examples when a maintained official replacement exists.

## Ready gate

A substantial executable Linear task with external references is **not Ready** until every load-bearing external URL has:

- [ ] exact URL
- [ ] **Inspect** — exact source file/example/section/symbol
- [ ] tracking class — COPY / ADAPT / MODEL / REFERENCE ONLY
- [ ] approved **Action** from `tasks/SKILL.md`
- [ ] **Current owner / truth**
- [ ] exact iPix target/destination
- [ ] exact behavior to reuse/adapt
- [ ] explicit defer/drop/`Do not copy` boundary
- [ ] avoided custom work identified
- [ ] **Constraints** — version/auth/tenant/cost/license/deprecation when relevant
- [ ] precise implementation change
- [ ] exact verification
- [ ] **Checkpoint** with observable PASS + evidence
- [ ] **STOP condition**

A Reference Appendix may summarize sources, but it never replaces the mappings inside the Ordered Implementation Runbook.
