# Projects

Manage Linear projects — full CRUD with labels, members, archive.

```bash
linear-cli p list
linear-cli p list --archived
linear-cli p get PROJECT_ID
linear-cli p open PROJECT_ID
linear-cli p create "Q1 Roadmap" -t ENG
linear-cli p create "Feature" -t ENG --icon "🚀" --priority 1 \
  --start-date 2025-01-01 --target-date 2025-03-31 \
  --lead USER_ID --status planned
linear-cli p update PROJECT_ID --name "New Name" --status completed
linear-cli p archive PROJECT_ID
linear-cli p unarchive PROJECT_ID
linear-cli p add-labels PROJECT_ID -l label1 -l label2
linear-cli p members PROJECT_ID
linear-cli p delete PROJECT_ID --force
```

| Flag | Purpose |
|------|---------|
| `--icon EMOJI` | Project icon |
| `--priority N` | 1=urgent, 4=low |
| `--start-date DATE` | Start date |
| `--target-date DATE` | Target date |
| `--lead USER` | Project lead |
| `--status STATE` | planned, active, completed |
| `--output json` | JSON output |
