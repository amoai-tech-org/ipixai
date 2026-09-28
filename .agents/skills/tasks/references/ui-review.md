# UI task and PR review standard

Use wireframes/state matrices before or during implementation when they prevent ambiguity. Do not create diagrams only for decoration.

## Require a Mermaid diagram when useful for

- auth/tenant boundaries
- Supabase reads/writes
- Mastra workflows
- CopilotKit/AG-UI interactions
- Cloudinary processing
- HITL/approval flows
- multi-service ownership

Compare the implementation against the diagram before commit. A missing auth/approval/source-of-truth hop is a blocker.

## Require a wireframe/state matrix for UI-heavy work

At minimum define applicable states:

| State | Expected behavior |
| -- | -- |
| Loading | honest progress/skeleton |
| Empty | truthful empty state |
| No match | search/filter feedback |
| Error | actionable error/retry behavior |
| Normal | real persisted data |
| Forbidden/not found | safe outward behavior |
| Mobile ~390px | no overflow/broken controls |
| Keyboard | visible focus + usable interactions |

For Lumina migrations, use the wireframe to distinguish presentation worth preserving from stale data/auth/workflow behavior that must be rewritten or dropped.

Use automated accessibility checks only when an existing repository tool/path is already available. Otherwise verify keyboard, focus, semantic roles/names, and screen-reader-relevant behavior with the existing browser stack; do not add a new dependency merely because this standard mentions accessibility.

## Agent prompt

```text
Review this UI change against the real user journey and state matrix, not screenshots alone. Use a Mermaid flow when ownership/data/auth transitions are non-trivial and a lightweight wireframe when layout/state behavior matters. Verify normal, loading, empty, no-match, error, forbidden/not-found, desktop, ~390px mobile, keyboard/focus, and navigation states as applicable. Compare implementation to current iPix design primitives and real data contracts; remove fake/demo behavior and dead actions. Use Playwright/browser proof for observable behavior and report any visual, accessibility, routing, console, or network failure before approving the UI checkpoint.
```

## Journey context

Use [user-journey-testing.md](user-journey-testing.md) when the UI is one step in a broader operator outcome. Browser proof must show the real journey continues correctly across navigation, auth/tenant boundaries, data, integrations, and approval state, not just that the screen looks correct.
