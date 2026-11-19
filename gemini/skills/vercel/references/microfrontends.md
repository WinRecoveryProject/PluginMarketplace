# Skill: microfrontends

- Plugin: `vercel` (0.56.0-wrp.1)
- Source: `plugins/vercel/skills/microfrontends/SKILL.md`

> Guide for building, configuring, and deploying microfrontends on Vercel. Use this skill when the user mentions microfrontends, multi-zones, splitting an app across teams, independent deployments, cross-app routing, incremental migration, composing multiple frontends under one domain, microfrontends.json, @vercel/microfrontends, the microfrontends local proxy, or path-based routing between Vercel projects. Also use when the user asks about shared layouts across projects, navigation between microfrontends, fallback environments, asset prefixes, or feature flag controlled routing.

## Instructions

### Vercel Microfrontends
Split a large application into independently deployable units that render as one cohesive app. Vercel handles routing on its global network using `microfrontends.json`.

**Core concepts:** default app (has `microfrontends.json`, serves unmatched requests) · child apps (have `routing` path patterns) · asset prefix (prevents static-asset collisions) · independent deployments.

**Frameworks:** Next.js (App Router + Pages Router), SvelteKit, React Router, Vite — all via `@vercel/microfrontends`.

**CLI (`vercel microfrontends` / `vercel mf`):**
- `create-group` — create a new group; interactive by default, or fully non-interactive with `--non-interactive` (options: `--name`, `--project` (repeatable), `--default-app`, `--default-route`, `--project-default-route` (repeatable, format: `<project>=<route>`, required for each non-default project in non-interactive mode), `--yes` to skip confirmation prompt); note: `--non-interactive` is blocked if adding the projects would exceed the free tier limit — the user must confirm billing changes interactively
- `add-to-group` — add the current project to an existing group; always asks for confirmation (there is no `--yes`), so it needs an interactive terminal, and it refuses to run with `--non-interactive` when adding would go past the free project limit (options: `--group` and `--default-route` pre-fill the prompts)
- `remove-from-group` — remove the current project from its group; without `--yes` it needs an interactive terminal (option: `--yes` skips the project-link prompt and removal confirmations, including the warning for projects still referenced in `microfrontends.json`)
- `delete-group` — delete a group and all its settings, irreversible; without `--yes` it needs an interactive terminal (options: `--group` to pre-select group, `--yes` skips the deletion confirmation; pass both to delete without prompts)
- `inspect-group` — retrieve group metadata (project names, frameworks, git repos, root dirs); useful for automating setup (options: `--group`, `--json` (CLI 58.1+; older CLIs use `--format=json`), `--config-file-name`)
- `pull` — pull remote `microfrontends.json` for local development (option: `--deployment`; needs Vercel CLI 65+, older CLIs use `--dpl`)
- `microfrontends proxy` — local dev proxy · `microfrontends port` — print auto-assigned port

#### Finding Detailed Information

This skill includes detailed reference docs in the `references/` directory. **Do not read all references upfront.** Instead, search or grep the relevant file when the user asks about a specific topic:

| Topic | Reference file |
|---|---|
| Getting started, quickstart, framework setup, `microfrontends.json` schema, fields, naming, examples | `references/configuration.md` |
| Path expressions, asset prefixes, flag-controlled routing, middleware | `references/path-routing.md` |
| Local proxy setup, polyrepo config, Turborepo, ports, deployment protection | `references/local-development.md` |
| Inspecting groups (`inspect-group`), adding/removing projects, fallback environments, navigation, observability | `references/managing-microfrontends.md` |
| Testing utilities (`validateMiddlewareConfig`, `validateRouting`, etc.), debug headers, common issues | `references/troubleshooting.md` |
| Deployment protection, Vercel Firewall, WAF rules for microfrontends | `references/security.md` |

When the user asks about a specific topic, use grep or search over the relevant reference file to find the answer without loading all references into context.

## Bundled files

### File: `.vercel.approvers`

```text
@vercel/microfrontends:team
```

### File: `references/configuration.md`

#### Configuration Reference

The `microfrontends.json` file is the single source of truth for microfrontend routing. It must be deployed with the default application.

##### Getting Started

