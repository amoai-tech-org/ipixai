---
name: shoot-day-coordinator
description: Real-time shoot day tracking — shot counter, schedule adherence, issue logging, and priority reshuffling. Use during active shoots to manage time, track completion, and adapt when things go wrong.
metadata:
  author: iPix
  version: "1.0"
  category: production-execution
  requires: shot-list-data, call-sheet-data
---

# Shoot Day Coordinator

## When to Use This Skill

Use when you need to:
- Track shot completion in real-time during a shoot
- Monitor schedule adherence and flag delays
- Log issues as they happen (equipment, weather, talent, styling)
- Re-prioritize remaining shots when behind schedule
- Generate end-of-day status report
- Brief crew on schedule changes mid-shoot

## Core Principle

**Briefs take 10 minutes. Shoots take 8 hours.** The most expensive part of a production is time on set. Every minute behind schedule costs money. Track it, flag it, adapt.

## Live Dashboard

```
╔═══════════════════════════════════════════════════════════╗
║  SHOOT TRACKER — Maison Elara SS26 Lookbook              ║
║  Date: March 15, 2026 | Day 1 of 1                       ║
╠═══════════════════════════════════════════════════════════╣
║                                                           ║
║  PROGRESS:  ████████████░░░░░░░░  32/52 shots (62%)      ║
║  TIME:      ████████████████░░░░  12:45 / 16:30 (77%)    ║
║  STATUS:    🟡 15 MIN BEHIND — see recommendations below  ║
║                                                           ║
╠═══════════════════════════════════════════════════════════╣
║  CURRENT:   Setup B — Lifestyle (Café Location)           ║
║  SHOOTING:  B05 — Model with coffee, window light         ║
║  NEXT UP:   B06 — Model walking out, street view          ║
║  ON DECK:   B07 — Detail, bag on table                    ║
╠═══════════════════════════════════════════════════════════╣
║                                                           ║
║  SETUP PROGRESS:                                          ║
║  Setup A (Product):    15/15 ██████████ COMPLETE ✅        ║
║  Setup B (Lifestyle):   5/12 ████░░░░░░ IN PROGRESS 🔄    ║
║  Setup C (Editorial):   0/8  ░░░░░░░░░░ PENDING ⏳        ║
║  Video:                12/17 ███████░░░ PAUSED ⏸️          ║
║                                                           ║
╠═══════════════════════════════════════════════════════════╣
║  ISSUES LOG (3):                                          ║
║  09:42  ⚠️  Softbox fuse blown — replaced, 10 min delay  ║
║  11:15  ⚠️  Model 15 min late from HMU                   ║
║  12:30  📝  Café busy — waiting for clear background      ║
╚═══════════════════════════════════════════════════════════╝
```

## Schedule Tracking

### Time Block Structure

```
SCHEDULE — [Shoot Date]

| Block | Time | Setup | Shots | Status | Actual |
|-------|------|-------|-------|--------|--------|
| 1 | 07:30-08:30 | — | — | Setup + lighting | ✅ Done 08:25 |
| 2 | 08:30-09:00 | — | — | Styling + HMU | ✅ Done 08:55 |
| 3 | 09:00-11:00 | A | 15 shots | Product | ✅ Done 11:10 (+10m) |
| 4 | 11:00-11:30 | — | — | Setup change | ✅ Done 11:40 (+10m) |
| 5 | 11:30-13:00 | B | 12 shots | Lifestyle | 🔄 In progress |
| 6 | 13:00-14:00 | — | — | Lunch | ⏳ Pending |
| 7 | 14:00-16:00 | C | 8 shots | Editorial | ⏳ Pending |
| 8 | 16:00-16:30 | — | — | Wrap | ⏳ Pending |

CUMULATIVE DELAY: +15 minutes
```

### Pace Calculator

```
PACE CHECK:

Shots completed:  32
Time elapsed:     4h 45m (285 min)
Average pace:     8.9 min/shot
Shots remaining:  20
Time remaining:   3h 45m (225 min)
Required pace:    11.25 min/shot

VERDICT: ✅ ON TRACK (current pace faster than required)
         Can absorb ~45 min more delay before cuts needed
```

## Issue Logging

### Issue Entry Format

```
ISSUE LOG ENTRY:

Time:        [HH:MM]
Severity:    [🔴 CRITICAL / 🟡 WARNING / 📝 NOTE]
Category:    [Equipment / Talent / Location / Weather / Styling / Schedule]
Description: [What happened]
Impact:      [Time lost, shots affected]
Resolution:  [What was done / what needs to happen]
Status:      [Resolved / In Progress / Escalated]
```

### Severity Definitions

| Severity | Meaning | Example | Action |
|----------|---------|---------|--------|
| 🔴 CRITICAL | Shoot cannot continue | Camera failure, model injury, venue closed | Stop. Fix or cancel. Notify client. |
| 🟡 WARNING | Delay or quality impact | Equipment malfunction, talent late, weather change | Adapt. Reshuffle schedule. Log delay. |
| 📝 NOTE | Minor, no schedule impact | Small styling fix, background object, light tweak | Note for reference. Continue shooting. |

