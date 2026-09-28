# Linear Method

Use this reference for planning work the Linear way: focus, momentum, manageable scope, and clear ownership.

## Core philosophy

- **Speed through simplicity:** tools should reduce friction, not create bureaucracy.
- **Momentum over perfection:** small daily progress beats perfect plans.
- **Clarity of direction:** every issue should connect to a larger goal.
- **Manageable scope:** if work cannot finish in 1–3 days, break it down.

## Issue writing

Linear issues should be plain-language tasks, not user stories.

### Good title

```text
Add password reset flow
Fix mobile menu overlap on iOS Safari
Add index on users.email for login performance
```

### Bad title

```text
As a user, I want to reset my password
Improve user experience
Build authentication system
```

## Issue description

Use description only when needed. Include:

- What needs to be done.
- Why it matters.
- Acceptance criteria for complex work.
- Direct user feedback quotes when relevant.
- Links to specs, designs, or related issues.

## Issue size

A good issue is completable in 1–3 days.

Break down if it includes:

- Multiple UI views.
- Multiple backend services.
- Schema plus edge plus frontend.
- Research plus implementation.
- Multiple acceptance outcomes.

Combine or skip if it is a tiny tweak that can be done immediately.

## Project structure

Create a project when a feature needs 5–15 issues.

A good project has:

- Clear deliverable.
- Brief spec under roughly 500 words.
- Owner.
- Timeline.
- Success criteria.
- Out-of-scope list.
- Ordered issues.

## Prioritization

Use these questions:

1. Does this block users or current goals?
2. Does this enable the next milestone?
3. What is the smallest version that adds value?
4. What complexity does it add?
5. Can this wait until after launch?

Prioritize blockers and enablers before polish.

## Backlog hygiene

- Feedback is research, not an automatic backlog.
- Archive completed issues and cycles.
- Delete duplicates and wrong ideas.
- Review stale backlog monthly.
- Keep current cycle focused.

## Solo workflow

Daily:

1. Pick 1–2 issues.
2. Move one to `In Progress`.
3. Finish it.
4. Mark `Done`.
5. Create a new issue for discovered work.

Weekly:

1. Review current cycle.
2. Remove or defer low-priority work.
3. Pull the next most important project issues.
4. Write a short changelog if something shipped.

## Anti-patterns

| Anti-pattern | Fix |
|--------------|-----|
| User-story issues | Rewrite as concrete tasks |
| Huge issues | Break into 1–3 day tasks |
| No owner | Assign one owner |
| No timeline | Add a target date |
| Everything in one project | Split into stages |
| Backlog as todo list | Keep only current priorities active |
