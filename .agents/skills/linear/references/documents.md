# Documents

Manage Linear documents.

```bash
linear-cli d list
linear-cli d get DOC_ID
linear-cli d create "Design Doc" -p PROJECT_ID
linear-cli d create "RFC" -p PROJECT_ID --id-only
linear-cli d update DOC_ID --title "New Title"
```

| Flag | Purpose |
|------|---------|
| `-p PROJECT` | Project ID |
| `--id-only` | Return ID only |
| `--output json` | JSON output |
