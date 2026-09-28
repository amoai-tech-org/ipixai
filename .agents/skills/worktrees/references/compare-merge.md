# Comparing and merging between worktrees

All worktrees share one repository, so you can diff files directly, cherry-pick any commit, and selectively pull changes from one worktree/branch into another. Read [../SKILL.md](../SKILL.md) first for setup and cleanup.

## Table of contents

- [Compare](#compare)
- [Take a single file from another branch](#take-a-single-file-from-another-branch)
- [Take partial changes (specific hunks)](#take-partial-changes-specific-hunks)
- [Cherry-pick commits](#cherry-pick-commits)
- [Selective merge strategies](#selective-merge-strategies)
- [Pre-merge review and cleanup](#pre-merge-review-and-cleanup)

## Compare

Worktrees are just directories — diff them directly, or use `git diff` across branches from any worktree:

```bash
diff -u ../project-main/src/app.js ../project-feature/src/app.js  # one file
diff -r  ../project-v1/src ../project-v2/src                        # whole dir
diff -rq ../project-v1/ ../project-v2/                              # which files differ (summary)

git diff main..feature-branch -- src/app.js   # branch-level, works from any worktree
git diff --stat main..feature-branch          # change statistics
code --diff ../project-main/src/app.js ../project-feature/src/app.js  # visual
```

Binary files report "differ" without content; permission changes show in the diff.

## Take a single file from another branch

```bash
git checkout feature-branch -- path/to/file.js          # whole file from a branch
git checkout abc1234 -- path/to/file.js                  # whole file from a commit
git checkout feature-branch -- src/a.js src/b.js         # multiple files

# git 2.23+ equivalent
git restore --source=feature-branch -- path/to/file.js
```

## Take partial changes (specific hunks)

```bash
git checkout -p feature-branch -- path/to/file.js   # interactive per-hunk
git restore -p --source=feature-branch -- file.js   # 2.23+ equivalent
```

Per-hunk prompt keys: `y` apply · `n` skip · `s` split smaller · `e` edit · `q` quit · `a` apply rest · `d` skip rest.

## Cherry-pick commits

Commits are shared across all worktrees, so any commit hash is reachable:

```bash
git log feature-branch --oneline      # find the hash
git cherry-pick abc1234               # one commit
git cherry-pick abc1234 def5678       # several
git cherry-pick abc1234^..def5678     # a range
git cherry-pick --no-commit abc1234   # stage only, don't commit
```

## Selective merge strategies

Pick the lightest strategy that does the job.

| Strategy | Use when | Command |
|----------|----------|---------|
| Selective file checkout | Need complete file(s) from another branch | `git checkout <branch> -- <path>` |
| Interactive patch | Need only some hunks of a file | `git checkout -p <branch> -- <path>` |
| Cherry-pick + selective stage | Need a commit minus some of its changes | `git cherry-pick --no-commit` then unstage |
| Manual merge | Full branch merge with control | `git merge --no-commit <branch>` then review |
| Multi-source | Different files from different branches | repeated `git checkout <branch> -- <path>` |

### Cherry-pick minus unwanted files
```bash
git cherry-pick --no-commit abc1234
git reset HEAD -- unwanted.js && git checkout -- unwanted.js
git commit -m "Cherry-pick selected changes from abc1234"
```

### Manual merge with selection
```bash
git merge --no-commit feature-1
git status
git reset HEAD -- file-to-exclude.js && git checkout -- file-to-exclude.js
git commit -m "Merge selected changes from feature-1"
```

### Combine files from multiple branches
```bash
git checkout feature-auth -- src/auth/login.js
git checkout feature-api  -- src/api/endpoints.js
git commit -m "feat: combine auth + API work from feature branches"
```

## Pre-merge review and cleanup

Review before pulling changes in, then tidy up:

```bash
git diff --stat feature..main          # what would change
git diff feature..main -- src/module.js
# ...do the selective merge...
git worktree remove ../project-feature # clean up the source worktree when done
git worktree prune
```

Ensure the destination working tree is clean before merging — uncommitted changes cause avoidable conflicts. If conflicts occur, resolve `<<<<<<<` markers, `git add` the files, then commit.
