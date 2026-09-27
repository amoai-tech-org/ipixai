# Implementation checklists

> Use with [`README.md`](./README.md) master backlog. Mark items only after MCP/CLI verification.

---

## 1. HTML → React conversion

Per screen · discipline: [`../designtoreact.md`](docs/designtoreact.md)

- [ ] DC source identified in `Pages/*.dc.html`
- [ ] Route exists and matches `SCREEN-REGISTRY.md`
- [ ] Tokens/spacing match `styles/tokens.css`
- [ ] OperatorShell + IntelligencePanel + ChatDock preserved
- [ ] Loading / empty / error states (SC2)
- [ ] StatusChip used (SC1) where design shows status dots
- [ ] No redesign — lift copy and layout from DC
- [ ] Mobile reflow checked @390 / 768 / 1024
- [ ] Fixture data labeled if backend not wired yet

---

## 2. Shared components

| Component | DC source | Extracted? | Used by |
|---|---|:--:|---|
| StatusChip | `components/StatusChip.dc.html` | 🔴 | CRM, lists |
| EmptyState | `components/EmptyState.dc.html` | 🔴 | all lists |
| ErrorState | `docs/design/STATES.md` | 🔴 | all data surfaces |
| SearchBar / FilterBar / PageHeader | `components/*.dc.html` | 🟡 | EntityList |
| AssetCard | `components/AssetCard.dc.html` | ⚪ | Assets, Shoot Detail |
| CampaignCard | `components/CampaignCard.dc.html` | ⚪ | Campaigns |
| EvidenceBlock | `components/EvidenceBlock.dc.html` | ✅ | Brand, Wizard |
| ApprovalCard | brand-hub | ✅ | HITL flows |

---

## 3. Shared templates

| Template | Generalize from | Status |
|---|---|:--:|
| EntityList\<T\> | brand-list-workspace | 🟡 |
| Profile360 | brand-detail-workspace | 🟡 |
| WizardShell | shoots/new (801 ln) | 🔴 |
| DetailShell | shoot-detail-client | 🟡 |
| Timeline | crm_activities feed | ⚪ |
| Gallery | Assets masonry | ⚪ |

---

## 4. Frontend wiring

Wire only where backend exists ([`data/supabase-plan.md`](../plan/data/supabase-plan.md)).

| Screen | Query / RPC | Hook / action | Status |
|---|---|---|:--:|
| CRM lists | `crm_companies`, `crm_contacts` | server component + RLS | ⚪ |
| CRM pipeline | `crm_deals` | drag → `move-deal-stage` tool | ⚪ |
| Shoot Detail | `get_shoot_detail` | per-tab loader | 🟡 |
| Assets | `get_brand_assets` | `/api/assets` route | ⚪ |
| Notifications | `list_notifications`, `mark_notifications_read` | inbox page | ⚪ |
| Booking Detail | `get_booking`, `transition_booking` | `talent.bookings` | ⚪ |
| Booking Wizard | `create_booking_request` | form → RPC | ⚪ |
| Matching | `search_talent`, `toggle_shortlist_item` | talent tab | 🟡 partial |

---

## 5. Supabase wiring

### Done ✅

- [x] CRM `crm_*` + RLS + terminal trigger
- [x] `talent.*` booking schema + party RLS
- [x] Booking FSM RPCs (create, transition, confirm, list, get)
- [x] `search_talent`, `toggle_shortlist_item`
- [x] Notifications + list/mark-read RPCs
- [x] Shoot `get_shoot_detail`, `commit_shoot_draft`
- [x] Brand crawl + intelligence edge fns

### Remaining

- [ ] **D1** Campaigns schema ([BE-D1](./backend/BE-D1-campaigns-schema-IPI-268.md))
- [ ] **D2** Analytics views/RPCs ([BE-D2](./backend/BE-D2-analytics-views-rpcs.md))
- [ ] **RT1** Realtime publications ([BE-RT1](./backend/BE-RT1-realtime-notifications-bookings.md))
- [ ] **ST1** Storage buckets ([BE-ST1](./backend/BE-ST1-storage-buckets.md))
- [ ] **B4-RPC** `set_availability_batch` ([BE-B4](./backend/BE-B4-set-availability-batch.md))
- [ ] **CRM-OPT** convenience RPCs ([BE-CRM-opt](./backend/BE-CRM-opt-convenience-rpcs.md))

Verify: local fresh replay (`supabase start` → `supabase db reset --local`) + affected targeted SQL/security tests; CI `supabase-fresh-replay` must pass.

---

## 6. AI integration

Per screen: IntelligencePanel · route agent · EvidenceBlock · HITL

| Screen | Agent | Tools / workflow | HITL | Status |
|---|---|---|:--:|:--:|
| Shoot Wizard | production-planner | shoot-wizard workflow | ✅ | 🟢 |
| Brand Detail | brand-intelligence | crawl + scoring | ✅ | 🟢 |
| CRM 26–31 | crm-assistant | search, move-deal, log-activity | ⚪ won/lost | 🟡 |
| Matching | model-match | partial page tools | ⚪ | 🟡 |
| Booking Wizard | **booking** (missing) | draft quote/message | required | 🔴 |
| Analytics | analytics-intelligence | — | — | ⚪ |
| Assets / Campaigns | visual-identity / creative-director | route only | ⚪ | 🟡 |

Backend AI task: [BE-B0b-booking-mastra-agent.md](./backend/BE-B0b-booking-mastra-agent.md)

---

## 7. Mobile

- [ ] MobileShell + BottomNavigation (`M1`)
- [ ] BottomSheet + focus trap (`M2`)
- [ ] Responsive gate @390 / 430 / 768 / 1024 (`M3`)
- [ ] Pipeline kanban → stage accordion on mobile
- [ ] Long-press select + action sheet
- [ ] Streaming `aria-live` regions

---

## 8. Testing

- [ ] `cd app && npm run lint && npm run build && npm test`
- [ ] Local fresh replay (`supabase start` → `supabase db reset --local`) + affected targeted SQL/security tests (if migrations/RLS)
- [ ] Playwright smoke for wired screens
- [ ] axe a11y on CRM + Booking flows
- [ ] Lighthouse on Command Center + Brand Detail
- [ ] Visual regression vs DC (optional)

---

## 9. Production readiness

- [ ] No `SectionPlaceholder` on P1 screens
- [ ] Fixture labels removed or replaced with live data
- [ ] Error boundaries + empty states on all data routes
- [ ] Secrets not in client bundle
- [ ] Linear issue → Done + tracker updated
- [ ] One concern per PR merged
