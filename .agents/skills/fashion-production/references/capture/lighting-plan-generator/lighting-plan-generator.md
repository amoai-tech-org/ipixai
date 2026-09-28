---
name: lighting-plan-generator
description: Generate lighting setup plans per shot type, location, and brand DNA. Includes key/fill/accent positions, modifiers, power settings, and color temperature targets. Use when preparing lighting for a shoot.
metadata:
  author: iPix
  version: "1.0"
  category: production-planning
  requires: shot-list-data
---

# Lighting Plan Generator

## When to Use This Skill

Use when you need to:
- Specify lighting setups per shot type for a production package
- Plan equipment needs per setup group
- Match lighting to brand DNA (warm/cool/neutral)
- Brief a photographer or lighting assistant
- Ensure consistent look across a shoot day

## Core Principle

**Lighting is the #1 technical decision on set.** A $50K camera with bad lighting looks amateur. A phone with good lighting looks professional. Specify it.

## Lighting Plan Structure

One plan per setup group. Each plan covers:

```
LIGHTING PLAN — Setup [Letter]: [Name]
Shot Type: [Product / Lifestyle / Editorial / Video]
Location: [Studio / Location name]
Brand DNA Target: [Warm / Cool / Neutral] — [Kelvin target]

KEY LIGHT
  Source:    [Strobe / Continuous / Natural]
  Modifier:  [Softbox / Beauty dish / Umbrella / Bare / Window]
  Size:      [60cm / 90cm / 120cm / 150cm]
  Position:  [Clock position] at [height] — [distance from subject]
  Power:     [1/4 / 1/2 / full] or [natural]
  Gel:       [None / 1/4 CTO / 1/2 CTB / etc.]

FILL LIGHT
  Source:    [Strobe / Reflector / V-flat / Natural bounce]
  Position:  [Opposite key, camera-side]
  Ratio:     [Key:Fill ratio — 2:1 / 3:1 / 4:1]

ACCENT / HAIR / RIM (if needed)
  Source:    [Strip box / Bare head / Reflector]
  Position:  [Behind subject, camera-opposite of key]
  Purpose:   [Separation from background / Hair highlight / Rim]

BACKGROUND
  Source:    [Separate light / Spill from key / Natural]
  Target:    [Even / Gradient / Dark]
  Stops:     [+0 / -1 / -2 relative to subject]

DIAGRAM:
  ┌─────────────────────────────┐
  │                             │
  │         [BG Light]          │
  │              ↓              │
  │    [Key]  [Subject]  [Fill] │
  │      ↘      ●       ↙      │
  │              │              │
  │           [Camera]          │
  │              ▼              │
  └─────────────────────────────┘
```

## Presets by Shot Type

### Product — White Background
```
Key:    Softbox 120cm, 10 o'clock, 45° above, 3ft from product
Fill:   Reflector (white), 2 o'clock, same height
BG:     2x strip softbox, aimed at seamless, +1 stop over key
Accent: None (clean, even)
Camera: f/8-f/11 for max sharpness
Color:  5500K neutral (no gels)
Ratio:  1.5:1 (very flat, minimal shadow)
```

### Product — Dramatic / Hero
```
Key:    Strip softbox 30x120cm, 9 o'clock, 30° above, 2ft
Fill:   V-flat (black side toward subject — negative fill)
BG:     Dark grey seamless, no light (-2 stops)
Accent: Rim light, 5 o'clock, behind subject, 1/4 power
Camera: f/2.8-f/4 for shallow DOF
Color:  5500K with optional warm shift (+200K) for luxury
Ratio:  4:1 (dramatic shadow)
```

### Lifestyle — Natural Light
```
Key:    Window light (north-facing preferred for consistency)
Fill:   Reflector (white or silver), opposite window
BG:     Natural environment (no added light)
Accent: None
Camera: f/2.8-f/4 for environmental blur
Color:  Varies by time of day — golden hour = 3500K, overcast = 6500K
Ratio:  2:1 (natural, soft shadow)
Note:   Overcast > direct sun. If sunny, add diffusion panel to window.
```

### Editorial — Beauty Dish
```
Key:    Beauty dish 22", centered 12 o'clock, 30° above, 3ft
Fill:   V-flat (white side), camera left and right, flanking subject
BG:     Grey seamless, -1 stop below key
Accent: Hair light (strip box, above and behind, 1/4 power)
Camera: f/4-f/5.6
Color:  5500K neutral
Ratio:  2:1 (flattering, defined but not harsh)
```

### Flat Lay — Overhead
```
Key:    Large softbox 150cm, directly overhead, 2ft above surface
Fill:   White surface below (bounces light back up to fill shadows)
BG:     Styled surface IS the background (marble, wood, linen)
Accent: None
Camera: f/5.6-f/8, overhead on boom or copy stand
Color:  5500K neutral
Ratio:  1:1 (extremely flat, no shadows)
```

### Video — Continuous Light
```
Key:    LED panel 1x1 (bicolor), 10 o'clock, with softbox
Fill:   LED panel 1x1, 2 o'clock, 1/2 power of key
BG:     Practical lights or LED strip for depth
Accent: LED tube for color accent (if brand allows)
Camera: f/2.8, 24fps or 60fps for slow motion
Color:  Match to brand DNA target (adjustable via bicolor)
Ratio:  2:1
Note:   NO STROBES for video. Continuous only. Check for flicker at framerate.
```

## Brand DNA → Lighting Translation

| DNA Direction | Kelvin | Gel | Modifier | Shadow |
|--------------|--------|-----|----------|--------|
| Warm / Luxury | 4500-5000K | 1/4 CTO on key | Soft, large modifiers | Gentle, graduated |
| Cool / Modern | 5500-6500K | 1/4 CTB on key | Hard or medium modifiers | Clean, defined |
| Neutral / Clean | 5500K | None | Large soft modifiers | Minimal |
| Dramatic / Editorial | 5500K | None | Hard light or strip | Strong, directional |
| Natural / Organic | Match ambient | None (natural) | Window or reflector only | Soft, environmental |

## Equipment Checklist Generator

Based on setup plan, auto-generate equipment list:

```
SETUP A (Product — White BG):
  □ Softbox 120cm + grid
  □ Strip softbox 30x120cm (x2 for background)
  □ Reflector 42" (white side)
  □ Light stands (x3)
  □ Seamless white (2.72m wide)
  □ Product table / plinth

SETUP B (Lifestyle — Location):
  □ Reflector 42" (white/silver)
  □ Diffusion panel 4x4 (if sunny)
  □ Clamps (x4)
  □ No stands needed (natural light)

SETUP C (Editorial — Beauty Dish):
  □ Beauty dish 22"
  □ V-flat (white/black)
  □ Strip softbox (hair light)
  □ Light stands (x3)
  □ Seamless grey
  □ Boom arm
```

## Validation

- [ ] Every setup group has a lighting plan
- [ ] Color temperature matches brand DNA
- [ ] Video setups use continuous light only (no strobes)
- [ ] Equipment list accounts for all lights in all setups
- [ ] Key:fill ratio matches mood target
- [ ] Backup plan for location shoots (overcast vs sunny)
