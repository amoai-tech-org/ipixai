# Labels

Manage Linear labels.

```bash
linear-cli l list
linear-cli l list --type issue
linear-cli l create "Feature" --color "#10B981"
linear-cli l create "Bug" --color "#EF4444" --id-only
linear-cli l delete LABEL_ID --force
linear-cli l list --output json --compact
```

| Flag | Purpose |
|------|---------|
| `--id-only` | Return ID only |
| `--output json` | JSON output |
| `--force` | Skip confirmation |
