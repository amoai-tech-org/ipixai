# GitHub Actions development and troubleshooting standard

Use GitHub Actions as the shared, reproducible proof layer after local checks and before merge. Local execution can shorten feedback loops, but remote GitHub-hosted CI remains authoritative unless the task explicitly certifies a different runner.

## Workflow trigger roles

| Trigger / workflow type | Best use |
| -- | -- |
| `pull_request` | normal PR verification; build, test, security, E2E, review gates |
| `push` to `main` | prove merged main and catch merge-only regressions |
| `workflow_dispatch` | manual diagnostics, expensive suites, preview certification, recovery runs |
| `schedule` | drift, dependency, security, synthetic, or periodic production checks |
| reusable `workflow_call` | centralize repeated setup/test logic without copy/paste |
| matrix jobs | versions, OS/browser/runtime combinations only when compatibility risk justifies them |

Use `merge_group` only if iPix adopts GitHub Merge Queue; do not add the trigger before that workflow is actually enabled.

## Development loop

```text
local targeted proof
→ optional local workflow reproduction
→ push branch
→ pull_request CI
→ inspect failing job/step/artifact
→ reproduce smallest failure locally
→ fix + targeted proof
→ push new head
→ exact-head CI
→ merge
→ push/main CI + post-merge proof
```

Do not use a full Actions rerun as the first debugging step when one failed test can be reproduced directly.

## Failure triage

When a workflow fails:

1. Record workflow name, job, step, run ID, and tested head SHA.
2. Read the first meaningful error, not only the final exit code.
3. Download/use artifacts when they contain Playwright reports, traces, screenshots, logs, or generated reports.
4. Classify the failure: code regression, test regression, environment/config, dependency/service, flaky/race, quota/external provider, or CI-only workflow defect.
5. Reproduce the smallest failing command locally when safe.
6. Load the owning domain skill/MCP before changing architecture or external-integration code.
7. Fix the root cause, rerun the smallest test, then rerun the affected workflow/job.

GitHub supports rerunning all jobs, failed jobs, or a specific job; use debug logging only when normal logs do not identify the cause.

## Concurrency and cost

Use workflow/job `concurrency` when newer runs make older ones irrelevant, especially PR CI or shared preview/deployment environments. Cancel stale runs rather than spending time debugging an obsolete SHA.

Use matrices only for a real compatibility axis. iPix should not multiply jobs across browsers/OS/runtime versions without an acceptance criterion or verified risk.

Cache dependency/tool downloads when deterministic and safe, but never treat a warm-cache pass as proof that a clean install works. CI must retain at least one lockfile-based clean-install path (`npm ci`).

## Local GitHub Actions / Ubuntu Workshop

Use local Actions execution only when it materially shortens diagnosis of a CI-specific problem.

Good cases:
- reproduce a workflow-only failure that does not occur with the direct command
- inspect files/logs interactively after a failing job
- test runner-specific tooling or service-container behavior
- iterate on workflow YAML without burning many remote runs
- use unusual/expensive hardware intentionally

Do not make local Actions a mandatory gate for ordinary feature work. Direct local commands are faster and clearer for Vitest, typecheck, build, Playwright, SQL fixtures, and most iPix failures.

If Ubuntu Workshop is adopted, prefer an isolated workshop/self-hosted runner with a dedicated label and `workflow_dispatch` input so normal GitHub-hosted CI remains unchanged. Guard secrets carefully; self-hosted/local runners can access repository secrets and expose local environment details. Refresh/clean the environment between jobs when reproducibility matters.

Recommended iPix policy:

```text
Direct local tests = default developer loop
GitHub-hosted Actions = merge authority
Ubuntu Workshop/local runner = optional CI-debug accelerator
```

Do not replace GitHub-hosted exact-head PR CI with a developer machine pass.
## Workflow quality and security

- Pin third-party actions to reviewed commit SHAs for security-sensitive or production CI; use Dependabot/Renovate-style updates rather than floating blindly.
- Set the smallest required `permissions` at workflow/job scope. Default to `contents: read`; grant write/token permissions only to the job that needs them.
- Never echo secrets, tokens, signed URLs, or full sensitive environment dumps. Scope secrets to the smallest step/job and avoid passing them to checkout/install steps unnecessarily.
- Add `timeout-minutes` to long jobs so hung browsers, service containers, or external APIs cannot consume runners indefinitely.
- Prefer immutable lockfile installs (`npm ci`) and pinned tool versions for reproducible gates.
- Treat external-provider/network failures separately from product regressions; retry only where the failure mode is genuinely transient and bounded.
- Avoid executing untrusted PR code via `pull_request_target` when secrets or write-capable tokens are available; prefer safer event/workflow designs.
- Prefer OIDC/short-lived cloud credentials over stored long-lived cloud keys where supported.
- Use GitHub Environments and required approvals for production deployments when deployment policy requires them.
- Never cache secrets, generated auth state, or credential-bearing files.

