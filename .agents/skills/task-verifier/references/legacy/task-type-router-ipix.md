# Task-type router — iPix

**Parent:** [../../SKILL.md](../../SKILL.md)

Detect task type **first** (Phase 0). Apply the matching template gate — do not run IPI sections on SCR specs or vice versa.

## Verification depth (Quick vs Full)

Used by [../quick-gate.md](../quick-gate.md) Phase 0. Artifact type (below) selects **template**; this table selects **depth**.

| Task type | Default mode | Minimum checks |
|-----------|:------------:|----------------|
| Production incident / operations | Quick first | logs → runtime endpoint → env/deployment timestamps → remediation |
| Code-fix PR | Quick | diff → targeted tests → relevant skill |
| Docs / tracker update | Quick | scope → links → internal consistency |
| New spec / architecture decision | Full | claims → official docs/MCP → implementation feasibility |
| In Progress → Done | Full | SKILL.md Phases 0–10 + anti-fake-done (all 10 gates) |
| Production release gate | Full | deployment + runtime + rollback evidence |

Override: user says `quick` or `full`. Escalate Quick → Full on 🔴 production blockers, evidence conflicts, or Done/release/security scope.

## Detection

| Signal | Type | Primary artifact |
|--------|------|------------------|
| `IPI-NNN` / Linear URL | **IPI** | `docs/linear/issues/IPI-*.md` + Linear MCP |
| `SCR-NN` / `Universal-design-prompt-new/tasks/` | **SCR** | `tasks/screens/SCR-*.md` + wireframe md |
| `RF-NN` / refactor spine | **RF** | `tasks/refactor/RF-*.md` |
| `BE-*` / `MOB-*` | **BE/MOB** | `tasks/backend/` · `tasks/mobile/` |
| `tasks/core/F*.md` | **Legacy F** | mdeai task file + `tasks/INDEX.md` |
| `tasks/audit/*.md` | **Audit** | audit doc — claims → probes |
| `OCL-*` / `CTI-*` | **Legacy agent** | [legacy-mdeai.md](./legacy-mdeai.md) |

---

## IPI / Linear gate

| Check | Required |
|-------|----------|
| Spec md exists or Linear description complete | ✅ |
| Acceptance criteria with provable commands | ✅ |
| `blockedBy` / dependencies honored | MCP or md |
| Skills per [skill-map.md](../../../../../tasks/intelligence/ai/skill-map.md) | Phase 5b |
| Wireframe in Linear description (UI tasks) | `## Wireframe` section |
| Phase 5b + verify matrix before Done | [tasks pre-merge-tests](../../../tasks/references/pre-merge-tests.md) |
| Evidence path | PR body + `docs/ecommerce/evidence/YYYY-MM-DD/` when user-facing |

**Lifecycle:** [`tasks`](../../../tasks/SKILL.md)

---

## SCR / DESIGN V2 gate

| Check | Required |
|-------|----------|
| Header: ID, Route, Linear link, Dependencies | ✅ |
| `### 2. Skill routing` table | ✅ |
| Definition of Ready checklist | before code |
| Phase 0 — Prove tables filled | 🔴 if empty at implement time |
| Wireframe + diagram paths resolve | `wireframes/*.md` |
| Conversion plan links `design-to-production` | ✅ |
| DoD: lint · test · build · parity report | per SCR-TEMPLATE |

**Do not require** obsolete legacy lifecycle sections on SCR files — that is a false 🟡.

---

## Legacy F* gate

Full §6 template (sections 1–10) · `depends_on:` · `tasks/INDEX.md` sync · [legacy-mdeai.md](./legacy-mdeai.md) probes.

---

## Audit gate

Every factual claim → probe row. Cross-links: `test -f` or `rg` for each `[text](path)`. Score with rubric **Audit** row (link integrity 15 pts).
