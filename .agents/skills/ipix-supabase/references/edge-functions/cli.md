---
name: edge-functions-cli
description: CLI workflow for Edge Functions — supabase functions new, serve, deploy, invoke. Use when creating, running locally, or deploying a function via the Supabase CLI.
version: 1.0.0
---

# Getting Started with Edge Functions

Learn how to create, test, and deploy your first Edge Function using the Supabase CLI.

Get started with Supabase Edge Functions.

This guide walks you through creating, testing locally, deploying, and invoking a Supabase Edge Function using the CLI. By the end, you'll have a working function running on Supabase's global edge network.

You can also create and deploy functions directly from the Supabase Dashboard. Read [the Dashboard Quickstart guide](https://supabase.com/docs/guides/functions/quickstart-dashboard) for more information.

Tip: Supabase Edge Functions **only** supports creating functions in TypeScript with [the Deno runtime](https://deno.com/). This is because Deno was designed with extensibility in mind and its Rust codebase offers a modern developer experience, memory safety, and other features ideal for running edge functions.

## Prerequisites

- Make sure you have the Supabase CLI installed and configured. Read [the CLI installation guide](https://supabase.com/docs/guides/cli) for installation methods and troubleshooting.
- Running and testing Supabase Edge Functions locally requires [Docker](https://www.docker.com/) or a Docker-compatible runtime.

## Step 1: Create or configure your project

If you don't have a project yet, initialize a new Supabase project in your current directory.

```bash
mkdir my-edge-functions-project
cd my-edge-functions-project
supabase init
```

If you already have a project locally, navigate to your project directory. If you haven't configured the project for Supabase yet, make sure to run the `supabase init` command.

```bash
cd your-existing-project
supabase init # Initialize Supabase, if you haven't already
```

Note: After this step, you should have a project directory with a `supabase` folder containing a `config.toml` file.

## Step 2: Create your first function

Within your project, generate a new Edge Function with a basic template:

```bash
supabase functions new hello-world
```

Tip: When an HTTP request is sent to Edge Functions, you can use Supabase Auth to secure endpoints. By default, the `supabase functions new` command adds handling a valid publishable or secret key to the basic template. However, you can change this behavior with the `--auth` flag when creating a new function.

This creates a new function at `supabase/functions/hello-world/index.ts` with this starter code:

```tsx
export default {
  fetch: withSupabase({ auth: ['publishable', 'secret'] }, async (req, ctx) => {
    const { name } = await req.json()

    return Response.json({
      message: `Hello ${name}!`,
    })
  }),
}
```

This function accepts a JSON payload with a `name` field and returns a greeting message.

Note: The `supabase functions new` command also optionally creates Deno configuration for VSCode.

## Step 3: Test your function locally

After starting Docker, start the local development server to test your function:

```bash
supabase start  # Start all Supabase services
supabase functions serve hello-world
```

On first use, the `supabase start` command downloads Docker images, and starts all Supabase services locally, which can take a few minutes.

Your function is now running at [`http://localhost:54321/functions/v1/hello-world`](http://localhost:54321/functions/v1/hello-world). Hot reloading is enabled, which means that the server automatically reloads when you save changes to your function code. Keep this terminal window open.

### Function not starting locally?

- Make sure Docker is running
- Run `supabase stop` then `supabase start` to restart services

### Port already in use?

- Check what's running with `supabase status`
- Stop other Supabase instances with `supabase stop`

## Step 4: Send a test request

Open a new terminal and test your function with curl. You can find your local Publishable key, by running `supabase status`, or you can find the complete `curl` command already in `functions/hello-world/index.ts`.

```bash
  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/hello-world' \
    --header 'apiKey: <SUPABASE_PUBLISHABLE_KEY>' \
    --data '{"name":"Functions"}'
```

After running this curl command, you should see:

```json
{ "message": "Hello Functions!" }
```

You can also try different inputs. Change `"Functions"` to `"World"` in the curl command and run it again to see the response change.

Note: After this step, you should have successfully tested your Edge Function locally and received a JSON response with your greeting message.

## Step 5: Connect to your Supabase project

To deploy your function globally, you need to connect your local project to a Supabase project.

Tip: Create one at [database.new](https://database.new/).

First, login to the CLI if you haven't already, and authenticate with Supabase. This opens your browser to authenticate with Supabase; complete the login process in your browser.

```bash
supabase login
```

Next, list your Supabase projects to find your project ID:

```bash
supabase projects list
```

Next, copy your project ID from the output, then connect your local project to your remote Supabase project. Replace `YOUR_PROJECT_ID` with the ID from the previous step.

```bash
supabase link --project-ref [YOUR_PROJECT_ID]
```

Note: After this step, you should have your local project authenticated and linked to your remote Supabase project. You can verify this by running `supabase status`.

## Step 6: Deploy to production

Deploy your function to Supabase's global edge network:

```bash
supabase functions deploy hello-world
```

If you want to deploy all functions, run the `deploy` command without specifying a function name:

```bash
supabase functions deploy
```

Note: The CLI automatically falls back to API-based deployment if Docker isn't available. You can also explicitly use API deployment with the `--use-api` flag:

```bash
supabase functions deploy hello-world --use-api
```

When the deployment is successful, your function is automatically distributed to edge locations worldwide.

Note: Now, you should have your Edge Function deployed and running globally at `https://[YOUR_PROJECT_ID].supabase.co/functions/v1/hello-world`.

## Step 7: Test your live function

🎉 Your function is now live! Test it with your project's publishable key that you can find in the **Settings > API Keys** section of the [Dashboard](https://supabase.com/dashboard/project/_/settings/api-keys):

```bash
curl --request POST 'https://[YOUR_PROJECT_ID].supabase.co/functions/v1/hello-world' \
  --header 'apikey: <SUPABASE_PUBLISHABLE_KEY>' \
  --header 'Content-Type: application/json' \
  --data '{"name":"Production"}'
```

**Expected response:**

```json
{ "message": "Hello Production!" }
```

## Usage

Now that your function is deployed, you can invoke it from within an app:

Note: Make sure your function can handle [CORS](https://supabase.com/docs/guides/functions/cors) (Cross-Origin Resource Sharing) requests by configuring its headers correctly.

**Supabase Client**

```jsx
import { createClient } from '@supabase/supabase-js'

const supabase = createClient('https://[YOUR_PROJECT_ID].supabase.co', 'YOUR_PUBLISHABLE_KEY')

const { data, error } = await supabase.functions.invoke('hello-world', {
  body: { name: 'JavaScript' },
})

console.log(data) // { message: "Hello JavaScript!" }
```

**Fetch API**

```jsx
const response = await fetch('https://[YOUR_PROJECT_ID].supabase.co/functions/v1/hello-world', {
  method: 'POST',
  headers: {
    apikey: '<SUPABASE_PUBLISHABLE_KEY>',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ name: 'Fetch' }),
})

const data = await response.json()
console.log(data)
```
