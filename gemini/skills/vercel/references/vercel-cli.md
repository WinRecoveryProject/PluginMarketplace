# Skill: vercel-cli

- Plugin: `vercel` (0.56.0-wrp.2)
- Source: `plugins/vercel/skills/vercel-cli/SKILL.md`

> Vercel CLI expert guidance. Use when deploying, managing environment variables, linking projects, viewing logs, querying metrics, debugging a deployed app on Vercel (errors, 5xx responses, timeouts, slow routes, or a single failing request), managing domains, managing feature flags with vercel flags, reviewing security checks or Security Review vulnerabilities with vercel security, or interacting with the Vercel platform from the command line. Use the vercel-tracing skill instead for `vercel traces` span search, trace inspection, and sampling rules, or for OpenTelemetry setup.

## Instructions

### Vercel CLI Skill

The Vercel CLI (`vercel` or `vc`) deploys, manages, and develops projects on the Vercel platform from the command line. Use `vercel <command> --help` for full flag details on any command.

The installed CLI help is the source of truth for obscure or newly added flags. If a command example here is not enough, check `vercel <command> --help` before acting instead of guessing.

Parse only stdout for URLs and JSON. Warnings, progress, and `--help` print to stderr; merge streams only when searching help text. Some help commands exit 2 after printing usage, so treat printed usage as a successful help read.

In agent/non-interactive mode, many commands report errors and required confirmations as a single JSON object on stdout with `status`, `reason`, `hint`, and `next` (runnable follow-up commands). Prefer a suggested `next` command over composing a retry only after confirming that it preserves the user's intended target and authorization; do not automatically run linking, authentication, or mutation follow-ups. Read commands such as `list`, `logs`, `inspect`, and `api` keep their normal output shape.

#### Critical: Project Linking

Project context depends on the command's working directory. Before a consequential read or mutation, run `vercel project inspect --non-interactive` from the intended directory and confirm the reported owner and project. This command resolves only existing context in non-interactive mode; stop on `link_required` or a target mismatch instead of linking automatically.

Many project-aware commands also accept `--project <name-or-id>` with `--scope <team>` for an explicit, one-command target. Confirm that target and scope preserve the user's intent before using them.

- **`<cwd>/.vercel/project.json`**: Created by `vercel link`. This exact working-directory link wins over a repository link. The CLI does not generally inherit a root `project.json` when run from an arbitrary subdirectory.
- **`<repo-root>/.vercel/repo.json`**: Created by `vercel link --repo`. The CLI selects the deepest project directory that contains the working directory.
- **Unmatched repository path**: If no repo mapping contains the working directory, interactive repo resolution prompts among the configured projects. Non-interactive repo resolution currently selects the only configured project or remains unresolved when multiple choices exist. Commands that set up projects may then enter a linking flow, so non-interactive mode is not generally fail-closed.

Being inside an app directory is not proof that the intended project was selected. Check the resolved project explicitly, especially when a repo mapping does not cover that directory.

`vercel whoami --format json` identifies the authenticated user and effective team; plain non-TTY `vercel whoami` prints only the username. Neither verifies the linked project. Read-only project commands can still require login or team SAML re-authentication and open a browser/device flow. Ask the user to complete that flow deliberately before continuing.

#### Quick Start

```bash
npm i -g vercel
vercel login
vercel link              # single project
### OR
vercel link --repo       # monorepo
vercel pull
vercel dev        # local development
vercel deploy     # preview deployment
vercel --prod     # production deployment
```

#### Decision Tree

Use this to route to the correct reference file:

- **Deploy, redeploy, forced builds, no-cache builds, or deployment source/provenance** → `references/deployment.md`
- **Rolling releases, deploy hooks, cron jobs, cache, git connection, Edge Config, redirects, custom environments** → `references/project-infra.md`
- **Local development** → `references/local-development.md`
- **Environment variables** → `references/environment-variables.md`
- **CI/CD automation** → `references/ci-automation.md`
- **Domains or DNS** → `references/domains-and-dns.md`
- **Projects or teams** → `references/projects-and-teams.md`
- **Vercel Toolbar comments (`vercel comments`)** → `references/comments.md`
- **Build failures, deployment errors, logs, metrics, Speed Insights, Core Web Vitals, activity, performance, preview access, or production debugging** → `references/monitoring-and-debugging.md`
- **Alerts, usage, contracts, billing purchases, tokens, telemetry, or CLI upgrades** → `references/platform-ops.md`
- **Blob storage** → `references/storage.md`
- **Container Registry (`vercel vcr`: repositories, images, tags, docker/podman/buildah login, push/pull)** → `references/container-registry.md`
- **Integrations (databases, storage, etc.)** → `references/integrations.md`
- **Connectors (`vercel connect`)** → `references/connectors.md`
- **Routing rules** → `references/routing.md`
- **Firewall (WAF rules, IP blocks, rate limiting)** → `references/firewall.md`
- **Security Review vulnerabilities or security checks (`vercel security`)** → `references/security.md`
- **Access a preview deployment** → use `vercel curl` (see `references/monitoring-and-debugging.md`)
- **CLI command is unavailable or output is missing required fields** → use `vercel api` after first-class CLI paths are unavailable or insufficient (see `references/advanced.md`)
- **Node.js backends (Express, Hono, etc.)** → `references/node-backends.md`
- **Monorepos (Turborepo, Nx, workspaces)** → `references/monorepos.md`
- **Bun runtime** → `references/bun.md`
- **Feature flags (`vercel flags`: create, inspect, set, split, rollout, rules, segments, sdk-keys)** → `references/flags.md`
- **Microfrontends** → `references/microfrontends.md`
- **Sandbox** → `references/sandbox.md`
- **Agent, MCP, skills discovery, or AI Gateway** → `references/agent-and-ai.md`
- **Captured request traces (`vercel traces`, including `--open` / `--view`)** → `references/advanced.md`
- **Advanced (`vercel api` fallback, webhooks)** → `references/advanced.md`
- **Global flags** → `references/global-options.md`
- **First-time setup** → `references/getting-started.md`

#### Anti-Patterns

- **Wrong link type in monorepos with multiple projects**: `vercel link` creates `project.json`, which only tracks one project. Use `vercel link --repo` instead. When things break, check `.vercel/` first.
- **Letting commands auto-link in monorepos**: Many commands implicitly run `vercel link` if `.vercel/` doesn't exist. This creates `project.json`, which may be wrong. Run `vercel link` (or `--repo`) explicitly first.
- **Assuming an app subdirectory determines the project**: Verify with `vercel project inspect --non-interactive`; an unmatched repo path can currently fall back to the sole configured project in non-interactive mode.
- **Using `vercel whoami` as linked-project verification**: `vercel whoami --format json` reports authentication and team context, not the selected project.
- **Forgetting non-interactive flags in plain CI runs**: detected agents get `--non-interactive` by default, but plain CI does not — pass it explicitly there, and add `--yes` only for commands that require confirmation.
- **Using `vercel deploy` after `vercel build` without `--prebuilt`**: The build output is ignored.
- **Using `vercel redeploy` for no-cache rebuilds**: `vercel redeploy` does not expose a no-cache flag; use `vercel deploy --force` without `--with-cache` when you need a fresh deployment that does not retain build cache.
- **Hardcoding tokens in flags**: Use `VERCEL_TOKEN` env var instead of `--token`.
- **Disabling deployment protection**: Use `vercel curl` instead to access preview deploys.
- **Using `vercel api` too early**: Prefer first-class CLI commands when they expose the needed data or mutation.

## Bundled files

### File: `.vercel.approvers`

```text
@vercel/vercel-cli-approvers:team
```

### File: `command/vercel.md`

---
description: Load the Vercel CLI skill for deploying, managing, inspecting, and troubleshooting projects on the Vercel platform. Use when users ask to deploy a project, inspect deployments, debug logs or metrics, check activity, alerts, or usage, set up environment variables, configure domains or DNS, start local development, manage Vercel infrastructure, add databases, integrations, connectors, or Blob stores, configure Sandbox or agent/MCP tooling, or use Vercel API fallback.
---

Load the Vercel CLI skill and help with Vercel project deployment, management, inspection, and troubleshooting.

##### Workflow

###### Step 1: Identify task type from user request

Use the decision tree in SKILL.md to select the relevant reference file.

###### Step 2: Read the reference file

Based on task type, read `references/<topic>.md`. Use `vercel <command> --help` for full flag details before using uncommon or risky flags.

###### Step 3: Execute task

**Key things to verify:**

- Run `vercel project inspect --non-interactive` from the intended working directory and confirm the owner and project; stop on `link_required` or a mismatch instead of treating `.vercel/` existence as proof
- Use `vercel pull` for project settings and environment data under `.vercel/`; use `vercel env pull` for `.env.local` or another file that is already excluded from source control
- If login or team SAML re-authentication opens a browser/device flow, wait for deliberate user completion before continuing
- Use `--non-interactive` for prompt-free runs and `--yes` only when confirmation is required
- Use `VERCEL_TOKEN` env var for auth (not `--token`)
- Use first-class CLI commands before `vercel api`
- Use `vercel curl` to access preview deployments; don't disable protection

###### Step 4: Summarize

Report the commands run, meaningful outputs, and any remaining permission, scope, or subscription limits.

<user-request>
$ARGUMENTS
</user-request>

### File: `overlay.yaml`

```yaml
name: vercel-cli
description: Vercel CLI expert guidance. Use when deploying, managing environment variables, linking projects, viewing logs, querying metrics, debugging a deployed app on Vercel (errors, 5xx responses, timeouts, slow routes, or a single failing request), managing domains, managing feature flags with vercel flags, reviewing security checks or Security Review vulnerabilities with vercel security, or interacting with the Vercel platform from the command line. Use the vercel-tracing skill instead for `vercel traces` span search, trace inspection, and sampling rules, or for OpenTelemetry setup.
metadata:
  priority: 4
  docs:
    - "https://vercel.com/docs/cli"
  sitemap: "https://vercel.com/sitemap.xml"
  pathPatterns:
    - 'vercel.json'
    - 'vercel.ts'
    - '.vercel/**'
    - '.vercelignore'
    - 'now.json'
  bashPatterns:
    - '^\s*vercel(?:\s|$)'
    - '^\s*vc(?:\s|$)'
    - '\bnpx\s+vercel\b'
    - '\bpnpm\s+dlx\s+vercel\b'
    - '\bbunx\s+vercel\b'
    - '\byarn\s+dlx\s+vercel\b'
    - '\bnpx\s+@vercel/config\b'
  promptSignals:
    phrases:
      - "check deployment"
      - "check deploy"
      - "deployment status"
      - "deploy status"
      - "vercel logs"
      - "vercel metrics"
      - "deployment logs"
      - "deploy logs"
      - "vercel inspect"
      - "is it deployed"
      - "deploy failing"
      - "deploy failed"
      - "deployment error"
      - "check vercel"
      - "vercel status"
      - "vercel security"
      - "security review"
    allOf:
      - [check, deployment]
      - [check, deploy]
      - [vercel, status]
      - [vercel, logs]
      - [vercel, metrics]
      - [deploy, error]
      - [deploy, failed]
      - [deploy, stuck]
    anyOf:
      - "deployment"
      - "deploy"
      - "vercel"
      - "production"
    noneOf:
      - "terraform"
      - "aws deploy"
      - "heroku"
    minScore: 6
retrieval:
  aliases:
    - vercel command line
    - vc cli
    - deploy command
    - vercel terminal
  intents:
    - deploy from cli
    - link project
    - manage domains
    - view logs from terminal
  entities:
    - vercel CLI
    - vercel deploy
    - vercel env
    - vercel link
    - vercel logs
    - vercel metrics
    - vercel traces
    - vercel security
chainTo:
  -
    pattern: '\b(?:vercel|vc)\s+traces\b'
    targetSkill: vercel-tracing
    message: 'vercel traces command detected — loading Vercel Tracing guidance for span search, request inspection, and sampling rules.'
  -
    pattern: '"functions"\s*:\s*\{|"maxDuration"\s*:|"memory"\s*:'
    targetSkill: vercel-functions
    message: 'Functions configuration detected in vercel.json — loading Vercel Functions guidance for runtime options, streaming, and Fluid Compute.'
    skipIfFileContains: '"crons"\s*:'
  -
    pattern: '"redirects"\s*:\s*\[|"rewrites"\s*:\s*\[|"headers"\s*:\s*\['
    targetSkill: routing-middleware
    message: 'Routing rules in vercel.json — loading Routing Middleware guidance for platform-level request interception patterns.'
```

### File: `references/advanced.md`

#### Advanced Commands

##### `vercel api` — Fallback for Missing CLI Commands

**Use `vercel api` when a CLI command doesn't exist for what you need.** Full access to the Vercel REST API with automatic authentication.

Use first-class CLI commands before `vercel api` whenever they expose the data or mutation you need.

Use `vercel api` when:

- The first-class CLI command does not exist.
- The first-class command omits fields needed for the answer.
- JSON output is needed for filtering or aggregation.
- Endpoint discovery is needed through `vercel api list`.

Keep calls narrow and shape large responses before presenting them. Add `--raw` when a downstream parser should receive only the JSON response payload. Use `--raw-field` instead of typed `--field` when the API expects a string value that looks like a boolean or number.

```bash
vercel api /v2/user                                    # GET current user
vercel api /v9/projects --scope my-team                # list projects
vercel api /v10/projects -X POST -F name=my-project    # create project
vercel api /v6/deployments --paginate                  # paginate all results
vercel api list                                        # list available endpoints
vercel api list --format json                          # list endpoints as JSON
vercel api "/v6/deployments?projectId=<project-id>&limit=10" --scope <team>
vercel api "/v6/deployments?limit=10" --raw            # JSON payload
vercel api /v9/projects/<project>/env/<env-id> -X PATCH --raw-field value=false --scope <team>
```

Use `vercel api list` to discover available endpoints. `vercel api ls` is also accepted as an alias.

Do not parse `vercel api --generate=curl` output as JSON; it emits a curl command.

DELETE requests prompt for confirmation; in non-interactive/agent mode they are refused unless `--dangerously-skip-permissions` is passed. Use that flag only for deletions the user explicitly approved.

##### `vercel traces` — Captured Request Traces

Fetch traces captured for a Vercel project. `inspect` is the default subcommand.

```bash
vercel traces inspect req_1234567890                                   # markdown summary
vercel traces req_1234567890                                           # equivalent (inspect is default)
vercel traces inspect req_1234567890 --json                            # raw trace JSON to stdout
vercel traces inspect req_1234567890 --scope my-team --project my-app  # specific team/project
vercel traces inspect req_1234567890 --open                            # open in Vercel Dashboard
vercel traces inspect req_1234567890 --open --view waterfall           # specific dashboard view (timeline, tree, waterfall)
```

`--view` is only valid alongside `--open`.

`vercel traces search` searches spans across the team, or one project with `--project`, newest first, from the last hour by default:

```bash
vercel traces search --environment production --status error --since 1h
vercel traces search --query 'span.duration > 2000' --json
vercel traces search --next <cursor> --json                         # continue from the summary's pagination.next
```

With `--json`, each span is a `{"type":"span","data":{...}}` line, and the output ends with a `summary` line (`recordsReturned`, `timeRange`, `pagination: { hasMore, next }`, `excludedIntervals`). Read spans under `.data`, for example `jq 'select(.type == "span") | .data.span.name'`. When more spans match, continue with `--next` instead of raising `--limit`; the cursor keeps the team, project, filters, and window, so only `--limit` can change. A request ID from search results or logs does not guarantee that `vercel traces inspect` can retrieve the trace; reuse the same `--scope` and `--project`.

##### Other Commands

- `vercel webhooks` — manage webhooks (create, ls, rm)
- `vercel mcp` — set up MCP integration for AI agents
- `vercel telemetry` — manage telemetry settings
- `vercel upgrade` — upgrade the CLI

### File: `references/agent-and-ai.md`

#### Agent, MCP, Skills, and AI Gateway

Use these commands for AI-agent setup and AI Gateway key management. Confirm flags with `vercel <command> --help` before scripting client-specific setup.

##### Agent Instructions

`vercel agent` generates an `AGENTS.md` file with Vercel deployment best practices.

```bash
vercel agent init
vercel agent init --yes
```

##### MCP Setup

`vercel mcp` sets up MCP agents and configuration for Vercel integration.

```bash
vercel mcp                                      # interactive setup
vercel mcp --project                            # project-specific access
vercel mcp --clients "Cursor,VS Code with Copilot"
```

In non-interactive mode, pass `--clients`. Supported client labels are listed in `vercel mcp --help`.

##### Skill Discovery

`vercel skills` discovers agent skills relevant to a project.

```bash
vercel skills
vercel skills nextjs --format json
vercel skills --json
```

##### AI Gateway

`vercel ai-gateway` manages AI Gateway API keys, routing rules, and models.

```bash
vercel ai-gateway api-keys create
vercel ai-gateway api-keys create --name my-key --budget 500 --refresh-period monthly
vercel ai-gateway api-keys create --include-byok

vercel ai-gateway rules ls
vercel ai-gateway rules add --type rewrite --source anthropic/claude-fable-5 --destination anthropic/claude-opus-4.8

vercel ai-gateway models ls
vercel ai-gateway models endpoints anthropic/claude-opus-4.8
```

Use the dashboard or `vercel api` only when first-class CLI commands do not expose the needed operation.

### File: `references/bun.md`

#### Bun on Vercel

Vercel supports Bun as a runtime. To enable it, add `"bunVersion": "1.x"` to your `vercel.json`:

```json
{
  "bunVersion": "1.x"
}
```

That's it. Vercel will use Bun instead of Node.js to run your project.

This works with any framework — backend apps (Express, Hono, Elysia), frontend frameworks, or anything else. Bun is used as the runtime, so Bun-specific APIs and features are available.

##### Example: Elysia with Bun

Elysia is a Bun-native framework. To use it on Vercel:

**vercel.json:**

```json
{
  "bunVersion": "1.x"
}
```

**package.json:**

```json
{
  "type": "module",
  "dependencies": {
    "elysia": "^1.0.0"
  }
}
```

**server.ts:**

```typescript
import { Elysia } from 'elysia';

const app = new Elysia().get('/', () => 'Hello Elysia!');

export default app;
```

##### Example: Next.js with Bun

**vercel.json:**

```json
{
  "bunVersion": "1.x"
}
```

**package.json:**

```json
{
  "scripts": {
    "dev": "bun run --bun next dev",
    "build": "bun run --bun next build"
  }
}
```

##### Anti-Patterns

- **Forgetting `bunVersion` in `vercel.json`**: Without it, your project runs on Node.js. Bun-specific APIs (like `Bun.file()`) will fail at runtime.

### File: `references/ci-automation.md`

#### CI/CD Automation

##### Authentication

Use `VERCEL_TOKEN` env var (not `--token` — it leaks in process listings). Use `--scope` if the token has access to multiple teams.

##### The Standard CI Deploy Pattern

```bash
vercel pull --yes --environment=production
vercel build --prod
vercel deploy --prebuilt --prod
```

For multi-project monorepos, ensure `vercel link --repo --yes` has been run first.

##### Separate Build and Deploy Jobs

Use `--standalone` so build artifacts are self-contained and can be passed between jobs:

```yaml
jobs:
  build:
    steps:
      - run: vercel pull --yes --environment=production
      - run: vercel build --prod --standalone
      - uses: actions/upload-artifact@v4
        with:
          name: vercel-build
          path: .vercel/output

  deploy:
    needs: build
    steps:
      - uses: actions/download-artifact@v4
        with:
          name: vercel-build
          path: .vercel/output
      - run: vercel deploy --prebuilt --prod
```

Without `--standalone`, the deploy job will fail because artifacts reference files outside `.vercel/output/`.

##### Capturing the Deploy URL

```bash
URL=$(vercel deploy --prod)   # stdout = URL, stderr = progress
```

##### Key Rules

1. Always use `--yes` to skip prompts
2. Always use `VERCEL_TOKEN` env var for auth
3. Use `--scope` if the token has access to multiple teams
4. Use `vercel build` + `vercel deploy --prebuilt` for deterministic builds
5. If something goes wrong, check `.vercel/` — `project.json` vs `repo.json` is the most common issue

### File: `references/comments.md`

#### Vercel Toolbar Comments

`vercel comments` reviews and manages existing Vercel Toolbar comment threads from the terminal. Create new threads with the Vercel Toolbar.

##### Review comment threads

Without a subcommand, `vercel comments` runs `list` and returns unresolved threads for the linked project. It filters by the current Git branch when the project resolves through the current checkout and a branch can be inferred.

```bash
vercel comments --json
vercel comments inspect <thread> --json
```

`list` has the alias `ls`, while `inspect` has the alias `get`. Commands that act on a thread accept its ID or full `vercel.com` comment URL. A URL supplies its team unless `--scope` or `--project` overrides it.

Use `--branch <branch>` or `--all-branches` to set branch scope explicitly. Other list filters include `--status`, `--page-path`, `--author`, `--content-id`, and `--search`. The `--author` option accepts user IDs or `me`, but not usernames. Resolving `me` requires user authentication.

##### Reply and update threads

```bash
vercel comments reply <thread> -m 'Fixed in **main**.'
vercel comments resolve <thread> -m 'Fixed in the latest deployment.'
vercel comments resolve <thread-1> <thread-2> --yes
vercel comments reopen <thread> --yes
```

`reply` accepts Markdown from `--message`, `--file`, or standard input. Use `--attach <url>` repeatedly to add up to 10 HTTPS attachments. Attachments can form a reply without message text; local file uploads are not supported.

`resolve` and `reopen` accept multiple threads. Pass `--yes` for bulk operations in non-interactive or JSON mode. A closing `--message` is supported only when resolving one thread. Bulk operations continue after an individual failure and return a nonzero exit status if any operation fails.

##### Edit or delete messages

Inspect a thread to find its message IDs before editing or deleting a message.

```bash
vercel comments edit <thread> <message-id> -m 'Updated wording'
vercel comments delete <thread> <message-id> --yes
```

Editing message content preserves its attachments. Deleting a message cannot be undone and requires `--yes` in non-interactive or JSON mode.

##### Use JSON output

Both `--json` and `--format json` produce JSON with every subcommand except `open`. JSON mode never prompts for missing input or confirmation.

```bash
vercel comments --json | jq '.threads[].id'
vercel comments inspect <thread> --format json
```

Use `vercel comments open <thread>` to open a thread on `vercel.com`; this subcommand does not support JSON output.

### File: `references/connectors.md`

#### Connectors

`vercel connect` manages connectors such as Slack apps. Vercel Connect is currently in beta, so behavior may change. Check `vercel connect --help` if a subcommand is unavailable.

##### Common Commands

```bash
vercel connect create slack --name my-bot
vercel connect create slack --name my-bot --triggers
vercel connect update <connector-id-or-uid> --icon ./logo.png --background-color '#1A2B3C' --accent-color '#FF0066'
vercel connect list --format=json
vercel connect list --all-projects
vercel connect list --type slack
vercel connect list --search linear --limit 10
vercel connect attach <connector-id-or-uid> -e production -e preview --yes
vercel connect detach <connector-id-or-uid> --yes
vercel connect token <connector-id-or-uid> --format=json
vercel connect open <connector-id-or-uid>
vercel connect remove <connector-id-or-uid> --disconnect-all --yes
```

##### `connect token` — Subject and Scopes

`--subject` selects whose token is returned. `--installation-id` targets a specific installation when the subject is `app`. `--scopes` is comma- or space-separated.

```bash
vercel connect token scl_abc123                                          # user token (default subject)
vercel connect token scl_abc123 --subject app                            # app token, default installation
vercel connect token scl_abc123 --subject app --installation-id inst_1   # app token, specific installation
vercel connect token scl_abc123 --scopes "chat:write,im:write"           # scoped token
vercel connect token scl_abc123 --yes                                    # open browser if auth/install needed
vercel connect token scl_abc123 --format=json                            # includes expiresAt, installationId
```

##### `connect attach` — Trigger Destinations

Pass `--triggers` to register the project as a webhook trigger destination. Use `--trigger-branch` and `--trigger-path` to override defaults.

```bash
vercel connect attach scl_abc123 --triggers                                                # default branch + /{service}
vercel connect attach scl_abc123 --triggers --trigger-branch staging --trigger-path /slack
vercel connect attach scl_abc123 --project my-app --triggers                               # different project
```

A connector accepts at most 3 trigger destinations. Use `--project <name-or-id>` on `attach`/`detach` when targeting a project other than the currently linked one.

Connector IDs look like `scl_...`; UIDs look like `slack/my-bot`. Either works wherever an `id` argument is accepted.

Connector tokens and trigger URLs can grant access to third-party systems. Do not print or store them unless the user explicitly needs that output.

### File: `references/container-registry.md`

#### Container Registry (VCR)

`vercel vcr` manages the Vercel Container Registry — a project-scoped registry for OCI/Docker images served from `vcr.vercel.com`. Every repository belongs to a Vercel project, so commands resolve the target project from the linked project or `--project` (`-p`). Run `vercel vcr --help` (or `vercel vcr <subcommand> --help`) for the current flag list.

A full image reference is:

```txt
vcr.vercel.com/<team-slug>/<project-slug>/<repository>:<tag>
vcr.vercel.com/<team-slug>/<project-slug>/<repository>@sha256:<digest>
```

##### Repositories

```bash
vercel vcr ls                                   # list repositories in the linked project (alias: list)
vercel vcr ls --project my-app --format json    # list for a specific project as JSON
vercel vcr inspect my-repository                # show one repository (alias: get)
vercel vcr add my-repository                    # create a repository (alias: create)
vercel vcr rm my-repository                     # delete a repository (aliases: remove, delete)
vercel vcr rm my-repository --yes               # delete without the confirmation prompt
```

##### Tags

```bash
vercel vcr tag ls my-app                                 # list a repository's tags (alias: tags; ls alias: list)
vercel vcr tag ls my-app --sort-by tag --sort-order asc  # sort (sort-by: updatedAt|tag, sort-order: asc|desc)
vercel vcr tag inspect my-app latest                     # show one tag (alias: get)
```

##### Images

```bash
vercel vcr image ls my-app                          # list images in a repository (alias: images; ls alias: list)
vercel vcr image ls my-app --untagged --format json # only images with no tags, as JSON
vercel vcr image inspect my-app img_abc123          # show one image incl. layer history (alias: get)
vercel vcr image rm my-app img_abc123               # delete an image (aliases: remove, delete)
vercel vcr image rm my-app img_abc123 --yes         # delete without the confirmation prompt
```

