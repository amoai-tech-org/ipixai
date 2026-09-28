# Testomat.io Reporting

## Contents

- [Reporter setup and result reporting](#reporter-setup-and-result-reporting)
- [Step 1: Detect Language & Framework](#step-1-detect-language--framework)
- [Step 2: Configure Credentials](#step-2-configure-credentials)
- [Step 3: Install & Configure Reporter](#step-3-install--configure-reporter)
  - [JavaScript / TypeScript](#javascript--typescript)
  - [Python](#python)
  - [Java (JUnit, TestNG, Cucumber, Karate)](#java-junit-testng-cucumber-karate)
- [Step 4: Import Automated Tests to Testomat.io TMS](#step-4-import-automated-tests-to-testomatio-tms)
  - [JavaScript / TypeScript](#javascript--typescript-1)
  - [Python](#python-1)
  - [Java (JUnit, TestNG)](#java-junit-testng)
  - [JUnit XML (C#, PHP, Ruby, Go, etc.)](#junit-xml-c-php-ruby-go-etc)
- [Step 5: Verify Setup](#step-5-verify-setup)
  - [Via Testomat.io MCP (preferred, if enabled)](#via-testomatio-mcp-preferred-if-enabled)
  - [Debug Mode (alternative)](#debug-mode-alternative)
- [Step 6: Configure Artifacts (only on explicit request)](#step-6-configure-artifacts-only-on-explicit-request)
  - [Create S3 Bucket (if needed)](#create-s3-bucket-if-needed)
  - [Option A: Testomat.io UI (recommended)](#option-a-testomatio-ui-recommended)
  - [Option B: Environment Variables](#option-b-environment-variables)
  - [Verify Artifacts](#verify-artifacts)
- [References](#references)
- [Sprint QA progress reporting](#sprint-qa-progress-reporting)
- [When to Use](#when-to-use)
- [How to Identify the Sprint](#how-to-identify-the-sprint)
- [Rules](#rules)
  - [Quick Commands](#quick-commands)
  - [Step 1: Resolve Sprint Identity](#step-1-resolve-sprint-identity)
  - [Step 2: Gather Sprint Metadata & Time Range](#step-2-gather-sprint-metadata--time-range)
  - [Step 3: Collect Run Data](#step-3-collect-run-data)
  - [Step 4: Build Report Sections](#step-4-build-report-sections)
  - [Step 5: Write Output File](#step-5-write-output-file)
  - [Step 6: Offer Markdown Export](#step-6-offer-markdown-export)
- [HTML Template Styling](#html-template-styling)
  - [Color Palette](#color-palette)
  - [Typography](#typography)
  - [Status Badges](#status-badges)
  - [Key Elements](#key-elements)
  - [HTML Structure](#html-structure)

---

## Reporter setup and result reporting

# Testomat.io Reporter Setup

Install and configure the Testomat.io reporter in an automation project, then push test results to the Testomat.io TMS.

## Step 1: Detect Language & Framework

- Detect the language from the project manifest (`package.json`, `pyproject.toml`/`requirements.txt`, `pom.xml`/`build.gradle`, `*.csproj`, `composer.json`, `Gemfile`).
- Detect the framework from its config file: `playwright.config.*`, `codecept.conf.js`, `wdio.conf.*`, `jest.config.*`, `.mocharc.*`, `pytest.ini`/`conftest.py`, `*.robot`/`robot.toml`, `testng.xml`/JUnit deps in `pom.xml`.
- No native reporter for the stack (C#, PHP, Ruby, Go, etc.): use JUnit XML import (Step 4).

## Step 2: Configure Credentials

- Check `.env` for a `TESTOMATIO` API key. If present, use it.
- If missing, add a placeholder line to `.env`:

```env
TESTOMATIO=tstmt_xxxxx
```

- **Ask the user to replace the placeholder with their "Project Reporting API key" themselves — never ask them to paste the key into chat.**

Message to the user:

```
✅ Added `TESTOMATIO=tstmt_xxxxx` placeholder to .env

To activate reporting:
1. Go to Testomat.io → your project → Settings → Project
   (https://app.testomat.io/projects/<project-id>/settings/project)
2. Copy "Project Reporting API key"
3. Replace `tstmt_xxxxx` in .env with your actual key
4. Run tests: TESTOMATIO=tstmt_xxxxx npx <test-command>
```

## Step 3: Install & Configure Reporter

Pick the section for the detected language and framework.

### JavaScript / TypeScript

Use `@testomatio/reporter`:

```bash
npm install @testomatio/reporter --save-dev
```

Playwright — `playwright.config.ts` or `playwright.config.js`:

```js
reporter: [
  ['@testomatio/reporter/playwright'],
  // other reporters...
],
```

CodeceptJS — `codecept.conf.js` or `codecept.config.js`:

```js
plugins: {
  testomatio: {
    enabled: true,
    require: '@testomatio/reporter/codecept',
  }
}
```

WebdriverIO — `wdio.conf.js`:

```js
import testomatio from '@testomatio/reporter/webdriver';

exports.config = {
  // ...
  reporters: [
    [testomatio, { apiKey: process.env.TESTOMATIO }],
  ],
};
```

Jest — `jest.config.js` or `jest.config.ts`:

```js
module.exports = {
  reporters: ['default', ['@testomatio/reporter/jest', { apiKey: process.env.TESTOMATIO }]],
};
```

Mocha — run with CLI flags:

```bash
mocha --reporter @testomatio/reporter/mocha --reporter-options apiKey=tstmt_xxx
```

- Run commands and more config options: [./reporting-config.md](./reporting-config.md)
- Docs: [Testomat.io NodeJS Frameworks](https://docs.testomat.io/test-reporting/frameworks/)

### Python

Use `pytestomatio` for pytest, `robot-framework-reporter` for Robot Framework.

- Use `pip3` if Python 2.x and 3.x coexist.

pytest:

```bash
pip install pytestomatio

# Run and report tests
pytest --testomatio report
```

Robot Framework:

```bash
pip install robot-framework-reporter

# Run and report tests
robot --listener Testomatio.Report path/to/tests
```

Docs: [Testomat.io Python Reporting](https://docs.testomat.io/test-reporting/python/)

### Java (JUnit, TestNG, Cucumber, Karate)

Use the `io.testomat` Java reporters.

- Ask the user to set the API key before running tests, then verify it is set and starts with `tstmt_`:

```bash
export TESTOMATIO=<tstmt_api_key>
```

- Add the dependency for the framework in use:

```xml
<dependency>
  <groupId>io.testomat</groupId>
  <artifactId>java-reporter-junit</artifactId>
  <version>{LATEST_STABLE_VERSION}</version>
</dependency>
```

Artifact IDs: `java-reporter-junit`, `java-reporter-testng`, `java-reporter-cucumber`, `java-reporter-karate`.

- Run tests:

```bash
mvn clean test
```

- Scan the output for a run ID. If found, show the link:

```
View results: https://app.testomat.io/projects/{project-id}/runs/{run-id}
```

Docs: [Testomat.io Java/JUnit Reporting](https://docs.testomat.io/test-reporting/junit/)

## Step 4: Import Automated Tests to Testomat.io TMS

Import test source code into Testomat.io to see test structure and enable codebase-TMS synchronization.

Docs: [Testomat.io Import Overview](https://docs.testomat.io/project/import-export/)

### JavaScript / TypeScript

Use the `check-tests` CLI:

```bash
npx check-tests@0.21.0 <framework> "<glob-pattern>" [options]
```

| Framework   | Example |
|-------------|---------|
| Playwright  | `npx check-tests@0.21.0 Playwright "tests/**/*.spec.js"` |
| CodeceptJS  | `npx check-tests@0.21.0 CodeceptJS "tests/**_test.js"` |
| Cypress     | `npx check-tests@0.21.0 cypress "cypress/e2e/**/*.js"` |
| Jest        | `npx check-tests@0.21.0 Jest "tests/**/*.test.js"` |
| Mocha       | `npx check-tests@0.21.0 mocha "test/**/*_test.js"` |
| WebdriverIO | `npx check-tests@0.21.0 webdriverio "test/**/*.js"` |

Options:

- `--typescript` — for TypeScript projects: `npx check-tests@0.21.0 Playwright "tests/**/*.spec.ts" --typescript`
- `--update-ids` — sync and auto-assign test IDs in source code: `npx check-tests@0.21.0 CodeceptJS "tests/**_test.js" --update-ids`

### Python

pytest — sync tests with Testomat.io:

```bash
pytest --testomatio sync
```

Robot Framework — import tests:

```bash
robot --listener Testomatio.Import path/to/tests
```

### Java (JUnit, TestNG)

Use the `testomatio.jar` CLI. Re-run after every test execution.

- **Run only from the project root:**

```bash
cd <project-root>

export TESTOMATIO=tstmt_xxxxx
curl -fL -o testomatio.jar https://github.com/testomatio/java-check-tests/releases/download/v.0.1.14/testomatio.jar
printf '%s  %s\n' 'f9887707f44f51411cef4be0b6e6715353a92b65f1e21b8a5e939d3b65d8ab37' 'testomatio.jar' | sha256sum -c -
java -jar testomatio.jar sync
```

Commands:

- `import` — import test code to Testomat.io (dry-run without API key).
- `clean-ids` — import tests without system ids.
- `sync` — import tests and pull IDs into source code (alias: `update-ids`).

### JUnit XML (C#, PHP, Ruby, Go, etc.)

For stacks without a native reporter, generate a JUnit XML report, then import it.

- NUnit (C#): generate an NUnit/JUnit-compatible XML report using the project's configured NUnit/JUnit logger (raw TRX is not JUnit XML), then import that XML with `npx --package=@testomatio/reporter@2.16.0 report-xml "report.xml" --lang="c#"`.
- PHPUnit (PHP): `./vendor/bin/phpunit --log-junit=results.xml`
- RSpec (Ruby): `rspec --format json --out results.json` — then convert to JUnit XML.

Import XML to Testomat.io with the current reporter package; choose the supported language for the source project:

```bash
npx --package=@testomatio/reporter@2.16.0 report-xml "path/to/results.xml" --lang="c#"

# Multiple XML files
npx --package=@testomatio/reporter@2.16.0 report-xml "results/*.xml" --lang="c#"
```

## Step 5: Verify Setup

Run the tests with the reporter enabled:

```bash
TESTOMATIO=tstmt_xxxxx npx <your-test-command>
```

### Via Testomat.io MCP (preferred, if enabled)

- After the run, fetch the latest run via MCP to confirm data was received.
- Success indicators: a new run ID appears in the logs; run status shows passed/failed as expected; the run is retrievable by its ID.
- Setup is complete when the new run is fetchable via MCP.
- MCP tools: [Testomat.io MCP Run Management](https://github.com/testomatio/mcp/blob/main/docs/tools.md#run-management)

### Debug Mode (alternative)

- Capture reporter output locally **for only 1-2 tests** to verify data is generated correctly before sending:

```bash
DEBUG=@testomatio/reporter:pipe:testomatio npx <your-test-command>
```

- Read the execution logs to confirm the reporter is enabled and configured.
- Docs: [Testomat.io Debugging Logs](https://docs.testomat.io/not-in-use/debugging/)

## Step 6: Configure Artifacts (only on explicit request)

Store screenshots, videos, traces, and logs in S3-compatible storage alongside test results.

- **Only perform this step if the user explicitly asks for artifacts configuration** (or mentions saving screenshots, videos, traces, logs).
- Prerequisite: first test report executed successfully.
- Check `.env` for existing S3 credentials (`S3_ACCESS_KEY_ID`, `S3_BUCKET`, `S3_REGION`). If present, skip to verification.

### Create S3 Bucket (if needed)

- Recommended: one bucket per project.
- Guide the user through their provider, based on official documentation:

| Provider | Link |
|----------|------|
| AWS S3 | https://s3.console.aws.amazon.com/s3 |
| DigitalOcean | https://cloud.digitalocean.com/spaces |
| Google Cloud Storage | https://console.cloud.google.com/storage |
| Cloudflare R2 | https://dash.cloudflare.com/ |
| Minio | Self-hosted or cloud instance |

- The user obtains the Access Key ID and Secret Access Key from the provider.

### Option A: Testomat.io UI (recommended)

- **The agent cannot access Testomat.io project settings — the user configures this manually:**
  1. Open `https://app.testomat.io/projects/<project-id>/settings/artifacts`
  2. Enable the "Share credentials" toggle.
  3. Enter Access Key ID, Secret Access Key, bucket name, region, and endpoint (endpoint only for non-AWS providers).

### Option B: Environment Variables

Add S3 credentials to `.env` or the CI pipeline:

```env
# Required for all providers
S3_ACCESS_KEY_ID=your_access_key
S3_SECRET_ACCESS_KEY=your_secret_key
S3_BUCKET=your_bucket_name
S3_REGION=us-west-1

# Optional: for non-AWS providers (DigitalOcean, Minio, Cloudflare R2, GCS)
S3_ENDPOINT=https://your-endpoint-url

# Required safe default: vendor default is public
TESTOMATIO_PRIVATE_ARTIFACTS=1
```

Cloudflare R2 example:

```env
S3_ACCESS_KEY_ID=xxx
S3_SECRET_ACCESS_KEY=xxx
S3_BUCKET=testomatio-artifacts
S3_REGION=auto
S3_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
S3_FORCE_PATH_STYLE=true
```

- Disable uploads: `TESTOMATIO_DISABLE_ARTIFACTS=1`
- Provider examples (AWS, DigitalOcean, Minio, GCS): [./reporting-artifacts.md](./reporting-artifacts.md)
- More options: [Testomat.io Artifacts](https://docs.testomat.io/test-reporting/artifacts/)

### Verify Artifacts

- Run tests that produce screenshots, videos, or traces: `TESTOMATIO=tstmt_xxxxx npx <your-test-command>`
- Ask the user to open `https://app.testomat.io/projects/<project-id>/runs` and click a test with artifacts (failed tests typically have screenshots).
- Success: artifacts appear in the test results ("Artifacts" section or attachment icon) and are clickable; Playwright traces open in the trace viewer.

## References

| Description | Link |
|-------------|------|
| Getting started | https://docs.testomat.io/getting-started/ |
| Reporter configuration | https://docs.testomat.io/test-reporting/frameworks/ |
| Framework config snippets | [./reporting-config.md](./reporting-config.md) |
| Python test reporting | https://docs.testomat.io/test-reporting/python/ |
| Python Robot Framework | https://github.com/testomatio/robot-framework-reporter/blob/master/README.md |
| Java/JUnit reporting | https://docs.testomat.io/test-reporting/junit/ |
| HTML pipe | [./reporting-html.md](./reporting-html.md) |
| Debug pipe | `TESTOMATIO_DEBUG=1 <test-command>` |
| Artifacts (S3) | [./reporting-artifacts.md](./reporting-artifacts.md) |


---

## Sprint QA progress reporting

# QA Sprint Report by Testomat.io

## When to Use

- End of sprint — produce a shareable QA report for stakeholders.
- Sprint review — need a structured view of what was tested, passed, failed, blocked.
- Mid-sprint status — capture current execution progress.
- The user mentions "sprint report", "QA summary", "sprint progress", or similar.

## How to Identify the Sprint

The user may identify the sprint in one of these ways (in priority order):

1. **Milestone name or ID** — e.g. "Sprint 42", "Sprint 2024.3" — use `milestones_list(type="Sprint")` to find it.
2. **Run group title** — e.g. "Sprint 42 Run" — use `rungroups_list` / `rungroups_get`.
3. **Direct run ID or run title** — use `runs_get` or `runs_list`.
4. **Plan title or ID** — use `plans_list` / `plans_get`.
5. **No identifier provided** — ask the user to specify the sprint milestone, run group, or run.

> If the user provides only a sprint name like "Sprint 42", always resolve it to a concrete milestone/rungroup/run first. Do not assume the title directly maps to an ID.

## Rules

- **Do not fabricate data.** If MCP does not return a value, use `[None]` or hide the section. Never invent numbers or statuses.
- **Resolve sprint first.** Never assume a sprint name maps directly to a run ID without verification.
- **Hide unavailable sections.** If analytics (Section 8) is not available, omit it entirely rather than leaving placeholder text.
- **One blank line between actions.** In any generated code or CLI snippets.
- **Use each MCP tool's supported filter contract.** Prefer `tql` where that tool supports it (for example `runs_list` / `tests_list`). For `testruns_list`, use the established `run_id` + `filter_status` parameters; do not invent a TQL expression.
- **HTML is the default output.** Generate `.html` first; only offer `.md` if the user explicitly asks for it or their initial prompt includes a request to save as `.md`.
- **Safe output names.** Derive `SafeSprintName` by removing path separators, `..` traversal segments, and control characters. Resolve the final HTML/Markdown path and verify it remains inside the selected output directory before writing.

---

# MCP Tools Mapping

Each report section maps to specific MCP tools. See the full section structure and metrics in the template:

- [qa-sprint-report.md](./sprint-report-template.md) — section layout with fill-in placeholders

### Quick Commands

| Action | MCP Tool | Key Parameters |
|--------|----------|----------------|
| Find sprint milestone | `milestones_list` | `type="Sprint"`; search active **and closed** milestones for the requested sprint |
| List runs for sprint | `runs_list` | `tql`: `milestone == '{id}'` |
| Get run details | `runs_get` | `run_id` |
| Get test results | `testruns_list` | `run_id`, `filter_status` |
| Get suite tests | `tests_list` | `suite_id`, `per_page=100`, paginate `page=1..N` until the next page is empty |
| Check analytics availability | `system_ping` | (Enterprise flag in response) |
| Get test health analytics | `analytics_tests` | `kind`, `days`, `from`, `to` |
| Get stats analytics | `analytics_stats` | `kind`, `from`, `to` |

---

# Workflow

### Step 1: Resolve Sprint Identity

Ask the user if no sprint identifier is provided. Try to resolve:

```
1. milestones_list(type="Sprint") — find milestone matching sprint name
2. rungroups_list — find rungroup with sprint title
3. runs_list(tql="title % 'Sprint N'") — find runs by title
```

### Step 2: Gather Sprint Metadata & Time Range

Collect for the report header:

- `milestones_get(milestone_id)` or `rungroups_get(rungroup_id)` for sprint title/dates.
- Ask user for QA Lead name if not in TMS.

**Critical: Extract Sprint Time Range**

Resolve the sprint time range in this priority order:

1. **User-provided** — If the user specified a time range in their original prompt, use it.
2. **Milestone/Rungroup dates** — Extract `start_date` / `due_date` from `milestones_get` or `rungroups_get`.
3. **Run timestamps** — If milestone/rungroup has no dates, derive from earliest `created_at` and latest `finished_at` across the sprint's runs (`runs_get`).
4. **Manual input** — If no time range can be determined from TMS, ask the user to specify the sprint period manually.

The time range is required for:
- `analytics_tests(kind="...", from="YYYY-MM-DD", to="YYYY-MM-DD")`
- `analytics_stats(kind="...", from="YYYY-MM-DD", to="YYYY-MM-DD")`
- Filtering runs by sprint period

### Step 3: Collect Run Data

1. `runs_list(tql="milestone == '{id}'")` — all runs for the sprint milestone
2. For each run, call `runs_get` to get status, counts, environments
3. `testruns_list(run_id, filter_status)` — get passed/failed/skipped per run; use only these supported parameters for test-run filtering
4. When suite-level test inventory is needed, call `tests_list(suite_id, per_page=100, page=1)` and keep incrementing `page` until a page returns no additional tests. Calculate totals and coverage only after all pages are collected.

### Step 4: Build Report Sections

Iterate sections 1–9 of the template, populating each with MCP data. Apply rules:

- If a metric is not available → use `[None]` in the cell
- If an entire section has no data → hide the section (do not show placeholder text)
- Section 8 (Analytics) → check `system_ping` response for Enterprise capability; if not available, hide

### Step 5: Write Output File

Write the filled report to:
```
{user-specified-path}/QA_Sprint_Progress_Report_{SafeSprintName}_{YYYY-MM-DD}.html
```

If no path specified, save to current working directory.

### Step 6: Offer Markdown Export

After writing the `.html` file, ask the user if they also want to export the report as a `.md` file:

```
❓ The report has been saved to `{path}`.
Would you like to also export it as a `.md` file?

1. ✏️ Yes, save as `.md` in the same location
2. 👍 No, keep the `.html` only
```

**If user picks option 1:**
1. Convert the HTML content to Markdown format.
1. Generate ".md" markdown format report using template from the references - [qa-sprint-report.md](./sprint-report-template.md).
2. Save as `QA_Sprint_Progress_Report_{SafeSprintName}_{YYYY-MM-DD}.md` in the **same directory** as the HTML file.

**If user picks option 2:**
- Confirm the `.html` path and end the workflow.

## HTML Template Styling

When exporting to HTML, apply the following styles:

### Color Palette

| Token | Hex | Usage |
|-------|-----|-------|
| `--primary-color` | `#6366f1` | Headers, badges, links |
| `--primary-hover` | `#4f46e5` | Hover states |
| `--success-color` | `#10b981` | Passed/ready badges |
| `--danger-color` | `#ef4444` | Failed/blocked badges |
| `--warning-color` | `#f59e0b` | In-progress badges |
| `--info-color` | `#3b82f6` | Info badges |
| `--gray-50` to `--gray-900` | `#f9fafb` → `#111827` | Text hierarchy |

### Typography

- **Font Family:** Inter (Google Fonts) with fallback: `-apple-system, BlinkMacSystemFont, sans-serif`
- **Font Weights:** 300 (light), 400 (regular), 500 (medium), 600 (semibold), 700 (bold), 800 (extrabold)
- **Monospace:** `ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas` — for ticket IDs and code
- **Icons:** Font Awesome 6.4.0 (`fa-solid`)

### Status Badges

| Status | Background | Text Color |
|--------|------------|------------|
| `passed`, `ready` | `#d1fae5` | `#065f46` |
| `failed`, `blocked` | `#fee2e2` | `#991b1b` |
| `progress` | `#fef3c7` | `#92400e` |
| `info` | `#dbeafe` | `#1e40af` |

### Key Elements

| Element | Description |
|---------|-------------|
| `.main-container` | White glass card (`rgba(255,255,255,0.98)`) with `backdrop-filter: blur(20px)`, max-width 1300px, border-radius 20px |
| `.header` | Gradient background (`linear-gradient(135deg, #6366f1, #4f46e5)`), white text, flex layout |
| `.section-card` | White background, 1px border `--gray-200`, border-radius 12px, box-shadow |
| `.report-table` | Full-width, collapse borders, hover highlight on rows |
| `.meta-grid` | CSS Grid (`repeat(auto-fit, minmax(220px, 1fr))`), gap 20px |
| `.instruction-card` | Info box with left 5px border in `--primary-color`, background `#eef2ff` |
| `.tms-link` | Primary color link with hover underline |

### HTML Structure

```html
<div class="main-container">
  <header class="header">
    <div class="header-title">
      <h1>QA Sprint Progress Report</h1>
      <p><i class="fa-solid fa-cubes"></i> [Project Name]</p>
    </div>
    <div class="header-badge">
      <i class="fa-solid fa-calendar-days"></i> Sprint: [Sprint Number]
    </div>
  </header>

  <section class="instruction-section">
    <div class="instruction-card">
      <h5><i class="fa-solid fa-circle-info"></i> How to Use This Template</h5>
      <ul>...</ul>
    </div>
  </section>

  <main class="content-section">
    <div class="section-card">
      <div class="section-title"><i class="fa-solid fa-chart-pie"></i> 1. Sprint Summary Scorecard</div>
      <div class="meta-grid">...</div>
    </div>
    <!-- Repeat section-card for each section -->
  </main>
</div>
```

---

# Report Template Reference

| Section | Description |
|---------|-------------|
| [qa-sprint-report.md](./sprint-report-template.md) | Full template with all sections, emoji, and fill-in placeholders |