# FashionOS Domain Diagrams

Reference for creating mermaid diagrams specific to the FashionOS platform.

## Project Conventions

### File Naming
- Location: `tasks/mermaid/`
- Format: `NN-diagram-name.mmd` (zero-padded number, kebab-case)
- Index: `tasks/mermaid/00-diagram-index.md` (links diagrams to tasks)
- Progress: `tasks/mermaid/00-progress-tracker.md` (execution status)
- Roadmap: `tasks/mermaid/00-roadmap.md` (phase-based build order)

### Linking Diagrams to Tasks
Every diagram must map to a task in the task index:

```markdown
| Diagram ID               | Purpose                 | Phase    | Linked Task              |
| `01-event-planning-flow` | AI Event setup flow     | ADVANCED | [Task 30](../events/30-ai-planning-agents.md) |
```

### Phase Labels
- **MVP** - Minimum viable product features
- **ADVANCED** - Intelligence & automation
- **PRODUCTION** - Reliability, security, scale

---

## Core Domain Entities

### Multi-Tenant Hierarchy
```mermaid
erDiagram
    ORGANIZATION ||--o{ BRAND : contains
    BRAND ||--o{ BRAND_USER : has
    BRAND_USER }o--|| USER : is

    ORGANIZATION {
        uuid id PK
        string name
        string plan_tier
    }
    BRAND {
        uuid id PK
        uuid org_id FK
        string name
        string tier
    }
    BRAND_USER {
        uuid brand_id FK
        uuid user_id FK
        string role
    }
```

### Event Lifecycle
```mermaid
graph TD
    A[Event Created] --> B[Planning]
    B --> C{AI Enabled?}
    C -->|Yes| D[AI Task Generation]
    C -->|No| E[Manual Tasks]
    D --> F[Approval Queue]
    E --> F
    F --> G[Execution]
    G --> H[Live Ops]
    H --> I[Post-Event]
    I --> J[Reporting]
```

Event types: `fashion_show`, `presentation`, `pop_up`, `launch`

### Shoot Lifecycle
```mermaid
graph TD
    A[Brief Created] --> B[Pre-Production]
    B --> C[Shot List Generated]
    C --> D[Crew Booked]
    D --> E[Shoot Day]
    E --> F[Media Upload]
    F --> G[AI Processing]
    G --> H[DNA Compliance Check]
    H --> I{Pass?}
    I -->|Yes| J[Content Calendar]
    I -->|No| K[Flag for Review]
    K --> L[Reprocess / Reshoot]
    J --> M[Platform Distribution]
```

Shoot types: `lookbook`, `campaign`, `editorial`, `ecommerce`, `video`

### Intelligence Layer
```mermaid
graph TD
    A[Brand DNA Canvas] --> B[Module Canvases]
    B --> C[Event Canvas]
    B --> D[Shoot Canvas]
    B --> E[Content Canvas]

    F[Intelligence DB] --> G[Fashion Coach]
    G --> H[Validators]
    H --> I[Event Validator]
    H --> J[Shoot Validator]

    K[Playbooks] --> G
    A --> G
```

### AI Agent Architecture
```mermaid
sequenceDiagram
    participant U as User
    participant O as Orchestrator
    participant LLM as AI Model
    participant T as Tool Layer
    participant DB as Supabase

    U->>O: Natural language request
    O->>LLM: Prompt + Tool definitions
    LLM->>O: Tool call (function + args)
    O->>T: Execute tool
    T->>DB: Query/Mutation
    DB-->>T: Result
    T-->>O: JSON response
    O->>LLM: Tool result
    LLM-->>O: Natural language response
    O-->>U: Response card + actions
```

### Contact Network
```mermaid
erDiagram
    CONTACT ||--o{ EVENT_CONTACT : participates_in
    EVENT ||--o{ EVENT_CONTACT : involves
    CONTACT ||--o{ SHOOT_CONTACT : works_on
    SHOOT ||--o{ SHOOT_CONTACT : involves

    CONTACT {
        uuid id PK
        string type
        string name
        string email
    }
```

Contact types: `model`, `photographer`, `stylist`, `vendor`, `sponsor`

---

## Diagram Templates by Module

### Events Module Diagrams
Diagrams for event operations cover:
- **Planning flows** - AI-assisted task generation from SOPs
- **Approval chains** - Human-in-loop review before execution
- **Live ops** - Real-time runsheet and cue management
- **Critical path** - Blocker detection and recovery

### Shoots Module Diagrams
Diagrams for shoot operations cover:
- **Brief-to-delivery pipeline** - End-to-end shoot workflow
- **Media processing** - Upload → AI enhancement → compliance → distribution
- **Professional network** - Vendor/talent search and booking
- **Platform content packs** - Multi-platform asset generation

### Intelligence Module Diagrams
Diagrams for the intelligence layer cover:
- **Canvas inheritance** - Brand DNA → Module canvases hierarchy
- **Validation loops** - Score → flag → remediate → rescore
- **RAG pipeline** - Query → retrieve → generate with citations
- **Playbook execution** - Template → customize → execute → track

### Operations Module Diagrams
Diagrams for ops dashboards cover:
- **Kanban lifecycle** - Briefing → Queue → In Progress → AI Review → Human Review → Done
- **Task routing** - Intent classification → agent assignment
- **Error recovery** - Error type → appropriate fallback strategy

---

## Existing Diagram Patterns

These patterns are established in `tasks/mermaid/`:

### Decision Flow (graph TD)
Used for: agent routing, approval chains, error handling
```
graph TD
    A[Trigger] --> B{Decision?}
    B -->|Path A| C[Action]
    B -->|Path B| D[Alternative]
```

### Tool Execution (sequenceDiagram)
Used for: API flows, agent-tool interactions, user requests
```
sequenceDiagram
    participant U as User
    participant A as Agent
    participant T as Tool Layer
    participant DB as Database
```

### Kanban Pipeline (graph TD)
Used for: operations status flows, content pipelines
```
graph TD
    A[Start] --> B[Queue]
    B --> C[In Progress]
    C --> D[Review]
    D --> E{Pass?}
    E -->|Yes| F[Done]
    E -->|No| C
```

---

## Three-Panel Layout Context

FashionOS uses a 3-panel layout: **Context | Work | Intelligence**

When diagramming UI flows, represent panel interactions:
```mermaid
graph LR
    subgraph Context Panel
        A[Navigation]
        B[Filters]
    end
    subgraph Work Panel
        C[Main Content]
        D[Actions]
    end
    subgraph Intelligence Panel
        E[AI Suggestions]
        F[Validation Score]
    end

    A --> C
    B --> C
    D --> E
    E --> F
```

Core principle: "Humans decide. AI assists. Nothing happens silently."
