---
name: worktrees
description: >
  Git worktree isolation workflow for iPix development — when and how to create, use, and clean up
  worktrees for parallel/multi-step work, iPix branch/directory conventions, safety rails (merge
  gate, forensic audit, documentation preservation), and troubleshooting.
---

# Git Worktrees

A git worktree is a second working directory with its own files and branch that **shares the same repository history and remote** as your main checkout. Worktrees let you have several branches checked out at once — edits in one never touch another — without stashing, cloning, or constantly switching branches.

**Core principle:** one worktree per active task. Switch context by changing directories, not branches. A branch can only be checked out in one worktree at a time.

**When NOT to bother:** a quick read of another branch (`git show branch:file`), a one-line fix on a clean tree, or anything where switching branches costs nothing. Worktrees pay off when you have *uncommitted work to protect* or *parallel work to run*.

## Agent Start Gate (required before writing code in an existing worktree)

A real incident: an agent hit a build error that was already fixed on `origin/main` — the local worktree was just 17 commits behind and never got the fix. Before any implementation in a worktree you didn't just create fresh, verify all of the following (or run `npm run worktree:health`, which checks the first two automatically):

- **Not behind `origin/main`** beyond what you're deliberately working from an older base for. `git fetch origin && git rev-list --left-right --count HEAD...origin/main`.
- **No stale known-bad patterns** — e.g. `rg 'from "\.\./\.\./\.\./\.\./config/groq-models\.json"' app/src/lib/ai/provider.ts` (the pre-IPI-428 bug; `worktree-health.mjs` checks this by default).
- **Correct worktree for the task** — `git branch --show-current` matches what you intend to work on.
- **State is clean, or intentionally dirty** — `git status --short`; know what's yours before touching anything.
- **Docs/specs aren't "missing" due to staleness** — if a file exists on `origin/main` but not locally, that means the checkout is stale, not that the doc needs recreating. Verify with `git show origin/main:<path>` before concluding a doc is missing, and never recreate a doc without first fetching/rebasing to confirm it's genuinely absent upstream.
- **`.claude/skills/` gitignore state matches upstream** — `git check-ignore -q .claude/skills/` exiting `0` (ignored) means this checkout predates the skills-tracking rollout (PR #234) and is running an old ignore rule; rebase before assuming local skill edits will ever be trackable. (A plain `grep` against `.gitignore` text would miss commented, negated, or reformatted rules — `check-ignore` asks git the real answer.)

If any check fails: **stop and report it, don't route around it.** Fetching/rebasing is the fix; patching around a stale symptom (like re-adding a "fixed" bug's workaround) just reintroduces the original problem in a new place.

```bash
node scripts/worktree-health.mjs              # gate before starting work (current worktree)
node scripts/worktree-health.mjs --all        # audit every registered worktree
node scripts/worktree-health.mjs --pre-delete  # gate before `git worktree remove` (see Backup before cleanup)
```

## iPix defaults

For iPix work, use a worktree for any **multi-step implementation task** (anything beyond a trivial one-file edit) so the current working tree stays clean. Prefer the native flow (`claude --worktree`, `EnterWorktree`); when creating manually, follow these conventions:

- **Branch:** `ipi/<task-id>-<short-name>` — e.g. `ipi/22-ui-shell`
- **Directory:** `../wt-ipi-<task-id>-<short-name>` (sibling of the repo) — e.g. `../wt-ipi-22-ui-shell`

```bash
# Preferred — repo script (naming, nested guard, .worktreeinclude, npm ci)
npm run worktree:add -- IPI-286 route-aware-sections
cd ../wt-ipi-286-route-aware-sections

# Manual equivalent
git fetch origin main
git worktree add ../wt-ipi-286-route-aware-sections -b ipi/286-route-aware-sections origin/main
cd ../wt-ipi-286-route-aware-sections
# copy env: see .worktreeinclude (or npm run worktree:add does this)
cd app && npm ci && cd ..
```

**Before adding:** `npm run worktree:audit` — check count, orphans, merged/stale trees ([docs/development/worktree-tracker.md](../../../docs/development/worktree-tracker.md)).

**Default validation** — run **in the worktree**, matched to changed paths ([tasks pre-merge-tests](../tasks/references/pre-merge-tests.md)):

