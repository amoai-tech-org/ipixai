# Linear project management

Use this reference for projects, cycles, initiatives, milestones, and roadmap tracking.

## Hierarchy

```text
Initiative → Project → Issue → Sub-issue
Cycle → Issues assigned to current work window
Milestone → Deliverable date inside a project
```

For iPix work, executable issues should belong to a project, and projects should link to an initiative when applicable.

## Projects

Create a project when work:

- Takes more than one issue.
- Spans more than a few days.
- Needs roadmap visibility.
- Has measurable success criteria.
- Requires coordination across frontend, backend, Supabase, AI, or commerce.

Do not create a project for a single quick fix.

## Project spec

Keep specs brief and outcome-oriented.

```markdown
# Project name

**Timeline:** start → target
**Owner:** name
**Status:** planning | in-progress | paused | completed

## Why
Problem or opportunity.

## What
Deliverable in plain language.

## How
High-level approach and main components.

## Success criteria
- Measurable outcome 1
- Measurable outcome 2

## Out of scope
- Explicit V1 cut
- Explicit future work

## Issues
1. Concrete issue 1
2. Concrete issue 2
```

## Cycles

Use cycles for current execution windows.

Good cycle planning:

- Pull only achievable work.
- Include buffer for review, fixes, and interruptions.
- Review completion at cycle boundaries.
- Move unfinished work without guilt.

Typical cadence: two weeks.

## Initiatives

Use initiatives for high-level work streams over months.

Examples:

- Platform foundation
- AI brand intelligence
- Commerce marketplace
- Operator dashboard
- Launch readiness

Initiatives should explain why the work matters, not list every task.

## Milestones

Use milestones for named delivery targets inside a project.

Examples:

- `Schema ready`
- `Edge function deployed`
- `Dashboard MVP`
- `Beta release`
- `Production launch`

Milestones should have target dates when known.

## Roadmap reporting

A useful Linear roadmap report includes:

- Initiative → project → milestone mapping.
- Current project state.
- Open issues by state.
- Blocked issues.
- Cycle progress.
- Risks and next decisions.

Avoid raw dumps of all issues. Summarize by outcome and risk.

## Common operations

| Task | Pattern |
|------|---------|
| List projects | Filter by team/initiative when possible |
| Create project | Confirm name, owner, initiative, timeline |
| Update project state | Use known state names or IDs |
| Link initiative | Confirm initiative exists |
| Create milestone | Confirm project and target date |
| Report cycle progress | Summarize done/in-progress/blocked/carryover |
