# Domain best-practice violation scan

Parent: [`../SKILL.md`](../SKILL.md). Load the owning domain skill first; this file is a verifier checklist, not a substitute for current domain guidance.

Only apply rows relevant to changed paths/ACs.

## Supabase / Postgres / Auth

Load [`../../ipix-supabase/SKILL.md`](../../ipix-supabase/SKILL.md) and its [`references/verification-matrix.md`](../../ipix-supabase/references/verification-matrix.md). This verifier checks **WHAT evidence exists**; `ipix-supabase` owns the SQL/catalog/testing HOW.

- RLS/authorization is server-side for every tenant-owned durable object, with intended allow **and deny** role/tenant cases.
- Grants and RLS are checked independently; function/RPC exposure is intentional and least-privilege.
- UPDATE ownership/reparenting considers both the existing row (`USING`) and resulting row (`WITH CHECK`), plus required SELECT visibility.
- Existing functions/triggers/policies/views are compared with their authoritative installed definitions before modification; no reconstruction from memory/task/reviewer prose.
- `SECURITY DEFINER` use is justified and proves safe search path, qualified object references, ACL intent, and tenant/self-authorization behavior.
- API-facing views either prove `security_invoker` behavior or are unexposed/revoked.
- Migrations fresh-replay from version-controlled history and account for existing rows, nullability, backfill order, locks, forward compatibility, and index/query impact.
- New/repeated write paths prove uniqueness/idempotency/concurrency safety where duplicate execution is possible.
- Service-role/admin credentials never enter client code or untrusted logs.
- Advisors are triaged as evidence; INFO/WARN findings are not blindly fixed or ignored.

## Next.js / UI

- Server/client boundaries match the current Next.js architecture; do not add `'use client'` without need.
- Authorization is not trusted from client state alone.
- Loading, empty, error, forbidden/not-found, retry, and pending/double-submit behavior exist when relevant.
- Back/refresh/navigation preserve or safely reconstruct required durable state.
- User-visible routes work on required desktop/mobile sizes and keyboard/focus behavior when UI changed.
- Mutations fail safely and surface actionable errors instead of silently swallowing partial failure.

## Mastra / CopilotKit / AG-UI

Load [`../../mastra/SKILL.md`](../../mastra/SKILL.md) for implementation HOW. This verifier checks whether the independent applicable proof classes actually exist.

### Registry / model / tool selection

- The intended agent registry key, agent ID, model/provider, tools, workflows and memory are proven from current code/runtime, not stale task prose.
- A direct tool unit test is not accepted as proof that natural-language agent routing selects that tool.
- Positive and negative routing cover `should call`, `should not call`, plausible wrong tool, missing input, ambiguity and invalid/malicious arguments when material.
- Forced `toolChoice` may supplement but cannot replace natural-language routing proof.

### Tool authority / context

- Tool authority is minimum required; tools validate typed input/output and current tenant/domain context.
- Browser/page `org_id`, `brand_id`, `shoot_id`, thread/run IDs and other context claims are server-verified before the model/tool acts on them.
- Wrong agent/tool cannot perform a consequential write merely because the model requests it.
- Credentials/JWTs/service-role/provider secrets do not enter tool input, workflow input, working memory, suspend data, traces or model-visible context.
- `RequestContext` is not treated as authorization by itself; server/domain checks remain authoritative.
- RequestContext fields are minimal and safe for configured tracing/export behavior; no auth headers, session secrets, or unnecessary raw customer/brand payloads.
- External/expensive tools propagate cancellation/`abortSignal` where the product contract requires Stop to end downstream work.

### Memory / persistence

- Message history, working memory, resource ownership and authorization are treated as separate concepts.
- Thread/memory/persistence ownership cannot cross tenants; knowing a thread/run/resource ID is never authorization.
- Persistence claims use a real new process/instance when restart durability is required; same-process re-instantiation is insufficient.
- Working-memory scope is explicit and tested separately from message-history continuity.
- Hosted durability cannot be claimed from local/in-memory fallback behavior.
- Advanced memory features are not added to the critical path without explicit quality/cost/privacy/concurrency proof.

### Workflow / HITL / resume

- Prompt language like "wait for approval" is not treated as enforcement; mandatory approval is code/runtime/server enforced.
- Human approval binds to the exact validated artifact/revision/hash shown to the operator; any mutation invalidates stale approval.
- Review schemas distinguish explicit states such as approved/rejected/revision-requested/cancelled/expired rather than relying on truthy/falsy approval shortcuts.
- Reject/cancel/close/disconnect/timeout/malformed/stale inputs fail closed and cannot accidentally fall back into another suspend/approve path.
- Resume does not materially recompute a different proposal from the one approved unless the workflow creates a new revision and requires renewed approval.
- Resume authorization is server-derived and scoped to the correct actor/org/run/step/artifact.
- External callback/webhook resume validates the expected run and external job/crawl identity and is replay-safe.
- Durable state is not written before required approval.
- Retries/resume/suspend do not duplicate side effects.
- Consequential writes have a domain-level uniqueness/idempotency invariant; UI disablement is not enough.
- Workflow snapshots/suspend payloads are bounded for realistic production inputs; large media/raw crawl/provider payloads are stored in their owning durable system and referenced by stable IDs where practical.
- Snapshot-size optimization never weakens approval immutability: artifact/revision/hash still identifies the exact reviewed content.
- Test duplicate resume, concurrent resume, wrong run/step/tenant, stale revision, approve-vs-reject race, restart before resume, failure after approval, write-success/response-loss retry where applicable.

