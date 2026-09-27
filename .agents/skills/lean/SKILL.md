---
name: lean
description: >
  Development speed optimizer for Claude Code workflows. Audits a repository and
  development environment to maximize velocity, shrink feedback loops, and cut AI
  context waste. Use this skill whenever the user mentions slow builds, slow CI,
  slow tests, slow Claude responses, "why is this taking so long", repo getting
  bloated, too many files, Claude reading too much, wasted tokens, or any request
  to "speed things up", "optimize the dev loop", "audit the repo", or "run /lean".
  Also trigger proactively when you notice: more than 3 CI roundtrips on a single
  PR, Claude reading >10 files to answer a simple question, builds taking >2min,
  or test suites taking >60s locally. The output is a scored report with ranked
  fixes — always produce it, never just answer in prose.
---

# Lean — Development Speed Optimizer

You are auditing a repository and development environment to maximize developer
velocity. Your job is to find what's actually slow, rank it by impact, and give
the developer concrete fixes — not a lecture.

## How to run the audit

Work through all six audit areas below. For each area, run the relevant commands,
read the outputs, and score it. Collect findings into [`references/report-template.md`](references/report-template.md).

Do **not** read source files speculatively. Use shell commands to measure first,
then read only files that surface as problems.

---

## Audit 1 — Repository health

```bash
# Size and file count
du -sh . --exclude=.git --exclude=node_modules
find . -not -path '*/node_modules/*' -not -path '*/.git/*' -not -path '*/dist/*' \
  -not -path '*/.next/*' -type f | wc -l

# Largest directories (top 20)
du -sh */ 2>/dev/null | sort -rh | head -20

# Largest files (top 20, outside node_modules)
find . -not -path '*/node_modules/*' -not -path '*/.git/*' -type f \
  -printf '%s %p\n' | sort -rn | head -20 | numfmt --to=iec --field=1

# Worktrees
git worktree list

# Stale branches (merged into main, older than 14 days)
git branch --merged main 2>/dev/null | grep -v '^\*\|main\|master\|develop'

# Untracked large files
git ls-files --others --exclude-standard | xargs -I{} du -sh {} 2>/dev/null \
  | sort -rh | head -10
```

**Score this area on:**
- File count outside node_modules/dist/.next: >5000 = problem, >10000 = critical
- Any single directory >500MB outside node_modules = problem
- Worktrees that haven't been used recently (check git log in each)
- Stale merged branches (each one slows `git status`, autocomplete, and CI branch lists)

---

## Audit 2 — Ignore files

```bash
# Check what exists
ls -la .gitignore .claudeignore .cursorignore .dockerignore 2>/dev/null

# What Claude is indexing (approximate)
wc -l .claudeignore 2>/dev/null || echo "NO .claudeignore"

# Patterns missing from .claudeignore that are common noise
for dir in node_modules .next dist out build .turbo .cache coverage \
           graphify-out .mastra __pycache__ '*.log' '*.lock'; do
  grep -q "$dir" .claudeignore 2>/dev/null || echo "MISSING from .claudeignore: $dir"
done

# Check if lock files, generated files, docs are excluded from Claude
grep -E "package-lock|yarn.lock|pnpm-lock|*.generated" .claudeignore 2>/dev/null \
  || echo "Lock/generated files not excluded from Claude context"
```

**Score this area on:**
- Missing `.claudeignore` = critical (Claude reads everything including node_modules)
- Lock files not ignored = high impact (package-lock.json alone can be 50k+ tokens)
- Generated/dist files not ignored = high impact
- Docs directories not scoped = medium impact

Read `.claudeignore` if it exists. Check against `references/claudeignore-patterns.md`
for the recommended pattern set.

---

## Audit 3 — Git & local workflow

```bash
# Pre-push hook
ls -la .git/hooks/pre-push 2>/dev/null && cat .git/hooks/pre-push \
  || echo "NO pre-push hook"

# Pre-commit hook
ls -la .git/hooks/pre-commit 2>/dev/null || echo "NO pre-commit hook"

# Git config performance settings
git config --global core.fsmonitor
git config --global core.untrackedCache
git config --global feature.manyFiles

# Average git status time
time git status > /dev/null

# Local typecheck/test commands available
cd app 2>/dev/null || true
cat package.json 2>/dev/null | python3 -c "
import json,sys
s=json.load(sys.stdin).get('scripts',{})
for k in ('typecheck','test','build','lint','check'): print(k,':', s.get(k,'MISSING'))
" 2>/dev/null
```

