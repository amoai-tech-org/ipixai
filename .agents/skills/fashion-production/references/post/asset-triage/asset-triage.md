---
name: asset-triage
description: Organize bulk photo/video uploads from shoots. Auto-sort by shot number, setup group, and channel. Separate roughs from finals. Match files to shot list via EXIF data. Use after a shoot when processing uploaded assets.
metadata:
  author: iPix
  version: "1.0"
  category: post-production
  requires: shot-list-data, exif-data
---

# Asset Triage

## When to Use This Skill

Use when you need to:
- Organize 50-500+ RAW files from a shoot day
- Match uploaded photos to shot list entries
- Separate rough selects from finals
- Auto-tag assets by shot type, setup group, and channel
- Prepare assets for DNA compliance review
- Create a pick sheet for client review

## Core Principle

**Photographers shoot. Someone else organizes.** A 200-file upload with no structure is useless. Auto-sort by shot list, flag the selects, and get to review in minutes, not hours.

## Triage Workflow

```
UPLOAD → PARSE EXIF → MATCH TO SHOT LIST → AUTO-TAG → SORT → FLAG SELECTS → READY FOR REVIEW

Step 1: INGEST
  - Accept: RAW (.CR3, .NEF, .ARW), JPEG, TIFF, MP4, MOV
  - Extract EXIF: timestamp, camera, lens, focal length, aperture, ISO, shutter
  - Generate thumbnails for preview grid

Step 2: MATCH TO SHOT LIST
  - Primary match: EXIF timestamp → shot list time slot
  - Secondary match: Camera body serial → assigned setup
  - Fallback: Manual drag-to-assign in UI

Step 3: AUTO-TAG
  - Shot number (A01, A02, B01...)
  - Setup group (A, B, C...)
  - Shot type (hero, detail, lifestyle, editorial, flat lay, video)
  - Channel target (Shopify, Amazon, Instagram, TikTok...)
  - Crew member (photographer name from EXIF camera body)

Step 4: SORT
  - Group by setup → shot number → sequence
  - Separate: Roughs (all shots) vs Selects (flagged best)
  - Flag duplicates (same shot, multiple frames)

Step 5: SELECT
  - Auto-select sharpest frame per shot (focus analysis)
  - Flag exposure issues (blown highlights, crushed blacks)
  - Mark ready-for-review vs needs-reshoot
```

## File Organization Structure

```
/brand-name/shoot-date/
├── _selects/                    # Best picks, ready for post-production
│   ├── A-product/
│   │   ├── A01_hero_front_SELECT.CR3
│   │   ├── A02_hero_45deg_SELECT.CR3
│   │   └── A03_detail_stitch_SELECT.CR3
│   ├── B-lifestyle/
│   │   ├── B01_cafe_scene_SELECT.CR3
│   │   └── B02_street_walk_SELECT.CR3
│   └── C-editorial/
│       ├── C01_beauty_dish_SELECT.CR3
│       └── C02_full_length_SELECT.CR3
│
├── _all-shots/                  # Every frame, organized by setup
│   ├── A-product/
│   │   ├── A01_hero_front_001.CR3
│   │   ├── A01_hero_front_002.CR3      # duplicate frame
│   │   ├── A01_hero_front_003.CR3      # duplicate frame
│   │   └── ...
│   ├── B-lifestyle/
│   └── C-editorial/
│
├── _flagged/                    # Issues requiring attention
│   ├── reshoot-needed/          # Failed shots (soft focus, exposure, etc.)
│   ├── review-required/         # Ambiguous — needs human decision
│   └── alternate-picks/         # Good but not primary select
│
├── _video/                      # Video assets separated
│   ├── raw/
│   ├── selects/
│   └── b-roll/
│
└── _metadata/
    ├── shot-match-report.json   # Which files matched which shots
    ├── exif-summary.csv         # All EXIF data in one sheet
    ├── coverage-report.md       # Shot list completion status
    └── triage-log.md            # Processing decisions and flags
```

## Shot Match Report

