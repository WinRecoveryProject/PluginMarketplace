# Plugin files: vercel — `commands/`

Source: `plugins/vercel`. Files outside the `skills/*` folders, embedded as text.

## File: `commands/_conventions.md`

### Command Conventions

Every slash command in this plugin follows a consistent structure so that the AI agent produces reliable, verifiable results. When authoring or updating a command file, include **all** of the sections below.

#### Required Sections

##### 1. Preflight

Check prerequisites before doing any work:

- **Project linked?** — Verify `.vercel/project.json` exists. If not, guide the user through `vercel link`.
- **CLI available?** — Confirm `vercel` CLI is on PATH.
- **Repo state** — Note uncommitted changes, dirty working tree, or detached HEAD when relevant.
- **Scope** — Detect monorepo (e.g., `turbo.json` or `pnpm-workspace.yaml`) and confirm which package is targeted.

Preflight failures should produce clear, actionable guidance — never silently skip.

##### 2. Plan

Before executing, state what will happen:

- List the commands or MCP calls that will run.
- Flag destructive or production-impacting operations and require explicit user confirmation.
- If multiple strategies exist (MCP-first vs CLI-fallback), state which path was chosen and why.

##### 3. Commands

The operational core. Follow these conventions:

- **MCP-first, CLI-fallback** — Prefer the Vercel MCP server for reads; use CLI for writes or when MCP lacks coverage.
- **Structured output** — Request `--format=json` where available; parse and present results in a readable summary.
- **No secrets in output** — Never echo environment variable values. Show names and metadata only.
- **Confirmation for destructive ops** — Production deploys, env removal, cache purge, and domain changes require an explicit "yes" from the user.

##### 4. Verification

After execution, confirm the outcome:

- Re-read state (e.g., `vercel ls`, `vercel env ls`) to confirm the operation took effect.
- Compare before/after where possible (e.g., deployment count, env var count).
- Surface errors or warnings from command output.

##### 5. Summary

Present a concise result block:

```
## Result
- **Action**: what was done
- **Status**: success | partial | failed
- **Details**: key output (URL, counts, config changes)
```

##### 6. Next Steps

Suggest logical follow-ups:

- After deploy → check logs, inspect build, verify preview URL.
- After env change → pull to local, redeploy if production.
- After status → fix any flagged issues, run deploy if stale.

#### File Naming

- Command files live in `commands/` and end in `.md`.
- Files prefixed with `_` (like this one) are meta-documents, not slash commands. They are excluded from `plugin.json` enumeration and not presented as user-invocable commands.

#### Frontmatter

Every command file must include YAML frontmatter with at least a `description` field:

```yaml
---
description: One-line summary of what the command does.
---
```

#### Validation

`scripts/validate.ts` enforces these conventions. Every non-underscore command file is checked for the required sections: Preflight, Plan, Commands, Verification, Summary, Next Steps.

## File: `commands/bootstrap.md`

---
description: Bootstrap a repository with Vercel-linked resources by running preflight checks, provisioning integrations, verifying env keys, and then executing db/dev startup commands safely.
---

### Vercel Project Bootstrap

Run a deterministic bootstrap flow for new or partially configured repositories.

#### Preflight

<!-- Sourced from bootstrap skill: Preflight -->
1. Confirm Vercel CLI is installed and authenticated.

```bash
vercel --version
vercel whoami
```

2. Confirm repo linkage by checking `.vercel/project.json`.
3. If not linked, inspect available teams/projects before asking the user to choose:

```bash
vercel teams ls
vercel projects ls --scope <team>
vercel link --yes --scope <team> --project <project>
```

4. Find the env template in priority order: `.env.example`, `.env.sample`, `.env.template`.
5. Create local env file if missing:

```bash
cp .env.example .env.local
```

6. Detect package manager and available scripts (`db:push`, `db:seed`, `db:migrate`, `db:generate`, `dev`) from `package.json`.
7. Inspect auth/database signals (`prisma/schema.prisma`, `drizzle.config.*`, `auth.*`, `src/**/auth.*`) to scope bootstrap details.

Stop with clear guidance if CLI auth or linkage fails.

#### Plan

Execute in this order:

1. Preflight validation and project linking.
2. Resource provisioning (prefer Vercel-managed Neon integration).
3. Secret/bootstrap env setup (`AUTH_SECRET`, env pull, key verification).
4. Application bootstrap (`db:*` then `dev`) only after env checks pass.

<!-- Sourced from bootstrap skill: Rules -->
- Do not run `db:push`, `db:migrate`, `db:seed`, or `dev` until Vercel linking is complete and env keys are verified.
- Prefer Vercel-managed provisioning (`vercel integration ...`) for shared resources.
- Use provider CLIs only as fallback when Vercel integration flow is unavailable.
- Never echo secret values in terminal output, logs, or summaries.

#### Commands

##### 1. Link + local env template

Copy the first matching template file only if `.env.local` does not exist:

```bash
cp .env.example .env.local
```

If `.env.example` is absent, use `.env.sample` or `.env.template`.

##### 2. Provision Postgres

<!-- Sourced from bootstrap skill: Resource Setup: Postgres -->
##### Preferred path (Vercel-managed Neon)

1. Read integration setup guidance:

```bash
vercel integration guide neon
```

2. Add Neon integration to the Vercel scope:

```bash
vercel integration add neon --scope <team>
```

3. Verify expected environment variable names exist in Vercel and pull locally:

```bash
vercel env ls
vercel env pull .env.local --yes
```

##### Fallback path 1 (Dashboard)

1. Provision Neon through the Vercel dashboard integration UI.
2. Re-run `vercel env pull .env.local --yes`.

##### Fallback path 2 (Neon CLI)

Use Neon CLI only when Vercel-managed provisioning is unavailable. After creating resources, add required env vars in Vercel and pull again.

##### 3. Generate and store `AUTH_SECRET`

<!-- Sourced from bootstrap skill: AUTH_SECRET Generation -->
Generate a high-entropy secret without printing it, then store it in Vercel and refresh local env:

```bash
AUTH_SECRET="$(node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))")"
printf "%s" "$AUTH_SECRET" | vercel env add AUTH_SECRET development preview production
unset AUTH_SECRET
vercel env pull .env.local --yes
```

##### 4. Verify required env keys

<!-- Sourced from bootstrap skill: Env Verification -->
Compare required keys from template file against `.env.local` keys (names only, never values):

```bash
template_file=""
for candidate in .env.example .env.sample .env.template; do
  if [ -f "$candidate" ]; then
    template_file="$candidate"
    break
  fi
done

comm -23 \
  <(grep -E '^[A-Za-z_][A-Za-z0-9_]*=' "$template_file" | cut -d '=' -f 1 | sort -u) \
  <(grep -E '^[A-Za-z_][A-Za-z0-9_]*=' .env.local | cut -d '=' -f 1 | sort -u)
```

Proceed only when missing key list is empty.

Do not continue if any required keys are missing.

##### 5. Run app bootstrap commands (after verification)

<!-- Sourced from bootstrap skill: App Setup -->
After linkage + env verification:

```bash
npm run db:push
npm run db:seed
npm run dev
```

Use the repository package manager (`npm`, `pnpm`, `bun`, or `yarn`) and run only scripts that exist in `package.json`.

#### Verification

<!-- Sourced from bootstrap skill: Bootstrap Verification -->
Confirm each checkpoint:

- `vercel whoami` succeeds.
- `.vercel/project.json` exists and matches chosen project.
- Postgres integration path completed (Vercel integration, dashboard, or provider CLI fallback).
- `vercel env pull .env.local --yes` succeeds.
- Required env key diff is empty.
- Database command status is recorded (`db:push`, `db:seed`, `db:migrate`, `db:generate` as applicable).
- `dev` command starts without immediate config/auth/env failure.

If verification fails, stop and report exact failing step plus remediation.

#### Summary

<!-- Sourced from bootstrap skill: Summary Format -->
Return a final bootstrap summary in this format:

```md
## Bootstrap Result
- **Linked Project**: <team>/<project>
- **Resource Path**: vercel-integration-neon | dashboard-neon | neon-cli
- **Env Keys**: <count> required, <count> present, <count> missing
- **Secrets**: AUTH_SECRET set in Vercel (value never shown)
- **Migration Status**: not-run | success | failed (<step>)
- **Dev Result**: not-run | started | failed
```

#### Next Steps

<!-- Sourced from bootstrap skill: Bootstrap Next Steps -->
- If env keys are still missing, add the missing keys in Vercel and re-run `vercel env pull .env.local --yes`.
- If DB commands fail, fix connectivity/schema issues and re-run only the failed db step.
- If `dev` fails, resolve runtime errors, then restart with your package manager's `run dev`.

## File: `commands/bootstrap.md.tmpl`

````text
---
description: Bootstrap a repository with Vercel-linked resources by running preflight checks, provisioning integrations, verifying env keys, and then executing db/dev startup commands safely.
---

# Vercel Project Bootstrap

Run a deterministic bootstrap flow for new or partially configured repositories.

## Preflight

<!-- Sourced from bootstrap skill: Preflight -->
{{include:skill:bootstrap:Preflight}}

