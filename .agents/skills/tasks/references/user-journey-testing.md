# User-journey testing standard

A user journey is not “does this page work?” It is whether the operator can achieve the real business outcome across every system the journey touches.

Prioritize a small number of business-critical journeys over broad low-value coverage.

## Quick lookup — which canonical journey applies?

Check this before reading the rest of the file. If the task touches:

| Task type / area | Canonical journey (see below) |
| -- | -- |
| Brand URL, brand research, Brand DNA/Brand Brain | **Brand Intelligence** |
| Campaign brief, Planner, shoot plan, shoot approval | **Production Planning** |
| Planner chat, thread continuity, run/thread restore | **Planner chat continuity** |
| Upload, Cloudinary, asset metadata, DNA analysis, product linking | **Assets** |
| None of the above / a new journey | Define a new journey using the fields listed below; do not force-fit an unrelated canonical journey |

For each journey define:
- actor + starting state
- business goal
- observable outcome
- systems crossed
- durable writes
- approval / HITL boundary
- happy path
- negative / recovery paths
- tenant/security boundaries
- completion evidence

## Current iPix testing layers

```text
Vitest → pure logic/components
Supabase SQL / existing fixtures → RLS/RPC/migrations/tenant contracts
Playwright → deterministic user journeys
Mastra/CopilotKit deterministic tests → agent/tool/workflow/runtime contracts
Explorbot → selected autonomous exploratory-browser pilot
GitHub Actions → exact-head merge enforcement
```

Explorbot supplements deterministic coverage; it is not yet a mandatory merge gate. A clean checkout must still be certifiable with repository-owned deterministic tests. Convert verified Explorbot discoveries into permanent regression tests when practical.

No other AI-evaluation or guardrail platform is adopted by this standard. Choosing one requires a separate explicit research/adoption decision with version, setup, secrets, commands, evidence format, ownership, and local/CI execution defined before it becomes a required gate.

## AI-native evaluation requirement

For AI-native workflows, verify the relevant behavior using the current iPix test/runtime stack: relevance/completeness, faithfulness/hallucination risk, tool selection/arguments, excessive agency, prompt-injection handling, sensitive-data/system-prompt leakage, HITL bypass attempts, rejection paths, and no durable write before approval. Prefer deterministic assertions and recorded tool/workflow outputs where they can prove the contract.

## Mastra journey decomposition

When a journey crosses Mastra, do not certify only the browser or only the agent. Review the whole path:

```text
Operator
→ frontend route/state
→ CopilotKit / AG-UI
→ authenticated server boundary
→ server-verified org/resource/thread context
→ Mastra agent
→ tool/workflow/provider
→ human approval when consequential
→ backend/domain write boundary
→ durable store
→ frontend readback after refresh/navigation
```

For each affected Mastra journey record evidence for these layers:

| Layer | Required question |
| --- | --- |
| Frontend | Can the operator start, understand, review, recover, and see the final outcome? |
| CopilotKit/AG-UI | Did the intended thread/agent/event lifecycle occur without custom protocol drift? |
| Auth/context | Were browser IDs treated as claims and revalidated server-side? |
| Agent | Was the intended Production Planner/current agent actually active? |
| Tool/workflow | Did the correct primitive run with validated inputs? |
| AI behavior | Did natural language choose/avoid the right primitive and avoid invented facts? |
| HITL | Was the exact artifact explicitly approved before any consequential write? |
| Backend/domain | Did the owning server/RPC enforce authority and idempotency? |
| Durable state | Was exactly the intended state persisted once and readable afterward? |
| Recovery | Did retry/disconnect/provider failure/stale state fail safely? |
| Tenant | Could Org B read, resume, or influence Org A state? |

Use `.claude/skills/mastra/references/user-journeys.md` for the current iPix Mastra journey map, including current executable Planner journeys and future activation gates for Shoot Approval/Save and Brand Intelligence workflows.

## Required journey scenarios

