---
name: edge-functions-testing
description: Unit testing Edge Functions with Deno.test — HTTP handler tests, auth mocking, database test patterns. Use when writing or debugging tests for a Deno edge function.
version: 1.0.0
---

# Testing your Edge Functions

Writing Unit Tests for Edge Functions using Deno Test

Testing is an essential step in the development process to ensure the correctness, reliability, and performance of your Edge Functions. Because Edge Functions often combine HTTP handling, authentication, database access, and business logic, a good testing strategy gives you fast feedback and high confidence before deploying to production.

In this guide you will learn how to write:

- **Unit tests** for pure business logic such as pricing rules, calculations, etc.
- **Integration tests** for the full Edge Function by mocking at the network layer

The examples and patterns shown here follow the same approaches used internally by Supabase's Edge Functions team.

Deno ships with a fast, native test runner and excellent mocking utilities in `@std/testing`. See the [official Deno testing documentation](https://docs.deno.com/runtime/manual/basics/testing/) for more background.

***

## The example scenario

You can use a realistic Edge Function called `process-ticket` that calculates the final price of a ticket based on the authenticated user's age (loaded from the `profiles` table).

**Business rules:**

- Children aged 8 and under → free (`0`)
- Young people aged 9–17 → 20% discount
- Adults aged 18 and over → full price

The function receives a JSON payload with a `price` field and returns `{ result: finalPrice }`.

This example demonstrates common real-world requirements:

- Request validation
- Authenticated database access via `withSupabase`
- Business rule application
- Proper error handling

***

## Recommended project structure

```
supabase/
├── functions/
│   ├── _shared/
│   │   └── types.ts                 # Database types
│   ├── process-ticket/
│   │   ├── index.ts                 # Edge Function (uses withSupabase)
│   │   └── pricing.ts               # Pure business logic (co-located)
│   └── tests/
│       ├── utils/
│       │   └── supabase_env.ts      # Test helpers (env + JWT)
│       └── process-ticket/
│           ├── pricing.test.ts      # Unit tests for pricing
│           └── index.test.ts        # Integration tests with fetch mocking
├── config.toml
└── deno.json
```

Note: In this reference implementation the pricing logic lives inside the function folder
`process-ticket/pricing.ts`. You can also move it to `_shared/` if you want to reuse it across
multiple functions.

See the [Development Environment](https://supabase.com/docs/guides/functions/development-environment) and [Managing dependencies](https://supabase.com/docs/guides/functions/dependencies) guides for recommended `deno.json` and editor setup.

***

## Unit tests: Testing pure business logic

The pricing rules are pure functions with no side effects, so they are perfect candidates for fast, isolated unit tests.

### The pricing module



### Unit tests

The reference implementation uses the BDD-style API from `@std/testing/bdd`:



Run the unit tests:

```bash
deno test supabase/functions/tests/process-ticket/pricing.test.ts
```

These tests run in milliseconds and give you immediate safety when changing discount rules.

***

## Integration tests: Testing the full Edge Function

The reference implementation uses a pattern: **mocking `globalThis.fetch`** to intercept the Supabase REST calls made by the Edge Function. This approach requires **zero changes** to your production code for testability.

### The Edge Function



Key points:

- Uses the high-level `withSupabase` helper from [`@supabase/server`](https://github.com/supabase/server)
- Automatically provides an authenticated `ctx.supabase` client
- Business logic is delegated to the co-located `pricing.ts`

### Integration test setup

This helper sets up a mock Supabase environment and generates valid RS256 JWTs for authenticated requests:



### Full integration tests



Run the integration tests:

```bash
deno test supabase/functions/tests/process-ticket/index.test.ts --allow-env
```

***

## Advantages of mocking approach

This guide uses `fetch()` mock to demonstrate the following benefits:

- Test the **real** Edge Function code path — no dependency injection needed in production code
- Simulate database responses, auth failures, network errors
- Keep your production Edge Function clean and focused
- Still get fast, deterministic tests that don't require a running Supabase instance

This pattern fits great in higher-level helpers that you can control inner code, like `withSupabase`.

***

## Running all tests

Add to your `deno.json`:



Then:

```bash
deno task test
```

***

## Best practices

- Keep pure business logic in separate modules (even if co-located with the function)
- Use `withSupabase` + typed `Database` for clean, authenticated access
- Prefer mocking at the `fetch` boundary for integration tests when you don't want to modify production code
- Use `@std/testing/bdd` + `@std/testing/mock` for expressive, maintainable tests
- Generate realistic JWTs in tests when your function relies on authenticated Supabase clients
- Test both happy paths and error conditions (missing input, DB failures, invalid data)

***

## Resources

- Read the [Deno testing guide](https://docs.deno.com/runtime/manual/basics/testing/)
- Learn more about [`withSupabase` and `@supabase/server`](https://supabase.com/blog/introducing-supabase-server)
- See the other Edge Functions guides: [Development Environment](https://supabase.com/docs/guides/functions/development-environment), [Managing dependencies](https://supabase.com/docs/guides/functions/dependencies), [Deploy to Production](https://supabase.com/docs/guides/functions/deploy)