6. Detect package manager and available scripts (`db:push`, `db:seed`, `db:migrate`, `db:generate`, `dev`) from `package.json`.
7. Inspect auth/database signals (`prisma/schema.prisma`, `drizzle.config.*`, `auth.*`, `src/**/auth.*`) to scope bootstrap details.

Stop with clear guidance if CLI auth or linkage fails.

## Plan

Execute in this order:

1. Preflight validation and project linking.
2. Resource provisioning (prefer Vercel-managed Neon integration).
3. Secret/bootstrap env setup (`AUTH_SECRET`, env pull, key verification).
4. Application bootstrap (`db:*` then `dev`) only after env checks pass.

<!-- Sourced from bootstrap skill: Rules -->
{{include:skill:bootstrap:Rules}}

## Commands

### 1. Link + local env template

Copy the first matching template file only if `.env.local` does not exist:

```bash
cp .env.example .env.local
```

If `.env.example` is absent, use `.env.sample` or `.env.template`.

### 2. Provision Postgres

<!-- Sourced from bootstrap skill: Resource Setup: Postgres -->
{{include:skill:bootstrap:Resource Setup: Postgres}}

### 3. Generate and store `AUTH_SECRET`

<!-- Sourced from bootstrap skill: AUTH_SECRET Generation -->
{{include:skill:bootstrap:AUTH_SECRET Generation}}

### 4. Verify required env keys

<!-- Sourced from bootstrap skill: Env Verification -->
{{include:skill:bootstrap:Env Verification}}

Do not continue if any required keys are missing.

### 5. Run app bootstrap commands (after verification)

<!-- Sourced from bootstrap skill: App Setup -->
{{include:skill:bootstrap:App Setup}}

## Verification

<!-- Sourced from bootstrap skill: Bootstrap Verification -->
{{include:skill:bootstrap:Bootstrap Verification}}

## Summary

<!-- Sourced from bootstrap skill: Summary Format -->
{{include:skill:bootstrap:Summary Format}}

## Next Steps

<!-- Sourced from bootstrap skill: Bootstrap Next Steps -->
{{include:skill:bootstrap:Bootstrap Next Steps}}
````

## File: `commands/deploy.md`

---
description: Deploy the current project to Vercel. Pass "prod" or "production" as argument to deploy to production. Default is preview deployment.
---

### Deploy to Vercel

Deploy the current project to Vercel using the CLI, with preflight safety checks, explicit production confirmation, and post-deploy verification.

#### Preflight

Run these checks before any deployment. Stop on failure and print actionable guidance.

1. **CLI available?** — Confirm `vercel` is on PATH.
   - If missing: `npm i -g vercel` (or `pnpm add -g vercel` / `bun add -g vercel`).
2. **Project linked?** — Check for `.vercel/project.json` in the current directory or nearest parent.
   - If not found: run `vercel link` interactively, then re-run `/deploy`.
3. **Monorepo detection** — Look for `turbo.json` or `pnpm-workspace.yaml` at the repo root.
   - If detected: confirm which package is targeted. If ambiguous, ask the user before proceeding.
4. **Uncommitted changes** — Run `git status --porcelain`.
   - If output is non-empty: warn the user that uncommitted changes will **not** be included in the deploy. Ask whether to continue or commit first.
   - If not a git repo, skip this check.
5. **Observability preflight** (production deploys only) —

<!-- Sourced from observability skill: Drains > Deploy Preflight Observability -->
Before promoting to production, verify observability readiness:

- **Drains check**: Query configured drains via MCP `list_drains` or REST API. If no drains are configured on a Pro/Enterprise plan, warn:
  > ⚠️ No drains configured. Production errors won't be forwarded to external monitoring.
  > Configure drains via Dashboard or REST API before promoting. See `⤳ skill: observability`.
- **Errored drains**: If any drain is in error state, warn and suggest remediation before deploying:
  > ⚠️ Drain "<url>" is errored. Fix or recreate before production deploy to avoid monitoring gaps.
- **Error monitoring**: Check that at least one of these is in place: configured drains, an error tracking integration (e.g., Sentry, Datadog via `vercel integration ls`), or `@vercel/analytics` in the project.
- These are warnings, not blockers — the user may proceed after acknowledgment.

#### Plan

State the intended action before executing:

- **Preview deploy** (default): `vercel` — creates a preview deployment on a unique URL.
- **Production deploy**: `vercel --prod` — deploys to production domains.

If "$ARGUMENTS" contains "prod" or "production":

> ⚠️ **Production deployment requested.**
> This will deploy to your live production URL and affect real users.
> **Ask the user for explicit confirmation before proceeding.** Do not deploy to production without a clear "yes."

If "$ARGUMENTS" does not indicate production:

> Deploying a **preview** build. This creates an isolated URL and does not affect production.

#### Commands

##### Preview Deployment

<!-- Sourced from deployments-cicd skill: Deployment Commands > Preview Deployment -->
```bash
# Deploy from project root (creates preview URL)
vercel

# Equivalent explicit form
vercel deploy
```

Preview deployments are created automatically for every push to a non-production branch when using Git integration. They provide a unique URL for testing.

##### Production Deployment (requires confirmation)

<!-- Sourced from deployments-cicd skill: Deployment Commands > Production Deployment -->
```bash
# Deploy directly to production
vercel --prod
vercel deploy --prod

# Force a new deployment (skip cache)
vercel --prod --force
```

Capture the full command output. Extract the **deployment URL** from the output (the line containing the `.vercel.app` URL or custom domain URL).

Record the current git commit SHA for the summary:

```bash
git rev-parse --short HEAD
```

#### Verification

After deployment completes, verify the result:

##### 1. Inspect the Deployment

<!-- Sourced from deployments-cicd skill: Deployment Commands > Inspect Deployments -->
```bash
# View deployment details (build info, functions, metadata)
vercel inspect <deployment-url>

# List recent deployments
vercel ls

# View logs for a deployment
vercel logs <deployment-url>
vercel logs <deployment-url> --follow
```

Extract: deployment state (READY / ERROR / QUEUED / BUILDING), build duration, framework, Node.js version, function count.

##### 2. On Failure — Fetch Build Logs

If the deployment state is **ERROR** or the deploy command exited non-zero:

```bash
vercel logs <deployment-url>
```

Present the last 50 lines of build logs to help diagnose the failure. Highlight any lines containing `error`, `Error`, `ERR!`, or `FATAL`.

##### 3. On Success — Quick Smoke Check

If the deployment state is **READY**, note the URL is live and accessible.

##### 4. Post-Deploy Error Scan (production deploys)

<!-- Sourced from observability skill: Drains > Post-Deploy Error Scan -->
For production deployments, wait 60 seconds after READY state, then scan for early runtime errors:

```bash
vercel logs <deployment-url> --level error --since 1h
```

Or via MCP if available: use `get_runtime_logs` with level filter `error`.

**Interpret results:**

| Finding | Action |
|---------|--------|
| No errors | ✓ Clean deploy — no runtime errors in first hour |
| Errors detected | List error count and first 5 unique error messages. Suggest: check drain payloads for correlated traces, review function logs in Dashboard |
| 500 status codes in logs | Correlate timestamps with drain data (if configured) or `vercel logs <url> --json` for structured output. Flag for immediate investigation |
| Timeout errors | Check function duration limits in `vercel.json` or project settings. Consider increasing `maxDuration` |

**Fallback (no drains):**

If no drains are configured, the error scan relies on CLI and Dashboard:

```bash
# Stream live errors
vercel logs <deployment-url> --level error --follow

# JSON output for parsing
vercel logs <deployment-url> --level error --since 1h --json
```

> For richer post-deploy monitoring, configure drains to forward logs/traces to an external platform. See `⤳ skill: observability`.

#### Summary

<!-- Sourced from deployments-cicd skill: Deploy Summary Format -->
Present a structured deploy result block:

```
## Deploy Result
- **URL**: <deployment-url>
- **Target**: production | preview
- **Status**: READY | ERROR | BUILDING | QUEUED
- **Commit**: <short-sha>
- **Framework**: <detected-framework>
- **Build Duration**: <duration>
```

If the deployment failed, append:

```
- **Error**: <summary of failure from logs>
```

For production deploys, also include:

```
### Post-Deploy Observability
- **Error scan**: <N errors found / clean> (scanned via vercel logs --level error --since 1h)
- **Drains**: <N configured / none>
- **Monitoring**: <active / gaps identified>
```

#### Next Steps

<!-- Sourced from deployments-cicd skill: Deploy Next Steps -->
Based on the deployment outcome:

- **Success (preview)** → "Visit the preview URL to verify. When ready, run `/deploy prod` to promote to production."
- **Success (production)** → "Your production site is live. Run `/status` to see the full project overview."
- **Build error** → "Check the build logs above. Common fixes: verify `build` script in package.json, check for missing env vars with `/env list`, ensure dependencies are installed."
- **Missing env vars** → "Run `/env pull` to sync environment variables locally, or `/env list` to review what's configured on Vercel."
- **Monorepo issues** → "Ensure the correct project root is configured in Vercel project settings. Check `vercel.json` for `rootDirectory`."
- **Post-deploy errors detected** → "Review errors above. Check `vercel logs <url> --level error` for details. If drains are configured, correlate with external monitoring."
- **No monitoring configured** → "Set up drains or install an error tracking integration before the next production deploy. Run `/status` for a full observability diagnostic."

