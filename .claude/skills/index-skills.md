<!-- GENERATED FILE — DO NOT EDIT. Run `npm run skills:index` after changing `.agents/skills/registry.json`. -->
# iPix skills

Canonical reusable/cross-agent skills live in `.agents/skills/`. `.claude/skills/` is the Claude discovery/compatibility layer; `claude_exposed: true` means the Claude entry must be a symlink to the canonical skill.

Source of truth: `.agents/skills/registry.json`.

## Canonical skills

| Skill | Summary | Owner | Type | Modes | Claude | Delegates to | Do not use for |
|---|---|---|---|---|---|---|---|
| `automate-manual-test-cases` | Convert approved manual test cases into maintainable automated tests. | qa | workflow | `manual-to-automation` | no | `diagnosing-bugs`, `qa-test-code-coverage`, `testomatio` | writing product requirements; debugging unrelated application behavior |
| `brainstorming` | Explore intent, constraints, and design before creative implementation work. | planning | methodology | `design-discovery` | yes | `requirements`, `writing-plans` | executing an already-approved implementation plan |
| `code-review` | Review changed code against repository standards and the requested specification. | engineering-quality | review | `standards`, `spec`, `pr-agent` | yes | `receiving-code-review`, `diagnosing-bugs` | writing implementation plans; automatic merge or approval |
| `codebase-design` | Design or simplify module seams, interfaces, dependencies, and test surfaces. | architecture | workflow | `module-design`, `seam-design` | yes | `domain-modeling`, `writing-plans`, `refactor-plan` | routine small edits with no architectural decision |
| `diagnosing-bugs` | Diagnose hard runtime, performance, and automated-test failures with a tight feedback loop. | engineering | workflow | `general`, `automated-test` | yes | `tdd`, `playwright-cli` | feature planning; requirements discovery |
| `dispatching-parallel-agents` | Parallelize independent tasks that do not share mutable state or sequencing dependencies. | execution | methodology | `parallel-dispatch` | yes | `subagent-driven-development` | shared mutable state; sequential dependencies |
| `domain-modeling` | Clarify iPix terminology, domain ownership, CONTEXT files, and architecture decisions. | architecture | workflow | `glossary`, `ownership`, `adr` | yes | `codebase-design`, `requirements` | routine implementation with no domain ambiguity |
| `explain` | Explain iPix code, errors, PRs, configs, and technical concepts in plain English. | developer-experience | utility | `plain-language` | yes | — | making code changes; deciding product requirements |
| `explorbot` | Run, configure, debug, and plan autonomous Explorbot web testing. | qa-browser | workflow | `fundamentals`, `setup`, `plan`, `explore` | yes | `playwright-cli`, `qa-write-test-cases` | deterministic browser merge gates; static-content-only testing |
| `improve-test-cases` | Improve existing manual test cases for clarity, structure, and TMS readiness. | qa | workflow | `manual-test-improvement` | no | `automate-manual-test-cases`, `testomatio` | writing product requirements; creating automation from scratch |
| `lean` | Audit repository and development-loop speed, context waste, worktrees, and CI feedback time. | developer-experience | audit | `repo-performance-audit` | yes | `refactor-plan` | single-task implementation planning |
| `playwright-cli` | Drive deterministic browser steps and inspect web behavior with Playwright CLI. | qa-browser | utility | `browser-automation`, `deterministic-steps` | yes | `diagnosing-bugs` | autonomous exploratory testing |
| `ponytail` | Write the smallest change that fully works by climbing the lazy-senior-dev ladder before adding code. | engineering | workflow | `general`, `code-review` | yes | — | replacing task or domain skills; skipping validation, security, or required evidence |
| `prima` | Use Prima for higher-level behavioral browser work above Playwright CLI. | qa-browser | workflow | `behavioral-browser` | no | `playwright-cli` | autonomous exploratory testing; browser-free unit tests |
| `qa-automation-test-consolidation` | Find redundant automated tests and consolidation or parameterization opportunities. | qa | review | `dedupe`, `parameterize` | no | `qa-test-code-coverage`, `automate-manual-test-cases` | writing requirements; fixing a specific failing test |
| `qa-data-seeder` | Prepare scoped test data for regular, edge, and negative feature scenarios. | qa | workflow | `seed-test-data` | no | `qa-write-test-cases` | production data changes |
| `qa-explain-behavior` | Explain implemented product behavior, rules, flows, and edge cases from QA evidence. | qa | utility | `behavior-analysis` | no | `qa-write-test-cases`, `qa-review` | authoring product requirements; implementing product code |
| `qa-lead-strategy-advisor` | Assess QA maturity and propose a high-level quality and automation strategy. | qa | advisor | `strategy`, `maturity` | no | `testing-workflow`, `qa-review` | a single tactical testing task |
| `qa-pr-analysis` | Compare PR intent with its actual code diff and identify scope mismatches. | qa | review | `intent`, `diff`, `combined` | yes | `qa-review`, `code-review` | requirements authoring; implementation |
| `qa-review` | Review features, implementations, or PRs for QA risk, edge cases, and negative flows. | qa | review | `feature`, `implementation`, `pull-request` | yes | `requirements`, `qa-explain-behavior`, `qa-write-test-cases` | editing production code; rewriting requirements unless defects are found |
| `qa-split-testing-levels-pyramid` | Place test scenarios at the cheapest sufficient unit, integration, or end-to-end level. | qa | workflow | `test-pyramid` | no | `qa-write-test-cases`, `automate-manual-test-cases`, `qa-test-code-coverage` | writing product requirements |
| `qa-test-code-coverage` | Map manual and automated tests to source files for test-to-code coverage visibility. | qa | workflow | `coverage-map` | no | `qa-write-test-cases`, `setup-ci-automation` | product requirements; runtime performance profiling |
| `qa-write-test-cases` | Create test cases, scenarios, checklists, and test plans from approved behavior. | qa | workflow | `test-cases`, `checklists`, `test-plan` | no | `improve-test-cases`, `qa-split-testing-levels-pyramid`, `automate-manual-test-cases` | product requirements authoring |
| `receiving-code-review` | Validate code-review feedback before applying it. | engineering-quality | methodology | `review-feedback` | yes | `diagnosing-bugs`, `code-review` | blindly applying reviewer suggestions |
| `refactor-plan` | Plan structural migrations where compatibility, sequencing, caller migration, or rollback matters. | planning | workflow | `migration`, `refactor` | yes | `writing-plans`, `resolving-merge-conflicts` | ordinary feature plans with no migration risk |
| `requesting-code-review` | Request focused review when implementation is complete or before merge. | engineering-quality | methodology | `review-request` | yes | `code-review` | self-approving or automatically merging code |
| `requirements` | Define or review Epics, user stories, acceptance criteria, and testable requirements. | product-planning | workflow | `epic`, `user-story`, `qa-review` | yes | `to-spec`, `tasks`, `writing-plans` | no-interview conversation synthesis; implementation planning after requirements are accepted |
| `research` | Investigate questions against high-trust primary sources and capture evidence in the repo. | research | workflow | `primary-source-research` | yes | `requirements`, `writing-plans` | implementation that does not require external evidence |
| `resolving-merge-conflicts` | Resolve merge or rebase conflicts by intent with high-risk verification. | engineering | workflow | `merge`, `rebase` | yes | `code-review`, `diagnosing-bugs` | unrelated refactoring while resolving conflicts |
| `setup-ci-automation` | Inspect existing CI and add or modify automated QA workflows. | qa | integration | `ci-discovery`, `qa-workflow-setup` | no | `testomatio`, `qa-test-code-coverage` | debugging a single existing CI failure |
| `subagent-driven-development` | Execute an implementation plan with independent tasks and staged review. | execution | methodology | `plan-execution` | yes | `dispatching-parallel-agents`, `requesting-code-review` | unclear requirements; tightly coupled work that cannot be isolated |
| `tdd` | Implement features and bug fixes with red-green-refactor discipline. | engineering | methodology | `red-green-refactor` | yes | `diagnosing-bugs`, `requesting-code-review` | documentation-only edits; generated artifacts |
| `testing-workflow` | Route the end-to-end QA lifecycle to the correct specialized testing skill. | qa | router | `test-lifecycle` | no | `requirements`, `qa-explain-behavior`, `qa-lead-strategy-advisor`, `qa-write-test-cases`, `improve-test-cases`, `qa-split-testing-levels-pyramid`, `automate-manual-test-cases`, `qa-test-code-coverage`, `qa-automation-test-consolidation`, `diagnosing-bugs`, `testomatio`, `setup-ci-automation` | high-level QA strategy; non-QA feature implementation |
| `testomatio` | Own Testomat.io reporting, sync, MCP, run, sprint-report, and PR-testing workflows. | qa-integration | integration | `reporting`, `sync`, `mcp`, `runs`, `pr-testing` | yes | `qa-test-code-coverage`, `setup-ci-automation`, `diagnosing-bugs` | generic test design; non-Testomat.io CI |
| `to-spec` | Turn the current conversation into a specification without another discovery interview. | product-planning | workflow | `conversation-to-spec` | yes | `tasks`, `writing-plans` | interactive requirements discovery; implementation execution |
| `writing-plans` | Convert accepted requirements or a specification into an executable implementation plan. | planning | workflow | `implementation-plan` | yes | `refactor-plan`, `subagent-driven-development` | requirements discovery; structural migration plans where compatibility or rollback is load-bearing |

