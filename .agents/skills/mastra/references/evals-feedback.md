---
title: Mastra evals and human feedback
description: Load when verifying agent quality, regression behavior, multi-turn conversations, experiments, datasets, or human feedback.
parent: mastra
impact: HIGH
---

# Evals and feedback — iPix quality contract

Use deterministic assertions for deterministic requirements and Mastra evals/scorers for genuinely non-deterministic quality. Do not replace a hard safety/authorization test with an LLM score.

## Proof selection

| Need | Prefer |
| --- | --- |
| Tool must/must-not be called | deterministic assertion / trajectory gate |
| Schema/authorization/idempotency | normal tests; not LLM-as-judge |
| Natural-language routing quality | curated dataset + tool-call/trajectory scorer |
| Response usefulness/completeness | explicit scorer with reviewed rubric |
| Multi-turn behavior | multi-turn dataset/eval |
| Prompt/model comparison | versioned dataset + experiment |
| Production quality trend | sampled live evals + traces, never blocking user response |
| Operator feedback | trace/thread-linked feedback used as learning evidence |

Cheapest proof first: pure/unit assertion → targeted eval → integration → E2E.

## Reproducibility

For any eval used to compare or gate a change, record enough identity to reproduce the result:

```text
exact git SHA
agent ID/config version
model/provider
Mastra package family
dataset ID + dataset version
scorer/rubric version
important runtime flags
```

Where supported, pin the agent version and dataset version in experiments. Current Mastra experiments support versioned datasets and agent-version association; use those features instead of comparing unnamed ad-hoc runs.

A score without the evaluated artifact/config identity is weak evidence.

## Build datasets from real failures

Prefer regression cases derived from actual iPix/Lumina bugs and operator journeys:

- all required inputs present → correct tool called without unnecessary question;
- missing required input → asks rather than invents;
- ambiguous request → asks/returns candidates rather than choosing unsafe certainty;
- plausible wrong tool must not be selected;
- trusted reference missing → no invented shot angle/reference;
- browser tries foreign org/brand/shoot context → ignored/denied by server boundary;
- operator says "save" without approved artifact → no durable write;
- stale approval/revision → no continuation;
- irrelevant request → planning tools not called;
- provider/tool failure → no stale-success response.

## Threshold discipline

Do not invent precision from a tiny dataset. Before making a scorer a hard CI gate:

1. inspect false positives/false negatives;
2. establish a representative dataset;
3. document the threshold/rationale;
4. rerun enough times to understand model variance where applicable;
5. keep deterministic safety gates independent.

A regression score may inform review even when it is not stable enough to block every PR.

## Human feedback

Human feedback is valuable for dataset curation and product learning, but it is not automatic permission to mutate prompts, policies, Brand Brain truth, approvals, or production state.

When linking feedback to traces/threads:
- store only the minimum identifiers needed;
- apply current tenant/privacy rules;
- redact sensitive customer/brand payloads before exporting to external observability/eval systems;
- do not include secrets or auth headers in feedback metadata.

## CI strategy

Fast PR CI should favor deterministic tests and a small stable eval set. Expensive/non-deterministic broader experiments should run only when they materially improve confidence (for example model/prompt/tool-routing changes), not on unrelated documentation changes.

Never mark an agent change Done because one scorer average improved. Review per-case failures and ensure no safety/authorization contract regressed.

## Current official references

- https://mastra.ai/docs/evals/overview
- https://mastra.ai/docs/observability/overview
- https://mastra.ai/blog/introducing-datasets
- https://mastra.ai/blog/mastra-experiments
- https://mastra.ai/ai-agent-observability