1. **Create a microfrontends group** using the CLI (`vercel microfrontends create-group`) or the Vercel Dashboard: Settings → Microfrontends → Create Group.
2. **Inspect the group** (optional but recommended for automation): `vercel mf inspect-group --group="<name>" --json` (CLI 58.1+; older CLIs use `--format=json`) returns project names, frameworks, git repos, and root directories needed for the remaining steps.
3. **Add `microfrontends.json`** at the root of the default application (see [Full Schema](#full-schema) and [Example Configurations](#example-configurations)).
4. **Install** in every microfrontend: `pnpm i @vercel/microfrontends`
5. **Integrate with your framework** — add `withMicrofrontends` (Next.js/SvelteKit) or the `microfrontends()` Vite plugin to each app's config (see [Framework Setup](#framework-setup)).
6. **Deploy** — push to Vercel. Config takes effect once `microfrontends.json` is deployed to production.

> **Note:** If the user has already created the group (step 1), the immediate next steps are to set up `microfrontends.json` (step 3), install `@vercel/microfrontends` (step 4), and add the framework integration (step 5) in each project. Do not skip these — the group alone does nothing without the config and framework wiring.

##### Framework Setup

###### Next.js

```ts
// next.config.ts
import { withMicrofrontends } from '@vercel/microfrontends/next/config';
export default withMicrofrontends(nextConfig);
```

For Pages Router support:

```ts
export default withMicrofrontends(nextConfig, { supportPagesRouter: true });
```

###### SvelteKit

Wrap the SvelteKit config with `withMicrofrontends` from `@vercel/microfrontends/experimental/sveltekit` and add the `microfrontends()` Vite plugin from `@vercel/microfrontends/experimental/vite`.

###### React Router / Vite

Add the `microfrontends()` Vite plugin from `@vercel/microfrontends/experimental/vite`.

##### Full Schema

```json
{
  "$schema": "https://openapi.vercel.sh/microfrontends.json",
  "version": "1",
  "applications": {
    "<default-app-name>": {
      "packageName": "<optional: name from package.json if different>",
      "development": {
        "fallback": "<required: production URL for fallback>",
        "local": "<optional: port number or host for local dev>",
        "task": "<optional: dev script name, default 'dev'>"
      }
    },
    "<child-app-name>": {
      "packageName": "<optional: name from package.json if different>",
      "assetPrefix": "<optional: custom asset prefix>",
      "routing": [
        {
          "group": "<optional: group name>",
          "flag": "<optional: feature flag name>",
          "paths": ["/path/:path*"]
        }
      ],
      "development": {
        "local": "<optional: port or host>",
        "task": "<optional: dev script name>",
        "fallback": "<optional: overrides default app fallback>"
      }
    }
  },
  "options": {
    "localProxyPort": 3024,
    "disableOverrides": false
  }
}
```

##### Field Details

###### `applications` (required)

A map of Vercel project names to their configurations. Keys must match the Vercel project name.

**One application must be the default app** — identified by not having a `routing` field. There must be exactly one.

###### Default Application

| Field | Type | Required | Description |
|---|---|---|---|
| `development.fallback` | `string` | Yes | Production URL used as fallback for apps not running locally. Include host only (e.g., `myapp.vercel.app`). Protocol defaults to HTTPS. |
| `development.local` | `number \| string` | No | Port or host for local dev. Default: auto-assigned based on app name. |
| `development.task` | `string` | No | Script name from `package.json` to run for dev. Default: `"dev"`. |
| `packageName` | `string` | No | Set if Vercel project name differs from `package.json` `name` field. |

###### Child Application

| Field | Type | Required | Description |
|---|---|---|---|
| `routing` | `PathGroup[]` | Yes | Array of path groups that route to this app. |
| `assetPrefix` | `string` | No | Custom asset prefix. Default: auto-generated `vc-ap-<hash>`. |
| `development.local` | `number \| string` | No | Port or host for local dev. |
| `development.task` | `string` | No | Dev script name. |
| `development.fallback` | `string` | No | Override fallback URL. Defaults to the default app's fallback. |
| `packageName` | `string` | No | Set if project name differs from `package.json` `name`. |

###### PathGroup

| Field | Type | Required | Description |
|---|---|---|---|
| `paths` | `string[]` | Yes | Path expressions routed to this app. |
| `group` | `string` | No | Descriptive group name. |
| `flag` | `string` | No | Feature flag name controlling routing for this group. |

###### `options`

| Field | Type | Default | Description |
|---|---|---|---|
| `localProxyPort` | `number` | `3024` | Port for the local development proxy. |
| `disableOverrides` | `boolean` | `false` | Disable routing overrides in the Vercel Toolbar. |

##### Application Naming

Application keys in `microfrontends.json` must match Vercel project names. If the project name differs from the `name` field in the app's `package.json`, set `packageName`:

```json
{
  "applications": {
    "docs": {
      "packageName": "my-docs-package",
      "routing": [
        { "paths": ["/docs/:path*"] }
      ]
    }
  }
}
```

##### File Naming

- Default names: `microfrontends.json` or `microfrontends.jsonc`
- Custom name via env var: `VC_MICROFRONTENDS_CONFIG_FILE_NAME`
  - Must end with `.json` or `.jsonc`
  - May include a path: `/path/to/microfrontends.json`
  - Path is relative to the root directory of the default application
  - Add this env var to **all projects** in the microfrontends group

Using a custom file name allows the same repository to support multiple microfrontends groups.

**With Turborepo:** Define the env var outside the Turbo invocation:

```bash
VC_MICROFRONTENDS_CONFIG_FILE_NAME="microfrontends-dev.json" turbo dev
```

##### Example Configurations

###### Minimal (two Next.js apps)

```json
{
  "$schema": "https://openapi.vercel.sh/microfrontends.json",
  "applications": {
    "web": {
      "development": {
        "fallback": "web-production.vercel.app"
      }
    },
    "docs": {
      "routing": [
        { "paths": ["/docs/:path*"] }
      ]
    }
  }
}
```

###### With custom ports, flags, and asset prefix

```json
{
  "$schema": "https://openapi.vercel.sh/microfrontends.json",
  "applications": {
    "marketing": {
      "development": {
        "local": 3000,
        "fallback": "marketing.vercel.app"
      }
    },
    "docs": {
      "assetPrefix": "docs-assets",
      "development": { "local": 3001 },
      "routing": [
        {
          "group": "docs",
          "paths": ["/docs/:path*", "/docs-assets/:path*"]
        },
        {
          "group": "flagged-docs",
          "flag": "enable-new-docs",
          "paths": ["/new-docs/:path*"]
        }
      ]
    }
  }
}
```

##### JSON Schema Validation

Use the schema URL for editor autocompletion and validation:

```json
{
  "$schema": "https://openapi.vercel.sh/microfrontends.json"
}
```

### File: `references/local-development.md`

#### Local Development Reference

##### Overview

The `@vercel/microfrontends` local development proxy routes requests between locally running microfrontends and production fallbacks. This allows developers to run only the microfrontend they're working on while still being able to navigate the full application.

**How it works:**

- The proxy listens on a single port (default `3024`)
- Requests matching a child app's routing paths are sent to the local dev server (if running) or to the production fallback
- Requests not matching any child app go to the default app

> **Warning (Next.js):** Traffic the default or a child application receives directly will be redirected to the local proxy. Set `MFE_DISABLE_LOCAL_PROXY_REWRITE=1` to disable this.

##### Application Setup

Configure each app's dev server to use the auto-assigned port so the proxy knows where to route:

```json
{
  "name": "web",
  "scripts": {
    "dev": "next dev --port $(microfrontends port)"
  },
  "dependencies": {
    "@vercel/microfrontends": "latest"
  }
}
```

###### Custom ports

Set a specific port in `microfrontends.json`:

```json
{
  "applications": {
    "docs": {
      "routing": [{ "paths": ["/docs/:path*"] }],
      "development": {
        "local": 3001
      }
    }
  }
}
```

The `local` field accepts:

- A port number: `3001`
- A host: `my.localhost.me:3001`
- A full URL: `https://my.localhost.me:3030`

###### packageName mapping

If the Vercel project name differs from `package.json` `name`:

```json
{
  "applications": {
    "docs": {
      "packageName": "my-docs-package",
      "routing": [{ "paths": ["/docs/:path*"] }]
    }
  }
}
```

##### Starting the Local Proxy

###### Monorepo with Turborepo

The proxy starts automatically when running a dev task with `turbo`:

```bash
turbo run dev --filter=web
```

This starts the `web` dev server and a proxy routing other microfrontends to production fallbacks.

> Requires `turbo` version `2.3.6` or `2.4.2` or newer.

Turborepo infers configuration from `microfrontends.json`, so no additional Turbo config is needed for microfrontends.

###### Without Turborepo

Start the proxy manually:

```json
{
  "scripts": {
    "dev": "next dev --port $(microfrontends port)",
    "proxy": "microfrontends proxy microfrontends.json --local-apps web"
  }
}
```

Run both `dev` and `proxy` scripts simultaneously.

###### Accessing the proxy

Visit the proxy URL shown in terminal output (default `http://localhost:3024`).

Change the port in `microfrontends.json`:

```json
{
  "options": {
    "localProxyPort": 4001
  }
}
```

##### Polyrepo Setup

For separate repositories, the `microfrontends.json` file won't be auto-detected. You need to make it available to each repo.

###### Option 1: Vercel CLI

```bash
vercel microfrontends pull
```

Downloads `microfrontends.json` from your default application. Requires Vercel CLI 44.2.2+.

###### Option 2: Environment variable

```bash
export VC_MICROFRONTENDS_CONFIG=/path/to/microfrontends.json
```

Or in `.env`:

```
VC_MICROFRONTENDS_CONFIG=/path/to/microfrontends.json
```

###### Running in polyrepo

1. Start your local microfrontend dev server (e.g., `next dev --port $(microfrontends port)`)
2. In the same or separate terminal, start the proxy:

```bash
microfrontends proxy --local-apps your-app-name
```

3. Visit the proxy URL (default `http://localhost:3024`)

##### Proxy Command Reference

```
microfrontends proxy [configPath] --local-apps <names...> [--port <port>]
```

| Argument/Flag             | Description                                                           |
| ------------------------- | --------------------------------------------------------------------- |
| `[configPath]`            | Path to `microfrontends.json`. Optional in monorepos (auto-detected). |
| `--local-apps <names...>` | Space-separated list of locally running app names.                    |
| `--port <port>`           | Override the proxy port.                                              |

Example with multiple local apps:

```bash
microfrontends proxy microfrontends.json --local-apps web docs
```

##### Port Configuration

```
microfrontends port
```

Prints the auto-assigned development port for the current application. The port is deterministic based on the application name and the microfrontends configuration.

Use in `package.json` scripts:

```json
{
  "scripts": {
    "dev": "next dev --port $(microfrontends port)"
  }
}
```

##### Debug Routing

Enable debug logs to see where and why the proxy routed each request:

1. Set environment variable `MFE_DEBUG=1`, **or**
2. Pass `debug: true` to `withMicrofrontends`:

```ts
export default withMicrofrontends(nextConfig, { debug: true });
```

Debug output shows:

- Environment variables set by microfrontends
- Rewrites configured
- For each request: matched path, target application, local vs fallback

##### Protected Deployment Fallbacks

To fall back to deployments with [Deployment Protection](https://vercel.com/docs/deployment-protection), set a bypass environment variable.

The local proxy reads `VERCEL_AUTOMATION_BYPASS_SECRET` from the default app's environment (Vercel sets this automatically as a system environment variable) and sends its value as the `x-vercel-protection-bypass` header when proxying to protected child project deployments.

###### Setup steps

1. **Find the default app's secret**: in the default app's Vercel project, go to Settings → Deployment Protection → Protection Bypass for Automation → copy the secret (this is what Vercel exposes as `VERCEL_AUTOMATION_BYPASS_SECRET`)
2. **Add that secret to each child project**: in each child project's Vercel project, go to Settings → Deployment Protection → add a Protection Bypass for Automation secret using the same value
3. **Set locally**: add `VERCEL_AUTOMATION_BYPASS_SECRET=<secret>` to the default app's local environment file (e.g. `.env.local`)

### File: `references/managing-microfrontends.md`

#### Managing Microfrontends Reference

##### Inspecting a Group

Use `vercel microfrontends inspect-group` to retrieve metadata about a microfrontends group and its projects. This is useful for setup automation and scripts — it provides the project names, frameworks, git repos, and root directories needed to generate `microfrontends.json` and wire up framework integrations.

```bash
vercel microfrontends inspect-group [options]
```

If you omit `--group`, the command is interactive and lets you select a group. In non-interactive environments, pass `--group`.

###### Options

| Option | Description |
|---|---|
| `--group` | Name, slug, or ID of the microfrontends group to inspect |
| `--config-file-name` | Custom microfrontends config file path/name relative to the default app root (must end with `.json` or `.jsonc`) |
| `--format` | Output format. Use `json` for machine-readable output |

###### Examples

```bash
#### Interactive selection
vercel microfrontends inspect-group

#### JSON output for scripting/agents (`--json` needs CLI 58.1+; older CLIs use `--format=json`)
vercel mf inspect-group --group="My Group" --json

#### With a custom config filename
vercel mf inspect-group --group="My Group" --config-file-name=microfrontends.jsonc --json
```

> **Tip for agents:** After the user creates a group, run `vercel mf inspect-group --group="<name>" --json` to get the project metadata needed to automate the remaining setup (generating `microfrontends.json`, installing `@vercel/microfrontends`, and adding framework integrations).

##### Adding Microfrontends

**CLI:** run from the project directory and follow the prompts:

```bash
vercel microfrontends add-to-group
#### or with flags:
vercel mf add-to-group --group="My Group" --default-route=/docs
```

**Dashboard:** Settings → Microfrontends → find the group → **Add to Group**.

Changes take effect on the next deployment.

##### Removing Microfrontends

**CLI:** run from the project directory and follow the prompts:

```bash
vercel microfrontends remove-from-group
```

After removal, update `microfrontends.json` in the default app to remove the project's entry — if it's still referenced, the CLI warns you and asks for an extra confirmation; in a non-interactive environment, pass `--yes` or the removal fails.

**Dashboard:**
1. Remove the microfrontend from `microfrontends.json` in the default app
2. Visit **Settings** for the project
3. Click **Microfrontends** → **Remove from Group**

> The default application can only be removed after all other projects in the group are removed, and only via the dashboard or `delete-group` — the CLI's `remove-from-group` cannot remove the default application.

##### Deleting a Group

This action is not reversible. You can delete a group even with projects still in it — all projects will be removed from the group automatically.

**CLI:** run from the project directory and follow the prompts:

```bash
vercel microfrontends delete-group
#### or pre-select the group with a flag:
vercel mf delete-group --group="My Group"
```

**Dashboard:** in team **Settings** → **Microfrontends** (or the default app's **Microfrontends** settings), open the group's menu and select **Delete Group** — no need to remove projects first.

##### Fallback Environment

Controls where requests are routed when a microfrontend isn't built for a specific commit. This applies to Preview and Custom environments only — production always routes to each project's production deployment.

###### Options

| Setting | Behavior |
|---|---|
| `Same Environment` | Falls back to a deployment in the same environment for the other project. Vercel auto-generates Preview deployments on the production branch. |
| `Production` | Falls back to the promoted Production deployment of the other project. In a custom environment, only when the other project has no custom environment with the same name. |
| Custom environment name | Falls back to a deployment in the specified custom environment. |

###### Fallback behavior matrix

| Current Environment | Fallback Setting | Built for Commit | Not Built for Commit |
|---|---|---|---|
| Preview | Same Environment | Preview | Preview |
| Preview | Production | Preview | Production |
| Preview | `staging` | Preview | `staging` |
| `staging` | Same Environment | `staging` | `staging` |
| `staging` | Production | `staging` | `staging` if the project has one, otherwise Production |

Configure in **Settings** → Microfrontends group → **Fallback Environment**.

> If using Same Environment or Custom Environment, ensure those environments have deployments to fall back to. Missing fallbacks cause `MICROFRONTENDS_MISSING_FALLBACK_ERROR`.

###### Branch domain fallbacks

If a project has a domain assigned to a Git branch and fallback is set to Same Environment, deployments on that branch use the branch's project domain as fallback instead of the production branch. Add the branch domain to every project in the group.

##### Sharing Settings

Use the [Vercel Terraform Provider](https://registry.terraform.io/providers/vercel/vercel/latest/docs) to synchronize settings across projects:

- [Microfrontend group resource](https://registry.terraform.io/providers/vercel/vercel/latest/docs/resources/microfrontend_group)
- [Microfrontend group membership resource](https://registry.terraform.io/providers/vercel/vercel/latest/docs/resources/microfrontend_group_membership)

###### Sharing environment variables

Use [Shared Environment Variables](https://vercel.com/docs/environment-variables/shared-environment-variables) to manage secrets across projects.

For same-name variables with different values per group, create a shared var with a unique name (e.g., `FLAG_SECRET_X`) then map it: `FLAG_SECRET=$FLAG_SECRET_X` in `.env` or build command.

##### Optimizing Navigations

> **Note:** Currently only supported for Next.js.

Navigations between top-level microfrontends cause hard navigations. Vercel optimizes these by prefetching and prerendering cross-zone links.

###### Setup for Next.js App Router

Add `PrefetchCrossZoneLinks` to your root layout in **all** microfrontend apps:

```tsx
// app/layout.tsx
import { PrefetchCrossZoneLinks, PrefetchCrossZoneLinksProvider } from '@vercel/microfrontends/next/client';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <PrefetchCrossZoneLinksProvider>
          {children}
        </PrefetchCrossZoneLinksProvider>
        <PrefetchCrossZoneLinks />
      </body>
    </html>
  );
}
```

`PrefetchCrossZoneLinks` accepts an optional `prerenderEagerness` prop (`'immediate' | 'eager' | 'moderate' | 'conservative'`, default `'conservative'`) that controls how aggressively cross-zone pages are prerendered in the background.

###### Setup for Next.js Pages Router

Add `PrefetchCrossZoneLinks` to `_app.tsx`:

```tsx
// pages/_app.tsx
import { PrefetchCrossZoneLinks, PrefetchCrossZoneLinksProvider } from '@vercel/microfrontends/next/client';

export default function App({ Component, pageProps }) {
  return (
    <>
      <PrefetchCrossZoneLinksProvider>
        <Component {...pageProps} />
      </PrefetchCrossZoneLinksProvider>
      <PrefetchCrossZoneLinks />
    </>
  );
}
```

###### Using the Link component

Use the microfrontends `Link` component instead of regular anchors for cross-zone links:

```tsx
import { Link } from '@vercel/microfrontends/next/client';

export function Navigation() {
  return (
    <nav>
      <Link href="/docs">Docs</Link>
      <Link href="/blog">Blog</Link>
    </nav>
  );
}
```

> **Note:** All paths from `microfrontends.json` become visible on the client side when using this feature.

##### Observability Data Routing

By default, Speed Insights and Analytics data routes to the default application.

To route a project's data to its own Vercel project page:

1. Update dependencies:
   - `@vercel/speed-insights` ≥ `1.2.0`
   - `@vercel/analytics` ≥ `1.5.0`
2. Go to **Settings** → **Microfrontends** for the project
3. Find **Observability Routing** and enable it
4. Takes effect on the next production deployment

> Toggling does not move historical data.

If using Turborepo with `--env-mode=strict`, add `ROUTE_OBSERVABILITY_TO_THIS_PROJECT` and `NEXT_PUBLIC_VERCEL_OBSERVABILITY_BASEPATH` to allowed env vars, or use `--env-mode=loose`.

### File: `references/path-routing.md`

#### Path Routing Reference

Vercel handles routing to microfrontends directly in its network infrastructure. When a request arrives at a domain using microfrontends, the `microfrontends.json` file from the live deployment determines which microfrontend handles it.

##### Adding a New Path

Modify the `routing` section for the target application in `microfrontends.json`:

```json
{
  "$schema": "https://openapi.vercel.sh/microfrontends.json",
  "applications": {
    "web": {
      "development": {
        "fallback": "web.vercel.app"
      }
    },
    "docs": {
      "routing": [
        {
          "paths": ["/docs/:path*", "/new-path-to-route"]
        }
      ]
    }
  }
}
```

The routing change takes effect when the deployment is live. Test in Preview first.

> **Important:** Changes to separate microfrontends are not rolled out in lockstep. Ensure the target application can handle the requests before merging the config change. Use [flags](#flag-controlled-routing) to control rollout safely.

Use [Instant Rollback](https://vercel.com/docs/instant-rollback) to revert routing changes.

##### Supported Path Expressions

| Expression | Description | Example Match |
|---|---|---|
| `/path` | Constant path | `/path` |
| `/:path` | Single path segment wildcard | `/anything` |
| `/:path/suffix` | Single segment with suffix | `/anything/suffix` |
| `/prefix/:path*` | Zero or more segments | `/prefix`, `/prefix/a`, `/prefix/a/b` |
| `/prefix/:path+` | One or more segments | `/prefix/a`, `/prefix/a/b` |
| `/\\(a\\)` | Escaped special characters | `/(a)` |
| `/:path(a\|b)` | Alternation | `/a` or `/b` |
| `/:path(a\|\\(b\\))` | Alternation with escaped chars | `/a` or `/(b)` |
| `/:path((?!a\|b).*)` | Negative lookahead | Any single segment except `/a` or `/b` |
| `/prefix-:path-suffix` | Inline wildcard with prefix/suffix | `/prefix-anything-suffix` |

###### Not Supported

- Conflicting or overlapping paths (paths must uniquely map to one microfrontend)
- Regular expressions beyond the patterns listed above
- Wildcards matching multiple segments (`+`, `*`) that don't come at the end of the expression

Use the [`validateRouting` test utility](https://vercel.com/docs/microfrontends/troubleshooting#validaterouting) to verify path expressions resolve to the correct microfrontend.

##### Asset Prefix

An asset prefix is a unique path prefix for static assets (JS, CSS, images) to prevent URL collisions between microfrontends.

###### Auto-generated (default)

When using `withMicrofrontends`, a default prefix of `vc-ap-<hash>` is generated automatically (obfuscated hash of the project name).

###### Custom asset prefix

Set `assetPrefix` in `microfrontends.json`:

```json
"your-application": {
  "assetPrefix": "marketing-assets",
  "routing": [
    {
      "paths": ["/marketing/:path*", "/marketing-assets/:path*"]
    }
  ]
}
```

> **Warning:** Changing the asset prefix after deployment is not guaranteed to be backwards compatible. Route the new prefix in production before updating the `assetPrefix` field.

###### Next.js asset notes

JavaScript and CSS URLs are automatically prefixed, but content in the `public/` directory must be manually moved to a subdirectory named with the asset prefix.

##### Setting a Default Route

Microfrontend child app deployments may not serve content at `/`. Set a default route in the dashboard so links point to a valid path:

1. Open **Settings** → **Microfrontends** for your project
2. Find **Default Route**
3. Enter a path like `/docs` and save

##### Routing to External Applications

For microfrontends not yet on Vercel, create a Vercel project that rewrites requests to the external host, then use that project in `microfrontends.json`.

##### Flag-Controlled Routing

> **Note:** Only compatible with Next.js.

Use flags to dynamically control routing. Instead of automatic routing, requests go to the default app which decides via middleware whether to route to the microfrontend.

###### Step 1: Add flag to config

```json
{
  "applications": {
    "web": {
      "development": {
        "fallback": "web.vercel.app"
      }
    },
    "docs": {
      "routing": [
        {
          "flag": "name-of-feature-flag",
          "paths": ["/flagged-path"]
        }
      ]
    }
  }
}
```

###### Step 2: Add middleware in the default app

```ts
// middleware.ts
import type { NextRequest } from 'next/server';
import { runMicrofrontendsMiddleware } from '@vercel/microfrontends/next/middleware';

export async function middleware(request: NextRequest) {
  const response = await runMicrofrontendsMiddleware({
    request,
    flagValues: {
      'name-of-feature-flag': async () => {
        // Return true to route to the microfrontend, false to keep on default app
        return true;
      },
    },
  });
  if (response) return response;
}

export const config = {
  matcher: [
    '/.well-known/vercel/microfrontends/client-config',
    '/flagged-path',
  ],
};
```

**Key points:**
- The middleware matcher **must** include `/.well-known/vercel/microfrontends/client-config` (used for prefetch optimizations on flagged paths)
- All flagged paths must be listed in the matcher
- Compatible with the [Flags SDK](https://flags-sdk.dev) or any custom implementation
- If using the Flags SDK, share the same `FLAGS_SECRET` across all microfrontends in the group
- Any `async () => boolean` function works as a flag implementation

##### Domain Routing Rules

###### Production domains

Always route to each project's current production deployment.

###### Custom environment domains

Route to custom environments with the same name, or fallback per the fallback environment configuration.

###### Branch URLs

Route to the latest deployment for the project on the branch. Fallback if no deployment exists.

###### Deployment URLs

Fixed to point-in-time: routes to deployments created for the same commit, or previous commits from the branch.

##### Identifying Which Microfrontend Serves a Path

**Dashboard:** Go to the default app project → Deployment → Deployment Summary → Microfrontends accordion.

**Vercel Toolbar:** Open toolbar on any page → Microfrontends Panel → Directory.

### File: `references/security.md`

#### Managing Microfrontends Security

> Source: [Vercel Docs — Managing microfrontends security](https://vercel.com/docs/microfrontends/managing-microfrontends/security)

How [Deployment Protection](https://vercel.com/docs/deployment-protection) and [Vercel Firewall](https://vercel.com/docs/vercel-firewall) apply to each microfrontend application.

##### Deployment Protection and microfrontends

Each URL is protected by the [Deployment Protection](https://vercel.com/docs/deployment-protection) settings of the project it belongs to, so protection for the microfrontend experience as a whole is determined by the **default application**:

- Requests to a **microfrontend host** (a domain of the default application) are verified **only** by the **default application's** Deployment Protection.
- Requests **directly to a child application** (a child domain) are verified **only** by that **child application's** Deployment Protection.

This applies to all [protection methods](https://vercel.com/docs/deployment-protection/methods-to-protect-deployments) and [bypass methods](https://vercel.com/docs/deployment-protection/methods-to-bypass-deployment-protection), including [Vercel Authentication](https://vercel.com/docs/deployment-protection/methods-to-protect-deployments/vercel-authentication), [Password Protection](https://vercel.com/docs/deployment-protection/methods-to-protect-deployments/password-protection), [Trusted IPs](https://vercel.com/docs/deployment-protection/methods-to-protect-deployments/trusted-ips), [Shareable Links](https://vercel.com/docs/deployment-protection/methods-to-bypass-deployment-protection/sharable-links), [Protection Bypass for Automation](https://vercel.com/docs/deployment-protection/methods-to-bypass-deployment-protection/protection-bypass-automation), [Deployment Protection Exceptions](https://vercel.com/docs/deployment-protection/methods-to-bypass-deployment-protection/deployment-protection-exceptions), and [OPTIONS Allowlist](https://vercel.com/docs/deployment-protection/methods-to-bypass-deployment-protection/options-allowlist).

###### Recommended configuration

- **Default app**: use [Standard Protection](https://vercel.com/docs/deployment-protection) so end users can reach the microfrontend through the default app's URL.
- **Child apps**: enable protection for **all deployments** so they aren't directly accessible. Child content is served through the default app's URL.

This works because Vercel routes to child apps within a single request at the network layer (see [Routing](https://vercel.com/docs/microfrontends/routing)) — not a rewrite that issues a separate request to the child's URL. Deployment protection on a child app therefore applies only when the child's URL is accessed directly.

###### Passport

Passport is configured only on the **default application**; its configuration protects every child path. Child applications cannot have an independent [Passport](https://vercel.com/docs/passport) connection while they belong to the group — remove a child from the group first to configure Passport on it directly. Direct requests to a child application's domain do not use the default application's Passport configuration and need another Deployment Protection method. The default application handles the `/.well-known/vercel/passport/callback` request before application routing, so neither application needs to implement the callback path.

##### Vercel Firewall and microfrontends

- The [platform-wide firewall](https://vercel.com/docs/vercel-firewall#platform-wide-firewall) is applied to all requests.
- The customizable [Web Application Firewall (WAF)](https://vercel.com/docs/vercel-firewall/vercel-waf) of both the default application and the relevant child application is applied to a request:
  - Requests to a **microfrontend host** are verified by the **default application's** WAF; requests to child paths are **additionally** verified by the **child application's** WAF.
  - Requests **directly to a child application** are verified **only** by the **child application's** WAF.

This covers the entire [Vercel WAF](https://vercel.com/docs/vercel-firewall/vercel-waf), including [Custom Rules](https://vercel.com/docs/vercel-firewall/vercel-waf/custom-rules), [IP Blocking](https://vercel.com/docs/vercel-firewall/vercel-waf/ip-blocking), [WAF Managed Rulesets](https://vercel.com/docs/vercel-firewall/vercel-waf/managed-rulesets), and [Attack Mode](https://vercel.com/docs/vercel-firewall/attack-mode).

###### Managing the WAF

- A rule that applies to **all** requests to a microfrontend → use the **default application's** WAF.
- A rule that applies **only** to a child application's paths → use the **child project's** WAF.

### File: `references/troubleshooting.md`

#### Testing & Troubleshooting Reference

##### Testing Utilities

The `@vercel/microfrontends` package includes test utilities imported from `@vercel/microfrontends/next/testing`. All utilities throw exceptions on failure, so they work with any test framework.

###### validateMiddlewareConfig

Validates that Next.js middleware is configured correctly for microfrontends. Run only on the **default application**.

Checks:

- Middleware matches `/.well-known/vercel/microfrontends/client-config`
- Middleware does **not** match paths routed to child microfrontends (those requests never reach the default app's middleware)
- Middleware **does** match all flagged paths

```ts
// tests/middleware.test.ts
/* @jest-environment node */
import { validateMiddlewareConfig } from "@vercel/microfrontends/next/testing";
import { config } from "../middleware";

describe("middleware", () => {
  test("matches microfrontends paths", () => {
    expect(() =>
      validateMiddlewareConfig(config, "./microfrontends.json"),
    ).not.toThrow();
  });
});
```

**Signature:**

```ts
function validateMiddlewareConfig(
  middlewareConfig: MiddlewareConfig,
  microfrontendConfigOrPath: string | MicrofrontendConfigIsomorphic,
  extraProductionMatches?: string[],
): void;
```

- `middlewareConfig`: The exported `config` from your `middleware.ts`
- `microfrontendConfigOrPath`: Path to `microfrontends.json` or a parsed config object
- `extraProductionMatches`: Optional paths that middleware intentionally matches despite being child app paths

###### validateMiddlewareOnFlaggedPaths

Validates that middleware correctly rewrites flagged paths to the right microfrontend. **All flags must be enabled** before calling this function.

```ts
// tests/middleware.test.ts
/* @jest-environment node */
import { validateMiddlewareOnFlaggedPaths } from "@vercel/microfrontends/next/testing";
import { middleware } from "../middleware";

// Enable all flags before testing.
// This mock is specific to the Flags SDK; adapt if using a custom flag implementation.
jest.mock("flags/next", () => ({
  flag: jest.fn().mockReturnValue(jest.fn().mockResolvedValue(true)),
}));

describe("middleware", () => {
  test("rewrites for flagged paths", async () => {
    await expect(
      validateMiddlewareOnFlaggedPaths("./microfrontends.json", middleware),
    ).resolves.not.toThrow();
  });
});
```

**Signature:**

```ts
async function validateMiddlewareOnFlaggedPaths(
  microfrontendConfigOrPath: string | MicrofrontendConfigIsomorphic,
  middleware: (
    request: NextRequest,
    event: NextFetchEvent,
  ) => Promise<Response | undefined>,
): Promise<void>;
```

###### validateRouting

Validates that specific paths route to the correct microfrontend application. Run only on the **default application** where `microfrontends.json` is defined.

```ts
// tests/microfrontends.test.ts
import { validateRouting } from "@vercel/microfrontends/next/testing";

describe("microfrontends", () => {
  test("routing", () => {
    expect(() => {
      validateRouting("./microfrontends.json", {
        marketing: ["/", "/products"],
        docs: ["/docs", "/docs/api"],
        dashboard: [
          "/dashboard",
          { path: "/new-dashboard", flag: "enable-new-dashboard" },
        ],
      });
    }).not.toThrow();
  });
});
```

**Signature:**

```ts
function validateRouting(
  microfrontendConfigOrPath: string | MicrofrontendConfigIsomorphic,
  routesToTest: Record<string, (string | { path: string; flag: string })[]>,
): void;
```

The `routesToTest` maps application names to arrays of paths. Each path can be:

- A string: `'/docs'` — asserts this path routes to the named app
- An object: `{ path: '/new-docs', flag: 'my-flag' }` — asserts this path routes to the named app when the flag is enabled

##### Debug Headers

Enable debug headers to inspect routing decisions on deployed environments.

###### Enabling

- Use the **Vercel Toolbar** → enable Routing Debug Mode, **or**
- Set browser cookie `VERCEL_MFE_DEBUG=1`

###### Response headers

| Header                                   | Description                                                 |
| ---------------------------------------- | ----------------------------------------------------------- |
| `x-vercel-mfe-app`                       | Microfrontend project that handled the request              |
| `x-vercel-mfe-target-deployment-id`      | Deployment ID that handled the request                      |
| `x-vercel-mfe-default-app-deployment-id` | Default app deployment ID (source of `microfrontends.json`) |
| `x-vercel-mfe-zone-from-middleware`      | For flagged paths: which microfrontend middleware selected  |
| `x-vercel-mfe-matched-path`              | Path pattern from `microfrontends.json` that matched        |
| `x-vercel-mfe-response-reason`           | Internal reason for the routing decision                    |

##### Debug Routing Locally

Enable debug logging for the local proxy:

1. Set `MFE_DEBUG=1` environment variable, **or**
2. Pass `debug: true` to `withMicrofrontends`:

```ts
export default withMicrofrontends(nextConfig, { debug: true });
```

The proxy logs show:

- Which path matched which routing rule
- Whether the request went to a local app or fallback
- Environment variable and rewrite changes

##### Observability & Tracing

###### Observability dashboard

Microfrontend routing data appears in the **Observability** tab under the CDN section → Microfrontends.

###### Session tracing

Routing is captured in [Session Tracing](https://vercel.com/docs/tracing/session-tracing). The Microfrontends span includes:

| Attribute                              | Description                                          |
| -------------------------------------- | ---------------------------------------------------- |
| `vercel.mfe.app`                       | Microfrontend that handled the request               |
| `vercel.mfe.target_deployment_id`      | Target deployment ID                                 |
| `vercel.mfe.default_app_deployment_id` | Default app deployment ID                            |
| `vercel.mfe.app_from_middleware`       | Microfrontend selected by middleware (flagged paths) |
| `vercel.mfe.matched_path`              | Matched path pattern                                 |

##### Common Issues

###### Microfrontends aren't working in local development

1. Enable debug logging (`MFE_DEBUG=1`) to see routing decisions
2. Verify the proxy is running and you're accessing the proxy URL (not the app's direct port)
3. Check that `--local-apps` includes the correct app name
4. Verify `microfrontends.json` is accessible (auto-detected in monorepos, needs manual config in polyrepos)

###### Requests not routed to the correct microfrontend in production

1. Verify the path is covered by the routing config using the [Deployment Summary](https://vercel.com/docs/deployments#resources-tab-and-deployment-summary) or Vercel Toolbar
2. Enable [debug headers](#debug-headers) and inspect `x-vercel-mfe-matched-path` and `x-vercel-mfe-app`
3. Check [session traces](#session-tracing) for detailed routing information

###### Middleware not running for flagged paths

- Ensure flagged paths are listed in the middleware `matcher` config
- Verify `/.well-known/vercel/microfrontends/client-config` is in the matcher
- Use `validateMiddlewareConfig` and `validateMiddlewareOnFlaggedPaths` tests to catch misconfigurations

###### Asset 404 errors

- Verify the asset prefix is correctly configured and routed in `microfrontends.json`
- For Next.js `public/` directory files, move them to a subdirectory matching the asset prefix
- Check that `withMicrofrontends` (or the Vite plugin) is applied to the framework config

###### Deployment protection blocking fallbacks locally

- The default app's `VERCEL_AUTOMATION_BYPASS_SECRET` is used to bypass protection on child projects — ensure that secret is also added as a [Protection Bypass for Automation](https://vercel.com/docs/deployment-protection/methods-to-bypass-deployment-protection/protection-bypass-automation) secret in each protected child project
- Add `VERCEL_AUTOMATION_BYPASS_SECRET=<secret>` to the default app's local environment file (e.g. `.env.local`)
