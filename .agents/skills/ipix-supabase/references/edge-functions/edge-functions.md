---
name: Supabase Edge Functions
description: Create Supabase Edge Functions with Deno, TypeScript, JWT auth, database connections, and AI integration. Use when creating serverless functions, webhooks, or API endpoints on Supabase.
version: 1.0.0
---

# Supabase Edge Functions

This skill teaches agents how to create and deploy Supabase Edge Functions following best practices for Deno, TypeScript, authentication, and AI integration.

## Contents

- [When to Use](#when-to-use)
- [Core Principles](#core-principles)
  - [Deno Runtime](#deno-runtime)
  - [Import Patterns](#import-patterns)
  - [Shared Utilities](#shared-utilities)
  - [Environment Variables](#environment-variables)
- [Function Structure](#function-structure)
  - [Basic Function Template](#basic-function-template)
  - [CORS Handling](#cors-handling)
  - [Authentication](#authentication)
- [AI Integration](#ai-integration)
  - [Gemini AI Setup](#gemini-ai-setup)
  - [Structured Output Example](#structured-output-example)
  - [URL Context for Enrichment](#url-context-for-enrichment)
- [Database Connections](#database-connections)
  - [Supabase Client](#supabase-client)
- [File Operations](#file-operations)
- [Routing with Hono or Express](#routing-with-hono-or-express)
- [Background Tasks](#background-tasks)
- [Error Handling](#error-handling)
- [Deployment](#deployment)
  - [Local Testing](#local-testing)
  - [Deploy to Production](#deploy-to-production)
- [Common Patterns](#common-patterns)
  - [AI Agent Function Pattern](#ai-agent-function-pattern)
  - [Cost Tracking Pattern](#cost-tracking-pattern)
- [Best Practices](#best-practices)
  - [✅ DO](#-do)
  - [❌ DON'T](#-dont)
- [Reference](#reference)

---

## When to Use

- When creating serverless functions on Supabase
- When implementing webhooks or API endpoints
- When integrating Gemini AI agents (ProfileExtractor, ProfileEnhancer, etc.)
- When handling authentication and authorization
- When connecting to Supabase database from Edge Functions

## Core Principles

### Deno Runtime

**Use Web APIs and Deno Core APIs:**
- Use `fetch` instead of Axios
- Use WebSockets API instead of node-ws
- Use `Deno.serve` instead of `serve` from deno.land/std
- Prefer Deno APIs over Node APIs when available

**Use Node APIs when needed:**
- Import with `node:` specifier: `import process from "node:process"`
- Use when Deno APIs have gaps
- Common Node APIs: `node:crypto`, `node:http`, `node:process`

### Import Patterns

**Required: Use npm: or jsr: specifiers**
- ✅ `import { GoogleGenAI } from "npm:@google/genai"`
- ✅ `import express from "npm:express@4.18.2"`
- ❌ `import { serve } from "https://deno.land/std@0.168.0/http/server.ts"`
- ❌ Bare specifiers without prefix

**Always specify versions:**
- ✅ `npm:express@4.18.2`
- ❌ `npm:express` (version required)

**Preferred sources (in order):**
1. `npm:` and `jsr:` (preferred)
2. `node:` for Node built-ins
3. Minimize `@deno.land/x`, `esm.sh`, `@unpkg.com`

### Shared Utilities

**Location:** `supabase/functions/_shared/`

- Add reusable utilities to `_shared` directory
- Import using relative paths: `import { helper } from "../_shared/helper.ts"`
- **NO cross-dependencies** between Edge Functions
- Each function is independent

### Environment Variables

**Pre-populated (no manual setup):**
- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_OR_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_DB_URL`

**Custom secrets:**
```bash
# Set custom environment variables
supabase secrets set --env-file path/to/env-file
```

**Access in code:**
```typescript
const apiKey = Deno.env.get('GEMINI_API_KEY');
```

## Function Structure

### Basic Function Template

```typescript
console.info('server started');

Deno.serve(async (req: Request) => {
  try {
    // Handle CORS
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        },
      });
    }

    // Parse request
    const payload = await req.json();

    // Your logic here

    return new Response(JSON.stringify({ success: true }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error: any) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
```

### CORS Handling

**Always handle OPTIONS requests:**
```typescript
if (req.method === 'OPTIONS') {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    },
  });
}
```

### Authentication

**JWT Validation:**
```typescript
import { createClient } from 'npm:@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

// Get auth header
const authHeader = req.headers.get('Authorization');
const token = authHeader?.replace('Bearer ', '');

// Verify JWT
const { data: { user }, error } = await supabase.auth.getUser(token ?? '');

if (error || !user) {
  return new Response(JSON.stringify({ error: 'Unauthorized' }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' },
  });
}
```

## AI Integration

### Gemini AI Setup

**Import SDK:**
```typescript
import { GoogleGenAI } from "npm:@google/genai";
```

**Initialize Client:**
```typescript
const ai = new GoogleGenAI({ apiKey: Deno.env.get('GEMINI_API_KEY') });
```

**Common Patterns:**
- Use `gemini-2.5-flash-preview` for fast tasks
- Use `gemini-3-pro-preview` for complex reasoning
- Always use Structured Output for predictable responses
- Use URL Context for website/LinkedIn enrichment

### Structured Output Example

```typescript
import { Type } from "npm:@google/genai";

const schema = {
  type: Type.OBJECT,
  properties: {
    name: { type: Type.STRING },
    industry: { type: Type.STRING },
    description: { type: Type.STRING },
  },
  required: ['name', 'industry'],
};

const response = await ai.models.generateContent({
  model: 'gemini-2.5-flash-preview',
  contents: prompt,
  config: {
    responseMimeType: "application/json",
    responseSchema: schema,
  },
});

const result = JSON.parse(response.text || "{}");
```

### URL Context for Enrichment

```typescript
const response = await ai.models.generateContent({
  model: "gemini-2.5-flash-preview",
  contents: [`Analyze ${url} and extract company information`],
  config: {
    tools: [{ urlContext: {} }],
  },
});
```

## Database Connections

### Supabase Client

**Service Role Client (for admin operations):**
```typescript
import { createClient } from 'npm:@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);
```

**Direct Database Connection:**
```typescript
import { Client } from 'npm:pg@8.11.3';

const client = new Client({
  connectionString: Deno.env.get('SUPABASE_DB_URL'),
});

await client.connect();
const result = await client.query('SELECT * FROM startups WHERE id = $1', [id]);
await client.end();
```

## File Operations

**Write Operations: ONLY `/tmp` directory**

```typescript
// ✅ Correct
const tempPath = `/tmp/${filename}`;
await Deno.writeTextFile(tempPath, content);

// ❌ Wrong - not allowed
await Deno.writeTextFile('./output.txt', content);
```

## Routing with Hono or Express

**Recommended: Use Hono or Express for multiple routes**

```typescript
import { Hono } from 'npm:hono@4';

const app = new Hono();

app.post('/function-name/extract', async (c) => {
  // Route handler
});

app.post('/function-name/enrich', async (c) => {
  // Route handler
});

Deno.serve(app.fetch);
```

**Important:** Each route must be prefixed with `/function-name` for correct routing.

## Background Tasks

**Use `EdgeRuntime.waitUntil` for long-running tasks:**

```typescript
const response = new Response(JSON.stringify({ accepted: true }), {
  headers: { 'Content-Type': 'application/json' },
});

// Run background task without blocking response
EdgeRuntime.waitUntil(
  async () => {
    // Long-running task
    await processData();
  }
);

return response;
```

**Note:** Do NOT assume `EdgeRuntime.waitUntil` is available in all contexts.

## Error Handling

**Always use try-catch:**
```typescript
try {
  // Function logic
  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
} catch (error: any) {
  console.error('Error:', error);
  return new Response(JSON.stringify({ error: error.message }), {
    status: 500,
    headers: { 'Content-Type': 'application/json' },
  });
}
```

## Deployment

### Local Testing

```bash
# Start Supabase locally
supabase start

# Test function locally
supabase functions serve function-name

# Test with curl
curl -X POST http://localhost:54321/functions/v1/function-name \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'
```

### Deploy to Production

```bash
# Deploy function
supabase functions deploy function-name

# Deploy with secrets
supabase secrets set GEMINI_API_KEY=your-key
supabase functions deploy function-name

# Check logs
supabase functions logs function-name
```

## Common Patterns

### AI Agent Function Pattern

```typescript
// ai-helper function pattern
Deno.serve(async (req: Request) => {
  const { action, context } = await req.json();

  switch (action) {
    case 'wizard_extract_startup':
      return await extractStartup(context);
    case 'enrich_profile':
      return await enrichProfile(context);
    default:
      return new Response(JSON.stringify({ error: 'Unknown action' }), {
        status: 400,
      });
  }
});
```

### Cost Tracking Pattern

```typescript
// Log AI calls to ai_runs table
await supabase.from('ai_runs').insert({
  action: 'extract_startup',
  input_tokens: usage.promptTokenCount,
  output_tokens: usage.candidatesTokenCount,
  cost: calculateCost(usage),
  org_id: user.org_id,
});
```

## Best Practices

### ✅ DO

- Use `Deno.serve` for request handling
- Handle CORS with OPTIONS method
- Validate JWT for authenticated routes
- Use structured output for AI responses
- Handle errors with try-catch
- Log important operations
- Use `_shared` directory for utilities
- Specify versions for npm packages

### ❌ DON'T

- Don't use bare specifiers for imports
- Don't write files outside `/tmp`
- Don't expose API keys to frontend
- Don't skip authentication checks
- Don't forget CORS handling
- Don't use `deno.land/std` serve (use `Deno.serve`)
- Don't create cross-dependencies between functions

## Reference

- **Rules:** `.cursor/rules/supabase/writing-supabase-edge-functions.mdc`
- **Prompts:** `prompts/14-edge-functions-setup.md`
- **Supabase Docs:** [Edge Functions](https://supabase.com/docs/guides/functions)

---

**Created:** 2025-01-16  
**Based on:** Supabase Edge Functions best practices  
**Version:** 1.0.0
