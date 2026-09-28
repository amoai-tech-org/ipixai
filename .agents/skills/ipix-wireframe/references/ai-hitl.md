# iPix AI / HITL Wireframe Contract

Read this when a screen includes CopilotKit, AG-UI, Mastra, AI proposals, approval, retry, suspend/resume, or consequential writes.

## Authority notation

`[AI READS]` context the agent may inspect
`[AI PROPOSES]` draft/recommendation only
`[HUMAN EDITS]` operator may modify proposal
`[HUMAN APPROVES]` explicit decision gate
`[SYSTEM WRITES]` approved durable mutation

## Required sequence

`AI proposes → human reviews/edits → human approves → approved action executes → system records result`

For consequential actions, never design silent publishing, payments, destructive actions, tenant-critical mutation, or direct durable writes when approval is appropriate.

## Screen contract

Identify:
- page state visible to the agent;
- streamed/progress UI;
- exact proposal/revision being approved;
- edit/reject/retry behavior;
- suspend/resume or commit boundary;
- duplicate retry/idempotency risk;
- success/readback state;
- failure/recovery path.

A valid rejection must not commit durable state. A valid approval must commit the reviewed artifact once.
