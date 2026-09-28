# Known issues

## `/ipix-supabase` / `Skill(skill: "ipix-supabase")` returned "Unknown skill" / "Unknown command"

**Root cause found and fixed (PR #132, 2026-09-12).** Earlier notes in this file (through
2026-07-02) said the cause could not be determined and that direct skill loading remained
broken with no fix available. That conclusion is now stale — superseded by the finding below.

**Cause:** an upstream Claude Code bug, not anything specific to this skill. Claude Code has a
reproduced bug where a skill's frontmatter containing a **top-level `paths` key** makes that
skill undiscoverable — `/ipix-supabase` returns `Unknown command`, and `Skill(skill:
"ipix-supabase")` returns `Unknown skill`. Tracked upstream at
[anthropics/claude-code#49835](https://github.com/anthropics/claude-code/issues/49835)
("Skill with paths frontmatter is completely undiscoverable"), labeled `bug`, `has repro`,
`area:skills`, `reproduced`.

`paths` itself is legitimate Agent Skills frontmatter (Anthropic introduced it for
path-scoped skill activation) — the bug is Claude Code's discovery step choking on it, not
`paths` being an invalid field. Don't describe this as a schema error; it's a discovery bug
with a known workaround.

**Verified workaround:** move `paths` out from the top level into `metadata.paths`. Confirmed
on **installed Claude Code 2.1.268**, isolated A/B test from clean checkouts so the working
tree wasn't touched:

```text
current main (top-level `paths`):
  /ipix-supabase → Unknown command: /ipix-supabase

PR #132 head (paths under `metadata`):
  /ipix-supabase → skill resolves and begins execution
```

**Important — `metadata.paths` is a workaround, not proven path-scoped activation.** Moving
`paths` under `metadata` fixes discovery because the problematic top-level field is gone, not
because `metadata.paths` is known to implement path-scoped activation. A repo-wide search
found no iPix code or Claude Code behavior that reads `metadata.paths` for activation
purposes. Treat it as informational metadata only unless a future Anthropic doc/runtime
change proves otherwise. Since this skill's own description already says "use for ANY
Supabase work in this repo," path scoping isn't load-bearing for correctness here either way.

**How to re-test after a Claude Code upgrade:** once anthropics/claude-code#49835 is closed
upstream, re-run the same A/B check (top-level `paths` vs. `metadata.paths`) on the new
version before restoring top-level `paths` or relying on `metadata.paths` for real path
scoping. Until then, leave `paths` under `metadata` as-is.

**Fallback (defensive only, not the primary path):** if `/ipix-supabase` or
`Skill(skill: "ipix-supabase")` ever regresses again — a future Claude Code change, a
frontmatter edit that reintroduces a top-level `paths`, etc. — reading `SKILL.md` and the
relevant `references/**` file directly still works and unblocks the immediate task. But that
is a stopgap for that moment, not evidence that direct skill loading is broken in general;
re-diagnose via the A/B method above rather than assuming the fallback is required going
forward.
