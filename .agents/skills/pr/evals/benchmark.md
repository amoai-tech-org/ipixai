# /pr skill benchmark — old command vs new skill

Benchmark date: 2026-09-09

## Purpose

Compare the pre-PR-#106 `.claude/commands/pr.md` baseline at base SHA `f46a614aa8dfa9934cdacc92dee0d249928c6204` against the new `.claude/skills/pr/SKILL.md` behavior using the six committed cases in `evals.json`.

This is a **deterministic policy-conformance benchmark**, not a Claude runtime benchmark. The authorized local Desktop Commander device was offline, so runtime output quality, latency, and token counts were not measured and must remain `UNVERIFIED` until the same cases are executed in Claude Code.

## Sources

- Baseline: `.claude/commands/pr.md` at `f46a614aa8dfa9934cdacc92dee0d249928c6204`.
- Candidate: `.claude/skills/pr/SKILL.md` on PR #106.
- Expected behavior: `.claude/skills/pr/evals/evals.json`.

## Results

| Eval | Expected | Old command | New skill | Result |
|---|---|---|---|---|
| `/pr status 106` | read-only status; no writes | Explicit `status` path is read-only | Explicit read-only status contract | Old ✅ / New ✅ |
| `/pr 106` | bare `/pr` read-only; recommend next explicit action | **Fails**: empty args auto-detect and may fix → commit → push → resolve without another approval | Explicitly read-only; mutation requires a subcommand | Old ❌ / New ✅ |
| `/pr fix 106` | verify findings, edit only, stop before commit/push | Explicit `fix` is edit-only | Explicit `fix` is edit-only | Old ✅ / New ✅ |
| `/pr ship 106` | verify → allowlisted stage → commit → push → refresh exact-head evidence; never merge | Explicit ship commits/pushes, re-fetches head, never merges; also resolves verified threads | Explicit ship commits/pushes, refreshes exact-head evidence, never merges | Old ✅ / New ✅ |
| `/pr resolve 106` | verify current findings, reply + resolve only | Explicit resolve is no-code and verifies at HEAD | Explicit resolve is reply + resolution after current-head verification | Old ✅ / New ✅ |
| `/pr post-merge 106` | use canonical `tasks` post-merge proof | **Fails current ownership rule**: routes to removed legacy PR-workflow post-merge path | Routes to `tasks/references/post-merge.md` | Old ❌ / New ✅ |

### Pass rate

- Old command: **4 / 6 = 66.7%** static policy conformance.
- New skill: **6 / 6 = 100%** static policy conformance.
- Improvement: **+33.3 percentage points** on the committed behavioral contract.

## High-value differences

### 1. Human mutation boundary

Old baseline:

```text
/pr
→ auto-detect
→ may edit
→ may commit
→ may push
→ may resolve
```

New skill:

```text
/pr
→ inspect + recommend only

/pr fix
→ edit only

/pr ship
→ explicit commit + push authorization

/pr resolve
→ explicit review-thread mutation
```

This aligns with iPix governance: **Humans decide. AI assists.**

### 2. Skill invocation safety

The old command has no skill-level `disable-model-invocation` control.

The new `pr` skill declares:

```yaml
disable-model-invocation: true
```

so Claude cannot automatically invoke the side-effecting PR workflow.

### 3. Canonical ownership

The old post-merge path routes through removed legacy PR workflow. The new skill routes PR/post-merge behavior through the canonical `tasks` references and keeps `task-verifier` as the independent Done authority.

## Runtime benchmark still required

When an authorized local Claude Code environment is available, run all six prompts against:

1. the baseline command snapshot; and
2. the current `pr` skill.

Record for each run:

- pass/fail against `expected_output`;
- unintended writes or side effects;
- elapsed time;
- input/output token usage when available;
- whether the correct path/subcommand was selected;
- any extra clarification or redundant repository exploration.

Do not claim runtime speed/token improvement until those measurements exist.

## Verdict

**Static behavior: VERIFIED IMPROVEMENT.** The new skill closes the two baseline policy failures and reaches 6/6 against the committed eval contract.

**Runtime efficiency: UNVERIFIED.** Requires Claude Code execution when the authorized local device is online.
