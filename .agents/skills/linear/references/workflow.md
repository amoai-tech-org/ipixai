# Workflow

Start/stop work on Linear issues, create branches, get current issue context.

```bash
linear-cli i start LIN-123           # assign + In Progress
linear-cli i start LIN-123 --checkout # + create branch
linear-cli i stop LIN-123            # unassign + reset
linear-cli context                    # get issue from branch
linear-cli context --output json
```

## Full Cycle

```bash
linear-cli i start LIN-123 --checkout
# code...
linear-cli g pr LIN-123
linear-cli i update LIN-123 -s Done
```
