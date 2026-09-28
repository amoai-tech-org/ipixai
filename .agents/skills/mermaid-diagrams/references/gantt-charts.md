# Gantt Charts Reference

Gantt charts illustrate project schedules with task durations on a timeline. Use for project planning, sprint scheduling, release planning, and production timelines.

## Basic Syntax

```mermaid
gantt
    title Project Schedule
    dateFormat YYYY-MM-DD
    section Phase 1
        Task A :a1, 2024-01-01, 30d
        Task B :after a1, 20d
    section Phase 2
        Task C :2024-02-15, 15d
```

## Task Definition

Tasks use colon-separated metadata with commas:

```
Task Name :<status>, <taskID>, <startDate>, <endDate or duration>
```

### Start Date Options

| Pattern | Description |
|---------|-------------|
| `2024-01-01` | Explicit date |
| `after taskID` | After another task ends |
| `after taskA taskB` | After multiple tasks (latest end) |

### End Date Options

| Pattern | Description |
|---------|-------------|
| `2024-02-01` | Explicit end date |
| `30d` | Duration in days |
| `2w` | Duration in weeks |

### Task ID

Optional identifier for referencing in dependencies:

```mermaid
gantt
    Task A :taskA, 2024-01-01, 10d
    Task B :after taskA, 5d
```

## Task Status Tags

Combine multiple status tags before the task ID:

```mermaid
gantt
    dateFormat YYYY-MM-DD
    Completed task     :done,    t1, 2024-01-01, 10d
    Active task        :active,  t2, after t1, 10d
    Critical task      :crit,    t3, after t2, 10d
    Critical & done    :crit, done, t4, 2024-01-01, 5d
    Future task        :         t5, after t3, 10d
```

| Status | Effect |
|--------|--------|
| `done` | Completed (filled/dimmed) |
| `active` | Currently in progress (highlighted) |
| `crit` | Critical path (red/emphasized) |
| `milestone` | Single point marker (diamond) |

## Milestones

Zero-duration tasks rendered as diamond markers:

```mermaid
gantt
    dateFormat YYYY-MM-DD
    section Milestones
        Design review    :milestone, m1, 2024-01-15, 0d
        Launch           :milestone, crit, m2, 2024-03-01, 0d
```

## Sections

Group related tasks:

```mermaid
gantt
    section Design
        Wireframes    :des1, 2024-01-01, 14d
        Mockups       :des2, after des1, 7d
    section Development
        Frontend      :dev1, after des2, 21d
        Backend       :dev2, after des2, 28d
    section Testing
        QA            :test1, after dev1, 14d
```

## Date Formatting

### Input Format
```
dateFormat YYYY-MM-DD
```

Supported tokens: `YYYY`, `YY`, `M`, `MM`, `D`, `DD`, `H`, `HH`, `mm`, `ss`, `X` (unix timestamp)

### Axis Display Format
```
axisFormat %Y-%m-%d
```

Common patterns:
- `%Y-%m-%d` - 2024-01-15
- `%d/%m` - 15/01
- `%b %d` - Jan 15
- `%B %Y` - January 2024
- `%H:%M` - 14:30

### Tick Interval
```
tickInterval 1week
```

Pattern: `[number][unit]` where unit is `millisecond`, `second`, `minute`, `hour`, `day`, `week`, `month`

## Exclusions

Skip dates from duration calculations:

```mermaid
gantt
    dateFormat YYYY-MM-DD
    excludes weekends
    excludes 2024-12-25, 2024-01-01

    section Sprint 1
        Task A :2024-01-02, 10d
```

**Custom weekend days:**
```
weekend friday
```

## Vertical Markers

Highlight important dates:

```mermaid
gantt
    dateFormat YYYY-MM-DD
    section Tasks
        Task A :2024-01-01, 30d
    vert 2024-01-15
```

## Display Modes

**Compact mode** - overlaps non-dependent tasks:
```
displayMode compact
```

## Click Interactions

```mermaid
gantt
    Task A :t1, 2024-01-01, 10d
    click t1 href "https://example.com"
    click t1 call myFunction()
```

Requires `securityLevel: 'loose'`.

## Today Marker

Disable the today marker:
```
todayMarker off
```

## Configuration

```javascript
%%{init: {
  'gantt': {
    'barHeight': 20,
    'barGap': 4,
    'fontSize': 12,
    'sectionFontSize': 16,
    'topAxis': false,
    'displayMode': 'compact'
  }
}}%%
```

## FashionOS Example: Fashion Show Timeline

```mermaid
gantt
    title Milan Fashion Week - Maison Elara SS25
    dateFormat YYYY-MM-DD
    excludes weekends

    section Planning
        Event brief          :done, brief, 2024-06-01, 14d
        Budget approval      :done, budget, after brief, 7d
        Venue booking        :done, crit, venue, after budget, 10d

    section Pre-Production
        Model casting        :active, cast, after venue, 14d
        Collection fitting   :active, fit, after venue, 21d
        Rehearsal planning   :reh, after cast, 7d
        Sponsor coordination :sponsor, after budget, 30d

    section Production
        Venue setup          :crit, setup, 2024-09-15, 3d
        Dress rehearsal      :crit, dress, after setup, 1d
        Show day             :milestone, crit, show, 2024-09-19, 0d

    section Post-Production
        Photo editing        :edit, after show, 14d
        Media distribution   :media, after edit, 7d
        Sponsor reports      :reports, after media, 5d
        Review               :milestone, review, after reports, 0d
```

## Tips

1. **Use task IDs** for dependency chains (`after taskID`)
2. **Mark critical path** with `crit` to highlight schedule-critical tasks
3. **Exclude weekends** for realistic business-day durations
4. **Use milestones** for key decision points and deadlines
5. **Group by phase** using sections for clarity
6. **Compact mode** works well for schedules with parallel workstreams

## Reference

- [Official Documentation](https://mermaid.js.org/syntax/gantt.html)
