# iPix Wireframe Contracts

Read this when an implementation wireframe needs detailed stack/tool routing or component/data/state/responsive/accessibility contracts.

## Current iPix tech stack — verify before each task

Read `package.json` and current repo state before relying on versions. Current product layers are:

| Layer | Technology | Wireframe concern |
|---|---|---|
| App/UI | Next.js + React | routes, server/client boundaries, layout, states |
| AI UI | CopilotKit + AG-UI | context, streaming, generative UI, approvals |
| Agent runtime | Mastra | agents, tools, workflows, suspend/resume |
| Durable truth | Supabase/Postgres | fields, RLS, RPCs, tenant-safe writes |
| Media | Cloudinary | real asset slots, uploads, transforms |
| QA | Vitest + Playwright | contract tests, user journeys, traces |
| Design | Figma + approved DC HTML | fidelity, components, annotations |
| Diagrams | Mermaid | journey, sequence, state, ownership, failure paths |
| Delivery | GitHub + Linear | PR evidence, CI, task status, post-merge proof |

## Skills, MCPs, CLIs, and tools

Use only what the task actually needs.

| Need | Use | Why |
|---|---|---|
| Task execution / PR / post-merge | `tasks` | canonical iPix lifecycle |
| Dependency/path discovery | `graphify` + Graphify CLI | fastest current-state map before broad reading |
| Wireframe contract | `ipix-wireframe` | this workflow |
| Diagrams | `mermaid-diagrams` | reasoning + defect discovery |
| Next.js UI | `nextjs-developer` | current App Router contract |
| React performance | `vercel-react-best-practices` | client/render/bundle decisions |
| Data/RLS/RPC | `ipix-supabase` | schema and authorization truth |
| Agent UI | `copilotkit` | AG-UI, context, generative UI, HITL |
| Agents/workflows | `mastra` | tools, memory, workflow authority |
| Media | `cloudinary` | image/video ownership and delivery |
| Independent Done proof | `task-verifier` | challenge unproven claims |
| GitHub state/actions | GitHub connector or `gh` | PR, reviews, CI, exact-head evidence |
| Figma artifact | Figma connector | inspect/create design artifacts when needed |
| Current vendor docs | Context7 + official docs | fast current API lookup; verify load-bearing claims from official/version-specific sources |
| Local repo/runtime | Remote Desktop Commander | inspect code, run commands, verify files |

If Linear/Supabase MCPs are connected, use them for the relevant task, but repository/runtime truth and authorization rules still win.

## 4. CONTRACT — make the wireframe buildable

Every implementation wireframe must include these contracts.

### A. Component reuse map

Search before creating.

| Wireframe block | Existing React target | Decision | Notes |
|---|---|---|---|
| | | Reuse / Adapt / Create / Defer | |

Search components, hooks, CSS, utilities, routes, RPCs/views, and design-system primitives.

### B. Data contract

| Zone | Source of truth | Missing/empty state | Write path |
|---|---|---|---|
| | | | |

Rules:
- No fake business values when the source can be null.
- Do not duplicate mutable truth just to satisfy a wireframe.
- Cloudinary owns media bytes/transforms; Supabase owns iPix business metadata; commerce systems own commerce facts where specified.
- Existing route wiring is preserved unless the Prove step shows it is wrong.

### C. State matrix

Cover relevant states: initial, loading, populated, selected, editing, empty, no-results, error+retry, unavailable access, offline/interrupted, AI streaming, awaiting approval, rejected, committing, and success.

### D. AI / HITL contract

Use explicit annotations in AI-native wireframes:

`[AI READS]` → context the agent may inspect
`[AI PROPOSES]` → draft/recommendation only
`[HUMAN EDITS]` → operator may change proposal
`[HUMAN APPROVES]` → explicit decision gate
`[SYSTEM WRITES]` → approved durable mutation

For consequential actions, show this sequence:

`AI proposes → human reviews/edits → human approves → approved action executes → system records result`.

Do not design silent AI publishing, payments, destructive actions, tenant-critical mutation, or direct durable writes when approval is appropriate.

For CopilotKit/Mastra work, identify:
- What page state is visible to the agent.
- Which output appears in the right rail vs center workspace.
- Streaming/progress states.
- Approval card surface.
- Reject/edit/retry behavior.
- Resume/commit success state.

### E. Responsive contract

Specify behavior, not just screenshots.

Minimum checkpoints:
- Desktop: 1440px.
- Tablet: about 1024px.
- Mobile: 390px.

Define what stays visible, collapses, becomes a drawer/sheet, stacks, scrolls, or moves to bottom navigation. Never assume desktop simply shrinks.

### F. Accessibility contract

Annotate before high fidelity:
- Heading hierarchy and landmark regions.
- Button vs link semantics.
- Keyboard order and focus behavior.
- Form labels and validation placement.
- Dialog/sheet focus management.
- Screen-reader names for icon controls.
- Live announcements for AI/loading/status updates when needed.
- Image alt purpose: informative vs decorative.

### G. Information priority

Use priority markers when space or mobile tradeoffs matter:
`P0` task-critical · `P1` important · `P2` supporting · `P3` optional/advanced.
