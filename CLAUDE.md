# iPix Claude Instructions

`AGENTS.md` is the canonical repository-wide agent contract. **Follow it first.** This file is a Claude-specific overlay: it carries Claude-only detail only, and it must not restate or override repository-wide rules. If the two ever disagree, `AGENTS.md` wins and this file is the bug.

Precedence is defined once, in `AGENTS.md` § Precedence: user chat → closest `AGENTS.md` → root `AGENTS.md` → this file → domain skills and other prose.

## Goal

Build iPix as an AI-native operating system for fashion brands.

Optimize for:
1. User value
2. Simplicity
3. Reliability
4. Security
5. Development speed
6. Reuse
7. Maintainability
8. Measurable business value

## Where everything else lives

These topics were previously restated here. They are repository-wide rules, so they live in `AGENTS.md` only — read them there, and change them there. A second copy in this file is drift, not documentation.

| Topic | Canonical location |
|---|---|
| Task and PR lifecycle, task structure, progress, post-merge | `AGENTS.md` § Canonical engineering workflow; `.claude/skills/tasks/SKILL.md` |
| Cheapest-safe-path ordering | `AGENTS.md` § Fastest safe path |
| Diagram reasoning gate and its defect checklist | `AGENTS.md` § Mermaid reasoning; `.claude/skills/mermaid-diagrams/SKILL.md` |
| Source-of-truth tiers | `AGENTS.md` § Source of truth — higher wins |
| Ownership, authorization, and tenant boundaries | `AGENTS.md` § Architecture boundaries |
| Human-in-the-loop for consequential actions | `AGENTS.md` § AI governance |
| Linear state, templates, relations, issue naming | `AGENTS.md` § Linear task execution and § Linear template routing |
| Proof order, `npm test` vs `npx vitest run`, completion claims | `AGENTS.md` § Testing instructions and § Completion claims |
| PR rules and merge authority | `AGENTS.md` § PR instructions and § Merge authority |
| Reuse before custom | `AGENTS.md` § Reuse before custom |
| Secrets and Dotenvx | `AGENTS.md` § Secrets / Dotenvx |
| Local database safety, including the broken `supabase start` path | `AGENTS.md` § Supabase safety |
| Graphify | `AGENTS.md` § Setup commands; `.claude/skills/graphify/SKILL.md` |

`task-verifier` independently challenges what remains unproven, at the risk-matched depth. It does not become a second implementation lifecycle.

## Claude Code built-in accelerators

Reuse Claude Code's bundled skills instead of rebuilding equivalent orchestration:

- `/code-review` — focused independent code/diff defect review.
- `/run` — launch and drive the real application.
- `/verify` — prove changed behavior against the running application.

They produce evidence. They do not replace `tasks`, domain skills, CI, or `task-verifier`.

### Open follow-ups (IPI-1185)

This repository has **no generated build/start/run recipe skill** — nothing under `.claude/skills/` or `.agents/skills/` matches one — so `/run` and `/verify` currently improvise the recipe each time. From clean current `main`:

1. use the Claude-provided `skill-creator` skill to record the real iPix build/start/run recipe as a project skill;
2. review and verify the generated recipe before committing it in a small follow-up PR;
3. use the same `skill-creator` workflow to find unused or high-context skills and tune descriptions/visibility.

There is **no `/run-skill-generator` and no `/skill-doctor` command in this repository** — `.claude/commands/` holds only `explain`, `fastest`, `pr`, and `pr-audit`. Do not plan around them; `skill-creator` is provided by the agent environment, not by this repo.

These are **outstanding**, not historical. They were written as "after PR #106 merges"; PR #106 merged on 2026-09-09, so that trigger is spent and the work is simply unstarted. Track it in Linear rather than re-deriving it from this note.

## Skill authoring

Prefer `.claude/skills/<name>/SKILL.md` for reusable procedures. `.claude/commands/` files are compatibility shims only when an equivalent project skill exists.

For any skill whose purpose is to change what the model decides or does — rather than to produce an artifact or answer a lookup — keep realistic prompts in that skill's own `evals/evals.json` (for example `.claude/skills/pr/evals/evals.json`) and compare a changed skill against the previous version before claiming the rewrite is better. That criterion is deliberately behaviour-based: a skill that changes decisions needs test prompts, while a purely descriptive or subjective one gets no value from assertions. Vendored skills are exempt — their evals belong upstream, not in a local edit the next sync discards. Keep trigger conditions in the skill description, keep `SKILL.md` concise, and move detailed material into supporting references/scripts when needed.

Side-effecting skills must require explicit user invocation or an equally strong human approval boundary. In particular, `/pr` is user-controlled and bare `/pr` is read-only; commit/push requires explicit `/pr ship`.

Skill homes and the one-real-copy rule are defined in `AGENTS.md` § Code style — `.agents/skills/` is the canonical tree for shared skills; many existing skills remain under `.claude/skills/` until migrated.

## Secrets / Dotenvx — Claude launch rules

`AGENTS.md` § Secrets / Dotenvx is the repository source of truth; this section adds only the Claude launch boundary.

When Claude needs credentials, launch it with `npm run agent:claude`. If a required credential is missing from `.env.agent`, stop and ask the user to add the named key to `.env.agent` or its provider-managed owner; never request or paste the secret value into chat.

## Response style — Claude-specific delta

`AGENTS.md` § Explain owns the response contract. This section adds only the parts Claude needs spelled out:

1. **Plain English first.** 1–2 sentences, no unexplained jargon.
2. **A real iPix example when it clarifies the point** — a lookbook, Matching, a shoot, Brand Hub, the asset/Cloudinary pipeline, a real file or PR from this repo. Skip this only when the answer is already simple enough that an example would just repeat it.
3. **Then the technical detail** — the actual mechanism, file, or command.

Worked example: not "implemented conditional rendering to prevent layout shift", but "if a model photo fails to load, we swap in a placeholder card the same size instead of leaving a gap — like a lookbook page that never leaves an empty frame. Tech: `showImage ? <img> : <User>` with `useState` onError."
