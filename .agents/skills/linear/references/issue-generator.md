# Linear issue generator

Use this reference when generating issue drafts, not necessarily creating actual Linear issues.

## Inputs

- User request.
- PRD or spec.
- Linear issue ID.
- Existing `docs/linear/issues/IPI-*-*.md`.
- Diagrams or wireframes.
- Research notes.
- Acceptance criteria.
- Existing project/initiative context.

## Output

Return a ready-to-paste Linear issue with:

```markdown
# Title

**Track:** platform | commerce | UI | DNA | AI
**Project:** project name
**Initiative:** initiative name
**Priority:** urgent | high | medium | low
**Estimate:** optional

## In plain terms
One or two sentences.

## Blocked by
Known blockers.

## Unblocks
Known downstream work.

## Description
What needs to be done and why it matters.

## Acceptance criteria
- [ ] Observable outcome 1 — proof
- [ ] Observable outcome 2 — proof

## Implementation notes
- Relevant files or systems
- Dependencies
- Non-goals

## Verify
- [ ] Relevant command or evidence
```

## Rules

- Write concrete tasks, not user stories.
- Keep one issue to 1–3 days of work.
- Make acceptance criteria observable.
- Include proof expectations.
- Include out-of-scope items when scope creep is likely.
- Quote user feedback directly when available.
- Do not create actual Linear issues unless the user asks.
- Search for duplicates before creating.

## Sub-issue breakdown

Use sub-issues when a parent issue contains multiple independent workstreams.

Good sub-issue titles:

```text
Add brand profile schema
Create brand intelligence edge function
Wire dashboard brand profile form
Add RLS coverage for brand profiles
Add verification tests
```

Bad sub-issue titles:

```text
Backend stuff
Frontend stuff
Fix everything
Research
```

## iPix issue generation

For iPix executable issues, also include:

- Mermaid flowchart or sequence diagram.
- Ordered completion steps `A`, `B`, `C`, `D`, `E`.
- Gantt block with `dateFormat YYYY-MM-DD`.
- Verification block with build/test/Supabase/browser commands.
- Link to `docs/linear/issues/IPI-*-*.md`.

## Quality checklist

Before presenting a generated issue:

1. Is the title a concrete task?
2. Can it be completed in 1–3 days?
3. Are acceptance criteria observable?
4. Does it name relevant files/systems?
5. Does it include verification?
6. Does it avoid vague user-story language?
7. Does it connect to project/initiative when known?
