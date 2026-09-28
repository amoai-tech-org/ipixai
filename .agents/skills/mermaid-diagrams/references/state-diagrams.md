# State Diagrams Reference

State diagrams describe system behavior through states and transitions. Use for lifecycle modeling, workflow states, UI states, and finite state machines.

## Basic Syntax

```mermaid
stateDiagram-v2
    [*] --> Still
    Still --> Moving
    Moving --> Still
    Moving --> Crash
    Crash --> [*]
```

**Note:** Use `stateDiagram-v2` (preferred) over the older `stateDiagram`.

## Defining States

**ID only:**
```mermaid
stateDiagram-v2
    s1
```

**With description (state keyword):**
```mermaid
stateDiagram-v2
    state "This is a state description" as s1
```

**ID with colon notation:**
```mermaid
stateDiagram-v2
    s1 : This is a state
```

## Transitions

```mermaid
stateDiagram-v2
    s1 --> s2
    s2 --> s3: A transition label
```

## Start and End States

Use `[*]` for entry and exit points:

```mermaid
stateDiagram-v2
    [*] --> Active
    Active --> [*]
```

## Composite (Nested) States

Group related states using curly braces:

```mermaid
stateDiagram-v2
    state Processing {
        [*] --> Validating
        Validating --> Executing
        Executing --> [*]
    }
    [*] --> Processing
    Processing --> Done
```

**Multiple nesting levels:**
```mermaid
stateDiagram-v2
    state Outer {
        state Inner {
            [*] --> s1
            s1 --> [*]
        }
    }
```

**Transitions between composite states:**
```mermaid
stateDiagram-v2
    state GroupA {
        a1 --> a2
    }
    state GroupB {
        b1 --> b2
    }
    GroupA --> GroupB
```

## Choice (Conditional Branching)

Use `<<choice>>` for decision points:

```mermaid
stateDiagram-v2
    state check <<choice>>
    [*] --> check
    check --> Approved: score >= 70
    check --> Rejected: score < 70
```

## Forks and Joins (Parallel Execution)

Use `<<fork>>` and `<<join>>` for concurrent paths:

```mermaid
stateDiagram-v2
    state fork_state <<fork>>
    state join_state <<join>>

    [*] --> fork_state
    fork_state --> TaskA
    fork_state --> TaskB
    TaskA --> join_state
    TaskB --> join_state
    join_state --> Done
    Done --> [*]
```

## Notes

Add annotations to states:

```mermaid
stateDiagram-v2
    State1: Active
    note right of State1
        This state represents
        an active session
    end note
```

Positions: `right of`, `left of`

## Concurrency

Represent concurrent regions with `--`:

```mermaid
stateDiagram-v2
    [*] --> Active
    state Active {
        [*] --> Process1
        --
        [*] --> Process2
    }
```

## Direction

Control layout direction:

```mermaid
stateDiagram-v2
    direction LR
    [*] --> A
    A --> B
    B --> [*]
```

Options: `LR` (left-right), `TB` (top-bottom)

## Styling with classDef

```mermaid
stateDiagram-v2
    classDef errorState fill:#f00,color:white,font-weight:bold
    classDef activeState font-style:italic

    s1:::activeState --> s2
    s2 --> s3:::errorState
```

**Apply to multiple states:**
```mermaid
stateDiagram-v2
    classDef highlight fill:#ff9,stroke:#333
    class s1, s2 highlight
```

**Limitations:**
- Cannot style start/end states `[*]`
- Cannot style composite states directly

## Comprehensive Example: Order Lifecycle

```mermaid
stateDiagram-v2
    [*] --> Draft
    Draft --> Submitted: Place order

    state Review {
        [*] --> Validating
        Validating --> Approved: Valid
        Validating --> Rejected: Invalid
    }

    Submitted --> Review
    Review --> Processing: Approved
    Review --> Draft: Rejected

    state Processing {
        [*] --> Picking
        Picking --> Packing
        Packing --> [*]
    }

    Processing --> Shipped
    Shipped --> Delivered
    Delivered --> [*]

    Shipped --> Returned: Customer return
    Returned --> [*]
```

## Tips

1. **Use composite states** to group related sub-states and reduce clutter
2. **Add choice nodes** for conditional branching instead of multiple labeled transitions
3. **Use forks/joins** when modeling parallel workflows
4. **Direction LR** works well for lifecycle/pipeline diagrams
5. **Keep depth shallow** - avoid more than 2 levels of nesting

## Reference

- [Official Documentation](https://mermaid.js.org/syntax/stateDiagram.html)
