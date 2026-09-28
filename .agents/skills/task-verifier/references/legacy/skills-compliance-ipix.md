# Skills compliance — iPix (Phase 5b)

**Parent:** [../../SKILL.md](../../SKILL.md) · **Inventory:** [`index-skills.md`](../../../index-skills.md) · **Map:** [`tasks/intelligence/ai/skill-map.md`](../../../../../tasks/intelligence/ai/skill-map.md)

Run **after** Phase 1 (source-of-truth), **before** Phase 4 (scope). Fail closed on 🔴 MUST violations.

## Harness note

If `Skill("ipix-supabase")` or any hub returns **Unknown skill**, `Read` `.claude/skills/<slug>/SKILL.md` directly — directory on disk is authoritative.

---

## Step 1 — Declare required skills

Parse in order; merge deduped:

| Source | Where to look |
|--------|---------------|
| Frontmatter | `skill:` / `skills:` on IPI md or task file |
| SCR / DESIGN V2 | `### 2. Skill routing` table — rows with ✅ in "This screen" |
| skill-map | Row for task ID in [`skill-map.md`](../../../../../tasks/intelligence/ai/skill-map.md) |
| Path heuristic | `app/**` → `nextjs-developer`; `supabase/**` → `ipix-supabase`; DC HTML → `design-to-production` |

Split **required** (✅ / explicit in map) vs **optional** (— / "if Client").

---

## Step 2 — Exist on disk

```bash
SLUG="<fill-in-skill-slug>"
test -f ".claude/skills/${SLUG}/SKILL.md" && echo OK || echo MISSING
```

| Result | Severity |
|--------|----------|
| Required skill missing | 🔴 |
| Optional missing | 🟡 |
| Symlink to `archive/` (e.g. `design-md`) | 🟡 — prefer canonical path in task text |

Cross-check [`index-skills.md`](../../../index-skills.md) 🔴 **Degraded** column — if sole authority skill is degraded, flag before Done.

---

## Step 3 — Load proof (not checkbox-only)

At least one of:

- PR body / Linear comment cites skill + section used
- Verification report quotes MUST probes from skill
- Agent log shows `Read` of skill file this session

Checkbox ✅ in SCR table **without** load proof → 🟡 (execution); 🔴 if MUST audit fails.

---

## Step 4 — MUST audit (per changed paths)

Probe only skills whose domain touches **changed files** this task/PR.

| Skill | MUST verify | Probe |
|-------|-------------|-------|
| `design-to-production` | Phase 0 tables in issue md | grep "Phase 0" / "Production-state" in spec |
| | RSC default on new pages | `rg "'use client'" <changed-pages>` — justify each |
| | CSS modules / tokens | no raw legacy hex in changed `.module.css` / inline styles |
| | Parity documented | Report ≥75% or gaps listed per design-to-production § scoring |
| `ipix-supabase` | RLS on new tables | migration has `enable row level security` + policies |
| | No service role in client | `rg 'SERVICE_ROLE\|service_role' app/src` on changed files → 0 |
| | Migrations in repo | `ls supabase/migrations/*.sql` matches spec |
| `copilotkit` | v2 imports only | `rg '@copilotkit/react-core/v2' app/src` · no v1 paths |
| `tasks` | One concern per PR | `git diff --stat main...HEAD` — no docs+code mix |
| | Verify matrix in PR | PR body lists commands run |
| `worktrees` | Branch naming | `git branch --show-current` matches `ipi/<id>-*` |
| | Not direct to main | never push feature to `main` |
| `gen-test` | New behavior tested | new/changed logic → matching `*.test.ts(x)` in `app/` |
| `ipix-wireframe` | Wireframe in Linear | Linear description contains `## Wireframe` or ASCII block |
| | Matches local SSOT | diff vs `wireframes/*.md` if SCR task |
| `nextjs-developer` | Server Components default | pages without `'use client'` unless justified |
| | Server Actions for mutations | forms/mutations not raw client fetch to secrets |
| `gemini` | Keys server-only | `rg 'GEMINI_API_KEY\|NEXT_PUBLIC_GEMINI' app/src` → 0 |
| | Edge or Mastra path | AI calls in `supabase/functions/` or `app/src/mastra/` |
| `frontend-design` | `design.md` consulted | UI task references tokens / OperatorPanel patterns |
| `cloudinary` | No raw upload secrets client-side | keys in server/edge only |
| `mastra` | No top-level `getMastra()` in routes | `rg 'getMastra\(\)' app/src/app` — only inside handlers |
| `linear` | Issue state matches work | MCP: not Done while blockers open |
| `infisical` | Secrets not committed | `git diff` — no `.env*` with values |

---

## Step 5 — Forbidden combinations

From skill-map **DESIGN-* UI skill order**:

| Forbidden | Why |
|-----------|-----|
| `nextjs-developer` + `vercel-react-best-practices` on tiny polish | Pick one primary |
| `nextjs-best-practices` (archived) | Do not load — use `nextjs-developer` or `vercel-react-best-practices` |
| Client-side Firecrawl SDK | Use edge + `ipix-supabase` |

Violation → 🟡 unless task explicitly documents exception.

---

## Step 6 — Conflicts

Priority: `CLAUDE.md` > `.cursor/rules/*.mdc` > skill `SKILL.md` > task spec.

If skill and spec disagree, spec is 🟡 until updated; implementation follows higher source.

---

## Skills compliance score (0–100)

| Sub-dimension | Pts | Rule |
|---------------|----:|------|
| All required skills exist | 25 | −25 per missing required |
| skill-map / task agreement | 25 | −10 per undeclared required skill used in code |
| MUST rules probed | 40 | `(passed MUSTs / applicable MUSTs) × 40` |
| No forbidden combos | 10 | −10 per violation |

**Composite (report):** `0.35×spec + 0.40×execution_readiness + 0.25×skills_compliance`

---

## Report table (required in Phase 8)

```markdown
### Skills compliance
| Skill | Required | On disk | MUSTs passed | Failures |
|-------|:--------:|:-------:|:------------:|----------|
| design-to-production | ✅ | ✅ | 4/6 | Phase 0 tables empty |

**Skills compliance score:** 62/100
```
