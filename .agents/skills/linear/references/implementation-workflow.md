# Implementation workflow

Use this reference when a Linear issue is being implemented in code.

## iPix default

For iPix work, use `.claude/skills/tasks/SKILL.md` as the canonical execution contract. Live Linear is the task/progress source of truth; do not require a local issue mirror unless a separate task explicitly owns one.

## Generic workflow

1. **Fetch the issue**
   - Get title, description, status, priority, labels, project, initiative, assignee, and suggested branch name.

2. **Read local context**
   - For iPix: read the live Linear issue and `.claude/skills/tasks/SKILL.md`.
   - Before any Read/Grep/Glob/exploratory Bash codebase exploration, run Graphify when the graph exists and use it to scope the smallest relevant file set.

3. **Move to In Progress**
   - Update Linear state when the user asked you to work on it.

4. **Create or reuse branch**
   - Prefer Linear's suggested branch name.
   - Reuse an existing branch if present.

5. **Plan implementation**
   - Identify affected files, ownership, risks, dependencies, and required proof.

6. **Implement**
   - Follow existing project conventions.
   - Add tests for meaningful behavior.
   - Keep changes scoped to the issue.
   - Do not commit unless the user explicitly asks.

7. **Verify**
   - Use `.claude/skills/tasks/references/pre-merge-tests.md` as the canonical risk-matched matrix.
   - Do not maintain a second fixed command list here.
   - Re-read current `package.json` / CI before naming commands.
   - Run Supabase, browser, build, or live-provider proof only when the changed boundary requires it.

8. **Update Linear traceability**
   - Record meaningful milestones, exact SHA/evidence, blockers, and next action.
   - Move to `Done` only after applicable post-merge proof.

9. **Report**
   - Summarize changes, verification, blockers/follow-up, and exact next action.

## Branch naming

Preferred:

```text
<issue-prefix>/<issue-id>-<short-slug>
```

Use lowercase, hyphens, and no spaces.

## PR creation

Create a PR only when the user explicitly asks. Follow `.claude/skills/tasks/references/github-pr.md` and `review-comments.md` for canonical PR/review behavior.
