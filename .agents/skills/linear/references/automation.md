# Linear Automation

Automate issue tracking, cycle planning, roadmap management, and engineering workflows.

## Issue Lifecycle

```
Triage → Todo → In Progress → In Review → Done
```

## Automation Triggers

```yaml
auto_assign_on_start:
  trigger: status_changed to "In Progress"
  condition: assignee is null
  action: set_assignee to trigger_user

add_to_cycle:
  trigger: issue_created with "sprint-ready" label
  action: add_to current cycle, set priority urgent

close_on_merge:
  trigger: github_pr_merged
  action: set_status "Done"
```

## Issue Templates

### Bug Report
Title: `[Bug] {{summary}}`
Labels: `bug`, `needs-triage`
Priority: per severity

### Feature Request
Title: `[Feature] {{summary}}`
Labels: `feature`, `needs-refinement`

## Cycle Management

```yaml
cycle_config:
  duration: 2_weeks
  capacity_per_engineer: 8
  buffer_percentage: 20
```

## GitHub Integration

```yaml
branch_format: "{{username}}/lin-{{issue_number}}-{{issue_slug}}"
on_pr_opened: set_status "In Review", link PR
on_pr_merged: set_status "Done"
```

## Labels

| Category | Examples |
|----------|----------|
| Type | bug, feature, improvement, chore |
| Priority | urgent, high, medium, low |
| Area | frontend, backend, infrastructure, design |

## Best Practices

1. Triage new issues daily
2. Use projects to organize related work
3. Let integrations update status automatically
4. Track velocity across cycles