```json
{
  "shoot": {
    "brand": "Maison Elara",
    "date": "2026-03-15",
    "total_files": 247,
    "matched": 231,
    "unmatched": 16,
    "match_rate": "93.5%"
  },
  "coverage": {
    "total_planned_shots": 52,
    "shots_covered": 48,
    "shots_missing": 4,
    "missing_shots": ["A12", "B08", "C03", "C07"]
  },
  "selects": {
    "total": 52,
    "auto_selected": 44,
    "manual_review_needed": 8,
    "flagged_reshoot": 4
  },
  "quality_flags": {
    "soft_focus": 3,
    "exposure_issues": 5,
    "color_cast": 2,
    "composition_crop_needed": 7
  }
}
```

## Coverage Report Template

```
COVERAGE REPORT — [Brand] [Shoot Date]

SHOT LIST COMPLETION:
  Total planned: 52 shots
  Covered:       48 shots (92%)
  Missing:       4 shots (8%)

MISSING SHOTS:
  A12 — Product detail, button close-up (Setup A, was scheduled 10:45)
  B08 — Lifestyle, model reading café (Setup B, model left early)
  C03 — Editorial, profile shot (Setup C, lighting issue)
  C07 — Editorial, hands detail (Setup C, ran out of time)

RECOMMENDATION:
  A12, C07 — Can reshoot with existing setup (15 min each)
  B08 — Requires model recall (schedule separately)
  C03 — Reshoot in next session (lighting needs adjustment)

SETUP COVERAGE:
  Setup A (Product):    15/15 shots ██████████ 100%
  Setup B (Lifestyle):  11/12 shots █████████░  92%
  Setup C (Editorial):   6/8 shots  ███████░░░  75%
  Video:                16/17 shots █████████░  94%

SELECT QUALITY:
  Ready for post:       44 selects  ████████░░  85%
  Needs manual review:   8 selects  ██░░░░░░░░  15%
  Flagged reshoot:       4 shots    █░░░░░░░░░   8%
```

## Auto-Select Criteria

| Criteria | Weight | Method |
|----------|--------|--------|
| Sharpness | 40% | Edge detection analysis on subject area |
| Exposure | 25% | Histogram analysis — no clipping |
| Composition | 15% | Rule of thirds alignment, headroom |
| Expression (models) | 15% | Eyes open, natural pose, no blink |
| Technical | 5% | No camera shake, correct white balance |

## EXIF-Based Matching Rules

```
MATCHING PRIORITY:

1. Timestamp match (±5 min of scheduled shot time)
   → High confidence match to shot list entry

2. Camera body match (serial → assigned setup)
   → If Camera A = Setup A, Camera B = Setup B
   → Match by camera even if timestamps drift

3. Lens match (focal length → shot type)
   → 85mm = hero/editorial
   → 50mm = lifestyle
   → 100mm macro = detail
   → 24-70mm = flat lay / behind scenes

4. Settings cluster (aperture + focal length pattern)
   → f/2.8 + 85mm cluster = editorial portraits
   → f/8 + 50mm cluster = product white bg
   → f/4 + 35mm cluster = lifestyle

5. Fallback: Sequence number + manual assignment
```

## DNA Audit Gate

**Do NOT run DNA compliance on raw uploads.**

```
TRIAGE → SELECT → COLOR CORRECT → THEN DNA AUDIT

Why:
- RAW files have flat color profiles (not brand-accurate)
- White balance may be off (will be corrected in post)
- Exposure adjustments change the look significantly
- DNA scoring raw files gives false negatives

Gate:
- [ ] Files sorted and matched to shot list
- [ ] Selects picked (rough cut)
- [ ] Color correction applied (at minimum: WB + exposure)
- [ ] THEN flag for AestheticAuditor DNA review
```

## Validation

- [ ] All uploaded files have EXIF data parsed
- [ ] 90%+ files matched to shot list entries
- [ ] Coverage report shows missing shots clearly
- [ ] Selects folder has exactly 1 file per planned shot
- [ ] Flagged items have specific reason (not just "review")
- [ ] Video assets separated from stills
- [ ] No files lost or orphaned in triage
- [ ] DNA audit gate respected (no scoring pre-color-correction)