**Score this area on:**
- No pre-push hook = high impact (CI becomes the only gate, each roundtrip is 10-15min)
- `git status` >500ms = problem (enable fsmonitor)
- No `typecheck` script = medium (developers can't easily run tsc locally)
- Missing `feature.manyFiles` on repos >1000 files = medium

---

## Audit 4 — CI/CD pipeline

```bash
# Recent CI run times (requires gh CLI)
gh run list --limit 10 --json databaseId,status,conclusion,createdAt,updatedAt \
  --jq '.[] | {id:.databaseId, dur: ((.updatedAt | fromdateiso8601) - (.createdAt | fromdateiso8601)), conclusion:.conclusion}' \
  2>/dev/null | head -20

# Workflow file(s)
ls .github/workflows/*.yml .github/workflows/*.yaml 2>/dev/null

# Check for cache steps in CI
grep -l "actions/cache\|cache-dependency" .github/workflows/*.yml 2>/dev/null \
  || echo "No cache steps found in CI workflows"

# Check if CI runs typecheck + test + build in sequence (serial) vs parallel
grep -A2 "needs:" .github/workflows/*.yml 2>/dev/null | head -30
```

Read the workflow file(s) found. Check:
- Are jobs parallelised where possible?
- Is `node_modules` cached between runs?
- Is there a separate lint job blocking everything else?
- Is `next build` run unnecessarily on test-only PRs?

**Score this area on:**
- Average CI run >10min = problem, >20min = critical
- No `node_modules` cache = high impact (adds 2-4min per run)
- Serial jobs that could be parallel = medium impact
- No local gate (pre-push hook) forcing all failures to be found in CI = high impact

---

## Audit 5 — Build & test performance

```bash
# Node.js / npm versions
node --version && npm --version 2>/dev/null
which pnpm && pnpm --version 2>/dev/null

# TypeScript version and config
cat app/tsconfig.json 2>/dev/null | python3 -c "
import json,sys
c=json.load(sys.stdin)
print('incremental:', c.get('compilerOptions',{}).get('incremental','NOT SET'))
print('skipLibCheck:', c.get('compilerOptions',{}).get('skipLibCheck','NOT SET'))
print('exclude:', c.get('exclude','NOT SET'))
" 2>/dev/null

# Next.js config — turbopack enabled?
grep -r "turbopack\|--turbopack\|--turbo" app/package.json app/next.config* 2>/dev/null \
  || echo "Turbopack not enabled"

# Test file count
find app/src -name '*.test.*' -o -name '*.spec.*' 2>/dev/null | wc -l

# Vitest/Jest config — threads, pool
grep -r "pool\|threads\|workers\|forks" app/vitest.config* app/jest.config* 2>/dev/null \
  | head -10
```

**Score this area on:**
- `incremental: false` or missing in tsconfig = medium (tsc rebuilds from scratch every time)
- `skipLibCheck: false` = medium (type-checks all node_modules)
- Turbopack not enabled for Next.js dev = low-medium
- Test suite >100 tests with no parallelism config = medium

---

## Audit 6 — Linux & hardware

```bash
# CPU governor
cat /sys/devices/system/cpu/cpu0/cpufreq/scaling_governor 2>/dev/null \
  || echo "cpufreq not available"

# Power profile
powerprofilesctl get 2>/dev/null || cat /sys/firmware/acpi/platform_profile 2>/dev/null \
  || echo "power profile tool not found"

# Available memory
free -h | awk 'NR==2{print "RAM:", $2, "total,", $7, "available"}'

# Swap/zram
swapon --show 2>/dev/null || echo "No swap"
zramctl 2>/dev/null | head -3

# SSD / NVMe
lsblk -d -o NAME,ROTA,TYPE | grep disk

# inotify limits (relevant for file watchers — Next.js, Vite, tests)
cat /proc/sys/fs/inotify/max_user_watches

# Thermal throttling (check if CPU is running hot)
sensors 2>/dev/null | grep -E "Core|temp" | head -8 \
  || cat /sys/class/thermal/thermal_zone*/temp 2>/dev/null | head -4 \
  | awk '{print $1/1000 "°C"}'
```

**Score this area on:**
- CPU governor `powersave` = high impact on compile/test speed (switch to `performance`)
- Power profile not `performance` during active dev = medium
- inotify watches <524288 = medium (file watchers silently drop events)
- <8GB available RAM during heavy dev = medium
- Thermals >85°C = high (CPU throttles, everything slows)

Read `references/linux-perf.md` for fix commands for any issues found.

---

## Audit 7 — Emerging optimizations (run every time)

Don't just check static settings. Look for patterns specific to this repo's
current state that a generic checklist would miss:

```bash
# Token budget — how much is Claude reading vs. needing?
# Check if .claudeignore is keeping up with new dirs added since last audit
git log --diff-filter=A --name-only --format="" -- '*/' | sort -u | tail -30
# Any new directories not yet in .claudeignore?

# Duplicate work detection — are the same files being read repeatedly?
# Check recent git log for patterns (same files touched in many PRs)
git log --name-only --format="" -20 | sort | uniq -c | sort -rn | head -15

# Dead code / unused exports (fast heuristic)
# Files changed last >90 days ago that aren't tests or docs
git log --format="%H %as" | tail -1  # oldest commit date
git log --diff-filter=M --name-only --format="" --after="90 days ago" \
  | sort -u > /tmp/recently_touched.txt
find app/src -name '*.ts' -o -name '*.tsx' | grep -v test | grep -v spec \
  | grep -v -f /tmp/recently_touched.txt 2>/dev/null | head -20
# These files haven't been modified in 90 days — candidates for archiving

# Context accuracy — is graphify graph up to date?
ls -la graphify-out/graph.json 2>/dev/null
find app/src -newer graphify-out/graph.json -name '*.ts' -o -name '*.tsx' \
  2>/dev/null | wc -l
# If >10 files newer than graph, recommend graphify rebuild

# Claude workflow efficiency — repeated search patterns
# (check if .claudeignore has drifted from what's actually being excluded)
wc -l .claudeignore
find . -not -path '*/node_modules/*' -not -path '*/.git/*' \
  -not -path '*/.next/*' -name '*.log' -o -name '*.lock' 2>/dev/null | wc -l
# Any log/lock files Claude might be reading?

# Worktree hygiene — stale = disk + git overhead
git worktree list | awk '{print $1}' | while read wt; do
  last=$(git -C "$wt" log -1 --format="%ar" 2>/dev/null || echo "unreachable")
  echo "$wt — last commit: $last"
done
```

Score Audit 7 on:
- Graphify graph stale (>10 modified files since last rebuild) = medium
- Dead code directories untouched >90 days = low-medium (archiving opportunity)  
- .claudeignore drift (new dirs added to repo not yet excluded) = high
- Repeated file patterns in git log (same files in every PR = refactor candidate) = medium

## Graphify integration

Before reading any source file, ensure the local graph exists, then run
`graphify query "<question>"` to orient yourself without loading raw files.
This keeps Claude's context lean during the audit itself.

```bash
if [ ! -f graphify-out/graph.json ]; then
  PATH="$HOME/.local/bin:$PATH" graphify extract . --code-only
else
  PATH="$HOME/.local/bin:$PATH" graphify update .
fi

PATH="$HOME/.local/bin:$PATH" graphify query "what are the largest modules and their dependencies"
PATH="$HOME/.local/bin:$PATH" graphify query "which files are imported most often"
PATH="$HOME/.local/bin:$PATH" graphify query "what directories have the most files"
```

Use graphify output to decide WHICH files to read — never read speculatively.

## Ponytail compatibility

This skill runs in ponytail mode by default. That means:
- Shortest working fix, not the most elegant abstraction
- One command beats a tutorial
- Skip sections that score >80% — don't audit what's already fine
- Mark deliberate simplifications with `# ponytail:` in any generated scripts
- If a recommended fix would take >30min, put it in Advanced, not Medium

## Reference files

- `references/report-template.md` — scored report output + scoring rubric
- `references/claudeignore-patterns.md` — recommended .claudeignore patterns
- `references/linux-perf.md` — fix commands for Linux performance settings
- `references/ci-cache.md` — GitHub Actions caching patterns
- `references/git-fsmonitor.md` — git performance config commands
- `scripts/audit.sh` — runs all shell commands above in one pass (safe, read-only)
