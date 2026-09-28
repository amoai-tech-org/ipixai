#!/usr/bin/env bash
# task-verifier — disk probes for iPix (lumina-studio)
# Usage:
#   bash .claude/skills/task-verifier/scripts/probe-disk-ipix.sh
#   bash .claude/skills/task-verifier/scripts/probe-disk-ipix.sh app
#   bash .claude/skills/task-verifier/scripts/probe-disk-ipix.sh supabase
#
# READ-ONLY. Env var names only — never log values.
# Exit code = number of 🔴 blockers (0 = green).

set -uo pipefail

REPO="${REPO:-/home/sk/ipix}"
APP="$REPO/app"
FILTER="${1:-}"

red=0; yellow=0; green=0

ok()    { printf "🟢 %s\n" "$*"; green=$((green+1)); }
warn()  { printf "🟡 %s\n" "$*"; yellow=$((yellow+1)); }
fail()  { printf "🔴 %s\n" "$*"; red=$((red+1)); }
info()  { printf "ℹ️  %s\n" "$*"; }

in_filter() { [ -z "$FILTER" ] || echo "$1" | grep -qi "$FILTER"; }

echo "=== task-verifier iPix probe — $(date -u +%Y-%m-%dT%H:%M:%SZ) ==="
echo "REPO=$REPO"
[ -n "$FILTER" ] && echo "filter=$FILTER"
echo

# ---------- Structure ----------
if in_filter struct; then
  echo "## Repo structure"
  [ -d "$REPO/.git" ] && ok "git repo present" || fail "not a git repo"
  [ -f "$REPO/CLAUDE.md" ] && ok "CLAUDE.md" || fail "CLAUDE.md missing"
  [ -f "$REPO/tasks/plan/todo.md" ] && ok "tasks/plan/todo.md (canonical tracker)" || warn "tasks/plan/todo.md missing"
  [ ! -f "$REPO/todo.md" ] || warn "root todo.md exists — use tasks/plan/todo.md as SSOT"
  [ -d "$APP" ] && ok "app/ (Next.js operator)" || fail "app/ missing"
  [ -d "$REPO/supabase" ] && ok "supabase/" || warn "supabase/ missing"
  [ -d "$REPO/.claude/skills/task-verifier" ] && ok "task-verifier skill" || fail "task-verifier skill missing"
  echo
fi

# ---------- Security ----------
if in_filter security; then
  echo "## Security (client bundle)"
  if rg -q 'GEMINI_API_KEY|NEXT_PUBLIC_GEMINI|SERVICE_ROLE' "$APP/src" 2>/dev/null; then
    fail "AI keys or SERVICE_ROLE in app/src"
  else
    ok "no GEMINI/SERVICE_ROLE in app/src"
  fi
  if [ -d "$REPO/src" ] && rg -q 'VITE_GEMINI|GEMINI_API_KEY' "$REPO/src" 2>/dev/null; then
    warn "legacy src/ may contain client AI refs"
  else
    ok "legacy src/ clean or absent"
  fi
  echo
fi

# ---------- Operator app ----------
if in_filter app; then
  echo "## Operator app (app/)"
  [ -f "$APP/package.json" ] && ok "app/package.json" || fail "app/package.json missing"
  node -e "const p=require('$APP/package.json'); process.exit(p.scripts&&p.scripts.lint?0:1)" 2>/dev/null \
    && ok "npm run lint script" || warn "lint script missing"
  node -e "const p=require('$APP/package.json'); process.exit(p.scripts&&p.scripts.build?0:1)" 2>/dev/null \
    && ok "npm run build script" || fail "build script missing"
  node -e "const p=require('$APP/package.json'); process.exit(p.scripts&&p.scripts.test?0:1)" 2>/dev/null \
    && ok "npm test script" || warn "test script missing"
  rg -q '@copilotkit/react-core/v2' "$APP/src" 2>/dev/null \
    && ok "CopilotKit v2 import present" || warn "no CopilotKit v2 import found (OK if task unrelated)"
  rg -q 'OperatorPanel' "$APP/src" 2>/dev/null \
    && ok "OperatorPanel referenced" || warn "OperatorPanel not found"
  echo
fi

# ---------- Supabase ----------
if in_filter supabase; then
  echo "## Supabase"
  [ -d "$REPO/supabase/functions" ] && ok "supabase/functions/" || warn "no edge functions dir"
  count=$(find "$REPO/supabase/functions" -mindepth 1 -maxdepth 1 -type d 2>/dev/null | wc -l)
  info "edge function dirs: $count"
  [ -d "$REPO/supabase/migrations" ] && ok "supabase/migrations/" || warn "migrations dir missing"
  mig=$(find "$REPO/supabase/migrations" -name '*.sql' 2>/dev/null | wc -l)
  info "migration files: $mig"
  [ -f "$REPO/package.json" ] && node -e "
    const p=require('$REPO/package.json');
    const s=p.scripts||{};
    ['supabase:verify','supabase:verify-rls'].forEach(k=>{
      if(!s[k]){ console.error('missing',k); process.exit(1);}
    });
  " 2>/dev/null && ok "supabase verify scripts in root package.json" || warn "supabase verify scripts missing"
  echo
fi

# ---------- Skills health (sample) ----------
if in_filter skills; then
  echo "## Skills (required hubs)"
  for slug in ipix ipix-supabase design-to-production tasks task-verifier; do
    [ -f "$REPO/.claude/skills/$slug/SKILL.md" ] && ok "skill: $slug" || fail "skill missing: $slug"
  done
  echo
fi

# ---------- Git branch (optional) ----------
if in_filter git; then
  echo "## Git"
  branch=$(git -C "$REPO" branch --show-current 2>/dev/null || echo "?")
  info "current branch: $branch"
  if [ "$branch" = "main" ] || [ "$branch" = "master" ]; then
    warn "on main — feature work should use ipi/* branch + worktree"
  else
    ok "not on main"
  fi
  echo
fi

echo "=== summary: 🟢 $green · 🟡 $yellow · 🔴 $red ==="
exit "$red"
