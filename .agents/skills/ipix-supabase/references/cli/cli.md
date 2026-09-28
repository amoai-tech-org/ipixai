# supabase-cli

Local development and environment management with Supabase.

## Quick Start

### Initial Project Setup

Initialize a new local Supabase project:

```bash
supabase init
```

Start local development stack:

```bash
supabase start
```

Get connection details and API keys:

```bash
supabase status
```

Link to remote project:

```bash
supabase link --project-ref PROJECT_REF
```

## Database Management

### Creating New Local Database

Start fresh local Supabase instance:

```bash
supabase init
supabase start
```

This creates:

- Local PostgreSQL database on port 54322
- Studio dashboard at http://localhost:54323
- API server on port 54321
- All Supabase services (Auth, Storage, Realtime, etc.)

### Resetting Database

Reset database to clean state with all migrations applied:

```bash
supabase db reset
```

Reset without running seed data:

```bash
supabase db reset --no-seed
```

### Checking Status

View all running services and connection details:

```bash
supabase status
```

Export connection details as environment variables:

```bash
supabase status -o env > .env.local
```

## Database Migrations

### Creating Migrations

#### Method 1: Manual SQL File

Create new migration file:

```bash
supabase migration new create_users_table
```

#### Method 2: Automatic Diff-based

Generate a migration based on schema differences:
Wait, let me check the Diff-based method in the screenshots/content.
The subagent text had:

```bash
supabase db diff -f <name>
```

I'll add that.

### Applying Migrations

Apply pending migrations:

```bash
supabase db reset
```

## Deploying Migrations

> **iPix production rule (IPI-1171):** the commands below are generic Supabase CLI reference only. For the iPix production project, do **not** manually run `supabase db push --linked` after merging a migration PR. Protected `main` + the enabled Supabase GitHub Integration own normal production migration application; verify the live ledger/objects read-only after merge. Use linked mutation only in an explicit reviewed recovery/incident procedure.

Dry-run deployment:

```bash
supabase db push --linked --dry-run
```

Generic CLI example — push to a linked remote outside the normal iPix production path:

```bash
supabase db push --linked
```

Generic CLI example — push with seed data (not iPix production):

```bash
supabase db push --linked --include-seed
```

Generic CLI example — push with custom roles (not the normal iPix production path):

```bash
supabase db push --linked --include-roles
```

### Pulling Remote Schema

Import existing remote schema to local:

```bash
supabase link --project-ref PROJECT_REF
supabase db pull initial_schema
supabase db reset
```

## Type Generation

Generate types after every schema change:

```bash
supabase db reset && supabase gen types typescript --local > src/lib/types/database.types.ts
```

Generate Go types:

```bash
supabase gen types go --local > types/database.go
```

Generate Swift types:

```bash
supabase gen types swift --local --swift-access-control public > Types/Database.swift
```

## API Key Management

### Getting Local Keys

View all local API keys:

```bash
supabase status
```

Extract keys to environment file:

```bash
supabase status -o env > .env.local
```
