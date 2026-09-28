# Block Diagrams Reference

Block diagrams represent systems using positioned blocks and connectors. Unlike flowcharts, block diagrams give full control over block placement using a column-based layout. Use for system architecture overviews, hardware diagrams, and structured layouts.

## Basic Syntax

```mermaid
block-beta
    a b c
```

Creates three horizontally-arranged blocks.

## Column Layout

### Multi-Column Grid

```mermaid
block-beta
    columns 3
    a b c
    d e f
```

Blocks fill left-to-right, wrapping to new rows.

### Single Column (Vertical Stack)

```mermaid
block-beta
    columns 1
    a b c d
```

## Block Width (Column Spanning)

Blocks can span multiple columns:

```mermaid
block-beta
    columns 4
    a:2 b:2
    c:1 d:3
```

The number after `:` indicates how many columns the block spans.

## Block Labels

```mermaid
block-beta
    columns 2
    A["Frontend App"]
    B["Backend API"]
    C["Database"]
```

## Block Shapes

Various shapes using bracket notation:

```mermaid
block-beta
    %% Standard rectangle
    a["Rectangle"]

    %% Rounded edges
    b("Rounded")

    %% Stadium shape
    c(["Stadium"])

    %% Subroutine
    d[["Subroutine"]]

    %% Cylindrical (database)
    e[("Database")]

    %% Circle
    f((("Circle")))

    %% Rhombus (decision)
    g{"Decision"}

    %% Hexagon
    h{{"Hexagon"}}

    %% Parallelogram
    i[/"Parallelogram"/]

    %% Trapezoid
    j[/"Trapezoid"\]
```

## Composite/Nested Blocks

Create blocks containing sub-blocks:

```mermaid
block-beta
    columns 3
    block:group1:2
        columns 2
        a["Service A"] b["Service B"]
    end
    c["External API"]
```

## Space Blocks

Insert empty space for layout control:

```mermaid
block-beta
    columns 3
    a space b
```

With column span:
```mermaid
block-beta
    columns 5
    a space:3 b
```

## Connecting Blocks with Edges

### Directional Arrows
```mermaid
block-beta
    columns 3
    a["Client"] b["Server"] c["Database"]
    a --> b
    b --> c
```

### Non-directional Lines
```mermaid
block-beta
    a b
    a --- b
```

### Labeled Edges
```mermaid
block-beta
    a["App"] b["API"]
    a -->|"REST"| b
```

## Styling

### Individual Block Styling
```mermaid
block-beta
    a["Critical Service"] b["Normal Service"]
    style a fill:#f99,stroke:#f00,stroke-width:2px
```

### Class-Based Styling
```mermaid
block-beta
    columns 2
    a["Primary"] b["Secondary"]
    classDef primary fill:#069,stroke:#036,color:#fff
    classDef secondary fill:#eee,stroke:#999
    class a primary
    class b secondary
```

## Comprehensive Example: Three-Tier Architecture

```mermaid
block-beta
    columns 3

    block:frontend:3
        columns 3
        space:1 A["React SPA"] space:1
    end

    space:3

    block:backend:3
        columns 3
        B["API Gateway"]:1
        C["Auth Service"]:1
        D["Event Service"]:1
    end

    space:3

    block:data:3
        columns 3
        E[("PostgreSQL")]:1
        F[("Redis Cache")]:1
        G[("S3 Storage")]:1
    end

    A --> B
    A --> C
    A --> D
    B --> E
    C --> E
    D --> E
    B --> F
    D --> G
```

## FashionOS Example: System Layout

```mermaid
block-beta
    columns 5

    block:context:1
        columns 1
        nav["Navigation"]
        filters["Filters"]
        brands["Brand Switcher"]
    end

    block:workspace:3
        columns 1
        header["Page Header + Actions"]
        content["Main Content Area"]
        pagination["Pagination / Load More"]
    end

    block:intelligence:1
        columns 1
        ai["AI Suggestions"]
        activity["Activity Feed"]
        quick["Quick Actions"]
    end

    classDef panel fill:#FAFAF8,stroke:#E5E5E0
    classDef gold fill:#C8A96A,stroke:#B8994A,color:#fff
    class context,workspace,intelligence panel
    class ai gold
```

## Block vs Flowchart

| Feature | Block Diagram | Flowchart |
|---------|--------------|-----------|
| Layout | Column-grid (author-controlled) | Auto-layout (algorithm) |
| Positioning | Explicit via columns/spans | Automatic |
| Nesting | Column-based groups | Subgraphs |
| Best for | Structured layouts, system views | Process flows, decision trees |

**Choose block diagrams when:**
- You need precise control over element positioning
- Building system/architecture overviews
- Creating grid-based layouts

**Choose flowcharts when:**
- Showing process flows with decisions
- Layout can be auto-determined
- Focus is on connections, not positions

## Tips

1. **Plan your grid** - Decide column count before adding blocks
2. **Use `space`** blocks for alignment and visual separation
3. **Nest blocks** with `block:id:span ... end` for grouped sections
4. **Use shapes** to distinguish component types (cylinder for DB, circle for services)
5. **Style by class** for consistent appearance across similar components
6. **Keep edges simple** - block diagrams emphasize structure over flow

## Reference

- [Official Documentation](https://mermaid.js.org/syntax/block.html)
