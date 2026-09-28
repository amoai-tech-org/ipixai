---
title: Mastra model selection
description: Load when choosing or validating provider/model strings; run the skill provider-registry script first.
parent: mastra
impact: HIGH
impactDescription: Verify model ids against the registry, do not guess
tags: mastra, models, provider, registry
source: https://github.com/mastra-ai/skills/blob/690d5d6cc6e918e73264b483ad3894ade7c763d9/skills/mastra/references/model-selection.md
---

# Model Selection Reference

Upstream: [mastra-ai/skills `model-selection.md` @ 690d5d6](https://github.com/mastra-ai/skills/blob/690d5d6cc6e918e73264b483ad3894ade7c763d9/skills/mastra/references/model-selection.md) (skill 2.1.0).

Use this when choosing or validating Mastra model strings. For longer vendor notes see [`model-providers.md`](model-providers.md). **iPixai:** keep the starter model pin until a provider ticket — do not port Cloudflare `resolveAgentModel`.

## Model format

Always use `"provider/model-name"` when defining models with Mastra's model router.

Official docs: [Mastra model router](https://mastra.ai/docs/v1/models) (append `.md` when fetching).

## Verify provider keys and model names

Run from the **repo root** (script is tracked at `.claude/skills/mastra/scripts/provider-registry.mjs`):

```bash
# List all available providers
node .claude/skills/mastra/scripts/provider-registry.mjs --list

# List all models for a specific provider, sorted newest first
node .claude/skills/mastra/scripts/provider-registry.mjs --provider openai
node .claude/skills/mastra/scripts/provider-registry.mjs --provider anthropic
```

When the user asks to use a model or provider, run the script first to verify the provider key and model name are valid. Do not guess model names from memory because they change frequently.

If you need examples in a new-project scaffold, see [`create-mastra.md`](create-mastra.md), then verify the chosen model with the provider registry script.
