---
name: ci-review
description: Review iPix GitHub Actions workflows and verification scripts for trust-boundary, permissions, secret, exact-head, and false-green regressions. Use whenever a workflow file, a CI gate, a required check, a production-release job, or a `scripts/*.mjs` verification script is added, changed, or reviewed — and whenever a test could pass without proving the behaviour it claims. Also reach for it when workflow permissions, secrets, or a trust boundary are touched, even if the request never mentions CI or Actions.
metadata:
  owner: IPI-1246
  impact: HIGH
---

# iPix CI PR Review

Material invariants:
- Untrusted PR-head code must not execute with privileged secrets unless explicitly sandboxed and proven safe.
- Reviewer policy/helpers execute from trusted base or an immutable pinned action/workflow.
- Actions and reusable workflows are pinned immutably where security-sensitive.
- Use least-privilege permissions; do not widen `GITHUB_TOKEN` without a concrete requirement.
- Same-repository/fork/bot gates must match secret exposure design.
- Required checks must fail closed on missing, malformed, stale, or spoofed evidence.
- A green orchestration job is not enough; exact-head result verification must prove the expected artifact/comment/check exists.
- Avoid mutable production workflow references such as `@main`.

For workflow changes, parse YAML and run deterministic contract tests in addition to ordinary type/unit tests.
