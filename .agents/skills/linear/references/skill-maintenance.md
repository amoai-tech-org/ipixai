# Skill maintenance best practices

Use this reference when improving this Linear skill.

## Progressive disclosure

The skill has three loading levels:

1. **Metadata:** `name` and `description` in `SKILL.md`. This is the main trigger.
2. **Router:** the body of `SKILL.md`. Keep it short and decision-oriented.
3. **References:** detailed command catalogs, templates, and workflow notes loaded only when needed.

## Description guidance

The description should be pushy enough to trigger on common Linear phrasing:

- Linear issue IDs.
- Project/cycle/initiative/milestone terms.
- Backlog, roadmap, sprint, and status sync terms.
- iPix spec IDs.
- Create/update/search/sync Linear requests.

Avoid vague descriptions like `Manage Linear issues`. Prefer a description that names the concrete work and trigger phrases.

## Reference discipline

- One reference per task.
- Keep references focused.
- Put examples and command catalogs in references, not `SKILL.md`.
- Add a table of contents when a reference exceeds roughly 300 lines.
- Keep iPix-specific rules isolated in `ipix.md`.
- Keep generic Linear Method guidance isolated in `methodology.md`.

## Avoid duplication

When adding new guidance:

1. Check existing references first.
2. Add to the most specific reference.
3. Update the reference index if a new file is added.
4. Update `source-map.md` if old skill content changes.

## Review checklist

Before marking a skill change complete:

- `SKILL.md` has clear trigger description.
- Reference router is current.
- Security rules are present.
- iPix-specific rules are not mixed into generic Linear guidance.
- No Linear secrets or URLs with private tokens are included.
- No obsolete Rails-only implementation workflow remains.
- The skill does not promise to create PRs or commits automatically.

## Test prompts

Useful smoke tests:

1. `Search for the IPI issue about brand intelligence and summarize blockers.`
2. `Generate Linear issues for the PLT-003 spec in docs/linear/issues.`
3. `Create a project plan for the commerce registry work.`
4. `Update the current Linear issue to In Progress and find the right branch name.`
5. `Do not expose my Linear API key; just verify it is configured.`
