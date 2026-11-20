# Skill: flags-sdk

- Plugin: `vercel` (0.56.0-wrp.2)
- Source: `plugins/vercel/skills/flags-sdk/SKILL.md`

> Implement feature flags in Next.js or SvelteKit code with the Flags SDK (`flags` npm package). Use when installing or configuring the SDK, declaring flags with `flag()`, reading a connected same-team project's flags through Project Connections (`createVercelAdapter({ projectId })`), wiring a provider adapter (`@flags-sdk/vercel`, Statsig, LaunchDarkly, PostHog, GrowthBook, Global Config, OpenFeature, and others), using `identify`, `dedupe`, or `evaluate`, keeping pages static with precompute, setting up Flags Explorer, or encrypting flag values. For planning a flag, Vercel Flags rollouts and experiments, the `vercel flags` CLI, or other frameworks, use the `vercel-flags` skill.

## Instructions

### Set up and use the Flags SDK

Use the existing tools, dependencies and connections first. Dependency changes must fit the requested project change. Confirm the account, target, approved data and expected charges before provisioning, deploying or sharing data externally.

Use existing dependencies and connected resources when they fit. Run dependency commands only within an authorized project change. Verify the target resource and expected charges before provisioning through Vercel.

The Flags SDK (`flags` npm package) is a feature flags toolkit for Next.js and SvelteKit. It turns each feature flag into a callable function, works with any flag provider via adapters, and keeps pages static using the precompute pattern. Vercel Flags is the first-party provider; its adapter is `@flags-sdk/vercel`.

- Docs: https://flags-sdk.dev
- Repo: https://github.com/vercel/flags