## File: `commands/deploy.md.tmpl`

````text
---
description: Deploy the current project to Vercel. Pass "prod" or "production" as argument to deploy to production. Default is preview deployment.
---

# Deploy to Vercel

Deploy the current project to Vercel using the CLI, with preflight safety checks, explicit production confirmation, and post-deploy verification.

## Preflight

Run these checks before any deployment. Stop on failure and print actionable guidance.

1. **CLI available?** — Confirm `vercel` is on PATH.
   - If missing: `npm i -g vercel` (or `pnpm add -g vercel` / `bun add -g vercel`).
2. **Project linked?** — Check for `.vercel/project.json` in the current directory or nearest parent.
   - If not found: run `vercel link` interactively, then re-run `/deploy`.
3. **Monorepo detection** — Look for `turbo.json` or `pnpm-workspace.yaml` at the repo root.
   - If detected: confirm which package is targeted. If ambiguous, ask the user before proceeding.
4. **Uncommitted changes** — Run `git status --porcelain`.
   - If output is non-empty: warn the user that uncommitted changes will **not** be included in the deploy. Ask whether to continue or commit first.
   - If not a git repo, skip this check.
5. **Observability preflight** (production deploys only) —

<!-- Sourced from observability skill: Drains > Deploy Preflight Observability -->
{{include:skill:observability:Drains > Deploy Preflight Observability}}

## Plan

State the intended action before executing:

- **Preview deploy** (default): `vercel` — creates a preview deployment on a unique URL.
- **Production deploy**: `vercel --prod` — deploys to production domains.

If "$ARGUMENTS" contains "prod" or "production":

> ⚠️ **Production deployment requested.**
> This will deploy to your live production URL and affect real users.
> **Ask the user for explicit confirmation before proceeding.** Do not deploy to production without a clear "yes."

If "$ARGUMENTS" does not indicate production:

> Deploying a **preview** build. This creates an isolated URL and does not affect production.

## Commands

### Preview Deployment

<!-- Sourced from deployments-cicd skill: Deployment Commands > Preview Deployment -->
{{include:skill:deployments-cicd:Deployment Commands > Preview Deployment}}

### Production Deployment (requires confirmation)

<!-- Sourced from deployments-cicd skill: Deployment Commands > Production Deployment -->
{{include:skill:deployments-cicd:Deployment Commands > Production Deployment}}

Capture the full command output. Extract the **deployment URL** from the output (the line containing the `.vercel.app` URL or custom domain URL).

Record the current git commit SHA for the summary:

```bash
git rev-parse --short HEAD
```

## Verification

After deployment completes, verify the result:

### 1. Inspect the Deployment

<!-- Sourced from deployments-cicd skill: Deployment Commands > Inspect Deployments -->
{{include:skill:deployments-cicd:Deployment Commands > Inspect Deployments}}

Extract: deployment state (READY / ERROR / QUEUED / BUILDING), build duration, framework, Node.js version, function count.

### 2. On Failure — Fetch Build Logs

If the deployment state is **ERROR** or the deploy command exited non-zero:

```bash
vercel logs <deployment-url>
```

Present the last 50 lines of build logs to help diagnose the failure. Highlight any lines containing `error`, `Error`, `ERR!`, or `FATAL`.

### 3. On Success — Quick Smoke Check

If the deployment state is **READY**, note the URL is live and accessible.

### 4. Post-Deploy Error Scan (production deploys)

<!-- Sourced from observability skill: Drains > Post-Deploy Error Scan -->
{{include:skill:observability:Drains > Post-Deploy Error Scan}}

## Summary

<!-- Sourced from deployments-cicd skill: Deploy Summary Format -->
{{include:skill:deployments-cicd:Deploy Summary Format}}

## Next Steps

<!-- Sourced from deployments-cicd skill: Deploy Next Steps -->
{{include:skill:deployments-cicd:Deploy Next Steps}}
````

## File: `commands/env.md`

---
description: Manage Vercel environment variables. Commands include list, pull, add, remove, and diff. Use to sync environment variables between Vercel and your local development environment.
---

### Vercel Environment Variables

Use the existing tools, dependencies and connections first. Dependency changes must fit the requested project change. Confirm the account, target, approved data and expected charges before provisioning, deploying or sharing data externally.

Manage environment variables for the current Vercel project with safety rails to prevent secret leakage.

> **🔒 Never-Echo-Secrets Rule**: Environment variable **values** must never appear in command output, summaries, or conversation text. Only show variable **names**, **environments**, and **metadata** (created date, type). This rule applies to all subcommands.

#### Preflight

1. **CLI available?** — Confirm `vercel` is on PATH.
   - If missing: `npm i -g vercel` (or `pnpm add -g vercel` / `bun add -g vercel`).
2. **Project linked?** — Check for `.vercel/project.json` in the current directory or nearest parent.
   - If not found: run `vercel link` interactively, then re-run `/env`.
3. **Detect environment files** — Check for `.env`, `.env.local`, `.env.production.local`, `.env.development.local` in the project root. Note which exist for the diff subcommand.

#### Plan

Based on "$ARGUMENTS", determine the action:

| Argument | Action | Destructive? |
|----------|--------|-------------|
| `list` / `ls` / _(none)_ | List env var names per environment | No |
| `pull` | Download env vars to local `.env.local` | No (overwrites local file) |
| `add <NAME>` | Add a new env var | Yes (if production) |
| `rm <NAME>` / `remove <NAME>` | Remove an env var | **Yes** |
| `diff` | Compare local vs Vercel key names | No |

For any operation that mutates **production** environment variables (`add` or `rm` targeting production):

> ⚠️ **Production environment mutation requested.**
> This will change environment variables on your live production deployment.
> **Ask the user for explicit confirmation before proceeding.** Do not mutate production env vars without a clear "yes."

#### Commands

##### "list" or "ls" or no arguments

<!-- Sourced from env-vars skill: vercel env CLI > List Environment Variables -->
```bash
# List all environment variables
vercel env ls

# Filter by environment
vercel env ls production
```

Present results as a table of variable **names only** grouped by environment. **Never print values.**

| Name | Production | Preview | Development |
|------|-----------|---------|-------------|
| DATABASE_URL | ✓ | ✓ | ✓ |
| API_KEY | ✓ | ✓ | — |

##### "pull"

<!-- Sourced from env-vars skill: vercel env CLI > Pull Environment Variables -->
```bash
# Pull all env vars for the current environment into .env.local
vercel env pull .env.local

# Pull for a specific environment
vercel env pull .env.local --environment=production
vercel env pull .env.local --environment=preview
vercel env pull .env.local --environment=development

# Overwrite existing file without prompting
vercel env pull .env.local --yes

# Pull to a custom file
vercel env pull .env.production.local --environment=production
```

After pulling, remind the user:

> Ensure `.env*.local` is in your `.gitignore` to avoid committing secrets.

##### "add \<NAME\>"

1. Ask the user which environments to target: production, preview, development (can select multiple).
2. If **production** is selected, require explicit confirmation (see Plan section).
3. Run the add command:

<!-- Sourced from env-vars skill: vercel env CLI > Add Environment Variables -->
```bash
# Interactive — prompts for value and environments
vercel env add MY_SECRET

# Non-interactive
echo "secret-value" | vercel env add MY_SECRET production

# Add to multiple environments
echo "secret-value" | vercel env add MY_SECRET production preview development

# Add a sensitive variable (encrypted, not shown in logs)
vercel env add MY_SECRET --sensitive
```

The CLI will prompt for the value interactively — **do not pass the value as a CLI argument or echo it**.

##### "rm \<NAME\>" or "remove \<NAME\>"

1. If the variable exists in **production**, require explicit confirmation.
2. Run the remove command:

<!-- Sourced from env-vars skill: vercel env CLI > Remove Environment Variables -->
```bash
# Remove from specific environment
vercel env rm MY_SECRET production

# Remove from all environments
vercel env rm MY_SECRET
```

Confirm the target environment(s) with the user before executing.

##### "diff"

Compare local environment file key names against Vercel-configured key names. **Only compare names — never read or display values.**

1. Read local env file keys (from `.env.local` or `.env` — whichever exists):

```bash
grep -v '^#' .env.local | grep '=' | cut -d'=' -f1 | sort
```

2. Fetch Vercel env var names:

```bash
vercel env ls
```

Parse the output to extract variable names for the target environment (default: development).

3. Present the diff:

```
## Env Diff — Local vs Vercel (development)

### In local but NOT on Vercel:
- EXTRA_LOCAL_VAR
- DEBUG_MODE

### On Vercel but NOT in local:
- ANALYTICS_KEY
- SENTRY_DSN

### In both:
- DATABASE_URL
- API_KEY
- NEXT_PUBLIC_APP_URL
```

If all keys match, report: "Local and Vercel environment keys are in sync."

#### Environment-Specific Configuration Reference

<!-- Sourced from env-vars skill: Environment-Specific Configuration -->
##### Vercel Dashboard vs .env Files

