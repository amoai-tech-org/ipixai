---
name: call-sheet-generator
description: Auto-generate crew call sheets from shoot brief data. Includes schedule, crew assignments, location details, equipment checklist, and emergency contacts. Use when preparing for a shoot day.
metadata:
  author: iPix
  version: "1.0"
  category: production-planning
  requires: shot-list-data
---

# Call Sheet Generator

## When to Use This Skill

Use when you need to:
- Prepare a crew briefing document for shoot day
- Generate a printable/PDF call sheet from brief data
- Communicate schedule, location, and crew assignments
- Ensure everyone knows where to be and when

## Core Principle

**Everything the crew needs on one page.** A call sheet answers: When? Where? Who? What? In that order.

## Call Sheet Template

```
═══════════════════════════════════════════════════════════
                      CALL SHEET
═══════════════════════════════════════════════════════════

PROJECT:  [Brand Name] — [Shoot Name]
DATE:     [Day, Month DD, YYYY]
WEATHER:  [Forecast or "Studio — N/A"]

PRODUCTION CONTACT:
  [Name] — [Phone] — [Email]

═══════════════════════════════════════════════════════════
                      LOCATIONS
═══════════════════════════════════════════════════════════

LOCATION 1: [Name]
  Address:  [Full address]
  Parking:  [Instructions]
  Access:   [Door code / contact on arrival]
  WiFi:     [Network / Password]
  Notes:    [Elevator, loading dock, etc.]

LOCATION 2: [Name] (if applicable)
  Address:  [Full address]
  Travel:   [Est. travel time from Location 1]

═══════════════════════════════════════════════════════════
                      CREW CALL TIMES
═══════════════════════════════════════════════════════════

  CALL    ROLE              NAME            PHONE
  ────    ────              ────            ─────
  07:30   Photographer      [Name]          [Phone]
  07:30   Photo Assistant   [Name]          [Phone]
  08:00   Stylist           [Name]          [Phone]
  08:00   MUA / Hair        [Name]          [Phone]
  09:00   Model 1           [Name]          [Phone]
  09:00   Model 2           [Name]          [Phone]
  08:00   Creative Director [Name]          [Phone]

═══════════════════════════════════════════════════════════
                      SCHEDULE
═══════════════════════════════════════════════════════════

  TIME        ACTIVITY                    SETUP
  ────        ────────                    ─────
  07:30       Crew call / Load in
  07:30-08:30 Lighting + backdrop setup    Setup A
  08:00-09:00 Styling prep + steam
  08:00-09:00 Model HMU
  09:00-11:00 SETUP A: Product shots       [Location 1]
              [15 shots, P0]
  11:00-11:30 Setup change → Location
  11:30-13:00 SETUP B: Lifestyle           [Location 2]
              [8 shots, P1]
  13:00-14:00 LUNCH (catered / self)
  14:00-16:00 SETUP C: Editorial           [Location 1]
              [6 shots, P0-P1]
  16:00-16:30 Wrap + load out

  TOTAL:      52 shots planned
  HARD WRAP:  17:00

═══════════════════════════════════════════════════════════
                    EQUIPMENT CHECKLIST
═══════════════════════════════════════════════════════════

  CAMERA
  □ Camera body (+ backup)
  □ 85mm f/1.4
  □ 35mm f/1.4
  □ 100mm macro
  □ Memory cards (x4)
  □ Batteries (x3)
  □ Tethering cable + laptop

  LIGHTING
  □ Softbox 120cm (x2)
  □ Beauty dish
  □ Strip softbox
  □ Reflector (white/silver)
  □ V-flat (white/black)
  □ Light stands (x4)
  □ Sandbags (x4)
  □ CTO/CTB gels

  GRIP
  □ White seamless backdrop (x2 rolls)
  □ Grey seamless (x1 roll)
  □ C-stands (x3)
  □ Clamps (x6)
  □ Gaffer tape

  STYLING
  □ Steamer
  □ Clips + pins
  □ Product inventory (confirmed count)
  □ Accessories as per styling guide
  □ Lint roller

═══════════════════════════════════════════════════════════
                    PRODUCT INVENTORY
═══════════════════════════════════════════════════════════

  #   PRODUCT               SIZE/COLOR      QTY   STATUS
  ──  ────────              ──────────      ───   ──────
  1   Silk Scarf — Ivory    One size        2     ✓ Confirmed
  2   Silk Scarf — Navy     One size        2     ✓ Confirmed
  3   Silk Scarf — Rose     One size        2     ✓ Confirmed
  4   Silk Scarf — Forest   One size        2     ✓ Confirmed

═══════════════════════════════════════════════════════════
                    CATERING / LOGISTICS
═══════════════════════════════════════════════════════════

  Breakfast:  Coffee + pastries on arrival
  Lunch:      [Catered / self-serve / restaurant]
  Dietary:    [Any restrictions]
  Restrooms:  [Location]

═══════════════════════════════════════════════════════════
                    EMERGENCY
═══════════════════════════════════════════════════════════

  Nearest Hospital: [Name + Address]
  First Aid Kit:    [Location on set]
  Fire Exit:        [Location]

═══════════════════════════════════════════════════════════
                    BRAND DNA REFERENCE
═══════════════════════════════════════════════════════════

  Color Palette:  [Top 5 hex codes with names]
  Photography:    [Style direction — clean/editorial/lifestyle]
  Lighting:       [Warm/cool/neutral target]
  NEVER:          [Brand DNA "never" list items]
  ALWAYS:         [Brand DNA "always" list items]

═══════════════════════════════════════════════════════════
```

## Call Time Rules

| Role | Call Time Rule |
|------|---------------|
| Photographer | First call — needs setup time |
| Photo Assistant | Same as photographer or 30 min earlier (heavy setup) |
| Stylist | 30-60 min before first model shot |
| MUA / Hair | 60-90 min before first model shot (HMU takes time) |
| Model | After HMU time — first on-camera time minus HMU duration |
| Creative Director | 30 min before first shot |
| Client | Optional — first shot time or after first setup |

## Auto-Generation from Brief Data

Map brief fields to call sheet sections:

```
wizard_session.form_data → Schedule, Product Inventory
shoots.location_name → Location section
shoots.start_date → Date
shoot_crew → Crew Call Times
shot_list → Shot count, Setup groups
brands.dna_pillars → Brand DNA Reference
contacts → Crew phone numbers
```

## Output Formats

- **Markdown** — for version control and chat display
- **PDF** — for printing and email to crew
- **Mobile** — simplified view for phone screens on set

## Integration

| Skill | Connection |
|-------|-----------|
| `shot-list-generator` | Shot count, setups, timing feed the schedule |
| `lighting-plan-generator` | Equipment checklist per setup |
| `fashion-model-photography` | Model specs + pose direction reference |