This skill covers the code. Planning a flag, choosing between the Flags SDK, `@vercel/flags-core`, and OpenFeature, and managing flags in the dashboard or with the `vercel flags` CLI belong to the `vercel-flags` skill. Archiving a flag, deleting it, or removing a variant requires the checks in that skill (remove the code first, confirm no evaluations over the Skew Protection window, archive before `rm`); do not run those commands without it. If it is not available, suggest `npx skills add vercel/flags@vercel-flags` (do not auto-install) and run `vercel flags <cmd> --help` in the meantime. For a project on another framework, `@vercel/flags-core` replaces this SDK ([Core SDK](https://vercel.com/docs/flags/vercel-flags/sdks/core)).

When the user asks to install, configure, or set up the SDK, follow [Set up the SDK](#set-up-the-sdk) (including `vercel env pull` when `.env.local` is missing). When they ask to add a flag to the code, follow [Create a flag](#create-a-flag) or [Add a flag that already exists on Vercel](#add-a-flag-that-already-exists-on-vercel). Inside an app repository, treat an ambiguous request as the full flow. Do not leave CLI steps as "next steps" for the user; execute them yourself.

#### Core concepts

##### Flags as code

Each flag is declared as a function. No string keys at call sites:

```ts
import { flag } from 'flags/next';

export const exampleFlag = flag({
  key: 'example-flag',
  decide() { return false; },
});

const value = await exampleFlag();
```

##### Server-side evaluation

Flags evaluate server-side to avoid layout shift, keep pages static, and maintain confidentiality. Combine routing middleware with the precompute pattern to serve static variants from CDN.

##### Adapter pattern

Adapters replace `decide` and `origin` on a flag declaration, connecting your flags to a provider. Vercel Flags (`@flags-sdk/vercel`) is the first-party adapter. Third-party adapters are available for Statsig, LaunchDarkly, PostHog, and others.

```ts
import { flag } from 'flags/next';
import { vercelAdapter } from '@flags-sdk/vercel';

export const exampleFlag = flag({
  key: 'example-flag',
  adapter: vercelAdapter,
});
```

> **Version note**: The SDK is published as `flags` (renamed from `@vercel/flags`; that old name still appears in changelog history). `flags` 4.2.0+ accepts the adapter factory by reference (`adapter: vercelAdapter`) and resolves it once per declaration. Older versions require calling it (`adapter: vercelAdapter()`). The called form still works on new versions, so prefer the shorthand unless you're targeting `flags` < 4.2.0.

#### Set up the SDK

One-time project setup. Run this when the Flags SDK is not installed yet, or when Toolbar / Flags Explorer / `.env.local` are missing. Skip any step that is already done.

##### Before you start

Check the project state to adapt commands and decide which steps you can skip:

- Which lockfile is present (`pnpm-lock.yaml`, `package-lock.json`, `yarn.lock`, `bun.lockb`)? → Adapt all package manager commands accordingly (`pnpm add`, `npm install`, `yarn add`, `bun add`).
- Is `flags` in `package.json`? → Skip install (step 1)
- Is the project linked? → Skip `vercel link` in step 2
- Does `.env.local` contain `VERCEL_OIDC_TOKEN=` (or a `FLAGS=` SDK key)? → Env vars already pulled, skip step 3
- Is `@vercel/toolbar` in `package.json`? → Skip toolbar setup (step 4)
- Does `flags.ts` (or `lib/flags.ts`, `src/flags.ts`) exist? → Skip creating it (step 5)
- Does `app/.well-known/vercel/flags/route.ts` exist? → Flags Explorer already set up, skip step 6

##### Steps

1. **Install packages** (if not already in `package.json`):
   ```bash
   pnpm i flags @flags-sdk/vercel
   ```

2. **Link the project to Vercel** (required for `vercel env pull` and local OIDC token refresh):
   > **Prerequisite**: The Vercel CLI must be installed and authenticated. If it is not installed, run `pnpm i -g vercel`. For authentication or linking issues, follow the `vercel-cli` skill if it's already available. If it isn't, suggest the user install it with `npx skills add vercel/vercel@vercel-cli` (don't auto-install it) and rely on `vercel <command> --help` in the meantime.

   Verify the link with `vercel project inspect --non-interactive` and check the reported owner and project name; a `.vercel/` directory alone does not prove a link. If it reports `link_required`, run `vercel link`. If the user named a project or team and the output differs, stop and ask instead of relinking.

3. **Pull environment variables**: If `.env.local` lacks `VERCEL_OIDC_TOKEN=`, follow [Pull environment variables](#pull-environment-variables).

4. **Set up the Vercel Toolbar** (if not already present):
   - Run `pnpm i @vercel/toolbar`
   - Wrap `next.config.ts` with the toolbar plugin
   - Render `<VercelToolbar />` in the root layout
   See [references/nextjs.md — Toolbar Setup](flags-sdk.md#file-referencesnextjsmd) for the full code.

5. **Ensure `flags.ts` exists**: If missing, create `flags.ts` (or `lib/flags.ts` / `src/flags.ts` to match the project) with `export {}` so TypeScript treats it as a module. Flags Explorer imports this file — create it before the discovery route.

6. **Set up Flags Explorer** (if not already present): Create `app/.well-known/vercel/flags/route.ts` — see [Flags Explorer setup](#flags-explorer-setup). Do this only after `flags.ts` exists. Point the import at the real flags file path (the snippet assumes root `flags.ts`).

#### Pull environment variables

`vercel env pull` writes the Development credentials to `.env.local`: the Vercel OIDC token that `vercelAdapter` uses locally (deployments receive it automatically, [Getting started](https://vercel.com/docs/flags/vercel-flags/quickstart#pull-local-openid-connect-credentials)) and the Development `FLAGS_SECRET` for Flags Explorer and overrides. Run it when:

- `.env.local` lacks `VERCEL_OIDC_TOKEN=` (or a `FLAGS=` SDK key)
- you created the project's first flag; activating Vercel Flags creates a `FLAGS_SECRET` per environment
- local evaluation fails with an authentication error; the SDK refreshes an expired token through the linked project, re-pulling is the fallback

Use SDK keys (`FLAGS`) for apps outside Vercel or to select an environment explicitly ([SDK Keys](https://vercel.com/docs/flags/vercel-flags/dashboard/sdk-keys)). To read another same-team project's flags on Vercel, use [Project Connections](flags-sdk.md#file-referencesprovidersmd) with your project's OIDC token. If `FLAGS_SECRET` is still missing after the pull, generate it per [FLAGS_SECRET](#flags_secret).

#### Create a flag

When a user asks you to create or add a feature flag that does not exist on Vercel yet, follow these steps in order. If the flag was already created in the dashboard (the prompt says so, or `vercel flags create` reports the key exists), follow [Add a flag that already exists on Vercel](#add-a-flag-that-already-exists-on-vercel) instead.

##### Before you start

- Complete [Set up the SDK](#set-up-the-sdk) first if packages, Vercel link, `.env.local`, Toolbar, `flags.ts`, or Flags Explorer are missing. Skip steps that are already done.
- Does `.env.local` contain `VERCEL_OIDC_TOKEN=`? → Env vars already pulled; see [Pull environment variables](#pull-environment-variables) if local evaluation fails with an authentication error.
- Does `flags.ts` (or `lib/flags.ts`, `src/flags.ts`) exist? → Add to it rather than creating from scratch.

##### Steps

1. **Ensure the SDK is set up**: Follow [Set up the SDK](#set-up-the-sdk) if needed, then continue.

2. **Register the flag with Vercel**: Run `vercel flags create <flag-key> --kind boolean --description "<description>"` against the linked project, or pass `--project <name-or-id>` and `--scope <team>`. Pick the kind to match the flag's type parameter; it cannot be changed later.

3. **Pull environment variables**: If this is the project's first flag, follow [Pull environment variables](#pull-environment-variables) again; activation created the `FLAGS_SECRET`.

4. **Declare the flag in code**: Add it to `flags.ts` (or create the file if it doesn't exist) using `vercelAdapter`:
   ```ts
   import { flag } from 'flags/next';
   import { vercelAdapter } from '@flags-sdk/vercel';

   export const myFlag = flag({
     key: 'my-flag',
     adapter: vercelAdapter,
   });
   ```

5. **Use the flag**: Call it in your page or component and conditionally render based on the result:
   ```tsx
   import { myFlag } from '../flags';

   export default async function Page() {
     const enabled = await myFlag();
     return <div>{enabled ? 'Feature on' : 'Feature off'}</div>;
   }
   ```

#### Add a flag that already exists on Vercel

Use this flow when the flag was created in the dashboard or by someone else, for example when the prompt says the flag "has already been created" or asks you to run `vercel flags inspect`. Do not run `vercel flags create` for an existing key.

1. **Ensure the SDK is set up**: Follow [Set up the SDK](#set-up-the-sdk) if needed.
2. **Read the definition**: Run `vercel flags inspect <flag-key>`. Note the kind, the variants (value and label), the description, and what each environment serves.
3. **Pull environment variables**: If `.env.local` lacks `VERCEL_OIDC_TOKEN=`, follow [Pull environment variables](#pull-environment-variables).
4. **Declare the flag**: Add it to `flags.ts` with `vercelAdapter`. Map the `inspect` output:
   - `key`: the flag key exactly as printed
   - kind → type parameter: `boolean` → `flag<boolean>`, `string` → `flag<string>`, `number` → `flag<number>`, `json` → `flag<YourType>`
   - `description`: copy from `inspect`
   - `defaultValue`: the value to serve when the flag is archived or evaluation fails (usually what production serves today)
   - `options`: optional; mirror the variants when you use precompute or want them listed in Flags Explorer
   - `identify`: add or reuse one when the flag has targeting, using the entity attributes configured in the dashboard (see [Flag with evaluation context](#flag-with-evaluation-context))
   ```ts
   export const welcomeMessage = flag<string>({
     key: 'welcome-message',
     description: 'Copy shown on the landing page',
     defaultValue: 'control',
     adapter: vercelAdapter,
   });
   ```
5. **Use the flag** as in [Create a flag](#create-a-flag) step 5.

#### Vercel Flags adapter

`@flags-sdk/vercel` connects `flag()` declarations to Vercel Flags. `vercelAdapter` authenticates with the project's Vercel OIDC token and evaluates the configuration of the current environment. Use `@flags-sdk/vercel` version 1.6.0 or later and `createVercelAdapter({ projectId })` for a connected same-team project's flags; see [Project Connections](flags-sdk.md#file-referencesprovidersmd). SDK keys (`FLAGS`) are for manual authentication, such as apps outside Vercel or selecting an environment explicitly. Activating Vercel Flags creates a `FLAGS_SECRET` per environment for Flags Explorer.

For user targeting, attribute types, custom adapter configuration, sharing a `@vercel/flags-core` client, and the Flags Explorer endpoint, see [references/providers.md — Vercel](flags-sdk.md#file-referencesprovidersmd).

Changing what a flag serves (enable, set, split, rollout, rules, archive) happens in the dashboard or with `vercel flags`, not in code. The `vercel-flags` skill covers those flows; `vercel flags <cmd> --help` lists the options.

#### Declaring flags

When using Vercel Flags, declare flags with `vercelAdapter` as shown in [Create a flag](#create-a-flag). For other providers, see [references/providers.md](flags-sdk.md#file-referencesprovidersmd). Below are the general `flag()` patterns.

##### Basic flag

```ts
import { flag } from 'flags/next'; // or 'flags/sveltekit'

export const showBanner = flag<boolean>({
  key: 'show-banner',
  description: 'Show promotional banner',
  defaultValue: false,
  options: [
    { value: false, label: 'Hide' },
    { value: true, label: 'Show' },
  ],
  decide() { return false; },
});
```

##### Flag with evaluation context

Use `identify` to establish who the request is for. The returned entities are passed to `decide`:

```ts
import { dedupe, flag } from 'flags/next';
import type { ReadonlyRequestCookies } from 'flags';

interface Entities {
  user?: { id: string };
}

const identify = dedupe(
  ({ cookies }: { cookies: ReadonlyRequestCookies }): Entities => {
    const userId = cookies.get('user-id')?.value;
    return { user: userId ? { id: userId } : undefined };
  },
);

export const dashboardFlag = flag<boolean, Entities>({
  key: 'new-dashboard',
  identify,
  decide({ entities }) {
    if (!entities?.user) return false;
    return ['user1', 'user2'].includes(entities.user.id);
  },
});
```

With `vercelAdapter`, the entity and attribute names in the returned object (`user.id` here) are what dashboard rules and `vercel flags split|rollout|rules --by` target. They must match the entities and attribute types configured in the dashboard. See [references/providers.md — User targeting](flags-sdk.md#file-referencesprovidersmd) and [Attribute types](flags-sdk.md#file-referencesprovidersmd).

##### Flag with another adapter

Adapters connect flags to third-party providers. Each adapter replaces `decide` and `origin`:

```ts
import { flag } from 'flags/next';
import { statsigAdapter } from '@flags-sdk/statsig';

export const myGate = flag({
  key: 'my_gate',
  adapter: statsigAdapter.featureGate((gate) => gate.value),
  identify,
});
```

See [references/providers.md](flags-sdk.md#file-referencesprovidersmd) for all supported adapters.

##### Key parameters

| Parameter      | Type                               | Description                                          |
| -------------- | ---------------------------------- | ---------------------------------------------------- |
| `key`          | `string`                           | Unique flag identifier                               |
| `decide`       | `function`                         | Resolves the flag value                              |
| `defaultValue` | `any`                              | Fallback if `decide` returns undefined or throws     |
| `description`  | `string`                           | Shown in Flags Explorer                              |
| `origin`       | `string`                           | URL to manage the flag in provider dashboard         |
| `options`      | `{ label?: string, value: any }[]` | Possible values, used for precompute + Flags Explorer|
| `adapter`      | `Adapter`                          | Provider adapter implementing `decide` and `origin`  |
| `identify`     | `function`                         | Returns evaluation context (entities) for `decide`   |

#### Dedupe

Wrap shared functions (especially `identify`) in `dedupe` to run them once per request:

```ts
import { dedupe } from 'flags/next';

const identify = dedupe(({ cookies }) => {
  return { user: { id: cookies.get('uid')?.value } };
});
```

Note: `dedupe` is not available in Pages Router.

#### Bulk evaluation

To evaluate **multiple** flags at once, call `evaluate()` (from `flags/next`) instead of awaiting flags one at a time or using `Promise.all()`. To evaluate a **single** flag, just call it: `await myFlag()`.

```ts
import { evaluate } from 'flags/next';
import { flagA, flagB } from '../flags';

// avoid: each await blocks the next, so the flags resolve sequentially
const a = await flagA();
const b = await flagB();

// avoid: parallel, but each flag is evaluated in isolation
const [a, b] = await Promise.all([flagA(), flagB()]);

// prefer: shares work across the batch
const [a, b] = await evaluate([flagA, flagB]);
```

`evaluate()` is faster than both approaches. Awaiting flags one at a time makes total latency the sum of every flag's evaluation instead of the slowest single flag, while `Promise.all()` runs them in parallel but evaluates each in isolation. `evaluate()` pre-reads headers, cookies, and overrides once for the whole batch and lets adapters resolve a group in a single call, which reduces the number of parallel promises the runtime manages and leaves less room for the async work to be interrupted by other microtasks.

It accepts either an **array** (positional results) or an **object** (keyed results):

```ts
const [a, b] = await evaluate([flagA, flagB]);
const { a, b } = await evaluate({ a: flagA, b: flagB });
```

Outside App Router (Pages Router `getServerSideProps`/API routes, or routing middleware), pass the request as the second argument: `await evaluate([flagA, flagB], request)`.

`evaluate()` always evaluates flags at request time. It is not for reading [precomputed](#precompute-pattern) (static) values — for those, use `getPrecomputed` (or call the flag with the code, `await myFlag(code, flagGroup)`).

Adapters can opt into batching by implementing the optional `bulkDecide` hook. The Vercel adapter (`@flags-sdk/vercel`) implements it — roughly a 10x reduction in evaluation time when resolving hundreds of flags. See [references/providers.md — Custom Adapters](flags-sdk.md#file-referencesprovidersmd) for implementing `bulkDecide`, and [references/api.md — `evaluate`](flags-sdk.md#file-referencesapimd) for the full signature.

#### Flags Explorer setup

##### Next.js (App Router)

```ts
// app/.well-known/vercel/flags/route.ts
import { createFlagsDiscoveryEndpoint } from 'flags/next';
import { getProviderData } from '@flags-sdk/vercel';
import * as flags from '../../../../flags'; // adjust if flags live under lib/ or src/

export const GET = createFlagsDiscoveryEndpoint(async () => {
  return getProviderData(flags);
});
```

##### With external provider data

When using a third-party provider alongside Vercel Flags, combine their data with `mergeProviderData`. Each provider adapter exports its own `getProviderData` — see the provider-specific examples in [references/providers.md](flags-sdk.md#file-referencesprovidersmd).

##### SvelteKit

```ts
// src/hooks.server.ts
import { createHandle } from 'flags/sveltekit';
import { FLAGS_SECRET } from '$env/static/private';
import * as flags from '$lib/flags';

export const handle = createHandle({ secret: FLAGS_SECRET, flags });
```

#### FLAGS_SECRET

Required for precompute and Flags Explorer. Vercel Flags activation creates a value per environment. Preserve existing values; do not rotate them during ordinary SDK setup. A missing local value does not mean the remote value is missing: check the target environment first, then follow [Pull environment variables](#pull-environment-variables) for Development.

Only generate a secret for an environment where it is absent. Use 32 cryptographically random bytes, base64-encoded, with a distinct value per environment. Mark Preview and Production values Sensitive. Send generated values directly to storage, such as stdin for `vercel env add`; do not print them to terminal output, logs, or chat, or embed them in command arguments.

#### Precompute pattern

Use precompute to keep pages static while using feature flags. Middleware evaluates flags and encodes results into the URL via rewrite. The page reads precomputed values instead of re-evaluating.

High-level flow:
1. Declare flags and group them in an array
2. Call `precompute(flagGroup)` in middleware, get a `code` string
3. Rewrite request to `/${code}/original-path`
4. Page reads flag values from `code`: `await myFlag(code, flagGroup)`

For full implementation details, see framework-specific references:
- **Next.js**: See [references/nextjs.md](flags-sdk.md#file-referencesnextjsmd) — covers proxy middleware, precompute setup, ISR, generatePermutations, multiple groups
- **SvelteKit**: See [references/sveltekit.md](flags-sdk.md#file-referencessveltekitmd) — covers reroute hook, middleware, precompute setup, ISR, prerendering

#### Custom adapters

Create an adapter factory that returns an object with `origin` and `decide`. For the full pattern (including default adapter and singleton client examples), see [references/providers.md](flags-sdk.md#file-referencesprovidersmd).

#### Encryption functions

For keeping flag data confidential in the browser (used by Flags Explorer):

| Function                   | Purpose                             |
| -------------------------- | ----------------------------------- |
| `encryptFlagValues`        | Encrypt resolved flag values        |
| `decryptFlagValues`        | Decrypt flag values                 |
| `encryptFlagDefinitions`   | Encrypt flag definitions/metadata   |
| `decryptFlagDefinitions`   | Decrypt flag definitions            |
| `encryptOverrides`         | Encrypt toolbar overrides           |
| `decryptOverrides`         | Decrypt toolbar overrides           |

All use `FLAGS_SECRET` by default. Example:

```tsx
import { encryptFlagValues } from 'flags';
import { FlagValues } from 'flags/react';

async function ConfidentialFlags({ values }) {
  const encrypted = await encryptFlagValues(values);
  return <FlagValues values={encrypted} />;
}
```

#### React components

```tsx
import { FlagValues, FlagDefinitions } from 'flags/react';

// Renders script tag with flag values for Flags Explorer
<FlagValues values={{ myFlag: true }} />

// Renders script tag with flag definitions for Flags Explorer
<FlagDefinitions definitions={{ myFlag: { options: [...], description: '...' } }} />
```

#### References

Detailed framework and provider guides are in separate files to keep context lean:

- **[references/nextjs.md](flags-sdk.md#file-referencesnextjsmd)**: Next.js quickstart, toolbar, App Router, Pages Router, middleware/proxy, precompute, dedupe, dashboard pages, marketing pages, suspense fallbacks
- **[references/sveltekit.md](flags-sdk.md#file-referencessveltekitmd)**: SvelteKit quickstart, toolbar, hooks setup, precompute with reroute + middleware, dashboard pages, marketing pages
- **[references/providers.md](flags-sdk.md#file-referencesprovidersmd)**: All provider adapters — Vercel, Global Config, Statsig, LaunchDarkly, PostHog, GrowthBook, Flagsmith, Reflag, Split, Optimizely, OpenFeature, and custom adapters
- **[references/api.md](flags-sdk.md#file-referencesapimd)**: Full API reference for `flags`, `flags/react`, `flags/next`, and `flags/sveltekit`

## Bundled files

### File: `.vercel.approvers`

```text
@vercel/flags:team
```

### File: `overlay.yaml`

```yaml
name: flags-sdk
description: "Implement feature flags in Next.js or SvelteKit code with the Flags SDK (`flags` npm package). Use when installing or configuring the SDK, declaring flags with `flag()`, reading a connected same-team project's flags through Project Connections (`createVercelAdapter({ projectId })`), wiring a provider adapter (`@flags-sdk/vercel`, Statsig, LaunchDarkly, PostHog, GrowthBook, Global Config, OpenFeature, and others), using `identify`, `dedupe`, or `evaluate`, keeping pages static with precompute, setting up Flags Explorer, or encrypting flag values. For planning a flag, Vercel Flags rollouts and experiments, the `vercel flags` CLI, or other frameworks, use the `vercel-flags` skill."
summary: "Flags SDK guidance for Next.js and SvelteKit — declare flags with flag(), connect provider adapters, precompute static variants, and set up the Flags Explorer endpoint."
metadata:
  priority: 6
  docs:
    - "https://vercel.com/docs/flags"
    - "https://flags-sdk.dev"
  sitemap: "https://vercel.com/sitemap.xml"
  pathPatterns:
    - 'flags.ts'
    - 'flags.tsx'
    - 'lib/flags.ts'
    - 'src/flags.ts'
    - 'lib/flags/**'
    - 'src/flags/**'
    - '.well-known/vercel/flags/**'
  importPatterns:
    - 'flags/next'
    - 'flags/sveltekit'
    - 'flags/react'
    - 'flags'
    - '@flags-sdk/*'
    - '@vercel/flags'
  bashPatterns:
    - '\bnpm\s+(install|i|add)\s+[^\n]*(?<![\w@/-])flags(?![\w/-])'
    - '\bpnpm\s+(install|i|add)\s+[^\n]*(?<![\w@/-])flags(?![\w/-])'
    - '\bbun\s+(install|i|add)\s+[^\n]*(?<![\w@/-])flags(?![\w/-])'
    - '\byarn\s+add\s+[^\n]*(?<![\w@/-])flags(?![\w/-])'
    - '\bnpm\s+(install|i|add)\s+[^\n]*@flags-sdk/'
    - '\bpnpm\s+(install|i|add)\s+[^\n]*@flags-sdk/'
    - '\bbun\s+(install|i|add)\s+[^\n]*@flags-sdk/'
    - '\byarn\s+add\s+[^\n]*@flags-sdk/'
  promptSignals:
    phrases:
      - "flags sdk"
      - "flags explorer"
      - "flag adapter"
      - "precompute flags"
      - "flags/next"
      - "flags/sveltekit"
      - "@flags-sdk"
    allOf:
      - [flag, precompute]
      - [flag, adapter]
      - [flag, next.js]
      - [flag, nextjs]
      - [flag, sveltekit]
    anyOf:
      - "flag"
      - "precompute"
      - "adapter"
    noneOf:
      - "command-line flag"
      - "command line flag"
      - "cli flag"
      - "compiler flag"
      - "flag emoji"
      - "rolling release"
    minScore: 6
retrieval:
  aliases:
    - flags sdk
    - flags/next
    - flags/sveltekit
    - flag adapters
  intents:
    - declare a feature flag in code
    - connect a flag provider adapter
    - read flags from a connected project
    - precompute flags for static pages
    - set up flags explorer
  entities:
    - Flags SDK
    - Flags Explorer
    - vercelAdapter
    - precompute
    - FLAGS_SECRET
chainTo:
  -
    pattern: 'precompute\s*\(|generatePermutations|flags/next.*precompute'
    targetSkill: routing-middleware
    message: 'Precompute pattern detected — loading Routing Middleware guidance for the middleware rewrites that serve static flag variants.'
  -
    pattern: '@flags-sdk/(edge|global)-config|create(Edge|Global)ConfigAdapter'
    targetSkill: vercel-storage
    message: 'Global Config flag adapter detected — loading Vercel storage guidance for Global Config setup and limits.'
```

### File: `references/api.md`

#### API Reference

##### Table of Contents

- [flags (core)](#flags-core)
- [flags/react](#flagsreact)
- [flags/next](#flagsnext)
- [flags/sveltekit](#flagssveltekit)

---

##### flags (core)

###### `verifyAccess`

Verify access to the flags discovery endpoint. Returns `Promise<boolean>`.

| Parameter       | Type     | Description              |
| --------------- | -------- | ------------------------ |
| `authorization` | `string` | Authorization token      |

```ts
import { verifyAccess } from 'flags';

const access = await verifyAccess(request.headers.get('Authorization'));
if (!access) return NextResponse.json(null, { status: 401 });
```

###### `mergeProviderData`

Merge provider data from multiple sources for the Flags Explorer.

| Parameter | Type                                        | Description           |
| --------- | ------------------------------------------- | --------------------- |
| `data`    | `(ProviderData \| Promise<ProviderData>)[]` | Provider data to merge|

```ts
import { mergeProviderData } from 'flags';

return mergeProviderData([
  getProviderData(flags),
  getStatsigProviderData({ /* ... */ }),
]);
```

###### `reportValue`

Report flag value to Vercel for Runtime Logs and Web Analytics.

| Parameter | Type     | Description     |
| --------- | -------- | --------------- |
| `key`     | `string` | Flag key        |
| `value`   | `any`    | Resolved value  |

```ts
import { reportValue } from 'flags';
reportValue('summer-sale', true);
```

###### Encryption Functions

All default to `process.env.FLAGS_SECRET`.

| Function                 | Input Type           | Purpose                    |
| ------------------------ | -------------------- | -------------------------- |
| `encryptFlagValues`      | `FlagValuesType`     | Encrypt resolved values    |
| `decryptFlagValues`      | `string`             | Decrypt values             |
| `encryptFlagDefinitions` | `FlagDefinitionsType`| Encrypt definitions        |
| `decryptFlagDefinitions` | `string`             | Decrypt definitions        |
| `encryptOverrides`       | `FlagOverridesType`  | Encrypt toolbar overrides  |
| `decryptOverrides`       | `string`             | Decrypt overrides          |

Optional `secret` and `expirationTime` (default `'1y'`) params on encrypt functions.

###### `verifyAccessProof`

Verify an access proof token. Returns `Promise<boolean>`.

###### `safeJsonStringify`

XSS-safe `JSON.stringify`. Escapes `<` and other dangerous chars.

```ts
import { safeJsonStringify } from 'flags';
safeJsonStringify({ markup: '<html></html>' });
// '{"markup":"\\u003chtml>\\u003c/html>"}'
```

---

##### flags/react

###### `FlagValues`

Renders a `<script data-flag-values>` tag for the Flags Explorer.

| Prop     | Type             | Description  |
| -------- | ---------------- | ------------ |
| `values` | `FlagValuesType` | Flag values  |

```tsx
import { FlagValues } from 'flags/react';
<FlagValues values={{ myFlag: true }} />
```

For confidential flags, encrypt first:

```tsx
import { encryptFlagValues } from 'flags';
import { FlagValues } from 'flags/react';

async function ConfidentialFlags({ values }) {
  const encrypted = await encryptFlagValues(values);
  return <FlagValues values={encrypted} />;
}
```

###### `FlagDefinitions`

Renders a `<script data-flag-definitions>` tag with flag metadata.

| Prop          | Type                  | Description       |
| ------------- | --------------------- | ----------------- |
| `definitions` | `FlagDefinitionsType` | Flag definitions  |

```tsx
import { FlagDefinitions } from 'flags/react';

<FlagDefinitions definitions={{
  myFlag: {
    options: [{ value: false }, { value: true }],
    origin: 'https://example.com/flag/myFlag',
    description: 'Example flag',
  },
}} />
```

---

##### flags/next

###### `flag`

Declare a feature flag for Next.js.

| Parameter      | Type                               | Description                        |
| -------------- | ---------------------------------- | ---------------------------------- |
| `key`          | `string`                           | Flag identifier                    |
| `decide`       | `function`                         | Resolves the flag value            |
| `defaultValue` | `any`                              | Fallback value                     |
| `description`  | `string`                           | Shown in Flags Explorer            |
| `origin`       | `string`                           | URL to manage flag                 |
| `options`      | `{ label?: string, value: any }[]` | Possible values                    |
| `adapter`      | `Adapter`                          | Provider adapter                   |
| `identify`     | `function`                         | Returns evaluation context         |

###### `createFlagsDiscoveryEndpoint`

Creates an App Router route handler for `/.well-known/vercel/flags`. Auto-verifies access and adds version header.

| Parameter        | Type       | Description                    |
| ---------------- | ---------- | ------------------------------ |
| `getApiData`     | `Function` | Returns flag metadata          |
| `options.secret` | `string`   | Defaults to `FLAGS_SECRET`     |

###### `getProviderData`

Turn `flag()` declarations into Flags Explorer-compatible definitions.

| Parameter | Type                   | Description     |
| --------- | ---------------------- | --------------- |
| `flags`   | `Record<string, Flag>` | Your flags      |

###### `precompute`

Evaluate multiple flags, return encoded string.

| Parameter | Type         | Description |
| --------- | ------------ | ----------- |
| `flags`   | `function[]` | Flag group  |

###### `evaluate`

Evaluate multiple flags in a single call. Prefer this over `Promise.all([flagA(), flagB()])` — it pre-reads headers, cookies, and overrides once for the whole batch and lets adapters resolve a group through one `bulkDecide` call, reducing parallel promises and microtask overhead.

| Parameter           | Type                                | Description                                                          |
| ------------------- | ----------------------------------- | ------------------------------------------------------------------- |
| `flags`             | `Flag[] \| Record<string, Flag>`    | Array (positional results) or object (keyed results) of flags       |
| `request` (Optional)| `IncomingMessage \| Request`        | Required outside App Router (Pages Router or routing middleware)     |

```ts
import { evaluate } from 'flags/next';

const [a, b] = await evaluate([flagA, flagB]); // positional
const { a, b } = await evaluate({ a: flagA, b: flagB }); // keyed
```

###### `serialize`

Turn evaluated flags into serialized representation.

| Parameter | Type         | Description      |
| --------- | ------------ | ---------------- |
| `flags`   | `function[]` | Flags            |
| `values`  | `unknown[]`  | Resolved values  |
| `secret`  | `string`     | Signing secret   |

###### `getPrecomputed`

Retrieve flag values from precomputation code.

| Parameter         | Type                     | Description              |
| ----------------- | ------------------------ | ------------------------ |
| `flag`            | `function \| function[]` | Flag(s) to extract       |
| `precomputeFlags` | `function[]`             | Group used in precompute |
| `code`            | `string`                 | Precomputation code      |

###### `deserialize`

Retrieve all flag values as a record from code.

###### `generatePermutations`

Generate all possible precomputation codes for flag options.

| Parameter | Type         | Description                          |
| --------- | ------------ | ------------------------------------ |
| `flags`   | `function[]` | Flags with options declared          |
| `filter`  | `function`   | Optional filter for permutations     |
| `secret`  | `string`     | Defaults to `FLAGS_SECRET`           |

###### `dedupe`

Deduplicate function calls per request.

| Parameter | Type       | Description            |
| --------- | ---------- | ---------------------- |
| `fn`      | `function` | Function to dedupe     |

Not available in Pages Router.

---

##### flags/sveltekit

###### `flag`

Declare a feature flag for SvelteKit.

| Parameter     | Type                               | Description                   |
| ------------- | ---------------------------------- | ----------------------------- |
| `key`         | `string`                           | Flag identifier               |
| `decide`      | `function`                         | Resolves value                |
| `description` | `string`                           | Shown in Flags Explorer       |
| `origin`      | `string`                           | URL to manage flag            |
| `options`     | `{ label?: string, value: any }[]` | Possible values               |
| `identify`    | `function`                         | Returns evaluation context    |

###### `createHandle`

Server hook that establishes context for flags and handles `/.well-known/vercel/flags`.

| Parameter       | Type                                               | Description          |
| --------------- | -------------------------------------------------- | -------------------- |
| `options.secret`| `string`                                           | `FLAGS_SECRET`       |
| `options.flags` | `Record<string, Flag>`                             | Your flags           |

Must come first when composed with `sequence`.

###### `getProviderData`

Turn flag declarations into Flags Explorer-compatible definitions.

###### `precompute`

Evaluate multiple flags, return encoded string.

| Parameter | Type         | Description   |
| --------- | ------------ | ------------- |
| `flags`   | `function[]` | Flag group    |
| `request` | `Request`    | Current request |

###### `generatePermutations`

Generate all precomputation codes for prerendering.

| Parameter | Type         | Description                      |
| --------- | ------------ | -------------------------------- |
| `flags`   | `function[]` | Flags with options               |
| `filter`  | `function`   | Optional filter                  |
| `secret`  | `string`     | Defaults to `FLAGS_SECRET`       |

### File: `references/nextjs.md`

#### Next.js Integration

##### Table of Contents

- [Quickstart](#quickstart)
- [Toolbar Setup](#toolbar-setup)
- [App Router](#app-router)
- [Pages Router](#pages-router)
- [Evaluation Context](#evaluation-context)
- [Dedupe](#dedupe)
- [Precompute](#precompute)
- [Dashboard Pages](#dashboard-pages)
- [Marketing Pages](#marketing-pages)
- [Proxy (Middleware)](#proxy-middleware)
- [Suspense Fallbacks](#suspense-fallbacks)

##### Quickstart

```sh
pnpm i flags
```

Declare a flag in `flags.ts`:

```ts
import { flag } from 'flags/next';

export const exampleFlag = flag({
  key: 'example-flag',
  decide() {
    return Math.random() > 0.5;
  },
});
```

##### Toolbar Setup

1. Install `@vercel/toolbar`:

```sh
pnpm i @vercel/toolbar
```

2. Add Next.js plugin:

```ts
// next.config.ts
import type { NextConfig } from 'next';
import createWithVercelToolbar from '@vercel/toolbar/plugins/next';

const nextConfig: NextConfig = {};

const withVercelToolbar = createWithVercelToolbar();
export default withVercelToolbar(nextConfig);
```

3. Render toolbar in root layout:

```tsx
// app/layout.tsx
import { VercelToolbar } from '@vercel/toolbar/next';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // On Vercel, the toolbar is auto-injected in preview deployments.
  // This manual injection is only needed for local development.
  const shouldInjectToolbar = process.env.NODE_ENV === 'development';
  return (
    <html lang="en">
      <body>
        {children}
        {shouldInjectToolbar && <VercelToolbar />}
      </body>
    </html>
  );
}
```

##### App Router

Call the flag function from any async server component or proxy:

```tsx
// app/page.tsx
import { exampleFlag } from '../flags';

export default async function Page() {
  const example = await exampleFlag();
  return <div>{example ? 'Flag is on' : 'Flag is off'}</div>;
}
```

##### Pages Router

Pass `req` to the flag in `getServerSideProps`:

```tsx
// pages/index.tsx
import type { InferGetServerSidePropsType, GetServerSideProps } from 'next';
import { exampleFlag } from '../flags';

export const getServerSideProps = (async ({ req }) => {
  const example = await exampleFlag(req);
  return { props: { example } };
}) satisfies GetServerSideProps<{ example: boolean }>;

export default function Page({
  example,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  return <div>{example ? 'Flag is on' : 'Flag is off'}</div>;
}
```

##### Evaluation Context

Use `identify` to establish who the request is for. The returned entities are passed to `decide`:

```ts
import { flag, dedupe } from 'flags/next';
import type { ReadonlyRequestCookies } from 'flags';

interface Entities {
  user?: { id: string };
}

const identify = dedupe(
  ({ cookies }: { cookies: ReadonlyRequestCookies }): Entities => {
    const userId = cookies.get('user-id')?.value;
    return { user: userId ? { id: userId } : undefined };
  },
);

export const myFlag = flag<boolean, Entities>({
  key: 'my-flag',
  identify,
  decide({ entities }) {
    return entities?.user?.id === 'user1';
  },
});
```

`identify` receives normalized `headers` and `cookies` that work across App Router, Pages Router, and Proxy.

###### Custom evaluation context

Override identify at call site (use sparingly):

```ts
await exampleFlag.run({ identify: { user: { id: 'user1' } } });
await exampleFlag.run({ identify: () => ({ user: { id: 'user1' } }) });
```

##### Dedupe

Wrap functions in `dedupe` to run them once per request within the same runtime:

```ts
import { dedupe } from 'flags/next';

const identify = dedupe(({ cookies }) => {
  return { user: { id: cookies.get('uid')?.value } };
});
```

Use cases:
- Prevent duplicate `identify` calls across multiple flags
- Generate consistent random IDs for anonymous visitor experiments

Not available in Pages Router.

##### Precompute

Keep pages static while using feature flags. Proxy evaluates flags and encodes results into the URL.

###### Prerequisites

Ensure `FLAGS_SECRET` is configured using [FLAGS_SECRET](flags-sdk.md#flags_secret). Reuse existing values; generate one only for an environment where it is absent.

###### Step 1: Create flag group

```ts
// flags.ts
import { flag } from 'flags/next';

export const showSummerSale = flag({
  key: 'summer-sale',
  decide: () => false,
});

export const showBanner = flag({
  key: 'banner',
  decide: () => false,
});

export const marketingFlags = [showSummerSale, showBanner] as const;
```

###### Step 2: Precompute in proxy

```ts
// proxy.ts
import { type NextRequest, NextResponse } from 'next/server';
import { precompute } from 'flags/next';
import { marketingFlags } from './flags';

export const config = { matcher: ['/'] };

export async function proxy(request: NextRequest) {
  const code = await precompute(marketingFlags);
  const nextUrl = new URL(
    `/${code}${request.nextUrl.pathname}${request.nextUrl.search}`,
    request.url,
  );
  return NextResponse.rewrite(nextUrl, { request });
}
```

###### Step 3: Read precomputed values in page

```tsx
// app/[code]/page.tsx
import { marketingFlags, showSummerSale, showBanner } from '../../flags';

type Params = Promise<{ code: string }>;

export default async function Page({ params }: { params: Params }) {
  const { code } = await params;
  const summerSale = await showSummerSale(code, marketingFlags);
  const banner = await showBanner(code, marketingFlags);

  return (
    <div>
      {banner && <p>welcome</p>}
      {summerSale ? <p>summer sale live</p> : <p>summer sale soon</p>}
    </div>
  );
}
```

###### Step 4: Enable ISR & build time prerendering

```tsx
// app/[code]/layout.tsx
import { generatePermutations } from 'flags/next';

export async function generateStaticParams() {
  const codes = await generatePermutations(marketingFlags);
  return codes.map((code) => ({ code }));
}

export default async function Layout({ children }) {
  return children;
}
```

###### Declaring options

Options enable efficient URL encoding and Flags Explorer display:

```ts
export const greetingFlag = flag<string>({
  key: 'greeting',
  options: ['Hello world', 'Hi', 'Hola'],
  decide: () => 'Hello world',
});
```

Or with labels:

```ts
export const greetingFlag = flag<string>({
  key: 'greeting',
  options: [
    { label: 'Hello world', value: 'Hello world' },
    { label: 'Hi', value: 'Hi' },
  ],
  decide: () => 'Hello world',
});
```

###### Multiple groups

Avoid unnecessary permutations by creating separate flag groups per page:

```ts
export const rootFlags = [navigationFlag, bannerFlag];
export const pricingFlags = [discountFlag];
```

File tree:

```
app/[rootCode]/
  page.tsx
  pricing/[pricingCode]/
    page.tsx
```

###### Pages Router precompute

```tsx
// pages/[code]/index.tsx
import { generatePermutations } from 'flags/next';

export const getStaticPaths = (async () => {
  const codes = await generatePermutations(marketingFlags);
  return {
    paths: codes.map((code) => ({ params: { code } })),
    fallback: 'blocking',
  };
}) satisfies GetStaticPaths;

export const getStaticProps = (async (context) => {
  if (typeof context.params?.code !== 'string') return { notFound: true };
  const example = await exampleFlag(context.params.code, marketingFlags);
  return { props: { example } };
}) satisfies GetStaticProps<{ example: boolean }>;
```

##### Dashboard Pages

For authenticated dashboard pages, use `identify` to read user context from cookies/JWTs:

```ts
import type { ReadonlyRequestCookies } from 'flags';
import { flag, dedupe } from 'flags/next';

interface Entities {
  user?: { id: string };
}

const identify = dedupe(
  ({ cookies }: { cookies: ReadonlyRequestCookies }): Entities => {
    const userId = cookies.get('dashboard-user-id')?.value;
    return { user: userId ? { id: userId } : undefined };
  },
);

export const dashboardFlag = flag<boolean, Entities>({
  key: 'dashboard-flag',
  identify,
  decide({ entities }) {
    if (!entities?.user) return false;
    const allowedUsers = ['user1'];
    return allowedUsers.includes(entities.user.id);
  },
});
```

Usage in a page:

```tsx
export default async function DashboardPage() {
  const dashboard = await dashboardFlag();
  return <div>{dashboard ? 'New Dashboard' : 'Old Dashboard'}</div>;
}
```

##### Marketing Pages

For static marketing pages with A/B tests, combine precompute with visitor ID generation:

###### Visitor ID in proxy

```ts
// proxy.ts
import { precompute } from 'flags/next';
import { type NextRequest, NextResponse } from 'next/server';
import { marketingFlags } from './flags';
import { getOrGenerateVisitorId } from './get-or-generate-visitor-id';

export async function marketingProxy(request: NextRequest) {
  const visitorId = await getOrGenerateVisitorId(
    request.cookies,
    request.headers,
  );

  const code = await precompute(marketingFlags);

  return NextResponse.rewrite(
    new URL(`/examples/marketing-pages/${code}`, request.url),
    {
      headers: {
        'Set-Cookie': `marketing-visitor-id=${visitorId}; Path=/`,
        'x-marketing-visitor-id': visitorId,
      },
    },
  );
}
```

###### Deduplicated visitor ID generation

```ts
import { nanoid } from 'nanoid';
import { dedupe } from 'flags/next';
import type { ReadonlyHeaders, ReadonlyRequestCookies } from 'flags';

const generateId = dedupe(async () => nanoid());

export const getOrGenerateVisitorId = async (
  cookies: ReadonlyRequestCookies,
  headers: ReadonlyHeaders,
) => {
  const cookieVisitorId = cookies.get('marketing-visitor-id')?.value;
  if (cookieVisitorId) return cookieVisitorId;

  const headerVisitorId = headers.get('x-marketing-visitor-id');
  if (headerVisitorId) return headerVisitorId;

  return generateId();
};
```

###### Flag using visitor ID

```ts
const identify = dedupe(
  async ({ cookies, headers }: {
    cookies: ReadonlyRequestCookies;
    headers: ReadonlyHeaders;
  }): Promise<Entities> => {
    const visitorId = await getOrGenerateVisitorId(cookies, headers);
    return { visitor: visitorId ? { id: visitorId } : undefined };
  },
);

export const marketingAbTest = flag<boolean, Entities>({
  key: 'marketing-ab-test-flag',
  identify,
  decide({ entities }) {
    if (!entities?.visitor) return false;
    return /^[a-n0-5]/i.test(entities.visitor.id);
  },
});
```

##### Proxy (Middleware)

Use flags in proxy to rewrite requests to static page variants:

```ts
// proxy.ts
import { type NextRequest, NextResponse } from 'next/server';
import { myFlag } from './flags';

export const config = { matcher: ['/example'] };

export async function proxy(request: NextRequest) {
  const active = await myFlag();
  const variant = active ? 'variant-on' : 'variant-off';
  return NextResponse.rewrite(new URL(`/example/${variant}`, request.url));
}
```

For multiple flags on one page, use the precompute pattern instead.

##### Suspense Fallbacks

Combine precomputed flags with Partial Prerendering to serve matching skeletons:

```tsx
async function Example() {
  const hasAuth = await hasAuthCookieFlag();

  return (
    <Suspense fallback={hasAuth ? <AuthedSkeleton /> : <UnauthedSkeleton />}>
      <Dashboard />
    </Suspense>
  );
}
```

The `hasAuthCookieFlag` checks cookie existence without authenticating. Two shells get prerendered — one for each auth state — served statically with no layout shift.

##### Flags Explorer (Next.js)

The Flags Explorer is part of the Vercel Toolbar. Before adding the discovery endpoint below, make sure the toolbar is set up by following the [Toolbar Setup](#toolbar-setup) steps first.

###### App Router

```ts
// app/.well-known/vercel/flags/route.ts
import { getProviderData, createFlagsDiscoveryEndpoint } from 'flags/next';
import * as flags from '../../../../flags';

export const GET = createFlagsDiscoveryEndpoint(async () => {
  return getProviderData(flags);
});
```

###### Pages Router

Requires a rewrite in `next.config.js`:

```js
module.exports = {
  async rewrites() {
    return [
      {
        source: '/.well-known/vercel/flags',
        destination: '/api/vercel/flags',
      },
    ];
  },
};
```

```ts
// pages/api/vercel/flags.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyAccess } from 'flags';

export async function handler(req: NextApiRequest, res: NextApiResponse) {
  const access = await verifyAccess(req.headers.authorization);
  if (!access) return res.status(401).json(null);

  const providerData = { /* ... */ };
  return res.status(200).json(providerData);
}
```

### File: `references/providers.md`

#### Provider Adapters

##### Table of Contents

- [Vercel](#vercel)
- [Global Config](#global-config)
- [Statsig](#statsig)
- [LaunchDarkly](#launchdarkly)
- [PostHog](#posthog)
- [GrowthBook](#growthbook)
- [Flagsmith](#flagsmith)
- [Reflag](#reflag)
- [OpenFeature](#openfeature)
- [Split](#split)
- [Optimizely](#optimizely)
- [Custom Adapters](#custom-adapters)

---

##### Vercel

Package: `@flags-sdk/vercel`

```bash
pnpm i flags @flags-sdk/vercel
```

###### Setup

> **Prerequisite**: The Vercel CLI must be installed and authenticated. If it is not installed, run `pnpm i -g vercel`. For authentication or linking issues, follow the `vercel-cli` skill if it's already available. If it isn't, suggest the user install it with `npx skills add vercel/vercel@vercel-cli` (don't auto-install it) and rely on `vercel <command> --help` in the meantime.

The following steps integrate a flag into an app and need a linked project for `vercel env pull` ([Set up the SDK](flags-sdk.md#set-up-the-sdk), step 2). To only inspect or change remote flags, use the `vercel-flags` skill instead.

1. Create a flag in the Vercel dashboard or via CLI: `vercel flags create <flag-key> --kind boolean --description "<description>"`
2. Pull env vars: run `vercel env pull` to write the Vercel OIDC token and the Development `FLAGS_SECRET` to `.env.local` ([Pull environment variables](flags-sdk.md#pull-environment-variables)).
3. Declare the flag:

```ts
import { flag } from 'flags/next';
import { vercelAdapter } from '@flags-sdk/vercel';

export const exampleFlag = flag({
  key: 'example-flag',
  adapter: vercelAdapter,
});
```

###### User targeting

```ts
import { dedupe, flag } from 'flags/next';
import { vercelAdapter } from '@flags-sdk/vercel';

type Entities = {
  team?: { id: string };
  user?: { id: string };
};

const identify = dedupe(async (): Promise<Entities> => ({
  team: { id: 'team-123' },
  user: { id: 'user-456' },
}));

export const exampleFlag = flag<boolean, Entities>({
  key: 'example-flag',
  identify,
  adapter: vercelAdapter,
});
```

Define the entities and attributes under Flags → Entities in the dashboard before you use them in rules or segments, and return the same names from `identify` ([Entities](https://vercel.com/docs/flags/vercel-flags/dashboard/entities)). The example above allows `--by user.id` / `--by team.id` in `vercel flags split`, `rollout`, and `rules add`, and the matching conditions in dashboard rules. Entities are evaluated fresh on every call; a rule whose attribute is missing from the context is skipped.

###### Attribute types

Each attribute has a type: String, Number, Boolean, String Array, or Timestamp. The value `identify` returns must match it.

- **Timestamp** is a Unix epoch in **milliseconds** as a `number` (`Date.now()`, `user.createdAt.getTime()`, `1719792000000`). Do not pass a `Date`, an ISO string, or seconds.
- Timestamp rules only compare: is after / is before / is at or after / is at or before (`gt` / `lt` / `gte` / `lte`). Equality, one-of, and exists operators are not available for Timestamp attributes.
- Timestamp attributes cannot bucket a split or rollout (`--by`); use them in rule conditions only.
- To release at a certain time, pass the current time as `system.time` and compare against it in a rule. Keep `Date.now()` inside `dedupe` so every flag in the request sees the same time:

```ts
const identify = dedupe(async () => ({
  system: { time: Date.now() },
  user: { id: 'user-456', signupAt: 1719792000000 },
}));
```

###### Flags Explorer

```ts
import { createFlagsDiscoveryEndpoint } from 'flags/next';
import { getProviderData } from '@flags-sdk/vercel';
import * as flags from '../../../../flags';

export const GET = createFlagsDiscoveryEndpoint(async () => {
  return await getProviderData(flags);
});
```

###### Project Connections

Check the installed `@flags-sdk/vercel` version before changing the code. Project Connections require version 1.6.0 or later; upgrade it if needed. The adapter includes the required core library version.

To read flags from another project in the same team, first grant the consumer project access from the source project's **Flags → Connections** page. Then pass the source project's ID:

```ts
import { flag } from 'flags/next';
import { createVercelAdapter } from '@flags-sdk/vercel';

const sharedAdapter = createVercelAdapter({ projectId: 'prj_source' });

export const sharedFeature = flag({
  key: 'shared-feature',
  adapter: sharedAdapter,
  defaultValue: false,
});
```

Use `vercelAdapter` alongside this adapter for the consumer's own flags. Both use the consumer's OIDC token; do not mint an SDK key for a connection. Run `vercel env pull` in the consumer project for local development. Connections apply across environments, and the token selects the source environment; custom environments use preview.

For direct core access, use `@vercel/flags-core` version 1.11.0 or later with `createClient({ projectId: 'prj_source' })`. The `projectId` option cannot be combined with an SDK key. CLI management requires Vercel CLI version 63.0.0 or later; use the `vercel-flags` skill for the connection workflow, or see the [CLI reference](https://vercel.com/docs/cli/flags#project-connections). See [Project Connections](https://vercel.com/docs/flags/vercel-flags/project-connections) for permissions and setup.

###### Custom configuration

```ts
import { createVercelAdapter } from '@flags-sdk/vercel';

const customAdapter = createVercelAdapter(process.env.CUSTOM_FLAGS_KEY!);

export const exampleFlag = flag({
  key: 'example-flag',
  adapter: customAdapter,
});
```

###### Using your own client (e.g. for singleton)

If the app also uses `@vercel/flags-core` directly, create the client once and pass it to the adapter so both share the same instance:

```ts
import { createClient } from '@vercel/flags-core';
import { createVercelAdapter } from '@flags-sdk/vercel';

const vercelFlagsClient = createClient(); // Vercel OIDC token, on deployments and after `vercel env pull`
const vercelAdapter = createVercelAdapter(vercelFlagsClient);

export const exampleFlag = flag({
  key: 'example-flag',
  adapter: vercelAdapter,
});
```

Outside Vercel, pass the SDK key: `createClient(process.env.FLAGS)`. Unlike `vercelAdapter()`, `createClient()` does not read `FLAGS` on its own.

###### Core client in other frameworks (for example, Express)

Frameworks without a Flags SDK entrypoint use `@vercel/flags-core` directly instead of this SDK. The `vercel-flags` skill carries the example and the OIDC timing rules ([Core SDK](https://vercel.com/docs/flags/vercel-flags/sdks/core)).

###### Managing flags

What a flag serves (enable, set, split, rollout, rules, segments, archive) is configured in the Vercel dashboard or with the `vercel flags` CLI, not in code. Keep the declaration in sync with the remote definition: the CLI key is the `key` in `flag()`, the kind matches the type parameter, `options` mirror the variants, and `defaultValue` is what the flag serves when it is archived or still a draft. The `vercel-flags` skill covers rollouts, experiments, promotion order, and the checks to run before archiving; `vercel flags <cmd> --help` lists the options.

CLI reference: https://vercel.com/docs/cli/flags

---

##### Global Config

Package: `@flags-sdk/global-config`

```bash
pnpm i @flags-sdk/global-config
```

Env: `GLOBAL_CONFIG="global-config-connection-string"`

###### Usage

```ts
import { flag } from 'flags/next';
import { globalConfigAdapter } from '@flags-sdk/global-config';

export const exampleFlag = flag({
  adapter: globalConfigAdapter,
  key: 'example-flag',
});
```

Global Config should contain:

```json
{
  "flags": {
    "example-flag": true,
    "another-flag": false
  }
}
```

###### Custom configuration

```ts
import { createGlobalConfigAdapter } from '@flags-sdk/global-config';

const myAdapter = createGlobalConfigAdapter({
  connectionString: process.env.OTHER_GLOBAL_CONFIG,
  options: {
    globalConfigItemKey: 'other-flags-key',
    teamSlug: 'my-team',
  },
});
```

---

##### Statsig

Package: `@flags-sdk/statsig`

```bash
pnpm i @flags-sdk/statsig
```

Env vars:
- `STATSIG_SERVER_API_KEY` (required)
- `STATSIG_PROJECT_ID` (optional)
- `EXPERIMENTATION_CONFIG` (optional, Global Config)
- `EXPERIMENTATION_CONFIG_ITEM_KEY` (optional)

###### Methods

```ts
import { statsigAdapter, type StatsigUser } from '@flags-sdk/statsig';

// Feature Gates
export const myGate = flag<boolean, StatsigUser>({
  key: 'my_feature_gate',
  adapter: statsigAdapter.featureGate((gate) => gate.value),
  identify,
});

// Dynamic Configs
export const myConfig = flag<Record<string, unknown>, StatsigUser>({
  key: 'my_dynamic_config',
  adapter: statsigAdapter.dynamicConfig((config) => config.value),
  identify,
});

// Experiments
export const myExperiment = flag<Record<string, unknown>, StatsigUser>({
  key: 'my_experiment',
  adapter: statsigAdapter.experiment((config) => config.value),
  identify,
});

// Autotune
export const myAutotune = flag<Record<string, unknown>, StatsigUser>({
  key: 'my_autotune',
  adapter: statsigAdapter.autotune((config) => config.value),
  identify,
});

// Layers
export const myLayer = flag<Record<string, unknown>, StatsigUser>({
  key: 'my_layer',
  adapter: statsigAdapter.layer((layer) => layer.value),
  identify,
});
```

###### Same key, different mappings

Use `.` to distinguish flags from the same config:

```ts
export const text = flag<string, StatsigUser>({
  key: 'my_config.text',
  adapter: statsigAdapter.dynamicConfig((c) => c.value.text as string),
  identify,
});

export const price = flag<number, StatsigUser>({
  key: 'my_config.price',
  adapter: statsigAdapter.dynamicConfig((c) => c.value.price as number),
  identify,
});
```

###### Exposure logging

Disabled by default (middleware prefetch would cause premature exposures). Enable explicitly:

```ts
adapter: statsigAdapter.featureGate((gate) => gate.value, {
  exposureLogging: true,
})
```

Log exposures from the client instead when possible.

###### Flags Explorer

```ts
import { getProviderData as getStatsigProviderData } from '@flags-sdk/statsig';
import { mergeProviderData } from 'flags';

export const GET = createFlagsDiscoveryEndpoint(async () => {
  return mergeProviderData([
    getProviderData(flags),
    getStatsigProviderData({
      consoleApiKey: process.env.STATSIG_CONSOLE_API_KEY,
      projectId: process.env.STATSIG_PROJECT_ID,
    }),
  ]);
});
```

---

##### LaunchDarkly

Package: `@flags-sdk/launchdarkly`

```bash
pnpm i @flags-sdk/launchdarkly
```

Env vars:
- `LAUNCHDARKLY_CLIENT_SIDE_ID` (required)
- `LAUNCHDARKLY_PROJECT_SLUG` (required)
- `GLOBAL_CONFIG` (required)

###### Usage

```ts
import { ldAdapter, type LDContext } from '@flags-sdk/launchdarkly';

const identify = dedupe((async ({ headers, cookies }) => {
  const user = await getUser(headers, cookies);
  return { key: user.userID };
}) satisfies Identify<LDContext>);

export const exampleFlag = flag<boolean, LDContext>({
  key: 'example-flag',
  identify,
  adapter: ldAdapter.variation(),
});
```

###### Flags Explorer

```ts
import { getProviderData as getLDProviderData } from '@flags-sdk/launchdarkly';

return mergeProviderData([
  getProviderData(flags),
  getLDProviderData({
    apiKey: process.env.LAUNCHDARKLY_API_KEY,
    projectKey: process.env.LAUNCHDARKLY_PROJECT_KEY,
    environment: process.env.LAUNCHDARKLY_ENVIRONMENT,
  }),
]);
```

---

##### PostHog

Package: `@flags-sdk/posthog`

```bash
pnpm i @flags-sdk/posthog
```

Env vars, always required:
- `POSTHOG_HOST` (e.g. `https://us.i.posthog.com` or `https://eu.i.posthog.com`)
- `POSTHOG_PROJECT_API_KEY` (`phc_...`)

Optional, opts into local evaluation (background polling) instead of remote:
- `POSTHOG_SECRET_KEY` (`phs_...`)

For the Flags Explorer (`getProviderData` only):
- `POSTHOG_PERSONAL_API_KEY` (`phx_...`)
- `POSTHOG_PROJECT_ID` (e.g. `521742`)

###### Methods

```ts
import { postHogAdapter } from '@flags-sdk/posthog';

// Value — boolean flag. Pass the adapter uninvoked or invoked, both work.
export const myFlag = flag<boolean>({
  key: 'my-flag',
  adapter: postHogAdapter,
  identify,
});

// Value — multivariate flag resolves to the variant string
export const myVariant = flag<string>({
  key: 'my-flag',
  adapter: postHogAdapter,
  identify,
});

// Payload
export const myPayload = flag({
  key: 'my-flag',
  adapter: postHogAdapter.payload,
  defaultValue: {},
  identify,
});
```

`identify` must return `{ distinctId }`.

###### Flags Explorer

Requires: `POSTHOG_PERSONAL_API_KEY`, `POSTHOG_PROJECT_ID`

```ts
import { getProviderData as getPostHogProviderData } from '@flags-sdk/posthog';

export const GET = createFlagsDiscoveryEndpoint(() =>
  getPostHogProviderData({
    personalApiKey: process.env.POSTHOG_PERSONAL_API_KEY!,
    projectId: process.env.POSTHOG_PROJECT_ID!,
  }),
);
```

---

##### GrowthBook

Package: `@flags-sdk/growthbook`

```bash
pnpm i @flags-sdk/growthbook
```

Env: `GROWTHBOOK_CLIENT_KEY` (required)

###### Usage

```ts
import { growthbookAdapter, type Attributes } from '@flags-sdk/growthbook';

const identify = dedupe((async ({ cookies }) => ({
  id: cookies.get('user_id')?.value,
})) satisfies Identify<Attributes>);

export const myFlag = flag({
  key: 'my_feature',
  identify,
  adapter: growthbookAdapter.feature<boolean>(),
});
```

###### Global Config

Set `GROWTHBOOK_EDGE_CONNECTION_STRING` or `EXPERIMENTATION_CONFIG` (Vercel Marketplace).

###### Tracking

```ts
growthbookAdapter.setTrackingCallback((experiment, result) => {
  after(async () => {
    console.log('Experiment', experiment.key, 'Variation', result.key);
  });
});
```

---

##### Flagsmith

Package: `@flags-sdk/flagsmith`

```bash
pnpm i @flags-sdk/flagsmith
```

Env: `FLAGSMITH_ENVIRONMENT_KEY` (required)

Remote evaluation is the default for serverless deployments. For a long-running server, use `createFlagsmithAdapter({ environmentKey, enableLocalEvaluation: true })` with a server-side key to opt into local evaluation and environment polling. Call `adapter.close()` on shutdown to stop polling.

###### Usage with type coercion

```ts
import { flagsmithAdapter } from '@flags-sdk/flagsmith';

export const buttonColor = flag<string>({
  key: 'button-color',
  defaultValue: 'blue',
  adapter: flagsmithAdapter.getValue({ coerce: 'string' }),
});

export const showBanner = flag<boolean>({
  key: 'show-banner',
  defaultValue: false,
  adapter: flagsmithAdapter.getValue({ coerce: 'boolean' }),
});
```

Coercion options: `'string'`, `'number'`, `'boolean'`, or omit for raw value.

---

##### Reflag

Package: `@flags-sdk/reflag`

```bash
pnpm i @flags-sdk/reflag
```

Env: `REFLAG_SECRET_KEY`

```ts
import { reflagAdapter, type Context } from '@flags-sdk/reflag';

const identify = dedupe((async ({ headers, cookies }) => ({
  user: { id: 'user-id', name: 'name', email: 'email' },
  company: { id: 'company-id' },
})) satisfies Identify<Context>);

export const myFeature = flag<boolean, Context>({
  key: 'my_feature',
  identify,
  adapter: reflagAdapter.isEnabled(),
});
```

---

##### OpenFeature

Package: `@flags-sdk/openfeature` + `@openfeature/server-sdk`

```bash
pnpm i @flags-sdk/openfeature @openfeature/server-sdk
```

###### Setup

```ts
import { createOpenFeatureAdapter } from '@flags-sdk/openfeature';

// Sync provider
OpenFeature.setProvider(new YourProvider());
const adapter = createOpenFeatureAdapter(OpenFeature.getClient());

// Async provider
const adapter = createOpenFeatureAdapter(async () => {
  await OpenFeature.setProviderAndWait(new YourProvider());
  return OpenFeature.getClient();
});
```

###### Methods

```ts
adapter.booleanValue()  // boolean flags
adapter.stringValue()   // string flags
adapter.numberValue()   // number flags
adapter.objectValue()   // object flags
```

All require `defaultValue` on the flag declaration.

---

##### Split

Package: `@flags-sdk/split` (Flags Explorer only, adapter coming soon)

```ts
import { getProviderData as getSplitProviderData } from '@flags-sdk/split';

getSplitProviderData({
  adminApiKey: process.env.SPLIT_ADMIN_API_KEY,
  environmentId: process.env.SPLIT_ENVIRONMENT_ID,
  organizationId: process.env.SPLIT_ORG_ID,
  workspaceId: process.env.SPLIT_WORKSPACE_ID,
});
```

---

##### Optimizely

Package: `@flags-sdk/optimizely` (Flags Explorer only, adapter coming soon)

```ts
import { getProviderData as getOptimizelyProviderData } from '@flags-sdk/optimizely';

getOptimizelyProviderData({
  projectId: process.env.OPTIMIZELY_PROJECT_ID,
  apiKey: process.env.OPTIMIZELY_API_KEY,
});
```

---

##### Custom Adapters

Create an adapter factory:

```ts
import type { Adapter } from 'flags';

export function createMyAdapter(/* options */) {
  return function myAdapter<ValueType, EntitiesType>(): Adapter<ValueType, EntitiesType> {
    return {
      origin(key) {
        return `https://my-provider.com/flags/${key}`;
      },
      async decide({ key }): Promise<ValueType> {
        return false as ValueType;
      },
    };
  };
}
```

###### Bulk evaluation (`bulkDecide`)

Adapters can implement an optional `bulkDecide` hook. When set (and the adapter has an `adapterId`), `evaluate()` calls it once for every group of flags that share this adapter and the same `identify` source — instead of calling `decide` per flag. This lets the provider share work across evaluations (e.g. a single network request for many flags).

```ts
return {
  adapterId: 'my-provider', // required for bulkDecide to be used
  origin(key) {
    return `https://my-provider.com/flags/${key}`;
  },
  async decide({ key }): Promise<ValueType> {
    return false as ValueType;
  },
  // Called by evaluate() for a batch of flags sharing this adapter + identify
  async bulkDecide({ flags, entities, headers, cookies }) {
    // flags: { key: string; defaultValue?: unknown }[]
    // Return a record keyed by flag key.
    return Object.fromEntries(
      flags.map(({ key }) => [key, false as ValueType]),
    );
  },
};
```

Contract:

- Return `Record<flagKey, value>`. Missing keys or `value: undefined` fall back to each flag's `defaultValue`.
- Throwing falls back to `defaultValue` per flag (and rejects for flags without a `defaultValue`).
- A flag with an inline `decide` takes precedence and is excluded from bulk evaluation.

###### Default adapter pattern

Expose a lazily-initialized default for simpler usage:

```ts
let defaultAdapter: ReturnType<typeof createMyAdapter> | undefined;

export function myAdapter<V, E>(): Adapter<V, E> {
  if (!defaultAdapter) {
    if (!process.env.MY_API_KEY) throw new Error('Missing MY_API_KEY');
    defaultAdapter = createMyAdapter(process.env.MY_API_KEY);
  }
  return defaultAdapter<V, E>();
}
```

Usage:

```ts
import { myAdapter } from './my-adapter';

export const exampleFlag = flag({
  key: 'example',
  adapter: myAdapter,
});
```

### File: `references/sveltekit.md`

#### SvelteKit Integration

##### Table of Contents

- [Quickstart](#quickstart)
- [Toolbar Setup](#toolbar-setup)
- [Flag Declaration](#flag-declaration)
- [Evaluation Context](#evaluation-context)
- [Precompute](#precompute)
- [Dashboard Pages](#dashboard-pages)
- [Marketing Pages](#marketing-pages)

##### Quickstart

###### Installation

```sh
pnpm i flags @vercel/toolbar
```

###### Create a flag

```ts
// src/lib/flags.ts
import { flag } from 'flags/sveltekit';

export const showDashboard = flag<boolean>({
  key: 'showDashboard',
  description: 'Show the dashboard',
  origin: 'https://example.com/#showdashboard',
  options: [{ value: true }, { value: false }],
  decide(_event) {
    return false;
  },
});
```

###### Set up the server hook

One-time setup that makes the toolbar aware of your flags:

```ts
// src/hooks.server.ts
import { createHandle } from 'flags/sveltekit';
import { FLAGS_SECRET } from '$env/static/private';
import * as flags from '$lib/flags';

export const handle = createHandle({ secret: FLAGS_SECRET, flags });
```

When composing with other handlers via SvelteKit's `sequence`, `createHandle` must come first.

###### Use the flag

```ts
// src/routes/+page.server.ts
import { showDashboard } from '$lib/flags';

export const load = async () => {
  const dashboard = await showDashboard();
  return {
    post: { title: dashboard ? 'New Dashboard' : 'Old Dashboard' },
  };
};
```

```svelte
<!-- src/routes/+page.svelte -->
<script lang="ts">
  import type { PageProps } from './$types';
  let { data }: PageProps = $props();
</script>

<h1>{data.post.title}</h1>
```

##### Toolbar Setup

1. Install `@vercel/toolbar`
2. Add vite plugin:

```ts
// vite.config.ts
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { vercelToolbar } from '@vercel/toolbar/plugins/vite';

export default defineConfig({
  plugins: [sveltekit(), vercelToolbar()],
});
```

3. Render toolbar in layout:

```svelte
<!-- src/routes/+layout.svelte -->
<script lang="ts">
  import type { LayoutProps } from './$types';
  import { mountVercelToolbar } from '@vercel/toolbar/vite';
  import { onMount } from 'svelte';

  onMount(() => mountVercelToolbar());

  let { children }: LayoutProps = $props();
</script>

<main>
  {@render children()}
</main>
```

##### Flag Declaration

```ts
import { flag } from 'flags/sveltekit';

export const showSummerSale = flag<boolean>({
  key: 'summer-sale',
  async decide() { return false; },
  origin: 'https://example.com/flags/summer-sale/',
  description: 'Show Summer Holiday Sale Banner, 20% off',
  options: [
    { value: false, label: 'Hide' },
    { value: true, label: 'Show' },
  ],
});
```

##### Evaluation Context

Use `identify` to segment users. Headers and cookies are normalized:

```ts
import { flag } from 'flags/sveltekit';

interface Entities {
  user?: { id: string };
}

export const exampleFlag = flag<boolean, Entities>({
  key: 'identify-example-flag',
  identify({ headers, cookies }) {
    const userId = cookies.get('user-id')?.value;
    return { user: userId ? { id: userId } : undefined };
  },
  decide({ entities }) {
    return entities?.user?.id === 'user1';
  },
});
```

###### Deduplication

Extract `identify` as a named function and reuse across flags. Calls are deduped by function identity:

```ts
import type { ReadonlyHeaders, ReadonlyRequestCookies } from 'flags';
import { flag } from 'flags/sveltekit';

interface Entities {
  visitorId?: string;
}

function identify({
  cookies,
  headers,
}: {
  cookies: ReadonlyRequestCookies;
  headers: ReadonlyHeaders;
}): Entities {
  const visitorId =
    cookies.get('visitorId')?.value ?? headers.get('x-visitorId');
  return { visitorId };
}

export const flag1 = flag<boolean, Entities>({
  key: 'flag1',
  identify,
  decide({ entities }) { /* ... */ },
});

export const flag2 = flag<boolean, Entities>({
  key: 'flag2',
  identify,
  decide({ entities }) { /* ... */ },
});
```

##### Precompute

###### Why both Routing Middleware and reroute

- `middleware.ts` handles full page visits in production (runs before CDN)
- `reroute` handles client-side navigations and dev-time routing
- Middleware has access to cookies and private env vars; `reroute` runs on client and must defer to server

###### Step 1: Create flag group

```ts
// src/lib/flags.ts
import { flag } from 'flags/sveltekit';

export const firstPricingABTest = flag({
  key: 'firstPricingABTest',
  decide: () => false,
});

export const secondPricingABTest = flag({
  key: 'secondPricingABTest',
  decide: () => false,
});
```

```ts
// src/lib/precomputed-flags.ts
import { precompute } from 'flags/sveltekit';
import { firstPricingABTest, secondPricingABTest } from './flags';

export const pricingFlags = [firstPricingABTest, secondPricingABTest];

export async function computeInternalRoute(pathname: string, request: Request) {
  if (pathname === '/pricing') {
    return '/pricing/' + (await precompute(pricingFlags, request));
  }
  return pathname;
}
```

###### Step 2: Set up reroute hook

```ts
// src/hooks.ts
export async function reroute({ url, fetch }) {
  if (url.pathname === '/pricing') {
    const destination = new URL('/api/reroute', url);
    destination.searchParams.set('pathname', url.pathname);
    return fetch(destination).then((response) => response.text());
  }
}
```

```ts
// src/routes/api/reroute/+server.ts
import { text } from '@sveltejs/kit';
import { computeInternalRoute } from '$lib/precomputed-flags';

export async function GET({ url, request }) {
  const destination = await computeInternalRoute(
    url.searchParams.get('pathname')!,
    request,
  );
  return text(destination);
}
```

###### Step 3: Set up middleware

```ts
// middleware.ts
import { rewrite } from '@vercel/edge';
import { normalizeUrl } from '@sveltejs/kit';
import { computeInternalRoute } from './src/lib/precomputed-flags';

export const config = { matcher: ['/pricing'] };

export default async function middleware(request: Request) {
  const { url, denormalize } = normalizeUrl(request.url);
  if (url.pathname === '/pricing') {
    return rewrite(
      denormalize(await computeInternalRoute(url.pathname, request)),
    );
  }
}
```

###### Step 4: Read precomputed values

```ts
// src/routes/pricing/[code]/+page.server.ts
import type { PageServerLoad } from './$types';
import { firstPricingABTest, secondPricingABTest } from '$lib/flags';
import { pricingFlags } from '$lib/precomputed-flags';

export const load: PageServerLoad = async ({ params }) => {
  const flag1 = await firstPricingABTest(params.code, pricingFlags);
  const flag2 = await secondPricingABTest(params.code, pricingFlags);
  return {
    first: `First: ${flag1}`,
    second: `Second: ${flag2}`,
  };
};
```

```svelte
<!-- src/routes/pricing/[code]/+page.svelte -->
<script>
  let { data } = $props();
</script>

<p>{data.first}</p>
<p>{data.second}</p>
```

###### Enable ISR

```ts
// src/routes/pricing/[code]/+page.server.ts
export const config = {
  isr: { expiration: false },
};
```

###### Enable prerendering

```ts
import { generatePermutations } from 'flags/sveltekit';
import { pricingFlags } from '$lib/precomputed-flags';

export const prerender = true;

export async function entries() {
  return (await generatePermutations(pricingFlags)).map((code) => ({ code }));
}
```

##### Dashboard Pages

```ts
// src/lib/flags.ts
import { flag } from 'flags/sveltekit';

export const showNewDashboard = flag<boolean>({
  key: 'showNewDashboard',
  decide({ cookies }) {
    return cookies.get('showNewDashboard')?.value === 'true';
  },
});
```

```ts
// src/routes/+page.server.ts
import type { PageServerLoad } from './$types';
import { showNewDashboard } from '$lib/flags';

export const load: PageServerLoad = async () => {
  const dashboard = await showNewDashboard();
  return { title: dashboard ? 'New Dashboard' : 'Old Dashboard' };
};
```

##### Marketing Pages

Combine precompute with visitor ID generation for A/B tests on static pages:

###### Middleware with visitor ID

```ts
// middleware.ts
import { rewrite } from '@vercel/edge';
import { parse } from 'cookie';
import { normalizeUrl } from '@sveltejs/kit';
import { computeInternalRoute, createVisitorId } from './src/lib/precomputed-flags';

export const config = { matcher: ['/examples/marketing-pages'] };

export default async function middleware(request: Request) {
  const { url, denormalize } = normalizeUrl(request.url);

  let visitorId = parse(request.headers.get('cookie') ?? '').visitorId || '';
  if (!visitorId) {
    visitorId = createVisitorId();
    request.headers.set('x-visitorId', visitorId);
  }

  return rewrite(
    denormalize(await computeInternalRoute(url.pathname, request)),
  );
}
```

###### Flags with identify

```ts
// src/lib/flags.ts
import { flag } from 'flags/sveltekit';

interface Entities {
  visitorId?: string;
}

function identify({ cookies, headers }) {
  const visitorId =
    cookies.get('visitorId')?.value ?? headers.get('x-visitorId');
  if (!visitorId) throw new Error('Visitor ID not found');
  return { visitorId };
}

export const firstMarketingABTest = flag<boolean, Entities>({
  key: 'firstMarketingABTest',
  identify,
  decide({ entities }) {
    if (!entities?.visitorId) return false;
    return /^[a-n0-5]/i.test(entities.visitorId);
  },
});
```

The `x-visitorId` header ensures the visitor ID is available even on the first request before the cookie is set.

### File: `upstream/SOURCE.md`

---
name: flags-sdk
description: >
  Implement feature flags in Next.js or SvelteKit code with the Flags SDK (`flags` npm package).
  Use when installing or configuring the SDK, declaring flags with `flag()`, setting up Project
  Connections, wiring a provider adapter (`@flags-sdk/vercel`, Statsig, LaunchDarkly, PostHog, GrowthBook, Global Config,
  OpenFeature, Split, Flagsmith, Reflag, Optimizely, or custom), using `identify`, `dedupe`, or
  `evaluate`, keeping pages static with precompute, setting up Flags Explorer and the Vercel
  Toolbar, or encrypting flag values. Triggers: `flags/next`, `flags/sveltekit`, `flags/react`,
  `@flags-sdk/*`, `vercelAdapter`, precompute. For planning a flag, for Vercel Flags rollouts,
  experiments, and the `vercel flags` CLI, or for other frameworks, use the `vercel-flags` skill.
---

#### Set up and use the Flags SDK

The Flags SDK (`flags` npm package) is a feature flags toolkit for Next.js and SvelteKit. It turns each feature flag into a callable function, works with any flag provider via adapters, and keeps pages static using the precompute pattern. Vercel Flags is the first-party provider; its adapter is `@flags-sdk/vercel`.

- Docs: https://flags-sdk.dev
- Repo: https://github.com/vercel/flags

This skill covers the code. Planning a flag, choosing between the Flags SDK, `@vercel/flags-core`, and OpenFeature, and managing flags in the dashboard or with the `vercel flags` CLI belong to the `vercel-flags` skill. Archiving a flag, deleting it, or removing a variant requires the checks in that skill (remove the code first, confirm no evaluations over the Skew Protection window, archive before `rm`); do not run those commands without it. If it is not available, suggest `npx skills add vercel/flags@vercel-flags` (do not auto-install) and run `vercel flags <cmd> --help` in the meantime. For a project on another framework, `@vercel/flags-core` replaces this SDK ([Core SDK](https://vercel.com/docs/flags/vercel-flags/sdks/core)).

When the user asks to install, configure, or set up the SDK, follow [Set up the SDK](#set-up-the-sdk) (including `vercel env pull` when `.env.local` is missing). When they ask to add a flag to the code, follow [Create a flag](#create-a-flag) or [Add a flag that already exists on Vercel](#add-a-flag-that-already-exists-on-vercel). Inside an app repository, treat an ambiguous request as the full flow. Do not leave CLI steps as "next steps" for the user; execute them yourself.

##### Core concepts

###### Flags as code

Each flag is declared as a function. No string keys at call sites:

```ts
import { flag } from 'flags/next';

export const exampleFlag = flag({
  key: 'example-flag',
  decide() { return false; },
});

const value = await exampleFlag();
```

###### Server-side evaluation

Flags evaluate server-side to avoid layout shift, keep pages static, and maintain confidentiality. Combine routing middleware with the precompute pattern to serve static variants from CDN.

###### Adapter pattern

Adapters replace `decide` and `origin` on a flag declaration, connecting your flags to a provider. Vercel Flags (`@flags-sdk/vercel`) is the first-party adapter. Third-party adapters are available for Statsig, LaunchDarkly, PostHog, and others.

```ts
import { flag } from 'flags/next';
import { vercelAdapter } from '@flags-sdk/vercel';

export const exampleFlag = flag({
  key: 'example-flag',
  adapter: vercelAdapter,
});
```

> **Version note**: The SDK is published as `flags` (renamed from `@vercel/flags`; that old name still appears in changelog history). `flags` 4.2.0+ accepts the adapter factory by reference (`adapter: vercelAdapter`) and resolves it once per declaration. Older versions require calling it (`adapter: vercelAdapter()`). The called form still works on new versions, so prefer the shorthand unless you're targeting `flags` < 4.2.0.

##### Set up the SDK

One-time project setup. Run this when the Flags SDK is not installed yet, or when Toolbar / Flags Explorer / `.env.local` are missing. Skip any step that is already done.

###### Before you start

Check the project state to adapt commands and decide which steps you can skip:

- Which lockfile is present (`pnpm-lock.yaml`, `package-lock.json`, `yarn.lock`, `bun.lockb`)? → Adapt all package manager commands accordingly (`pnpm add`, `npm install`, `yarn add`, `bun add`).
- Is `flags` in `package.json`? → Skip install (step 1)
- Is the project linked? → Skip `vercel link` in step 2
- Does `.env.local` contain `VERCEL_OIDC_TOKEN=` (or a `FLAGS=` SDK key)? → Env vars already pulled, skip step 3
- Is `@vercel/toolbar` in `package.json`? → Skip toolbar setup (step 4)
- Does `flags.ts` (or `lib/flags.ts`, `src/flags.ts`) exist? → Skip creating it (step 5)
- Does `app/.well-known/vercel/flags/route.ts` exist? → Flags Explorer already set up, skip step 6

###### Steps

1. **Install packages** (if not already in `package.json`):
   ```bash
   pnpm i flags @flags-sdk/vercel
   ```

2. **Link the project to Vercel** (required for `vercel env pull` and local OIDC token refresh):
   > **Prerequisite**: The Vercel CLI must be installed and authenticated. If it is not installed, run `pnpm i -g vercel`. For authentication or linking issues, follow the `vercel-cli` skill if it's already available. If it isn't, suggest the user install it with `npx skills add vercel/vercel@vercel-cli` (don't auto-install it) and rely on `vercel <command> --help` in the meantime.

   Verify the link with `vercel project inspect --non-interactive` and check the reported owner and project name; a `.vercel/` directory alone does not prove a link. If it reports `link_required`, run `vercel link`. If the user named a project or team and the output differs, stop and ask instead of relinking.

3. **Pull environment variables**: If `.env.local` lacks `VERCEL_OIDC_TOKEN=`, follow [Pull environment variables](#pull-environment-variables).

4. **Set up the Vercel Toolbar** (if not already present):
   - Run `pnpm i @vercel/toolbar`
   - Wrap `next.config.ts` with the toolbar plugin
   - Render `<VercelToolbar />` in the root layout
   See [references/nextjs.md — Toolbar Setup](flags-sdk.md#file-upstreamreferencesnextjsmd) for the full code.

5. **Ensure `flags.ts` exists**: If missing, create `flags.ts` (or `lib/flags.ts` / `src/flags.ts` to match the project) with `export {}` so TypeScript treats it as a module. Flags Explorer imports this file — create it before the discovery route.

6. **Set up Flags Explorer** (if not already present): Create `app/.well-known/vercel/flags/route.ts` — see [Flags Explorer setup](#flags-explorer-setup). Do this only after `flags.ts` exists. Point the import at the real flags file path (the snippet assumes root `flags.ts`).

##### Pull environment variables

`vercel env pull` writes the Development credentials to `.env.local`: the Vercel OIDC token that `vercelAdapter` uses locally (deployments receive it automatically, [Getting started](https://vercel.com/docs/flags/vercel-flags/quickstart#pull-local-openid-connect-credentials)) and the Development `FLAGS_SECRET` for Flags Explorer and overrides. Run it when:

- `.env.local` lacks `VERCEL_OIDC_TOKEN=` (or a `FLAGS=` SDK key)
- you created the project's first flag; activating Vercel Flags creates a `FLAGS_SECRET` per environment
- local evaluation fails with an authentication error; the SDK refreshes an expired token through the linked project, re-pulling is the fallback

Use SDK keys (`FLAGS`) for apps outside Vercel or to select an environment explicitly ([SDK Keys](https://vercel.com/docs/flags/vercel-flags/dashboard/sdk-keys)). To read another same-team project's flags on Vercel, use [Project Connections](flags-sdk.md#file-upstreamreferencesprovidersmd) with your project's OIDC token. If `FLAGS_SECRET` is still missing after the pull, generate it per [FLAGS_SECRET](#flags_secret).

##### Create a flag

When a user asks you to create or add a feature flag that does not exist on Vercel yet, follow these steps in order. If the flag was already created in the dashboard (the prompt says so, or `vercel flags create` reports the key exists), follow [Add a flag that already exists on Vercel](#add-a-flag-that-already-exists-on-vercel) instead.

###### Before you start

- Complete [Set up the SDK](#set-up-the-sdk) first if packages, Vercel link, `.env.local`, Toolbar, `flags.ts`, or Flags Explorer are missing. Skip steps that are already done.
- Does `.env.local` contain `VERCEL_OIDC_TOKEN=`? → Env vars already pulled; see [Pull environment variables](#pull-environment-variables) if local evaluation fails with an authentication error.
- Does `flags.ts` (or `lib/flags.ts`, `src/flags.ts`) exist? → Add to it rather than creating from scratch.

###### Steps

1. **Ensure the SDK is set up**: Follow [Set up the SDK](#set-up-the-sdk) if needed, then continue.

2. **Register the flag with Vercel**: Run `vercel flags create <flag-key> --kind boolean --description "<description>"` against the linked project, or pass `--project <name-or-id>` and `--scope <team>`. Pick the kind to match the flag's type parameter; it cannot be changed later.

3. **Pull environment variables**: If this is the project's first flag, follow [Pull environment variables](#pull-environment-variables) again; activation created the `FLAGS_SECRET`.

4. **Declare the flag in code**: Add it to `flags.ts` (or create the file if it doesn't exist) using `vercelAdapter`:
   ```ts
   import { flag } from 'flags/next';
   import { vercelAdapter } from '@flags-sdk/vercel';

   export const myFlag = flag({
     key: 'my-flag',
     adapter: vercelAdapter,
   });
   ```

5. **Use the flag**: Call it in your page or component and conditionally render based on the result:
   ```tsx
   import { myFlag } from '../flags';

   export default async function Page() {
     const enabled = await myFlag();
     return <div>{enabled ? 'Feature on' : 'Feature off'}</div>;
   }
   ```

##### Add a flag that already exists on Vercel

Use this flow when the flag was created in the dashboard or by someone else, for example when the prompt says the flag "has already been created" or asks you to run `vercel flags inspect`. Do not run `vercel flags create` for an existing key.

1. **Ensure the SDK is set up**: Follow [Set up the SDK](#set-up-the-sdk) if needed.
2. **Read the definition**: Run `vercel flags inspect <flag-key>`. Note the kind, the variants (value and label), the description, and what each environment serves.
3. **Pull environment variables**: If `.env.local` lacks `VERCEL_OIDC_TOKEN=`, follow [Pull environment variables](#pull-environment-variables).
4. **Declare the flag**: Add it to `flags.ts` with `vercelAdapter`. Map the `inspect` output:
   - `key`: the flag key exactly as printed
   - kind → type parameter: `boolean` → `flag<boolean>`, `string` → `flag<string>`, `number` → `flag<number>`, `json` → `flag<YourType>`
   - `description`: copy from `inspect`
   - `defaultValue`: the value to serve when the flag is archived or evaluation fails (usually what production serves today)
   - `options`: optional; mirror the variants when you use precompute or want them listed in Flags Explorer
   - `identify`: add or reuse one when the flag has targeting, using the entity attributes configured in the dashboard (see [Flag with evaluation context](#flag-with-evaluation-context))
   ```ts
   export const welcomeMessage = flag<string>({
     key: 'welcome-message',
     description: 'Copy shown on the landing page',
     defaultValue: 'control',
     adapter: vercelAdapter,
   });
   ```
5. **Use the flag** as in [Create a flag](#create-a-flag) step 5.

##### Vercel Flags adapter

`@flags-sdk/vercel` connects `flag()` declarations to Vercel Flags. `vercelAdapter` authenticates with the project's Vercel OIDC token and evaluates the configuration of the current environment. Use `@flags-sdk/vercel` version 1.6.0 or later and `createVercelAdapter({ projectId })` for a connected same-team project's flags; see [Project Connections](flags-sdk.md#file-upstreamreferencesprovidersmd). SDK keys (`FLAGS`) are for manual authentication, such as apps outside Vercel or selecting an environment explicitly. Activating Vercel Flags creates a `FLAGS_SECRET` per environment for Flags Explorer.

For user targeting, attribute types, custom adapter configuration, sharing a `@vercel/flags-core` client, and the Flags Explorer endpoint, see [references/providers.md — Vercel](flags-sdk.md#file-upstreamreferencesprovidersmd).

Changing what a flag serves (enable, set, split, rollout, rules, archive) happens in the dashboard or with `vercel flags`, not in code. The `vercel-flags` skill covers those flows; `vercel flags <cmd> --help` lists the options.

##### Declaring flags

When using Vercel Flags, declare flags with `vercelAdapter` as shown in [Create a flag](#create-a-flag). For other providers, see [references/providers.md](flags-sdk.md#file-upstreamreferencesprovidersmd). Below are the general `flag()` patterns.

###### Basic flag

```ts
import { flag } from 'flags/next'; // or 'flags/sveltekit'

export const showBanner = flag<boolean>({
  key: 'show-banner',
  description: 'Show promotional banner',
  defaultValue: false,
  options: [
    { value: false, label: 'Hide' },
    { value: true, label: 'Show' },
  ],
  decide() { return false; },
});
```

###### Flag with evaluation context

Use `identify` to establish who the request is for. The returned entities are passed to `decide`:

```ts
import { dedupe, flag } from 'flags/next';
import type { ReadonlyRequestCookies } from 'flags';

interface Entities {
  user?: { id: string };
}

const identify = dedupe(
  ({ cookies }: { cookies: ReadonlyRequestCookies }): Entities => {
    const userId = cookies.get('user-id')?.value;
    return { user: userId ? { id: userId } : undefined };
  },
);

export const dashboardFlag = flag<boolean, Entities>({
  key: 'new-dashboard',
  identify,
  decide({ entities }) {
    if (!entities?.user) return false;
    return ['user1', 'user2'].includes(entities.user.id);
  },
});
```

With `vercelAdapter`, the entity and attribute names in the returned object (`user.id` here) are what dashboard rules and `vercel flags split|rollout|rules --by` target. They must match the entities and attribute types configured in the dashboard. See [references/providers.md — User targeting](flags-sdk.md#file-upstreamreferencesprovidersmd) and [Attribute types](flags-sdk.md#file-upstreamreferencesprovidersmd).

###### Flag with another adapter

Adapters connect flags to third-party providers. Each adapter replaces `decide` and `origin`:

```ts
import { flag } from 'flags/next';
import { statsigAdapter } from '@flags-sdk/statsig';

export const myGate = flag({
  key: 'my_gate',
  adapter: statsigAdapter.featureGate((gate) => gate.value),
  identify,
});
```

See [references/providers.md](flags-sdk.md#file-upstreamreferencesprovidersmd) for all supported adapters.

###### Key parameters

| Parameter      | Type                               | Description                                          |
| -------------- | ---------------------------------- | ---------------------------------------------------- |
| `key`          | `string`                           | Unique flag identifier                               |
| `decide`       | `function`                         | Resolves the flag value                              |
| `defaultValue` | `any`                              | Fallback if `decide` returns undefined or throws     |
| `description`  | `string`                           | Shown in Flags Explorer                              |
| `origin`       | `string`                           | URL to manage the flag in provider dashboard         |
| `options`      | `{ label?: string, value: any }[]` | Possible values, used for precompute + Flags Explorer|
| `adapter`      | `Adapter`                          | Provider adapter implementing `decide` and `origin`  |
| `identify`     | `function`                         | Returns evaluation context (entities) for `decide`   |

##### Dedupe

Wrap shared functions (especially `identify`) in `dedupe` to run them once per request:

```ts
import { dedupe } from 'flags/next';

const identify = dedupe(({ cookies }) => {
  return { user: { id: cookies.get('uid')?.value } };
});
```

Note: `dedupe` is not available in Pages Router.

##### Bulk evaluation

To evaluate **multiple** flags at once, call `evaluate()` (from `flags/next`) instead of awaiting flags one at a time or using `Promise.all()`. To evaluate a **single** flag, just call it: `await myFlag()`.

```ts
import { evaluate } from 'flags/next';
import { flagA, flagB } from '../flags';

// avoid: each await blocks the next, so the flags resolve sequentially
const a = await flagA();
const b = await flagB();

// avoid: parallel, but each flag is evaluated in isolation
const [a, b] = await Promise.all([flagA(), flagB()]);

// prefer: shares work across the batch
const [a, b] = await evaluate([flagA, flagB]);
```

`evaluate()` is faster than both approaches. Awaiting flags one at a time makes total latency the sum of every flag's evaluation instead of the slowest single flag, while `Promise.all()` runs them in parallel but evaluates each in isolation. `evaluate()` pre-reads headers, cookies, and overrides once for the whole batch and lets adapters resolve a group in a single call, which reduces the number of parallel promises the runtime manages and leaves less room for the async work to be interrupted by other microtasks.

It accepts either an **array** (positional results) or an **object** (keyed results):

```ts
const [a, b] = await evaluate([flagA, flagB]);
const { a, b } = await evaluate({ a: flagA, b: flagB });
```

Outside App Router (Pages Router `getServerSideProps`/API routes, or routing middleware), pass the request as the second argument: `await evaluate([flagA, flagB], request)`.

`evaluate()` always evaluates flags at request time. It is not for reading [precomputed](#precompute-pattern) (static) values — for those, use `getPrecomputed` (or call the flag with the code, `await myFlag(code, flagGroup)`).

Adapters can opt into batching by implementing the optional `bulkDecide` hook. The Vercel adapter (`@flags-sdk/vercel`) implements it — roughly a 10x reduction in evaluation time when resolving hundreds of flags. See [references/providers.md — Custom Adapters](flags-sdk.md#file-upstreamreferencesprovidersmd) for implementing `bulkDecide`, and [references/api.md — `evaluate`](flags-sdk.md#file-upstreamreferencesapimd) for the full signature.

##### Flags Explorer setup

###### Next.js (App Router)

```ts
// app/.well-known/vercel/flags/route.ts
import { createFlagsDiscoveryEndpoint } from 'flags/next';
import { getProviderData } from '@flags-sdk/vercel';
import * as flags from '../../../../flags'; // adjust if flags live under lib/ or src/

export const GET = createFlagsDiscoveryEndpoint(async () => {
  return getProviderData(flags);
});
```

###### With external provider data

When using a third-party provider alongside Vercel Flags, combine their data with `mergeProviderData`. Each provider adapter exports its own `getProviderData` — see the provider-specific examples in [references/providers.md](flags-sdk.md#file-upstreamreferencesprovidersmd).

###### SvelteKit

```ts
// src/hooks.server.ts
import { createHandle } from 'flags/sveltekit';
import { FLAGS_SECRET } from '$env/static/private';
import * as flags from '$lib/flags';

export const handle = createHandle({ secret: FLAGS_SECRET, flags });
```

##### FLAGS_SECRET

Required for precompute and Flags Explorer. Vercel Flags activation creates a value per environment. Preserve existing values; do not rotate them during ordinary SDK setup. A missing local value does not mean the remote value is missing: check the target environment first, then follow [Pull environment variables](#pull-environment-variables) for Development.

Only generate a secret for an environment where it is absent. Use 32 cryptographically random bytes, base64-encoded, with a distinct value per environment. Mark Preview and Production values Sensitive. Send generated values directly to storage, such as stdin for `vercel env add`; do not print them to terminal output, logs, or chat, or embed them in command arguments.

##### Precompute pattern

Use precompute to keep pages static while using feature flags. Middleware evaluates flags and encodes results into the URL via rewrite. The page reads precomputed values instead of re-evaluating.

High-level flow:
1. Declare flags and group them in an array
2. Call `precompute(flagGroup)` in middleware, get a `code` string
3. Rewrite request to `/${code}/original-path`
4. Page reads flag values from `code`: `await myFlag(code, flagGroup)`

For full implementation details, see framework-specific references:
- **Next.js**: See [references/nextjs.md](flags-sdk.md#file-upstreamreferencesnextjsmd) — covers proxy middleware, precompute setup, ISR, generatePermutations, multiple groups
- **SvelteKit**: See [references/sveltekit.md](flags-sdk.md#file-upstreamreferencessveltekitmd) — covers reroute hook, middleware, precompute setup, ISR, prerendering

##### Custom adapters

Create an adapter factory that returns an object with `origin` and `decide`. For the full pattern (including default adapter and singleton client examples), see [references/providers.md](flags-sdk.md#file-upstreamreferencesprovidersmd).

##### Encryption functions

For keeping flag data confidential in the browser (used by Flags Explorer):

| Function                   | Purpose                             |
| -------------------------- | ----------------------------------- |
| `encryptFlagValues`        | Encrypt resolved flag values        |
| `decryptFlagValues`        | Decrypt flag values                 |
| `encryptFlagDefinitions`   | Encrypt flag definitions/metadata   |
| `decryptFlagDefinitions`   | Decrypt flag definitions            |
| `encryptOverrides`         | Encrypt toolbar overrides           |
| `decryptOverrides`         | Decrypt toolbar overrides           |

All use `FLAGS_SECRET` by default. Example:

```tsx
import { encryptFlagValues } from 'flags';
import { FlagValues } from 'flags/react';

async function ConfidentialFlags({ values }) {
  const encrypted = await encryptFlagValues(values);
  return <FlagValues values={encrypted} />;
}
```

##### React components

```tsx
import { FlagValues, FlagDefinitions } from 'flags/react';

// Renders script tag with flag values for Flags Explorer
<FlagValues values={{ myFlag: true }} />

// Renders script tag with flag definitions for Flags Explorer
<FlagDefinitions definitions={{ myFlag: { options: [...], description: '...' } }} />
```

##### References

Detailed framework and provider guides are in separate files to keep context lean:

- **[references/nextjs.md](flags-sdk.md#file-upstreamreferencesnextjsmd)**: Next.js quickstart, toolbar, App Router, Pages Router, middleware/proxy, precompute, dedupe, dashboard pages, marketing pages, suspense fallbacks
- **[references/sveltekit.md](flags-sdk.md#file-upstreamreferencessveltekitmd)**: SvelteKit quickstart, toolbar, hooks setup, precompute with reroute + middleware, dashboard pages, marketing pages
- **[references/providers.md](flags-sdk.md#file-upstreamreferencesprovidersmd)**: All provider adapters — Vercel, Global Config, Statsig, LaunchDarkly, PostHog, GrowthBook, Flagsmith, Reflag, Split, Optimizely, OpenFeature, and custom adapters
- **[references/api.md](flags-sdk.md#file-upstreamreferencesapimd)**: Full API reference for `flags`, `flags/react`, `flags/next`, and `flags/sveltekit`

### File: `upstream/references/api.md`

#### API Reference

##### Table of Contents

- [flags (core)](#flags-core)
- [flags/react](#flagsreact)
- [flags/next](#flagsnext)
- [flags/sveltekit](#flagssveltekit)

---

##### flags (core)

###### `verifyAccess`

Verify access to the flags discovery endpoint. Returns `Promise<boolean>`.

| Parameter       | Type     | Description              |
| --------------- | -------- | ------------------------ |
| `authorization` | `string` | Authorization token      |

```ts
import { verifyAccess } from 'flags';

const access = await verifyAccess(request.headers.get('Authorization'));
if (!access) return NextResponse.json(null, { status: 401 });
```

###### `mergeProviderData`

Merge provider data from multiple sources for the Flags Explorer.

| Parameter | Type                                        | Description           |
| --------- | ------------------------------------------- | --------------------- |
| `data`    | `(ProviderData \| Promise<ProviderData>)[]` | Provider data to merge|

```ts
import { mergeProviderData } from 'flags';

return mergeProviderData([
  getProviderData(flags),
  getStatsigProviderData({ /* ... */ }),
]);
```

###### `reportValue`

Report flag value to Vercel for Runtime Logs and Web Analytics.

| Parameter | Type     | Description     |
| --------- | -------- | --------------- |
| `key`     | `string` | Flag key        |
| `value`   | `any`    | Resolved value  |

```ts
import { reportValue } from 'flags';
reportValue('summer-sale', true);
```

###### Encryption Functions

All default to `process.env.FLAGS_SECRET`.

| Function                 | Input Type           | Purpose                    |
| ------------------------ | -------------------- | -------------------------- |
| `encryptFlagValues`      | `FlagValuesType`     | Encrypt resolved values    |
| `decryptFlagValues`      | `string`             | Decrypt values             |
| `encryptFlagDefinitions` | `FlagDefinitionsType`| Encrypt definitions        |
| `decryptFlagDefinitions` | `string`             | Decrypt definitions        |
| `encryptOverrides`       | `FlagOverridesType`  | Encrypt toolbar overrides  |
| `decryptOverrides`       | `string`             | Decrypt overrides          |

Optional `secret` and `expirationTime` (default `'1y'`) params on encrypt functions.

###### `verifyAccessProof`

Verify an access proof token. Returns `Promise<boolean>`.

###### `safeJsonStringify`

XSS-safe `JSON.stringify`. Escapes `<` and other dangerous chars.

```ts
import { safeJsonStringify } from 'flags';
safeJsonStringify({ markup: '<html></html>' });
// '{"markup":"\\u003chtml>\\u003c/html>"}'
```

---

##### flags/react

###### `FlagValues`

Renders a `<script data-flag-values>` tag for the Flags Explorer.

| Prop     | Type             | Description  |
| -------- | ---------------- | ------------ |
| `values` | `FlagValuesType` | Flag values  |

```tsx
import { FlagValues } from 'flags/react';
<FlagValues values={{ myFlag: true }} />
```

For confidential flags, encrypt first:

```tsx
import { encryptFlagValues } from 'flags';
import { FlagValues } from 'flags/react';

async function ConfidentialFlags({ values }) {
  const encrypted = await encryptFlagValues(values);
  return <FlagValues values={encrypted} />;
}
```

###### `FlagDefinitions`

Renders a `<script data-flag-definitions>` tag with flag metadata.

| Prop          | Type                  | Description       |
| ------------- | --------------------- | ----------------- |
| `definitions` | `FlagDefinitionsType` | Flag definitions  |

```tsx
import { FlagDefinitions } from 'flags/react';

<FlagDefinitions definitions={{
  myFlag: {
    options: [{ value: false }, { value: true }],
    origin: 'https://example.com/flag/myFlag',
    description: 'Example flag',
  },
}} />
```

---

##### flags/next

###### `flag`

Declare a feature flag for Next.js.

| Parameter      | Type                               | Description                        |
| -------------- | ---------------------------------- | ---------------------------------- |
| `key`          | `string`                           | Flag identifier                    |
| `decide`       | `function`                         | Resolves the flag value            |
| `defaultValue` | `any`                              | Fallback value                     |
| `description`  | `string`                           | Shown in Flags Explorer            |
| `origin`       | `string`                           | URL to manage flag                 |
| `options`      | `{ label?: string, value: any }[]` | Possible values                    |
| `adapter`      | `Adapter`                          | Provider adapter                   |
| `identify`     | `function`                         | Returns evaluation context         |

###### `createFlagsDiscoveryEndpoint`

Creates an App Router route handler for `/.well-known/vercel/flags`. Auto-verifies access and adds version header.

| Parameter        | Type       | Description                    |
| ---------------- | ---------- | ------------------------------ |
| `getApiData`     | `Function` | Returns flag metadata          |
| `options.secret` | `string`   | Defaults to `FLAGS_SECRET`     |

###### `getProviderData`

Turn `flag()` declarations into Flags Explorer-compatible definitions.

| Parameter | Type                   | Description     |
| --------- | ---------------------- | --------------- |
| `flags`   | `Record<string, Flag>` | Your flags      |

###### `precompute`

Evaluate multiple flags, return encoded string.

| Parameter | Type         | Description |
| --------- | ------------ | ----------- |
| `flags`   | `function[]` | Flag group  |

###### `evaluate`

Evaluate multiple flags in a single call. Prefer this over `Promise.all([flagA(), flagB()])` — it pre-reads headers, cookies, and overrides once for the whole batch and lets adapters resolve a group through one `bulkDecide` call, reducing parallel promises and microtask overhead.

| Parameter           | Type                                | Description                                                          |
| ------------------- | ----------------------------------- | ------------------------------------------------------------------- |
| `flags`             | `Flag[] \| Record<string, Flag>`    | Array (positional results) or object (keyed results) of flags       |
| `request` (Optional)| `IncomingMessage \| Request`        | Required outside App Router (Pages Router or routing middleware)     |

```ts
import { evaluate } from 'flags/next';

const [a, b] = await evaluate([flagA, flagB]); // positional
const { a, b } = await evaluate({ a: flagA, b: flagB }); // keyed
```

###### `serialize`

Turn evaluated flags into serialized representation.

| Parameter | Type         | Description      |
| --------- | ------------ | ---------------- |
| `flags`   | `function[]` | Flags            |
| `values`  | `unknown[]`  | Resolved values  |
| `secret`  | `string`     | Signing secret   |

###### `getPrecomputed`

Retrieve flag values from precomputation code.

| Parameter         | Type                     | Description              |
| ----------------- | ------------------------ | ------------------------ |
| `flag`            | `function \| function[]` | Flag(s) to extract       |
| `precomputeFlags` | `function[]`             | Group used in precompute |
| `code`            | `string`                 | Precomputation code      |

###### `deserialize`

Retrieve all flag values as a record from code.

###### `generatePermutations`

Generate all possible precomputation codes for flag options.

| Parameter | Type         | Description                          |
| --------- | ------------ | ------------------------------------ |
| `flags`   | `function[]` | Flags with options declared          |
| `filter`  | `function`   | Optional filter for permutations     |
| `secret`  | `string`     | Defaults to `FLAGS_SECRET`           |

###### `dedupe`

Deduplicate function calls per request.

| Parameter | Type       | Description            |
| --------- | ---------- | ---------------------- |
| `fn`      | `function` | Function to dedupe     |

Not available in Pages Router.

---

##### flags/sveltekit

###### `flag`

Declare a feature flag for SvelteKit.

| Parameter     | Type                               | Description                   |
| ------------- | ---------------------------------- | ----------------------------- |
| `key`         | `string`                           | Flag identifier               |
| `decide`      | `function`                         | Resolves value                |
| `description` | `string`                           | Shown in Flags Explorer       |
| `origin`      | `string`                           | URL to manage flag            |
| `options`     | `{ label?: string, value: any }[]` | Possible values               |
| `identify`    | `function`                         | Returns evaluation context    |

###### `createHandle`

Server hook that establishes context for flags and handles `/.well-known/vercel/flags`.

| Parameter       | Type                                               | Description          |
| --------------- | -------------------------------------------------- | -------------------- |
| `options.secret`| `string`                                           | `FLAGS_SECRET`       |
| `options.flags` | `Record<string, Flag>`                             | Your flags           |

Must come first when composed with `sequence`.

###### `getProviderData`

Turn flag declarations into Flags Explorer-compatible definitions.

###### `precompute`

Evaluate multiple flags, return encoded string.

| Parameter | Type         | Description   |
| --------- | ------------ | ------------- |
| `flags`   | `function[]` | Flag group    |
| `request` | `Request`    | Current request |

###### `generatePermutations`

Generate all precomputation codes for prerendering.

| Parameter | Type         | Description                      |
| --------- | ------------ | -------------------------------- |
| `flags`   | `function[]` | Flags with options               |
| `filter`  | `function`   | Optional filter                  |
| `secret`  | `string`     | Defaults to `FLAGS_SECRET`       |

### File: `upstream/references/nextjs.md`

#### Next.js Integration

##### Table of Contents

- [Quickstart](#quickstart)
- [Toolbar Setup](#toolbar-setup)
- [App Router](#app-router)
- [Pages Router](#pages-router)
- [Evaluation Context](#evaluation-context)
- [Dedupe](#dedupe)
- [Precompute](#precompute)
- [Dashboard Pages](#dashboard-pages)
- [Marketing Pages](#marketing-pages)
- [Proxy (Middleware)](#proxy-middleware)
- [Suspense Fallbacks](#suspense-fallbacks)

##### Quickstart

```sh
pnpm i flags
```

Declare a flag in `flags.ts`:

```ts
import { flag } from 'flags/next';

export const exampleFlag = flag({
  key: 'example-flag',
  decide() {
    return Math.random() > 0.5;
  },
});
```

##### Toolbar Setup

1. Install `@vercel/toolbar`:

```sh
pnpm i @vercel/toolbar
```

2. Add Next.js plugin:

```ts
// next.config.ts
import type { NextConfig } from 'next';
import createWithVercelToolbar from '@vercel/toolbar/plugins/next';

const nextConfig: NextConfig = {};

const withVercelToolbar = createWithVercelToolbar();
export default withVercelToolbar(nextConfig);
```

3. Render toolbar in root layout:

```tsx
// app/layout.tsx
import { VercelToolbar } from '@vercel/toolbar/next';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // On Vercel, the toolbar is auto-injected in preview deployments.
  // This manual injection is only needed for local development.
  const shouldInjectToolbar = process.env.NODE_ENV === 'development';
  return (
    <html lang="en">
      <body>
        {children}
        {shouldInjectToolbar && <VercelToolbar />}
      </body>
    </html>
  );
}
```

##### App Router

Call the flag function from any async server component or proxy:

```tsx
// app/page.tsx
import { exampleFlag } from '../flags';

export default async function Page() {
  const example = await exampleFlag();
  return <div>{example ? 'Flag is on' : 'Flag is off'}</div>;
}
```

##### Pages Router

Pass `req` to the flag in `getServerSideProps`:

```tsx
// pages/index.tsx
import type { InferGetServerSidePropsType, GetServerSideProps } from 'next';
import { exampleFlag } from '../flags';

export const getServerSideProps = (async ({ req }) => {
  const example = await exampleFlag(req);
  return { props: { example } };
}) satisfies GetServerSideProps<{ example: boolean }>;

export default function Page({
  example,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  return <div>{example ? 'Flag is on' : 'Flag is off'}</div>;
}
```

##### Evaluation Context

Use `identify` to establish who the request is for. The returned entities are passed to `decide`:

```ts
import { flag, dedupe } from 'flags/next';
import type { ReadonlyRequestCookies } from 'flags';

interface Entities {
  user?: { id: string };
}

const identify = dedupe(
  ({ cookies }: { cookies: ReadonlyRequestCookies }): Entities => {
    const userId = cookies.get('user-id')?.value;
    return { user: userId ? { id: userId } : undefined };
  },
);

export const myFlag = flag<boolean, Entities>({
  key: 'my-flag',
  identify,
  decide({ entities }) {
    return entities?.user?.id === 'user1';
  },
});
```

`identify` receives normalized `headers` and `cookies` that work across App Router, Pages Router, and Proxy.

###### Custom evaluation context

Override identify at call site (use sparingly):

```ts
await exampleFlag.run({ identify: { user: { id: 'user1' } } });
await exampleFlag.run({ identify: () => ({ user: { id: 'user1' } }) });
```

##### Dedupe

Wrap functions in `dedupe` to run them once per request within the same runtime:

```ts
import { dedupe } from 'flags/next';

const identify = dedupe(({ cookies }) => {
  return { user: { id: cookies.get('uid')?.value } };
});
```

Use cases:
- Prevent duplicate `identify` calls across multiple flags
- Generate consistent random IDs for anonymous visitor experiments

Not available in Pages Router.

##### Precompute

Keep pages static while using feature flags. Proxy evaluates flags and encodes results into the URL.

###### Prerequisites

Ensure `FLAGS_SECRET` is configured using [FLAGS_SECRET](../SKILL.md#flags_secret). Reuse existing values; generate one only for an environment where it is absent.

###### Step 1: Create flag group

```ts
// flags.ts
import { flag } from 'flags/next';

export const showSummerSale = flag({
  key: 'summer-sale',
  decide: () => false,
});

export const showBanner = flag({
  key: 'banner',
  decide: () => false,
});

export const marketingFlags = [showSummerSale, showBanner] as const;
```

###### Step 2: Precompute in proxy

```ts
// proxy.ts
import { type NextRequest, NextResponse } from 'next/server';
import { precompute } from 'flags/next';
import { marketingFlags } from './flags';

export const config = { matcher: ['/'] };

export async function proxy(request: NextRequest) {
  const code = await precompute(marketingFlags);
  const nextUrl = new URL(
    `/${code}${request.nextUrl.pathname}${request.nextUrl.search}`,
    request.url,
  );
  return NextResponse.rewrite(nextUrl, { request });
}
```

###### Step 3: Read precomputed values in page

```tsx
// app/[code]/page.tsx
import { marketingFlags, showSummerSale, showBanner } from '../../flags';

type Params = Promise<{ code: string }>;

export default async function Page({ params }: { params: Params }) {
  const { code } = await params;
  const summerSale = await showSummerSale(code, marketingFlags);
  const banner = await showBanner(code, marketingFlags);

  return (
    <div>
      {banner && <p>welcome</p>}
      {summerSale ? <p>summer sale live</p> : <p>summer sale soon</p>}
    </div>
  );
}
```

###### Step 4: Enable ISR & build time prerendering

```tsx
// app/[code]/layout.tsx
import { generatePermutations } from 'flags/next';

export async function generateStaticParams() {
  const codes = await generatePermutations(marketingFlags);
  return codes.map((code) => ({ code }));
}

export default async function Layout({ children }) {
  return children;
}
```

###### Declaring options

Options enable efficient URL encoding and Flags Explorer display:

```ts
export const greetingFlag = flag<string>({
  key: 'greeting',
  options: ['Hello world', 'Hi', 'Hola'],
  decide: () => 'Hello world',
});
```

Or with labels:

```ts
export const greetingFlag = flag<string>({
  key: 'greeting',
  options: [
    { label: 'Hello world', value: 'Hello world' },
    { label: 'Hi', value: 'Hi' },
  ],
  decide: () => 'Hello world',
});
```

###### Multiple groups

Avoid unnecessary permutations by creating separate flag groups per page:

```ts
export const rootFlags = [navigationFlag, bannerFlag];
export const pricingFlags = [discountFlag];
```

File tree:

```
app/[rootCode]/
  page.tsx
  pricing/[pricingCode]/
    page.tsx
```

###### Pages Router precompute

```tsx
// pages/[code]/index.tsx
import { generatePermutations } from 'flags/next';

export const getStaticPaths = (async () => {
  const codes = await generatePermutations(marketingFlags);
  return {
    paths: codes.map((code) => ({ params: { code } })),
    fallback: 'blocking',
  };
}) satisfies GetStaticPaths;

export const getStaticProps = (async (context) => {
  if (typeof context.params?.code !== 'string') return { notFound: true };
  const example = await exampleFlag(context.params.code, marketingFlags);
  return { props: { example } };
}) satisfies GetStaticProps<{ example: boolean }>;
```

##### Dashboard Pages

For authenticated dashboard pages, use `identify` to read user context from cookies/JWTs:

```ts
import type { ReadonlyRequestCookies } from 'flags';
import { flag, dedupe } from 'flags/next';

interface Entities {
  user?: { id: string };
}

const identify = dedupe(
  ({ cookies }: { cookies: ReadonlyRequestCookies }): Entities => {
    const userId = cookies.get('dashboard-user-id')?.value;
    return { user: userId ? { id: userId } : undefined };
  },
);

export const dashboardFlag = flag<boolean, Entities>({
  key: 'dashboard-flag',
  identify,
  decide({ entities }) {
    if (!entities?.user) return false;
    const allowedUsers = ['user1'];
    return allowedUsers.includes(entities.user.id);
  },
});
```

Usage in a page:

```tsx
export default async function DashboardPage() {
  const dashboard = await dashboardFlag();
  return <div>{dashboard ? 'New Dashboard' : 'Old Dashboard'}</div>;
}
```

##### Marketing Pages

For static marketing pages with A/B tests, combine precompute with visitor ID generation:

###### Visitor ID in proxy

```ts
// proxy.ts
import { precompute } from 'flags/next';
import { type NextRequest, NextResponse } from 'next/server';
import { marketingFlags } from './flags';
import { getOrGenerateVisitorId } from './get-or-generate-visitor-id';

export async function marketingProxy(request: NextRequest) {
  const visitorId = await getOrGenerateVisitorId(
    request.cookies,
    request.headers,
  );

  const code = await precompute(marketingFlags);

  return NextResponse.rewrite(
    new URL(`/examples/marketing-pages/${code}`, request.url),
    {
      headers: {
        'Set-Cookie': `marketing-visitor-id=${visitorId}; Path=/`,
        'x-marketing-visitor-id': visitorId,
      },
    },
  );
}
```

###### Deduplicated visitor ID generation

```ts
import { nanoid } from 'nanoid';
import { dedupe } from 'flags/next';
import type { ReadonlyHeaders, ReadonlyRequestCookies } from 'flags';

const generateId = dedupe(async () => nanoid());

export const getOrGenerateVisitorId = async (
  cookies: ReadonlyRequestCookies,
  headers: ReadonlyHeaders,
) => {
  const cookieVisitorId = cookies.get('marketing-visitor-id')?.value;
  if (cookieVisitorId) return cookieVisitorId;

  const headerVisitorId = headers.get('x-marketing-visitor-id');
  if (headerVisitorId) return headerVisitorId;

  return generateId();
};
```

###### Flag using visitor ID

```ts
const identify = dedupe(
  async ({ cookies, headers }: {
    cookies: ReadonlyRequestCookies;
    headers: ReadonlyHeaders;
  }): Promise<Entities> => {
    const visitorId = await getOrGenerateVisitorId(cookies, headers);
    return { visitor: visitorId ? { id: visitorId } : undefined };
  },
);

export const marketingAbTest = flag<boolean, Entities>({
  key: 'marketing-ab-test-flag',
  identify,
  decide({ entities }) {
    if (!entities?.visitor) return false;
    return /^[a-n0-5]/i.test(entities.visitor.id);
  },
});
```

##### Proxy (Middleware)

Use flags in proxy to rewrite requests to static page variants:

```ts
// proxy.ts
import { type NextRequest, NextResponse } from 'next/server';
import { myFlag } from './flags';

export const config = { matcher: ['/example'] };

export async function proxy(request: NextRequest) {
  const active = await myFlag();
  const variant = active ? 'variant-on' : 'variant-off';
  return NextResponse.rewrite(new URL(`/example/${variant}`, request.url));
}
```

For multiple flags on one page, use the precompute pattern instead.

##### Suspense Fallbacks

Combine precomputed flags with Partial Prerendering to serve matching skeletons:

```tsx
async function Example() {
  const hasAuth = await hasAuthCookieFlag();

  return (
    <Suspense fallback={hasAuth ? <AuthedSkeleton /> : <UnauthedSkeleton />}>
      <Dashboard />
    </Suspense>
  );
}
```

The `hasAuthCookieFlag` checks cookie existence without authenticating. Two shells get prerendered — one for each auth state — served statically with no layout shift.

##### Flags Explorer (Next.js)

The Flags Explorer is part of the Vercel Toolbar. Before adding the discovery endpoint below, make sure the toolbar is set up by following the [Toolbar Setup](#toolbar-setup) steps first.

###### App Router

```ts
// app/.well-known/vercel/flags/route.ts
import { getProviderData, createFlagsDiscoveryEndpoint } from 'flags/next';
import * as flags from '../../../../flags';

export const GET = createFlagsDiscoveryEndpoint(async () => {
  return getProviderData(flags);
});
```

###### Pages Router

Requires a rewrite in `next.config.js`:

```js
module.exports = {
  async rewrites() {
    return [
      {
        source: '/.well-known/vercel/flags',
        destination: '/api/vercel/flags',
      },
    ];
  },
};
```

```ts
// pages/api/vercel/flags.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyAccess } from 'flags';

export async function handler(req: NextApiRequest, res: NextApiResponse) {
  const access = await verifyAccess(req.headers.authorization);
  if (!access) return res.status(401).json(null);

  const providerData = { /* ... */ };
  return res.status(200).json(providerData);
}
```

### File: `upstream/references/providers.md`

#### Provider Adapters

##### Table of Contents

- [Vercel](#vercel)
- [Global Config](#global-config)
- [Statsig](#statsig)
- [LaunchDarkly](#launchdarkly)
- [PostHog](#posthog)
- [GrowthBook](#growthbook)
- [Flagsmith](#flagsmith)
- [Reflag](#reflag)
- [OpenFeature](#openfeature)
- [Split](#split)
- [Optimizely](#optimizely)
- [Custom Adapters](#custom-adapters)

---

##### Vercel

Package: `@flags-sdk/vercel`

```bash
pnpm i flags @flags-sdk/vercel
```

###### Setup

> **Prerequisite**: The Vercel CLI must be installed and authenticated. If it is not installed, run `pnpm i -g vercel`. For authentication or linking issues, follow the `vercel-cli` skill if it's already available. If it isn't, suggest the user install it with `npx skills add vercel/vercel@vercel-cli` (don't auto-install it) and rely on `vercel <command> --help` in the meantime.

The following steps integrate a flag into an app and need a linked project for `vercel env pull` ([Set up the SDK](../SKILL.md#set-up-the-sdk), step 2). To only inspect or change remote flags, use the `vercel-flags` skill instead.

1. Create a flag in the Vercel dashboard or via CLI: `vercel flags create <flag-key> --kind boolean --description "<description>"`
2. Pull env vars: run `vercel env pull` to write the Vercel OIDC token and the Development `FLAGS_SECRET` to `.env.local` ([Pull environment variables](../SKILL.md#pull-environment-variables)).
3. Declare the flag:

```ts
import { flag } from 'flags/next';
import { vercelAdapter } from '@flags-sdk/vercel';

export const exampleFlag = flag({
  key: 'example-flag',
  adapter: vercelAdapter,
});
```

###### User targeting

```ts
import { dedupe, flag } from 'flags/next';
import { vercelAdapter } from '@flags-sdk/vercel';

type Entities = {
  team?: { id: string };
  user?: { id: string };
};

const identify = dedupe(async (): Promise<Entities> => ({
  team: { id: 'team-123' },
  user: { id: 'user-456' },
}));

export const exampleFlag = flag<boolean, Entities>({
  key: 'example-flag',
  identify,
  adapter: vercelAdapter,
});
```

Define the entities and attributes under Flags → Entities in the dashboard before you use them in rules or segments, and return the same names from `identify` ([Entities](https://vercel.com/docs/flags/vercel-flags/dashboard/entities)). The example above allows `--by user.id` / `--by team.id` in `vercel flags split`, `rollout`, and `rules add`, and the matching conditions in dashboard rules. Entities are evaluated fresh on every call; a rule whose attribute is missing from the context is skipped.

###### Attribute types

Each attribute has a type: String, Number, Boolean, String Array, or Timestamp. The value `identify` returns must match it.

- **Timestamp** is a Unix epoch in **milliseconds** as a `number` (`Date.now()`, `user.createdAt.getTime()`, `1719792000000`). Do not pass a `Date`, an ISO string, or seconds.
- Timestamp rules only compare: is after / is before / is at or after / is at or before (`gt` / `lt` / `gte` / `lte`). Equality, one-of, and exists operators are not available for Timestamp attributes.
- Timestamp attributes cannot bucket a split or rollout (`--by`); use them in rule conditions only.
- To release at a certain time, pass the current time as `system.time` and compare against it in a rule. Keep `Date.now()` inside `dedupe` so every flag in the request sees the same time:

```ts
const identify = dedupe(async () => ({
  system: { time: Date.now() },
  user: { id: 'user-456', signupAt: 1719792000000 },
}));
```

###### Flags Explorer

```ts
import { createFlagsDiscoveryEndpoint } from 'flags/next';
import { getProviderData } from '@flags-sdk/vercel';
import * as flags from '../../../../flags';

export const GET = createFlagsDiscoveryEndpoint(async () => {
  return await getProviderData(flags);
});
```

###### Project Connections

Check the installed `@flags-sdk/vercel` version before changing the code. Project Connections require version 1.6.0 or later; upgrade it if needed. The adapter includes the required core library version.

To read flags from another project in the same team, first grant the consumer project access from the source project's **Flags → Connections** page. Then pass the source project's ID:

```ts
import { flag } from 'flags/next';
import { createVercelAdapter } from '@flags-sdk/vercel';

const sharedAdapter = createVercelAdapter({ projectId: 'prj_source' });

export const sharedFeature = flag({
  key: 'shared-feature',
  adapter: sharedAdapter,
  defaultValue: false,
});
```

Use `vercelAdapter` alongside this adapter for the consumer's own flags. Both use the consumer's OIDC token; do not mint an SDK key for a connection. Run `vercel env pull` in the consumer project for local development. Connections apply across environments, and the token selects the source environment; custom environments use preview.

For direct core access, use `@vercel/flags-core` version 1.11.0 or later with `createClient({ projectId: 'prj_source' })`. The `projectId` option cannot be combined with an SDK key. CLI management requires Vercel CLI version 63.0.0 or later; use the `vercel-flags` skill for the connection workflow, or see the [CLI reference](https://vercel.com/docs/cli/flags#project-connections). See [Project Connections](https://vercel.com/docs/flags/vercel-flags/project-connections) for permissions and setup.

###### Custom configuration

```ts
import { createVercelAdapter } from '@flags-sdk/vercel';

const customAdapter = createVercelAdapter(process.env.CUSTOM_FLAGS_KEY!);

export const exampleFlag = flag({
  key: 'example-flag',
  adapter: customAdapter,
});
```

###### Using your own client (e.g. for singleton)

If the app also uses `@vercel/flags-core` directly, create the client once and pass it to the adapter so both share the same instance:

```ts
import { createClient } from '@vercel/flags-core';
import { createVercelAdapter } from '@flags-sdk/vercel';

const vercelFlagsClient = createClient(); // Vercel OIDC token, on deployments and after `vercel env pull`
const vercelAdapter = createVercelAdapter(vercelFlagsClient);

export const exampleFlag = flag({
  key: 'example-flag',
  adapter: vercelAdapter,
});
```

Outside Vercel, pass the SDK key: `createClient(process.env.FLAGS)`. Unlike `vercelAdapter()`, `createClient()` does not read `FLAGS` on its own.

###### Core client in other frameworks (for example, Express)

Frameworks without a Flags SDK entrypoint use `@vercel/flags-core` directly instead of this SDK. The `vercel-flags` skill carries the example and the OIDC timing rules ([Core SDK](https://vercel.com/docs/flags/vercel-flags/sdks/core)).

###### Managing flags

What a flag serves (enable, set, split, rollout, rules, segments, archive) is configured in the Vercel dashboard or with the `vercel flags` CLI, not in code. Keep the declaration in sync with the remote definition: the CLI key is the `key` in `flag()`, the kind matches the type parameter, `options` mirror the variants, and `defaultValue` is what the flag serves when it is archived or still a draft. The `vercel-flags` skill covers rollouts, experiments, promotion order, and the checks to run before archiving; `vercel flags <cmd> --help` lists the options.

CLI reference: https://vercel.com/docs/cli/flags

---

##### Global Config

Package: `@flags-sdk/global-config`

```bash
pnpm i @flags-sdk/global-config
```

Env: `GLOBAL_CONFIG="global-config-connection-string"`

###### Usage

```ts
import { flag } from 'flags/next';
import { globalConfigAdapter } from '@flags-sdk/global-config';

export const exampleFlag = flag({
  adapter: globalConfigAdapter,
  key: 'example-flag',
});
```

Global Config should contain:

```json
{
  "flags": {
    "example-flag": true,
    "another-flag": false
  }
}
```

###### Custom configuration

```ts
import { createGlobalConfigAdapter } from '@flags-sdk/global-config';

const myAdapter = createGlobalConfigAdapter({
  connectionString: process.env.OTHER_GLOBAL_CONFIG,
  options: {
    globalConfigItemKey: 'other-flags-key',
    teamSlug: 'my-team',
  },
});
```

---

##### Statsig

Package: `@flags-sdk/statsig`

```bash
pnpm i @flags-sdk/statsig
```

Env vars:
- `STATSIG_SERVER_API_KEY` (required)
- `STATSIG_PROJECT_ID` (optional)
- `EXPERIMENTATION_CONFIG` (optional, Global Config)
- `EXPERIMENTATION_CONFIG_ITEM_KEY` (optional)

###### Methods

```ts
import { statsigAdapter, type StatsigUser } from '@flags-sdk/statsig';

// Feature Gates
export const myGate = flag<boolean, StatsigUser>({
  key: 'my_feature_gate',
  adapter: statsigAdapter.featureGate((gate) => gate.value),
  identify,
});

// Dynamic Configs
export const myConfig = flag<Record<string, unknown>, StatsigUser>({
  key: 'my_dynamic_config',
  adapter: statsigAdapter.dynamicConfig((config) => config.value),
  identify,
});

// Experiments
export const myExperiment = flag<Record<string, unknown>, StatsigUser>({
  key: 'my_experiment',
  adapter: statsigAdapter.experiment((config) => config.value),
  identify,
});

// Autotune
export const myAutotune = flag<Record<string, unknown>, StatsigUser>({
  key: 'my_autotune',
  adapter: statsigAdapter.autotune((config) => config.value),
  identify,
});

// Layers
export const myLayer = flag<Record<string, unknown>, StatsigUser>({
  key: 'my_layer',
  adapter: statsigAdapter.layer((layer) => layer.value),
  identify,
});
```

###### Same key, different mappings

Use `.` to distinguish flags from the same config:

```ts
export const text = flag<string, StatsigUser>({
  key: 'my_config.text',
  adapter: statsigAdapter.dynamicConfig((c) => c.value.text as string),
  identify,
});

export const price = flag<number, StatsigUser>({
  key: 'my_config.price',
  adapter: statsigAdapter.dynamicConfig((c) => c.value.price as number),
  identify,
});
```

###### Exposure logging

Disabled by default (middleware prefetch would cause premature exposures). Enable explicitly:

```ts
adapter: statsigAdapter.featureGate((gate) => gate.value, {
  exposureLogging: true,
})
```

Log exposures from the client instead when possible.

###### Flags Explorer

```ts
import { getProviderData as getStatsigProviderData } from '@flags-sdk/statsig';
import { mergeProviderData } from 'flags';

export const GET = createFlagsDiscoveryEndpoint(async () => {
  return mergeProviderData([
    getProviderData(flags),
    getStatsigProviderData({
      consoleApiKey: process.env.STATSIG_CONSOLE_API_KEY,
      projectId: process.env.STATSIG_PROJECT_ID,
    }),
  ]);
});
```

---

##### LaunchDarkly

Package: `@flags-sdk/launchdarkly`

```bash
pnpm i @flags-sdk/launchdarkly
```

Env vars:
- `LAUNCHDARKLY_CLIENT_SIDE_ID` (required)
- `LAUNCHDARKLY_PROJECT_SLUG` (required)
- `GLOBAL_CONFIG` (required)

###### Usage

```ts
import { ldAdapter, type LDContext } from '@flags-sdk/launchdarkly';

const identify = dedupe((async ({ headers, cookies }) => {
  const user = await getUser(headers, cookies);
  return { key: user.userID };
}) satisfies Identify<LDContext>);

export const exampleFlag = flag<boolean, LDContext>({
  key: 'example-flag',
  identify,
  adapter: ldAdapter.variation(),
});
```

###### Flags Explorer

```ts
import { getProviderData as getLDProviderData } from '@flags-sdk/launchdarkly';

return mergeProviderData([
  getProviderData(flags),
  getLDProviderData({
    apiKey: process.env.LAUNCHDARKLY_API_KEY,
    projectKey: process.env.LAUNCHDARKLY_PROJECT_KEY,
    environment: process.env.LAUNCHDARKLY_ENVIRONMENT,
  }),
]);
```

---

##### PostHog

Package: `@flags-sdk/posthog`

```bash
pnpm i @flags-sdk/posthog
```

Env vars, always required:
- `POSTHOG_HOST` (e.g. `https://us.i.posthog.com` or `https://eu.i.posthog.com`)
- `POSTHOG_PROJECT_API_KEY` (`phc_...`)

Optional, opts into local evaluation (background polling) instead of remote:
- `POSTHOG_SECRET_KEY` (`phs_...`)

For the Flags Explorer (`getProviderData` only):
- `POSTHOG_PERSONAL_API_KEY` (`phx_...`)
- `POSTHOG_PROJECT_ID` (e.g. `521742`)

###### Methods

```ts
import { postHogAdapter } from '@flags-sdk/posthog';

// Value — boolean flag. Pass the adapter uninvoked or invoked, both work.
export const myFlag = flag<boolean>({
  key: 'my-flag',
  adapter: postHogAdapter,
  identify,
});

// Value — multivariate flag resolves to the variant string
export const myVariant = flag<string>({
  key: 'my-flag',
  adapter: postHogAdapter,
  identify,
});

// Payload
export const myPayload = flag({
  key: 'my-flag',
  adapter: postHogAdapter.payload,
  defaultValue: {},
  identify,
});
```

`identify` must return `{ distinctId }`.

###### Flags Explorer

Requires: `POSTHOG_PERSONAL_API_KEY`, `POSTHOG_PROJECT_ID`

```ts
import { getProviderData as getPostHogProviderData } from '@flags-sdk/posthog';

export const GET = createFlagsDiscoveryEndpoint(() =>
  getPostHogProviderData({
    personalApiKey: process.env.POSTHOG_PERSONAL_API_KEY!,
    projectId: process.env.POSTHOG_PROJECT_ID!,
  }),
);
```

---

##### GrowthBook

Package: `@flags-sdk/growthbook`

```bash
pnpm i @flags-sdk/growthbook
```

Env: `GROWTHBOOK_CLIENT_KEY` (required)

###### Usage

```ts
import { growthbookAdapter, type Attributes } from '@flags-sdk/growthbook';

const identify = dedupe((async ({ cookies }) => ({
  id: cookies.get('user_id')?.value,
})) satisfies Identify<Attributes>);

export const myFlag = flag({
  key: 'my_feature',
  identify,
  adapter: growthbookAdapter.feature<boolean>(),
});
```

###### Global Config

Set `GROWTHBOOK_EDGE_CONNECTION_STRING` or `EXPERIMENTATION_CONFIG` (Vercel Marketplace).

###### Tracking

```ts
growthbookAdapter.setTrackingCallback((experiment, result) => {
  after(async () => {
    console.log('Experiment', experiment.key, 'Variation', result.key);
  });
});
```

---

##### Flagsmith

Package: `@flags-sdk/flagsmith`

```bash
pnpm i @flags-sdk/flagsmith
```

Env: `FLAGSMITH_ENVIRONMENT_KEY` (required)

Remote evaluation is the default for serverless deployments. For a long-running server, use `createFlagsmithAdapter({ environmentKey, enableLocalEvaluation: true })` with a server-side key to opt into local evaluation and environment polling. Call `adapter.close()` on shutdown to stop polling.

###### Usage with type coercion

```ts
import { flagsmithAdapter } from '@flags-sdk/flagsmith';

export const buttonColor = flag<string>({
  key: 'button-color',
  defaultValue: 'blue',
  adapter: flagsmithAdapter.getValue({ coerce: 'string' }),
});

export const showBanner = flag<boolean>({
  key: 'show-banner',
  defaultValue: false,
  adapter: flagsmithAdapter.getValue({ coerce: 'boolean' }),
});
```

Coercion options: `'string'`, `'number'`, `'boolean'`, or omit for raw value.

---

##### Reflag

Package: `@flags-sdk/reflag`

```bash
pnpm i @flags-sdk/reflag
```

Env: `REFLAG_SECRET_KEY`

```ts
import { reflagAdapter, type Context } from '@flags-sdk/reflag';

const identify = dedupe((async ({ headers, cookies }) => ({
  user: { id: 'user-id', name: 'name', email: 'email' },
  company: { id: 'company-id' },
})) satisfies Identify<Context>);

export const myFeature = flag<boolean, Context>({
  key: 'my_feature',
  identify,
  adapter: reflagAdapter.isEnabled(),
});
```

---

##### OpenFeature

Package: `@flags-sdk/openfeature` + `@openfeature/server-sdk`

```bash
pnpm i @flags-sdk/openfeature @openfeature/server-sdk
```

###### Setup

```ts
import { createOpenFeatureAdapter } from '@flags-sdk/openfeature';

// Sync provider
OpenFeature.setProvider(new YourProvider());
const adapter = createOpenFeatureAdapter(OpenFeature.getClient());

// Async provider
const adapter = createOpenFeatureAdapter(async () => {
  await OpenFeature.setProviderAndWait(new YourProvider());
  return OpenFeature.getClient();
});
```

###### Methods

```ts
adapter.booleanValue()  // boolean flags
adapter.stringValue()   // string flags
adapter.numberValue()   // number flags
adapter.objectValue()   // object flags
```

All require `defaultValue` on the flag declaration.

---

##### Split

Package: `@flags-sdk/split` (Flags Explorer only, adapter coming soon)

```ts
import { getProviderData as getSplitProviderData } from '@flags-sdk/split';

getSplitProviderData({
  adminApiKey: process.env.SPLIT_ADMIN_API_KEY,
  environmentId: process.env.SPLIT_ENVIRONMENT_ID,
  organizationId: process.env.SPLIT_ORG_ID,
  workspaceId: process.env.SPLIT_WORKSPACE_ID,
});
```

---

##### Optimizely

Package: `@flags-sdk/optimizely` (Flags Explorer only, adapter coming soon)

```ts
import { getProviderData as getOptimizelyProviderData } from '@flags-sdk/optimizely';

getOptimizelyProviderData({
  projectId: process.env.OPTIMIZELY_PROJECT_ID,
  apiKey: process.env.OPTIMIZELY_API_KEY,
});
```

---

##### Custom Adapters

Create an adapter factory:

```ts
import type { Adapter } from 'flags';

export function createMyAdapter(/* options */) {
  return function myAdapter<ValueType, EntitiesType>(): Adapter<ValueType, EntitiesType> {
    return {
      origin(key) {
        return `https://my-provider.com/flags/${key}`;
      },
      async decide({ key }): Promise<ValueType> {
        return false as ValueType;
      },
    };
  };
}
```

###### Bulk evaluation (`bulkDecide`)

Adapters can implement an optional `bulkDecide` hook. When set (and the adapter has an `adapterId`), `evaluate()` calls it once for every group of flags that share this adapter and the same `identify` source — instead of calling `decide` per flag. This lets the provider share work across evaluations (e.g. a single network request for many flags).

```ts
return {
  adapterId: 'my-provider', // required for bulkDecide to be used
  origin(key) {
    return `https://my-provider.com/flags/${key}`;
  },
  async decide({ key }): Promise<ValueType> {
    return false as ValueType;
  },
  // Called by evaluate() for a batch of flags sharing this adapter + identify
  async bulkDecide({ flags, entities, headers, cookies }) {
    // flags: { key: string; defaultValue?: unknown }[]
    // Return a record keyed by flag key.
    return Object.fromEntries(
      flags.map(({ key }) => [key, false as ValueType]),
    );
  },
};
```

Contract:

- Return `Record<flagKey, value>`. Missing keys or `value: undefined` fall back to each flag's `defaultValue`.
- Throwing falls back to `defaultValue` per flag (and rejects for flags without a `defaultValue`).
- A flag with an inline `decide` takes precedence and is excluded from bulk evaluation.

###### Default adapter pattern

Expose a lazily-initialized default for simpler usage:

```ts
let defaultAdapter: ReturnType<typeof createMyAdapter> | undefined;

export function myAdapter<V, E>(): Adapter<V, E> {
  if (!defaultAdapter) {
    if (!process.env.MY_API_KEY) throw new Error('Missing MY_API_KEY');
    defaultAdapter = createMyAdapter(process.env.MY_API_KEY);
  }
  return defaultAdapter<V, E>();
}
```

Usage:

```ts
import { myAdapter } from './my-adapter';

export const exampleFlag = flag({
  key: 'example',
  adapter: myAdapter,
});
```

### File: `upstream/references/sveltekit.md`

#### SvelteKit Integration

##### Table of Contents

- [Quickstart](#quickstart)
- [Toolbar Setup](#toolbar-setup)
- [Flag Declaration](#flag-declaration)
- [Evaluation Context](#evaluation-context)
- [Precompute](#precompute)
- [Dashboard Pages](#dashboard-pages)
- [Marketing Pages](#marketing-pages)

##### Quickstart

###### Installation

```sh
pnpm i flags @vercel/toolbar
```

###### Create a flag

```ts
// src/lib/flags.ts
import { flag } from 'flags/sveltekit';

export const showDashboard = flag<boolean>({
  key: 'showDashboard',
  description: 'Show the dashboard',
  origin: 'https://example.com/#showdashboard',
  options: [{ value: true }, { value: false }],
  decide(_event) {
    return false;
  },
});
```

###### Set up the server hook

One-time setup that makes the toolbar aware of your flags:

```ts
// src/hooks.server.ts
import { createHandle } from 'flags/sveltekit';
import { FLAGS_SECRET } from '$env/static/private';
import * as flags from '$lib/flags';

export const handle = createHandle({ secret: FLAGS_SECRET, flags });
```

When composing with other handlers via SvelteKit's `sequence`, `createHandle` must come first.

###### Use the flag

```ts
// src/routes/+page.server.ts
import { showDashboard } from '$lib/flags';

export const load = async () => {
  const dashboard = await showDashboard();
  return {
    post: { title: dashboard ? 'New Dashboard' : 'Old Dashboard' },
  };
};
```

```svelte
<!-- src/routes/+page.svelte -->
<script lang="ts">
  import type { PageProps } from './$types';
  let { data }: PageProps = $props();
</script>

<h1>{data.post.title}</h1>
```

##### Toolbar Setup

1. Install `@vercel/toolbar`
2. Add vite plugin:

```ts
// vite.config.ts
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { vercelToolbar } from '@vercel/toolbar/plugins/vite';

export default defineConfig({
  plugins: [sveltekit(), vercelToolbar()],
});
```

3. Render toolbar in layout:

```svelte
<!-- src/routes/+layout.svelte -->
<script lang="ts">
  import type { LayoutProps } from './$types';
  import { mountVercelToolbar } from '@vercel/toolbar/vite';
  import { onMount } from 'svelte';

  onMount(() => mountVercelToolbar());

  let { children }: LayoutProps = $props();
</script>

<main>
  {@render children()}
</main>
```

##### Flag Declaration

```ts
import { flag } from 'flags/sveltekit';

export const showSummerSale = flag<boolean>({
  key: 'summer-sale',
  async decide() { return false; },
  origin: 'https://example.com/flags/summer-sale/',
  description: 'Show Summer Holiday Sale Banner, 20% off',
  options: [
    { value: false, label: 'Hide' },
    { value: true, label: 'Show' },
  ],
});
```

##### Evaluation Context

Use `identify` to segment users. Headers and cookies are normalized:

```ts
import { flag } from 'flags/sveltekit';

interface Entities {
  user?: { id: string };
}

export const exampleFlag = flag<boolean, Entities>({
  key: 'identify-example-flag',
  identify({ headers, cookies }) {
    const userId = cookies.get('user-id')?.value;
    return { user: userId ? { id: userId } : undefined };
  },
  decide({ entities }) {
    return entities?.user?.id === 'user1';
  },
});
```

###### Deduplication

Extract `identify` as a named function and reuse across flags. Calls are deduped by function identity:

```ts
import type { ReadonlyHeaders, ReadonlyRequestCookies } from 'flags';
import { flag } from 'flags/sveltekit';

interface Entities {
  visitorId?: string;
}

function identify({
  cookies,
  headers,
}: {
  cookies: ReadonlyRequestCookies;
  headers: ReadonlyHeaders;
}): Entities {
  const visitorId =
    cookies.get('visitorId')?.value ?? headers.get('x-visitorId');
  return { visitorId };
}

export const flag1 = flag<boolean, Entities>({
  key: 'flag1',
  identify,
  decide({ entities }) { /* ... */ },
});

export const flag2 = flag<boolean, Entities>({
  key: 'flag2',
  identify,
  decide({ entities }) { /* ... */ },
});
```

##### Precompute

###### Why both Routing Middleware and reroute

- `middleware.ts` handles full page visits in production (runs before CDN)
- `reroute` handles client-side navigations and dev-time routing
- Middleware has access to cookies and private env vars; `reroute` runs on client and must defer to server

###### Step 1: Create flag group

```ts
// src/lib/flags.ts
import { flag } from 'flags/sveltekit';

export const firstPricingABTest = flag({
  key: 'firstPricingABTest',
  decide: () => false,
});

export const secondPricingABTest = flag({
  key: 'secondPricingABTest',
  decide: () => false,
});
```

```ts
// src/lib/precomputed-flags.ts
import { precompute } from 'flags/sveltekit';
import { firstPricingABTest, secondPricingABTest } from './flags';

export const pricingFlags = [firstPricingABTest, secondPricingABTest];

export async function computeInternalRoute(pathname: string, request: Request) {
  if (pathname === '/pricing') {
    return '/pricing/' + (await precompute(pricingFlags, request));
  }
  return pathname;
}
```

###### Step 2: Set up reroute hook

```ts
// src/hooks.ts
export async function reroute({ url, fetch }) {
  if (url.pathname === '/pricing') {
    const destination = new URL('/api/reroute', url);
    destination.searchParams.set('pathname', url.pathname);
    return fetch(destination).then((response) => response.text());
  }
}
```

```ts
// src/routes/api/reroute/+server.ts
import { text } from '@sveltejs/kit';
import { computeInternalRoute } from '$lib/precomputed-flags';

export async function GET({ url, request }) {
  const destination = await computeInternalRoute(
    url.searchParams.get('pathname')!,
    request,
  );
  return text(destination);
}
```

###### Step 3: Set up middleware

```ts
// middleware.ts
import { rewrite } from '@vercel/edge';
import { normalizeUrl } from '@sveltejs/kit';
import { computeInternalRoute } from './src/lib/precomputed-flags';

export const config = { matcher: ['/pricing'] };

export default async function middleware(request: Request) {
  const { url, denormalize } = normalizeUrl(request.url);
  if (url.pathname === '/pricing') {
    return rewrite(
      denormalize(await computeInternalRoute(url.pathname, request)),
    );
  }
}
```

###### Step 4: Read precomputed values

```ts
// src/routes/pricing/[code]/+page.server.ts
import type { PageServerLoad } from './$types';
import { firstPricingABTest, secondPricingABTest } from '$lib/flags';
import { pricingFlags } from '$lib/precomputed-flags';

export const load: PageServerLoad = async ({ params }) => {
  const flag1 = await firstPricingABTest(params.code, pricingFlags);
  const flag2 = await secondPricingABTest(params.code, pricingFlags);
  return {
    first: `First: ${flag1}`,
    second: `Second: ${flag2}`,
  };
};
```

```svelte
<!-- src/routes/pricing/[code]/+page.svelte -->
<script>
  let { data } = $props();
</script>

<p>{data.first}</p>
<p>{data.second}</p>
```

###### Enable ISR

```ts
// src/routes/pricing/[code]/+page.server.ts
export const config = {
  isr: { expiration: false },
};
```

###### Enable prerendering

```ts
import { generatePermutations } from 'flags/sveltekit';
import { pricingFlags } from '$lib/precomputed-flags';

export const prerender = true;

export async function entries() {
  return (await generatePermutations(pricingFlags)).map((code) => ({ code }));
}
```

##### Dashboard Pages

```ts
// src/lib/flags.ts
import { flag } from 'flags/sveltekit';

export const showNewDashboard = flag<boolean>({
  key: 'showNewDashboard',
  decide({ cookies }) {
    return cookies.get('showNewDashboard')?.value === 'true';
  },
});
```

```ts
// src/routes/+page.server.ts
import type { PageServerLoad } from './$types';
import { showNewDashboard } from '$lib/flags';

export const load: PageServerLoad = async () => {
  const dashboard = await showNewDashboard();
  return { title: dashboard ? 'New Dashboard' : 'Old Dashboard' };
};
```

##### Marketing Pages

Combine precompute with visitor ID generation for A/B tests on static pages:

###### Middleware with visitor ID

```ts
// middleware.ts
import { rewrite } from '@vercel/edge';
import { parse } from 'cookie';
import { normalizeUrl } from '@sveltejs/kit';
import { computeInternalRoute, createVisitorId } from './src/lib/precomputed-flags';

export const config = { matcher: ['/examples/marketing-pages'] };

export default async function middleware(request: Request) {
  const { url, denormalize } = normalizeUrl(request.url);

  let visitorId = parse(request.headers.get('cookie') ?? '').visitorId || '';
  if (!visitorId) {
    visitorId = createVisitorId();
    request.headers.set('x-visitorId', visitorId);
  }

  return rewrite(
    denormalize(await computeInternalRoute(url.pathname, request)),
  );
}
```

###### Flags with identify

```ts
// src/lib/flags.ts
import { flag } from 'flags/sveltekit';

interface Entities {
  visitorId?: string;
}

function identify({ cookies, headers }) {
  const visitorId =
    cookies.get('visitorId')?.value ?? headers.get('x-visitorId');
  if (!visitorId) throw new Error('Visitor ID not found');
  return { visitorId };
}

export const firstMarketingABTest = flag<boolean, Entities>({
  key: 'firstMarketingABTest',
  identify,
  decide({ entities }) {
    if (!entities?.visitorId) return false;
    return /^[a-n0-5]/i.test(entities.visitorId);
  },
});
```

The `x-visitorId` header ensures the visitor ID is available even on the first request before the cookie is set.