##### Login

`vercel vcr login <engine>` authenticates a local container tool with `vcr.vercel.com` by minting a short-lived project OIDC token and piping it to the engine over stdin (never logged, returned, or placed on the command line). The token logs in as username `oidc` and is valid for ~12 hours — re-run to refresh.

```bash
vercel vcr login docker                  # engine is required: docker | podman | buildah
vercel vcr login podman
vercel vcr login docker --project my-app # log in for a specific project
```

The engine argument is required (no default) and the binary must be installed and on your `PATH`; otherwise the command fails fast before any network work. Override the registry host with `VERCEL_VCR_REGISTRY` if needed.

Manual login without the CLI (equivalent, e.g. inside CI where an OIDC token is already present):

```bash
printf '%s' "$VERCEL_OIDC_TOKEN" | docker login vcr.vercel.com --username oidc --password-stdin
```

##### Push and Pull

Pushing/pulling is done with your container tool against the full image reference (there is no `vercel vcr push`). VCR creates the repository automatically on first push when the authenticated account has access to the project.

```bash
#### zstd compression is recommended for VCR
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  --output "type=image,name=vcr.vercel.com/team-slug/project-slug/my-repo:latest,push=true,oci-mediatypes=true,compression=zstd,compression-level=3,force-compression=true" \
  .

docker pull vcr.vercel.com/team-slug/project-slug/my-repo:latest
```

##### JSON and Non-Interactive Behavior

- Every subcommand supports `--format json` (`--format`/`--json` are validated together; conflicting values error).
- Destructive commands (`vcr rm`, `vcr image rm`) confirm interactively; pass `--yes` to skip.
- Errors are emitted as structured agent/JSON payloads (`{"status":"error","reason":"…","message":"…"}`) with a suggested `next` command, e.g. `MISSING_ARGUMENTS`, `INVALID_ARGUMENTS`, `ENGINE_NOT_FOUND`, `NOT_AUTHORIZED`.
- List commands paginate with `--limit` and `--cursor` (`-c`); pass the returned cursor to fetch the next page.

### File: `references/deployment.md`

#### Deployment

Ensure `.vercel/` exists before deploying (via `vercel link` or `vercel link --repo`).

##### Basic Usage

```bash
vercel                    # preview deployment (default)
vercel --prod             # production deployment
vercel --target staging   # custom environment
```

##### Prebuilt Deploy

Build locally, deploy the output — avoids remote builds:

```bash
vercel build --prod
vercel deploy --prebuilt --prod
```

If build and deploy run in **separate CI jobs**, use `--standalone` so artifacts are self-contained:

```bash
vercel build --prod --standalone
#### (upload .vercel/output/ as artifact, then in deploy job:)
vercel deploy --prebuilt --prod
```

##### Deploy Output

- **stdout**: The deployment URL (pipeable)
- **stderr**: Progress and errors

```bash
URL=$(vercel deploy --prod)
```

##### Forced Deploys And Build Cache

`vercel deploy --force` creates a new deployment even when Vercel would otherwise
reuse an existing result. For forced deploys, build cache is not retained unless
`--with-cache` is also provided.

Use this when you need a fresh preview build from the current local checkout:

```bash
vercel deploy . --target preview --force
```

For large repositories, retry with an archive if the CLI reports too many files:

```bash
vercel deploy . --target preview --force --archive=tgz
```

`vercel redeploy <url>` rebuilds an existing deployment, but it does not support
a no-cache flag. A manual CLI deploy is not the same as a Git integration
redeploy: it creates a new deployment from local source, so commit metadata,
aliases, source provenance, and dashboard grouping may differ from the original
Git-triggered deployment.

##### Accessing Preview Deployments

Use `vercel curl` — it handles deployment protection automatically:

```bash
vercel curl /api/health --deployment $PREVIEW_URL
```

**Do not disable deployment protection.** Use `vercel curl` instead.

##### Other Deploy Commands

- `vercel redeploy <url>` — rebuild an existing deployment; no no-cache flag
- `vercel promote <url>` — move a deployment to production without rebuilding
- `vercel rollback <url>` — revert to a previous deployment
- `vercel rolling-release` / `vercel rr` — gradual traffic shifting

##### Workflows

###### Blue/Green

```bash
URL=$(vercel --prod --skip-domain)   # deploy without domain assignment
vercel curl / --deployment $URL      # verify (handles deployment protection)
vercel promote $URL                  # promote to production
```

###### Rolling Release

```bash
vercel rr configure --enable --advancement-type=automatic --stage=10,5m --stage=50,10m
vercel rr start --dpl=<deployment-url> --yes
vercel rr fetch
```

See `references/project-infra.md` for approve, abort, and complete commands.

### File: `references/domains-and-dns.md`

#### Domains & DNS

##### Overview

- `vercel domains` — manage domain ownership and project assignment
- `vercel domains search` — discover available domains and registrar pricing
- `vercel domains check` — check registrar availability (single or bulk)
- `vercel domains price` — get registrar quotes (single or bulk)
- `vercel domains buy` — purchase a domain
- `vercel dns` — manage DNS records (when using Vercel nameservers)
- `vercel alias` — map deployment URLs to custom domains
- `vercel certs` — manage SSL certificates (usually auto-managed)

Most users only need `vercel alias` — domains and DNS are auto-configured when using Vercel nameservers.

##### Typical Flow

1. Add domain to your team, optionally assigning it to a project:
   - **Team only** — `vercel domains add example.com` adds the domain to your team without assigning a project (works from any directory).
   - **Assign to a project** — pass the project name as a second argument: `vercel domains add example.com my-project`.
   - **Linked directory** — one argument still adds to your team only; pass a project name as a second argument to assign it to a project.
2. Configure nameservers at registrar to point to Vercel
3. Deploy: `vercel --prod` (domain is auto-assigned)

Or manually alias: `vercel alias set <deployment-url> example.com`

##### Domain Discovery

###### Search

```bash
vercel domains search acme
vercel domains search acme --available --tld .com --limit 200
```

Search returns availability, purchase pricing, and renewal pricing in bulk. Use the continuation command printed by the CLI to fetch the next page.
`--limit` controls how many candidates are checked per page. `--available` filters that window, so a page can return fewer results than the limit.

###### Availability

```bash
vercel domains check example.com
vercel domains check one.com two.com three.com --format=json
```

###### Pricing

```bash
vercel domains price example.com
vercel domains price one.com two.com three.com --format=json
```

###### Notes

- `domains check` and `domains price` support up to 50 domains per request.
- If `domains price` doesn't output a purchase price for a given domain, the domain is unavailable. If you only need availability data, just use `domains check`. If you need both price and availability data, use `domains price` to fetch both at once.

##### Purchase

```bash
vercel domains buy example.com
```

```bash
vercel domains inspect example.com
vercel domains add example.com              # add to team
vercel domains add example.com my-project   # add to team and assign to a project
```

##### DNS Records

```bash
vercel dns ls                                          # list records across every domain on the scope
vercel dns ls example.com                              # list records for a single domain
vercel dns add example.com @ A 1.2.3.4
vercel dns add example.com sub CNAME target.example.com
vercel dns rm rec_abc123
```

Use `vercel <command> --help` for full flag details.

### File: `references/environment-variables.md`

#### Environment Variables

##### Scoping

Env vars are scoped to **environments**: production, preview (can be branch-specific), and development.

Variables can be plain text or sensitive (encrypted, not readable after creation).

##### Inspecting Env Vars

`vercel env ls` shows configured variable names, targets, and metadata. Plain values may appear in JSON output; sensitive values are not readable after creation.

For metadata-oriented investigations, start with:

```bash
#### Run from a linked project directory
vercel env ls --format json
vercel env ls production --format json
```

If CLI output does not include required metadata, use `vercel api` after checking available endpoints with `vercel api list`. Do not invent unsupported `env ls` scope/project flags; link or switch scope first when the command requires project context.

##### Managing Env Vars

```bash
vercel env add API_KEY production                              # interactive prompt for value
vercel env add API_KEY production --value "secret" --yes       # non-interactive
echo "secret" | vercel env add TOKEN production --yes          # pipe value from stdin
vercel env ls                                                  # list all
vercel env update API_KEY production --value "new-secret" --yes  # non-interactive update
vercel env rm API_KEY preview --yes                            # remove from preview
```

Note: `environment` is a **positional argument**, not a flag.

In non-interactive / agent mode, `env add` and `env update` require the value via `--value` or stdin. Without one of these, the command exits with an `action_required` payload asking you to re-run with `--value <value> --yes`.

##### Pulling Locally

```bash
vercel env pull                   # writes to .env.local
vercel env pull .env.development  # writes to custom file
```

The CLI adds `.env*` to `.gitignore` only when writing the default `.env.local`. Before using another filename, verify that source control excludes it.

`vercel pull` instead downloads environment data and project settings under `.vercel/`, including `.vercel/.env.<environment>.local`.

##### Running with Env Vars

Inject env vars into a subprocess without writing to a file:

```bash
vercel env run -- npm test
vercel env run -e preview -- next dev
```

The `--` separator is required before the command.

### File: `references/firewall.md`

#### Firewall

`vercel firewall` manages your project's [Web Application Firewall (WAF)](https://vercel.com/docs/vercel-firewall/vercel-waf). It provides multiple layers of protection:

- **Custom rules** — match requests by path, method, IP, geo, headers, cookies, and more, then deny, challenge, rate limit, log, bypass, or redirect them
- **IP blocks** — block specific IPs or CIDR ranges from accessing your project
- **System bypass** — exempt trusted IPs or CIDRs from all firewall checks (e.g., your office, CI servers, monitoring)
- **Attack mode** — emergency mode that challenges unverified visitors during an active attack (verified bots and crawlers are exempt)
- **System mitigations** — automatic DDoS protection that can be temporarily paused for debugging

##### Contents

