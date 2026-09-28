# iPix Wireframe Verification

Read this before declaring a wireframe implementation-ready or when deriving QA scenarios from it. The repository `tasks` skill still owns PR/CI/post-merge lifecycle.

## Wireframe red-flag audit

Before calling a wireframe Ready, confirm:
- User goal is obvious quickly.
- Every primary CTA has a defined result.
- AI authority and human authority are visibly separated.
- Sensitive/destructive actions have an appropriate confirmation gate.
- No fake business data is assumed.
- Every dynamic block has a source of truth.
- Loading, empty, error, and recovery states are represented.
- Tenant/org context is not treated as a browser-authority shortcut.
- Existing components were checked before creating new ones.
- Mobile interaction is realistic, not a scaled desktop screenshot.
- Keyboard navigation is possible.
- QA can derive deterministic tests from the spec.

If any required item fails, the wireframe is not Ready.


## Forensic audit — mandatory before Ready

Act like a forensic auditor. Do not assume the requested screen, gap, component, or data contract is correct.

Check for:
- stale route/design/task assumptions;
- duplicate components or a second source of truth;
- fields shown in UI that current data cannot supply;
- missing loading/empty/error/retry states;
- browser-controlled org/tenant authority;
- AI writes without exact human approval;
- approval detached from the exact proposal/revision;
- duplicate retry/resume side effects;
- inaccessible controls, broken focus, or mobile-only dead ends;
- unsupported skill/tool references;
- existing PR/worktree collisions;
- acceptance criteria with no observable test/readback.

For each finding record: **error/red flag → impact → evidence → smallest fix → verification**. A blocker cannot be overridden by a high score.

## Readiness score

When useful, grade each area `/100`: Current-state proof · User journey · Reuse · Data correctness · States/recovery · AI/HITL safety · Responsive · Accessibility · Testability. Mark scores **provisional** when evidence is incomplete.

- `90–100`: Ready only if no blocker remains.
- `80–89`: Conditional; fix named gaps before implementation/merge.
- `<80`: Not ready.
- Any security, tenant, destructive-write, or approval blocker: **BLOCKED regardless of score**.

## Definition of Ready

- [ ] Goal and persona are explicit.
- [ ] Prove table is complete.
- [ ] Current route/data/component state was inspected.
- [ ] Existing wireframe/DC/Figma reference was checked.
- [ ] User journey is defined.
- [ ] Component reuse map is complete.
- [ ] Data and state contracts are complete.
- [ ] AI/HITL contract is explicit where applicable.
- [ ] Responsive and accessibility behavior are defined.
- [ ] Acceptance criteria and test scenarios exist.

## UI-specific verification

- Primary journey completes with observable success.
- Loading, empty, error, retry, and permission states are honest.
- Responsive behavior matches desktop/tablet/mobile contract.
- Keyboard/focus behavior works.
- Approved Figma/DC target gets visual comparison when required.
- Playwright uses user-facing locators and web-first assertions; avoid fixed sleeps and brittle CSS/XPath.
- AI rejection writes nothing; approval commits the approved artifact once.

For implementation PR/CI/post-merge proof, use the `tasks` skill rather than duplicating lifecycle rules here.