### Streaming / Stop

- Streaming/runtime errors produce a recoverable user-visible state where applicable.
- Stop/cancel proof follows the chain from UI/request abort through agent/tool/provider cancellation and verifies no later protected side effect.
- Ending SSE alone is not proof downstream work stopped.
- If current runtime intentionally supports only visible-stream cancellation, the limitation is documented and the relevant follow-up owner remains explicit; do not overclaim downstream cancellation.

### Observability / evals

- Trace/eval evidence is tied to the business outcome and exact agent/tool/workflow path rather than generic "success" spans.
- Logs/traces expose enough correlation to diagnose org/user/thread/agent/model/tool/workflow failures without leaking protected content or credentials.
- RequestContext/tracing/export configuration is checked for sensitive-data leakage when context fields change.
- Evals are based on real failure modes such as wrong tool choice, invented inputs, stale references, approval bypass, duplicate side effects and tenant-context misuse.
- Comparative eval evidence records exact git SHA, agent/model/config identity, dataset + dataset version, scorer/rubric version, and material runtime flags.
- A score increase on a different dataset/model/agent version is not accepted as regression proof.
- LLM scorer thresholds used as hard gates have a representative dataset and reviewed false-positive/false-negative behavior; deterministic safety tests remain separate.

## AI-native behavior

When behavior is nondeterministic, verify both positive and negative cases and use repeated trials when one run cannot establish reliability:
- should act / should not act
- should use tool / should not use tool
- correct tool / plausible wrong tool
- correct/invalid/malicious arguments
- approval granted / rejected / absent
- normal / ambiguous / adversarial prompt
- prompt-injection/system-prompt/sensitive-data extraction attempts where relevant
- hallucination/unsupported claim does not trigger a durable action

Explorbot may supplement exploratory browser discovery but is not a mandatory merge gate.

## Cloudinary / media

- Upload/signature/auth path cannot associate media with the wrong org/shoot/product.
- Media-success + DB-failure and DB-success + media-failure states reconcile safely.
- Webhook/callback replay is idempotent and authenticated where supported.
- Transformation/delivery failure has an operator-visible recovery path when business-critical.
- Secrets/signatures remain server-side; timestamps/nonces/validation follow current SDK/vendor contract.

## GitHub Actions / dependencies

- Changed workflows use least permissions and do not expose secrets to untrusted PR code.
- `pull_request_target` does not execute untrusted checkout/code with write tokens/secrets.
- Dependency changes are intentional; lockfile scope is explainable and compatible with installed runtime.
- **When a dependency version changes (direct or transitive lockfile bump), search for known CVEs/security advisories against the new version specifically** — e.g. GitHub Advisory Database / `npm audit` / the package's own release notes for that version — before accepting the bump. A version-pinned search ("`<package> <new-version>` advisory/CVE"), not a generic one, since a vulnerability fixed in the target version should not be flagged and one introduced by it must not be missed.
- Third-party actions/dependencies follow repository pinning/provenance policy.
- Caches/artifacts do not contain auth state/secrets.
- Required checks actually ran on the exact head; skipped/missing checks are not treated as pass.

## Operations / reliability

- External calls have defined timeout/error behavior where the user journey depends on them.
- Retry is safe/idempotent for any side effect.
- Partial failure leaves recoverable, explainable state.
- Logs/health/metrics expose failures without leaking secrets.
- Production-affecting changes define rollback/containment and the signal that triggers it.

## Finding rule

A best-practice violation is a blocker only when it creates a concrete correctness/security/data-loss/required-AC risk. Otherwise classify HIGH/MEDIUM/IMPROVEMENT with evidence. Do not fail tasks for ritual compliance alone.

## Agent prompt

```text
For each changed domain, load the current owning skill and use this checklist to search specifically for correctness, security, tenant, reliability, data-integrity, operational, performance, and maintainability violations. Apply only relevant rules. When a dependency version changed, search for known CVEs/advisories against that specific new version before accepting the bump. For Mastra, identify the independent proof classes that apply and reject false substitutions: tool tests do not prove routing, persisted rows do not prove restart recall, stream closure does not prove abort, and approval booleans do not prove the exact reviewed artifact. For workflow/HITL work also inspect realistic snapshot size and payload retention. For RequestContext/observability changes verify sensitive fields cannot leak through traces/exports. For eval claims require reproducible agent/model/dataset/scorer identity. Tie every finding to a concrete failure mode or evidence gap; do not produce generic best-practice noise.
```
