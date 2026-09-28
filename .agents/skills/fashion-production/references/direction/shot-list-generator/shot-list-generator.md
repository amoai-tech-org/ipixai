---
name: shot-list-generator
description: Generate structured shot-by-shot tables from shoot briefs with timing, crew assignments, setup groups, and channel targets. Use when converting a brief or production package into an actionable shot list for photographers.
metadata:
  author: iPix
  version: "1.0"
  category: production-planning
  requires: brief-data
---

# Shot List Generator

## When to Use This Skill

Use when you need to:
- Convert a brief or canvas into a structured shot list
- Plan shot sequence and timing for a shoot day
- Assign crew and equipment per shot
- Group shots by setup to minimize changeover time
- Map shots to delivery channels (Shopify, Amazon, Instagram, etc.)

## Core Principle

**Actionable > Abstract.** "40% product shots" is a strategy. "Shot A01: Hero front, white bg, 85mm, f/2.8, 09:00, Photo + Assistant" is a plan.

## Shot List Structure

Every shot list has these columns:

```
| Shot # | Type | Description | Channel | Setup | Time | Duration | Crew | Equipment | Props | Priority | Status |
```

### Column Definitions

| Column | Format | Example |
|--------|--------|---------|
| Shot # | `[Setup Letter][Sequence]` | A01, A02, B01, C01 |
| Type | One of 8 types | Hero, Product, Editorial, Lifestyle, Social, Video, Detail, Flat Lay |
| Description | Specific shot description | "Front view, white background, centered" |
| Channel | Target platform | Shopify, Amazon, Instagram, TikTok, Pinterest, Press |
| Setup | Group letter (minimize changeovers) | A = Studio white bg, B = Lifestyle café, C = Editorial studio |
| Time | Scheduled start | 09:00, 09:15, 10:30 |
| Duration | Minutes per shot | 10, 15, 20 |
| Crew | Who's needed | Photo, Photo+Model, Photo+Model+MUA |
| Equipment | Specific gear | "85mm f/1.4, softbox 120cm" |
| Props | Items needed | "Coffee cup, leather bag, plant" |
| Priority | P0 (must have), P1 (should have), P2 (nice to have) | P0 |
| Status | planned / shot / selected / rejected | planned |

## Setup Groups

Group shots by setup to minimize changeover time. Each setup change costs 15-30 minutes.

```
Setup A: Studio — White Background
  Equipment: Seamless white, 2x softbox, product table
  Shots: A01-A15 (all product shots)
  Time: 09:00 - 11:00

Setup B: Location — Café Interior
  Equipment: Natural light kit, reflector, tripod
  Shots: B01-B08 (lifestyle shots)
  Time: 11:30 - 13:00

Setup C: Studio — Editorial
  Equipment: Beauty dish, grey seamless, V-flat
  Shots: C01-C06 (editorial/model shots)
  Time: 14:00 - 16:00
```

**Rule:** Never interleave setups. Shoot all A shots, then change to B, then C.

## Shot Types → Default Specs

### Hero Product (Channel: Shopify, Amazon)
```
Camera: 85mm or 100mm macro
Aperture: f/8-f/11 (maximum sharpness)
Background: White seamless
Lighting: 2-light setup, even coverage
Angles: Front, 45°, side, back, top-down
Duration: 10 min per angle
Priority: P0
```

### Lifestyle (Channel: Instagram, Pinterest)
```
Camera: 35mm or 50mm
Aperture: f/2.8-f/4 (environmental context)
Background: Location-specific
Lighting: Natural or mixed
Angles: Environmental, rule-of-thirds
Duration: 15-20 min per setup
Priority: P1
```

### Detail/Macro (Channel: Amazon, Shopify PDP)
```
Camera: 100mm macro
Aperture: f/2.8 (shallow DOF on detail)
Background: Neutral or product surface
Lighting: Single soft directional
Focus: Stitching, texture, hardware, material
Duration: 5-10 min per detail
Priority: P1
```

### Social/Reel (Channel: TikTok, Instagram Reels)
```
Camera: 35mm or phone-mount
Aperture: f/2.8
Orientation: Vertical 9:16
Lighting: Natural or ring light
Type: Motion, transitions, reveals
Duration: 20-30 min per video
Priority: P1
```

### Flat Lay (Channel: Instagram, Pinterest, Email)
```
Camera: 50mm overhead
Aperture: f/5.6
Background: Styled surface (marble, wood, fabric)
Lighting: Overhead softbox or window
Layout: Curated arrangement with accessories
Duration: 15-20 min per arrangement
Priority: P2
```

## Shot Count Calculator

Based on brief inputs:

```
Product count × angles needed × channels = base shots

Budget adjustment:
  <$2K  → 20-30 shots (1 setup, product only)
  $2-5K → 30-50 shots (2 setups, product + lifestyle)
  $5-10K → 50-80 shots (3 setups, product + lifestyle + editorial)
  $10K+ → 80-120+ shots (4+ setups, full coverage)

Time estimate:
  Product shots: ~10 min each
  Lifestyle shots: ~15 min each
  Detail shots: ~5 min each
  Video clips: ~20 min each
  Setup changes: 20-30 min each

Total time = (shots × avg duration) + (setup changes × 25 min) + breaks
```

## Example Output

### Input
- Brand: Maison Elara (luxury accessories)
- Goal: Launch new silk scarf collection (4 SKUs)
- Budget: $5-10K
- Channels: Shopify, Instagram, Amazon

### Generated Shot List

```
SHOT LIST — Maison Elara SS26 Silk Scarf Collection
Total: 52 shots | 3 setups | Est. time: 7 hours
────────────────────────────────────────────────────

SETUP A: Studio — White Background (09:00 - 11:30)
Equipment: White seamless, 2x softbox 120cm, product table, mannequin bust

Shot  | Type     | Description                    | Channel   | Time  | Dur  | Crew        | Priority
A01   | Hero     | Scarf 1 — flat front, centered | Shopify   | 09:00 | 10m  | Photo+Asst  | P0
A02   | Hero     | Scarf 1 — draped on bust       | Shopify   | 09:10 | 10m  | Photo+Asst  | P0
A03   | Detail   | Scarf 1 — hem stitching macro  | Amazon    | 09:20 | 5m   | Photo       | P1
A04   | Detail   | Scarf 1 — fabric weave macro   | Amazon    | 09:25 | 5m   | Photo       | P1
A05   | Hero     | Scarf 2 — flat front, centered | Shopify   | 09:30 | 10m  | Photo+Asst  | P0
A06   | Hero     | Scarf 2 — draped on bust       | Shopify   | 09:40 | 10m  | Photo+Asst  | P0
A07   | Detail   | Scarf 2 — print detail macro   | Amazon    | 09:50 | 5m   | Photo       | P1
...   | ...      | ... (A08-A16 for Scarves 3-4)  | ...       | ...   | ...  | ...         | ...
A17   | Flat Lay | All 4 scarves, styled          | Instagram | 11:00 | 15m  | Photo+Styl  | P1
A18   | Flat Lay | 2 scarves + accessories         | Pinterest | 11:15 | 15m  | Photo+Styl  | P2

SETUP CHANGE (11:30 - 12:00) — Move to café location

SETUP B: Location — Café Lifestyle (12:00 - 13:30)
Equipment: Reflector, 50mm lens, natural light

Shot  | Type      | Description                    | Channel   | Time  | Dur  | Crew              | Priority
B01   | Lifestyle | Model at café table, scarf 1   | Instagram | 12:00 | 15m  | Photo+Model+MUA   | P1
B02   | Lifestyle | Model walking, scarf 2 draped  | Instagram | 12:15 | 15m  | Photo+Model       | P1
B03   | Social    | Model styling scarf 3 ways     | TikTok    | 12:30 | 20m  | Photo+Model       | P1
B04   | Lifestyle | Model seated, reading, scarf 3 | Pinterest | 12:50 | 15m  | Photo+Model       | P2
B05   | Social    | Unboxing reveal, slow motion   | IG Reels  | 13:05 | 20m  | Photo+Hands model | P2

LUNCH (13:30 - 14:30)

SETUP C: Studio — Editorial (14:30 - 16:30)
Equipment: Beauty dish, grey seamless, V-flat, 85mm

Shot  | Type      | Description                     | Channel  | Time  | Dur  | Crew              | Priority
C01   | Editorial | Model portrait, scarf as accent  | Press    | 14:30 | 15m  | Photo+Model+MUA   | P0
C02   | Editorial | Full body, scarf styled formal   | Lookbook | 14:45 | 15m  | Photo+Model+Styl  | P0
C03   | Editorial | Movement shot, scarf flowing     | Campaign | 15:00 | 15m  | Photo+Model       | P1
...   | ...       | ... (C04-C08)                    | ...      | ...   | ...  | ...               | ...
```

## Integration with Other Skills

| Skill | How It Connects |
|-------|----------------|
| `product-photography` | Shot type specs feed into column defaults |
| `fashion-model-photography` | Model shots get pose direction added |
| `garment-lifestyle-photography` | Lifestyle shots get environment specs |
| `macro-product-photography` | Detail shots get 3-level material specs |
| `call-sheet-generator` | Shot list feeds crew schedule |
| `lighting-plan-generator` | Each setup gets lighting specs |

## Validation Rules

Before finalizing:
- [ ] Every P0 shot is scheduled
- [ ] Setup changes are grouped (no interleaving)
- [ ] Total time fits shoot day (max 10 hours including breaks)
- [ ] Crew is assigned for every shot that needs them
- [ ] Model call time allows for HMU (add 60-90 min before first model shot)
- [ ] Every channel has at least one P0 shot
- [ ] Budget covers crew rates × hours