| Changed | Commands |
|---------|----------|
| **`app/**`** (most iPix tasks) | `cd app && npm ci && npm run lint && npm run typecheck && npm test` · `npm run build` when routes/config/env/middleware touched |
| **`supabase/**`** | `dotenvx run --convention=nextjs -- npm run supabase:verify` · `dotenvx run --convention=nextjs -- npm run supabase:verify-rls` (+ conditional scripts per matrix) |
| **Legacy `src/**`** (retiring) | `npm run build && npm run test` |
| **Docs-only** | No app build required — still run [forensic audit](references/ipix-ops.md#forensic-audit) |

> Root `package.json` has **no** `lint`/`test`/`build` — those live under `app/`. Pre-push hook runs root typecheck/tests only where configured; **operator PRs gate on `app/` scripts.**

**Hard rules (iPix):**

- **Never push to `main`** — branch `ipi/<id>-<slug>`, PR to `main` only ([CLAUDE.md](../../../CLAUDE.md)).
- **One concern per PR** — split before staging ([tasks](../tasks/SKILL.md)).
- **Forensic verify before Done** — [task-verifier](../task-verifier/SKILL.md) in the worktree.

## iPix safety rails

Always-on guardrails for iPix worktree work. Command recipes for the longer ones live in [references/ipix-ops.md](references/ipix-ops.md).

### Merge gate checklist

Before opening a PR, merging, or flipping a task to Done — all must hold, or it's "looks done" but broken:

- [ ] Area verify matrix green ([tasks pre-merge-tests](../tasks/references/pre-merge-tests.md)) — typically `cd app && lint · typecheck · test` (+ build if applicable)
- [ ] Supabase verify when `supabase/**` touched (`dotenvx run --convention=nextjs -- npm run supabase:verify*`)
- [ ] [Forensic audit](references/ipix-ops.md#forensic-audit) clean — no unexpected dirty or untracked files
- [ ] [Production SHA check](references/ipix-ops.md#production-sha-check) — base is current `origin/main`, local `main` not diverged
- [ ] No leaked dirs in the diff (see Leak guard below)
- [ ] PR scoped to one concern ([PR splitting playbook](references/ipix-ops.md#pr-splitting-playbook))
- [ ] [task-verifier](../task-verifier/SKILL.md) report attached for IPI/SCR ship gates
- [ ] Documentation preservation gate passed; worktree **removed** after merge — [End-of-task removal rule](#end-of-task-worktree-removal-rule)

### Never run blindly

These discard work or rewrite history. **Run the [forensic audit](references/ipix-ops.md#forensic-audit) first** and only proceed once you can name exactly what will be lost:

- `git worktree remove --force` — discards a worktree's uncommitted changes + untracked files
- `git clean -fdx` / `rm -rf` — deletes untracked files (incl. `.env`) / arbitrary trees
- `git reset --hard` — discards working-tree and index changes
- `git checkout -- .` / `git restore .` — discards unstaged changes
- `git branch -D` — force-deletes a possibly-unmerged branch
- `git push --force` — use `--force-with-lease` instead

### Backup before cleanup

Before removing a dirty worktree or running any `--force`/`reset`, preserve the work first:

```bash
git -C <worktree> stash push -u -m "pre-cleanup"        # quickest, reversible
# or capture a patch you can re-apply later:
git -C <worktree> diff HEAD > /tmp/wt-<task-id>.patch
```

Only then `git worktree remove --force`. A 10-second backup beats unrecoverable loss.

> **Clean working tree does not mean safe to delete.** A worktree can be clean and still contain unpushed commits with valuable docs.

**The quieter danger: committed-but-never-pushed commits need no `--force` at all.** A plain `git worktree remove` succeeds fine on a *clean* working tree — but "clean" only means no uncommitted changes, not that the branch's commits exist anywhere else. If you `git add && git commit` a doc/note/fix in a worktree and never push it, the worktree directory can be removed with zero warnings; the commits survive on the branch ref for now, but become truly unrecoverable the moment that branch is later deleted (e.g. a routine "clean up merged branches" pass). Run **`npm run worktree:pre-delete`** before removing any worktree you didn't just finish pushing — it hard-blocks when the current branch has commits `origin/<branch>` doesn't have.

### Documentation preservation gate (mandatory — P0)

Before deleting, resetting, cleaning, or abandoning any worktree, **ask and answer**:

> Are there uncommitted or unpushed docs/audits/plans that should become permanent repo knowledge?

That question is how valuable docs get lost when skipped. **Incident (Jul 2026):** force-removed worktrees dropped untracked `tasks/llm/`, `docs/llm/`, and `Universal-design-prompt-new/` — unrecoverable once the directory was gone.

Run:

```bash
git -C <worktree> status --short
git -C <worktree> ls-files --others --exclude-standard
git -C <worktree> diff --name-only
git -C <worktree> log --oneline origin/main..HEAD
npm run worktree:pre-delete
node scripts/worktree-health.mjs --pre-delete
```

Check especially:

- `*.md` · `*.mdx` · `*.mdc` · `*.csv` · `*.json` · `*.sql`
- `docs/**` · `tasks/**` · `linear/**`
- `.claude/**` · `.@worktrees/**` · `.worktrees/**`
- `README*` · `AGENTS.md` · `CLAUDE.md`
- design packages (e.g. `Universal-design-prompt-new/`)

For every doc/planning/audit file, decide **one of three outcomes** — and record the decision before remove:

1. **Commit it** — if it is useful project knowledge (same concern → task PR; different concern → **split docs-only PR**).
2. **Move it to the canonical docs/tasks location** — if valuable but in the wrong place; then commit.
3. **Delete it intentionally** — only if generated junk, duplicated, stale, or unsafe (explicit confirmation).

Never delete a worktree until this decision is recorded for every flagged file.

If unsure, preserve first in a `ipi/docs-preservation-<slug>` branch or PR. **Losing useful docs is worse than carrying a small preservation PR.**

Never `git worktree remove --force` while untracked docs remain unless the user explicitly waives a named path list in the session.

Full playbook → [references/ipix-ops.md#documentation-preservation-gate](references/ipix-ops.md#documentation-preservation-gate).

### End-of-task worktree removal rule

When a task is complete, merged, abandoned, or no longer active, **remove its worktree**. A completed worktree should not remain on disk "just in case." Each tree typically holds **1–3 GB** (`node_modules`, `.next`, caches) and traps the next agent (stale code, `git worktree list` noise).

Before removal:

1. Confirm the PR is merged or the branch is intentionally abandoned.
2. Run the [documentation preservation gate](#documentation-preservation-gate-mandatory--p0).
3. Run `npm run worktree:pre-delete`.
4. Remove the worktree with `git worktree remove <path>` (no `--force` unless backup + gate complete).
5. Run `git worktree prune` · `git branch -d ipi/<task>-<slug>` after merge · `npm run worktree:audit` (target ≤ ~3–4 active trees).

Do not keep unused worktrees. They waste disk space, create stale branches, and cause agents to work from old code.

If the user says "keep the worktree for follow-up", record **why** and a **remove-by date** in the PR or Linear comment — default is still remove after merge.

**Agent duty at Phase 5:** [tasks/references/post-merge.md](../tasks/references/post-merge.md) and [task-verifier](../task-verifier/SKILL.md) — run this gate before reporting Done.

### Leak guard

These must be gitignored so they never show as untracked or get committed (`github/` alone is ~1.7 GB of vendored examples):

`.claude/worktrees/` · `.worktrees/` · `github/` · `node_modules/`

```bash
for d in .claude/worktrees .worktrees github node_modules; do
  git check-ignore -q "$d" || echo "$d/" >> .gitignore
done
```

> **iPix today:** all four are gitignored (`.gitignore` root). Re-run the loop above after adding any new top-level scratch/vendor dir — it's idempotent, so it's safe to run before every worktree-heavy session.

### Worktree count guard

Before adding a new worktree, audit existing ones — this repo has drifted past the ~3–4 cap (13+ seen in Jul 2026 audit):

```bash
npm run worktree:audit              # markdown inventory + health score
npm run worktree:audit -- --write    # refresh docs/development/worktree-tracker.md
git worktree list | wc -l
```

If it's high, run the [weekly tidy ritual](references/ipix-ops.md#weekly-tidy-ritual) first (prune stale metadata, delete branches already merged into `origin/main`) rather than adding another on top of the pile. A worktree for a task that's already merged or abandoned is pure confusion risk for the next session that runs `git worktree list`.

### Nested worktree guard

Never create a worktree inside the repo or inside another worktree — that nests checkouts and corrupts `git status`. Before any `git worktree add`:

- Run [Step 0 detection](#step-0-detect-existing-isolation-run-before-creating-anything). If `GIT_DIR != GIT_COMMON`, you're already in a linked worktree — don't nest another; return to the main worktree first.
- Target path must be a **sibling** (`../wt-ipi-…`) or under `.claude/worktrees/` — never a subdirectory of the current repo.

## Decision: how to create the worktree

Try these in order — **prefer the harness's native mechanism over raw git.** Using `git worktree add` when a native tool exists creates phantom state the harness can't track or clean up.

1. **Already isolated?** Detect first (see Step 0). If yes, don't create another.
2. **Claude Code native** — the `EnterWorktree` tool, the `--worktree`/`-w` CLI flag, or a `--worktree`/`--isolation worktree` option on the agent/task tool. This handles placement, branch creation, env copying, and cleanup automatically. Use it.
3. **Raw `git worktree add`** — only when no native mechanism is available (plain shell, CI, non-Claude-Code context). See [references/git-commands.md](references/git-commands.md).

### Step 0: Detect existing isolation (run before creating anything)

```bash
GIT_DIR=$(cd "$(git rev-parse --git-dir)" 2>/dev/null && pwd -P)
GIT_COMMON=$(cd "$(git rev-parse --git-common-dir)" 2>/dev/null && pwd -P)
git rev-parse --show-superproject-working-tree 2>/dev/null   # non-empty ⇒ submodule, NOT a worktree
```

- `GIT_DIR != GIT_COMMON` **and not a submodule** → you are already in a linked worktree. Skip creation; go straight to setup. Report: "Already in an isolated worktree at `<path>` on `<branch>`."
- `GIT_DIR == GIT_COMMON` (or in a submodule) → normal checkout. If the user hasn't already expressed a preference, ask before creating one: *"Set up an isolated worktree so your current branch stays untouched?"* Honor any standing preference without re-asking.

## Claude Code native worktrees

The fastest path. Default placement is `.claude/worktrees/<name>/` at the repo root, on a new branch `worktree-<name>`, branched from `origin/HEAD` (a clean tree matching the remote; falls back to local `HEAD` if no remote).

```bash
claude --worktree feature-auth      # create + start a session in an isolated worktree
claude -w bugfix-123                 # short flag; run in a second terminal for a parallel session
claude --worktree                    # auto-named, e.g. bright-running-fox
claude --worktree "#1234"            # branch from PR #1234 → .claude/worktrees/pr-1234
```

- **In-session:** ask Claude to "work in a worktree" and it uses the `EnterWorktree` tool. It can hop to another worktree under `.claude/worktrees/` by calling `EnterWorktree` with that path; the previous one stays on disk.
- **First-time trust:** run plain `claude` once in the directory to accept the trust dialog before `--worktree` works interactively (`-p` runs skip this).
- **Always add `.claude/worktrees/` to `.gitignore`** so worktree contents don't show as untracked in the main checkout.
- **Base branch:** set `worktree.baseRef: "head"` in settings to branch from local `HEAD` (carries unpushed commits) instead of the clean default `"fresh"`.

### Copy gitignored files (.env, secrets) — `.worktreeinclude`

A worktree is a fresh checkout, so untracked files like `.env` are **not** present. Add a `.worktreeinclude` (gitignore syntax) at the project root; matching files that are *also gitignored* get copied into every new worktree (tracked files are never duplicated):

```text
.env
.env.local
config/secrets.json
```

Applies to `--worktree`, subagent worktrees, and desktop parallel sessions. (Not processed when a custom `WorktreeCreate` hook replaces git behavior — copy configs inside the hook instead.)

### Isolate subagents/parallel agents

Give each parallel agent its own worktree so concurrent edits don't conflict: ask Claude to "use worktrees for your agents", or set `isolation: worktree` in a custom subagent's frontmatter. Each gets a temporary worktree, auto-removed when the agent finishes with no changes. While an agent runs, Claude `git worktree lock`s its worktree so cleanup can't remove it mid-run.

## After creation: make the worktree usable

A fresh worktree has the code but none of the *environment*. Initialize it:

1. **Dependencies** — install per worktree (they don't share `node_modules`/`.venv`):
   ```bash
   [ -f package.json ] && npm install
   [ -f Cargo.toml ]   && cargo build
   [ -f go.mod ]       && go mod download
   [ -f requirements.txt ] && pip install -r requirements.txt
   [ -f pyproject.toml ]   && poetry install
   ```
2. **Untracked config** — if not using `.worktreeinclude`, copy needed `.env`/secret files in by hand.
3. **Port conflicts** — parallel worktrees can't all bind the same dev port. Give each a distinct port (e.g. one runs the app on `3002`, the parallel one on `3003`) or only run one dev server at a time. This is the most common "why is it broken" surprise.
4. **Baseline check** — run the test/build command once so you can tell new breakage from pre-existing. If it fails, report and ask before continuing rather than chasing a bug you didn't introduce.

## Cleanup

**Never `rm -rf` a worktree** — that orphans metadata in `.git/worktrees/`. Use git (or let the native session do it).

- **After every shipped or abandoned task:** run [Documentation preservation gate](#documentation-preservation-gate-mandatory--p0) then [End-of-task worktree removal rule](#end-of-task-worktree-removal-rule). Do not end Phase 5 with a merged task still checked out in a sibling worktree.
- **Native sessions:** on exit, a worktree with no uncommitted changes, untracked files, or new commits is removed automatically (named sessions prompt instead). A dirty worktree prompts keep-or-remove. `-p` runs don't auto-clean — remove manually.
- **Manual:**
  ```bash
  git worktree list                 # see all worktrees + their branches
  git worktree remove <path>        # clean tree required
  git worktree remove --force <path> # discards uncommitted changes
  git worktree prune                # clear stale metadata after a manual delete
  ```
- **Backup first** if the worktree is dirty — see [Backup before cleanup](#backup-before-cleanup). Never `--force` without it.
- **Pre-delete gate** — `npm run worktree:pre-delete` (blocks if the branch has commits `origin/<branch>` doesn't have; see [Backup before cleanup](#backup-before-cleanup)).
- **Weekly tidy ritual** (prune stale branches + merged worktrees) → [references/ipix-ops.md#weekly-tidy-ritual](references/ipix-ops.md#weekly-tidy-ritual).

## Quick reference

| Task | Command |
|------|---------|
| **iPix: add worktree (preferred)** | `npm run worktree:add -- IPI-286 route-aware-sections` |
| **iPix: audit inventory** | `npm run worktree:audit` · `-- --write` updates tracker |
| **iPix: start-work gate** | `npm run worktree:health` (current worktree) · `-- --all` (every worktree) |
| **iPix: pre-delete gate** | `npm run worktree:pre-delete` — run before removing a worktree you didn't just push |
| **iPix: doc preservation + remove** | [Documentation preservation gate](#documentation-preservation-gate-mandatory--p0) → `git worktree remove` |
| Native isolated session | `claude --worktree <name>` |
| Native, from a PR | `claude --worktree "#<n>"` |
| Manual: new branch | `git worktree add ../<proj>-<name> -b <branch>` |
| Manual: existing branch | `git worktree add ../<proj>-<name> <branch>` |
| Manual: from remote | `git worktree add --track -b <branch> ../<p> origin/<branch>` |
| Detached (experiment) | `git worktree add --detach ../<proj>-exp <commit>` |
| List | `git worktree list` |
| Remove | `git worktree remove <path>` (`--force` if dirty) |
| Prune stale | `git worktree prune` |
| Repair after manual move | `git worktree repair` |

Full command set, locking, and troubleshooting → [references/git-commands.md](references/git-commands.md).
Comparing files/commits and selectively merging *between* worktrees → [references/compare-merge.md](references/compare-merge.md).
iPix command playbooks (forensic audit, production SHA check, PR splitting, weekly tidy) → [references/ipix-ops.md](references/ipix-ops.md).

## Best practices for parallel work

| Practice | Why |
|----------|-----|
| One worktree per task; cap active ones at ~3–4 | More directories ≠ more output; coordination cost grows fast |
| Name by purpose (`-review`, `-hotfix`), not ticket noise | `project-review` reads clearer than `project-pr-123` |
| Native tool over raw git when available | Avoids phantom state the harness can't clean up |
| Distinct dev port per running worktree | Prevents silent "address in use" failures |
| Commit or stash before `git worktree remove` | `remove` without `--force` refuses; `--force` discards work |
| Run documentation preservation gate before remove | Untracked `tasks/` / `docs/` / design packages are lost forever on `--force` |
| Remove worktree after PR merge | Orphan trees waste disk (~GB each) and cause doc-loss incidents |
| `/clear` when switching contexts in a long session | Keeps one task's context from polluting another |

## Common mistakes

| Mistake | Fix |
|---------|-----|
| `rm -rf` to delete a worktree | `git worktree remove`, then `git worktree prune` |
| `git worktree add` despite a native tool | Use the native mechanism (Step in Decision) |
| Creating a nested worktree inside another | Run Step 0 detection first |
| Worktree dir tracked by git | Add `.claude/worktrees/` (or your path) to `.gitignore` |
| Same dev port in two worktrees | Assign distinct ports |
| "Branch already checked out" error | A branch lives in one worktree only — `git worktree list` to find it |
| Forgetting deps/env in the new worktree | Install deps + copy `.env` (or use `.worktreeinclude`) |
| Removing a merged worktree without documentation preservation gate | Run [documentation preservation gate](#documentation-preservation-gate-mandatory--p0) first |
| Leaving 10+ worktrees after merge | [Weekly tidy ritual](references/ipix-ops.md#weekly-tidy-ritual) + post-ship remove |

## Non-git VCS

For SVN/Perforce/Mercurial, configure `WorktreeCreate` and `WorktreeRemove` hooks to supply custom create/cleanup logic (the hook replaces git behavior, so `.worktreeinclude` is skipped — copy configs in the hook instead). See the Claude Code hooks reference.
