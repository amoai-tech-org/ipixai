---
name: auth-nextjs
description: Supabase Auth setup for Next.js App Router — cookie-based auth, NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY env vars, auth/callback route for PKCE code exchange. Relevant for app/ Next.js operator hub (port 3002).
topics: [auth, nextjs, app-router, pkce, cookie-auth, ssr]
applies_to: [app/src/app/api/copilotkit, app/src/app/auth/callback]
stack: nextjs
source: https://supabase.com/docs/guides/auth/quickstarts/nextjs
ipix_status: app/ Next.js hub does not yet have auth routes — needed if app/ adds protected routes independently of Vite session
---

# Use Supabase Auth with Next.js

Learn how to configure Supabase Auth for the Next.js App Router.

1. **Create a new Supabase project**

Head over to [database.new](https://database.new) and create a new Supabase project.

Your new database has a table for storing your users. You can see that this table is currently empty by running some SQL in the [SQL Editor](https://supabase.com/dashboard/project/_/sql/new).

```sql name=SQL_EDITOR
 select * from auth.users;
```

2. **Create a Next.js app**

Use the `create-next-app` command and the `with-supabase` template, to create a Next.js app pre-configured with:

- [Cookie-based Auth](https://supabase.com/docs/guides/auth/server-side/creating-a-client?queryGroups=package-manager\&package-manager=npm\&queryGroups=framework\&framework=nextjs\&queryGroups=environment\&environment=server)
- [TypeScript](https://www.typescriptlang.org/)
- [Tailwind CSS](https://tailwindcss.com/)

Tip: UI components built on shadcn/ui that connect to Supabase via a single command.

Explore Components

```bash name=Terminal
npx create-next-app -e with-supabase
```

3. **Declare Supabase Environment Variables**

Rename `.env.example` to `.env.local` and populate with your Supabase connection variables:

```text name=.env.local
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_... key
```

4. **Start the app**

Start the development server, go to [http://localhost:3000](http://localhost:3000) in a browser, and you should see the contents of `app/page.tsx`.

To sign up a new user, navigate to [http://localhost:3000/auth/sign-up](http://localhost:3000/auth/sign-up), and click `Sign up`.

```bash name=Terminal
npm run dev
```

## Learn more

- [Setting up Server-Side Auth for Next.js](https://supabase.com/docs/guides/auth/server-side/nextjs) for a Next.js deep dive
- [Supabase Auth docs](https://supabase.com/docs/guides/auth#authentication) for more Supabase authentication methods
