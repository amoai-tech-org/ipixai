# CopilotKit Inspector — iPix reference

Inspector is the local web overlay for inspecting shipped CopilotKit behavior such as **Agents, AG-UI Events, Threads, and Learning**.

## iPix use

Use Inspector as an **optional runtime verification/debugging aid** after cheaper proofs (types, targeted tests, route tests). Good examples:

- confirm the planner agent is registered,
- confirm AG-UI events are moving during a real chat turn,
- inspect thread behavior when Intelligence is enabled.

Inspector is not a source of iPix domain truth and does not replace logs, tests, RLS/tenant proofs, or Supabase inspection.

## Upstream skill boundary

The upstream skills are primarily for **CopilotKit repository contributors**, not normal iPix app development:

- `inspector-docs` keeps CopilotKit product docs synchronized with shipped Inspector panes.
- `inspector-workbench` is for editing `@copilotkit/web-inspector` UI itself and requires the standalone visual lab/screenshots.

Do **not** route an ordinary iPix debugging task into those contributor workflows unless iPix is actually changing the CopilotKit Inspector package/docs.

Official upstream:
- https://github.com/CopilotKit/CopilotKit/tree/main/skills/inspector-docs
- https://github.com/CopilotKit/CopilotKit/tree/main/skills/inspector-workbench