- [Overview](#overview)
- [Status](#status)
- [Alerts](#alerts)
- [Persistent Actions](#persistent-actions)
- [Custom Rules](#custom-rules)
- [IP Blocks](#ip-blocks)
- [System Bypass](#system-bypass)
- [Attack Mode](#attack-mode)
- [System Mitigations](#system-mitigations)
- [Publishing](#publishing)
- [Agent Usage](#agent-usage)
- [Anti-Patterns](#anti-patterns)

##### Overview

```bash
vercel firewall overview                              # full firewall summary
vercel firewall overview --json                       # JSON output
vercel firewall diff                                  # show unpublished draft changes
vercel firewall diff --json                           # JSON diff
```

`overview` renders the configuration block described under [Status](#status) and then adds the last 24 hours beneath it: requests by action, the busiest rules, and any alerts raised in that window. The activity section needs Observability Plus and a team scope; without either, the configuration block is reported on its own.

##### Status

```bash
vercel firewall status                                # configuration in execution order
vercel firewall status --json                         # JSON, including the request pipeline
```

Reports what is configured, in the order a request meets it: bypass, system mitigations, attack mode, IP blocks, custom rules, bot protection, AI bots, then OWASP. Use it to answer "what is on, and what does a bypass skip" without also querying traffic.

`--json` adds `requestFlow`, the stages in order with what each one skips, and `bypasses`, the bypass kinds with the stages they skip. Two fields explain an absent value rather than leaving it `null`: `bypassUnavailable` when the plan does not include IP Bypass, and `owasp.requiresUpgrade` when OWASP is off because the plan cannot enable it rather than because it is disabled.

##### Alerts

```bash
vercel firewall alerts list                           # active and resolved alerts (last 24h)
vercel firewall alerts list --since 7d                # last 7 days
vercel firewall alerts list --json                    # JSON: { active, resolved }
vercel firewall alerts inspect al_abc123              # window, rates, sparkline, IPs, hosts
vercel firewall alerts inspect al_abc123 --json       # JSON detail
```

Lists DDoS and other firewall anomaly alerts from both the alerts API and legacy attack-status history. Default window matches `overview` (last 24 hours). `--since` / `--until` accept relative times (`7d`, `24h`) or ISO dates.

`inspect` takes an alert id from the list (`al_…` or the constructed legacy id). It fetches the alert first, then one traffic timeseries and one events request in parallel. Traffic and events need Observability Plus; without it the header still prints.

##### Persistent Actions

```bash
vercel firewall persistent-actions list                 # last hour
vercel firewall persistent-actions list --since 6h      # last 6 hours
vercel firewall persistent-actions list --limit 50      # more rows (default 10)
vercel firewall persistent-actions list --json          # JSON: { actions, shown, total }
vercel firewall persistent-actions inspect 51.158.168.18 --host vercel.com --action challenge
vercel firewall persistent-actions inspect 51.158.168.18 --json
```

Lists persistent WAF actions (challenge/deny against a client IP) from the last hour by default. `--since` / `--until` accept relative times (`1h`, `6h`) or ISO dates.

`inspect` takes an IP from the list. `--host` and `--action` disambiguate when the same IP appears more than once; otherwise the most recent match is shown. Traffic charts need Observability Plus; without it the header still prints.

##### Custom Rules

[Custom rules](https://vercel.com/docs/vercel-firewall/vercel-waf/custom-rules) let you define precise traffic policies based on request attributes. Use them to block abusive traffic, rate limit APIs, challenge suspicious requests, redirect legacy paths, or log traffic for monitoring.

Rule changes are staged as drafts — run `vercel firewall publish --yes` to make them live.

###### Viewing rules

```bash
vercel firewall rules list                            # table of all rules
vercel firewall rules list --expand                   # show conditions and actions
vercel firewall rules list --json                     # JSON for scripting
vercel firewall rules inspect "My Rule"               # full detail of a single rule
vercel firewall rules inspect "My Rule" --json        # JSON detail
```

###### Creating rules

Four modes (mutually exclusive):

```bash
#### AI — interactive only, blocked for agents/scripts
vercel firewall rules add --ai "Rate limit /api to 100 requests per minute by IP"

#### Interactive wizard — interactive only
vercel firewall rules add

#### Flags — works in scripts and agents
vercel firewall rules add "Block bots" \
  --condition '{"type":"user_agent","op":"sub","value":"crawler"}' \
  --action deny --yes

#### JSON — full rule payload, works in scripts and agents
vercel firewall rules add --json '{"name":"Block bots","conditionGroup":[{"conditions":[{"type":"user_agent","op":"sub","value":"crawler"}]}],"action":{"mitigate":{"action":"deny"}}}' --yes
```

###### Multiple conditions (AND) and OR groups

```bash
#### AND — multiple --condition flags in the same group
vercel firewall rules add "Secure admin" \
  --condition '{"type":"path","op":"pre","value":"/admin"}' \
  --condition '{"type":"geo_country","op":"eq","neg":true,"value":"US"}' \
  --action deny --yes

#### OR — use --or to start a new group
vercel firewall rules add "Block methods" \
  --condition '{"type":"method","op":"eq","value":"DELETE"}' \
  --or \
  --condition '{"type":"method","op":"eq","value":"PATCH"}' \
  --action challenge --yes
```

###### Editing rules

```bash
vercel firewall rules edit "My Rule"                                    # interactive editor
vercel firewall rules edit "My Rule" --ai "change action to challenge"  # AI (interactive only)
vercel firewall rules edit "My Rule" --action challenge --yes           # change action
vercel firewall rules edit "My Rule" --name "New Name" --yes            # rename
vercel firewall rules edit "My Rule" --enabled --yes                    # enable
vercel firewall rules edit "My Rule" --disabled --yes                   # disable
vercel firewall rules edit "My Rule" --condition '{"type":"path","op":"pre","value":"/new"}' --yes  # replace conditions
```

###### Managing rules

```bash
vercel firewall rules enable "My Rule"                # enable a disabled rule
vercel firewall rules disable "My Rule"               # disable without removing
vercel firewall rules remove "My Rule" --yes          # delete (aliases: rm, delete)
vercel firewall rules reorder "My Rule" --first --yes # move to highest priority
vercel firewall rules reorder "My Rule" --last --yes  # move to lowest priority
vercel firewall rules reorder "My Rule" --position 3 --yes  # move to position (1-based)
```

Rules are evaluated in priority order (top to bottom). Use `reorder` to control which rules are checked first.

###### Conditions

Each `--condition` is a JSON object:

```json
{
  "type": "path",          // condition type (required)
  "op": "pre",             // operator (required)
  "value": "/api",         // value (required for most operators, omit for ex/nex)
  "key": "Authorization",  // key (required for header, cookie, query types)
  "neg": true              // negate the condition (optional, default false)
}
```

Conditions within a group are **AND'd**. Multiple groups (separated by `--or`) are **OR'd**.

###### Operators

| Operator | Meaning | Value | Negated form |
|----------|---------|-------|--------------|
| `eq` | Equals | string | `neq` or `neg: true` |
| `sub` | Contains | string | `neg: true` |
| `pre` | Starts with | string | `neg: true` |
| `suf` | Ends with | string | `neg: true` |
| `re` | Matches regex | string | `neg: true` |
| `ex` | Exists | none | `nex` |
| `inc` | Is any of | array or comma-separated | `ninc` |
| `gt` | Greater than | number | `neg: true` |
| `gte` | Greater or equal | number | `neg: true` |
| `lt` | Less than | number | `neg: true` |
| `lte` | Less or equal | number | `neg: true` |

###### Condition types

| Type | Description | Needs `key` |
|------|-------------|-------------|
| `path` | URL path | No |
| `raw_path` | Pre-rewrite URL path | No |
| `target_path` | Post-rewrite destination path | No |
| `route` | Route pattern (e.g., /blog/[slug]) | No |
| `server_action` | Next.js Server Action name | No |
| `method` | HTTP method (GET, POST, etc.) | No |
| `host` | Request hostname | No |
| `protocol` | HTTP protocol version | No |
| `scheme` | http or https | No |
| `environment` | preview or production | No |
| `region` | Vercel edge region | No |
| `rate_limit_api_id` | Rate limit API grouping ID | No |
| `ip_address` | Client IP or CIDR range | No |
| `user_agent` | User-Agent string | No |
| `geo_country` | Country code (ISO 3166-1 alpha-2) | No |
| `geo_continent` | Continent code (AF, AN, AS, EU, NA, OC, SA) | No |
| `geo_country_region` | State or region code | No |
| `geo_city` | City name | No |
| `geo_as_number` | Autonomous System Number | No |
| `header` | HTTP request header | **Yes** |
| `cookie` | HTTP cookie | **Yes** |
| `query` | URL query parameter | **Yes** |
| `ja4_digest` | JA4 TLS fingerprint | No |
| `ja3_digest` | JA3 TLS fingerprint — legacy, prefer ja4 (Enterprise teams only) | No |
| `bot_name` | Verified bot name (Security Plus projects only) | No |
| `bot_category` | Verified bot category (Security Plus projects only) | No |

###### Actions

| Action | Description | Extra flags |
|--------|-------------|-------------|
| `deny` | Block request (403) | `--duration` |
| `challenge` | Show verification page | `--duration` |
| `log` | Log without blocking | `--duration` |
| `bypass` | Skip other rules | `--duration` |
| `rate_limit` | Throttle requests | `--rate-limit-window`, `--rate-limit-requests`, `--rate-limit-keys`, `--rate-limit-algo`, `--rate-limit-action`, `--duration` |
| `redirect` | Redirect to URL | `--redirect-url`, `--redirect-permanent` |

**Durations (Pro/Enterprise only):** `1m`, `5m`, `15m`, `30m`, `1h` — makes the action persistent for the matched client. A `deny` with `--duration 30m` blocks the client for 30 minutes. A `challenge` with `--duration 30m` challenges once and grants a 30-minute pass. Without a duration, the action is evaluated per-request.

###### Rate limit example

```bash
vercel firewall rules add "Rate limit API" \
  --condition '{"type":"path","op":"pre","value":"/api"}' \
  --action rate_limit \
  --rate-limit-window 60 \
  --rate-limit-requests 100 \
  --rate-limit-keys ip \
  --rate-limit-action deny \
  --yes
```

- `--rate-limit-window` — time window in seconds (10–3600)
- `--rate-limit-requests` — max requests per window (1–10,000,000)
- `--rate-limit-keys` — what to count by: `ip` (default), `ja4`. `header:<name>` is Enterprise only (repeatable)
- `--rate-limit-algo` — algorithm: `fixed_window` (default), `token_bucket` (Enterprise only)
- `--rate-limit-action` — what happens when a client exceeds the limit: `rate_limit` returns 429 (default), `deny` returns 403, `challenge` shows verification page, `log` logs without blocking

###### Redirect example

```bash
vercel firewall rules add "Redirect old path" \
  --condition '{"type":"path","op":"eq","value":"/old"}' \
  --action redirect \
  --redirect-url "/new" \
  --redirect-permanent \
  --yes
```

- `--redirect-url` — destination URL or path (must start with `/`, `http://`, or `https://`)
- `--redirect-permanent` — permanent redirect (301). Default: temporary (307)

###### JSON rule schema

For `--json` mode, the full rule structure:

```json
{
  "name": "Rule name (max 160 chars)",
  "description": "Optional description (max 256 chars)",
  "active": true,
  "conditionGroup": [
    {
      "conditions": [
        { "type": "path", "op": "pre", "value": "/api" },
        { "type": "method", "op": "inc", "value": ["POST", "PUT"] }
      ]
    },
    {
      "conditions": [
        { "type": "ip_address", "op": "eq", "value": "1.2.3.4" }
      ]
    }
  ],
  "action": {
    "mitigate": {
      "action": "rate_limit",
      "actionDuration": "1h",
      "rateLimit": {
        "algo": "fixed_window",
        "window": 60,
        "limit": 100,
        "keys": ["ip"],
        "action": "rate_limit"
      },
      "redirect": null
    }
  }
}
```

##### IP Blocks

[IP blocking](https://vercel.com/docs/vercel-firewall/vercel-waf/ip-blocking) lets you block specific IP addresses or CIDR ranges from accessing your project entirely. Use for known malicious IPs, abuse sources, or to restrict access to specific networks.

IP block changes are staged as drafts — run `vercel firewall publish --yes` to make them live.

```bash
vercel firewall ip-blocks list                                          # list all blocked IPs
vercel firewall ip-blocks list --json                                   # JSON output
vercel firewall ip-blocks block 1.2.3.4 --yes                          # block an IP on all hosts
vercel firewall ip-blocks block 10.0.0.0/24 --hostname example.com --yes  # block CIDR on specific host
vercel firewall ip-blocks block 1.2.3.4 --notes "Abuse report #123" --yes  # block with a note
vercel firewall ip-blocks unblock 1.2.3.4 --yes                        # unblock by IP
vercel firewall ip-blocks unblock 1.2.3.4 --hostname example.com --yes # unblock scoped to hostname (when same IP blocked on multiple hosts)
vercel firewall ip-blocks unblock ip_abc123 --yes                      # unblock by rule ID
```

##### System Bypass

[System bypass rules](https://vercel.com/docs/vercel-firewall/vercel-waf/system-bypass-rules) exempt trusted IPs or CIDR ranges from all firewall checks. Use for your office IP, CI/CD servers, uptime monitors, or other trusted infrastructure that should never be blocked. Supports wildcard domains.

Takes effect immediately — no publishing required.

```bash
vercel firewall system-bypass list                                      # list all bypass rules
vercel firewall system-bypass list --json                               # JSON output
vercel firewall system-bypass add 10.0.0.1 --yes                       # bypass for an IP
vercel firewall system-bypass add 10.0.0.0/24 --yes                    # bypass for a CIDR range
vercel firewall system-bypass add 10.0.0.1 --domain example.com --yes  # bypass scoped to a domain
vercel firewall system-bypass add 10.0.0.1 --domain "*.example.com" --yes  # bypass with wildcard domain
vercel firewall system-bypass add 10.0.0.1 --notes "Office IP" --yes   # bypass with a note
vercel firewall system-bypass remove 10.0.0.1 --yes                    # remove bypass
```

##### Attack Mode

[Attack Challenge Mode](https://vercel.com/docs/vercel-firewall/attack-challenge-mode) is an emergency response for active attacks. When enabled, unverified visitors see a verification challenge page before accessing your site. Verified bots and search crawlers are exempt. Use when you're under a DDoS attack or experiencing a surge of malicious traffic.

Takes effect immediately — no publishing required. **Requires interactive confirmation — blocked for agents/scripts due to the severity of enabling this.**

```bash
vercel firewall attack-mode enable --duration 1h --yes   # challenge all visitors for 1 hour
vercel firewall attack-mode enable --duration 6h --yes   # for 6 hours
vercel firewall attack-mode enable --duration 24h --yes  # for 24 hours
vercel firewall attack-mode disable --yes                # stop challenging visitors
```

##### System Mitigations

Vercel automatically [mitigates DDoS attacks](https://vercel.com/docs/vercel-firewall/ddos-mitigation) and filters malicious traffic. In rare cases (debugging false positives, testing), you may need to temporarily pause these protections.

Takes effect immediately — no publishing required. Automatically resumes after 24 hours. **Requires interactive confirmation — blocked for agents/scripts due to the severity of pausing DDoS protection.**

```bash
vercel firewall system-mitigations pause --yes           # pause DDoS protection (24h)
vercel firewall system-mitigations resume --yes          # resume DDoS protection
```

##### Publishing

Rule and IP block changes are staged as drafts. Use `diff` to review, then `publish` or `discard`.

```bash
vercel firewall diff                                  # review staged changes
vercel firewall publish --yes                         # push all draft changes to production
vercel firewall discard --yes                         # throw away all draft changes
```

##### Agent Usage

- **Pass `--yes`** for commands that prompt for confirmation (rule/IP block mutations, publish, discard)
- **Publish after staging rules/IP blocks**: `vercel firewall publish --yes`
- **Use `--json` for structured output**: `vercel firewall rules list --json`, `vercel firewall alerts list --json`, `vercel firewall persistent-actions list --json`
- Project must be linked first (`vercel link`)

##### Anti-Patterns

- **Forgetting `--yes`** — non-interactive commands fail without it
- **Not publishing** — rule and IP block changes stay as drafts until `vercel firewall publish --yes`
- **Using `--ai` for custom rules in scripts/agents** — blocked; use `--json` or `--condition` flags instead
- **Broad deny rules** — a deny rule with a loose condition (e.g., path starts with `/`) will block all traffic. Review with `vercel firewall rules inspect` before publishing

### File: `references/flags.md`

#### Feature Flags

`vercel flags` manages [Vercel Flags](https://vercel.com/docs/flags/vercel-flags) for the linked project.

`--help` is the source of truth for options and examples. Run `vercel flags --help` for the current subcommand list and `vercel flags <cmd> --help` before using a subcommand. The map below routes by task and carries no options on purpose.

##### Subcommand Map

```bash
#### Read
vercel flags list                 # flags in the project (alias: ls)
vercel flags inspect <flag>       # kind, variants, what each environment serves
vercel flags versions <flag>      # revision history (subcommands: list, diff)
vercel flags evaluations <flag>   # evaluation metrics

#### Change what an environment serves
vercel flags set <flag>           # serve one variant (all kinds)
vercel flags enable <flag>        # boolean shortcut for true
vercel flags disable <flag>       # boolean shortcut for false
vercel flags use-targeting <flag> # enable targeting for an environment

#### Targeting
vercel flags split <flag>         # weighted traffic split across variants
vercel flags rollout <flag>       # staged rollout from one variant to another
vercel flags rules <flag>         # targeting rules (subcommands: list, add, update, remove, move)
vercel flags segments             # reusable audience segments (subcommands: list, inspect, create, update, remove)

#### Lifecycle
vercel flags create <flag>        # new flag (alias: add)
vercel flags update <flag>        # variant values and labels
vercel flags archive <flag>       # required before rm
vercel flags unarchive <flag>
vercel flags rm <flag>            # delete an archived flag (alias of remove)

#### Tooling
vercel flags sdk-keys             # SDK keys (subcommands: list, add, remove)
vercel flags prepare              # flag definition fallbacks for builds outside Vercel
vercel flags override             # encrypt or decrypt a vercel-flag-overrides cookie token
vercel flags open [flag]          # open the dashboard
```

##### CLI Contracts

- Flags commands need a linked project. Confirm the target with `vercel project inspect --non-interactive` first (see `SKILL.md`).
- Use `--json` where a subcommand offers it and parse only stdout.
- Commands that ask for confirmation (`archive`, `unarchive`, `rm`, `sdk-keys rm`, and others that list `--yes` in `--help`) need `--yes` in non-interactive runs.

##### Flags SDK Skill

Everything flags-specific lives in the `flags-sdk` skill (`npx skills add vercel/flags@flags-sdk`): declaring flags with `flag()` and `vercelAdapter`, matching a CLI flag key to the `key` in code, `identify()` entities and the `--by` / `--condition` attribute contract, adopting a flag that already exists (`inspect` first), lifecycle and production safety, `FLAGS` / `FLAGS_SECRET`, `prepare`, and `override`. Use that skill for those topics; this reference does not repeat them.

### File: `references/getting-started.md`

#### Getting Started

##### Install

```bash
npm i -g vercel
```

##### First-Time Setup

1. **Authenticate** - `vercel login` opens a browser/device flow. For CI, use the `VERCEL_TOKEN` environment variable instead. Wait for deliberate user completion when a browser flow starts.
2. **Link your project** - `vercel link` for a working-directory project or `vercel link --repo` for repository directory mappings. Both create files under `.vercel/`.
3. **Verify the target** - from the intended working directory, run `vercel project inspect --non-interactive` and confirm its owner and project. Stop on `link_required` or a mismatch rather than linking automatically. `vercel whoami --format json` identifies the authenticated user and effective team, not the linked project.
4. **Pull local data** - `vercel pull` writes project settings and environment data under `.vercel/`, including `.vercel/.env.<environment>.local`. Use `vercel env pull` to write `.env.local` or another file that is already excluded from source control.
5. **Dev or deploy** - `vercel dev` starts a local server; `vercel --prod` deploys to production.

##### Project Linking

Project resolution starts from the command's working directory:

- **`<cwd>/.vercel/project.json`**: This exact working-directory link takes precedence. A root single-project link is not generally inherited by arbitrary subdirectories.
- **`<repo-root>/.vercel/repo.json`**: The deepest configured directory containing the working directory wins.
- **No matching repo directory**: Interactive repo resolution prompts. Non-interactive repo resolution currently selects the sole configured repo project or remains unresolved when multiple projects exist. Commands that set up projects may then enter a linking flow.

An app subdirectory only identifies a project when the repo mapping covers it. Verify the result with `vercel project inspect --non-interactive` before operating on the project.

Read-only inspection can trigger login or team SAML re-authentication, open a browser/device flow, and wait for approval. Ask the user to complete the flow before retrying or continuing.

### File: `references/global-options.md`

#### Global Options

Key flags available on every `vercel` command:

- `--help` / `-h` — show help for the command
- `--debug` / `-d` — enable debug output
- `--cwd DIR` — override working directory
- `--scope SCOPE` — set team context
- `--team SLUG` — deprecated alias for `--scope`; avoid in new commands
- `--token TOKEN` — auth token (prefer `VERCEL_TOKEN` env var instead)
- `--api URL` — override the API base URL (defaults to the public Vercel API)
- `--non-interactive` — suppress interactive prompts (auto-set when an agent is detected and stdin is not a TTY)

`--yes` / `-y` is **not** a global flag. It is declared per command on the subset that confirm mutations (`env rm`, `domains rm`, `blob delete-store`, `routes delete`, etc.). Always check the command's help to see whether `--yes` is accepted.

`--non-interactive` is auto-set only when an agent is detected and stdin is not a TTY. Plain CI without agent detection does **not** get this default; pass `--non-interactive` explicitly when scripting. Use `--non-interactive=false` to override the agent default.

Even with `--non-interactive`, commands that perform a confirmed mutation still require `--yes` separately.

For machine-readable output, prefer `--format json` where a command documents it; the boolean `--json` is deprecated on commands that also support `--format`.

Prefer `VERCEL_TOKEN` env var over `--token` to avoid leaking secrets in shell history.

### File: `references/integrations.md`

#### Integrations

##### What Are Integrations?

Integrations are third-party services provisioned through the Vercel Marketplace and automatically connected to your project via environment variables. Categories include: AI, Agents, Analytics, Authentication, CMS, Code Review, Code Security, Commerce, DevTools, Experimentation, Flags, Logging, Messaging, Monitoring, Observability, Payments, Productivity, Searching, Security, Storage, Support Agent, Testing, Video, Web Automation, and Workflow.

##### When to Recommend an Integration

- **The project needs a database** — Postgres, MySQL, Redis, etc. → `vercel integration add`
- **The project needs a KV store, blob storage, or other managed service** → `vercel integration add`
- **The user is manually setting env vars for a third-party service that's available on the Marketplace** — an integration handles provisioning and env var injection automatically
- **The user wants to add observability, logging, or error tracking** → check the Marketplace

The key benefit: integrations automatically provision the resource AND inject the right environment variables into your project. No manual env var setup needed.

**When in doubt about flags or subcommands, use `--help`:**

```bash
vercel integration -h                              # list subcommands
vercel integration add -h                          # flags for add
vercel ir -h                                       # integration-resource subcommands
```

##### Discovering Integrations

The Marketplace organizes integrations by category. For category-shaped user intent ("monitoring", "storage", "commerce", "ai"), prefer `--category <slug>` over substring search — it returns the canonical set rather than relying on description text matching.

```bash
#### Step 1: list valid category slugs
vercel integration categories                          # slugs + titles
vercel integration categories --json                   # machine-readable

#### Step 2: filter discover by category
vercel integration discover --category storage
vercel integration discover --category monitoring
vercel integration discover -c ai                      # shorthand
vercel integration discover <query> --category <slug>  # combine substring + filter

#### Specific integration by name (substring across slug/name/description)
vercel integration discover postgres
vercel integration discover sentry

#### Full catalog (rare — usually narrow first)
vercel integration discover
vercel integration discover --format=json
```

**Rule:** when the user describes a category-shaped need ("I need a database", "set up monitoring", "build me a store"), run `vercel integration categories` first to get the canonical slug, then `discover --category <slug>`. This is more accurate than substring search, which misses integrations whose description doesn't contain the exact keyword (e.g., "monitoring" search misses an integration described as "Observability").

##### Accepting Terms (Install Without a Resource)

Some integrations require accepting marketplace legal terms before the team can install them. `accept-terms` installs the integration at the account/team scope without provisioning a product resource. Requires an interactive terminal and human confirmation.

```bash
vercel integration accept-terms <integration>
vercel integration accept-terms neon
vercel integration accept-terms neon --format=json
```

##### Listing Installations

`installations` lists every marketplace integration installation on the team (account scope). Useful for finding installation/configuration IDs needed by `update` and `add --installation-id`.

```bash
vercel integration installations                          # all installations on the team
vercel integration installations --integration neon       # filter by integration slug
vercel integration installations --format json            # JSON output
```

##### Adding an Integration

```bash
vercel integration add <slug>                      # install and provision
vercel integration add <slug>/<product>            # specific product (multi-product integrations)
vercel integration add <slug> --name my-db         # custom resource name
```

The CLI prompts for product selection when multiple products exist and no `/<product>` slug is given (errors in non-TTY — specify the product slug). Billing plan uses `--plan` or server default (no prompt). Metadata uses `-m` flags or server defaults (no prompt). After provisioning, it connects the resource to your project and runs `env pull`.

`vercel install <slug>` (or `vercel i <slug>`) is an alias — behaves identically.

**Browser fallback:** The CLI may open a browser in two cases: (1) first-time install requiring terms acceptance — the CLI polls and resumes automatically once the user accepts, so do not kill the process; and (2) non-provisionable integrations — the CLI exits with code 1, inform the user they need to finish in the browser.

###### Environments

```bash
vercel integration add <slug> -e production            # specific environment
vercel integration add <slug> -e production -e preview # multiple (repeatable)
```

Defaults to all environments (production, preview, development).

###### Metadata

Some integrations require configuration during provisioning (e.g., region, database version):

```bash
vercel integration add <slug> -m region=us-east-1
vercel integration add <slug> -m region=us-east-1 -m version=16
```

###### Plans

```bash
vercel integration add <slug> --plan <plan-id>         # specific billing plan
vercel integration add <slug> -p <plan-id>             # shorthand
```

###### Other Flags

```bash
vercel integration add <slug> --no-connect             # skip connecting to project (also skips env pull)
vercel integration add <slug> --no-env-pull            # skip env pull only
vercel integration add <slug> --prefix NEON2_          # prefix env var names (e.g., NEON2_DATABASE_URL)
vercel integration add <slug> --installation-id <id>   # use specific installation (multi-installation)
vercel integration add <slug> --format=json            # output as JSON
```

##### Listing Resources

Alias: `vercel integration ls`

```bash
vercel integration list                                # resources for linked project
vercel integration list --all                          # all resources across the team
vercel integration list -i <slug>                      # filter by integration
vercel integration list <project>                      # resources for a specific project
vercel integration list --format=json                  # as JSON
```

##### Opening Dashboards

```bash
vercel integration open <integration>                  # open integration dashboard (SSO)
vercel integration open <integration> <resource>       # open specific resource dashboard
vercel integration open <integration> --format=json    # get SSO link as JSON
```

##### Disconnecting

Use `vercel integration-resource` (alias: `vercel ir`):

```bash
vercel ir disconnect <resource>                        # disconnect from current project
vercel ir disconnect <resource> <project>              # disconnect from specific project
vercel ir disconnect <resource> --all                  # disconnect from all projects
vercel ir disconnect <resource> --yes                  # skip confirmation
```

Disconnecting removes environment variables from the project but does not delete the resource.

**Note:** `--format=json` requires `--yes` on destructive commands (`ir disconnect`, `ir remove`, `integration remove`) — the CLI rejects JSON output with interactive prompts.

##### Billing

Only applies to integrations with prepayment-type billing plans. Returns "no balance info available" for integrations without prepayment billing.

```bash
vercel integration balance <slug>                      # show balance and thresholds
vercel integration balance <slug> --format=json        # as JSON
vercel ir create-threshold <resource> <minimum> <spend> <limit>
vercel ir create-threshold <resource> <minimum> <spend> <limit> --yes  # skip confirmation
```

Threshold parameters (dollar amounts, e.g., `50 100 500`):
- **minimum** — balance floor; auto-replenish triggers when balance drops below this
- **spend** — replenishment amount added when minimum is hit
- **limit** — hard spending cap

Works for both resource-level and installation-level thresholds (CLI auto-detects).

##### Guides

```bash
vercel integration guide <slug>                        # show setup guide
vercel integration guide <slug> --framework nextjs     # framework-specific (-f shorthand)
vercel integration guide <slug>/<product>              # specific product
```

After installing, pull credentials to `.env.local`:

```bash
vercel env pull                                        # pulls to .env.local
```

This runs automatically after `vercel integration add` (unless `--no-env-pull`).

##### Updating an Installation

`update` changes the billing plan or which projects can access an installation. Install / remove / connect flows live elsewhere (`integration add`, `integration remove`, `integration-resource ...`).

```bash
vercel integration update <integration> --projects all                                  # grant all team projects access
vercel integration update neon --projects prj_abc --projects prj_def                    # limit to specific projects
vercel integration update acme --plan pro                                               # change billing plan
vercel integration update neon --installation-id icfg_xxx --projects all                # select an installation when several exist
vercel integration update acme --plan pro --authorization-id auth_xxx                   # provide billing authorization
vercel integration update neon --projects all --format=json                             # JSON output
vercel integration update neon --projects all --non-interactive                         # JSON-on-stdout success/error
```

Use `vercel integration installations` to find the right `--installation-id` when multiple marketplace installations exist for the same integration.

##### Removing Resources

Alias: `vercel ir rm`

```bash
vercel ir remove <resource>                            # delete (must not be connected)
vercel ir remove <resource> --disconnect-all           # disconnect all projects, then delete
vercel ir remove <resource> --disconnect-all --yes     # skip confirmation
```

**This permanently deletes the resource from the provider. Cannot be undone.**

##### Uninstalling an Integration

```bash
vercel integration remove <slug>                       # uninstall (all resources must be deleted first)
vercel integration remove <slug> --yes                 # skip confirmation
```

###### Cleanup Workflow

```bash
vercel integration list --all -i <slug>                # find all resources
vercel ir remove <resource-1> --disconnect-all --yes   # delete each resource
vercel ir remove <resource-2> --disconnect-all --yes
vercel integration remove <slug> --yes                 # then uninstall
```

### File: `references/local-development.md`

#### Local Development

##### Prerequisites

1. **Link your project** - use `vercel link` for the current directory or `vercel link --repo` for repository directory mappings.
2. **Verify the target** - run `vercel project inspect --non-interactive` from the directory where you will run development commands and confirm the reported owner and project. Stop on `link_required` or a mismatch rather than linking automatically. `vercel whoami --format json` reports authentication and team context, not the project.
3. **Pull local data** - use `vercel pull` for project settings and environment data under `.vercel/`, or `vercel env pull` for `.env.local` or another file that is already excluded from source control.

Inspection and pull commands can trigger login or team SAML re-authentication. If a browser/device flow opens, wait for the user to complete it deliberately.

##### Usage

```bash
vercel dev                           # default: 0.0.0.0:3000
vercel dev --listen 8080             # custom port
vercel dev --listen 127.0.0.1:5000   # custom host and port
```

##### Related Commands

- `vercel link` - connect the current directory to a Vercel project. Use `--repo` for repository directory mappings.
- `vercel project inspect --non-interactive` - report the resolved existing project's owner and settings without entering a linking flow.
- `vercel pull` - download project settings and environment data to `.vercel/`, including `.vercel/.env.<environment>.local`.
- `vercel env pull` - download environment variables to `.env.local` or another ignored file, not project settings.
- `vercel init` - scaffold a new project from a Vercel example.
- `vercel open` - open the Vercel dashboard for the linked project.

With `repo.json`, the deepest configured directory containing the working directory wins. If no mapping matches, interactive repo resolution prompts; non-interactive repo resolution currently selects the sole configured project or remains unresolved when multiple projects exist. Commands that set up projects may then enter a linking flow, so do not infer the target from the app directory alone.

### File: `references/microfrontends.md`

#### Microfrontends

Split a large application into independently deployable units that render as one cohesive app. The default app hosts `microfrontends.json` and serves unmatched requests; child apps declare `routing` path patterns.

##### Quick Start

```bash
vercel mf create-group    # create a group and add projects
vercel mf pull            # pull microfrontends.json for local dev
vercel mf proxy           # start the local dev proxy
```

##### Managing Groups

###### Create

```bash
vercel microfrontends create-group                   # interactive
vercel mf create-group --non-interactive \           # fully scripted
  --name "my-group" \
  --project web \
  --project docs \                                   # repeatable
  --default-app web \
  --default-route / \
  --project-default-route docs=/docs \               # required per non-default project
  --yes                                              # skip confirmation
```

> `--non-interactive` is blocked when adding projects would exceed the free tier limit — the user must confirm billing changes interactively.

###### Inspect

Returns project names, frameworks, git repos, and root directories. Useful for automating `microfrontends.json` generation.

```bash
vercel mf inspect-group                              # interactive group selection
vercel mf inspect-group --group="my-group"           # specific group
vercel mf inspect-group --group="my-group" --format=json  # machine-readable
```

###### Add / Remove Projects

Run from the project directory.

```bash
vercel mf add-to-group                               # interactive
vercel mf add-to-group --group="my-group" --default-route=/docs

vercel mf remove-from-group                          # interactive
vercel mf remove-from-group --yes                    # non-interactive: skips all confirmations
```

`add-to-group` requires an interactive terminal. `remove-from-group` runs non-interactively when `--yes` is passed; `--yes` skips the project-link prompt, the "still referenced in microfrontends.json" confirmation, and the final removal confirmation.

After removing, update `microfrontends.json` in the default app to remove the project's entry. **The default app cannot be removed via the CLI** — change the default app in the Vercel Dashboard first, then `remove-from-group` works on the formerly-default project.

###### Delete Group

Irreversible. All projects are removed from the group automatically.

```bash
vercel mf delete-group                               # interactive
vercel mf delete-group --group="my-group" --yes      # non-interactive
```

##### `pull`

Downloads `microfrontends.json` from the default application. Required in polyrepo setups. Requires CLI 44.2.2+.

```bash
vercel microfrontends pull
vercel mf pull --dpl <deployment-url>
```

##### Local Development

The local proxy routes requests to running apps and falls back to production for others. Default port: `3024`.

###### Monorepo (Turborepo)

The proxy starts automatically via `turbo` (requires turbo ≥ 2.3.6 or ≥ 2.4.2):

```bash
turbo run dev --filter=web
```

###### Without Turborepo

```json
{
  "scripts": {
    "dev": "next dev --port $(microfrontends port)",
    "proxy": "microfrontends proxy microfrontends.json --local-apps web"
  }
}
```

Run both scripts simultaneously.

###### Polyrepo

```bash
vercel mf pull                                       # fetch microfrontends.json
next dev --port $(microfrontends port)               # start your app
microfrontends proxy --local-apps your-app-name      # start proxy
```

Alternatively, set `VC_MICROFRONTENDS_CONFIG=/path/to/microfrontends.json` instead of pulling.

###### `microfrontends proxy`

```bash
microfrontends proxy [configPath] --local-apps web docs   # multiple local apps
microfrontends proxy --port 4001                          # override port
```

###### `microfrontends port`

Prints the auto-assigned dev port for the current app (deterministic, based on app name):

```bash
next dev --port $(microfrontends port)
```

##### Deployment

Each app deploys independently. Routing is controlled by `microfrontends.json` deployed with the default app — config changes only take effect once the default app is deployed to production.

##### Anti-Patterns

- **Using `--non-interactive` when billing limits are exceeded**: The CLI blocks this — run interactively instead.
- **Skipping `vercel mf pull` in polyrepo**: Without `microfrontends.json` locally, the proxy can't route correctly.
- **Forgetting to update `microfrontends.json` after `remove-from-group`**: Leaving the entry causes routing errors on the next default app deployment.
- **Running `add-to-group` in CI**: It requires an interactive terminal — use the Vercel Dashboard instead. `remove-from-group` and `delete-group` both accept `--yes` and can run non-interactively.
- **Trying to remove the default app**: The CLI refuses. Change the default app in the Vercel Dashboard, then remove the formerly-default project.
- **Deploying only the child app after config changes**: Changes to `microfrontends.json` only take effect when the default app is deployed.

### File: `references/monitoring-and-debugging.md`

#### Monitoring & Debugging

##### Diagnostic Ladder

For production issues, start broad and narrow with bounded commands:

1. Identify project and scope.
2. List recent deployments: `vercel list <project> --scope <team> --status READY --format json`.
3. Inspect the relevant deployment: `vercel inspect <deployment-url>`.
4. Check logs for a bounded window: `vercel logs --deployment <deployment-url> --since 1h --limit 100 --json`.
5. If metrics are available, inspect schema first, then query a relevant metric with a bounded time window and group-by.
6. If logs or metrics are unavailable, report the permission, subscription, retention, or no-data limitation and use deployments, activity, or inspect output as fallback evidence.

##### Build Failure Ladder

For deployment build failures, start from deployment evidence before source
control exploration:

1. Inspect deployment metadata: project, team/scope, branch, commit, target,
   status, timestamp, and aliases.
2. Inspect build logs with `vercel inspect <deployment-url> --logs`.
3. Capture install command, package manager version, build command,
   monorepo/Turbo scope, restored build cache ID, and the first fatal error.
4. Reduce the first fatal error before chasing warnings.
5. If source is implicated, inspect only the app/package files, lockfile, build
   config, and files named in the trace.
6. Compare with a nearby successful deployment of the same project: commit,
   cache ID, install command, package manager version, build command, package
   scope, and source provenance.
7. Separate proven root cause from likely trigger.

For branch-specific failures, "other branches pass" does not by itself disprove
the root cause. Compare cache IDs, install graphs, lockfile/package diffs, build
command, package scope, and source provenance before explaining why one branch
fails.

Use confidence language in conclusions:

- Logs prove `<root cause>`.
- Branch comparison shows `<facts>`.
- Likely trigger is `<hypothesis>`.
- Not yet proven is `<remaining uncertainty>`.
- Validate by `<specific redeploy/test/check>`.

Useful discovery commands:

```bash
vercel logs --help
vercel metrics --help
vercel metrics schema --format=json
vercel metrics schema <metric-or-prefix> --format=json
vercel activity --help
vercel activity types --format json --scope <team>
vercel usage --help
vercel httpstat /api/health --deployment <deployment-url>
```

##### Logs

`vercel logs` reads runtime log entries by default; `vercel logs requests` reads CDN request records (status, method, cache result, path) and excludes background function executions. Each run returns a bounded result and exits: by default the latest 100 records from the last 30 minutes, newest first.

```bash
vercel logs                                                         # recent runtime logs for the linked project
vercel logs --deployment <deployment-url>                           # one deployment
vercel logs --environment production --query 'level:error'          # production errors
vercel logs --query 'level:(error OR warning) AND timeout' --since 2h
vercel logs --query 'requestId:"<request-id>"' --json               # what one request logged
vercel logs requests --query 'httpStatus >= 500 AND httpStatus < 600' --since 1h
vercel logs requests --query 'requestPath:*checkout* AND cacheResult:MISS'
vercel logs --next <cursor>                                         # continue a previous query
```

Filter with `--query` (KQL-inspired: `field:value`, `field:(a OR b)`, `field != value`, `field:*text*`, `AND`/`OR`/`NOT`, and numeric comparisons for requests). `vercel logs runtime --help` and `vercel logs requests --help` list the common fields. The `--level`, `--source`, `--status-code`, `--request-id`, and `--search` flags were removed; express them as query fields. `--branch` and `--expand` were dropped without a replacement; full messages are shown by default. Select a deployment with `--deployment`, not a positional argument. Without `--deployment` or `--environment`, logs cover every environment of the project. Only team-owned projects are supported. Older CLI versions use different flags; check `vercel logs --help` first.

Set `--since` and `--until` to the affected window.

With `--json` (implied by `--non-interactive` and in agents), output is JSON Lines: one `{"type":"log"|"request","data":{...}}` line per record, optional `warning` lines, and a final `summary` line with `recordsReturned`, `timeRange`, `pagination: { hasMore, next }`, and `excludedIntervals`. Read fields under `.data`, for example `jq 'select(.type == "log") | .data.message'`. Before concluding that something did not happen, check `pagination.hasMore` and `excludedIntervals`. To read more, pass `pagination.next` to `--next` rather than raising `--limit` or widening the window; the cursor keeps the original target, filter, and window, and only `--limit` can change.

CDN request history beyond the plan's free window, and filters on fields that need Observability Plus or a Priority project, fail with an access error that names the requirement. Report that as an entitlement limit, not as missing traffic.

##### Metrics

Inspect schema before querying unfamiliar metrics. Use bounded time windows and group limits when grouping results.

```bash
vercel metrics schema                                                    # list available metrics
vercel metrics schema vercel.function_invocation                         # inspect a metric prefix
vercel metrics vercel.function_invocation.count --since 1h               # query linked project
vercel metrics vercel.function_invocation.count -f "http_status ge 500" --group-by error_code --since 1h --format=json
vercel metrics vercel.function_invocation.request_duration_ms -a avg --group-by route --since 1h
vercel metrics --all vercel.function_invocation.count --group-by project_id --since 24h
```

##### Inspecting Deployments

```bash
vercel inspect <url>               # deployment details
vercel inspect <url> --wait        # wait for completion
vercel inspect <url> --logs        # show build logs
```

If a redeploy is meant to validate a build-cache or branch-specific hypothesis,
inspect or wait until the new deployment reaches `Ready` or `Error`; do not stop
at `Building` unless the user only asked to start the deployment.

##### `vercel curl` — Access Preview Deployments

Use the existing authorized Vercel CLI session to read the exact preview deployment after confirming project and environment access. Keep deployment protection in effect.

```bash
vercel curl /api/health --deployment $PREVIEW_URL
vercel curl /api/data --deployment $PREVIEW_URL -- -X POST -d '{"key":"value"}'
```

**Do not disable deployment protection.** Use `vercel curl` instead.

##### Finding Regressions

`vercel bisect` performs a binary search across deployments to find which one introduced a problem:

```bash
vercel bisect --good <url> --bad <url> --path /api/users
vercel bisect --run ./test-script.sh    # automated testing
```

##### Cache

```bash
vercel cache purge --type cdn --yes      # purge CDN cache
vercel cache invalidate --tag mytag --yes # invalidate by cache tag
```

See `references/project-infra.md` for destructive cache deletion and other project infrastructure commands.

### File: `references/monorepos.md`

#### Monorepos on Vercel

Vercel auto-detects monorepo tools (Turborepo, Nx) and workspace managers (pnpm, Yarn, npm). Each project in the monorepo gets its own Vercel project, linked via `vercel link --repo`.

##### Quick Start

```bash
vercel link --repo    # link the whole repo
vercel project inspect --non-interactive # verify the selected owner and project
vercel pull                             # pull settings and env data into .vercel/
vc dev                                  # local development
vercel deploy                           # deploy
```

##### Linking

Use `vercel link --repo` to create `.vercel/repo.json`, which maps directories to Vercel projects:

```json
{
  "orgId": "org_xxxxx",
  "projects": [
    { "id": "prj_xxxxx", "name": "web", "directory": "apps/web" },
    { "id": "prj_yyyyy", "name": "api", "directory": "apps/api" }
  ]
}
```

The deepest configured directory containing the working directory wins. If no mapping matches, interactive repo resolution prompts among the configured projects; non-interactive repo resolution currently selects the sole configured project or remains unresolved when multiple choices exist. Commands that set up projects may then enter a linking flow. Being inside an app directory does not by itself verify the target, so run `vercel project inspect --non-interactive` and stop on `link_required` or a mismatch before consequential commands.

##### Root Directory

Set `rootDirectory` in `vercel.json` when your app isn't at the repo root:

```json
{
  "rootDirectory": "apps/api"
}
```

##### Turborepo

Turborepo requires an explicit `build` task. Define it in `turbo.json`:

```json
{
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "env": ["VERCEL"],
      "outputs": [".next/**", "!.next/cache/**", ".vercel/output/**", "dist/**"]
    }
  }
}
```

Vercel automatically generates the right build command — you don't need to configure it. If you need a manual override in `vercel.json`:

```json
{
  "buildCommand": "turbo run build --filter={packages/my-app}..."
}
```

###### turbo-ignore

Vercel auto-sets `npx turbo-ignore` as the "Ignored Build Step" command, which skips builds when a project's dependencies haven't changed.

##### Nx

Nx requires a build target. Define it in `nx.json`:

```json
{
  "targetDefaults": {
    "build": {
      "dependsOn": ["^build"]
    }
  }
}
```

##### Example: Turborepo + pnpm + Hono

```
root/
├── turbo.json
├── package.json
├── pnpm-workspace.yaml
├── vercel.json
├── apps/
│   └── api/
│       ├── package.json
│       └── server.ts
└── packages/
    └── shared/
        ├── package.json
        └── src/index.ts
```

**pnpm-workspace.yaml:**

```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

**vercel.json:**

```json
{
  "rootDirectory": "apps/api"
}
```

**apps/api/server.ts:**

```typescript
import { Hono } from 'hono';
import { greet } from '@repo/shared';

const app = new Hono();
app.get('/', c => c.text(greet('world')));

export default app;
```

##### Anti-Patterns

- **Using `vercel link` instead of `vercel link --repo`**: Creates `project.json` which only tracks one project. Use `--repo` for monorepos.
- **Missing `build` task in turbo.json/nx.json**: Vercel requires an explicit build task. Without it, the build fails.
- **Adding a `build` script to package.json for transpilation**: Vercel handles TypeScript compilation. The turbo.json `build` task is for orchestration, not transpilation.
- **Assuming an app directory proves project context**: Verify the resolved owner and project with `vercel project inspect --non-interactive`. `vercel whoami --format json` reports authentication and team context, not the linked project.

### File: `references/node-backends.md`

#### Node Backends on Vercel

Vercel supports Node.js backend frameworks as first-class apps. Express and Hono are the most common, but Fastify, Elysia, NestJS, H3, and Koa are also supported. Your app is the entrypoint — not the `api/` folder. No rewrites, no build scripts. Just export your app and deploy.

##### Quick Start

```bash
#### Express
npm init -y && npm i express
#### Create server.ts that exports default app
vc dev       # local development
vc deploy    # deploy
```

##### How It Works

1. Vercel detects the framework from `package.json` dependencies
2. Finds your entrypoint file (must import the framework)
3. Introspects your routes automatically — no `vercel.json` rewrites needed
4. Bundles and deploys as a single Lambda

##### Entrypoint Detection

Vercel searches for these filenames (in order): `app`, `index`, `server`, `main`, `src/app`, `src/index`, `src/server`, `src/main`

With these extensions: `.js`, `.cjs`, `.mjs`, `.ts`, `.cts`, `.mts`

The preferred entrypoint filename is `server.ts`. The file must import the framework (`import express from 'express'`, `import { Hono } from 'hono'`, etc.).

We recommend using `export default` for the app instance, but calling `.listen()` also works.

##### Minimal Express App

```
my-app/
├── package.json
└── server.ts
```

**package.json:**

```json
{
  "type": "module",
  "dependencies": {
    "express": "5.1.0"
  }
}
```

**server.ts:**

```typescript
import express from 'express';

const app = express();

app.get('/', (_req, res) => {
  res.send('Hello Express!');
});

export default app;
```

##### Minimal Hono App

**package.json:**

```json
{
  "type": "module",
  "dependencies": {
    "hono": "^4.8.9"
  }
}
```

**server.ts:**

```typescript
import { Hono } from 'hono';

const app = new Hono();

app.get('/', c => {
  return c.text('Hello Hono!');
});

export default app;
```

##### Local Development

Run `vc dev` from the project root. Vercel runs your app directly with TypeScript support. No `dev` script is required, though you can add one if you prefer.

Static files in `public/` are served automatically.

##### Configuration

Most apps need zero configuration. Optional `vercel.json` settings:

```json
{
  "functions": {
    "server.ts": {
      "includeFiles": "views/**/*"
    }
  }
}
```

##### Anti-Patterns

- **Putting routes in `api/` folder**: Your framework IS the app. Define routes in your app code, not as separate files in `api/`.
- **Adding `vercel.json` rewrites**: Routes are introspected automatically from your app. Rewrites are not needed.
- **Adding a `build` script**: Vercel handles TypeScript compilation and bundling. Don't add a build script for transpilation — it's not needed and can cause issues.

### File: `references/platform-ops.md`

#### Platform Operations

Use these commands for account, billing, alerting, and CLI-level operations. Prefer `--format json` where supported for automation.

##### Alerts

```bash
vercel alerts                                      # linked-project alerts
vercel alerts --all --format json                  # team-wide alerts
vercel alerts --type usage_anomaly --type error_anomaly
vercel alerts inspect <group-id> --format json
```

Alert rules live under `vercel alerts rules`; inspect `vercel alerts rules --help` before creating or changing rules.

##### Usage, Contracts, and Purchases

```bash
vercel usage --help
vercel usage --from 2026-05-01 --to 2026-05-08 --breakdown daily
vercel usage --group-by project --format json
vercel contract
vercel buy --help
```

Billing and purchase commands can change paid account state. Get explicit user confirmation before running mutations such as `vercel buy ...`.

##### Tokens

```bash
vercel tokens ls --format json
vercel tokens add "CI deploy" --format json
vercel tokens rm <token-id>
```

Prefer `VERCEL_TOKEN` for automation. Do not print token values unless the user explicitly needs them and understands the exposure.

##### Telemetry and CLI Maintenance

```bash
vercel telemetry status
vercel telemetry enable
vercel telemetry disable
vercel upgrade
vercel whoami --format json
```

`vercel upgrade` changes the installed global CLI. Prefer the project-pinned CLI or package-manager invocation when one exists, unless the user asked to update a global install.

##### Other Account Commands

```bash
vercel activity --help
vercel teams --help
```

If an account operation is not available through a first-class command, use `vercel api` as a fallback.

### File: `references/project-infra.md`

#### Project Infrastructure

Use these commands for infrastructure attached to a Vercel project: cache, cron jobs, deploy hooks, Git connections, Edge Config, redirects, custom environments, and rolling releases.

##### Cache

```bash
vercel cache purge --type cdn --yes
vercel cache invalidate --tag mytag --yes
vercel cache dangerously-delete --tag old-data --yes
```

`dangerously-delete` is destructive. Confirm intent before running it.

##### Cron Jobs

```bash
vercel crons ls --format json
vercel crons add --path /api/cron --schedule "0 10 * * *"
vercel crons run /api/cron
```

`vercel crons add` writes to `vercel.json`; do not run it when the user only asked for inspection.

##### Deploy Hooks

```bash
vercel deploy-hooks ls --format json
vercel deploy-hooks create cms-rebuild --ref main
vercel deploy-hooks rm <hook-id> --yes
```

Deploy hook URLs can trigger deployments. Treat them as secrets when presenting output.

##### Git Connection

```bash
vercel git connect
vercel git connect https://github.com/user/repo.git
vercel git disconnect --yes
```

Verify the linked project and scope before changing Git connections.

##### Edge Config

```bash
vercel edge-config ls --format json
vercel edge-config add flags --items '{"enabled":true}' --format json
vercel edge-config get flags --format json
vercel edge-config items flags --format json
vercel edge-config update flags --patch '{"items":[{"operation":"upsert","key":"enabled","value":false}]}' --format json
vercel edge-config tokens flags --add read-only --format json
vercel edge-config rm flags --yes
```

Token values and config contents may be sensitive. Avoid broad dumps unless needed.

##### Redirects and Routing

Use `references/routing.md` for route-rule syntax. Redirect-specific commands are available under `vercel redirects`:

```bash
vercel redirects ls
vercel redirects add /old /new --status 308
vercel redirects list-versions
vercel redirects promote <version-id> --yes
```

Routing and redirect changes have separate command groups. Route changes are staged before `vercel routes publish`; redirect changes use redirect versions and promotion.

##### Custom Environments

```bash
vercel target ls --format json
vercel buy addon customEnvironment 2 --project my-app --yes
vercel buy addon customEnvironment 0 --project my-app --yes
vercel pull --environment=<target>
vercel --target=<target>
```

`vercel target` lists custom environments for the linked project. `vercel buy addon customEnvironment` updates purchased custom environment capacity for a project via `POST /v1/projects/custom-environments/settings`. Quantity is in packs; each pack adds 5 environments. Use `--project` when the target project is not linked in the current directory. Set quantity to `0` to remove purchased capacity. Aliases include `custom-environment` and `custom-environments`. `deploy` and `build` accept `--target`; `pull` accepts `--environment` (not `--target`).

##### Rolling Releases

```bash
vercel rr configure --enable --advancement-type=automatic --stage=10,5m --stage=50,10m
vercel rr start --dpl=<deployment-url> --yes
vercel rr fetch
vercel rr approve --currentStageIndex=0 --dpl=<deployment-id>
vercel rr abort --dpl=<deployment-id>
vercel rr complete --dpl=<deployment-id>
```

There is no `vercel rr status` command; use `vercel rr fetch` for current details.

### File: `references/projects-and-teams.md`

#### Projects & Teams

##### Projects

```bash
vercel project ls                    # list projects
vercel project ls --filter my-app    # substring search by name
vercel project add my-project        # create project
vercel project inspect my-app        # inspect project
vercel project rm my-app             # remove project
```

##### Deployments

```bash
vercel list                          # list deployments
vercel list --status READY           # filter by status
vercel list -m gitBranch=main        # filter by metadata
vercel inspect <url>                 # deployment details
vercel remove <name|id>              # remove deployments
vercel remove my-app --safe          # skip aliased deployments
```

`vercel list` returns one page of 20 and supports cursor pagination with `--next`; do not assume it accepts `--limit`. Use project, scope, status, environment, and metadata filters to keep deployment lists focused, or use `vercel api` when a strict page size is required.

##### Teams

```bash
vercel whoami --format json          # current user and effective team
vercel teams ls                      # list teams
vercel teams switch                  # interactive team picker
vercel teams switch my-team          # switch by slug
vercel teams invite user@example.com # invite member
```

##### Discovering Scope

Use these commands when the user has not specified a team or project and the task is read-only:

```bash
vercel whoami --format json
vercel teams ls --format json
vercel project ls --scope <team-slug> --format json
vercel list <project-name> --scope <team-slug> --status READY --format json
```

Use explicit scope after selecting or inferring the team:

```bash
vercel project inspect <project-name> --scope <team-slug>
vercel list <project-name> --scope <team-slug> --status READY --format json
```

Do not conclude that no projects or deployments exist after checking only one relevant scope. If several plausible targets remain, ask the user to choose from the candidates found. Avoid broad enumeration across unrelated teams unless the user asked for account-wide investigation.

##### Scoping

Use `--scope` on any command to target a specific team. `--team` exists for compatibility but is deprecated.

```bash
vercel deploy --scope my-team
```

### File: `references/routing.md`

#### Routing Rules

##### Overview

`vercel routes` manages project-level routing rules. Each rule matches requests by path pattern and optional conditions (headers, cookies, query parameters), then applies an action (rewrite, redirect, set status) or modifies headers and query parameters.

Routing rules take effect immediately without a deployment and take precedence over routes defined in your deployment configuration (`vercel.json`, `next.config.js`, etc.).

Each routing rule has a unique name within the project, used to identify it in `edit`, `delete`, `enable`, `disable`, and `reorder` commands. Rules are evaluated in priority order (top to bottom). Use `reorder` to control placement.

All changes are staged as drafts. Run `vercel routes publish` to push staged changes to production.

##### Viewing Routing Rules

```bash
vercel routes list                       # all routing rules
vercel routes list --diff                # staged changes vs production
vercel routes inspect "My Route"         # full details of a specific rule
```

##### Creating Routing Rules

Use `--ai` with a natural language description to generate routing rules with AI. For full control, use flags or interactive mode.

###### Source path (`--src` and `--src-syntax`)

Use `--src` to specify the path pattern and `--src-syntax` to control how it's interpreted:

| Syntax | Example | When to use |
|--------|---------|-------------|
| `regex` | `^/api/(.*)$` | Full regex control. |
| `path-to-regexp` | `/api/:path*` | Express-style named params. More readable. |
| `equals` | `/about` | Exact string match. Simplest option. |

Defaults to `regex` if `--src-syntax` is not specified. `path-to-regexp` and `equals` paths must start with `/`.

###### Actions

Each routing rule can have at most one primary action:

| Action | Required flags | Description |
|--------|---------------|-------------|
| `rewrite` | `--dest` | Proxy to destination URL (transparent to the client) |
| `redirect` | `--dest` + `--status` (301/302/307/308) | Redirect the client to a new URL |
| `set-status` | `--status` (100-599) | Return a status code (no destination) |

A routing rule without a primary action can still set response headers or apply request transforms.

###### Conditions

Conditions control when a routing rule matches. Use `--has` to require something is present, and `--missing` to require it is absent. Supported types are `header`, `cookie`, `query`, and `host`. Conditions are repeatable, up to 16 per rule.

```bash
#### Existence check
--has "cookie:session"
--missing "header:Authorization"

#### Value matching
--has "header:X-API-Key:eq=my-secret"          # exact match
--has "cookie:theme:contains=dark"              # value contains substring
--has "header:Accept:re=application/json.*"     # regex match
--missing "query:debug:eq=true"                 # must NOT have debug=true

#### Host matching (no key, just value)
--has "host:eq=example.com"
```

###### Response headers & request transforms

Response headers, request headers, and request query parameters can each be set, appended to, or deleted. All flags are repeatable.

```bash
--set-response-header "Cache-Control=public, max-age=3600"
--append-request-header "X-Forwarded-Host=myapp.com"
--delete-request-query "debug"
```

###### Examples

```bash
#### AI — describe what you want
vercel routes add --ai "Rewrite /api/* to https://backend.example.com/*"

#### Interactive — guided builder with prompts
vercel routes add

#### Rewrite with path-to-regexp syntax and a request header
vercel routes add "API Proxy" \
  --src "/api/:path*" --src-syntax path-to-regexp \
  --action rewrite --dest "https://api.example.com/:path*" \
  --set-request-header "X-Forwarded-Host=myapp.com" --yes

#### Redirect with status
vercel routes add "Legacy Redirect" \
  --src "/old-blog" --src-syntax equals \
  --action redirect --dest "/blog" --status 301 --yes

#### Routing rule with conditions and a description
vercel routes add "Auth Required" \
  --src "/dashboard/:path*" --src-syntax path-to-regexp \
  --action redirect --dest "/login" --status 307 \
  --missing "cookie:session" \
  --description "Redirect unauthenticated users to login" --yes
```

##### Editing Routing Rules

```bash
#### AI — describe the changes
vercel routes edit "My Route" --ai "Add CORS headers and change to 308 redirect"

#### Interactive — choose which fields to modify
vercel routes edit "My Route"

#### Change specific fields
vercel routes edit "My Route" --dest "https://new-api.example.com/:path*" --yes
vercel routes edit "My Route" --action redirect --dest "/new" --status 301 --yes
vercel routes edit "My Route" --name "New Name" --yes
```

##### Managing Routing Rules

Use `vercel routes list` or `inspect` to find routing rule names and IDs.

```bash
vercel routes enable "My Route"           # enable a disabled routing rule
vercel routes disable "My Route"          # disable without removing
vercel routes delete "My Route"           # delete a routing rule
vercel routes reorder "My Route" --position start           # move to top
vercel routes reorder "My Route" --position end             # move to bottom
vercel routes reorder "My Route" --position after:<id>      # move after another
vercel routes reorder "My Route" --position before:<id>     # move before another
```

##### Publishing & Versioning

```bash
vercel routes publish                    # promote staged changes to production
vercel routes discard-staging            # discard all staged changes
vercel routes list-versions              # view version history
vercel routes restore <version-id>       # roll back to a previous version
```

### File: `references/sandbox.md`

#### Sandbox

`vercel sandbox` forwards to the Sandbox CLI for project-scoped sandbox environments. Run `vercel sandbox --help` for the current list; the subcommands below are wired through `sandbox/index.ts`.

##### Subcommands

```bash
vercel sandbox list                                                              # list sandboxes (alias: ls)
vercel sandbox create                                                            # create a sandbox
vercel sandbox create --connect                                                  # create and immediately open a shell
vercel sandbox run -- node -e "console.log('hi')"                                # create + run a command in one step
vercel sandbox exec <sandbox-id> -- npm test                                     # execute a command in an existing sandbox
vercel sandbox connect <sandbox-id>                                              # interactive shell (aliases: ssh, shell)
vercel sandbox copy ./local.txt <sandbox-id>:/tmp/                               # copy files (alias: cp)
vercel sandbox stop <sandbox-id>                                                 # stop one or more sandboxes (aliases: rm, remove)
vercel sandbox config network-policy <sandbox-id> --network-policy deny-all      # update sandbox network policy
vercel sandbox snapshot <sandbox-id> --stop                                      # take a filesystem snapshot (sandbox is stopped)
vercel sandbox snapshots list                                                    # list snapshots (subcommand group: list/get/delete)
vercel sandbox login                                                             # log in to the Sandbox CLI
vercel sandbox logout                                                            # log out of the Sandbox CLI
```

Use `--` to separate the sandbox command from arguments forwarded to the sandbox process (as in `run`, `exec`).

`sandbox config` is a subcommand group; the only configurable surface today is `network-policy`. `sandbox snapshot` requires `--stop` because snapshotting stops the sandbox first. `sandbox snapshots` (plural) is a separate subcommand group that manages existing snapshots (`list`, `get`, `delete`).

##### Auth Forwarding

Global Vercel flags `--scope` / `--team` / `--token` are forwarded to the Sandbox CLI. For automation, set `VERCEL_TOKEN`; the CLI maps it to `VERCEL_AUTH_TOKEN` for Sandbox.

Sandbox commands may create external compute or interactive sessions. Confirm intent before creating or connecting to a sandbox.

### File: `references/security.md`

#### Security

`vercel security` reads the current team's security posture. `vercel security check` runs the Security Dashboard checks, and `vercel security vulnerabilities` lists and triages Security Review findings. Both need a team scope; run `vercel switch` or pass `--scope <team>` when none is selected.

##### Vulnerabilities

Security Review reports vulnerabilities it finds in a team's code. Use `vercel security vulnerabilities` to read and triage them from the terminal.

```bash
vercel security vulnerabilities                                   # open, Production and most severe first
vercel security vulnerabilities --project my-app --git-branch main
vercel security vulnerabilities inspect my-app/12                 # summary, description, and suggested fix
```

Each vulnerability has a reference, `<project>/<number>` or `<owner>/<repo>/<number>`. `inspect`, `dismiss`, and `reopen` accept the reference or the vulnerability ID.

`list` is the default subcommand. Filter with `--project`, `--environment`, `--git-branch`, `--severity`, `--status` (default `open`; `all` for every status), and `--query`. Results are paginated: follow the printed next-page command, or pass the `pagination.next` cursor from `--json` output to `--next`. List output omits descriptions and fixes, so `inspect` a vulnerability before acting on it.

If Security Review isn't enabled for the team, the command fails and says so. Which vulnerabilities you can see and change depends on the team role.

###### Fix a vulnerability

1. `inspect` it and confirm the issue is still present on its branch.
2. Make the smallest fix, then run the project's type checks, lint, and tests.
3. Push the fix to the same branch. A later review closes the vulnerability when it no longer detects the issue.

`closed` means a later review no longer detects the issue, not that a fix was verified. Severity is an AI-generated estimate, so judge each finding against the application.

###### Dismiss or reopen

```bash
vercel security vulnerabilities dismiss my-app/12 --reason false-positive
vercel security vulnerabilities dismiss my-app/12 --reason accepted-risk --message "Internal tool behind SSO"
vercel security vulnerabilities reopen my-app/12
```

Dismissing records a decision for the team. Dismiss only when the user asks or agrees, not to clear a vulnerability you haven't fixed. `dismiss` requires `--reason` in non-interactive runs and with `--json`. Closed vulnerabilities can't be dismissed or reopened.

##### Checks

```bash
vercel security                          # same as vercel security check
vercel security check --findings         # list findings under every check
vercel security check pats-no-expiration # run one check and list its findings
vercel security check --project my-app
```

Each check reports a risk, a status (`failing`, `passing`, `muted`, `no access`, or `error`), and violation and muted counts. In non-interactive runs, `check` writes JSON to stdout. A failing check still exits 0, so gate CI on the report contents, not the exit code.

##### Sensitive output

Check reports include member emails, token names, and project settings. Vulnerabilities include source code and how to exploit it. Keep both out of shared logs, issues, and pull request comments.

##### Docs

- https://vercel.com/docs/cli/security
- https://vercel.com/docs/agent/security-review/usage

### File: `references/storage.md`

#### Blob Storage

`vercel blob` manages Vercel Blob storage — simple file storage for uploading, listing, and deleting files.

```bash
vercel blob put ./image.png --access public                            # upload (public)
vercel blob put ./image.png --access private --pathname images/photo.png  # custom path (private)
vercel blob put ./large.zip --access public --multipart                # large files
vercel blob get <url-or-pathname> --access public                      # download to stdout
vercel blob get <url-or-pathname> --access private --output ./out.bin  # save to file
vercel blob list                                                       # list blobs
vercel blob list --prefix images/                                      # filter by prefix
vercel blob del <url-or-pathname>                                      # delete
vercel blob copy <from-url> <to-pathname> --access public              # copy
```

`--access` is **required** on `put`, `copy`, and `get`. Valid values: `public` or `private`. The CLI errors out with `Missing required --access flag` if it is omitted.

##### Auth Modes

`vercel blob` reads credentials from **local sources only**. It does not look up the linked project's connected store at runtime — even in a linked project, running a `blob` command without local credentials fails with `No Vercel Blob credentials found`. Resolution order (`getBlobRWToken` in `util/blob/token.ts`):

1. `--rw-token <token>` flag — read/write token.
2. `--oidc-token <token>` + `--store-id <id>` flags — must be passed together; `--store-id` accepts the ID with or without the `store_` prefix.
3. `BLOB_READ_WRITE_TOKEN` env var, **or** `VERCEL_OIDC_TOKEN` + `BLOB_STORE_ID` env vars (process env).
4. The same variables loaded from `.env.local` in the current working directory.
5. Otherwise: error.

```bash
vercel blob put ./image.png --access public --rw-token "$BLOB_READ_WRITE_TOKEN"
vercel blob put ./image.png --access public --oidc-token "$VERCEL_OIDC_TOKEN" --store-id store_abc123
```

To use a linked project's Blob store without an explicit token, link the project and pull the credentials into `.env.local` first:

```bash
vercel link
vercel env pull              # writes BLOB_READ_WRITE_TOKEN (or OIDC vars) to .env.local
vercel blob put ./image.png --access public
```

##### Authentication

Every `vercel blob` command needs credentials for **one specific store**. There are two mutually exclusive modes:

| Mode | Credentials | Use for |
| --- | --- | --- |
| **Read-write token** | `BLOB_READ_WRITE_TOKEN` (encodes the store id) | scripts, CI, anything non-interactive — it is long-lived |
| **OIDC** | `VERCEL_OIDC_TOKEN` **and** `BLOB_STORE_ID` together | local dev against a linked project — the token is **short-lived** |

Resolution order (first match wins):

1. **Explicit flags.** `--rw-token <token>`, or `--oidc-token <jwt> --store-id <store_…>`. The two OIDC flags must be passed **together** — passing only one is an error, not a fallback to the RW token.
2. **Environment** (`process.env`, then `.env.local`). In each source: if exactly one of `VERCEL_OIDC_TOKEN` / `BLOB_STORE_ID` is set it's a hard error (partial OIDC config is never silently downgraded); if both are set → OIDC; else if `BLOB_READ_WRITE_TOKEN` is set → RW token.
3. **Linked project.** Run `vercel link` (or `vercel env pull`) in a folder linked to a project that has a Blob store connected, and the credentials are pulled into `.env.local` for you.

```bash
#### Non-interactive / CI — prefer the read-write token
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_… vercel blob list

#### OIDC — store id comes from BLOB_STORE_ID, no --store-id flag needed
VERCEL_OIDC_TOKEN=… BLOB_STORE_ID=store_… vercel blob list
```

> **`VERCEL_OIDC_TOKEN` is short-lived and refreshes.** Do **not** hard-code it into a script or `.env` you keep around — a captured value stops working once it expires. For anything long-running or automated, use `BLOB_READ_WRITE_TOKEN` instead.

##### Store Management

```bash
vercel blob create-store my-store --access private                    # create a new store
vercel blob get-store <store-id>                                      # show store details
vercel blob delete-store <store-id> --yes                             # remove a store
vercel blob empty-store --yes                                         # delete all blobs in the selected store
vercel blob list-stores --all --json                                  # list every team store as JSON
vercel blob list-stores --no-projects                                 # hide the Projects column in table output
```

##### `--non-interactive`

`--non-interactive` is a global flag (see `global-options.md`) that tells every `vercel blob` command to never prompt. It is **auto-set when an agent is detected on a non-TTY stdin**, so agents normally get this behavior without passing the flag; pass `--non-interactive=false` to force prompts even under agent detection.

In this mode a command never blocks on input. Anything it would otherwise prompt for becomes a fail-fast, structured JSON error on stdout (`{"status":"error","reason":"…","message":"…"}`, usually with a suggested `next` command) and a non-zero exit — it neither hangs nor silently guesses:

- **`reason: "missing_arguments"`** — a required value that is normally prompted is absent. E.g. `create-store` without a name or `--access`, or `get-store` / `delete-store` without a store id. Pass the value as an argument/flag instead.
- **`reason: "confirmation_required"`** — an action needs explicit consent: the destructive `delete-store` and `empty-store`, and `create-store` when it would link the new store to the current project. Pass `--yes` to confirm up front (or `--environment` to choose link targets for `create-store`).

`--yes` and `--non-interactive` are **independent**: `--non-interactive` suppresses prompts but never implies consent, so the commands above still require `--yes`. `--yes` is declared per command (only the ones that confirm a mutation); `--non-interactive` is global. Read-only/idempotent commands (`list`, `get`, `list-stores`) just run — `list-stores` skips its interactive store picker rather than prompting — and `del` deletes immediately with no confirmation.

```bash
#### Agent / CI: supply every required value as a flag, and --yes for destructive ops
vercel blob create-store my-store --access private --yes   # --yes also links to the current project
vercel blob delete-store <store-id> --yes
vercel blob empty-store --yes
```

### File: `upstream/SOURCE.md`

---
name: vercel-cli
description: Deploy, manage, inspect, and troubleshoot Vercel projects from the command line. Use for Vercel deployments, Vercel Toolbar comments, build failures, projects and teams, environment variables, domains and DNS, logs, metrics, Speed Insights, Core Web Vitals, request traces, usage, activity, alerts, firewall rules, cache, cron jobs, deploy hooks, Edge Config, feature flags (`vercel flags`), integrations, connectors, Blob storage, Container Registry (VCR), microfrontends, rolling releases, custom environments, Sandbox, agent/MCP setup, preview access, local development, or `vercel api` fallback.
---

#### Vercel CLI Skill

The Vercel CLI (`vercel` or `vc`) deploys, manages, and develops projects on the Vercel platform from the command line. Use `vercel <command> --help` for full flag details on any command.

The installed CLI help is the source of truth for obscure or newly added flags. If a command example here is not enough, check `vercel <command> --help` before acting instead of guessing.

Parse only stdout for URLs and JSON. Warnings, progress, and `--help` print to stderr; merge streams only when searching help text. Some help commands exit 2 after printing usage, so treat printed usage as a successful help read.

In agent/non-interactive mode, many commands report errors and required confirmations as a single JSON object on stdout with `status`, `reason`, `hint`, and `next` (runnable follow-up commands). Prefer a suggested `next` command over composing a retry only after confirming that it preserves the user's intended target and authorization; do not automatically run linking, authentication, or mutation follow-ups. Read commands such as `list`, `logs`, `inspect`, and `api` keep their normal output shape.

##### Critical: Project Linking

Project context depends on the command's working directory. Before a consequential read or mutation, run `vercel project inspect --non-interactive` from the intended directory and confirm the reported owner and project. This command resolves only existing context in non-interactive mode; stop on `link_required` or a target mismatch instead of linking automatically.

Many project-aware commands also accept `--project <name-or-id>` with `--scope <team>` for an explicit, one-command target. Confirm that target and scope preserve the user's intent before using them.

- **`<cwd>/.vercel/project.json`**: Created by `vercel link`. This exact working-directory link wins over a repository link. The CLI does not generally inherit a root `project.json` when run from an arbitrary subdirectory.
- **`<repo-root>/.vercel/repo.json`**: Created by `vercel link --repo`. The CLI selects the deepest project directory that contains the working directory.
- **Unmatched repository path**: If no repo mapping contains the working directory, interactive repo resolution prompts among the configured projects. Non-interactive repo resolution currently selects the only configured project or remains unresolved when multiple choices exist. Commands that set up projects may then enter a linking flow, so non-interactive mode is not generally fail-closed.

Being inside an app directory is not proof that the intended project was selected. Check the resolved project explicitly, especially when a repo mapping does not cover that directory.

`vercel whoami --format json` identifies the authenticated user and effective team; plain non-TTY `vercel whoami` prints only the username. Neither verifies the linked project. Read-only project commands can still require login or team SAML re-authentication and open a browser/device flow. Ask the user to complete that flow deliberately before continuing.

##### Quick Start

```bash
npm i -g vercel
vercel login
vercel link              # single project
#### OR
vercel link --repo       # monorepo
vercel pull
vercel dev        # local development
vercel deploy     # preview deployment
vercel --prod     # production deployment
```

##### Decision Tree

Use this to route to the correct reference file:

- **Deploy, redeploy, forced builds, no-cache builds, or deployment source/provenance** → `references/deployment.md`
- **Rolling releases, deploy hooks, cron jobs, cache, git connection, Edge Config, redirects, custom environments** → `references/project-infra.md`
- **Local development** → `references/local-development.md`
- **Environment variables** → `references/environment-variables.md`
- **CI/CD automation** → `references/ci-automation.md`
- **Domains or DNS** → `references/domains-and-dns.md`
- **Projects or teams** → `references/projects-and-teams.md`
- **Vercel Toolbar comments (`vercel comments`)** → `references/comments.md`
- **Build failures, deployment errors, logs, metrics, Speed Insights, Core Web Vitals, activity, performance, preview access, or production debugging** → `references/monitoring-and-debugging.md`
- **Alerts, usage, contracts, billing purchases, tokens, telemetry, or CLI upgrades** → `references/platform-ops.md`
- **Blob storage** → `references/storage.md`
- **Container Registry (`vercel vcr`: repositories, images, tags, docker/podman/buildah login, push/pull)** → `references/container-registry.md`
- **Integrations (databases, storage, etc.)** → `references/integrations.md`
- **Connectors (`vercel connect`)** → `references/connectors.md`
- **Routing rules** → `references/routing.md`
- **Firewall (WAF rules, IP blocks, rate limiting)** → `references/firewall.md`
- **Security Review vulnerabilities or security checks (`vercel security`)** → `references/security.md`
- **Access a preview deployment** → use `vercel curl` (see `references/monitoring-and-debugging.md`)
- **CLI command is unavailable or output is missing required fields** → use `vercel api` after first-class CLI paths are unavailable or insufficient (see `references/advanced.md`)
- **Node.js backends (Express, Hono, etc.)** → `references/node-backends.md`
- **Monorepos (Turborepo, Nx, workspaces)** → `references/monorepos.md`
- **Bun runtime** → `references/bun.md`
- **Feature flags (`vercel flags`: create, inspect, set, split, rollout, rules, segments, sdk-keys)** → `references/flags.md`
- **Microfrontends** → `references/microfrontends.md`
- **Sandbox** → `references/sandbox.md`
- **Agent, MCP, skills discovery, or AI Gateway** → `references/agent-and-ai.md`
- **Captured request traces (`vercel traces`, including `--open` / `--view`)** → `references/advanced.md`
- **Advanced (`vercel api` fallback, webhooks)** → `references/advanced.md`
- **Global flags** → `references/global-options.md`
- **First-time setup** → `references/getting-started.md`

##### Anti-Patterns

- **Wrong link type in monorepos with multiple projects**: `vercel link` creates `project.json`, which only tracks one project. Use `vercel link --repo` instead. When things break, check `.vercel/` first.
- **Letting commands auto-link in monorepos**: Many commands implicitly run `vercel link` if `.vercel/` doesn't exist. This creates `project.json`, which may be wrong. Run `vercel link` (or `--repo`) explicitly first.
- **Assuming an app subdirectory determines the project**: Verify with `vercel project inspect --non-interactive`; an unmatched repo path can currently fall back to the sole configured project in non-interactive mode.
- **Using `vercel whoami` as linked-project verification**: `vercel whoami --format json` reports authentication and team context, not the selected project.
- **Forgetting non-interactive flags in plain CI runs**: detected agents get `--non-interactive` by default, but plain CI does not — pass it explicitly there, and add `--yes` only for commands that require confirmation.
- **Using `vercel deploy` after `vercel build` without `--prebuilt`**: The build output is ignored.
- **Using `vercel redeploy` for no-cache rebuilds**: `vercel redeploy` does not expose a no-cache flag; use `vercel deploy --force` without `--with-cache` when you need a fresh deployment that does not retain build cache.
- **Hardcoding tokens in flags**: Use `VERCEL_TOKEN` env var instead of `--token`.
- **Disabling deployment protection**: Use `vercel curl` instead to access preview deploys.
- **Using `vercel api` too early**: Prefer first-class CLI commands when they expose the needed data or mutation.

### File: `upstream/command/vercel.md`

---
description: Load the Vercel CLI skill for deploying, managing, inspecting, and troubleshooting projects on the Vercel platform. Use when users ask to deploy a project, inspect deployments, debug logs or metrics, check activity, alerts, or usage, set up environment variables, configure domains or DNS, start local development, manage Vercel infrastructure, add databases, integrations, connectors, or Blob stores, configure Sandbox or agent/MCP tooling, or use Vercel API fallback.
---

Load the Vercel CLI skill and help with Vercel project deployment, management, inspection, and troubleshooting.

##### Workflow

###### Step 1: Identify task type from user request

Use the decision tree in SKILL.md to select the relevant reference file.

###### Step 2: Read the reference file

Based on task type, read `references/<topic>.md`. Use `vercel <command> --help` for full flag details before using uncommon or risky flags.

###### Step 3: Execute task

**Key things to verify:**

- Run `vercel project inspect --non-interactive` from the intended working directory and confirm the owner and project; stop on `link_required` or a mismatch instead of treating `.vercel/` existence as proof
- Use `vercel pull` for project settings and environment data under `.vercel/`; use `vercel env pull` for `.env.local` or another file that is already excluded from source control
- If login or team SAML re-authentication opens a browser/device flow, wait for deliberate user completion before continuing
- Use `--non-interactive` for prompt-free runs and `--yes` only when confirmation is required
- Use `VERCEL_TOKEN` env var for auth (not `--token`)
- Use first-class CLI commands before `vercel api`
- Use `vercel curl` to access preview deployments; don't disable protection

###### Step 4: Summarize

Report the commands run, meaningful outputs, and any remaining permission, scope, or subscription limits.

<user-request>
$ARGUMENTS
</user-request>

### File: `upstream/references/advanced.md`

#### Advanced Commands

##### `vercel api` — Fallback for Missing CLI Commands

**Use `vercel api` when a CLI command doesn't exist for what you need.** Full access to the Vercel REST API with automatic authentication.

Use first-class CLI commands before `vercel api` whenever they expose the data or mutation you need.

Use `vercel api` when:

- The first-class CLI command does not exist.
- The first-class command omits fields needed for the answer.
- JSON output is needed for filtering or aggregation.
- Endpoint discovery is needed through `vercel api list`.

Keep calls narrow and shape large responses before presenting them. Add `--raw` when a downstream parser should receive only the JSON response payload. Use `--raw-field` instead of typed `--field` when the API expects a string value that looks like a boolean or number.

```bash
vercel api /v2/user                                    # GET current user
vercel api /v9/projects --scope my-team                # list projects
vercel api /v10/projects -X POST -F name=my-project    # create project
vercel api /v6/deployments --paginate                  # paginate all results
vercel api list                                        # list available endpoints
vercel api list --format json                          # list endpoints as JSON
vercel api "/v6/deployments?projectId=<project-id>&limit=10" --scope <team>
vercel api "/v6/deployments?limit=10" --raw            # JSON payload
vercel api /v9/projects/<project>/env/<env-id> -X PATCH --raw-field value=false --scope <team>
```

Use `vercel api list` to discover available endpoints. `vercel api ls` is also accepted as an alias.

Do not parse `vercel api --generate=curl` output as JSON; it emits a curl command.

DELETE requests prompt for confirmation; in non-interactive/agent mode they are refused unless `--dangerously-skip-permissions` is passed. Use that flag only for deletions the user explicitly approved.

##### `vercel traces` — Captured Request Traces

Fetch traces captured for a Vercel project. `inspect` is the default subcommand.

```bash
vercel traces inspect req_1234567890                                   # markdown summary
vercel traces req_1234567890                                           # equivalent (inspect is default)
vercel traces inspect req_1234567890 --json                            # raw trace JSON to stdout
vercel traces inspect req_1234567890 --scope my-team --project my-app  # specific team/project
vercel traces inspect req_1234567890 --open                            # open in Vercel Dashboard
vercel traces inspect req_1234567890 --open --view waterfall           # specific dashboard view (timeline, tree, waterfall)
```

`--view` is only valid alongside `--open`.

`vercel traces search` searches spans across the team, or one project with `--project`, newest first, from the last hour by default:

```bash
vercel traces search --environment production --status error --since 1h
vercel traces search --query 'span.duration > 2000' --json
vercel traces search --next <cursor> --json                         # continue from the summary's pagination.next
```

With `--json`, each span is a `{"type":"span","data":{...}}` line, and the output ends with a `summary` line (`recordsReturned`, `timeRange`, `pagination: { hasMore, next }`, `excludedIntervals`). Read spans under `.data`, for example `jq 'select(.type == "span") | .data.span.name'`. When more spans match, continue with `--next` instead of raising `--limit`; the cursor keeps the team, project, filters, and window, so only `--limit` can change. A request ID from search results or logs does not guarantee that `vercel traces inspect` can retrieve the trace; reuse the same `--scope` and `--project`.

##### Other Commands

- `vercel webhooks` — manage webhooks (create, ls, rm)
- `vercel mcp` — set up MCP integration for AI agents
- `vercel telemetry` — manage telemetry settings
- `vercel upgrade` — upgrade the CLI

### File: `upstream/references/agent-and-ai.md`

#### Agent, MCP, Skills, and AI Gateway

Use these commands for AI-agent setup and AI Gateway key management. Confirm flags with `vercel <command> --help` before scripting client-specific setup.

##### Agent Instructions

`vercel agent` generates an `AGENTS.md` file with Vercel deployment best practices.

```bash
vercel agent init
vercel agent init --yes
```

##### MCP Setup

`vercel mcp` sets up MCP agents and configuration for Vercel integration.

```bash
vercel mcp                                      # interactive setup
vercel mcp --project                            # project-specific access
vercel mcp --clients "Cursor,VS Code with Copilot"
```

In non-interactive mode, pass `--clients`. Supported client labels are listed in `vercel mcp --help`.

##### Skill Discovery

`vercel skills` discovers agent skills relevant to a project.

```bash
vercel skills
vercel skills nextjs --format json
vercel skills --json
```

##### AI Gateway

`vercel ai-gateway` manages AI Gateway API keys, routing rules, and models.

```bash
vercel ai-gateway api-keys create
vercel ai-gateway api-keys create --name my-key --budget 500 --refresh-period monthly
vercel ai-gateway api-keys create --include-byok

vercel ai-gateway rules ls
vercel ai-gateway rules add --type rewrite --source anthropic/claude-fable-5 --destination anthropic/claude-opus-4.8

vercel ai-gateway models ls
vercel ai-gateway models endpoints anthropic/claude-opus-4.8
```

Use the dashboard or `vercel api` only when first-class CLI commands do not expose the needed operation.

### File: `upstream/references/bun.md`

#### Bun on Vercel

Vercel supports Bun as a runtime. To enable it, add `"bunVersion": "1.x"` to your `vercel.json`:

```json
{
  "bunVersion": "1.x"
}
```

That's it. Vercel will use Bun instead of Node.js to run your project.

This works with any framework — backend apps (Express, Hono, Elysia), frontend frameworks, or anything else. Bun is used as the runtime, so Bun-specific APIs and features are available.

##### Example: Elysia with Bun

Elysia is a Bun-native framework. To use it on Vercel:

**vercel.json:**

```json
{
  "bunVersion": "1.x"
}
```

**package.json:**

```json
{
  "type": "module",
  "dependencies": {
    "elysia": "^1.0.0"
  }
}
```

**server.ts:**

```typescript
import { Elysia } from 'elysia';

const app = new Elysia().get('/', () => 'Hello Elysia!');

export default app;
```

##### Example: Next.js with Bun

**vercel.json:**

```json
{
  "bunVersion": "1.x"
}
```

**package.json:**

```json
{
  "scripts": {
    "dev": "bun run --bun next dev",
    "build": "bun run --bun next build"
  }
}
```

##### Anti-Patterns

- **Forgetting `bunVersion` in `vercel.json`**: Without it, your project runs on Node.js. Bun-specific APIs (like `Bun.file()`) will fail at runtime.

### File: `upstream/references/ci-automation.md`

#### CI/CD Automation

##### Authentication

Use `VERCEL_TOKEN` env var (not `--token` — it leaks in process listings). Use `--scope` if the token has access to multiple teams.

##### The Standard CI Deploy Pattern

```bash
vercel pull --yes --environment=production
vercel build --prod
vercel deploy --prebuilt --prod
```

For multi-project monorepos, ensure `vercel link --repo --yes` has been run first.

##### Separate Build and Deploy Jobs

Use `--standalone` so build artifacts are self-contained and can be passed between jobs:

```yaml
jobs:
  build:
    steps:
      - run: vercel pull --yes --environment=production
      - run: vercel build --prod --standalone
      - uses: actions/upload-artifact@v4
        with:
          name: vercel-build
          path: .vercel/output

  deploy:
    needs: build
    steps:
      - uses: actions/download-artifact@v4
        with:
          name: vercel-build
          path: .vercel/output
      - run: vercel deploy --prebuilt --prod
```

Without `--standalone`, the deploy job will fail because artifacts reference files outside `.vercel/output/`.

##### Capturing the Deploy URL

```bash
URL=$(vercel deploy --prod)   # stdout = URL, stderr = progress
```

##### Key Rules

1. Always use `--yes` to skip prompts
2. Always use `VERCEL_TOKEN` env var for auth
3. Use `--scope` if the token has access to multiple teams
4. Use `vercel build` + `vercel deploy --prebuilt` for deterministic builds
5. If something goes wrong, check `.vercel/` — `project.json` vs `repo.json` is the most common issue

### File: `upstream/references/comments.md`

#### Vercel Toolbar Comments

`vercel comments` reviews and manages existing Vercel Toolbar comment threads from the terminal. Create new threads with the Vercel Toolbar.

##### Review comment threads

Without a subcommand, `vercel comments` runs `list` and returns unresolved threads for the linked project. It filters by the current Git branch when the project resolves through the current checkout and a branch can be inferred.

```bash
vercel comments --json
vercel comments inspect <thread> --json
```

`list` has the alias `ls`, while `inspect` has the alias `get`. Commands that act on a thread accept its ID or full `vercel.com` comment URL. A URL supplies its team unless `--scope` or `--project` overrides it.

Use `--branch <branch>` or `--all-branches` to set branch scope explicitly. Other list filters include `--status`, `--page-path`, `--author`, `--content-id`, and `--search`. The `--author` option accepts user IDs or `me`, but not usernames. Resolving `me` requires user authentication.

##### Reply and update threads

```bash
vercel comments reply <thread> -m 'Fixed in **main**.'
vercel comments resolve <thread> -m 'Fixed in the latest deployment.'
vercel comments resolve <thread-1> <thread-2> --yes
vercel comments reopen <thread> --yes
```

`reply` accepts Markdown from `--message`, `--file`, or standard input. Use `--attach <url>` repeatedly to add up to 10 HTTPS attachments. Attachments can form a reply without message text; local file uploads are not supported.

`resolve` and `reopen` accept multiple threads. Pass `--yes` for bulk operations in non-interactive or JSON mode. A closing `--message` is supported only when resolving one thread. Bulk operations continue after an individual failure and return a nonzero exit status if any operation fails.

##### Edit or delete messages

Inspect a thread to find its message IDs before editing or deleting a message.

```bash
vercel comments edit <thread> <message-id> -m 'Updated wording'
vercel comments delete <thread> <message-id> --yes
```

Editing message content preserves its attachments. Deleting a message cannot be undone and requires `--yes` in non-interactive or JSON mode.

##### Use JSON output

Both `--json` and `--format json` produce JSON with every subcommand except `open`. JSON mode never prompts for missing input or confirmation.

```bash
vercel comments --json | jq '.threads[].id'
vercel comments inspect <thread> --format json
```

Use `vercel comments open <thread>` to open a thread on `vercel.com`; this subcommand does not support JSON output.

### File: `upstream/references/connectors.md`

#### Connectors

`vercel connect` manages connectors such as Slack apps. Vercel Connect is currently in beta, so behavior may change. Check `vercel connect --help` if a subcommand is unavailable.

##### Common Commands

```bash
vercel connect create slack --name my-bot
vercel connect create slack --name my-bot --triggers
vercel connect update <connector-id-or-uid> --icon ./logo.png --background-color '#1A2B3C' --accent-color '#FF0066'
vercel connect list --format=json
vercel connect list --all-projects
vercel connect list --type slack
vercel connect list --search linear --limit 10
vercel connect attach <connector-id-or-uid> -e production -e preview --yes
vercel connect detach <connector-id-or-uid> --yes
vercel connect token <connector-id-or-uid> --format=json
vercel connect open <connector-id-or-uid>
vercel connect remove <connector-id-or-uid> --disconnect-all --yes
```

##### `connect token` — Subject and Scopes

`--subject` selects whose token is returned. `--installation-id` targets a specific installation when the subject is `app`. `--scopes` is comma- or space-separated.

```bash
vercel connect token scl_abc123                                          # user token (default subject)
vercel connect token scl_abc123 --subject app                            # app token, default installation
vercel connect token scl_abc123 --subject app --installation-id inst_1   # app token, specific installation
vercel connect token scl_abc123 --scopes "chat:write,im:write"           # scoped token
vercel connect token scl_abc123 --yes                                    # open browser if auth/install needed
vercel connect token scl_abc123 --format=json                            # includes expiresAt, installationId
```

##### `connect attach` — Trigger Destinations

Pass `--triggers` to register the project as a webhook trigger destination. Use `--trigger-branch` and `--trigger-path` to override defaults.

```bash
vercel connect attach scl_abc123 --triggers                                                # default branch + /{service}
vercel connect attach scl_abc123 --triggers --trigger-branch staging --trigger-path /slack
vercel connect attach scl_abc123 --project my-app --triggers                               # different project
```

A connector accepts at most 3 trigger destinations. Use `--project <name-or-id>` on `attach`/`detach` when targeting a project other than the currently linked one.

Connector IDs look like `scl_...`; UIDs look like `slack/my-bot`. Either works wherever an `id` argument is accepted.

Connector tokens and trigger URLs can grant access to third-party systems. Do not print or store them unless the user explicitly needs that output.

### File: `upstream/references/container-registry.md`

#### Container Registry (VCR)

`vercel vcr` manages the Vercel Container Registry — a project-scoped registry for OCI/Docker images served from `vcr.vercel.com`. Every repository belongs to a Vercel project, so commands resolve the target project from the linked project or `--project` (`-p`). Run `vercel vcr --help` (or `vercel vcr <subcommand> --help`) for the current flag list.

A full image reference is:

```txt
vcr.vercel.com/<team-slug>/<project-slug>/<repository>:<tag>
vcr.vercel.com/<team-slug>/<project-slug>/<repository>@sha256:<digest>
```

##### Repositories

```bash
vercel vcr ls                                   # list repositories in the linked project (alias: list)
vercel vcr ls --project my-app --format json    # list for a specific project as JSON
vercel vcr inspect my-repository                # show one repository (alias: get)
vercel vcr add my-repository                    # create a repository (alias: create)
vercel vcr rm my-repository                     # delete a repository (aliases: remove, delete)
vercel vcr rm my-repository --yes               # delete without the confirmation prompt
```

##### Tags

```bash
vercel vcr tag ls my-app                                 # list a repository's tags (alias: tags; ls alias: list)
vercel vcr tag ls my-app --sort-by tag --sort-order asc  # sort (sort-by: updatedAt|tag, sort-order: asc|desc)
vercel vcr tag inspect my-app latest                     # show one tag (alias: get)
```

##### Images

```bash
vercel vcr image ls my-app                          # list images in a repository (alias: images; ls alias: list)
vercel vcr image ls my-app --untagged --format json # only images with no tags, as JSON
vercel vcr image inspect my-app img_abc123          # show one image incl. layer history (alias: get)
vercel vcr image rm my-app img_abc123               # delete an image (aliases: remove, delete)
vercel vcr image rm my-app img_abc123 --yes         # delete without the confirmation prompt
```

##### Login

`vercel vcr login <engine>` authenticates a local container tool with `vcr.vercel.com` by minting a short-lived project OIDC token and piping it to the engine over stdin (never logged, returned, or placed on the command line). The token logs in as username `oidc` and is valid for ~12 hours — re-run to refresh.

```bash
vercel vcr login docker                  # engine is required: docker | podman | buildah
vercel vcr login podman
vercel vcr login docker --project my-app # log in for a specific project
```

The engine argument is required (no default) and the binary must be installed and on your `PATH`; otherwise the command fails fast before any network work. Override the registry host with `VERCEL_VCR_REGISTRY` if needed.

Manual login without the CLI (equivalent, e.g. inside CI where an OIDC token is already present):

```bash
printf '%s' "$VERCEL_OIDC_TOKEN" | docker login vcr.vercel.com --username oidc --password-stdin
```

##### Push and Pull

Pushing/pulling is done with your container tool against the full image reference (there is no `vercel vcr push`). VCR creates the repository automatically on first push when the authenticated account has access to the project.

```bash
#### zstd compression is recommended for VCR
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  --output "type=image,name=vcr.vercel.com/team-slug/project-slug/my-repo:latest,push=true,oci-mediatypes=true,compression=zstd,compression-level=3,force-compression=true" \
  .

docker pull vcr.vercel.com/team-slug/project-slug/my-repo:latest
```

##### JSON and Non-Interactive Behavior

- Every subcommand supports `--format json` (`--format`/`--json` are validated together; conflicting values error).
- Destructive commands (`vcr rm`, `vcr image rm`) confirm interactively; pass `--yes` to skip.
- Errors are emitted as structured agent/JSON payloads (`{"status":"error","reason":"…","message":"…"}`) with a suggested `next` command, e.g. `MISSING_ARGUMENTS`, `INVALID_ARGUMENTS`, `ENGINE_NOT_FOUND`, `NOT_AUTHORIZED`.
- List commands paginate with `--limit` and `--cursor` (`-c`); pass the returned cursor to fetch the next page.

### File: `upstream/references/deployment.md`

#### Deployment

Ensure `.vercel/` exists before deploying (via `vercel link` or `vercel link --repo`).

##### Basic Usage

```bash
vercel                    # preview deployment (default)
vercel --prod             # production deployment
vercel --target staging   # custom environment
```

##### Prebuilt Deploy

Build locally, deploy the output — avoids remote builds:

```bash
vercel build --prod
vercel deploy --prebuilt --prod
```

If build and deploy run in **separate CI jobs**, use `--standalone` so artifacts are self-contained:

```bash
vercel build --prod --standalone
#### (upload .vercel/output/ as artifact, then in deploy job:)
vercel deploy --prebuilt --prod
```

##### Deploy Output

- **stdout**: The deployment URL (pipeable)
- **stderr**: Progress and errors

```bash
URL=$(vercel deploy --prod)
```

##### Forced Deploys And Build Cache

`vercel deploy --force` creates a new deployment even when Vercel would otherwise
reuse an existing result. For forced deploys, build cache is not retained unless
`--with-cache` is also provided.

Use this when you need a fresh preview build from the current local checkout:

```bash
vercel deploy . --target preview --force
```

For large repositories, retry with an archive if the CLI reports too many files:

```bash
vercel deploy . --target preview --force --archive=tgz
```

`vercel redeploy <url>` rebuilds an existing deployment, but it does not support
a no-cache flag. A manual CLI deploy is not the same as a Git integration
redeploy: it creates a new deployment from local source, so commit metadata,
aliases, source provenance, and dashboard grouping may differ from the original
Git-triggered deployment.

##### Accessing Preview Deployments

Use `vercel curl` — it handles deployment protection automatically:

```bash
vercel curl /api/health --deployment $PREVIEW_URL
```

**Do not disable deployment protection.** Use `vercel curl` instead.

##### Other Deploy Commands

- `vercel redeploy <url>` — rebuild an existing deployment; no no-cache flag
- `vercel promote <url>` — move a deployment to production without rebuilding
- `vercel rollback <url>` — revert to a previous deployment
- `vercel rolling-release` / `vercel rr` — gradual traffic shifting

##### Workflows

###### Blue/Green

```bash
URL=$(vercel --prod --skip-domain)   # deploy without domain assignment
vercel curl / --deployment $URL      # verify (handles deployment protection)
vercel promote $URL                  # promote to production
```

###### Rolling Release

```bash
vercel rr configure --enable --advancement-type=automatic --stage=10,5m --stage=50,10m
vercel rr start --dpl=<deployment-url> --yes
vercel rr fetch
```

See `references/project-infra.md` for approve, abort, and complete commands.

### File: `upstream/references/domains-and-dns.md`

#### Domains & DNS

##### Overview

- `vercel domains` — manage domain ownership and project assignment
- `vercel domains search` — discover available domains and registrar pricing
- `vercel domains check` — check registrar availability (single or bulk)
- `vercel domains price` — get registrar quotes (single or bulk)
- `vercel domains buy` — purchase a domain
- `vercel dns` — manage DNS records (when using Vercel nameservers)
- `vercel alias` — map deployment URLs to custom domains
- `vercel certs` — manage SSL certificates (usually auto-managed)

Most users only need `vercel alias` — domains and DNS are auto-configured when using Vercel nameservers.

##### Typical Flow

1. Add domain to your team, optionally assigning it to a project:
   - **Team only** — `vercel domains add example.com` adds the domain to your team without assigning a project (works from any directory).
   - **Assign to a project** — pass the project name as a second argument: `vercel domains add example.com my-project`.
   - **Linked directory** — one argument still adds to your team only; pass a project name as a second argument to assign it to a project.
2. Configure nameservers at registrar to point to Vercel
3. Deploy: `vercel --prod` (domain is auto-assigned)

Or manually alias: `vercel alias set <deployment-url> example.com`

##### Domain Discovery

###### Search

```bash
vercel domains search acme
vercel domains search acme --available --tld .com --limit 200
```

Search returns availability, purchase pricing, and renewal pricing in bulk. Use the continuation command printed by the CLI to fetch the next page.
`--limit` controls how many candidates are checked per page. `--available` filters that window, so a page can return fewer results than the limit.

###### Availability

```bash
vercel domains check example.com
vercel domains check one.com two.com three.com --format=json
```

###### Pricing

```bash
vercel domains price example.com
vercel domains price one.com two.com three.com --format=json
```

###### Notes

- `domains check` and `domains price` support up to 50 domains per request.
- If `domains price` doesn't output a purchase price for a given domain, the domain is unavailable. If you only need availability data, just use `domains check`. If you need both price and availability data, use `domains price` to fetch both at once.

##### Purchase

```bash
vercel domains buy example.com
```

```bash
vercel domains inspect example.com
vercel domains add example.com              # add to team
vercel domains add example.com my-project   # add to team and assign to a project
```

##### DNS Records

```bash
vercel dns ls                                          # list records across every domain on the scope
vercel dns ls example.com                              # list records for a single domain
vercel dns add example.com @ A 1.2.3.4
vercel dns add example.com sub CNAME target.example.com
vercel dns rm rec_abc123
```

Use `vercel <command> --help` for full flag details.

### File: `upstream/references/environment-variables.md`

#### Environment Variables

##### Scoping

Env vars are scoped to **environments**: production, preview (can be branch-specific), and development.

Variables can be plain text or sensitive (encrypted, not readable after creation).

##### Inspecting Env Vars

`vercel env ls` shows configured variable names, targets, and metadata. Plain values may appear in JSON output; sensitive values are not readable after creation.

For metadata-oriented investigations, start with:

```bash
#### Run from a linked project directory
vercel env ls --format json
vercel env ls production --format json
```

If CLI output does not include required metadata, use `vercel api` after checking available endpoints with `vercel api list`. Do not invent unsupported `env ls` scope/project flags; link or switch scope first when the command requires project context.

##### Managing Env Vars

```bash
vercel env add API_KEY production                              # interactive prompt for value
vercel env add API_KEY production --value "secret" --yes       # non-interactive
echo "secret" | vercel env add TOKEN production --yes          # pipe value from stdin
vercel env ls                                                  # list all
vercel env update API_KEY production --value "new-secret" --yes  # non-interactive update
vercel env rm API_KEY preview --yes                            # remove from preview
```

Note: `environment` is a **positional argument**, not a flag.

In non-interactive / agent mode, `env add` and `env update` require the value via `--value` or stdin. Without one of these, the command exits with an `action_required` payload asking you to re-run with `--value <value> --yes`.

##### Pulling Locally

```bash
vercel env pull                   # writes to .env.local
vercel env pull .env.development  # writes to custom file
```

The CLI adds `.env*` to `.gitignore` only when writing the default `.env.local`. Before using another filename, verify that source control excludes it.

`vercel pull` instead downloads environment data and project settings under `.vercel/`, including `.vercel/.env.<environment>.local`.

##### Running with Env Vars

Inject env vars into a subprocess without writing to a file:

```bash
vercel env run -- npm test
vercel env run -e preview -- next dev
```

The `--` separator is required before the command.

### File: `upstream/references/firewall.md`

#### Firewall

`vercel firewall` manages your project's [Web Application Firewall (WAF)](https://vercel.com/docs/vercel-firewall/vercel-waf). It provides multiple layers of protection:

- **Custom rules** — match requests by path, method, IP, geo, headers, cookies, and more, then deny, challenge, rate limit, log, bypass, or redirect them
- **IP blocks** — block specific IPs or CIDR ranges from accessing your project
- **System bypass** — exempt trusted IPs or CIDRs from all firewall checks (e.g., your office, CI servers, monitoring)
- **Attack mode** — emergency mode that challenges unverified visitors during an active attack (verified bots and crawlers are exempt)
- **System mitigations** — automatic DDoS protection that can be temporarily paused for debugging

##### Contents

- [Overview](#overview)
- [Status](#status)
- [Alerts](#alerts)
- [Persistent Actions](#persistent-actions)
- [Custom Rules](#custom-rules)
- [IP Blocks](#ip-blocks)
- [System Bypass](#system-bypass)
- [Attack Mode](#attack-mode)
- [System Mitigations](#system-mitigations)
- [Publishing](#publishing)
- [Agent Usage](#agent-usage)
- [Anti-Patterns](#anti-patterns)

##### Overview

```bash
vercel firewall overview                              # full firewall summary
vercel firewall overview --json                       # JSON output
vercel firewall diff                                  # show unpublished draft changes
vercel firewall diff --json                           # JSON diff
```

`overview` renders the configuration block described under [Status](#status) and then adds the last 24 hours beneath it: requests by action, the busiest rules, and any alerts raised in that window. The activity section needs Observability Plus and a team scope; without either, the configuration block is reported on its own.

##### Status

```bash
vercel firewall status                                # configuration in execution order
vercel firewall status --json                         # JSON, including the request pipeline
```

Reports what is configured, in the order a request meets it: bypass, system mitigations, attack mode, IP blocks, custom rules, bot protection, AI bots, then OWASP. Use it to answer "what is on, and what does a bypass skip" without also querying traffic.

`--json` adds `requestFlow`, the stages in order with what each one skips, and `bypasses`, the bypass kinds with the stages they skip. Two fields explain an absent value rather than leaving it `null`: `bypassUnavailable` when the plan does not include IP Bypass, and `owasp.requiresUpgrade` when OWASP is off because the plan cannot enable it rather than because it is disabled.

##### Alerts

```bash
vercel firewall alerts list                           # active and resolved alerts (last 24h)
vercel firewall alerts list --since 7d                # last 7 days
vercel firewall alerts list --json                    # JSON: { active, resolved }
vercel firewall alerts inspect al_abc123              # window, rates, sparkline, IPs, hosts
vercel firewall alerts inspect al_abc123 --json       # JSON detail
```

Lists DDoS and other firewall anomaly alerts from both the alerts API and legacy attack-status history. Default window matches `overview` (last 24 hours). `--since` / `--until` accept relative times (`7d`, `24h`) or ISO dates.

`inspect` takes an alert id from the list (`al_…` or the constructed legacy id). It fetches the alert first, then one traffic timeseries and one events request in parallel. Traffic and events need Observability Plus; without it the header still prints.

##### Persistent Actions

```bash
vercel firewall persistent-actions list                 # last hour
vercel firewall persistent-actions list --since 6h      # last 6 hours
vercel firewall persistent-actions list --limit 50      # more rows (default 10)
vercel firewall persistent-actions list --json          # JSON: { actions, shown, total }
vercel firewall persistent-actions inspect 51.158.168.18 --host vercel.com --action challenge
vercel firewall persistent-actions inspect 51.158.168.18 --json
```

Lists persistent WAF actions (challenge/deny against a client IP) from the last hour by default. `--since` / `--until` accept relative times (`1h`, `6h`) or ISO dates.

`inspect` takes an IP from the list. `--host` and `--action` disambiguate when the same IP appears more than once; otherwise the most recent match is shown. Traffic charts need Observability Plus; without it the header still prints.

##### Custom Rules

[Custom rules](https://vercel.com/docs/vercel-firewall/vercel-waf/custom-rules) let you define precise traffic policies based on request attributes. Use them to block abusive traffic, rate limit APIs, challenge suspicious requests, redirect legacy paths, or log traffic for monitoring.

Rule changes are staged as drafts — run `vercel firewall publish --yes` to make them live.

###### Viewing rules

```bash
vercel firewall rules list                            # table of all rules
vercel firewall rules list --expand                   # show conditions and actions
vercel firewall rules list --json                     # JSON for scripting
vercel firewall rules inspect "My Rule"               # full detail of a single rule
vercel firewall rules inspect "My Rule" --json        # JSON detail
```

###### Creating rules

Four modes (mutually exclusive):

```bash
#### AI — interactive only, blocked for agents/scripts
vercel firewall rules add --ai "Rate limit /api to 100 requests per minute by IP"

#### Interactive wizard — interactive only
vercel firewall rules add

#### Flags — works in scripts and agents
vercel firewall rules add "Block bots" \
  --condition '{"type":"user_agent","op":"sub","value":"crawler"}' \
  --action deny --yes

#### JSON — full rule payload, works in scripts and agents
vercel firewall rules add --json '{"name":"Block bots","conditionGroup":[{"conditions":[{"type":"user_agent","op":"sub","value":"crawler"}]}],"action":{"mitigate":{"action":"deny"}}}' --yes
```

###### Multiple conditions (AND) and OR groups

```bash
#### AND — multiple --condition flags in the same group
vercel firewall rules add "Secure admin" \
  --condition '{"type":"path","op":"pre","value":"/admin"}' \
  --condition '{"type":"geo_country","op":"eq","neg":true,"value":"US"}' \
  --action deny --yes

#### OR — use --or to start a new group
vercel firewall rules add "Block methods" \
  --condition '{"type":"method","op":"eq","value":"DELETE"}' \
  --or \
  --condition '{"type":"method","op":"eq","value":"PATCH"}' \
  --action challenge --yes
```

###### Editing rules

```bash
vercel firewall rules edit "My Rule"                                    # interactive editor
vercel firewall rules edit "My Rule" --ai "change action to challenge"  # AI (interactive only)
vercel firewall rules edit "My Rule" --action challenge --yes           # change action
vercel firewall rules edit "My Rule" --name "New Name" --yes            # rename
vercel firewall rules edit "My Rule" --enabled --yes                    # enable
vercel firewall rules edit "My Rule" --disabled --yes                   # disable
vercel firewall rules edit "My Rule" --condition '{"type":"path","op":"pre","value":"/new"}' --yes  # replace conditions
```

###### Managing rules

```bash
vercel firewall rules enable "My Rule"                # enable a disabled rule
vercel firewall rules disable "My Rule"               # disable without removing
vercel firewall rules remove "My Rule" --yes          # delete (aliases: rm, delete)
vercel firewall rules reorder "My Rule" --first --yes # move to highest priority
vercel firewall rules reorder "My Rule" --last --yes  # move to lowest priority
vercel firewall rules reorder "My Rule" --position 3 --yes  # move to position (1-based)
```

Rules are evaluated in priority order (top to bottom). Use `reorder` to control which rules are checked first.

###### Conditions

Each `--condition` is a JSON object:

```json
{
  "type": "path",          // condition type (required)
  "op": "pre",             // operator (required)
  "value": "/api",         // value (required for most operators, omit for ex/nex)
  "key": "Authorization",  // key (required for header, cookie, query types)
  "neg": true              // negate the condition (optional, default false)
}
```

Conditions within a group are **AND'd**. Multiple groups (separated by `--or`) are **OR'd**.

###### Operators

| Operator | Meaning | Value | Negated form |
|----------|---------|-------|--------------|
| `eq` | Equals | string | `neq` or `neg: true` |
| `sub` | Contains | string | `neg: true` |
| `pre` | Starts with | string | `neg: true` |
| `suf` | Ends with | string | `neg: true` |
| `re` | Matches regex | string | `neg: true` |
| `ex` | Exists | none | `nex` |
| `inc` | Is any of | array or comma-separated | `ninc` |
| `gt` | Greater than | number | `neg: true` |
| `gte` | Greater or equal | number | `neg: true` |
| `lt` | Less than | number | `neg: true` |
| `lte` | Less or equal | number | `neg: true` |

###### Condition types

| Type | Description | Needs `key` |
|------|-------------|-------------|
| `path` | URL path | No |
| `raw_path` | Pre-rewrite URL path | No |
| `target_path` | Post-rewrite destination path | No |
| `route` | Route pattern (e.g., /blog/[slug]) | No |
| `server_action` | Next.js Server Action name | No |
| `method` | HTTP method (GET, POST, etc.) | No |
| `host` | Request hostname | No |
| `protocol` | HTTP protocol version | No |
| `scheme` | http or https | No |
| `environment` | preview or production | No |
| `region` | Vercel edge region | No |
| `rate_limit_api_id` | Rate limit API grouping ID | No |
| `ip_address` | Client IP or CIDR range | No |
| `user_agent` | User-Agent string | No |
| `geo_country` | Country code (ISO 3166-1 alpha-2) | No |
| `geo_continent` | Continent code (AF, AN, AS, EU, NA, OC, SA) | No |
| `geo_country_region` | State or region code | No |
| `geo_city` | City name | No |
| `geo_as_number` | Autonomous System Number | No |
| `header` | HTTP request header | **Yes** |
| `cookie` | HTTP cookie | **Yes** |
| `query` | URL query parameter | **Yes** |
| `ja4_digest` | JA4 TLS fingerprint | No |
| `ja3_digest` | JA3 TLS fingerprint — legacy, prefer ja4 (Enterprise teams only) | No |
| `bot_name` | Verified bot name (Security Plus projects only) | No |
| `bot_category` | Verified bot category (Security Plus projects only) | No |

###### Actions

| Action | Description | Extra flags |
|--------|-------------|-------------|
| `deny` | Block request (403) | `--duration` |
| `challenge` | Show verification page | `--duration` |
| `log` | Log without blocking | `--duration` |
| `bypass` | Skip other rules | `--duration` |
| `rate_limit` | Throttle requests | `--rate-limit-window`, `--rate-limit-requests`, `--rate-limit-keys`, `--rate-limit-algo`, `--rate-limit-action`, `--duration` |
| `redirect` | Redirect to URL | `--redirect-url`, `--redirect-permanent` |

**Durations (Pro/Enterprise only):** `1m`, `5m`, `15m`, `30m`, `1h` — makes the action persistent for the matched client. A `deny` with `--duration 30m` blocks the client for 30 minutes. A `challenge` with `--duration 30m` challenges once and grants a 30-minute pass. Without a duration, the action is evaluated per-request.

###### Rate limit example

```bash
vercel firewall rules add "Rate limit API" \
  --condition '{"type":"path","op":"pre","value":"/api"}' \
  --action rate_limit \
  --rate-limit-window 60 \
  --rate-limit-requests 100 \
  --rate-limit-keys ip \
  --rate-limit-action deny \
  --yes
```

- `--rate-limit-window` — time window in seconds (10–3600)
- `--rate-limit-requests` — max requests per window (1–10,000,000)
- `--rate-limit-keys` — what to count by: `ip` (default), `ja4`. `header:<name>` is Enterprise only (repeatable)
- `--rate-limit-algo` — algorithm: `fixed_window` (default), `token_bucket` (Enterprise only)
- `--rate-limit-action` — what happens when a client exceeds the limit: `rate_limit` returns 429 (default), `deny` returns 403, `challenge` shows verification page, `log` logs without blocking

###### Redirect example

```bash
vercel firewall rules add "Redirect old path" \
  --condition '{"type":"path","op":"eq","value":"/old"}' \
  --action redirect \
  --redirect-url "/new" \
  --redirect-permanent \
  --yes
```

- `--redirect-url` — destination URL or path (must start with `/`, `http://`, or `https://`)
- `--redirect-permanent` — permanent redirect (301). Default: temporary (307)

###### JSON rule schema

For `--json` mode, the full rule structure:

```json
{
  "name": "Rule name (max 160 chars)",
  "description": "Optional description (max 256 chars)",
  "active": true,
  "conditionGroup": [
    {
      "conditions": [
        { "type": "path", "op": "pre", "value": "/api" },
        { "type": "method", "op": "inc", "value": ["POST", "PUT"] }
      ]
    },
    {
      "conditions": [
        { "type": "ip_address", "op": "eq", "value": "1.2.3.4" }
      ]
    }
  ],
  "action": {
    "mitigate": {
      "action": "rate_limit",
      "actionDuration": "1h",
      "rateLimit": {
        "algo": "fixed_window",
        "window": 60,
        "limit": 100,
        "keys": ["ip"],
        "action": "rate_limit"
      },
      "redirect": null
    }
  }
}
```

##### IP Blocks

[IP blocking](https://vercel.com/docs/vercel-firewall/vercel-waf/ip-blocking) lets you block specific IP addresses or CIDR ranges from accessing your project entirely. Use for known malicious IPs, abuse sources, or to restrict access to specific networks.

IP block changes are staged as drafts — run `vercel firewall publish --yes` to make them live.

```bash
vercel firewall ip-blocks list                                          # list all blocked IPs
vercel firewall ip-blocks list --json                                   # JSON output
vercel firewall ip-blocks block 1.2.3.4 --yes                          # block an IP on all hosts
vercel firewall ip-blocks block 10.0.0.0/24 --hostname example.com --yes  # block CIDR on specific host
vercel firewall ip-blocks block 1.2.3.4 --notes "Abuse report #123" --yes  # block with a note
vercel firewall ip-blocks unblock 1.2.3.4 --yes                        # unblock by IP
vercel firewall ip-blocks unblock 1.2.3.4 --hostname example.com --yes # unblock scoped to hostname (when same IP blocked on multiple hosts)
vercel firewall ip-blocks unblock ip_abc123 --yes                      # unblock by rule ID
```

##### System Bypass

[System bypass rules](https://vercel.com/docs/vercel-firewall/vercel-waf/system-bypass-rules) exempt trusted IPs or CIDR ranges from all firewall checks. Use for your office IP, CI/CD servers, uptime monitors, or other trusted infrastructure that should never be blocked. Supports wildcard domains.

Takes effect immediately — no publishing required.

```bash
vercel firewall system-bypass list                                      # list all bypass rules
vercel firewall system-bypass list --json                               # JSON output
vercel firewall system-bypass add 10.0.0.1 --yes                       # bypass for an IP
vercel firewall system-bypass add 10.0.0.0/24 --yes                    # bypass for a CIDR range
vercel firewall system-bypass add 10.0.0.1 --domain example.com --yes  # bypass scoped to a domain
vercel firewall system-bypass add 10.0.0.1 --domain "*.example.com" --yes  # bypass with wildcard domain
vercel firewall system-bypass add 10.0.0.1 --notes "Office IP" --yes   # bypass with a note
vercel firewall system-bypass remove 10.0.0.1 --yes                    # remove bypass
```

##### Attack Mode

[Attack Challenge Mode](https://vercel.com/docs/vercel-firewall/attack-challenge-mode) is an emergency response for active attacks. When enabled, unverified visitors see a verification challenge page before accessing your site. Verified bots and search crawlers are exempt. Use when you're under a DDoS attack or experiencing a surge of malicious traffic.

Takes effect immediately — no publishing required. **Requires interactive confirmation — blocked for agents/scripts due to the severity of enabling this.**

```bash
vercel firewall attack-mode enable --duration 1h --yes   # challenge all visitors for 1 hour
vercel firewall attack-mode enable --duration 6h --yes   # for 6 hours
vercel firewall attack-mode enable --duration 24h --yes  # for 24 hours
vercel firewall attack-mode disable --yes                # stop challenging visitors
```

##### System Mitigations

Vercel automatically [mitigates DDoS attacks](https://vercel.com/docs/vercel-firewall/ddos-mitigation) and filters malicious traffic. In rare cases (debugging false positives, testing), you may need to temporarily pause these protections.

Takes effect immediately — no publishing required. Automatically resumes after 24 hours. **Requires interactive confirmation — blocked for agents/scripts due to the severity of pausing DDoS protection.**

```bash
vercel firewall system-mitigations pause --yes           # pause DDoS protection (24h)
vercel firewall system-mitigations resume --yes          # resume DDoS protection
```

##### Publishing

Rule and IP block changes are staged as drafts. Use `diff` to review, then `publish` or `discard`.

```bash
vercel firewall diff                                  # review staged changes
vercel firewall publish --yes                         # push all draft changes to production
vercel firewall discard --yes                         # throw away all draft changes
```

##### Agent Usage

- **Pass `--yes`** for commands that prompt for confirmation (rule/IP block mutations, publish, discard)
- **Publish after staging rules/IP blocks**: `vercel firewall publish --yes`
- **Use `--json` for structured output**: `vercel firewall rules list --json`, `vercel firewall alerts list --json`, `vercel firewall persistent-actions list --json`
- Project must be linked first (`vercel link`)

##### Anti-Patterns

- **Forgetting `--yes`** — non-interactive commands fail without it
- **Not publishing** — rule and IP block changes stay as drafts until `vercel firewall publish --yes`
- **Using `--ai` for custom rules in scripts/agents** — blocked; use `--json` or `--condition` flags instead
- **Broad deny rules** — a deny rule with a loose condition (e.g., path starts with `/`) will block all traffic. Review with `vercel firewall rules inspect` before publishing

### File: `upstream/references/flags.md`

#### Feature Flags

`vercel flags` manages [Vercel Flags](https://vercel.com/docs/flags/vercel-flags) for the linked project.

`--help` is the source of truth for options and examples. Run `vercel flags --help` for the current subcommand list and `vercel flags <cmd> --help` before using a subcommand. The map below routes by task and carries no options on purpose.

##### Subcommand Map

```bash
#### Read
vercel flags list                 # flags in the project (alias: ls)
vercel flags inspect <flag>       # kind, variants, what each environment serves
vercel flags versions <flag>      # revision history (subcommands: list, diff)
vercel flags evaluations <flag>   # evaluation metrics

#### Change what an environment serves
vercel flags set <flag>           # serve one variant (all kinds)
vercel flags enable <flag>        # boolean shortcut for true
vercel flags disable <flag>       # boolean shortcut for false
vercel flags use-targeting <flag> # enable targeting for an environment

#### Targeting
vercel flags split <flag>         # weighted traffic split across variants
vercel flags rollout <flag>       # staged rollout from one variant to another
vercel flags rules <flag>         # targeting rules (subcommands: list, add, update, remove, move)
vercel flags segments             # reusable audience segments (subcommands: list, inspect, create, update, remove)

#### Lifecycle
vercel flags create <flag>        # new flag (alias: add)
vercel flags update <flag>        # variant values and labels
vercel flags archive <flag>       # required before rm
vercel flags unarchive <flag>
vercel flags rm <flag>            # delete an archived flag (alias of remove)

#### Tooling
vercel flags sdk-keys             # SDK keys (subcommands: list, add, remove)
vercel flags prepare              # flag definition fallbacks for builds outside Vercel
vercel flags override             # encrypt or decrypt a vercel-flag-overrides cookie token
vercel flags open [flag]          # open the dashboard
```

##### CLI Contracts

- Flags commands need a linked project. Confirm the target with `vercel project inspect --non-interactive` first (see `SKILL.md`).
- Use `--json` where a subcommand offers it and parse only stdout.
- Commands that ask for confirmation (`archive`, `unarchive`, `rm`, `sdk-keys rm`, and others that list `--yes` in `--help`) need `--yes` in non-interactive runs.

##### Flags SDK Skill

Everything flags-specific lives in the `flags-sdk` skill (`npx skills add vercel/flags@flags-sdk`): declaring flags with `flag()` and `vercelAdapter`, matching a CLI flag key to the `key` in code, `identify()` entities and the `--by` / `--condition` attribute contract, adopting a flag that already exists (`inspect` first), lifecycle and production safety, `FLAGS` / `FLAGS_SECRET`, `prepare`, and `override`. Use that skill for those topics; this reference does not repeat them.

### File: `upstream/references/getting-started.md`

#### Getting Started

##### Install

```bash
npm i -g vercel
```

##### First-Time Setup

1. **Authenticate** - `vercel login` opens a browser/device flow. For CI, use the `VERCEL_TOKEN` environment variable instead. Wait for deliberate user completion when a browser flow starts.
2. **Link your project** - `vercel link` for a working-directory project or `vercel link --repo` for repository directory mappings. Both create files under `.vercel/`.
3. **Verify the target** - from the intended working directory, run `vercel project inspect --non-interactive` and confirm its owner and project. Stop on `link_required` or a mismatch rather than linking automatically. `vercel whoami --format json` identifies the authenticated user and effective team, not the linked project.
4. **Pull local data** - `vercel pull` writes project settings and environment data under `.vercel/`, including `.vercel/.env.<environment>.local`. Use `vercel env pull` to write `.env.local` or another file that is already excluded from source control.
5. **Dev or deploy** - `vercel dev` starts a local server; `vercel --prod` deploys to production.

##### Project Linking

Project resolution starts from the command's working directory:

- **`<cwd>/.vercel/project.json`**: This exact working-directory link takes precedence. A root single-project link is not generally inherited by arbitrary subdirectories.
- **`<repo-root>/.vercel/repo.json`**: The deepest configured directory containing the working directory wins.
- **No matching repo directory**: Interactive repo resolution prompts. Non-interactive repo resolution currently selects the sole configured repo project or remains unresolved when multiple projects exist. Commands that set up projects may then enter a linking flow.

An app subdirectory only identifies a project when the repo mapping covers it. Verify the result with `vercel project inspect --non-interactive` before operating on the project.

Read-only inspection can trigger login or team SAML re-authentication, open a browser/device flow, and wait for approval. Ask the user to complete the flow before retrying or continuing.

### File: `upstream/references/global-options.md`

#### Global Options

Key flags available on every `vercel` command:

- `--help` / `-h` — show help for the command
- `--debug` / `-d` — enable debug output
- `--cwd DIR` — override working directory
- `--scope SCOPE` — set team context
- `--team SLUG` — deprecated alias for `--scope`; avoid in new commands
- `--token TOKEN` — auth token (prefer `VERCEL_TOKEN` env var instead)
- `--api URL` — override the API base URL (defaults to the public Vercel API)
- `--non-interactive` — suppress interactive prompts (auto-set when an agent is detected and stdin is not a TTY)

`--yes` / `-y` is **not** a global flag. It is declared per command on the subset that confirm mutations (`env rm`, `domains rm`, `blob delete-store`, `routes delete`, etc.). Always check the command's help to see whether `--yes` is accepted.

`--non-interactive` is auto-set only when an agent is detected and stdin is not a TTY. Plain CI without agent detection does **not** get this default; pass `--non-interactive` explicitly when scripting. Use `--non-interactive=false` to override the agent default.

Even with `--non-interactive`, commands that perform a confirmed mutation still require `--yes` separately.

For machine-readable output, prefer `--format json` where a command documents it; the boolean `--json` is deprecated on commands that also support `--format`.

Prefer `VERCEL_TOKEN` env var over `--token` to avoid leaking secrets in shell history.

### File: `upstream/references/integrations.md`

#### Integrations

##### What Are Integrations?

Integrations are third-party services provisioned through the Vercel Marketplace and automatically connected to your project via environment variables. Categories include: AI, Agents, Analytics, Authentication, CMS, Code Review, Code Security, Commerce, DevTools, Experimentation, Flags, Logging, Messaging, Monitoring, Observability, Payments, Productivity, Searching, Security, Storage, Support Agent, Testing, Video, Web Automation, and Workflow.

##### When to Recommend an Integration

- **The project needs a database** — Postgres, MySQL, Redis, etc. → `vercel integration add`
- **The project needs a KV store, blob storage, or other managed service** → `vercel integration add`
- **The user is manually setting env vars for a third-party service that's available on the Marketplace** — an integration handles provisioning and env var injection automatically
- **The user wants to add observability, logging, or error tracking** → check the Marketplace

The key benefit: integrations automatically provision the resource AND inject the right environment variables into your project. No manual env var setup needed.

**When in doubt about flags or subcommands, use `--help`:**

```bash
vercel integration -h                              # list subcommands
vercel integration add -h                          # flags for add
vercel ir -h                                       # integration-resource subcommands
```

##### Discovering Integrations

The Marketplace organizes integrations by category. For category-shaped user intent ("monitoring", "storage", "commerce", "ai"), prefer `--category <slug>` over substring search — it returns the canonical set rather than relying on description text matching.

```bash
#### Step 1: list valid category slugs
vercel integration categories                          # slugs + titles
vercel integration categories --json                   # machine-readable

#### Step 2: filter discover by category
vercel integration discover --category storage
vercel integration discover --category monitoring
vercel integration discover -c ai                      # shorthand
vercel integration discover <query> --category <slug>  # combine substring + filter

#### Specific integration by name (substring across slug/name/description)
vercel integration discover postgres
vercel integration discover sentry

#### Full catalog (rare — usually narrow first)
vercel integration discover
vercel integration discover --format=json
```

**Rule:** when the user describes a category-shaped need ("I need a database", "set up monitoring", "build me a store"), run `vercel integration categories` first to get the canonical slug, then `discover --category <slug>`. This is more accurate than substring search, which misses integrations whose description doesn't contain the exact keyword (e.g., "monitoring" search misses an integration described as "Observability").

##### Accepting Terms (Install Without a Resource)

Some integrations require accepting marketplace legal terms before the team can install them. `accept-terms` installs the integration at the account/team scope without provisioning a product resource. Requires an interactive terminal and human confirmation.

```bash
vercel integration accept-terms <integration>
vercel integration accept-terms neon
vercel integration accept-terms neon --format=json
```

##### Listing Installations

`installations` lists every marketplace integration installation on the team (account scope). Useful for finding installation/configuration IDs needed by `update` and `add --installation-id`.

```bash
vercel integration installations                          # all installations on the team
vercel integration installations --integration neon       # filter by integration slug
vercel integration installations --format json            # JSON output
```

##### Adding an Integration

```bash
vercel integration add <slug>                      # install and provision
vercel integration add <slug>/<product>            # specific product (multi-product integrations)
vercel integration add <slug> --name my-db         # custom resource name
```

The CLI prompts for product selection when multiple products exist and no `/<product>` slug is given (errors in non-TTY — specify the product slug). Billing plan uses `--plan` or server default (no prompt). Metadata uses `-m` flags or server defaults (no prompt). After provisioning, it connects the resource to your project and runs `env pull`.

`vercel install <slug>` (or `vercel i <slug>`) is an alias — behaves identically.

**Browser fallback:** The CLI may open a browser in two cases: (1) first-time install requiring terms acceptance — the CLI polls and resumes automatically once the user accepts, so do not kill the process; and (2) non-provisionable integrations — the CLI exits with code 1, inform the user they need to finish in the browser.

###### Environments

```bash
vercel integration add <slug> -e production            # specific environment
vercel integration add <slug> -e production -e preview # multiple (repeatable)
```

Defaults to all environments (production, preview, development).

###### Metadata

Some integrations require configuration during provisioning (e.g., region, database version):

```bash
vercel integration add <slug> -m region=us-east-1
vercel integration add <slug> -m region=us-east-1 -m version=16
```

###### Plans

```bash
vercel integration add <slug> --plan <plan-id>         # specific billing plan
vercel integration add <slug> -p <plan-id>             # shorthand
```

###### Other Flags

```bash
vercel integration add <slug> --no-connect             # skip connecting to project (also skips env pull)
vercel integration add <slug> --no-env-pull            # skip env pull only
vercel integration add <slug> --prefix NEON2_          # prefix env var names (e.g., NEON2_DATABASE_URL)
vercel integration add <slug> --installation-id <id>   # use specific installation (multi-installation)
vercel integration add <slug> --format=json            # output as JSON
```

##### Listing Resources

Alias: `vercel integration ls`

```bash
vercel integration list                                # resources for linked project
vercel integration list --all                          # all resources across the team
vercel integration list -i <slug>                      # filter by integration
vercel integration list <project>                      # resources for a specific project
vercel integration list --format=json                  # as JSON
```

##### Opening Dashboards

```bash
vercel integration open <integration>                  # open integration dashboard (SSO)
vercel integration open <integration> <resource>       # open specific resource dashboard
vercel integration open <integration> --format=json    # get SSO link as JSON
```

##### Disconnecting

Use `vercel integration-resource` (alias: `vercel ir`):

```bash
vercel ir disconnect <resource>                        # disconnect from current project
vercel ir disconnect <resource> <project>              # disconnect from specific project
vercel ir disconnect <resource> --all                  # disconnect from all projects
vercel ir disconnect <resource> --yes                  # skip confirmation
```

Disconnecting removes environment variables from the project but does not delete the resource.

**Note:** `--format=json` requires `--yes` on destructive commands (`ir disconnect`, `ir remove`, `integration remove`) — the CLI rejects JSON output with interactive prompts.

##### Billing

Only applies to integrations with prepayment-type billing plans. Returns "no balance info available" for integrations without prepayment billing.

```bash
vercel integration balance <slug>                      # show balance and thresholds
vercel integration balance <slug> --format=json        # as JSON
vercel ir create-threshold <resource> <minimum> <spend> <limit>
vercel ir create-threshold <resource> <minimum> <spend> <limit> --yes  # skip confirmation
```

Threshold parameters (dollar amounts, e.g., `50 100 500`):
- **minimum** — balance floor; auto-replenish triggers when balance drops below this
- **spend** — replenishment amount added when minimum is hit
- **limit** — hard spending cap

Works for both resource-level and installation-level thresholds (CLI auto-detects).

##### Guides

```bash
vercel integration guide <slug>                        # show setup guide
vercel integration guide <slug> --framework nextjs     # framework-specific (-f shorthand)
vercel integration guide <slug>/<product>              # specific product
```

After installing, pull credentials to `.env.local`:

```bash
vercel env pull                                        # pulls to .env.local
```

This runs automatically after `vercel integration add` (unless `--no-env-pull`).

##### Updating an Installation

`update` changes the billing plan or which projects can access an installation. Install / remove / connect flows live elsewhere (`integration add`, `integration remove`, `integration-resource ...`).

```bash
vercel integration update <integration> --projects all                                  # grant all team projects access
vercel integration update neon --projects prj_abc --projects prj_def                    # limit to specific projects
vercel integration update acme --plan pro                                               # change billing plan
vercel integration update neon --installation-id icfg_xxx --projects all                # select an installation when several exist
vercel integration update acme --plan pro --authorization-id auth_xxx                   # provide billing authorization
vercel integration update neon --projects all --format=json                             # JSON output
vercel integration update neon --projects all --non-interactive                         # JSON-on-stdout success/error
```

Use `vercel integration installations` to find the right `--installation-id` when multiple marketplace installations exist for the same integration.

##### Removing Resources

Alias: `vercel ir rm`

```bash
vercel ir remove <resource>                            # delete (must not be connected)
vercel ir remove <resource> --disconnect-all           # disconnect all projects, then delete
vercel ir remove <resource> --disconnect-all --yes     # skip confirmation
```

**This permanently deletes the resource from the provider. Cannot be undone.**

##### Uninstalling an Integration

```bash
vercel integration remove <slug>                       # uninstall (all resources must be deleted first)
vercel integration remove <slug> --yes                 # skip confirmation
```

###### Cleanup Workflow

```bash
vercel integration list --all -i <slug>                # find all resources
vercel ir remove <resource-1> --disconnect-all --yes   # delete each resource
vercel ir remove <resource-2> --disconnect-all --yes
vercel integration remove <slug> --yes                 # then uninstall
```

### File: `upstream/references/local-development.md`

#### Local Development

##### Prerequisites

1. **Link your project** - use `vercel link` for the current directory or `vercel link --repo` for repository directory mappings.
2. **Verify the target** - run `vercel project inspect --non-interactive` from the directory where you will run development commands and confirm the reported owner and project. Stop on `link_required` or a mismatch rather than linking automatically. `vercel whoami --format json` reports authentication and team context, not the project.
3. **Pull local data** - use `vercel pull` for project settings and environment data under `.vercel/`, or `vercel env pull` for `.env.local` or another file that is already excluded from source control.

Inspection and pull commands can trigger login or team SAML re-authentication. If a browser/device flow opens, wait for the user to complete it deliberately.

##### Usage

```bash
vercel dev                           # default: 0.0.0.0:3000
vercel dev --listen 8080             # custom port
vercel dev --listen 127.0.0.1:5000   # custom host and port
```

##### Related Commands

- `vercel link` - connect the current directory to a Vercel project. Use `--repo` for repository directory mappings.
- `vercel project inspect --non-interactive` - report the resolved existing project's owner and settings without entering a linking flow.
- `vercel pull` - download project settings and environment data to `.vercel/`, including `.vercel/.env.<environment>.local`.
- `vercel env pull` - download environment variables to `.env.local` or another ignored file, not project settings.
- `vercel init` - scaffold a new project from a Vercel example.
- `vercel open` - open the Vercel dashboard for the linked project.

With `repo.json`, the deepest configured directory containing the working directory wins. If no mapping matches, interactive repo resolution prompts; non-interactive repo resolution currently selects the sole configured project or remains unresolved when multiple projects exist. Commands that set up projects may then enter a linking flow, so do not infer the target from the app directory alone.

### File: `upstream/references/microfrontends.md`

#### Microfrontends

Split a large application into independently deployable units that render as one cohesive app. The default app hosts `microfrontends.json` and serves unmatched requests; child apps declare `routing` path patterns.

##### Quick Start

```bash
vercel mf create-group    # create a group and add projects
vercel mf pull            # pull microfrontends.json for local dev
vercel mf proxy           # start the local dev proxy
```

##### Managing Groups

###### Create

```bash
vercel microfrontends create-group                   # interactive
vercel mf create-group --non-interactive \           # fully scripted
  --name "my-group" \
  --project web \
  --project docs \                                   # repeatable
  --default-app web \
  --default-route / \
  --project-default-route docs=/docs \               # required per non-default project
  --yes                                              # skip confirmation
```

> `--non-interactive` is blocked when adding projects would exceed the free tier limit — the user must confirm billing changes interactively.

###### Inspect

Returns project names, frameworks, git repos, and root directories. Useful for automating `microfrontends.json` generation.

```bash
vercel mf inspect-group                              # interactive group selection
vercel mf inspect-group --group="my-group"           # specific group
vercel mf inspect-group --group="my-group" --format=json  # machine-readable
```

###### Add / Remove Projects

Run from the project directory.

```bash
vercel mf add-to-group                               # interactive
vercel mf add-to-group --group="my-group" --default-route=/docs

vercel mf remove-from-group                          # interactive
vercel mf remove-from-group --yes                    # non-interactive: skips all confirmations
```

`add-to-group` requires an interactive terminal. `remove-from-group` runs non-interactively when `--yes` is passed; `--yes` skips the project-link prompt, the "still referenced in microfrontends.json" confirmation, and the final removal confirmation.

After removing, update `microfrontends.json` in the default app to remove the project's entry. **The default app cannot be removed via the CLI** — change the default app in the Vercel Dashboard first, then `remove-from-group` works on the formerly-default project.

###### Delete Group

Irreversible. All projects are removed from the group automatically.

```bash
vercel mf delete-group                               # interactive
vercel mf delete-group --group="my-group" --yes      # non-interactive
```

##### `pull`

Downloads `microfrontends.json` from the default application. Required in polyrepo setups. Requires CLI 44.2.2+.

```bash
vercel microfrontends pull
vercel mf pull --dpl <deployment-url>
```

##### Local Development

The local proxy routes requests to running apps and falls back to production for others. Default port: `3024`.

###### Monorepo (Turborepo)

The proxy starts automatically via `turbo` (requires turbo ≥ 2.3.6 or ≥ 2.4.2):

```bash
turbo run dev --filter=web
```

###### Without Turborepo

```json
{
  "scripts": {
    "dev": "next dev --port $(microfrontends port)",
    "proxy": "microfrontends proxy microfrontends.json --local-apps web"
  }
}
```

Run both scripts simultaneously.

###### Polyrepo

```bash
vercel mf pull                                       # fetch microfrontends.json
next dev --port $(microfrontends port)               # start your app
microfrontends proxy --local-apps your-app-name      # start proxy
```

Alternatively, set `VC_MICROFRONTENDS_CONFIG=/path/to/microfrontends.json` instead of pulling.

###### `microfrontends proxy`

```bash
microfrontends proxy [configPath] --local-apps web docs   # multiple local apps
microfrontends proxy --port 4001                          # override port
```

###### `microfrontends port`

Prints the auto-assigned dev port for the current app (deterministic, based on app name):

```bash
next dev --port $(microfrontends port)
```

##### Deployment

Each app deploys independently. Routing is controlled by `microfrontends.json` deployed with the default app — config changes only take effect once the default app is deployed to production.

##### Anti-Patterns

- **Using `--non-interactive` when billing limits are exceeded**: The CLI blocks this — run interactively instead.
- **Skipping `vercel mf pull` in polyrepo**: Without `microfrontends.json` locally, the proxy can't route correctly.
- **Forgetting to update `microfrontends.json` after `remove-from-group`**: Leaving the entry causes routing errors on the next default app deployment.
- **Running `add-to-group` in CI**: It requires an interactive terminal — use the Vercel Dashboard instead. `remove-from-group` and `delete-group` both accept `--yes` and can run non-interactively.
- **Trying to remove the default app**: The CLI refuses. Change the default app in the Vercel Dashboard, then remove the formerly-default project.
- **Deploying only the child app after config changes**: Changes to `microfrontends.json` only take effect when the default app is deployed.

### File: `upstream/references/monitoring-and-debugging.md`

#### Monitoring & Debugging

##### Diagnostic Ladder

For production issues, start broad and narrow with bounded commands:

1. Identify project and scope.
2. List recent deployments: `vercel list <project> --scope <team> --status READY --format json`.
3. Inspect the relevant deployment: `vercel inspect <deployment-url>`.
4. Check logs for a bounded window: `vercel logs --deployment <deployment-url> --since 1h --limit 100 --json`.
5. If metrics are available, inspect schema first, then query a relevant metric with a bounded time window and group-by.
6. If logs or metrics are unavailable, report the permission, subscription, retention, or no-data limitation and use deployments, activity, or inspect output as fallback evidence.

##### Build Failure Ladder

For deployment build failures, start from deployment evidence before source
control exploration:

1. Inspect deployment metadata: project, team/scope, branch, commit, target,
   status, timestamp, and aliases.
2. Inspect build logs with `vercel inspect <deployment-url> --logs`.
3. Capture install command, package manager version, build command,
   monorepo/Turbo scope, restored build cache ID, and the first fatal error.
4. Reduce the first fatal error before chasing warnings.
5. If source is implicated, inspect only the app/package files, lockfile, build
   config, and files named in the trace.
6. Compare with a nearby successful deployment of the same project: commit,
   cache ID, install command, package manager version, build command, package
   scope, and source provenance.
7. Separate proven root cause from likely trigger.

For branch-specific failures, "other branches pass" does not by itself disprove
the root cause. Compare cache IDs, install graphs, lockfile/package diffs, build
command, package scope, and source provenance before explaining why one branch
fails.

Use confidence language in conclusions:

- Logs prove `<root cause>`.
- Branch comparison shows `<facts>`.
- Likely trigger is `<hypothesis>`.
- Not yet proven is `<remaining uncertainty>`.
- Validate by `<specific redeploy/test/check>`.

Useful discovery commands:

```bash
vercel logs --help
vercel metrics --help
vercel metrics schema --format=json
vercel metrics schema <metric-or-prefix> --format=json
vercel activity --help
vercel activity types --format json --scope <team>
vercel usage --help
vercel httpstat /api/health --deployment <deployment-url>
```

##### Logs

`vercel logs` reads runtime log entries by default; `vercel logs requests` reads CDN request records (status, method, cache result, path) and excludes background function executions. Each run returns a bounded result and exits: by default the latest 100 records from the last 30 minutes, newest first.

```bash
vercel logs                                                         # recent runtime logs for the linked project
vercel logs --deployment <deployment-url>                           # one deployment
vercel logs --environment production --query 'level:error'          # production errors
vercel logs --query 'level:(error OR warning) AND timeout' --since 2h
vercel logs --query 'requestId:"<request-id>"' --json               # what one request logged
vercel logs requests --query 'httpStatus >= 500 AND httpStatus < 600' --since 1h
vercel logs requests --query 'requestPath:*checkout* AND cacheResult:MISS'
vercel logs --next <cursor>                                         # continue a previous query
```

Filter with `--query` (KQL-inspired: `field:value`, `field:(a OR b)`, `field != value`, `field:*text*`, `AND`/`OR`/`NOT`, and numeric comparisons for requests). `vercel logs runtime --help` and `vercel logs requests --help` list the common fields. The `--level`, `--source`, `--status-code`, `--request-id`, and `--search` flags were removed; express them as query fields. `--branch` and `--expand` were dropped without a replacement; full messages are shown by default. Select a deployment with `--deployment`, not a positional argument. Without `--deployment` or `--environment`, logs cover every environment of the project. Only team-owned projects are supported. Older CLI versions use different flags; check `vercel logs --help` first.

Set `--since` and `--until` to the affected window.

With `--json` (implied by `--non-interactive` and in agents), output is JSON Lines: one `{"type":"log"|"request","data":{...}}` line per record, optional `warning` lines, and a final `summary` line with `recordsReturned`, `timeRange`, `pagination: { hasMore, next }`, and `excludedIntervals`. Read fields under `.data`, for example `jq 'select(.type == "log") | .data.message'`. Before concluding that something did not happen, check `pagination.hasMore` and `excludedIntervals`. To read more, pass `pagination.next` to `--next` rather than raising `--limit` or widening the window; the cursor keeps the original target, filter, and window, and only `--limit` can change.

CDN request history beyond the plan's free window, and filters on fields that need Observability Plus or a Priority project, fail with an access error that names the requirement. Report that as an entitlement limit, not as missing traffic.

##### Metrics

Inspect schema before querying unfamiliar metrics. Use bounded time windows and group limits when grouping results.

```bash
vercel metrics schema                                                    # list available metrics
vercel metrics schema vercel.function_invocation                         # inspect a metric prefix
vercel metrics vercel.function_invocation.count --since 1h               # query linked project
vercel metrics vercel.function_invocation.count -f "http_status ge 500" --group-by error_code --since 1h --format=json
vercel metrics vercel.function_invocation.request_duration_ms -a avg --group-by route --since 1h
vercel metrics --all vercel.function_invocation.count --group-by project_id --since 24h
```

##### Inspecting Deployments

```bash
vercel inspect <url>               # deployment details
vercel inspect <url> --wait        # wait for completion
vercel inspect <url> --logs        # show build logs
```

If a redeploy is meant to validate a build-cache or branch-specific hypothesis,
inspect or wait until the new deployment reaches `Ready` or `Error`; do not stop
at `Building` unless the user only asked to start the deployment.

##### `vercel curl` — Access Preview Deployments

Use the existing authorized Vercel CLI session to read the exact preview deployment after confirming project and environment access. Keep deployment protection in effect.

```bash
vercel curl /api/health --deployment $PREVIEW_URL
vercel curl /api/data --deployment $PREVIEW_URL -- -X POST -d '{"key":"value"}'
```

**Do not disable deployment protection.** Use `vercel curl` instead.

##### Finding Regressions

`vercel bisect` performs a binary search across deployments to find which one introduced a problem:

```bash
vercel bisect --good <url> --bad <url> --path /api/users
vercel bisect --run ./test-script.sh    # automated testing
```

##### Cache

```bash
vercel cache purge --type cdn --yes      # purge CDN cache
vercel cache invalidate --tag mytag --yes # invalidate by cache tag
```

See `references/project-infra.md` for destructive cache deletion and other project infrastructure commands.

### File: `upstream/references/monorepos.md`

#### Monorepos on Vercel

Vercel auto-detects monorepo tools (Turborepo, Nx) and workspace managers (pnpm, Yarn, npm). Each project in the monorepo gets its own Vercel project, linked via `vercel link --repo`.

##### Quick Start

```bash
vercel link --repo    # link the whole repo
vercel project inspect --non-interactive # verify the selected owner and project
vercel pull                             # pull settings and env data into .vercel/
vc dev                                  # local development
vercel deploy                           # deploy
```

##### Linking

Use `vercel link --repo` to create `.vercel/repo.json`, which maps directories to Vercel projects:

```json
{
  "orgId": "org_xxxxx",
  "projects": [
    { "id": "prj_xxxxx", "name": "web", "directory": "apps/web" },
    { "id": "prj_yyyyy", "name": "api", "directory": "apps/api" }
  ]
}
```

The deepest configured directory containing the working directory wins. If no mapping matches, interactive repo resolution prompts among the configured projects; non-interactive repo resolution currently selects the sole configured project or remains unresolved when multiple choices exist. Commands that set up projects may then enter a linking flow. Being inside an app directory does not by itself verify the target, so run `vercel project inspect --non-interactive` and stop on `link_required` or a mismatch before consequential commands.

##### Root Directory

Set `rootDirectory` in `vercel.json` when your app isn't at the repo root:

```json
{
  "rootDirectory": "apps/api"
}
```

##### Turborepo

Turborepo requires an explicit `build` task. Define it in `turbo.json`:

```json
{
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "env": ["VERCEL"],
      "outputs": [".next/**", "!.next/cache/**", ".vercel/output/**", "dist/**"]
    }
  }
}
```

Vercel automatically generates the right build command — you don't need to configure it. If you need a manual override in `vercel.json`:

```json
{
  "buildCommand": "turbo run build --filter={packages/my-app}..."
}
```

###### turbo-ignore

Vercel auto-sets `npx turbo-ignore` as the "Ignored Build Step" command, which skips builds when a project's dependencies haven't changed.

##### Nx

Nx requires a build target. Define it in `nx.json`:

```json
{
  "targetDefaults": {
    "build": {
      "dependsOn": ["^build"]
    }
  }
}
```

##### Example: Turborepo + pnpm + Hono

```
root/
├── turbo.json
├── package.json
├── pnpm-workspace.yaml
├── vercel.json
├── apps/
│   └── api/
│       ├── package.json
│       └── server.ts
└── packages/
    └── shared/
        ├── package.json
        └── src/index.ts
```

**pnpm-workspace.yaml:**

```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

**vercel.json:**

```json
{
  "rootDirectory": "apps/api"
}
```

**apps/api/server.ts:**

```typescript
import { Hono } from 'hono';
import { greet } from '@repo/shared';

const app = new Hono();
app.get('/', c => c.text(greet('world')));

export default app;
```

##### Anti-Patterns

- **Using `vercel link` instead of `vercel link --repo`**: Creates `project.json` which only tracks one project. Use `--repo` for monorepos.
- **Missing `build` task in turbo.json/nx.json**: Vercel requires an explicit build task. Without it, the build fails.
- **Adding a `build` script to package.json for transpilation**: Vercel handles TypeScript compilation. The turbo.json `build` task is for orchestration, not transpilation.
- **Assuming an app directory proves project context**: Verify the resolved owner and project with `vercel project inspect --non-interactive`. `vercel whoami --format json` reports authentication and team context, not the linked project.

### File: `upstream/references/node-backends.md`

#### Node Backends on Vercel

Vercel supports Node.js backend frameworks as first-class apps. Express and Hono are the most common, but Fastify, Elysia, NestJS, H3, and Koa are also supported. Your app is the entrypoint — not the `api/` folder. No rewrites, no build scripts. Just export your app and deploy.

##### Quick Start

```bash
#### Express
npm init -y && npm i express
#### Create server.ts that exports default app
vc dev       # local development
vc deploy    # deploy
```

##### How It Works

1. Vercel detects the framework from `package.json` dependencies
2. Finds your entrypoint file (must import the framework)
3. Introspects your routes automatically — no `vercel.json` rewrites needed
4. Bundles and deploys as a single Lambda

##### Entrypoint Detection

Vercel searches for these filenames (in order): `app`, `index`, `server`, `main`, `src/app`, `src/index`, `src/server`, `src/main`

With these extensions: `.js`, `.cjs`, `.mjs`, `.ts`, `.cts`, `.mts`

The preferred entrypoint filename is `server.ts`. The file must import the framework (`import express from 'express'`, `import { Hono } from 'hono'`, etc.).

We recommend using `export default` for the app instance, but calling `.listen()` also works.

##### Minimal Express App

```
my-app/
├── package.json
└── server.ts
```

**package.json:**

```json
{
  "type": "module",
  "dependencies": {
    "express": "5.1.0"
  }
}
```

**server.ts:**

```typescript
import express from 'express';

const app = express();

app.get('/', (_req, res) => {
  res.send('Hello Express!');
});

export default app;
```

##### Minimal Hono App

**package.json:**

```json
{
  "type": "module",
  "dependencies": {
    "hono": "^4.8.9"
  }
}
```

**server.ts:**

```typescript
import { Hono } from 'hono';

const app = new Hono();

app.get('/', c => {
  return c.text('Hello Hono!');
});

export default app;
```

##### Local Development

Run `vc dev` from the project root. Vercel runs your app directly with TypeScript support. No `dev` script is required, though you can add one if you prefer.

Static files in `public/` are served automatically.

##### Configuration

Most apps need zero configuration. Optional `vercel.json` settings:

```json
{
  "functions": {
    "server.ts": {
      "includeFiles": "views/**/*"
    }
  }
}
```

##### Anti-Patterns

- **Putting routes in `api/` folder**: Your framework IS the app. Define routes in your app code, not as separate files in `api/`.
- **Adding `vercel.json` rewrites**: Routes are introspected automatically from your app. Rewrites are not needed.
- **Adding a `build` script**: Vercel handles TypeScript compilation and bundling. Don't add a build script for transpilation — it's not needed and can cause issues.

### File: `upstream/references/platform-ops.md`

#### Platform Operations

Use these commands for account, billing, alerting, and CLI-level operations. Prefer `--format json` where supported for automation.

##### Alerts

```bash
vercel alerts                                      # linked-project alerts
vercel alerts --all --format json                  # team-wide alerts
vercel alerts --type usage_anomaly --type error_anomaly
vercel alerts inspect <group-id> --format json
```

Alert rules live under `vercel alerts rules`; inspect `vercel alerts rules --help` before creating or changing rules.

##### Usage, Contracts, and Purchases

```bash
vercel usage --help
vercel usage --from 2026-05-01 --to 2026-05-08 --breakdown daily
vercel usage --group-by project --format json
vercel contract
vercel buy --help
```

Billing and purchase commands can change paid account state. Get explicit user confirmation before running mutations such as `vercel buy ...`.

##### Tokens

```bash
vercel tokens ls --format json
vercel tokens add "CI deploy" --format json
vercel tokens rm <token-id>
```

Prefer `VERCEL_TOKEN` for automation. Do not print token values unless the user explicitly needs them and understands the exposure.

##### Telemetry and CLI Maintenance

```bash
vercel telemetry status
vercel telemetry enable
vercel telemetry disable
vercel upgrade
vercel whoami --format json
```

`vercel upgrade` changes the installed global CLI. Prefer the project-pinned CLI or package-manager invocation when one exists, unless the user asked to update a global install.

##### Other Account Commands

```bash
vercel activity --help
vercel teams --help
```

If an account operation is not available through a first-class command, use `vercel api` as a fallback.

### File: `upstream/references/project-infra.md`

#### Project Infrastructure

Use these commands for infrastructure attached to a Vercel project: cache, cron jobs, deploy hooks, Git connections, Edge Config, redirects, custom environments, and rolling releases.

##### Cache

```bash
vercel cache purge --type cdn --yes
vercel cache invalidate --tag mytag --yes
vercel cache dangerously-delete --tag old-data --yes
```

`dangerously-delete` is destructive. Confirm intent before running it.

##### Cron Jobs

```bash
vercel crons ls --format json
vercel crons add --path /api/cron --schedule "0 10 * * *"
vercel crons run /api/cron
```

`vercel crons add` writes to `vercel.json`; do not run it when the user only asked for inspection.

##### Deploy Hooks

```bash
vercel deploy-hooks ls --format json
vercel deploy-hooks create cms-rebuild --ref main
vercel deploy-hooks rm <hook-id> --yes
```

Deploy hook URLs can trigger deployments. Treat them as secrets when presenting output.

##### Git Connection

```bash
vercel git connect
vercel git connect https://github.com/user/repo.git
vercel git disconnect --yes
```

Verify the linked project and scope before changing Git connections.

##### Edge Config

```bash
vercel edge-config ls --format json
vercel edge-config add flags --items '{"enabled":true}' --format json
vercel edge-config get flags --format json
vercel edge-config items flags --format json
vercel edge-config update flags --patch '{"items":[{"operation":"upsert","key":"enabled","value":false}]}' --format json
vercel edge-config tokens flags --add read-only --format json
vercel edge-config rm flags --yes
```

Token values and config contents may be sensitive. Avoid broad dumps unless needed.

##### Redirects and Routing

Use `references/routing.md` for route-rule syntax. Redirect-specific commands are available under `vercel redirects`:

```bash
vercel redirects ls
vercel redirects add /old /new --status 308
vercel redirects list-versions
vercel redirects promote <version-id> --yes
```

Routing and redirect changes have separate command groups. Route changes are staged before `vercel routes publish`; redirect changes use redirect versions and promotion.

##### Custom Environments

```bash
vercel target ls --format json
vercel buy addon customEnvironment 2 --project my-app --yes
vercel buy addon customEnvironment 0 --project my-app --yes
vercel pull --environment=<target>
vercel --target=<target>
```

`vercel target` lists custom environments for the linked project. `vercel buy addon customEnvironment` updates purchased custom environment capacity for a project via `POST /v1/projects/custom-environments/settings`. Quantity is in packs; each pack adds 5 environments. Use `--project` when the target project is not linked in the current directory. Set quantity to `0` to remove purchased capacity. Aliases include `custom-environment` and `custom-environments`. `deploy` and `build` accept `--target`; `pull` accepts `--environment` (not `--target`).

##### Rolling Releases

```bash
vercel rr configure --enable --advancement-type=automatic --stage=10,5m --stage=50,10m
vercel rr start --dpl=<deployment-url> --yes
vercel rr fetch
vercel rr approve --currentStageIndex=0 --dpl=<deployment-id>
vercel rr abort --dpl=<deployment-id>
vercel rr complete --dpl=<deployment-id>
```

There is no `vercel rr status` command; use `vercel rr fetch` for current details.

### File: `upstream/references/projects-and-teams.md`

#### Projects & Teams

##### Projects

```bash
vercel project ls                    # list projects
vercel project ls --filter my-app    # substring search by name
vercel project add my-project        # create project
vercel project inspect my-app        # inspect project
vercel project rm my-app             # remove project
```

##### Deployments

```bash
vercel list                          # list deployments
vercel list --status READY           # filter by status
vercel list -m gitBranch=main        # filter by metadata
vercel inspect <url>                 # deployment details
vercel remove <name|id>              # remove deployments
vercel remove my-app --safe          # skip aliased deployments
```

`vercel list` returns one page of 20 and supports cursor pagination with `--next`; do not assume it accepts `--limit`. Use project, scope, status, environment, and metadata filters to keep deployment lists focused, or use `vercel api` when a strict page size is required.

##### Teams

```bash
vercel whoami --format json          # current user and effective team
vercel teams ls                      # list teams
vercel teams switch                  # interactive team picker
vercel teams switch my-team          # switch by slug
vercel teams invite user@example.com # invite member
```

##### Discovering Scope

Use these commands when the user has not specified a team or project and the task is read-only:

```bash
vercel whoami --format json
vercel teams ls --format json
vercel project ls --scope <team-slug> --format json
vercel list <project-name> --scope <team-slug> --status READY --format json
```

Use explicit scope after selecting or inferring the team:

```bash
vercel project inspect <project-name> --scope <team-slug>
vercel list <project-name> --scope <team-slug> --status READY --format json
```

Do not conclude that no projects or deployments exist after checking only one relevant scope. If several plausible targets remain, ask the user to choose from the candidates found. Avoid broad enumeration across unrelated teams unless the user asked for account-wide investigation.

##### Scoping

Use `--scope` on any command to target a specific team. `--team` exists for compatibility but is deprecated.

```bash
vercel deploy --scope my-team
```

### File: `upstream/references/routing.md`

#### Routing Rules

##### Overview

`vercel routes` manages project-level routing rules. Each rule matches requests by path pattern and optional conditions (headers, cookies, query parameters), then applies an action (rewrite, redirect, set status) or modifies headers and query parameters.

Routing rules take effect immediately without a deployment and take precedence over routes defined in your deployment configuration (`vercel.json`, `next.config.js`, etc.).

Each routing rule has a unique name within the project, used to identify it in `edit`, `delete`, `enable`, `disable`, and `reorder` commands. Rules are evaluated in priority order (top to bottom). Use `reorder` to control placement.

All changes are staged as drafts. Run `vercel routes publish` to push staged changes to production.

##### Viewing Routing Rules

```bash
vercel routes list                       # all routing rules
vercel routes list --diff                # staged changes vs production
vercel routes inspect "My Route"         # full details of a specific rule
```

##### Creating Routing Rules

Use `--ai` with a natural language description to generate routing rules with AI. For full control, use flags or interactive mode.

###### Source path (`--src` and `--src-syntax`)

Use `--src` to specify the path pattern and `--src-syntax` to control how it's interpreted:

| Syntax | Example | When to use |
|--------|---------|-------------|
| `regex` | `^/api/(.*)$` | Full regex control. |
| `path-to-regexp` | `/api/:path*` | Express-style named params. More readable. |
| `equals` | `/about` | Exact string match. Simplest option. |

Defaults to `regex` if `--src-syntax` is not specified. `path-to-regexp` and `equals` paths must start with `/`.

###### Actions

Each routing rule can have at most one primary action:

| Action | Required flags | Description |
|--------|---------------|-------------|
| `rewrite` | `--dest` | Proxy to destination URL (transparent to the client) |
| `redirect` | `--dest` + `--status` (301/302/307/308) | Redirect the client to a new URL |
| `set-status` | `--status` (100-599) | Return a status code (no destination) |

A routing rule without a primary action can still set response headers or apply request transforms.

###### Conditions

Conditions control when a routing rule matches. Use `--has` to require something is present, and `--missing` to require it is absent. Supported types are `header`, `cookie`, `query`, and `host`. Conditions are repeatable, up to 16 per rule.

```bash
#### Existence check
--has "cookie:session"
--missing "header:Authorization"

#### Value matching
--has "header:X-API-Key:eq=my-secret"          # exact match
--has "cookie:theme:contains=dark"              # value contains substring
--has "header:Accept:re=application/json.*"     # regex match
--missing "query:debug:eq=true"                 # must NOT have debug=true

#### Host matching (no key, just value)
--has "host:eq=example.com"
```

###### Response headers & request transforms

Response headers, request headers, and request query parameters can each be set, appended to, or deleted. All flags are repeatable.

```bash
--set-response-header "Cache-Control=public, max-age=3600"
--append-request-header "X-Forwarded-Host=myapp.com"
--delete-request-query "debug"
```

###### Examples

```bash
#### AI — describe what you want
vercel routes add --ai "Rewrite /api/* to https://backend.example.com/*"

#### Interactive — guided builder with prompts
vercel routes add

#### Rewrite with path-to-regexp syntax and a request header
vercel routes add "API Proxy" \
  --src "/api/:path*" --src-syntax path-to-regexp \
  --action rewrite --dest "https://api.example.com/:path*" \
  --set-request-header "X-Forwarded-Host=myapp.com" --yes

#### Redirect with status
vercel routes add "Legacy Redirect" \
  --src "/old-blog" --src-syntax equals \
  --action redirect --dest "/blog" --status 301 --yes

#### Routing rule with conditions and a description
vercel routes add "Auth Required" \
  --src "/dashboard/:path*" --src-syntax path-to-regexp \
  --action redirect --dest "/login" --status 307 \
  --missing "cookie:session" \
  --description "Redirect unauthenticated users to login" --yes
```

##### Editing Routing Rules

```bash
#### AI — describe the changes
vercel routes edit "My Route" --ai "Add CORS headers and change to 308 redirect"

#### Interactive — choose which fields to modify
vercel routes edit "My Route"

#### Change specific fields
vercel routes edit "My Route" --dest "https://new-api.example.com/:path*" --yes
vercel routes edit "My Route" --action redirect --dest "/new" --status 301 --yes
vercel routes edit "My Route" --name "New Name" --yes
```

##### Managing Routing Rules

Use `vercel routes list` or `inspect` to find routing rule names and IDs.

```bash
vercel routes enable "My Route"           # enable a disabled routing rule
vercel routes disable "My Route"          # disable without removing
vercel routes delete "My Route"           # delete a routing rule
vercel routes reorder "My Route" --position start           # move to top
vercel routes reorder "My Route" --position end             # move to bottom
vercel routes reorder "My Route" --position after:<id>      # move after another
vercel routes reorder "My Route" --position before:<id>     # move before another
```

##### Publishing & Versioning

```bash
vercel routes publish                    # promote staged changes to production
vercel routes discard-staging            # discard all staged changes
vercel routes list-versions              # view version history
vercel routes restore <version-id>       # roll back to a previous version
```

### File: `upstream/references/sandbox.md`

#### Sandbox

`vercel sandbox` forwards to the Sandbox CLI for project-scoped sandbox environments. Run `vercel sandbox --help` for the current list; the subcommands below are wired through `sandbox/index.ts`.

##### Subcommands

```bash
vercel sandbox list                                                              # list sandboxes (alias: ls)
vercel sandbox create                                                            # create a sandbox
vercel sandbox create --connect                                                  # create and immediately open a shell
vercel sandbox run -- node -e "console.log('hi')"                                # create + run a command in one step
vercel sandbox exec <sandbox-id> -- npm test                                     # execute a command in an existing sandbox
vercel sandbox connect <sandbox-id>                                              # interactive shell (aliases: ssh, shell)
vercel sandbox copy ./local.txt <sandbox-id>:/tmp/                               # copy files (alias: cp)
vercel sandbox stop <sandbox-id>                                                 # stop one or more sandboxes (aliases: rm, remove)
vercel sandbox config network-policy <sandbox-id> --network-policy deny-all      # update sandbox network policy
vercel sandbox snapshot <sandbox-id> --stop                                      # take a filesystem snapshot (sandbox is stopped)
vercel sandbox snapshots list                                                    # list snapshots (subcommand group: list/get/delete)
vercel sandbox login                                                             # log in to the Sandbox CLI
vercel sandbox logout                                                            # log out of the Sandbox CLI
```

Use `--` to separate the sandbox command from arguments forwarded to the sandbox process (as in `run`, `exec`).

`sandbox config` is a subcommand group; the only configurable surface today is `network-policy`. `sandbox snapshot` requires `--stop` because snapshotting stops the sandbox first. `sandbox snapshots` (plural) is a separate subcommand group that manages existing snapshots (`list`, `get`, `delete`).

##### Auth Forwarding

Global Vercel flags `--scope` / `--team` / `--token` are forwarded to the Sandbox CLI. For automation, set `VERCEL_TOKEN`; the CLI maps it to `VERCEL_AUTH_TOKEN` for Sandbox.

Sandbox commands may create external compute or interactive sessions. Confirm intent before creating or connecting to a sandbox.

### File: `upstream/references/security.md`

#### Security

`vercel security` reads the current team's security posture. `vercel security check` runs the Security Dashboard checks, and `vercel security vulnerabilities` lists and triages Security Review findings. Both need a team scope; run `vercel switch` or pass `--scope <team>` when none is selected.

##### Vulnerabilities

Security Review reports vulnerabilities it finds in a team's code. Use `vercel security vulnerabilities` to read and triage them from the terminal.

```bash
vercel security vulnerabilities                                   # open, Production and most severe first
vercel security vulnerabilities --project my-app --git-branch main
vercel security vulnerabilities inspect my-app/12                 # summary, description, and suggested fix
```

Each vulnerability has a reference, `<project>/<number>` or `<owner>/<repo>/<number>`. `inspect`, `dismiss`, and `reopen` accept the reference or the vulnerability ID.

`list` is the default subcommand. Filter with `--project`, `--environment`, `--git-branch`, `--severity`, `--status` (default `open`; `all` for every status), and `--query`. Results are paginated: follow the printed next-page command, or pass the `pagination.next` cursor from `--json` output to `--next`. List output omits descriptions and fixes, so `inspect` a vulnerability before acting on it.

If Security Review isn't enabled for the team, the command fails and says so. Which vulnerabilities you can see and change depends on the team role.

###### Fix a vulnerability

1. `inspect` it and confirm the issue is still present on its branch.
2. Make the smallest fix, then run the project's type checks, lint, and tests.
3. Push the fix to the same branch. A later review closes the vulnerability when it no longer detects the issue.

`closed` means a later review no longer detects the issue, not that a fix was verified. Severity is an AI-generated estimate, so judge each finding against the application.

###### Dismiss or reopen

```bash
vercel security vulnerabilities dismiss my-app/12 --reason false-positive
vercel security vulnerabilities dismiss my-app/12 --reason accepted-risk --message "Internal tool behind SSO"
vercel security vulnerabilities reopen my-app/12
```

Dismissing records a decision for the team. Dismiss only when the user asks or agrees, not to clear a vulnerability you haven't fixed. `dismiss` requires `--reason` in non-interactive runs and with `--json`. Closed vulnerabilities can't be dismissed or reopened.

##### Checks

```bash
vercel security                          # same as vercel security check
vercel security check --findings         # list findings under every check
vercel security check pats-no-expiration # run one check and list its findings
vercel security check --project my-app
```

Each check reports a risk, a status (`failing`, `passing`, `muted`, `no access`, or `error`), and violation and muted counts. In non-interactive runs, `check` writes JSON to stdout. A failing check still exits 0, so gate CI on the report contents, not the exit code.

##### Sensitive output

Check reports include member emails, token names, and project settings. Vulnerabilities include source code and how to exploit it. Keep both out of shared logs, issues, and pull request comments.

##### Docs

- https://vercel.com/docs/cli/security
- https://vercel.com/docs/agent/security-review/usage

### File: `upstream/references/storage.md`

#### Blob Storage

`vercel blob` manages Vercel Blob storage — simple file storage for uploading, listing, and deleting files.

```bash
vercel blob put ./image.png --access public                            # upload (public)
vercel blob put ./image.png --access private --pathname images/photo.png  # custom path (private)
vercel blob put ./large.zip --access public --multipart                # large files
vercel blob get <url-or-pathname> --access public                      # download to stdout
vercel blob get <url-or-pathname> --access private --output ./out.bin  # save to file
vercel blob list                                                       # list blobs
vercel blob list --prefix images/                                      # filter by prefix
vercel blob del <url-or-pathname>                                      # delete
vercel blob copy <from-url> <to-pathname> --access public              # copy
```

`--access` is **required** on `put`, `copy`, and `get`. Valid values: `public` or `private`. The CLI errors out with `Missing required --access flag` if it is omitted.

##### Auth Modes

`vercel blob` reads credentials from **local sources only**. It does not look up the linked project's connected store at runtime — even in a linked project, running a `blob` command without local credentials fails with `No Vercel Blob credentials found`. Resolution order (`getBlobRWToken` in `util/blob/token.ts`):

1. `--rw-token <token>` flag — read/write token.
2. `--oidc-token <token>` + `--store-id <id>` flags — must be passed together; `--store-id` accepts the ID with or without the `store_` prefix.
3. `BLOB_READ_WRITE_TOKEN` env var, **or** `VERCEL_OIDC_TOKEN` + `BLOB_STORE_ID` env vars (process env).
4. The same variables loaded from `.env.local` in the current working directory.
5. Otherwise: error.

```bash
vercel blob put ./image.png --access public --rw-token "$BLOB_READ_WRITE_TOKEN"
vercel blob put ./image.png --access public --oidc-token "$VERCEL_OIDC_TOKEN" --store-id store_abc123
```

To use a linked project's Blob store without an explicit token, link the project and pull the credentials into `.env.local` first:

```bash
vercel link
vercel env pull              # writes BLOB_READ_WRITE_TOKEN (or OIDC vars) to .env.local
vercel blob put ./image.png --access public
```

##### Authentication

Every `vercel blob` command needs credentials for **one specific store**. There are two mutually exclusive modes:

| Mode | Credentials | Use for |
| --- | --- | --- |
| **Read-write token** | `BLOB_READ_WRITE_TOKEN` (encodes the store id) | scripts, CI, anything non-interactive — it is long-lived |
| **OIDC** | `VERCEL_OIDC_TOKEN` **and** `BLOB_STORE_ID` together | local dev against a linked project — the token is **short-lived** |

Resolution order (first match wins):

1. **Explicit flags.** `--rw-token <token>`, or `--oidc-token <jwt> --store-id <store_…>`. The two OIDC flags must be passed **together** — passing only one is an error, not a fallback to the RW token.
2. **Environment** (`process.env`, then `.env.local`). In each source: if exactly one of `VERCEL_OIDC_TOKEN` / `BLOB_STORE_ID` is set it's a hard error (partial OIDC config is never silently downgraded); if both are set → OIDC; else if `BLOB_READ_WRITE_TOKEN` is set → RW token.
3. **Linked project.** Run `vercel link` (or `vercel env pull`) in a folder linked to a project that has a Blob store connected, and the credentials are pulled into `.env.local` for you.

```bash
#### Non-interactive / CI — prefer the read-write token
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_… vercel blob list

#### OIDC — store id comes from BLOB_STORE_ID, no --store-id flag needed
VERCEL_OIDC_TOKEN=… BLOB_STORE_ID=store_… vercel blob list
```

> **`VERCEL_OIDC_TOKEN` is short-lived and refreshes.** Do **not** hard-code it into a script or `.env` you keep around — a captured value stops working once it expires. For anything long-running or automated, use `BLOB_READ_WRITE_TOKEN` instead.

##### Store Management

```bash
vercel blob create-store my-store --access private                    # create a new store
vercel blob get-store <store-id>                                      # show store details
vercel blob delete-store <store-id> --yes                             # remove a store
vercel blob empty-store --yes                                         # delete all blobs in the selected store
vercel blob list-stores --all --json                                  # list every team store as JSON
vercel blob list-stores --no-projects                                 # hide the Projects column in table output
```

##### `--non-interactive`

`--non-interactive` is a global flag (see `global-options.md`) that tells every `vercel blob` command to never prompt. It is **auto-set when an agent is detected on a non-TTY stdin**, so agents normally get this behavior without passing the flag; pass `--non-interactive=false` to force prompts even under agent detection.

In this mode a command never blocks on input. Anything it would otherwise prompt for becomes a fail-fast, structured JSON error on stdout (`{"status":"error","reason":"…","message":"…"}`, usually with a suggested `next` command) and a non-zero exit — it neither hangs nor silently guesses:

- **`reason: "missing_arguments"`** — a required value that is normally prompted is absent. E.g. `create-store` without a name or `--access`, or `get-store` / `delete-store` without a store id. Pass the value as an argument/flag instead.
- **`reason: "confirmation_required"`** — an action needs explicit consent: the destructive `delete-store` and `empty-store`, and `create-store` when it would link the new store to the current project. Pass `--yes` to confirm up front (or `--environment` to choose link targets for `create-store`).

`--yes` and `--non-interactive` are **independent**: `--non-interactive` suppresses prompts but never implies consent, so the commands above still require `--yes`. `--yes` is declared per command (only the ones that confirm a mutation); `--non-interactive` is global. Read-only/idempotent commands (`list`, `get`, `list-stores`) just run — `list-stores` skips its interactive store picker rather than prompting — and `del` deletes immediately with no confirmation.

```bash
#### Agent / CI: supply every required value as a flag, and --yes for destructive ops
vercel blob create-store my-store --access private --yes   # --yes also links to the current project
vercel blob delete-store <store-id> --yes
vercel blob empty-store --yes
```
