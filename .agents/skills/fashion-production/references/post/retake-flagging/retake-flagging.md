---
name: retake-flagging
description: Flag failed or below-standard shots with specific technical reasons and actionable fix instructions. Converts DNA compliance scores into photographer-actionable retake briefs. Use after AestheticAuditor scoring to generate reshoot lists.
metadata:
  author: iPix
  version: "1.0"
  category: post-production
  requires: dna-scores, shot-list-data
---

# Retake Flagging

## When to Use This Skill

Use when you need to:
- Convert DNA compliance scores into actionable retake instructions
- Generate a reshoot list with specific technical fixes
- Brief a photographer on exactly what went wrong and how to fix it
- Prioritize retakes by business impact (channel deadline, hero shot, etc.)
- Track retake completion across multiple review rounds

## Core Principle

**"Score 62" is not actionable. "Lighting too warm on A03 — recalibrate key light to 5500K, remove CTO gel, reshoot at f/8" is.** Every flagged shot must include the problem, the cause, and the fix.

## Retake Flag Structure

```
RETAKE FLAG — Shot [Number]
Severity:    [CRITICAL / HIGH / MEDIUM / LOW]
DNA Score:   [Score] / 100 (threshold: 80)
Pillar:      [Which DNA pillar failed]

PROBLEM:
  What's wrong: [Specific visual issue]
  Evidence:     [What the auditor detected]

CAUSE:
  Technical:    [Root cause — lighting, focus, exposure, styling, etc.]
  Likely reason: [Why it happened on set]

FIX:
  Action:       [Exact instruction for photographer]
  Settings:     [Camera/lighting settings to change]
  Setup:        [Which setup group to use]
  Time needed:  [Estimated reshoot time]

PRIORITY:
  Channel:      [Which channel needs this shot]
  Deadline:     [When the channel content is due]
  Impact:       [What happens if not reshot — missing hero, no detail, etc.]
```

## Severity Levels

| Severity | DNA Score | Action | Timeline |
|----------|-----------|--------|----------|
| **CRITICAL** | < 40 | Reshoot immediately — unusable | Same day or next available |
| **HIGH** | 40-59 | Reshoot required — below brand standard | Within 48 hours |
| **MEDIUM** | 60-79 | Fix in post if possible, reshoot if not | Within 1 week |
| **LOW** | 80-89 | Minor post-production fix, no reshoot | Fix in editing |

## Common Failure Patterns

### Lighting Issues

| Problem | Detection | Fix |
|---------|-----------|-----|
| Too warm | Color temp > 5800K on neutral target | Remove CTO gel, reset to 5500K |
| Too cool | Color temp < 5200K on neutral target | Add 1/4 CTO or raise LED to 5500K |
| Harsh shadows | Shadow ratio > 5:1 on product | Add fill light or larger modifier |
| Flat lighting | Shadow ratio < 1.5:1 on editorial | Remove fill, use negative fill (black V-flat) |
| Uneven background | Background luminance variance > 15% | Re-aim background lights, check for spill |
| Rim too hot | Rim light clipping on edges | Reduce rim power by 1 stop |

### Focus Issues

| Problem | Detection | Fix |
|---------|-----------|-----|
| Soft on product | Edge sharpness below threshold on subject | Re-focus on product label/logo, use f/8+ |
| Wrong focal plane | Sharpest area not on key feature | Move focus point to brand detail |
| Camera shake | Global softness pattern | Use tripod, faster shutter, or remote trigger |
| Too shallow DOF | Background detail needed but blurred | Stop down to f/5.6-f/8 |
| Missed focus (model) | Eyes not sharpest point | Use eye-AF, single point on near eye |

### Composition Issues

| Problem | Detection | Fix |
|---------|-----------|-----|
| Too much headroom | Subject in bottom 40% of frame | Lower camera or tilt down |
| Cropped product | Product extends beyond frame edge | Zoom out or increase distance |
| Distracting background | Non-brand elements in lifestyle shot | Change angle, remove props, or re-frame |
| Off-center (when centered needed) | Subject > 5% off center axis | Use grid overlay, re-position |
| Wrong aspect ratio | Shot doesn't fit target channel spec | Re-frame for correct ratio (1:1, 4:5, 16:9) |

### Styling Issues

| Problem | Detection | Fix |
|---------|-----------|-----|
| Wrinkles visible | Fabric distortion on garment | Steam garment, re-style |
| Wrong accessory | Non-brand props visible | Replace with brand-approved props |
| Tag showing | Brand/care tag visible in shot | Tuck or pin tags |
| Misaligned | Garment not sitting correctly on form/model | Re-dress, use clips on back side |
| Color mismatch | Styled element conflicts with brand palette | Replace prop/background with on-palette option |

