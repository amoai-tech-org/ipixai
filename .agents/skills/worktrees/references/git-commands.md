# Git worktree — full command reference

Raw `git worktree` commands for when no native worktree mechanism is available. Read [../SKILL.md](../SKILL.md) first for the decision flow (prefer native tools) and setup/cleanup rules.

## Table of contents

- [Core concepts](#core-concepts)
- [Create](#create)
- [List](#list)
- [Remove / prune / repair](#remove--prune--repair)
- [Move / lock / unlock](#move--lock--unlock)
- [Directory conventions](#directory-conventions)
- [Workflow patterns](#workflow-patterns)
- [Troubleshooting](#troubleshooting)

## Core concepts

| Concept | Description |
|---------|-------------|
| **Main worktree** | The original directory from `git clone` / `git init` |
| **Linked worktree** | An extra directory created with `git worktree add` |
| **Shared `.git`** | All worktrees share one object database — no duplication; commits in one are visible to all |
| **Branch lock** | A branch can be checked out in only ONE worktree at a time |
| **Metadata** | Admin files in `.git/worktrees/` track linked worktrees |

## Create

```bash
# New branch from current HEAD
git worktree add ../project-feature -b feature-x

# Existing local branch
git worktree add ../project-feature feature-x

# New branch from a specific ref (clean base)
git worktree add -b hotfix-123 ../project-hotfix origin/main

# Track a remote branch (pulls/pushes wired correctly)
git worktree add --track -b feature ../project-feature origin/feature

# Detached HEAD for throwaway experiments (no branch to clean up)
git worktree add --detach ../project-experiment HEAD~5
```

## List

```bash
git worktree list              # human-readable
git worktree list -v           # verbose
git worktree list --porcelain  # machine-readable (scripting)
```

Example:

```
/home/user/project           abc1234 [main]
/home/user/project-feature   def5678 [feature-x]
/home/user/project-hotfix    ghi9012 [hotfix-123]
```

Extract from each line: the **path** and the **branch** (in brackets).

## Remove / prune / repair

```bash
git worktree remove ../project-feature        # working dir must be clean
git worktree remove --force ../project-feature # discard uncommitted changes

git worktree prune                 # drop stale metadata after a manual dir delete
git worktree prune --dry-run -v    # preview

git worktree repair                # fix links after a manual move
git worktree repair /new/path      # repair a specific worktree
```

Never delete a worktree with `rm -rf` — it leaves stale metadata; if you already did, run `git worktree prune`.

## Move / lock / unlock

```bash
git worktree move ../old-path ../new-path

git worktree lock --reason "On USB drive" ../project-feature  # prevent pruning
git worktree unlock ../project-feature
```

Lock worktrees on removable/network storage so `prune` doesn't drop them while the drive is detached.

## Directory conventions

Keep worktrees as **siblings** of the main repo, never nested inside it:

```
~/projects/
  myproject/              # main worktree (main/master)
  myproject-feature-x/    # feature
  myproject-hotfix/       # hotfix
  myproject-review/       # temporary PR review
```

Naming: `<project>-<purpose>` or `<project>-<branch>`. Use the short name part, not the full `type/name` branch.

## Workflow patterns

### Feature + hotfix in parallel
```bash
git worktree add -b hotfix-456 ../project-hotfix origin/main
cd ../project-hotfix && git commit -am "fix: critical bug #456" && git push origin hotfix-456
cd ../project && git worktree remove ../project-hotfix
```

### Review a PR without disturbing current work
```bash
git fetch origin pull/123/head:pr-123
git worktree add ../project-review pr-123
cd ../project-review            # run tests, inspect
cd ../project && git worktree remove ../project-review && git branch -d pr-123
```

### Compare implementations side by side
```bash
git worktree add ../project-v1 v1.0.0
git worktree add ../project-v2 v2.0.0
diff -r ../project-v1/src ../project-v2/src
git worktree remove ../project-v1 && git worktree remove ../project-v2
```

### Long-running task in isolation
```bash
git worktree add ../project-test main
cd ../project-test && npm test &   # runs while you keep developing in main
```

### Stable reference checkout
```bash
git worktree add ../project-main main
git worktree lock --reason "Reference checkout" ../project-main
```

### Isolated agent task
```bash
git worktree add -b task-123 ../project-task-123
cd ../project-task-123          # make changes, run tests
cd ../project                   # return; remove when merged
```

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| "Branch is already checked out" | Branch live in another worktree | `git worktree list` → work there or remove it |
| Stale worktree after manual delete | Skipped `git worktree remove` | `git worktree prune` |
| Links broken after moving a dir | Skipped `git worktree move` | `git worktree repair [path]` |
| Worktree on a removed drive | Removable storage detached | `git worktree lock` (temporary) or `git worktree prune` (gone for good) |
| "path already exists" on add | Target dir exists | Remove it or pick another path |
| `remove` refuses | Uncommitted changes/untracked files | Commit/stash, or `remove --force` to discard |
