# Sprint Planning

Sprint planning and analytics — status, progress, burndown, velocity, carry-over.

```bash
linear-cli sp status -t ENG
linear-cli sp progress -t ENG
linear-cli sp plan -t ENG
linear-cli sp carry-over -t ENG --force
linear-cli sp burndown -t ENG
linear-cli sp velocity -t ENG
linear-cli sp velocity -t ENG --cycles 10
linear-cli sp velocity -t ENG --output json
```

## Subcommands

| Command | Purpose |
|---------|---------|
| `status` | Current sprint overview |
| `progress` | Visual completion bar |
| `plan` | Planned issues for next cycle |
| `carry-over` | Move incomplete to next cycle |
| `burndown` | ASCII burndown chart |
| `velocity` | Sprint velocity + trend |

| Flag | Purpose |
|------|---------|
| `-t TEAM` | Team key (required) |
| `--cycles N` | Past cycles for velocity |
| `--force` | Skip confirmation |
| `--output json` | JSON output |

Exit codes: `0`=Success, `1`=Error, `2`=Not found, `3`=Auth error