| Use Case | Where to Set |
|----------|-------------|
| Secrets (API keys, tokens) | Vercel Dashboard (`https://vercel.com/{team}/{project}/settings/environment-variables`) or `vercel env add` |
| Public config (site URL, feature flags) | `.env` or `.env.[environment]` files |
| Local-only overrides | `.env.local` |
| CI/CD secrets | Vercel Dashboard (`https://vercel.com/{team}/{project}/settings/environment-variables`) with environment scoping |

##### Environment Scoping on Vercel

Variables set in the Vercel Dashboard at `https://vercel.com/{team}/{project}/settings/environment-variables` can be scoped to:

- **Production** — only `vercel.app` production deployments
- **Preview** — branch/PR deployments
- **Development** — `vercel dev` and `vercel env pull`

A variable can be assigned to one, two, or all three environments.

##### Git Branch Overrides

Preview environment variables can be scoped to specific Git branches:

```bash
# Add a variable only for the "staging" branch
echo "staging-value" | vercel env add DATABASE_URL preview --git-branch=staging
```

#### Common Gotchas

<!-- Sourced from env-vars skill: Gotchas -->
##### `vercel env pull` Overwrites Custom Variables

`vercel env pull .env.local` **replaces the entire file** — any manually added variables (custom secrets, local overrides, debug flags) are lost. Always back up or re-add custom vars after pulling:

```bash
# Save custom vars before pulling
grep -v '^#' .env.local | grep -v '^VERCEL_\|^POSTGRES_\|^NEXT_PUBLIC_' > .env.custom.bak
vercel env pull .env.local --yes
cat .env.custom.bak >> .env.local  # Re-append custom vars
```

Or maintain custom vars in a separate `.env.development.local` file (loaded after `.env.local` by Next.js).

##### Scripts Don't Auto-Load `.env.local`

Only Next.js auto-loads `.env.local`. Standalone scripts (`drizzle-kit`, `tsx`, custom Node scripts) need explicit loading:

```bash
# Use dotenv-cli
npm install -D dotenv-cli
npx dotenv -e .env.local -- npx drizzle-kit push
npx dotenv -e .env.local -- npx tsx scripts/seed.ts

# Or source manually
source <(grep -v '^#' .env.local | sed 's/^/export /') && node scripts/migrate.js
```

#### Verification

After any mutation (`add` or `rm`), verify the change took effect:

```bash
vercel env ls
```

Re-list environment variables and confirm:

- For `add`: the new variable name appears in the expected environment(s).
- For `rm`: the variable name no longer appears in the target environment(s).

If verification fails (variable still present after remove, or missing after add), report the discrepancy and suggest retrying.

#### Summary

Present a structured result block:

```
## Env Result
- **Action**: list | pull | add | remove | diff
- **Status**: success | failed
- **Variable**: <NAME> (for add/remove)
- **Environments**: production, preview, development (as applicable)
- **Details**: <key outcome>
```

For `diff`, include counts:

```
- **Local only**: N keys
- **Vercel only**: N keys
- **Shared**: N keys
```

#### Next Steps

Based on the action performed:

- **After list** → "Run `/env pull` to sync to local, or `/env diff` to compare local vs Vercel."
- **After pull** → "Restart your dev server to pick up the new variables. Run `/env diff` to verify sync."
- **After add** → "Run `/deploy` to make the new variable available in your next deployment. For production, the variable is available immediately on the next request."
- **After remove** → "The variable is removed. If your app depends on it, update your code or add a replacement. Consider redeploying with `/deploy`."
- **After diff** → "Add missing variables with `/env add <NAME>`, or pull from Vercel with `/env pull` to sync."

## File: `commands/env.md.tmpl`

````text
---
description: Manage Vercel environment variables. Commands include list, pull, add, remove, and diff. Use to sync environment variables between Vercel and your local development environment.
---

# Vercel Environment Variables

Manage environment variables for the current Vercel project with safety rails to prevent secret leakage.

> **🔒 Never-Echo-Secrets Rule**: Environment variable **values** must never appear in command output, summaries, or conversation text. Only show variable **names**, **environments**, and **metadata** (created date, type). This rule applies to all subcommands.

## Preflight

1. **CLI available?** — Confirm `vercel` is on PATH.
   - If missing: `npm i -g vercel` (or `pnpm add -g vercel` / `bun add -g vercel`).
2. **Project linked?** — Check for `.vercel/project.json` in the current directory or nearest parent.
   - If not found: run `vercel link` interactively, then re-run `/env`.
3. **Detect environment files** — Check for `.env`, `.env.local`, `.env.production.local`, `.env.development.local` in the project root. Note which exist for the diff subcommand.

## Plan

Based on "$ARGUMENTS", determine the action:

| Argument | Action | Destructive? |
|----------|--------|-------------|
| `list` / `ls` / _(none)_ | List env var names per environment | No |
| `pull` | Download env vars to local `.env.local` | No (overwrites local file) |
| `add <NAME>` | Add a new env var | Yes (if production) |
| `rm <NAME>` / `remove <NAME>` | Remove an env var | **Yes** |
| `diff` | Compare local vs Vercel key names | No |

For any operation that mutates **production** environment variables (`add` or `rm` targeting production):

> ⚠️ **Production environment mutation requested.**
> This will change environment variables on your live production deployment.
> **Ask the user for explicit confirmation before proceeding.** Do not mutate production env vars without a clear "yes."

## Commands

### "list" or "ls" or no arguments

<!-- Sourced from env-vars skill: vercel env CLI > List Environment Variables -->
{{include:skill:env-vars:vercel env CLI > List Environment Variables}}

Present results as a table of variable **names only** grouped by environment. **Never print values.**

| Name | Production | Preview | Development |
|------|-----------|---------|-------------|
| DATABASE_URL | ✓ | ✓ | ✓ |
| API_KEY | ✓ | ✓ | — |

### "pull"

<!-- Sourced from env-vars skill: vercel env CLI > Pull Environment Variables -->
{{include:skill:env-vars:vercel env CLI > Pull Environment Variables}}

After pulling, remind the user:

> Ensure `.env*.local` is in your `.gitignore` to avoid committing secrets.

### "add \<NAME\>"

1. Ask the user which environments to target: production, preview, development (can select multiple).
2. If **production** is selected, require explicit confirmation (see Plan section).
3. Run the add command:

<!-- Sourced from env-vars skill: vercel env CLI > Add Environment Variables -->
{{include:skill:env-vars:vercel env CLI > Add Environment Variables}}

The CLI will prompt for the value interactively — **do not pass the value as a CLI argument or echo it**.

### "rm \<NAME\>" or "remove \<NAME\>"

1. If the variable exists in **production**, require explicit confirmation.
2. Run the remove command:

<!-- Sourced from env-vars skill: vercel env CLI > Remove Environment Variables -->
{{include:skill:env-vars:vercel env CLI > Remove Environment Variables}}

Confirm the target environment(s) with the user before executing.

### "diff"

Compare local environment file key names against Vercel-configured key names. **Only compare names — never read or display values.**

1. Read local env file keys (from `.env.local` or `.env` — whichever exists):

```bash
grep -v '^#' .env.local | grep '=' | cut -d'=' -f1 | sort
```

2. Fetch Vercel env var names:

```bash
vercel env ls
```

Parse the output to extract variable names for the target environment (default: development).

3. Present the diff:

```
## Env Diff — Local vs Vercel (development)

### In local but NOT on Vercel:
- EXTRA_LOCAL_VAR
- DEBUG_MODE

### On Vercel but NOT in local:
- ANALYTICS_KEY
- SENTRY_DSN

### In both:
- DATABASE_URL
- API_KEY
- NEXT_PUBLIC_APP_URL
```

If all keys match, report: "Local and Vercel environment keys are in sync."

## Environment-Specific Configuration Reference

<!-- Sourced from env-vars skill: Environment-Specific Configuration -->
{{include:skill:env-vars:Environment-Specific Configuration}}

## Common Gotchas

<!-- Sourced from env-vars skill: Gotchas -->
{{include:skill:env-vars:Gotchas}}

## Verification

After any mutation (`add` or `rm`), verify the change took effect:

```bash
vercel env ls
```

Re-list environment variables and confirm:

- For `add`: the new variable name appears in the expected environment(s).
- For `rm`: the variable name no longer appears in the target environment(s).

If verification fails (variable still present after remove, or missing after add), report the discrepancy and suggest retrying.

## Summary

Present a structured result block:

```
## Env Result
- **Action**: list | pull | add | remove | diff
- **Status**: success | failed
- **Variable**: <NAME> (for add/remove)
- **Environments**: production, preview, development (as applicable)
- **Details**: <key outcome>
```

For `diff`, include counts:

```
- **Local only**: N keys
- **Vercel only**: N keys
- **Shared**: N keys
```

## Next Steps

Based on the action performed:

- **After list** → "Run `/env pull` to sync to local, or `/env diff` to compare local vs Vercel."
- **After pull** → "Restart your dev server to pick up the new variables. Run `/env diff` to verify sync."
- **After add** → "Run `/deploy` to make the new variable available in your next deployment. For production, the variable is available immediately on the next request."
- **After remove** → "The variable is removed. If your app depends on it, update your code or add a replacement. Consider redeploying with `/deploy`."
- **After diff** → "Add missing variables with `/env add <NAME>`, or pull from Vercel with `/env pull` to sync."
````

