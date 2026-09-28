# Project Updates

Manage project status updates — create, list, archive.

```bash
linear-cli pu list "My Project"
linear-cli pu get UPDATE_ID
linear-cli pu create "My Project" -b "On track this sprint"
linear-cli pu create "My Project" -b "Blocked on API" --health atRisk
linear-cli pu update UPDATE_ID -b "Updated status"
linear-cli pu archive UPDATE_ID
linear-cli pu unarchive UPDATE_ID
```

## Health Status

| Value | Meaning |
|-------|---------|
| `onTrack` | Green |
| `atRisk` | Yellow |
| `offTrack` | Red |

| Flag | Purpose |
|------|---------|
| `-b BODY` | Update body text |
| `--health STATUS` | onTrack, atRisk, offTrack |
| `--output json` | JSON output |

Exit codes: `0`=Success, `1`=Error, `2`=Not found, `3`=Auth error
