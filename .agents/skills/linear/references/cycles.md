# Cycles

Manage Linear cycles (sprints) via CLI.

```bash
linear-cli c list -t ENG
linear-cli c current -t ENG
linear-cli c current -t ENG --output json
linear-cli c create -t ENG --name "Sprint 5" --starts-at 2024-01-01 --ends-at 2024-01-14
linear-cli c get CYCLE_ID
linear-cli c update CYCLE_ID --name "Sprint 5b" --dry-run
linear-cli c complete CYCLE_ID
linear-cli c delete CYCLE_ID --force
```

| Flag | Purpose |
|------|---------|
| `--output json` | JSON output |
| `--compact` | No formatting |
| `--dry-run` | Preview without updating |
| `--force` | Skip confirmation |

Exit codes: `0`=Success, `1`=Error, `2`=Not found, `3`=Auth error
