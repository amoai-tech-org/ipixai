---
title: Skill search and lazy loading
description: Load when many Mastra skills would bloat context or when evaluating SkillSearchProcessor for on-demand skill discovery.
parent: mastra
impact: MEDIUM
---

# SkillSearchProcessor

Installed `@mastra/core 1.71.0` exports `SkillSearchProcessor` from `@mastra/core/processors`. Verify its exact constructor/options in installed source/types before use.
Current Mastra announcement/reference: https://mastra.ai/blog/introducing-skill-search-processor
Installed embedded reference: `node_modules/@mastra/core/dist/docs/references/reference-processors-skill-search-processor.md`.

It changes skill discovery from eager prompt injection to on-demand loading by exposing two meta-tools:

- `search_skills` — find relevant skills
- `load_skill` — load the selected skill instructions

This can materially reduce context-token cost when an agent has many available skills. `SkillsProcessor` remains the eager path; combining it with `SkillSearchProcessor` is an explicit opt-in rather than the default lazy behavior.

## iPix use

This is an optimization for a larger skill library, not a Core dependency. Use only when evidence shows loading all available skill instructions materially increases prompt/context cost or causes irrelevant behavior.

Potential later use: Planner, Brand Intelligence, Campaign, Booking, CRM and Asset agents can discover only the domain skill needed for the current request.

Do not use it to hide security policy or required deterministic rules; anything required every turn must remain in code/system instructions or guaranteed validation.