Test, when applicable:
- happy path
- empty/new state
- validation failure
- network/provider failure
- partial failure
- retry/recovery
- duplicate/idempotent action
- cross-tenant access
- unauthorized action
- stale data
- large-data/pagination
- mobile/responsive
- refresh/back navigation

For AI-native journeys also test:
- relevance and completeness
- faithfulness / hallucination
- tool selection + tool arguments
- unsafe/excessive agency
- prompt injection
- PII/system-prompt leakage
- HITL bypass attempts
- rejection path
- no durable write before approval
- stale prior model/tool result not treated as fresh success
- operator correction across turns when multi-turn behavior changed

## Canonical iPix journeys

**Brand Intelligence**
```text
Brand URL → AI research → draft Brand DNA → operator review → approval → approved Brand Brain persisted
```
Negative: crawl failure, weak evidence, hallucination, duplicate brand, cross-tenant access, rejection, AI self-approval attempt, callback replay/mismatch, stale prior draft promotion, credential leakage into durable workflow state.

**Production Planning**
```text
Brand → campaign brief → Planner → structured shoot plan → operator edit → approval → Shoot saved
```
Prove frontend, CopilotKit/AG-UI, authenticated context, Mastra agent, tools/workflow, backend domain boundary, Supabase authorization, HITL, idempotency and durable readback.

**Planner chat continuity — current executable path**
```text
/login → /app → resolved thread (fresh or restored — /app has no "New" control; IPI-1225 retired /planner to a compatibility redirect) → natural-language request → Production Planner → planning tool/result → visible answer → reload → same run/thread restored
```
Negative: ambiguous/missing input, plausible wrong tool, provider failure, stale shared QA thread, cross-org thread access, fake approval statement.

**Assets**
```text
Shoot → upload → Cloudinary → asset metadata → DNA analysis → human approval → product linking
```
Negative: provider upload succeeds / DB fails, duplicate webhook, wrong org, transformation failure, wrong shoot linkage.

## AI-native certification rule

A green Playwright journey alone does not certify an AI-native workflow.
Certify both:
1. system correctness — navigation, auth/tenant, persistence, integrations;
2. AI correctness — relevance, faithfulness, tool correctness, guardrails, HITL.

For a journey with a durable write, add a third reconciliation check:
3. **state correctness** — the frontend result, workflow/agent evidence, and durable backend record agree on the same artifact/action.

If a workflow layer does not exist yet, mark it `N/A — owner task not landed`, not PASS. Do not create fake E2E tests to simulate a future workflow.

## Agent prompt

```text
Identify the smallest set of business-critical user journeys affected by this task, starting from the quick-lookup table if the task fits an existing canonical journey.

For each journey:
1. Define actor, starting state, business goal, observable success, systems crossed, durable writes, and approval boundaries.
2. If Mastra participates, decompose the full path: frontend → CopilotKit/AG-UI → authenticated context → agent → tool/workflow/provider → HITL → backend/domain write → durable readback.
3. Build realistic standard, empty, and large-data scenarios when applicable.
4. Define happy, negative, recovery, tenant/security, and edge paths.
5. Use deterministic tests first: Vitest / SQL / Playwright.
6. For AI-native journeys, evaluate relevance, faithfulness, natural-language tool selection, tool arguments, guardrails, stale-result handling and HITL behavior with the current iPix test/runtime stack; do not introduce a new evaluation platform unless a separately approved task owns that decision.
7. Reconcile frontend-visible result, agent/workflow evidence, and durable backend state for any consequential write.
8. Use Explorbot only after deterministic coverage exists, treat it as exploratory developer QA rather than a mandatory merge gate, and convert verified discoveries into permanent regression tests.
9. Do not certify the journey because one page renders, one Playwright script passes, or one Mastra tool test passes.
10. Record exact evidence for system correctness, AI correctness, and state correctness when applicable.
11. Stop and update the task if the journey exposes an incorrect architecture, missing ownership boundary, unsafe write, tenant leak, stale approval/result, or unowned failure path.
```
