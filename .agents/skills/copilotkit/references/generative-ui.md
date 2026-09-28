# CopilotKit Generative UI — iPix decision guide

Current docs organize Generative UI into **Tool Rendering, State Rendering, MCP Apps, and A2UI**. For iPix, choose the smallest controlled surface that fits the artifact.

Official sources:
- https://docs.copilotkit.ai/mastra/generative-ui/tool-rendering
- https://github.com/CopilotKit/CopilotKit/tree/main/examples/showcases/generative-ui

## iPix default

```text
Existing backend tool needs custom display → useRenderTool
New render-only component/tool → useComponent
Stable typed business artifact → controlled React component + validated data
Shared-state artifact → State Rendering / useAgent state pattern when justified
Dynamic configurable layout → consider A2UI only when the product truly needs model-selected layout
External embedded interactive surface → MCP Apps only for an explicit integration need
```

Examples of stable iPix artifacts: `ShootPlan`, Brand DNA evidence, deliverables plan, budget estimate, booking quote, campaign brief, approval diff.

**PLAN-001 default:** controlled React Generative UI, not A2UI. iPix owns component structure, accessibility, validation, permissions, and actions; the agent supplies typed data.