## Job design

Prefer several purpose-specific jobs over one opaque mega-job when the separation improves diagnosis. A failing job name should tell the agent which boundary broke: build, Playwright, Supabase ACL, migration replay, Cloudinary webhook, planner concurrency, etc.

Use job dependencies (`needs`) only for real ordering/data dependencies. Independent verification should run in parallel.

Use `if:` deliberately. A skipped required check is not equivalent to a pass. When path filters or conditional jobs are used, verify that protected-branch requirements cannot be left permanently pending or silently bypassed.

Keep the cheapest/highest-signal checks early where possible:

```text
static / targeted unit
→ typecheck
→ integration / SQL contracts
→ build
→ browser/E2E
→ live/external synthetic
```

Fail fast on deterministic blockers; do not spend quota on downstream expensive jobs after a required prerequisite has already failed.

## Artifacts, logs, and observability

Upload artifacts that shorten diagnosis, not every generated file. Good iPix examples: Playwright HTML report, traces/screenshots, SQL/security reports, migration replay logs, and compact JSON summaries.

Use short retention for transient CI artifacts unless audit requirements need longer retention. Never upload `.env`, auth storage state, secrets, tokens, raw provider credentials, or sensitive production payloads.

For browser jobs, preserve trace/screenshot/video only on failure or first retry unless a task specifically needs continuous capture. For workflow failures, inspect artifacts before rerunning the suite from scratch.

If normal logs are insufficient, enable step/runner debug logging for the diagnostic rerun, then disable it; verbose logs can expose more environment detail and create noise.

## Rerun and flaky policy

Never use reruns to convert an unknown failure into green without explanation.

```text
first failure
→ inspect logs/artifacts
→ classify deterministic vs transient vs flaky
→ reproduce smallest case
→ fix or document verified transient cause
→ rerun failed job only
→ if code changes, verify the new exact head from scratch
```

A test that fails then passes on retry is `FLAKY`, not clean. Critical auth, tenant-isolation, approval/save, and task-specific P0 journeys should fail the merge gate until the flake is understood or explicitly waived with evidence.

Do not increase retries to hide instability. Use retries as diagnostic evidence; reduce shared-state races through isolated accounts/data, deterministic setup, one worker where required, and narrower external dependencies.

## Exact-head merge gate

Before recommending merge, record the PR head SHA and verify that every required check and review applies to that exact head. An earlier green run does not certify a newer commit.

Required evidence:

- PR head SHA
- required workflow/check names
- conclusion for each required check
- any flaky/retry status
- unresolved review-thread count
- preview certification result when deployment-sensitive behavior changed

After any push, repeat the exact-head gate. After merge, verify the intended commit is present on `origin/main` and use the `push: main` run plus runtime/domain proof as post-merge evidence.

## CI maintenance rule

When repeated failures show the workflow itself is defective, fix the CI contract as its own owned concern instead of layering product-code workarounds around it. Record the failure pattern, smallest reproduction, affected jobs, and why the workflow change is safe.

Do not refactor working CI merely for style during an unrelated feature PR. Reusable workflows/composite actions are appropriate when duplication is causing real drift or maintenance cost, not as a default abstraction exercise.

## Agent prompt

```text
Use GitHub Actions as shared exact-head proof, not as the first debugging tool. For the current PR, identify which workflows/jobs actually apply, inspect the tested head SHA, and review failed jobs from the first meaningful error plus artifacts. Reproduce the smallest failing command locally when safe, classify the failure, load the owning domain skill/MCP, fix the root cause, then rerun only the affected job/workflow before broad reruns. Treat retry-pass critical tests as flaky until understood. Verify permissions, secrets scope, action pinning, timeouts, concurrency, clean installs, artifacts, and skipped-required-check risks when workflow code changes. Report the exact run/job/step/SHA evidence before calling CI green.
```
