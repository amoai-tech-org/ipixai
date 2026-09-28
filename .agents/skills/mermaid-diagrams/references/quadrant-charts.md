# Quadrant Charts Reference

Quadrant charts plot data points on a 2x2 grid to compare items across two dimensions. Use for prioritization matrices, competitive analysis, effort-vs-impact assessments, and strategic positioning.

## Basic Syntax

```mermaid
quadrantChart
    title Reach and Engagement
    x-axis Low Reach --> High Reach
    y-axis Low Engagement --> High Engagement
    quadrant-1 Expand
    quadrant-2 Promote
    quadrant-3 Re-evaluate
    quadrant-4 Improve
    Campaign A: [0.3, 0.6]
    Campaign B: [0.45, 0.23]
    Campaign C: [0.57, 0.69]
    Campaign D: [0.78, 0.34]
    Campaign E: [0.40, 0.34]
    Campaign F: [0.35, 0.78]
```

## Structure

### Title
```
quadrantChart
    title Chart Title
```

### Axis Labels
```
x-axis Low Label --> High Label
y-axis Low Label --> High Label
```

Single-direction labels (left/bottom only):
```
x-axis Low Label
y-axis Bottom Label
```

### Quadrant Labels

Quadrants are numbered starting top-right, going counter-clockwise:

```
quadrant-1 Top Right Label
quadrant-2 Top Left Label
quadrant-3 Bottom Left Label
quadrant-4 Bottom Right Label
```

### Data Points

Values range from 0 to 1:
```
Point Name: [x, y]
```

- `[0, 0]` = bottom-left corner
- `[1, 1]` = top-right corner
- `[0.5, 0.5]` = center

## Point Styling

### Direct Styling

```mermaid
quadrantChart
    Point A: [0.9, 0.8] radius: 12
    Point B: [0.3, 0.7] color: #ff3300, radius: 10
    Point C: [0.5, 0.4] radius: 25, color: #00ff33, stroke-color: #10f0f0
```

**Available properties:**
- `color` - Fill color
- `radius` - Point size
- `stroke-width` - Border thickness
- `stroke-color` - Border color

### Class-Based Styling

```mermaid
quadrantChart
    classDef highPriority color: #ff0000, radius: 12
    classDef lowPriority color: #999999, radius: 6
    Point A:::highPriority: [0.8, 0.9]
    Point B:::lowPriority: [0.2, 0.3]
```

## Configuration

```
%%{init: {
  'quadrantChart': {
    'chartWidth': 500,
    'chartHeight': 500,
    'titleFontSize': 20,
    'pointRadius': 5,
    'pointLabelFontSize': 12,
    'xAxisLabelFontSize': 16,
    'yAxisLabelFontSize': 16,
    'quadrantLabelFontSize': 16
  }
}}%%
```

## Theme Variables

Customize quadrant colors:

- `quadrant1Fill`, `quadrant2Fill`, `quadrant3Fill`, `quadrant4Fill` - Background colors
- `quadrantPointFill` - Default point color
- `quadrantPointTextFill` - Point label color
- `quadrantXAxisTextFill`, `quadrantYAxisTextFill` - Axis text colors
- `quadrantTitleFill` - Title color

## Common Use Cases

### Eisenhower Matrix (Urgent vs Important)
```mermaid
quadrantChart
    title Task Prioritization
    x-axis Not Urgent --> Urgent
    y-axis Not Important --> Important
    quadrant-1 Do First
    quadrant-2 Schedule
    quadrant-3 Eliminate
    quadrant-4 Delegate
    Budget review: [0.8, 0.9]
    Email backlog: [0.7, 0.2]
    Strategy doc: [0.3, 0.8]
    Office supplies: [0.2, 0.1]
```

### Effort vs Impact
```mermaid
quadrantChart
    title Feature Prioritization
    x-axis Low Effort --> High Effort
    y-axis Low Impact --> High Impact
    quadrant-1 Major Projects
    quadrant-2 Quick Wins
    quadrant-3 Fill-Ins
    quadrant-4 Thankless Tasks
    Search: [0.2, 0.85]
    Dark mode: [0.3, 0.4]
    Redesign: [0.8, 0.9]
    Refactor: [0.7, 0.3]
```

## FashionOS Example: Event Strategy

```mermaid
quadrantChart
    title Event Portfolio Strategy
    x-axis Low Cost --> High Cost
    y-axis Low Brand Impact --> High Brand Impact
    quadrant-1 Flagship Events
    quadrant-2 High-Value Activations
    quadrant-3 Optimize or Cut
    quadrant-4 Reduce Spend
    Milan Fashion Week: [0.9, 0.95]
    Pop-up Store Launch: [0.4, 0.7]
    Instagram Live: [0.1, 0.5]
    Trade Show Booth: [0.6, 0.3]
    Press Dinner: [0.5, 0.8]
    Sample Sale: [0.3, 0.2]
```

## Tips

1. **Normalize values** - Map your data to 0-1 range before plotting
2. **Label quadrants clearly** - Use action-oriented labels (Do, Schedule, Delegate, Eliminate)
3. **Limit data points** - 5-15 points keeps the chart readable
4. **Use styling** to highlight key items with larger radius or distinct colors
5. **Choose axes carefully** - The two dimensions should be independent and meaningful

## Reference

- [Official Documentation](https://mermaid.js.org/syntax/quadrantChart.html)
