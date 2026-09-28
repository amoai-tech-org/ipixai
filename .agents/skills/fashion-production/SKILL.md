---
name: fashion-production
description: >
  Fashion shoot-production toolkit — the real-shoot pipeline from creative direction to
  delivery, consolidated into one skill with phase-organized references. Use for: creative
  direction / concept / moodboard rationale; shot lists (brief → shot-by-shot table with
  timing/crew/setup groups/channels); crew call sheets; model direction / casting / pose cards;
  garment lifestyle & location shoot briefs (scouting, props, talent); product, macro, Amazon,
  and Shopify product-photography specs (shot types, camera, lighting, QC); lighting plans
  (key/fill/accent per shot type & brand DNA); live shoot-day coordination (shot counter,
  schedule, issue log, reshuffling); post-shoot asset triage (auto-sort by shot/setup/channel,
  roughs vs finals, EXIF match); and AI ad generation via ComfyDeploy Morpheus. Triggers on
  shoot, shot list, call sheet, lighting plan, retouch/QC brief, lookbook, editorial, product
  shoot, reshoot, or any fashion production-planning task.
version: 1.0.0
metadata:
  priority: 3
---

# Fashion Production Skills Hub

One consolidated skill for fashion shoot production. **Load the matching `references/` file on
demand** — do not paste reference bodies here. Organized by **shoot phase**, mirroring the shoot
pipeline in `docs/prd/shoot-prd.md §8`.

> **Consolidation note (v1.0.0):** the former standalone skills `creative-director`,
> `shot-list-generator`, `call-sheet-generator`, `fashion-model-photography`,
> `garment-lifestyle-photography`, `product-photography`, `macro-product-photography`,
> `lighting-plan-generator`, `shoot-day-coordinator`, `asset-triage`, `morpheus-fashion-design`,
> plus `amazon-product-photography` and `shopify-product-photography-guide`, are now `references/`
> inside this skill. Behavior preserved; only the packaging changed.

---

## Routing by shoot phase

| Phase | Use when | Reference |
|-------|----------|-----------|
| **Direction** | Creative concept, moodboard rationale, visual direction from Brand DNA | [`references/direction/creative-director/creative-director.md`](references/direction/creative-director/creative-director.md) |
| **Direction** | Brief → shot-by-shot table (timing, crew, setup groups, channels) | [`references/direction/shot-list-generator/shot-list-generator.md`](references/direction/shot-list-generator/shot-list-generator.md) |
| **Direction** | Crew call sheet from shoot brief (schedule, crew, location, equipment) | [`references/direction/call-sheet-generator/call-sheet-generator.md`](references/direction/call-sheet-generator/call-sheet-generator.md) |
| **Styling** | Model direction, casting briefs, pose cards, stylist/HMU pulls | [`references/styling/fashion-model-photography/fashion-model-photography.md`](references/styling/fashion-model-photography/fashion-model-photography.md) |
| **Styling** | Lifestyle / location shoot briefs (scenes, scouting, props, talent) | [`references/styling/garment-lifestyle-photography/garment-lifestyle-photography.md`](references/styling/garment-lifestyle-photography/garment-lifestyle-photography.md) |
| **Capture** | Product photography specs (5 shot types, camera, lighting, QC) | [`references/capture/product-photography/product-photography.md`](references/capture/product-photography/product-photography.md) |
| **Capture** | Macro / detail shot specs + QC pass/fail | [`references/capture/macro-product-photography/macro-product-photography.md`](references/capture/macro-product-photography/macro-product-photography.md) |
| **Capture** | Lighting plans (key/fill/accent per shot type & DNA) | [`references/capture/lighting-plan-generator/lighting-plan-generator.md`](references/capture/lighting-plan-generator/lighting-plan-generator.md) |
| **Capture** | Amazon listing photography (7-image, infographics, compliance) | [`references/capture/amazon-product-photography/amazon-product-photography.md`](references/capture/amazon-product-photography/amazon-product-photography.md) |
| **Capture** | Shopify / DIY product photography (setup, backgrounds, 360, editing) | [`references/capture/shopify-product-photography-guide/shopify-product-photography-guide.md`](references/capture/shopify-product-photography-guide/shopify-product-photography-guide.md) |
| **Shoot day** | Live tracking — shot counter, schedule, issue log, reshuffle | [`references/shoot-day/shoot-day-coordinator/shoot-day-coordinator.md`](references/shoot-day/shoot-day-coordinator/shoot-day-coordinator.md) |
| **Post** | Triage bulk uploads — sort by shot/setup/channel, roughs vs finals, EXIF | [`references/post/asset-triage/asset-triage.md`](references/post/asset-triage/asset-triage.md) |
| **Post** | Flag failed/below-standard shots → actionable reshoot briefs (from QC/DNA fails) | [`references/post/retake-flagging/retake-flagging.md`](references/post/retake-flagging/retake-flagging.md) |
| **AI generation** | ComfyDeploy Morpheus fashion/product ad images | [`references/ai-generation/morpheus-fashion-design/morpheus-fashion-design.md`](references/ai-generation/morpheus-fashion-design/morpheus-fashion-design.md) |

## Pipeline (mirrors `shoot-prd.md §8`)

```
Direction ──→ Shot List ──→ Styling ──→ Capture specs ──→ Shoot Day ──→ Triage/Post
(creative-   (shot-list-   (model/     (product/macro/    (shoot-day-   (asset-triage)
 director)    generator,    garment)    lighting/Amazon/   coordinator)
              call-sheet)               Shopify)
          └────────────── morpheus-fashion-design = AI-generated ads (parallel) ──────────┘
```

### Related sibling skills (not folded in)
| Task | Skill |
|------|-------|
| Pre-build creative exploration / requirements | [`brainstorming`](../brainstorming/SKILL.md) (generic, not shoot-specific) |
| Web/UI boutique theme styling (typography, components) | [`ipix-wireframe`](../ipix-wireframe/SKILL.md) for the screen spec + [`nextjs-developer`](../nextjs-developer/SKILL.md) for implementation (UI theming only — **not** shoot styling) |
| Shoot data model, wizard, DNA handoff | `docs/prd/shoot-prd.md` |
| iPix task lifecycle and repo routing | [`tasks`](../tasks/SKILL.md) |

---

## How to use this skill
1. Identify the **shoot phase** from the routing table / pipeline.
2. Load **only** that phase's reference guide.
3. Some references carry their own assets/scripts (e.g. `ai-generation/morpheus-fashion-design/scripts/`) — use them when the guide points there.