## Consolidated / removed entry points

| Removed entry point | Canonical owner |
|---|---|
| `cloudinary-review` | `cloudinary` |
| `copilotkit-review` | `copilotkit` |
| `debug-fix-failed-flaky-autotests` | `diagnosing-bugs` |
| `epic-requirements-specification` | `requirements` |
| `explorbot-fundamentals` | `explorbot` |
| `explorbot-plan` | `explorbot` |
| `explorbot-setup` | `explorbot` |
| `ipix-task-lifecycle` | `tasks` |
| `nextjs-review` | `nextjs-developer` |
| `pr-agent-code-review` | `code-review` |
| `pr-workflow` | `tasks` |
| `pull-request-diff-analyzer` | `qa-pr-analysis` |
| `qa-e2e-tests-reporting` | `testomatio` |
| `qa-pr-requirements-analyzer` | `qa-pr-analysis` |
| `qa-requirement-reviewer` | `requirements` |
| `qa-review-pr` | `qa-review` |
| `qa-sprint-report-by-testomatio` | `testomatio` |
| `qa-thinking` | `qa-review` |
| `run-tests-with-testomatio-reporter` | `testomatio` |
| `setup-change-aware-pr-testing` | `testomatio` |
| `supabase-review` | `ipix-supabase` |
| `sync-test-cases-with-tms` | `testomatio` |
| `testomatio-mcp` | `testomatio` |
| `write-user-story` | `requirements` |

## Claude-only / iPix-specific discovery skills

These remain real directories under `.claude/skills/` and are outside the canonical `.agents` registry until explicitly migrated.

- `ci-review`
- `cloudinary`
- `copilotkit`
- `fashion-production`
- `graphify`
- `ipix-supabase`
- `ipix-wireframe`
- `linear`
- `mastra`
- `mermaid-diagrams`
- `nextjs-developer`
- `pr`
- `shadcn`
- `task-verifier`
- `tasks`
- `vercel-react-best-practices`
- `worktrees`

## Governance

- One real directory per skill.
- Add or remove canonical skills by updating the registry and the filesystem together.
- `npm run skills:registry:check` validates inventory, delegates, aliases, and Claude symlinks.
- `npm run skills:index:check` fails when this generated index is stale.
- `tests/skill-reference-contract.test.ts` validates canonical skill handoffs/reference files and repository skill paths.
