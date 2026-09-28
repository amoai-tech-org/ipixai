# Pull Requests

Create GitHub PRs linked to Linear issues.

## Create PR

```bash
linear-cli g pr LIN-123          # Create PR linked to issue
linear-cli g pr LIN-123 --draft  # Draft PR
linear-cli g pr LIN-123 --web    # Open in browser
```

## Git Branch

```bash
linear-cli g checkout LIN-123
linear-cli g checkout LIN-123 -b my-custom-branch
linear-cli g branch LIN-123
linear-cli g create LIN-123
```

## Full Workflow

```bash
linear-cli i start LIN-123 --checkout  # assign + branch
git add . && git commit -m "Fix bug"
linear-cli g pr LIN-123                  # create PR
linear-cli i update LIN-123 -s Done      # mark done
```

Requires `gh` CLI for GitHub operations. Branch pattern: `username/lin-123-issue-title`.