## File: `commands/marketplace.md`

---
description: Discover and install Vercel Marketplace integrations. Use to find databases, CMS, auth providers, and other services available on the Vercel Marketplace.
---

### Vercel Marketplace

Use the existing tools, dependencies and connections first. Dependency changes must fit the requested project change. Confirm the account, target, approved data and expected charges before provisioning, deploying or sharing data externally.

Discover, install, and apply Vercel Marketplace integrations with guided setup and local verification.

#### Preflight

1. **Project linked?** — Check for `.vercel/project.json` in the current directory or nearest parent.
   - If not found: run `vercel link` interactively, then re-run `/marketplace`.
   - Do not attempt provisioning until the project is linked.
2. **CLI available?** — Confirm `vercel` is on PATH.
   - If missing: `npm i -g vercel` (or `pnpm add -g vercel` / `bun add -g vercel`).
3. **Repo state** — Note uncommitted changes so the user can diff integration-related code changes later.
4. **Scope** — Detect monorepo (`turbo.json` or `pnpm-workspace.yaml`). If detected, confirm which package is targeted.

#### Plan

The marketplace command follows an **apply-guide loop**:

1. **Discover** — Search the Marketplace catalog via `vercel integration discover`.
2. **Select** — User picks an integration (or specifies one in "$ARGUMENTS").
3. **Guide** — Fetch the agent-friendly setup guide via `vercel integration guide <name> --framework <fw>`.
4. **Install** — Run `vercel integration add <name>` for the automated happy path.
5. **Confirm env vars provisioned** — Explicitly verify required environment variables are set after provisioning.
6. **Apply code changes** — Install SDK packages and scaffold configuration code.
7. **Verify drain** — For observability integrations, confirm drain was auto-created and data is flowing.
8. **Run local health check** — Verify the integration works locally before deploying.

If "$ARGUMENTS" specifies an integration name, skip directly to the **Guide** step.

For observability integrations (Datadog, Sentry, Axiom, etc.), the flow extends with drain verification — see Step 7.

No destructive operations unless the user explicitly confirms. Package installs and code scaffolding are additive.

#### Commands

##### 1. Discover — Search the Marketplace Catalog

```bash
# Search all available integrations
vercel integration discover

# Filter by category
vercel integration discover --category databases
vercel integration discover --category monitoring
vercel integration discover --category auth

# List integrations already installed on this project
vercel integration list
```

Present integrations organized by category:

| Category   | Examples                          |
| ---------- | --------------------------------- |
| Database   | Neon, PlanetScale, Supabase       |
| Cache      | Upstash Redis, Upstash KV         |
| Auth       | Clerk, Auth0                      |
| CMS        | Sanity, Contentful, Prismic       |
| Payments   | Stripe, LemonSqueezy              |
| Monitoring | Datadog, Sentry, Axiom, Honeycomb |

Common replacements for sunset packages:

- **Neon** — Serverless Postgres (replaces `@vercel/postgres`)
- **Upstash** — Serverless Redis (replaces `@vercel/kv`)

##### 2. Select — User Picks an Integration

If the user hasn't specified one in "$ARGUMENTS", ask which integration to set up. Accept the integration name or slug.

##### 3. Guide — Fetch Setup Steps

```bash
# Get agent-friendly setup guide
vercel integration guide <name> --framework <fw>
```

Use framework-specific guides by default when framework is known. If unknown, infer from the repo and confirm with the user.

The guide returns structured setup steps: required env vars, SDK packages, code snippets, and framework-specific notes. Present these to the user.

##### 4. Install — Add the Integration

```bash
vercel integration add <name>
```

`vercel integration add` is the primary scripted/AI flow. It installs against the linked project, auto-connects the integration, and auto-runs local env sync unless disabled.

If the CLI bounces to the dashboard for provider-specific completion, treat it as fallback and open the integration page directly:

```bash
vercel integration open <name>
```

Complete the web step, then continue with env verification.

After installation, the integration auto-provisions environment variables. For observability vendors (Datadog, Sentry, Axiom), this also auto-creates **log and trace drains**.

##### 5. Confirm Env Vars Provisioned

Before applying code changes, verify the integration's required environment variables exist:

```bash
vercel env ls
```

Check that each variable name listed in the guide appears in the output. **Never echo variable values — check names only.**

- If local env sync was disabled or `.env.local` is stale, run:

```bash
vercel env pull .env.local --yes
```

- **All present** → Proceed to code changes.
- **Missing vars** → Tell the user which variables are missing. The integration install via `vercel integration add <name>` typically provisions these automatically. Guide the user to provision them before continuing.

##### 6. Apply Code Changes

Install the SDK package:

```bash
npm install <sdk-package>   # or pnpm add / bun add
```

Then apply the code scaffolding from the guide:

- Create or update configuration files (e.g., `db.ts`, `redis.ts`, `auth.ts`)
- Add initialization code following the guide's patterns
- Respect the project's existing conventions (TypeScript vs JavaScript, import style, directory structure)

Ask the user for confirmation before writing files.

##### 7. Verify Drain (Observability Integrations)

<!-- Sourced from marketplace skill: Observability Integration Path -->
Marketplace observability integrations (Datadog, Sentry, Axiom, Honeycomb, etc.) connect to Vercel's **Drains** system to receive telemetry. Understanding the data-type split is critical for correct setup.

##### Data-Type Split

| Data Type          | Delivery Mechanism                                    | Integration Setup                                                                                                      |
| ------------------ | ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| **Logs**           | Native drain (auto-configured by Marketplace install) | `vercel integration add <vendor>` auto-creates drain                                                                   |
| **Traces**         | Native drain (OpenTelemetry-compatible)               | Same — auto-configured on install                                                                                      |
| **Speed Insights** | Custom drain endpoint only                            | Requires manual drain creation via REST API or Dashboard (`https://vercel.com/dashboard/{team}/~/settings/log-drains`) |
| **Web Analytics**  | Custom drain endpoint only                            | Requires manual drain creation via REST API or Dashboard (`https://vercel.com/dashboard/{team}/~/settings/log-drains`) |

> **Key distinction:** When you install an observability vendor via the Marketplace, it auto-configures drains for **logs and traces** only. Speed Insights and Web Analytics data require a separate, manually configured drain pointing to a custom endpoint. See `⤳ skill: observability` for drain setup details.

##### Agentic Flow: Observability Vendor Setup

Follow this sequence when setting up an observability integration:

###### 1. Pick Vendor

```bash
# Discover observability integrations
vercel integration discover --category monitoring

# Get setup guide for chosen vendor
vercel integration guide datadog
```

###### 2. Confirm the integration

Inspect the existing integration first. Before creating or updating one, confirm the provider, account, project, included features, destination and pricing. Provision only within the user's approved changes.

###### 3. Verify the drain

Use the connected Vercel App's drain-listing tool for the intended team and project. Check the destination, format, data types and environments.

###### 4. Validate the endpoint

A drain test sends a payload to the destination. Use the connected Vercel App to send a test only when the destination and test are authorized. Then verify the result at the destination.

###### 5. Smoke Log Check

```bash
# Trigger a deployment and check logs flow through
vercel logs <deployment-url> --follow --since 5m

# Check integration balance to confirm data is flowing
vercel integration balance datadog
```

Verify that logs appear both in Vercel's runtime logs and in the vendor's dashboard.

> **For drain payload formats and signature verification**, see `⤳ skill: observability` — the Drains section covers JSON/NDJSON schemas and `x-vercel-signature` HMAC-SHA1 verification.

##### Speed Insights + Web Analytics Drains

If the approved integration also needs Speed Insights or Web Analytics data, configure its drain with the connected Vercel App or Vercel Dashboard. Verify the exact event types and approved destination before enabling delivery.

> **Payload schema reference:** See `⤳ skill: observability` for Web Analytics drain payload formats (JSON array of `{type, url, referrer, timestamp, geo, device}` events).

- **Drain present** → Proceed to health check.
- **No drain found** → Integration may not auto-configure drains. If the user has approved provisioning, follow `⤳ skill: observability` for the existing Vercel App or Dashboard.
- **Drain errored** → Check the drain status in the Vercel Dashboard. Common fixes: endpoint URL typo, auth header missing, endpoint not accepting POST.

##### 8. Run Local Health Check

Verify the integration works locally:

```bash
vercel dev
```

Or run the project's dev server and test the integration endpoint/connection:

- **Database** → Confirm connection by running a simple query (e.g., `SELECT 1`)
- **Auth** → Confirm the auth provider redirects correctly
- **Cache** → Confirm a set/get round-trip succeeds
- **CMS** → Confirm content fetch returns data
- **Observability** → Run `vercel logs <deployment-url> --follow --since 5m` and confirm logs appear in the vendor dashboard

If the health check fails, review the error output and guide the user through fixes (common: missing env vars in `.env.local`, wrong SDK version, network issues).

#### Verification

After completing the apply-guide loop, confirm:

- [ ] Integration guide was retrieved via `vercel integration guide <name> --framework <fw>`
- [ ] Project was linked before provisioning started
- [ ] All required environment variables are provisioned on Vercel
- [ ] Local env sync is up to date (auto-sync succeeded or `vercel env pull .env.local --yes` ran)
- [ ] SDK package installed without errors
- [ ] Code changes applied and match the guide's patterns
- [ ] For observability integrations: drain verified and test payload received
- [ ] Local health check passed (dev server starts, integration responds)

If any step fails, report the specific error and suggest remediation before continuing.

#### Summary

Present a structured result block:

```
## Marketplace Result
- **Integration**: <name>
- **Status**: installed | partially configured | failed
- **Package**: <sdk-package>@<version>
- **Env Vars**: <count> provisioned / <count> required
- **Drain**: configured | not applicable | manual setup needed
- **Health Check**: passed | failed | skipped
- **Files Changed**: <list of created/modified files>
```

#### Next Steps

Based on the outcome:

- **Installed successfully** → "Run `/deploy` to deploy with the new integration. Your environment variables are already configured on Vercel."
- **Env vars missing** → "Provision the missing variables via the Vercel dashboard or `vercel integration add <name>`, then re-run `/marketplace <name>` to continue setup."
- **CLI handed off to dashboard** → "Run `vercel integration open <name>` to complete the provider web step, then resume from env verification."
- **Drain not auto-created** → "Create a drain manually via the REST API. See `⤳ skill: observability` for the `/v1/drains` endpoint and payload format."
- **Need Speed Insights / Web Analytics export** → "These data types require manual drain setup — they are not auto-configured by vendor installs. See `⤳ skill: observability`."
- **Health check failed** → "Review the error above. Common fixes: copy env vars to `.env.local` with `vercel env pull`, check SDK version compatibility, verify network access."
- **Want another integration?** → "Run `/marketplace` again to browse available integrations."
- **Review changes** → "Run `git diff` to review all integration-related code changes before committing."

## File: `commands/marketplace.md.tmpl`

````text
---
description: Discover and install Vercel Marketplace integrations. Use to find databases, CMS, auth providers, and other services available on the Vercel Marketplace.
---

# Vercel Marketplace

Discover, install, and apply Vercel Marketplace integrations with guided setup and local verification.

## Preflight

1. **Project linked?** — Check for `.vercel/project.json` in the current directory or nearest parent.
   - If not found: run `vercel link` interactively, then re-run `/marketplace`.
   - Do not attempt provisioning until the project is linked.
2. **CLI available?** — Confirm `vercel` is on PATH.
   - If missing: `npm i -g vercel` (or `pnpm add -g vercel` / `bun add -g vercel`).
3. **Repo state** — Note uncommitted changes so the user can diff integration-related code changes later.
4. **Scope** — Detect monorepo (`turbo.json` or `pnpm-workspace.yaml`). If detected, confirm which package is targeted.

## Plan

The marketplace command follows an **apply-guide loop**:

1. **Discover** — Search the Marketplace catalog via `vercel integration discover`.
2. **Select** — User picks an integration (or specifies one in "$ARGUMENTS").
3. **Guide** — Fetch the agent-friendly setup guide via `vercel integration guide <name> --framework <fw>`.
4. **Install** — Run `vercel integration add <name>` for the automated happy path.
5. **Confirm env vars provisioned** — Explicitly verify required environment variables are set after provisioning.
6. **Apply code changes** — Install SDK packages and scaffold configuration code.
7. **Verify drain** — For observability integrations, confirm drain was auto-created and data is flowing.
8. **Run local health check** — Verify the integration works locally before deploying.

If "$ARGUMENTS" specifies an integration name, skip directly to the **Guide** step.

For observability integrations (Datadog, Sentry, Axiom, etc.), the flow extends with drain verification — see Step 7.

No destructive operations unless the user explicitly confirms. Package installs and code scaffolding are additive.

## Commands

### 1. Discover — Search the Marketplace Catalog

```bash
# Search all available integrations
vercel integration discover

# Filter by category
vercel integration discover --category databases
vercel integration discover --category monitoring
vercel integration discover --category auth

# List integrations already installed on this project
vercel integration list
```

Present integrations organized by category:

| Category   | Examples                          |
| ---------- | --------------------------------- |
| Database   | Neon, PlanetScale, Supabase       |
| Cache      | Upstash Redis, Upstash KV         |
| Auth       | Clerk, Auth0                      |
| CMS        | Sanity, Contentful, Prismic       |
| Payments   | Stripe, LemonSqueezy              |
| Monitoring | Datadog, Sentry, Axiom, Honeycomb |

Common replacements for sunset packages:

- **Neon** — Serverless Postgres (replaces `@vercel/postgres`)
- **Upstash** — Serverless Redis (replaces `@vercel/kv`)

### 2. Select — User Picks an Integration

If the user hasn't specified one in "$ARGUMENTS", ask which integration to set up. Accept the integration name or slug.

### 3. Guide — Fetch Setup Steps

```bash
# Get agent-friendly setup guide
vercel integration guide <name> --framework <fw>
```

Use framework-specific guides by default when framework is known. If unknown, infer from the repo and confirm with the user.

The guide returns structured setup steps: required env vars, SDK packages, code snippets, and framework-specific notes. Present these to the user.

### 4. Install — Add the Integration

```bash
vercel integration add <name>
```

`vercel integration add` is the primary scripted/AI flow. It installs against the linked project, auto-connects the integration, and auto-runs local env sync unless disabled.

If the CLI bounces to the dashboard for provider-specific completion, treat it as fallback and open the integration page directly:

```bash
vercel integration open <name>
```

Complete the web step, then continue with env verification.

After installation, the integration auto-provisions environment variables. For observability vendors (Datadog, Sentry, Axiom), this also auto-creates **log and trace drains**.

### 5. Confirm Env Vars Provisioned

Before applying code changes, verify the integration's required environment variables exist:

```bash
vercel env ls
```

Check that each variable name listed in the guide appears in the output. **Never echo variable values — check names only.**

- If local env sync was disabled or `.env.local` is stale, run:

```bash
vercel env pull .env.local --yes
```

- **All present** → Proceed to code changes.
- **Missing vars** → Tell the user which variables are missing. The integration install via `vercel integration add <name>` typically provisions these automatically. Guide the user to provision them before continuing.

### 6. Apply Code Changes

Install the SDK package:

```bash
npm install <sdk-package>   # or pnpm add / bun add
```

Then apply the code scaffolding from the guide:

- Create or update configuration files (e.g., `db.ts`, `redis.ts`, `auth.ts`)
- Add initialization code following the guide's patterns
- Respect the project's existing conventions (TypeScript vs JavaScript, import style, directory structure)

Ask the user for confirmation before writing files.

### 7. Verify Drain (Observability Integrations)

<!-- Sourced from marketplace skill: Observability Integration Path -->
{{include:skill:marketplace:Observability Integration Path}}

- **Drain present** → Proceed to health check.
- **No drain found** → Integration may not auto-configure drains. Create one manually via REST API (see `⤳ skill: observability`).
- **Drain errored** → Check the drain status in the Vercel Dashboard. Common fixes: endpoint URL typo, auth header missing, endpoint not accepting POST.

### 8. Run Local Health Check

Verify the integration works locally:

```bash
vercel dev
```

Or run the project's dev server and test the integration endpoint/connection:

- **Database** → Confirm connection by running a simple query (e.g., `SELECT 1`)
- **Auth** → Confirm the auth provider redirects correctly
- **Cache** → Confirm a set/get round-trip succeeds
- **CMS** → Confirm content fetch returns data
- **Observability** → Run `vercel logs <deployment-url> --follow --since 5m` and confirm logs appear in the vendor dashboard

If the health check fails, review the error output and guide the user through fixes (common: missing env vars in `.env.local`, wrong SDK version, network issues).

## Verification

After completing the apply-guide loop, confirm:

- [ ] Integration guide was retrieved via `vercel integration guide <name> --framework <fw>`
- [ ] Project was linked before provisioning started
- [ ] All required environment variables are provisioned on Vercel
- [ ] Local env sync is up to date (auto-sync succeeded or `vercel env pull .env.local --yes` ran)
- [ ] SDK package installed without errors
- [ ] Code changes applied and match the guide's patterns
- [ ] For observability integrations: drain verified and test payload received
- [ ] Local health check passed (dev server starts, integration responds)

If any step fails, report the specific error and suggest remediation before continuing.

## Summary

Present a structured result block:

```
## Marketplace Result
- **Integration**: <name>
- **Status**: installed | partially configured | failed
- **Package**: <sdk-package>@<version>
- **Env Vars**: <count> provisioned / <count> required
- **Drain**: configured | not applicable | manual setup needed
- **Health Check**: passed | failed | skipped
- **Files Changed**: <list of created/modified files>
```

## Next Steps

Based on the outcome:

- **Installed successfully** → "Run `/deploy` to deploy with the new integration. Your environment variables are already configured on Vercel."
- **Env vars missing** → "Provision the missing variables via the Vercel dashboard or `vercel integration add <name>`, then re-run `/marketplace <name>` to continue setup."
- **CLI handed off to dashboard** → "Run `vercel integration open <name>` to complete the provider web step, then resume from env verification."
- **Drain not auto-created** → "Create a drain manually via the REST API. See `⤳ skill: observability` for the `/v1/drains` endpoint and payload format."
- **Need Speed Insights / Web Analytics export** → "These data types require manual drain setup — they are not auto-configured by vendor installs. See `⤳ skill: observability`."
- **Health check failed** → "Review the error above. Common fixes: copy env vars to `.env.local` with `vercel env pull`, check SDK version compatibility, verify network access."
- **Want another integration?** → "Run `/marketplace` again to browse available integrations."
- **Review changes** → "Run `git diff` to review all integration-related code changes before committing."
````

## File: `commands/status.md`

---
description: Show the status of the current Vercel project — recent deployments, linked project info, and environment overview.
---

### Vercel Project Status (Doctor)

Comprehensive project health check. Diagnoses deployment state, environment configuration, domains, and build status.

#### Preflight

1. Check for `.vercel/project.json` in the current directory (or nearest parent).
   - **If found**: read `projectId` and `orgId` to confirm linkage. Print project name.
   - **If not found**: print a clear message:
     > This project is not linked to Vercel. Run `vercel link` to connect it, then re-run `/status`.
     Stop here — remaining steps require a linked project.
2. Verify `vercel` CLI is available on PATH. If missing, suggest `npm i -g vercel`.
3. Detect monorepo markers (`turbo.json`, `pnpm-workspace.yaml`). If present, note which package scope is active.

#### Plan

Gather project diagnostics using MCP reads where available, CLI as fallback:

1. Fetch recent deployments (last 5).
2. Inspect the latest deployment for build status and metadata.
3. List environment variables per environment (counts only — never print values).
4. Check domain configuration and status.
5. Read `vercel.json` for configuration highlights.

No destructive operations — this command is read-only.

#### Commands

##### 1. Recent Deployments

```
vercel ls --limit 5
```

Extract: deployment URL, state (READY / ERROR / BUILDING), target (production / preview), created timestamp.

##### 2. Latest Deployment Inspection

```
vercel inspect <latest-deployment-url>
```

Extract: build duration, function count, region, framework detected, Node.js version.

##### 3. Environment Variable Counts

```
vercel env ls
```

Count variables per environment (Production, Preview, Development). **Never echo variable values.**

Present as:

| Environment | Count |
|-------------|-------|
| Production  | N     |
| Preview     | N     |
| Development | N     |

##### 4. Domain Status

```
vercel domains ls
```

For each domain: name, DNS configured (yes/no), SSL valid (yes/no).

##### 5. Configuration Highlights

Read `vercel.json` (if present) and summarize:

- Framework preset
- Build command overrides
- Function configuration (runtime, memory, duration)
- Rewrites / redirects count
- Cron jobs defined
- Headers or middleware config

If `vercel.json` does not exist, note "No vercel.json found — using framework defaults."

##### 6. Observability Diagnostics

Check the project's observability posture — drains, error monitoring, analytics instrumentation, and drain security.

###### 6a. Drains Configured?

List drains for the exact project with the connected Vercel App. If that operation is unavailable, use the existing authorized Vercel Dashboard session for the same team.

- **If drains exist**: list drain count, types (JSON/NDJSON/Syslog), and statuses.
- **If zero drains**: note "No drains configured" and flag as a gap for production observability.

###### 6b. Errored Drains?

For each drain returned, check the status field. If any drain shows an error or disabled state:

```
⚠️ Drain "<drain-url>" is in error state.
Remediation:
  1. Verify the endpoint URL is reachable and returns 2xx.
  2. Check that the endpoint accepts the configured format (JSON/NDJSON/Syslog).
  3. Test the drain: POST /v1/drains/<drain-id>/test
  4. If unrecoverable, delete and recreate the drain.
```

###### 6c. Analytics Instrumentation Present?

Scan the project source for `@vercel/analytics` and `@vercel/speed-insights` imports:

- Check `package.json` dependencies for `@vercel/analytics` and `@vercel/speed-insights`.
- If missing either package, flag:
  > Analytics/Speed Insights not detected. See `⤳ skill: observability` for setup.

###### 6d. Drain Signature Verification

<!-- Sourced from observability skill: Drains > Security: Signature Verification -->
Vercel signs every drain payload with an HMAC-SHA1 signature in the `x-vercel-signature` header. **Always verify signatures in production** to prevent spoofed data.

> **Critical:** You must verify against the **raw request body** (not a parsed/re-serialized version). JSON parsing and re-stringifying can change key order or whitespace, breaking the signature match.

```ts
import { createHmac, timingSafeEqual } from 'crypto'

function verifyDrainSignature(rawBody: string, signature: string, secret: string): boolean {
  const expected = createHmac('sha1', secret).update(rawBody).digest('hex')
  // Use timing-safe comparison to prevent timing attacks
  if (expected.length !== signature.length) return false
  return timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
}
```

Usage in a drain endpoint:

```ts
// app/api/drain/route.ts
export async function POST(req: Request) {
  const rawBody = await req.text()
  const signature = req.headers.get('x-vercel-signature')
  const secret = process.env.DRAIN_SECRET!

  if (!signature || !verifyDrainSignature(rawBody, signature, secret)) {
    return new Response('Unauthorized', { status: 401 })
  }

  const events = JSON.parse(rawBody)
  // Process verified events...
  return new Response('OK', { status: 200 })
}
```

> **Secret management:** The drain signing secret is shown once when you create the drain. Store it in an environment variable (e.g., `DRAIN_SECRET`). If lost, delete and recreate the drain.

Check whether the project has a `DRAIN_SECRET` env var set via `vercel env ls`. If drains are configured but no signature secret is found, flag as a security gap.

###### 6e. Fallback Guidance (No Drains)

<!-- Sourced from observability skill: Drains > Fallback Guidance (No Drains) -->
If drains are unavailable (Hobby plan or not yet configured), use these alternatives:

| Need | Alternative | How |
|------|-------------|-----|
| View runtime logs | **Vercel Dashboard** | `https://vercel.com/{team}/{project}/deployments` → select deployment → Logs tab |
| Stream logs from terminal | **Vercel CLI** | `vercel logs <deployment-url> --follow` (see `⤳ skill: vercel-cli`) |
| Query logs programmatically | **MCP / REST API** | `get_runtime_logs` tool or `/v3/deployments/:id/events` (see `⤳ skill: vercel-api`) |
| Monitor errors post-deploy | **CLI** | `vercel logs <url> --level error --since 1h` |
| Web Analytics data | **Dashboard only** | `https://vercel.com/{team}/{project}/analytics` |
| Performance metrics | **Dashboard only** | `https://vercel.com/{team}/{project}/speed-insights` |

> **Upgrade path:** When ready for centralized observability, upgrade to Pro and configure drains at `https://vercel.com/dashboard/{team}/~/settings/log-drains` or via REST API. The drain setup is typically < 5 minutes.

###### Observability Decision Matrix

<!-- Sourced from observability skill: Decision Matrix -->
| Need | Use | Why |
|------|-----|-----|
| Page views, traffic sources | Web Analytics | First-party, privacy-friendly |
| Business event tracking | Web Analytics custom events | Track conversions, feature usage |
| Core Web Vitals monitoring | Speed Insights | Real user data per route |
| Function debugging | Runtime Logs (CLI `vercel logs` / Dashboard (`https://vercel.com/{team}/{project}/logs`) / REST) | Real-time, per-invocation logs |
| Export logs to external platform | Drains (JSON/NDJSON/Syslog) | Centralize observability (Pro+) |
| Export analytics data | Drains (Web Analytics type) | Warehouse pageviews + custom events (Pro+) |
| OpenTelemetry traces | Drains (OTel-compatible endpoint) | Standards-based distributed tracing (Pro+) |
| Post-response telemetry | `waitUntil` + custom reporting | Non-blocking metrics |
| Server-side event tracking | `@vercel/analytics/server` | Track API-triggered events |
| Hobby plan log access | CLI `vercel logs` + Dashboard (`https://vercel.com/{team}/{project}/logs`) | No drains needed |

#### Verification

Confirm each data source returned successfully:

- [ ] Deployment list retrieved (count > 0 or "no deployments yet")
- [ ] Latest deployment inspected (or skipped if no deployments)
- [ ] Environment variable counts retrieved per environment
- [ ] Domain list retrieved (or "no custom domains")
- [ ] vercel.json parsed (or "not present")
- [ ] Drain status checked (count, errored drains identified)
- [ ] Analytics/Speed Insights instrumentation detected (or gap flagged)
- [ ] Drain signature secret checked (if drains configured)

If any check fails, report the specific error and continue with remaining checks.

#### Summary

Present the diagnostic report:

