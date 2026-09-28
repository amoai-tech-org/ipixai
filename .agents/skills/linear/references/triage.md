# Triage

Manage the Linear triage inbox — unassigned issues needing attention.

```bash
linear-cli tr list
linear-cli tr list -t ENG
linear-cli tr list --output json
linear-cli tr claim LIN-123
linear-cli tr snooze LIN-123 --duration 1d
linear-cli tr snooze LIN-123 --duration 1w
```

Duration shortcuts: `1d`, `2d`, `1w`, `2w`, `1m`
