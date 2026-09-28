# Verified fastest-path mode

Use this reference when the user asks for `/fastest`, the best/faster/simpler implementation path, or an explicit pre-coding comparison of reuse/native/vendor/custom options.

This is a **research/planning mode inside the canonical `tasks` skill**, not a separate lifecycle skill.

## Scope

Analyze the task without editing code, committing, opening a PR, mutating production Supabase, or performing consequential writes.

Use the normal `tasks` source-of-truth, security, and verification rules. This reference only narrows the output and stopping rule for fastest-path analysis.

## Order

1. Read the live task and use the full `IPI-NNN · TASK-ID — Full Task Name` when applicable.
2. Run Graphify first when the graph exists, then inspect only load-bearing current iPix paths.
3. Reuse current iPix implementation before adding code.
4. Prefer, in order: existing iPix implementation → installed official capability → official feature/module → official CLI/scaffold → official SDK → official starter/example → smallest necessary custom implementation.
5. Verify changing vendor/library behavior against installed source/types first, then current official docs/repositories when needed.
6. Identify blockers, stale assumptions, duplicate work, security/reliability risks, and the cheapest decisive tests.
7. **Stop at the first solution that fully satisfies the task without weakening evidence.**

Do not keep evaluating more complex options once a simpler verified option fully satisfies the requirement.

## Output

| Area | Finding |
|---|---|
| Current approach | |
| Faster/better approach | |
| Existing iPix reuse | |
| Official/native option | |
| Custom code still required | |
| Blockers / failure points | |
| Verification | |
| Effort saved | |
| Confidence | |

Finish with:

```text
Recommended path:
1.
2.
3.

Avoid:
-

Verdict: Proceed / Rewrite task / Split task / Park / Duplicate / Cancel
```

If the recommended path becomes implementation work, return to the normal `tasks` execution flow and its checkpoints, risk routing, PR loop, and Done gate.