```
## Vercel Doctor — Project Status

**Project**: <name> (<org>)
**Latest Deployment**: <url> — <state> (<target>, <timestamp>)
**Build**: <duration>, <framework>, Node <version>

### Deployments (last 5)
| URL | State | Target | Created |
|-----|-------|--------|---------|
| ... | ...   | ...    | ...     |

### Environment Variables
| Environment | Count |
|-------------|-------|
| Production  | N     |
| Preview     | N     |
| Development | N     |

### Domains
| Domain | DNS | SSL |
|--------|-----|-----|
| ...    | ... | ... |

### Config Highlights
- <key settings from vercel.json>

### Observability
| Check | Status |
|-------|--------|
| Drains configured | N configured (N healthy, N errored) |
| Analytics (`@vercel/analytics`) | ✓ installed / ✗ not found |
| Speed Insights (`@vercel/speed-insights`) | ✓ installed / ✗ not found |
| Drain signature secret | ✓ DRAIN_SECRET set / ⚠ missing |
```

#### Next Steps

Based on the diagnostic results, suggest relevant actions:

- **Build errors** → "Run `/deploy` to trigger a fresh build, or check `vercel logs <url>` for details."
- **Missing env vars** → "Run `/env list` to review, or `/env pull` to sync locally."
- **DNS not configured** → "Update your domain DNS records. See the Vercel domains dashboard."
- **No deployments** → "Run `/deploy` to create your first deployment."
- **Stale deployment** → "Your latest deployment is over 7 days old. Consider redeploying."
- **No vercel.json** → "Add a `vercel.json` if you need custom build, function, or routing configuration."
- **No drains (Hobby)** → "View logs via Dashboard or `vercel logs <url> --follow`. Upgrade to Pro for drain-based forwarding."
- **No drains (Pro+)** → "Configure drains for centralized observability. See `⤳ skill: observability` or run via REST API."
- **Errored drain** → "Test the endpoint: `POST /v1/drains/<id>/test`. Check URL reachability and format compatibility."
- **Missing analytics** → "Install `@vercel/analytics` and add `<Analytics />` to your root layout."
- **Missing speed insights** → "Install `@vercel/speed-insights` and add `<SpeedInsights />` to your root layout."
- **Missing drain secret** → "Set `DRAIN_SECRET` env var. Without it, drain endpoints can't verify payload authenticity."

## File: `commands/status.md.tmpl`

````text
---
description: Show the status of the current Vercel project — recent deployments, linked project info, and environment overview.
---

# Vercel Project Status (Doctor)

Comprehensive project health check. Diagnoses deployment state, environment configuration, domains, and build status.

## Preflight

1. Check for `.vercel/project.json` in the current directory (or nearest parent).
   - **If found**: read `projectId` and `orgId` to confirm linkage. Print project name.
   - **If not found**: print a clear message:
     > This project is not linked to Vercel. Run `vercel link` to connect it, then re-run `/status`.
     Stop here — remaining steps require a linked project.
2. Verify `vercel` CLI is available on PATH. If missing, suggest `npm i -g vercel`.
3. Detect monorepo markers (`turbo.json`, `pnpm-workspace.yaml`). If present, note which package scope is active.

## Plan

Gather project diagnostics using MCP reads where available, CLI as fallback:

1. Fetch recent deployments (last 5).
2. Inspect the latest deployment for build status and metadata.
3. List environment variables per environment (counts only — never print values).
4. Check domain configuration and status.
5. Read `vercel.json` for configuration highlights.

No destructive operations — this command is read-only.

## Commands

### 1. Recent Deployments

```
vercel ls --limit 5
```

Extract: deployment URL, state (READY / ERROR / BUILDING), target (production / preview), created timestamp.

### 2. Latest Deployment Inspection

```
vercel inspect <latest-deployment-url>
```

Extract: build duration, function count, region, framework detected, Node.js version.

### 3. Environment Variable Counts

```
vercel env ls
```

Count variables per environment (Production, Preview, Development). **Never echo variable values.**

Present as:

| Environment | Count |
|-------------|-------|
| Production  | N     |
| Preview     | N     |
| Development | N     |

### 4. Domain Status

```
vercel domains ls
```

For each domain: name, DNS configured (yes/no), SSL valid (yes/no).

### 5. Configuration Highlights

Read `vercel.json` (if present) and summarize:

- Framework preset
- Build command overrides
- Function configuration (runtime, memory, duration)
- Rewrites / redirects count
- Cron jobs defined
- Headers or middleware config

If `vercel.json` does not exist, note "No vercel.json found — using framework defaults."

### 6. Observability Diagnostics

Check the project's observability posture — drains, error monitoring, analytics instrumentation, and drain security.

#### 6a. Drains Configured?

Use MCP `list_drains` if available, or the REST API:

```bash
curl -s -H "Authorization: Bearer $VERCEL_TOKEN" \
  "https://api.vercel.com/v1/drains?teamId=$TEAM_ID" | jq '.drains | length'
```

- **If drains exist**: list drain count, types (JSON/NDJSON/Syslog), and statuses.
- **If zero drains**: note "No drains configured" and flag as a gap for production observability.

#### 6b. Errored Drains?

For each drain returned, check the status field. If any drain shows an error or disabled state:

```
⚠️ Drain "<drain-url>" is in error state.
Remediation:
  1. Verify the endpoint URL is reachable and returns 2xx.
  2. Check that the endpoint accepts the configured format (JSON/NDJSON/Syslog).
  3. Test the drain: POST /v1/drains/<drain-id>/test
  4. If unrecoverable, delete and recreate the drain.
```

#### 6c. Analytics Instrumentation Present?

Scan the project source for `@vercel/analytics` and `@vercel/speed-insights` imports:

- Check `package.json` dependencies for `@vercel/analytics` and `@vercel/speed-insights`.
- If missing either package, flag:
  > Analytics/Speed Insights not detected. See `⤳ skill: observability` for setup.

#### 6d. Drain Signature Verification

<!-- Sourced from observability skill: Drains > Security: Signature Verification -->
{{include:skill:observability:Drains > Security: Signature Verification}}

Check whether the project has a `DRAIN_SECRET` env var set via `vercel env ls`. If drains are configured but no signature secret is found, flag as a security gap.

#### 6e. Fallback Guidance (No Drains)

<!-- Sourced from observability skill: Drains > Fallback Guidance (No Drains) -->
{{include:skill:observability:Drains > Fallback Guidance (No Drains)}}

#### Observability Decision Matrix

<!-- Sourced from observability skill: Decision Matrix -->
{{include:skill:observability:Decision Matrix}}

## Verification

Confirm each data source returned successfully:

- [ ] Deployment list retrieved (count > 0 or "no deployments yet")
- [ ] Latest deployment inspected (or skipped if no deployments)
- [ ] Environment variable counts retrieved per environment
- [ ] Domain list retrieved (or "no custom domains")
- [ ] vercel.json parsed (or "not present")
- [ ] Drain status checked (count, errored drains identified)
- [ ] Analytics/Speed Insights instrumentation detected (or gap flagged)
- [ ] Drain signature secret checked (if drains configured)

If any check fails, report the specific error and continue with remaining checks.

## Summary

Present the diagnostic report:

```
## Vercel Doctor — Project Status

**Project**: <name> (<org>)
**Latest Deployment**: <url> — <state> (<target>, <timestamp>)
**Build**: <duration>, <framework>, Node <version>

### Deployments (last 5)
| URL | State | Target | Created |
|-----|-------|--------|---------|
| ... | ...   | ...    | ...     |

### Environment Variables
| Environment | Count |
|-------------|-------|
| Production  | N     |
| Preview     | N     |
| Development | N     |

### Domains
| Domain | DNS | SSL |
|--------|-----|-----|
| ...    | ... | ... |

### Config Highlights
- <key settings from vercel.json>

### Observability
| Check | Status |
|-------|--------|
| Drains configured | N configured (N healthy, N errored) |
| Analytics (`@vercel/analytics`) | ✓ installed / ✗ not found |
| Speed Insights (`@vercel/speed-insights`) | ✓ installed / ✗ not found |
| Drain signature secret | ✓ DRAIN_SECRET set / ⚠ missing |
```

## Next Steps

Based on the diagnostic results, suggest relevant actions:

- **Build errors** → "Run `/deploy` to trigger a fresh build, or check `vercel logs <url>` for details."
- **Missing env vars** → "Run `/env list` to review, or `/env pull` to sync locally."
- **DNS not configured** → "Update your domain DNS records. See the Vercel domains dashboard."
- **No deployments** → "Run `/deploy` to create your first deployment."
- **Stale deployment** → "Your latest deployment is over 7 days old. Consider redeploying."
- **No vercel.json** → "Add a `vercel.json` if you need custom build, function, or routing configuration."
- **No drains (Hobby)** → "View logs via Dashboard or `vercel logs <url> --follow`. Upgrade to Pro for drain-based forwarding."
- **No drains (Pro+)** → "Configure drains for centralized observability. See `⤳ skill: observability` or run via REST API."
- **Errored drain** → "Test the endpoint: `POST /v1/drains/<id>/test`. Check URL reachability and format compatibility."
- **Missing analytics** → "Install `@vercel/analytics` and add `<Analytics />` to your root layout."
- **Missing speed insights** → "Install `@vercel/speed-insights` and add `<SpeedInsights />` to your root layout."
- **Missing drain secret** → "Set `DRAIN_SECRET` env var. Without it, drain endpoints can't verify payload authenticity."
````
