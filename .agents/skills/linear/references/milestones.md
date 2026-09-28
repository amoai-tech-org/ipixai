# Milestones

Manage project milestones — create, update, track target dates.

```bash
linear-cli ms list -p "My Project"
linear-cli ms get MILESTONE_ID
linear-cli ms create "Beta Release" -p "My Project"
linear-cli ms create "GA" -p PROJ --target-date 2025-06-01
linear-cli ms update MILESTONE_ID --target-date +2w
linear-cli ms delete MILESTONE_ID --force
```

| Flag | Purpose |
|------|---------|
| `-p PROJECT` | Project name/ID |
| `--target-date DATE` | YYYY-MM-DD or +Nw |
| `--output json` | JSON output |

Exit codes: `0`=Success, `1`=Error, `2`=Not found, `3`=Auth error