## Schedule Adaptation

### When Behind Schedule — Decision Tree

```
BEHIND SCHEDULE?
│
├─ < 15 min behind
│   └─ Absorb: Tighten remaining shot times
│       → Reduce takes per shot (3 → 2)
│       → Skip "nice to have" angles
│       → Combine similar setups
│
├─ 15-30 min behind
│   └─ Compress: Cut lower-priority shots
│       → Drop B-roll / BTS shots
│       → Merge similar lifestyle scenes
│       → Shorten lunch by 15 min (crew agreement)
│
├─ 30-60 min behind
│   └─ Prioritize: Cut shots by channel priority
│       → Keep all hero shots (non-negotiable)
│       → Keep channel-critical shots (Amazon main, IG cover)
│       → Cut duplicate angles
│       → Cut alternate styling options
│
└─ > 60 min behind
    └─ Escalate: Major schedule change
        → Notify client/producer
        → Cut entire setup group (lowest priority)
        → Consider overtime (crew + venue cost)
        → Schedule reshoot day for cut shots
```

### Shot Priority Matrix

```
PRIORITY TIERS — Cut from bottom up:

Tier 1: NEVER CUT (hero shots, channel-critical)
  - Main product hero (Shopify/Amazon primary image)
  - Key lifestyle hero (Instagram grid anchor)
  - Editorial cover shot (lookbook cover)

Tier 2: CUT LAST (important but have alternatives)
  - Alternate product angles (45°, back, side)
  - Secondary lifestyle scenes
  - Detail shots (can zoom/crop from wider shots)

Tier 3: CUT FIRST (nice to have)
  - B-roll / atmosphere shots
  - Behind-the-scenes
  - Alternate styling options
  - Extra model poses beyond brief
  - Experimental / creative shots
```

## End-of-Day Report

```
═══════════════════════════════════════════════════
END OF DAY REPORT — [Brand] [Date]
═══════════════════════════════════════════════════

SUMMARY:
  Planned shots:    52
  Completed:        48 (92%)
  Missed:           4 (see below)
  Total shoot time: 7h 15m (planned 7h 30m)

COMPLETION BY SETUP:
  Setup A (Product):    15/15 — 100% ✅
  Setup B (Lifestyle):  11/12 —  92% (B08 missed)
  Setup C (Editorial):   6/8  —  75% (C03, C07 missed)
  Video:                16/17 —  94% (V12 missed)

MISSED SHOTS:
  B08 — Model café reading (model left 15 min early)
  C03 — Editorial profile (lighting issue, ran out of time)
  C07 — Editorial hands detail (cut for schedule)
  V12 — BTS reel (deprioritized)

ISSUES (5 total):
  🟡 x3 — Equipment (softbox fuse, tether disconnect, memory card swap)
  📝 x2 — Location (café busy periods, street noise)

SCHEDULE ADHERENCE:
  Started: On time
  Final:   15 min early (compressed lunch + cut V12)
  Delays:  +25 min total (equipment + talent)
  Recovered: -40 min (compression + cuts)

CREW NOTES:
  Photographer: Strong performance, adapted well to café conditions
  Model: Good energy, makeup touch-up needed for Setup C
  Stylist: Quick changes, no garment issues
  Assistant: Handled equipment issue efficiently

NEXT STEPS:
  1. Upload RAW files tonight → asset triage tomorrow AM
  2. Schedule reshoot for B08, C03, C07 (half-day session)
  3. V12 (BTS) — capture during reshoot session
  4. Selects ready for review by EOD tomorrow

═══════════════════════════════════════════════════
```

## Crew Communication Templates

### Delay Notification

```
CREW UPDATE — [Time]

⚠️ We're running [N] minutes behind.

ADJUSTMENT:
  - [What's changing]
  - [What's being cut or compressed]

NEXT UP:
  - [Next shot] at [new time]

QUESTIONS: Flag now or we're moving on.
```

### Setup Change Brief

```
SETUP CHANGE — Moving to Setup [X]

WHAT: [Setup name and description]
WHERE: [Location within venue]
TIME: [Start time] — [End time]
SHOTS: [Number of shots in this setup]

LIGHTING: [Key change from previous setup]
STYLING: [Wardrobe/prop changes needed]
MODEL: [Direction for this setup]

FIRST SHOT: [Shot number and description]

LET'S GO IN [N] MINUTES.
```

## Validation

- [ ] All shots tracked against shot list (no orphan shots)
- [ ] Schedule shows cumulative delay/ahead at each block
- [ ] Issues logged with time, severity, and resolution
- [ ] Missed shots clearly listed with reason
- [ ] Priority cuts follow the tier system (cut from bottom up)
- [ ] End-of-day report generated with full accountability
- [ ] Reshoot recommendations included for missed shots
- [ ] Crew communication sent for any schedule changes > 10 min
