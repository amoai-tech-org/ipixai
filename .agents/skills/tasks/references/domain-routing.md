# Domain routing for implementation and PR troubleshooting

Use the domain that owns the questioned behavior. Load the skill before changing code.

| Finding / changed area | Skill | Strongest practical evidence |
| -- | -- | -- |
| Supabase/Postgres/RLS/RPC/tenant | `ipix-supabase` | live read-only Supabase MCP + migrations + policies/indexes |
| CopilotKit / AG-UI / interrupts / threads | `copilotkit` | installed package source/types + official docs/GitHub |
| Mastra agents/tools/workflows/memory | `mastra` | current `src/mastra` + installed package source/types + official docs/GitHub |
| Cloudinary media/upload/transforms | `cloudinary` | Cloudinary MCP/SDK + official docs + current iPix media ownership |
| Next.js routing/RSC/cache/actions | `nextjs-developer` | current app + installed Next.js behavior + official docs |
| React/UI/performance | relevant UI/React skill | current components + targeted browser/perf evidence |
| Security/tenant boundary | domain skill + `task-verifier` | current server auth + live RLS/runtime proof |
| Generic repo architecture | `graphify` | current `origin/main` + dependency graph |
| Lumina migration | `tasks` migration reference | pinned Lumina source + current iPix architecture |

## Cross-domain findings

A finding can legitimately span two rows above — for example a Mastra tool that itself performs a Supabase write, or a CopilotKit event that carries tenant-scoped data. When it does:

1. Load every domain skill the finding touches, not just the first match.
2. The domain that owns the **final write or authorization boundary** decides the verdict. A Mastra tool that writes to Supabase is judged by `ipix-supabase`'s authorization/RLS evidence, even though `mastra` owns the tool's routing/invocation correctness.
3. Record both domains' evidence in the finding, and name which one was decisive and why — do not silently pick one skill's answer and drop the other's relevant evidence.

## Domain investigation sequence

```text
exact reviewer claim
→ changed file/path
→ installed/current version
→ current implementation
→ domain skill
→ MCP/live state if applicable
→ official version-specific docs
→ official GitHub example/release if needed
→ decision
```

Do not search the web first when installed source/types or a connected MCP can answer the question more directly.
Before relying on a named skill/MCP, verify it exists and is available in the current environment. If unavailable, fall back to current code plus installed source/types and official vendor documentation; do not pretend a missing connector ran.

## Test signal by domain

- **Supabase:** SQL/pgTAP-style policy/RPC/constraint fixtures, fresh replay for migration-history risk, then Org A/Org B browser proof when the user journey crosses the DB authorization boundary.
- **CopilotKit / AG-UI:** runtime registry/info/run contract, SSE/event lifecycle, thread/HITL/interrupt tests; browser chat only when user-visible interaction changed.
- **Mastra:** deterministic tools/workflows first; inspect registered agent/workflow and test suspend/resume, memory, or persistence only when the task changes them. Use Studio/runtime inspection to debug behavior, not as the sole automated proof.
- **Cloudinary:** config/signature/webhook verification and provider-event/RPC idempotency first; real upload/delivery only when integration behavior is part of the AC. Never expose API secrets client-side.
- **Next.js/UI:** Vitest/component tests for synchronous code; Playwright for async Server Components, navigation, auth, responsive states, or other user-visible behavior.

## Agent prompt

```text
Classify the current implementation or review finding by owning domain before editing code. When a finding spans multiple domains, load every relevant domain skill and let the domain owning the final write/authorization boundary decide the verdict, recording both domains' evidence. Load only the relevant domain skill(s), inspect the current implementation and installed versions, then use MCP/live state and official version-specific docs or GitHub examples only as needed. Prefer the strongest direct evidence over broad web search. Return: domain(s), claim being tested, evidence consulted, decision (valid/invalid/stale/out-of-scope), smallest safe action, and verification command. Do not change architecture based only on a reviewer suggestion.
```