## Retake Brief Template

```
═══════════════════════════════════════════════════
RETAKE BRIEF — [Brand Name] [Shoot Date]
Review Round: [1 / 2 / 3]
Total Flagged: [N] shots | Critical: [N] | High: [N] | Medium: [N]
═══════════════════════════════════════════════════

CRITICAL RETAKES (must reshoot):

  Shot A03 — Product Detail, Stitching Macro
  ┌─────────────────────────────────────────────┐
  │ Score: 38/100 | Pillar: Visual Consistency  │
  │ Problem: Completely out of focus             │
  │ Cause: Macro shot handheld, missed focus     │
  │ Fix: Use tripod + focus rail, f/11, 1/125s  │
  │ Time: 10 min | Setup: A | Priority: Amazon  │
  └─────────────────────────────────────────────┘

  Shot B02 — Lifestyle, Street Walk
  ┌─────────────────────────────────────────────┐
  │ Score: 35/100 | Pillar: Brand Alignment     │
  │ Problem: Non-brand signage in background     │
  │ Cause: Location angle included street signs  │
  │ Fix: Shift 2m left, shoot at f/2.8 for blur │
  │ Time: 15 min | Setup: B | Priority: IG      │
  └─────────────────────────────────────────────┘

HIGH RETAKES (reshoot within 48h):

  Shot C01 — Editorial, Beauty Dish
  ┌─────────────────────────────────────────────┐
  │ Score: 55/100 | Pillar: Visual Consistency  │
  │ Problem: Color temperature too warm (6200K) │
  │ Cause: CTO gel left on key from Setup B     │
  │ Fix: Remove all gels, reset to 5500K bare   │
  │ Time: 5 min | Setup: C | Priority: Website  │
  └─────────────────────────────────────────────┘

MEDIUM RETAKES (fix in post or reshoot):

  Shot A08 — Product, Flat Lay
  ┌─────────────────────────────────────────────┐
  │ Score: 72/100 | Pillar: Ecommerce Readiness │
  │ Problem: Slight shadow on right edge        │
  │ Cause: Overhead softbox shifted slightly    │
  │ Fix option 1: Clone stamp in post (5 min)   │
  │ Fix option 2: Re-center light, reshoot      │
  │ Time: 5 min | Setup: A | Priority: Shopify  │
  └─────────────────────────────────────────────┘

═══════════════════════════════════════════════════
RESHOOT ESTIMATE:
  Total time: ~45 minutes
  Setups needed: A (product), B (location), C (studio)
  Crew: Photographer + Assistant
  Model: Not needed (no model retakes flagged)
  Schedule: Can fit into half-day session
═══════════════════════════════════════════════════
```

## Retake Tracking

```
RETAKE TRACKER — Round [N]

| Shot | Score R1 | Flag | Fix Applied | Score R2 | Status |
|------|----------|------|-------------|----------|--------|
| A03  | 38       | Focus | Tripod+rail | 91       | ✅ Pass |
| B02  | 35       | BG    | Reframed    | 85       | ✅ Pass |
| C01  | 55       | Color | Gel removed | 88       | ✅ Pass |
| A08  | 72       | Shadow| Post-fix    | 82       | ✅ Pass |

Round 1: 4 flagged → 4 resolved
Round 2: 0 flagged → SHOOT COMPLETE
```

## Integration with AestheticAuditor

```
AestheticAuditor runs DNA scoring
  ↓
Shots scoring < 80 flagged
  ↓
Retake Flagging skill processes flags:
  1. Identify specific pillar failure
  2. Analyze image for root cause
  3. Generate fix instruction
  4. Estimate reshoot time
  5. Prioritize by channel deadline
  ↓
Retake Brief generated
  ↓
Photographer receives brief
  ↓
Reshoot completed
  ↓
Re-upload → Re-triage → Re-score → Pass/Fail
```

## Validation

- [ ] Every flagged shot has a specific problem description (not just "low score")
- [ ] Every flag includes a concrete fix instruction with settings
- [ ] Severity levels correctly assigned based on score thresholds
- [ ] Reshoot time estimates are realistic (not "5 min" for location changes)
- [ ] Channel deadlines factored into priority ordering
- [ ] Round tracking shows score improvement after fixes
- [ ] No flags for issues that can be fixed in post-production (unless post-fix would degrade quality)
