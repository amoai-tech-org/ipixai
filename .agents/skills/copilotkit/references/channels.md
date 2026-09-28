# CopilotKit Channels — iPix routing reference

Upstream has **two different managed-Channel skills** plus separate self-hosted adapter packages. Route correctly before implementation.

## Which path?

| Need | Use |
|---|---|
| First end-to-end Slack/Teams setup from nothing | `channels-setup` + live `https://copilotkit.ai/channels-guide.md` |
| Code half of an existing managed Intelligence Channel | `copilotkit-channels` |
| iPix owns provider credentials/ingress itself | self-hosted `@copilotkit/channels-*` adapters; do **not** treat as managed Intelligence Channels |

Official upstream:
- https://github.com/CopilotKit/CopilotKit/tree/main/skills/channels-setup
- https://github.com/CopilotKit/CopilotKit/tree/main/skills/copilotkit-channels
## iPix rule

Channels are **optional/external delivery**, not Planner Core. Use them only for explicit workflows such as approved campaign notifications, booking coordination, or operations alerts.

For managed Channels, the upstream code skill requires a **long-running host**; do not move Channel activation into a serverless Next.js route. Confirm whether the project already has `channel-host.mts` before declaring another Channel.

For first-time setup, fetch the live guide and verify its body begins with `# Build and prove a CopilotKit Channels agent` and contains five `## Phase` headings. A HTTP 200 alone is not proof because the site can return a not-found page with status 200.

For existing managed Channel code, verify with the current CLI and a **real provider mention/DM**. Stored credentials or a green dashboard badge are not proof of message delivery.

Before adopting Intelligence-managed Channels, confirm product/licensing fit. Do not move iPix durable Brand/Shoot/Campaign/Asset/Booking truth into CopilotKit Intelligence.