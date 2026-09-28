---
name: copilotkit-self-update
description: Use when the user wants to update, refresh, diff, or reinstall the CopilotKit agent skills/knowledge. Not for upgrading application dependencies.
version: 1.1.0-ipix
user_invocable: true
argument_hint: ""
---

# Update CopilotKit Skills — iPix safe sync

Current official install command:

```bash
npx skills add CopilotKit/CopilotKit/skills -y
```

Use the interactive form without `-y` when you need to inspect/select individual skills.

## iPix rule: never overwrite the consolidated hub

iPix intentionally keeps one project-aware hub at `.claude/skills/copilotkit/`. Upstream ships separate skills. Refresh by **diff + selective sync**, preserving iPix architecture/security overrides.

```text
fresh upstream inventory
→ map every upstream skill into the hub
→ diff every mapped file/reference
→ sync framework facts and new references
→ preserve iPix overrides
→ verify installed source/types and maintained examples
→ run skill routing checks
```
## Full upstream inventory to check

Do not hardcode only `runtime` and `react-core`. On every refresh, enumerate `CopilotKit/CopilotKit/skills/` and compare **all** directories. Current families include:

```text
a2ui-renderer
channels-setup
copilotkit-agui
copilotkit-channels
copilotkit-contribute
copilotkit-debug
copilotkit-develop
copilotkit-integrations
copilotkit-self-update
copilotkit-setup
copilotkit-upgrade
inspector-docs
inspector-workbench
intelligence-docs
react-core
runtime
```

New or removed upstream directories are a review event. Do not silently ignore them.

## Consolidation map

| Upstream | Local hub destination |
|---|---|
| `copilotkit-setup` | `references/setup/` |
| `copilotkit-develop` | `references/develop/` |
| `copilotkit-integrations` | `references/integrations/` |
| `copilotkit-agui` | `references/agui/` |
| `copilotkit-debug` | `references/debug/` |
| `copilotkit-upgrade` | `references/upgrade/` |
| `runtime` | `references/runtime/` |
| `react-core` | `references/react-core/` |
| `a2ui-renderer` | `references/a2ui-renderer.md` |
| `channels-setup` + `copilotkit-channels` | `references/channels.md` (routing summary; keep both upstream roles distinct) |
| `inspector-docs` + `inspector-workbench` | `references/inspector.md` (optional iPix routing; upstream skills are contributor-focused) |
| `intelligence-docs` | `references/intelligence.md` (capability boundary; upstream skill is contributor-focused) |
| `copilotkit-self-update` | `references/self-update.md` |
| `copilotkit-contribute` | `references/contribute/` |

Generative UI is not currently a standalone upstream skill directory. Keep `references/generative-ui.md` synchronized from the current CopilotKit Generative UI docs/showcase and installed hooks/types.

## Dependency/content conflict rule

When upstream skill text and the maintained app stack disagree, use:

```text
installed package source/types
→ current official maintained example
→ current CopilotKit docs/MCP
→ upstream bundled skill text
```

For iPix specifically, never restore stale Mastra `beta` labels or `--legacy-peer-deps` guidance without proving a real current peer conflict.

## Sync procedure

1. Record upstream HEAD/date and the full `skills/` directory inventory.
2. Record iPix installed CopilotKit/AG-UI/Mastra versions.
3. Diff every upstream skill and its `references/` against the mapped local destination.
4. Copy mechanical upstream additions/changes where they do not conflict with iPix overrides.
5. Reapply/retain iPix rules: tenancy, HITL, source-of-truth order, current repo paths, and architecture boundaries.
6. Re-check `examples/integrations/mastra` and current Mastra docs for integration/version drift.
7. Update routing/evals when new skill families or trigger phrases appear.
8. Search the whole hub for stale `beta`, `legacy-peer-deps`, deprecated API names, old paths, and forced transport flags.
9. Run JSON/Markdown sanity checks and inspect `git diff` before finishing.
10. Start a new agent session after the skill refresh so discovery reloads the updated files.
