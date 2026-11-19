# Skill: vercel-flags

- Plugin: `vercel` (0.56.0-wrp.1)
- Source: `plugins/vercel/skills/vercel-flags/SKILL.md`

> Feature flags, A/B tests, and gradual rollouts with Vercel Flags, in any app or framework. Use whenever the user is planning, adding, changing, or cleaning up a feature flag, toggle, kill switch, experiment, percentage rollout, or targeting rule, or wants to gate or hide a feature for some users, even before a library or provider is chosen. Covers choosing an integration (Flags SDK, `@vercel/flags-core`, OpenFeature), the Vercel dashboard, the `vercel flags` CLI (create, inspect, set, split, rollout, rules, segments, evaluations, archive, connections), Project Connections, OIDC vs SDK keys, `FLAGS_SECRET`, and Flags Explorer overrides. For `flag()` declarations, adapters, precompute, and the Flags Explorer endpoint in Next.js or SvelteKit code, load the `flags-sdk` skill.

## Instructions

### Vercel Flags

Vercel Flags is Vercel's feature flags platform. Flags are created and managed in the Vercel dashboard or with the `vercel flags` CLI, evaluated server-side in your app, and switched per environment (Development, Preview, Production) without a redeploy.

- Docs: https://vercel.com/docs/flags
- CLI reference: https://vercel.com/docs/cli/flags

Use this skill to decide how a feature should be flagged, to create and change flags, and to run rollouts and experiments. Write app code with the skill that matches the stack (see [Choose an approach](#choose-an-approach)). Do not leave CLI steps as "next steps" for the user; execute them yourself.

#### Route the request

- **Planning** ("put this behind a flag", "roll this out to 10%", "A/B test the pricing page", "add a kill switch"): follow [Plan a flag](#plan-a-flag), then [Choose an approach](#choose-an-approach).
- **Create or manage a flag with no code change** (create, inspect, enable, set, split, rollout, rules, archive): follow [Manage flags with the CLI](#manage-flags-with-the-cli). This needs an authenticated CLI, not SDK packages, Toolbar, Flags Explorer, or `.env.local` (except `vercel flags override`, which reads `FLAGS_SECRET`).
- **Share flags between projects**: follow [Project Connections](references/cli.md#project-connections) to connect projects in the same team, then configure the consumer application.
- **Clean up or remove a flag** ("remove this flag", "clean up stale flags", "inline this flag"): follow [references/cleanup.md](references/cleanup.md), then [Lifecycle and safety](references/cli.md#lifecycle-and-safety) before archiving.
- **Add a flag to an app that already uses the Flags SDK** (`flags` in `package.json`): load the `flags-sdk` skill right away; it creates the flag on Vercel and declares it in code.
- **Implement in code otherwise**: follow [Choose an approach](#choose-an-approach) and load the matching skill or reference. Inside an app repository, treat an ambiguous request as plan, create, and implement.

#### Choose an approach

Check the project before writing code.

- **Already using another flag provider** (Statsig, LaunchDarkly, PostHog, GrowthBook, and so on): keep it. On Next.js or SvelteKit, the Flags SDK connects to it through an adapter; load the `flags-sdk` skill. On any other stack, use the provider's own SDK. Rollouts, targeting, and experiments for that provider are configured in its own dashboard, not with `vercel flags`; the CLI and lifecycle sections of this skill do not apply.
- **No provider yet**: use Vercel Flags. Pick the integration by stack ([SDKs](https://vercel.com/docs/flags/vercel-flags/sdks)):
  - **Next.js or SvelteKit**: the Flags SDK (`flags` + `@flags-sdk/vercel`). It adds Flags Explorer integration and precompute for static pages. Load the `flags-sdk` skill. If it is not available, suggest `npx skills add vercel/flags@flags-sdk` (do not auto-install).
  - **Any other framework or a plain server** (for example Express): `@vercel/flags-core`. See [Other frameworks](#other-frameworks).
  - **The user wants provider portability or already uses OpenFeature**: the Vercel Flags OpenFeature provider ([Using OpenFeature with Vercel Flags](https://vercel.com/docs/flags/vercel-flags/sdks/openfeature)).

The dashboard and the `vercel flags` CLI work the same for every integration.

#### Plan a flag

Decide these before creating the flag; the kind cannot be changed later.

- **Kind**: `boolean` for on/off and kill switches; `string`, `number`, or `json` when the flag selects a variant or carries configuration ([Flag types](https://vercel.com/docs/flags/vercel-flags/dashboard/feature-flag#flag-types)).
- **Variants**: name them after the behavior (`control`, `new-checkout`), not after the rollout step.
- **Key**: kebab-case, stable, and the same string in the CLI, the dashboard, and the code (`key` in `flag()` or the first argument of `evaluate()`).
- **Environments**: each environment serves its own value or targeting. Plan what Development, Preview, and Production serve at launch.
- **Targeting**: a percentage rollout or A/B split needs a stable identity to bucket by, such as `user.id`. Define the entity and attribute under Flags → Entities first; the app must return the same names from its evaluation context ([Entities](https://vercel.com/docs/flags/vercel-flags/dashboard/entities)).
- **Fallback**: the value the app serves when the flag is archived, not yet created, or evaluation fails. This becomes `defaultValue` in code.
- **Exit**: a flag is temporary unless it is a long-lived operational switch. Plan the removal order in [references/cli.md — Lifecycle and safety](references/cli.md#lifecycle-and-safety).

#### Manage flags with the CLI

The CLI uses your Vercel account authentication. SDK keys and `vercel env pull` are application credentials, not CLI prerequisites.

> **Prerequisite**: The Vercel CLI must be installed and authenticated. If it is not installed, run `pnpm i -g vercel`. For authentication or linking issues, follow the `vercel-cli` skill if it is available. If it is not, suggest `npx skills add vercel/vercel@vercel-cli` (do not auto-install it) and rely on `vercel <command> --help` in the meantime.

Run `vercel flags --help` for the current subcommand list and `vercel flags <cmd> --help` before using a subcommand. [references/cli.md](references/cli.md) covers what `--help` cannot: how CLI concepts map to the app, promotion order, static value vs targeting mode, and the checks to run before archiving or deleting.

##### Project targeting

Use `--project <name-or-id>` and `--scope <team>` to select the target without a local link. If the CLI rejects `--project`, upgrade it first (`pnpm i -g vercel`). Without these options the commands use the linked project: run `vercel project inspect --non-interactive` and check the reported owner and project name; a `.vercel/` directory alone does not prove a link. If it reports `link_required`, the project is not linked. If the user named a project or team and the output differs, stop and ask instead of relinking. In an unlinked directory, prefer `--project` / `--scope` over `vercel link`; if the target project is unknown, ask.

##### Common flows

Always `inspect` first so you know what each environment serves today, and match the CLI key to the flag the application already declares; creating a second flag is not a substitute for adopting an existing one.

- **Create**: `vercel flags create <key> --kind boolean --description "<description>"`. If the key exists, adopt it instead.
- **Turn on or off**: `enable` / `disable` for boolean flags, `set <key>` to serve one variant of any kind. These put the environment in static value mode.
- **Gradual rollout**: `rollout <key> --by user.id ...` ([Roll out a feature](https://vercel.com/docs/flags/vercel-flags/cli/roll-out-feature)).
- **A/B test**: `split <key> --by user.id ...` ([Run an A/B test](https://vercel.com/docs/flags/vercel-flags/cli/run-ab-test)).
- **Targeting rules and segments**: `rules`, `segments`, and `targeting enable <key>` to switch an environment from a static value back to targets and rules (CLI versions before 65 call it `use-targeting <key>`).
- **Verify**: `inspect` for the served state, `versions` for history, `evaluations` to confirm traffic reaches the new variant.
- **Datafile**: `datafile --environment <production|preview|development> --json` shows the current datafile used by SDKs for debugging.
- **Retire**: remove the code first ([references/cleanup.md](references/cleanup.md)), verify no evaluations, then `archive`; `rm` only for archived flags. Follow [Lifecycle and safety](references/cli.md#lifecycle-and-safety).

`archive`, `unarchive`, `rm`, and `update --remove-variant` prompt for confirmation. Pass `--yes` when the user has approved the action.

#### Credentials

- **OIDC**: on Vercel, the app authenticates with the project's OIDC token and evaluates the configuration of the current environment. `vercel env pull` writes the Development token to `.env.local` for local development ([Getting started](https://vercel.com/docs/flags/vercel-flags/quickstart#pull-local-openid-connect-credentials)).
- **Project Connections**: read another same-team project's flags with the consumer project's OIDC token, without an SDK key. Follow [Project Connections](references/cli.md#project-connections) for setup and minimum versions.
- **SDK keys (`FLAGS`)**: for apps outside Vercel, selecting an environment explicitly, or reading flags across teams. Each key is scoped to one environment and shown once, at creation ([SDK Keys](https://vercel.com/docs/flags/vercel-flags/dashboard/sdk-keys)). Not a recovery path for failed CLI authentication.
- **`FLAGS_SECRET`**: created per environment when Vercel Flags is activated for a project. It signs Flags Explorer overrides and precompute codes, and `vercel flags override` reads it from the environment or `.env.local`. Preserve existing values and never rotate them as part of routine setup; a missing local value does not mean the remote value is missing, so check the target environment before generating one. The `flags-sdk` skill documents how to generate a missing value. Do not print secrets to the terminal, logs, or chat.

#### Flags Explorer

Flags Explorer is the Vercel Toolbar panel that lists the app's flags and lets you override them per browser through a cookie signed with `FLAGS_SECRET` ([Flags Explorer](https://vercel.com/docs/flags/flags-explorer)). The app exposes its flags through a discovery endpoint; the Flags SDK generates it (`flags-sdk` skill). `vercel flags override <key>=<value>` produces the same cookie token from the terminal.

#### Other frameworks

For frameworks without a Flags SDK entrypoint, use `@vercel/flags-core` directly ([Core SDK](https://vercel.com/docs/flags/vercel-flags/sdks/core)). Create one client at module scope and call `evaluate()` or `bulkEvaluate()` inside a request handler; both initialize the client on first use. Do not add a module-scope `client.initialize()` call or cache its promise for handlers to await.

```ts
// src/flags.ts
import { createClient } from "@vercel/flags-core";

const client = createClient();

// Call from a request handler, not during module loading.
export async function showNewCheckout(userId: string): Promise<boolean> {
  const result = await client.evaluate<boolean>("new-checkout", false, {
    user: { id: userId },
  });
  return result.value;
}
```

With OIDC the token can come from request context and may not exist during module loading. Even embedded definitions need it to select the entry by the token's `project_id`, and local `.env.local` credentials can hide this timing problem. Explicit initialization is optional and must wait until authentication is available; awaiting an already-started initialization promise later does not move it into request context. Outside Vercel, pass the SDK key: `createClient(process.env.FLAGS)`.

The third argument to `evaluate()` is the evaluation context; its entity and attribute names must match the ones defined under Flags → Entities so rollouts and rules can bucket on them.

#### References

- **[references/cli.md](references/cli.md)**: how `vercel flags` concepts map to the app (key, kind, variants, fallback, targeting attributes, timestamp conditions, authentication, overrides, embedded definitions, datafiles), and the lifecycle and safety checklist for promoting, verifying, removing, and archiving flags.
- **[references/cleanup.md](references/cleanup.md)**: removing a flag from code: the repository rules to follow, the evidence to gather, which value to inline, when to stop, what to delete, and what the cleanup PR should contain.

## Bundled files

### File: `overlay.yaml`

```yaml
name: vercel-flags
description: "Feature flags, A/B tests, and gradual rollouts with Vercel Flags, in any app or framework. Use whenever the user is planning, adding, changing, or cleaning up a feature flag, toggle, kill switch, experiment, percentage rollout, or targeting rule, or wants to gate or hide a feature for some users, even before a library or provider is chosen. Covers choosing an integration (Flags SDK, `@vercel/flags-core`, OpenFeature), the Vercel dashboard, the `vercel flags` CLI (create, inspect, set, split, rollout, rules, segments, evaluations, archive, connections), Project Connections, OIDC vs SDK keys, `FLAGS_SECRET`, and Flags Explorer overrides. For `flag()` declarations, adapters, precompute, and the Flags Explorer endpoint in Next.js or SvelteKit code, load the `flags-sdk` skill."
summary: "Vercel Flags guidance — plan a flag, choose Flags SDK vs @vercel/flags-core vs OpenFeature, manage flags with the vercel flags CLI, run rollouts and A/B tests, and retire flags safely."
metadata:
  priority: 6
  docs:
    - "https://vercel.com/docs/flags"
    - "https://vercel.com/docs/cli/flags"
  sitemap: "https://vercel.com/sitemap.xml"
  importPatterns:
    - '@vercel/flags-core'
  bashPatterns:
    - '\bvercel\s+flags\b'
    - '\bvc\s+flags\b'
    - '\bnpm\s+(install|i|add)\s+[^\n]*@vercel/flags-core\b'
    - '\bpnpm\s+(install|i|add)\s+[^\n]*@vercel/flags-core\b'
    - '\bbun\s+(install|i|add)\s+[^\n]*@vercel/flags-core\b'
    - '\byarn\s+add\s+[^\n]*@vercel/flags-core\b'
  promptSignals:
    phrases:
      - "feature flag"
      - "feature flags"
      - "vercel flags"
      - "feature gate"
      - "feature gating"
      - "a/b test"
      - "a/b testing"
      - "ab test"
      - "ab testing"
      - "flag rollout"
      - "gradual rollout"
      - "percentage rollout"
      - "kill switch"
      - "flag variant"
      - "traffic split"
      - "targeting rules"
      - "flag rules"
      - "flag segments"
      - "flag targeting"
      - "flag evaluations"
      - "flag overrides"
      - "existing flag"
      - "archive flag"
      - "flags-core"
    allOf:
      - [flag, rollout]
      - [flag, variant]
      - [flag, toggle]
      - [flag, experiment]
      - [flag, archive]
      - [experiment, variant]
      - [split, test]
    anyOf:
      - "flag"
      - "experiment"
      - "experimentation"
      - "rollout"
      - "variant"
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
    - feature flags
    - feature toggles
    - vercel flags
    - a/b testing
    - flags core
  intents:
    - add a feature flag
    - run an a/b test
    - gate a feature
    - roll out gradually
    - manage flags from cli
    - archive a feature flag
  entities:
    - Vercel Flags
    - vercel flags CLI
    - "@vercel/flags-core"
    - OpenFeature
    - FLAGS_SECRET
    - SDK keys
```

### File: `references/cleanup.md`

#### Clean up a flag

Removing a flag from code is the first step of retiring it. The flag stays configured on Vercel while the change ships, so a cleanup PR only changes what production serves if it inlines the wrong value. Archive the flag later, after the deployment and evaluation checks in [cli.md — Lifecycle and safety](cli.md#lifecycle-and-safety). Do not merge, deploy, archive, or reconfigure the flag as part of the cleanup itself.

Work on one flag at a time and scope every CLI call to its project and team (`--project`, `--scope`).

##### Follow the repository's rules

Before changing code, read what the repository documents for contributors and agents: `AGENTS.md`, `CLAUDE.md`, contributing guides, any flag-removal guide or skill, and the pull request template (for example `.github/pull_request_template.md`). Where they differ from this reference, follow the repository. That covers which tests to write and how, which checks to run, how to title the PR, and how to format its body.

##### Gather evidence

- **Configuration**: `vercel flags inspect <key>` for what each environment serves, whether it uses a static value or targeting, whether the flag is archived or permanent, and its description. `vercel flags versions <key>` for recent changes.
- **Evaluations**: `vercel flags evaluations <key> --since <window> --json` over the last few days, to see which variants production actually serves.
- **Repository**: the project's connected repository and where the flag is declared and evaluated. Fetch the default branch and search it, not a stale local branch, since the flag's owner may have removed it already.
- **Existing PR**: look for an earlier cleanup PR for the flag and judge it by its diff, not its title. Reuse an open one instead of opening a second, and do not overwrite another author's branch. If one was closed unmerged, find out why before replacing it. If one was merged and removes the flag, the code is already done.
- **Overlapping work**: look for open pull requests by other authors that change the files where the flag is read.

##### Choose the value to inline

- **Active flag**: the variant its production configuration serves to all traffic.
- **Archived flag**: the code default (`defaultValue`), not its last configured variant. An archived flag already serves the code default.

A code default that differs from the served value is expected, since inlining replaces it. So are evaluations that fell back to it, such as local development without flag configuration.

##### When to stop

Stop on concrete evidence that inlining changes what production serves:

- The flag is marked permanent or is a kill switch.
- Production has active rules, targets, splits, or rollouts.
- The production configuration changed within the last few days.
- Production evaluations show another configured variant.
- The repository reads the flag through a dynamic key you cannot resolve.

Also stop when the flag's owner asked to keep it, or when the cleanup would collide with someone else's work:

- The flag's description, or a comment at its declaration or call sites, says to keep it (for example "do not remove" or "permanent").
- Another author has an open, non-draft PR updated in the last two weeks that changes the lines where the flag is read. Ignore stale drafts.

Absent evidence is not a reason to stop: missing or unlabeled telemetry, unidentified clients, no preview or development data, missing deployment references, and consumers outside the repository. These matter for archiving, not for removing the code. Note them in the PR instead.

##### Remove the code

- **Search**: the key in its exact, camelCase, PascalCase, snake_case, and SCREAMING_SNAKE_CASE forms, and any constant or enum that holds the key.
- **Inline**: replace every evaluation with the chosen value, fold the conditionals, and remove dead branches.
- **Delete**: the declaration or registration, flag-only config, analytics and exposure logging, and any code, imports, and exports that become unused.
- **Update**: tests, mocks, and docs that mention the flag, such as rollout or migration prerequisites. Prefer updating existing tests. Add a test only in a style the repository already uses and allows; do not add a kind of test its guidelines rule out.
- **Verify**: run the relevant type checks, lint, and tests, and follow any flag-removal process the repository documents. If a check cannot run, for example because dependencies fail to install, do not report it as passed: name it in the PR with the reason.

Preserve production behavior. Do not touch other flags or refactor unrelated code.

If nothing references the flag, report the searches you ran instead of opening an empty PR.

##### Open the PR

Open it as a draft. Use the repository's PR template and title conventions when it has them, and fit the content below into that format. Otherwise, title it "Remove `<key>` feature flag". Include the following, unless the repository's format leaves it out:

- A link to the flag in the Vercel dashboard: `https://vercel.com/<team-slug>/<project-name>/flag/<key>`, with the team slug and project name, not their IDs.
- The inlined value and why it was chosen.
- The evidence gathered and any gaps from [When to stop](#when-to-stop).
- The checks run and their results, including any that could not run.
- The next steps: deploy to every environment, verify no evaluations, then archive ([cli.md — Lifecycle and safety](cli.md#lifecycle-and-safety)).

### File: `references/cli.md`

#### `vercel flags` CLI

Manage Vercel Flags from the terminal with an authenticated CLI and a targeted project ([Project targeting](../SKILL.md#project-targeting)). SDK installation and `vercel env pull` are app-development steps, not CLI prerequisites.

For the current subcommand list and options, run `vercel flags --help` or `vercel flags <cmd> --help`. For CLI-wide contracts (linking, `--non-interactive`, `--yes`, parsing stdout) follow the `vercel-cli` skill. This file covers only what `--help` cannot tell you.

##### How the CLI maps to the app

- **Key**: the flag slug you pass to the CLI is the `key` in `flag()` (Flags SDK) or the first argument of `evaluate()` (`@vercel/flags-core`). The flag returns one of the variants you created on Vercel ([Run an A/B test](https://vercel.com/docs/flags/vercel-flags/cli/run-ab-test)).
- **Kind → type**: `inspect <key>` prints the kind and variants. `boolean` → `flag<boolean>()`, `string` → `flag<string>()`, `number` → `flag<number>()`, `json` → `flag<YourType>()`. The kind is fixed at creation and cannot be changed ([Flag types](https://vercel.com/docs/flags/vercel-flags/dashboard/feature-flag#flag-types)).
- **Variants → `options`**: `options` on a Flags SDK declaration are optional. They give Flags Explorer a dropdown, pre-fill the dashboard when a draft is promoted, and let precompute serialize values and `generatePermutations` enumerate them ([Declaring options](https://vercel.com/docs/flags/vercel-flags/sdks/flags-sdk#declaring-options)). When you declare them, keep them equal to the variants `inspect` shows.
- **`defaultValue`**: a flag that is archived, or declared in code but not created on Vercel (a draft), evaluates to its fallback. Without one, Flags SDK evaluation throws ([Archive](https://vercel.com/docs/flags/vercel-flags/dashboard/archive#what-happens-when-you-archive), [Drafts](https://vercel.com/docs/flags/vercel-flags/dashboard/drafts#draft-behavior)).
- **Targeting attributes**: `split`, `rollout`, and `rules add` take `--by <entity>.<attribute>` (and `--condition <entity>.<attribute>:<op>:<value>`). Define the entity and attribute under Flags → Entities first, and return the same names from the app's evaluation context; the docs use a `User` entity with an `id` attribute and `--by user.id` ([Roll out a feature](https://vercel.com/docs/flags/vercel-flags/cli/roll-out-feature), [Entities](https://vercel.com/docs/flags/vercel-flags/dashboard/entities)). When the attribute is missing from the context, a split or rollout serves its fallback variant (`--default-variant` in the CLI) and a rule that references it is skipped. Verify with `evaluations`.
- **Attribute types**: each attribute is a String, Number, Boolean, String Array, or Timestamp, and the app must send a matching value ([Entities](https://vercel.com/docs/flags/vercel-flags/dashboard/entities)). Timestamp is a Unix epoch in milliseconds as a number. How to return each type from `identify()`, including a deduped `Date.now()` for release-at-a-time rules, is in the `flags-sdk` skill's provider reference (Attribute types).
- **Timestamp conditions**: for Timestamp attributes, `--condition` accepts `gt`, `lt`, `gte`, `lte` or the aliases `after`, `before`, `at-or-after`, `at-or-before` with an ISO 8601 date-time or epoch milliseconds, for example `--condition system.time:at-or-after:2026-04-16T09:00:00Z`. `after` and `before` are exclusive; other operators are rejected. A date-time without a timezone uses the machine's local timezone, so include `Z` or an offset. `--by` rejects Timestamp attributes.
- **Authentication**: on Vercel, the app authenticates with the project's OIDC token and uses the configuration of the current environment; `vercel env pull` brings that credential to `.env.local` for local development. For another same-team project's flags, use [Project Connections](#project-connections) with the consumer project's OIDC token. SDK keys (`FLAGS`) are for manual authentication: apps outside Vercel, selecting an environment explicitly, or reading flags across teams. Each SDK key is scoped to one environment and its full value is shown once, at creation ([Getting started](https://vercel.com/docs/flags/vercel-flags/quickstart#pull-local-openid-connect-credentials), [SDK Keys](https://vercel.com/docs/flags/vercel-flags/dashboard/sdk-keys)).
- **Overrides**: Flags Explorer stores overrides in a cookie signed with `FLAGS_SECRET`; flags declared with the Flags SDK honour it automatically ([Handling overrides](https://vercel.com/docs/flags/flags-explorer/getting-started#handling-overrides)). `vercel flags override <key>=<value>` produces the same token for the `vercel-flag-overrides` cookie and reads `FLAGS_SECRET` from the environment or `.env.local`, so use the secret of the environment you test against (see [Credentials](../SKILL.md#credentials)).
- **Embedded definitions**: Vercel builds fetch the flag definitions once and bundle them into the deployment when the project uses `@flags-sdk/vercel` or `@vercel/flags-core` and the build can authenticate. This keeps every function on one snapshot and serves as the runtime fallback when the service is unreachable; opt out with `VERCEL_FLAGS_DISABLE_DEFINITION_EMBEDDING=1` ([Embedded definitions](https://vercel.com/docs/flags/vercel-flags/sdks/core#embedded-definitions)). `vercel flags prepare` is the same step for builds that run outside Vercel.

##### Project Connections

Connections grant a consumer project read access to a source project's flags within the same team. Use Vercel CLI 63.0.0 or later. Run `vercel flags connections --help` for commands and options, even if connections are absent from the top-level help in an older release.

Confirm the source project, consumer project, and team before creating a connection. Reuse an existing connection. Creation requires team Member or Owner access, or Project Admin access on the source project, plus permission to view the consumer project. See [required permissions](https://vercel.com/docs/flags/vercel-flags/project-connections#required-permissions).

Configure the consumer with `@flags-sdk/vercel` 1.6.0 or later and `createVercelAdapter({ projectId: 'prj_source' })`, or `@vercel/flags-core` 1.11.0 or later and `createClient({ projectId: 'prj_source' })`. Replace `prj_source` with the source project's ID. Follow [the SDK connection example](https://flags-sdk.dev/docs/providers/vercel) or the [core guide](https://vercel.com/docs/flags/vercel-flags/sdks/core). Do not create an SDK key for a connection; link to the consumer project and run `vercel env pull` for local OIDC credentials. The consumer's token selects the source environment, with custom environments mapped to preview.

##### Lifecycle and safety

The docs describe these flows end to end: [Roll out a feature](https://vercel.com/docs/flags/vercel-flags/cli/roll-out-feature), [Run an A/B test](https://vercel.com/docs/flags/vercel-flags/cli/run-ab-test). For cleanup, follow the deployment and evaluation checks below before archiving.

- **Promote**: deploy the code to preview, `enable` or `set` the flag in preview, verify on the preview URL, deploy to production, then change production (`enable`, `set`, `split`, or `rollout`). Each environment keeps its own configuration; preview stays on its current value until you change it.
- **Serve vs define**: `enable` / `disable` work on boolean flags only. `set` changes the served variant for any kind. `update` adds, removes, or renames variants and does not change what is served. A variant can only be removed when no environment configuration or rule references it, including rules that are stored but not active ([Deleting a variant](https://vercel.com/docs/flags/vercel-flags/dashboard/feature-flag#deleting-a-variant)).
- **Static value vs targeting**: `set` / `enable` / `disable` put the environment in static value mode; its split, rollout, and rules are preserved in the background. `targeting enable` (`use-targeting` before CLI 65) switches back to targets and rules mode ([Switching between static and rules modes](https://vercel.com/docs/flags/vercel-flags/dashboard/feature-flag#switching-between-static-and-rules-modes)). Run `inspect` first so you know what the environment serves today.
- **Confirm a change**: `inspect` for the served state, `versions` for the change history (the dashboard can restore any earlier configuration), `evaluations` to confirm traffic reaches the new variant or to check whether a flag is still evaluated before archiving ([Evaluation metrics](https://vercel.com/docs/flags/vercel-flags/evaluation-metrics)). Local development evaluates the Development environment configuration.
- **Deploy removal first**: search for the flag key and its camelCase name, remove the declaration and conditionals, verify in preview, and complete the rollout to production and every other environment using the flag. A merged PR or preview deployment is not sufficient. Older deployments can still evaluate it through [Skew Protection](https://vercel.com/docs/skew-protection#configure-maximum-age): inspect the project's configured maximum age and account for longer-lived traffic, including crawler exceptions, rather than assuming a fixed 24 or 48 hours.
- **Verify no evaluations**: before archiving, use `vercel flags evaluations <flag> --since <window> --json` with the explicit project/team target. Require no evaluations over an observation window after rollout that covers the applicable Skew Protection period. Check that the returned time range covers the window and the data is not truncated. Clients using `@vercel/flags-core` before 1.6.0 do not report evaluations, so verify reporting coverage; an empty result alone does not prove disuse ([Evaluation metrics](https://vercel.com/docs/flags/vercel-flags/evaluation-metrics)). If evaluations continue, reporting coverage is unknown, or the window has not elapsed, leave the flag active.
- **Archive before delete**: only after those checks pass, `archive` the flag. `unarchive` restores its configuration and history. Keep it archived through the agreed observation period before permanent deletion; `rm` requires an archived flag and cannot be undone ([Archive](https://vercel.com/docs/flags/vercel-flags/dashboard/archive)).
- **Agent runs**: `archive`, `unarchive`, `rm`, and `update --remove-variant` prompt for confirmation. Pass `--yes` when the user has approved the action.

CLI reference: https://vercel.com/docs/cli/flags

### File: `upstream/SOURCE.md`

---
name: vercel-flags
description: >
  Feature flags, A/B tests, and gradual rollouts with Vercel Flags, in any app or framework.
  Use whenever the user is planning, adding, changing, or cleaning up a feature flag, toggle, kill switch,
  experiment, percentage rollout, or targeting rule, or wants to gate or hide a feature for some
  users, even before a library or provider is chosen. Covers choosing an integration (Flags SDK,
  `@vercel/flags-core`, OpenFeature), the Vercel dashboard, the `vercel flags` CLI (create, inspect,
  set, split, rollout, rules, segments, evaluations, archive, connections), Project Connections, OIDC vs SDK keys, `FLAGS_SECRET`, and
  Flags Explorer overrides. For `flag()` declarations, adapters, precompute, and the Flags Explorer
  endpoint in Next.js or SvelteKit code, load the `flags-sdk` skill.
---

#### Vercel Flags

Vercel Flags is Vercel's feature flags platform. Flags are created and managed in the Vercel dashboard or with the `vercel flags` CLI, evaluated server-side in your app, and switched per environment (Development, Preview, Production) without a redeploy.

- Docs: https://vercel.com/docs/flags
- CLI reference: https://vercel.com/docs/cli/flags

Use this skill to decide how a feature should be flagged, to create and change flags, and to run rollouts and experiments. Write app code with the skill that matches the stack (see [Choose an approach](#choose-an-approach)). Do not leave CLI steps as "next steps" for the user; execute them yourself.

##### Route the request

- **Planning** ("put this behind a flag", "roll this out to 10%", "A/B test the pricing page", "add a kill switch"): follow [Plan a flag](#plan-a-flag), then [Choose an approach](#choose-an-approach).
- **Create or manage a flag with no code change** (create, inspect, enable, set, split, rollout, rules, archive): follow [Manage flags with the CLI](#manage-flags-with-the-cli). This needs an authenticated CLI, not SDK packages, Toolbar, Flags Explorer, or `.env.local` (except `vercel flags override`, which reads `FLAGS_SECRET`).
- **Share flags between projects**: follow [Project Connections](references/cli.md#project-connections) to connect projects in the same team, then configure the consumer application.
- **Clean up or remove a flag** ("remove this flag", "clean up stale flags", "inline this flag"): follow [references/cleanup.md](references/cleanup.md), then [Lifecycle and safety](references/cli.md#lifecycle-and-safety) before archiving.
- **Add a flag to an app that already uses the Flags SDK** (`flags` in `package.json`): load the `flags-sdk` skill right away; it creates the flag on Vercel and declares it in code.
- **Implement in code otherwise**: follow [Choose an approach](#choose-an-approach) and load the matching skill or reference. Inside an app repository, treat an ambiguous request as plan, create, and implement.

##### Choose an approach

Check the project before writing code.

- **Already using another flag provider** (Statsig, LaunchDarkly, PostHog, GrowthBook, and so on): keep it. On Next.js or SvelteKit, the Flags SDK connects to it through an adapter; load the `flags-sdk` skill. On any other stack, use the provider's own SDK. Rollouts, targeting, and experiments for that provider are configured in its own dashboard, not with `vercel flags`; the CLI and lifecycle sections of this skill do not apply.
- **No provider yet**: use Vercel Flags. Pick the integration by stack ([SDKs](https://vercel.com/docs/flags/vercel-flags/sdks)):
  - **Next.js or SvelteKit**: the Flags SDK (`flags` + `@flags-sdk/vercel`). It adds Flags Explorer integration and precompute for static pages. Load the `flags-sdk` skill. If it is not available, suggest `npx skills add vercel/flags@flags-sdk` (do not auto-install).
  - **Any other framework or a plain server** (for example Express): `@vercel/flags-core`. See [Other frameworks](#other-frameworks).
  - **The user wants provider portability or already uses OpenFeature**: the Vercel Flags OpenFeature provider ([Using OpenFeature with Vercel Flags](https://vercel.com/docs/flags/vercel-flags/sdks/openfeature)).

The dashboard and the `vercel flags` CLI work the same for every integration.

##### Plan a flag

Decide these before creating the flag; the kind cannot be changed later.

- **Kind**: `boolean` for on/off and kill switches; `string`, `number`, or `json` when the flag selects a variant or carries configuration ([Flag types](https://vercel.com/docs/flags/vercel-flags/dashboard/feature-flag#flag-types)).
- **Variants**: name them after the behavior (`control`, `new-checkout`), not after the rollout step.
- **Key**: kebab-case, stable, and the same string in the CLI, the dashboard, and the code (`key` in `flag()` or the first argument of `evaluate()`).
- **Environments**: each environment serves its own value or targeting. Plan what Development, Preview, and Production serve at launch.
- **Targeting**: a percentage rollout or A/B split needs a stable identity to bucket by, such as `user.id`. Define the entity and attribute under Flags → Entities first; the app must return the same names from its evaluation context ([Entities](https://vercel.com/docs/flags/vercel-flags/dashboard/entities)).
- **Fallback**: the value the app serves when the flag is archived, not yet created, or evaluation fails. This becomes `defaultValue` in code.
- **Exit**: a flag is temporary unless it is a long-lived operational switch. Plan the removal order in [references/cli.md — Lifecycle and safety](references/cli.md#lifecycle-and-safety).

##### Manage flags with the CLI

The CLI uses your Vercel account authentication. SDK keys and `vercel env pull` are application credentials, not CLI prerequisites.

> **Prerequisite**: The Vercel CLI must be installed and authenticated. If it is not installed, run `pnpm i -g vercel`. For authentication or linking issues, follow the `vercel-cli` skill if it is available. If it is not, suggest `npx skills add vercel/vercel@vercel-cli` (do not auto-install it) and rely on `vercel <command> --help` in the meantime.

Run `vercel flags --help` for the current subcommand list and `vercel flags <cmd> --help` before using a subcommand. [references/cli.md](references/cli.md) covers what `--help` cannot: how CLI concepts map to the app, promotion order, static value vs targeting mode, and the checks to run before archiving or deleting.

###### Project targeting

Use `--project <name-or-id>` and `--scope <team>` to select the target without a local link. If the CLI rejects `--project`, upgrade it first (`pnpm i -g vercel`). Without these options the commands use the linked project: run `vercel project inspect --non-interactive` and check the reported owner and project name; a `.vercel/` directory alone does not prove a link. If it reports `link_required`, the project is not linked. If the user named a project or team and the output differs, stop and ask instead of relinking. In an unlinked directory, prefer `--project` / `--scope` over `vercel link`; if the target project is unknown, ask.

###### Common flows

Always `inspect` first so you know what each environment serves today, and match the CLI key to the flag the application already declares; creating a second flag is not a substitute for adopting an existing one.

- **Create**: `vercel flags create <key> --kind boolean --description "<description>"`. If the key exists, adopt it instead.
- **Turn on or off**: `enable` / `disable` for boolean flags, `set <key>` to serve one variant of any kind. These put the environment in static value mode.
- **Gradual rollout**: `rollout <key> --by user.id ...` ([Roll out a feature](https://vercel.com/docs/flags/vercel-flags/cli/roll-out-feature)).
- **A/B test**: `split <key> --by user.id ...` ([Run an A/B test](https://vercel.com/docs/flags/vercel-flags/cli/run-ab-test)).
- **Targeting rules and segments**: `rules`, `segments`, and `targeting enable <key>` to switch an environment from a static value back to targets and rules (CLI versions before 65 call it `use-targeting <key>`).
- **Verify**: `inspect` for the served state, `versions` for history, `evaluations` to confirm traffic reaches the new variant.
- **Datafile**: `datafile --environment <production|preview|development> --json` shows the current datafile used by SDKs for debugging.
- **Retire**: remove the code first ([references/cleanup.md](references/cleanup.md)), verify no evaluations, then `archive`; `rm` only for archived flags. Follow [Lifecycle and safety](references/cli.md#lifecycle-and-safety).

`archive`, `unarchive`, `rm`, and `update --remove-variant` prompt for confirmation. Pass `--yes` when the user has approved the action.

##### Credentials

- **OIDC**: on Vercel, the app authenticates with the project's OIDC token and evaluates the configuration of the current environment. `vercel env pull` writes the Development token to `.env.local` for local development ([Getting started](https://vercel.com/docs/flags/vercel-flags/quickstart#pull-local-openid-connect-credentials)).
- **Project Connections**: read another same-team project's flags with the consumer project's OIDC token, without an SDK key. Follow [Project Connections](references/cli.md#project-connections) for setup and minimum versions.
- **SDK keys (`FLAGS`)**: for apps outside Vercel, selecting an environment explicitly, or reading flags across teams. Each key is scoped to one environment and shown once, at creation ([SDK Keys](https://vercel.com/docs/flags/vercel-flags/dashboard/sdk-keys)). Not a recovery path for failed CLI authentication.
- **`FLAGS_SECRET`**: created per environment when Vercel Flags is activated for a project. It signs Flags Explorer overrides and precompute codes, and `vercel flags override` reads it from the environment or `.env.local`. Preserve existing values and never rotate them as part of routine setup; a missing local value does not mean the remote value is missing, so check the target environment before generating one. The `flags-sdk` skill documents how to generate a missing value. Do not print secrets to the terminal, logs, or chat.

##### Flags Explorer

Flags Explorer is the Vercel Toolbar panel that lists the app's flags and lets you override them per browser through a cookie signed with `FLAGS_SECRET` ([Flags Explorer](https://vercel.com/docs/flags/flags-explorer)). The app exposes its flags through a discovery endpoint; the Flags SDK generates it (`flags-sdk` skill). `vercel flags override <key>=<value>` produces the same cookie token from the terminal.

##### Other frameworks

For frameworks without a Flags SDK entrypoint, use `@vercel/flags-core` directly ([Core SDK](https://vercel.com/docs/flags/vercel-flags/sdks/core)). Create one client at module scope and call `evaluate()` or `bulkEvaluate()` inside a request handler; both initialize the client on first use. Do not add a module-scope `client.initialize()` call or cache its promise for handlers to await.

```ts
// src/flags.ts
import { createClient } from "@vercel/flags-core";

const client = createClient();

// Call from a request handler, not during module loading.
export async function showNewCheckout(userId: string): Promise<boolean> {
  const result = await client.evaluate<boolean>("new-checkout", false, {
    user: { id: userId },
  });
  return result.value;
}
```

With OIDC the token can come from request context and may not exist during module loading. Even embedded definitions need it to select the entry by the token's `project_id`, and local `.env.local` credentials can hide this timing problem. Explicit initialization is optional and must wait until authentication is available; awaiting an already-started initialization promise later does not move it into request context. Outside Vercel, pass the SDK key: `createClient(process.env.FLAGS)`.

The third argument to `evaluate()` is the evaluation context; its entity and attribute names must match the ones defined under Flags → Entities so rollouts and rules can bucket on them.

##### References

- **[references/cli.md](references/cli.md)**: how `vercel flags` concepts map to the app (key, kind, variants, fallback, targeting attributes, timestamp conditions, authentication, overrides, embedded definitions, datafiles), and the lifecycle and safety checklist for promoting, verifying, removing, and archiving flags.
- **[references/cleanup.md](references/cleanup.md)**: removing a flag from code: the repository rules to follow, the evidence to gather, which value to inline, when to stop, what to delete, and what the cleanup PR should contain.

### File: `upstream/references/cleanup.md`

#### Clean up a flag

Removing a flag from code is the first step of retiring it. The flag stays configured on Vercel while the change ships, so a cleanup PR only changes what production serves if it inlines the wrong value. Archive the flag later, after the deployment and evaluation checks in [cli.md — Lifecycle and safety](cli.md#lifecycle-and-safety). Do not merge, deploy, archive, or reconfigure the flag as part of the cleanup itself.

Work on one flag at a time and scope every CLI call to its project and team (`--project`, `--scope`).

##### Follow the repository's rules

Before changing code, read what the repository documents for contributors and agents: `AGENTS.md`, `CLAUDE.md`, contributing guides, any flag-removal guide or skill, and the pull request template (for example `.github/pull_request_template.md`). Where they differ from this reference, follow the repository. That covers which tests to write and how, which checks to run, how to title the PR, and how to format its body.

##### Gather evidence

- **Configuration**: `vercel flags inspect <key>` for what each environment serves, whether it uses a static value or targeting, whether the flag is archived or permanent, and its description. `vercel flags versions <key>` for recent changes.
- **Evaluations**: `vercel flags evaluations <key> --since <window> --json` over the last few days, to see which variants production actually serves.
- **Repository**: the project's connected repository and where the flag is declared and evaluated. Fetch the default branch and search it, not a stale local branch, since the flag's owner may have removed it already.
- **Existing PR**: look for an earlier cleanup PR for the flag and judge it by its diff, not its title. Reuse an open one instead of opening a second, and do not overwrite another author's branch. If one was closed unmerged, find out why before replacing it. If one was merged and removes the flag, the code is already done.
- **Overlapping work**: look for open pull requests by other authors that change the files where the flag is read.

##### Choose the value to inline

- **Active flag**: the variant its production configuration serves to all traffic.
- **Archived flag**: the code default (`defaultValue`), not its last configured variant. An archived flag already serves the code default.

A code default that differs from the served value is expected, since inlining replaces it. So are evaluations that fell back to it, such as local development without flag configuration.

##### When to stop

Stop on concrete evidence that inlining changes what production serves:

- The flag is marked permanent or is a kill switch.
- Production has active rules, targets, splits, or rollouts.
- The production configuration changed within the last few days.
- Production evaluations show another configured variant.
- The repository reads the flag through a dynamic key you cannot resolve.

Also stop when the flag's owner asked to keep it, or when the cleanup would collide with someone else's work:

- The flag's description, or a comment at its declaration or call sites, says to keep it (for example "do not remove" or "permanent").
- Another author has an open, non-draft PR updated in the last two weeks that changes the lines where the flag is read. Ignore stale drafts.

Absent evidence is not a reason to stop: missing or unlabeled telemetry, unidentified clients, no preview or development data, missing deployment references, and consumers outside the repository. These matter for archiving, not for removing the code. Note them in the PR instead.

##### Remove the code

- **Search**: the key in its exact, camelCase, PascalCase, snake_case, and SCREAMING_SNAKE_CASE forms, and any constant or enum that holds the key.
- **Inline**: replace every evaluation with the chosen value, fold the conditionals, and remove dead branches.
- **Delete**: the declaration or registration, flag-only config, analytics and exposure logging, and any code, imports, and exports that become unused.
- **Update**: tests, mocks, and docs that mention the flag, such as rollout or migration prerequisites. Prefer updating existing tests. Add a test only in a style the repository already uses and allows; do not add a kind of test its guidelines rule out.
- **Verify**: run the relevant type checks, lint, and tests, and follow any flag-removal process the repository documents. If a check cannot run, for example because dependencies fail to install, do not report it as passed: name it in the PR with the reason.

Preserve production behavior. Do not touch other flags or refactor unrelated code.

If nothing references the flag, report the searches you ran instead of opening an empty PR.

##### Open the PR

Open it as a draft. Use the repository's PR template and title conventions when it has them, and fit the content below into that format. Otherwise, title it "Remove `<key>` feature flag". Include the following, unless the repository's format leaves it out:

- A link to the flag in the Vercel dashboard: `https://vercel.com/<team-slug>/<project-name>/flag/<key>`, with the team slug and project name, not their IDs.
- The inlined value and why it was chosen.
- The evidence gathered and any gaps from [When to stop](#when-to-stop).
- The checks run and their results, including any that could not run.
- The next steps: deploy to every environment, verify no evaluations, then archive ([cli.md — Lifecycle and safety](cli.md#lifecycle-and-safety)).

### File: `upstream/references/cli.md`

#### `vercel flags` CLI

Manage Vercel Flags from the terminal with an authenticated CLI and a targeted project ([Project targeting](../SKILL.md#project-targeting)). SDK installation and `vercel env pull` are app-development steps, not CLI prerequisites.

For the current subcommand list and options, run `vercel flags --help` or `vercel flags <cmd> --help`. For CLI-wide contracts (linking, `--non-interactive`, `--yes`, parsing stdout) follow the `vercel-cli` skill. This file covers only what `--help` cannot tell you.

##### How the CLI maps to the app

- **Key**: the flag slug you pass to the CLI is the `key` in `flag()` (Flags SDK) or the first argument of `evaluate()` (`@vercel/flags-core`). The flag returns one of the variants you created on Vercel ([Run an A/B test](https://vercel.com/docs/flags/vercel-flags/cli/run-ab-test)).
- **Kind → type**: `inspect <key>` prints the kind and variants. `boolean` → `flag<boolean>()`, `string` → `flag<string>()`, `number` → `flag<number>()`, `json` → `flag<YourType>()`. The kind is fixed at creation and cannot be changed ([Flag types](https://vercel.com/docs/flags/vercel-flags/dashboard/feature-flag#flag-types)).
- **Variants → `options`**: `options` on a Flags SDK declaration are optional. They give Flags Explorer a dropdown, pre-fill the dashboard when a draft is promoted, and let precompute serialize values and `generatePermutations` enumerate them ([Declaring options](https://vercel.com/docs/flags/vercel-flags/sdks/flags-sdk#declaring-options)). When you declare them, keep them equal to the variants `inspect` shows.
- **`defaultValue`**: a flag that is archived, or declared in code but not created on Vercel (a draft), evaluates to its fallback. Without one, Flags SDK evaluation throws ([Archive](https://vercel.com/docs/flags/vercel-flags/dashboard/archive#what-happens-when-you-archive), [Drafts](https://vercel.com/docs/flags/vercel-flags/dashboard/drafts#draft-behavior)).
- **Targeting attributes**: `split`, `rollout`, and `rules add` take `--by <entity>.<attribute>` (and `--condition <entity>.<attribute>:<op>:<value>`). Define the entity and attribute under Flags → Entities first, and return the same names from the app's evaluation context; the docs use a `User` entity with an `id` attribute and `--by user.id` ([Roll out a feature](https://vercel.com/docs/flags/vercel-flags/cli/roll-out-feature), [Entities](https://vercel.com/docs/flags/vercel-flags/dashboard/entities)). When the attribute is missing from the context, a split or rollout serves its fallback variant (`--default-variant` in the CLI) and a rule that references it is skipped. Verify with `evaluations`.
- **Attribute types**: each attribute is a String, Number, Boolean, String Array, or Timestamp, and the app must send a matching value ([Entities](https://vercel.com/docs/flags/vercel-flags/dashboard/entities)). Timestamp is a Unix epoch in milliseconds as a number. How to return each type from `identify()`, including a deduped `Date.now()` for release-at-a-time rules, is in the `flags-sdk` skill's provider reference (Attribute types).
- **Timestamp conditions**: for Timestamp attributes, `--condition` accepts `gt`, `lt`, `gte`, `lte` or the aliases `after`, `before`, `at-or-after`, `at-or-before` with an ISO 8601 date-time or epoch milliseconds, for example `--condition system.time:at-or-after:2026-04-16T09:00:00Z`. `after` and `before` are exclusive; other operators are rejected. A date-time without a timezone uses the machine's local timezone, so include `Z` or an offset. `--by` rejects Timestamp attributes.
- **Authentication**: on Vercel, the app authenticates with the project's OIDC token and uses the configuration of the current environment; `vercel env pull` brings that credential to `.env.local` for local development. For another same-team project's flags, use [Project Connections](#project-connections) with the consumer project's OIDC token. SDK keys (`FLAGS`) are for manual authentication: apps outside Vercel, selecting an environment explicitly, or reading flags across teams. Each SDK key is scoped to one environment and its full value is shown once, at creation ([Getting started](https://vercel.com/docs/flags/vercel-flags/quickstart#pull-local-openid-connect-credentials), [SDK Keys](https://vercel.com/docs/flags/vercel-flags/dashboard/sdk-keys)).
- **Overrides**: Flags Explorer stores overrides in a cookie signed with `FLAGS_SECRET`; flags declared with the Flags SDK honour it automatically ([Handling overrides](https://vercel.com/docs/flags/flags-explorer/getting-started#handling-overrides)). `vercel flags override <key>=<value>` produces the same token for the `vercel-flag-overrides` cookie and reads `FLAGS_SECRET` from the environment or `.env.local`, so use the secret of the environment you test against (see [Credentials](../SKILL.md#credentials)).
- **Embedded definitions**: Vercel builds fetch the flag definitions once and bundle them into the deployment when the project uses `@flags-sdk/vercel` or `@vercel/flags-core` and the build can authenticate. This keeps every function on one snapshot and serves as the runtime fallback when the service is unreachable; opt out with `VERCEL_FLAGS_DISABLE_DEFINITION_EMBEDDING=1` ([Embedded definitions](https://vercel.com/docs/flags/vercel-flags/sdks/core#embedded-definitions)). `vercel flags prepare` is the same step for builds that run outside Vercel.

##### Project Connections

Connections grant a consumer project read access to a source project's flags within the same team. Use Vercel CLI 63.0.0 or later. Run `vercel flags connections --help` for commands and options, even if connections are absent from the top-level help in an older release.

Confirm the source project, consumer project, and team before creating a connection. Reuse an existing connection. Creation requires team Member or Owner access, or Project Admin access on the source project, plus permission to view the consumer project. See [required permissions](https://vercel.com/docs/flags/vercel-flags/project-connections#required-permissions).

Configure the consumer with `@flags-sdk/vercel` 1.6.0 or later and `createVercelAdapter({ projectId: 'prj_source' })`, or `@vercel/flags-core` 1.11.0 or later and `createClient({ projectId: 'prj_source' })`. Replace `prj_source` with the source project's ID. Follow [the SDK connection example](https://flags-sdk.dev/docs/providers/vercel) or the [core guide](https://vercel.com/docs/flags/vercel-flags/sdks/core). Do not create an SDK key for a connection; link to the consumer project and run `vercel env pull` for local OIDC credentials. The consumer's token selects the source environment, with custom environments mapped to preview.

##### Lifecycle and safety

The docs describe these flows end to end: [Roll out a feature](https://vercel.com/docs/flags/vercel-flags/cli/roll-out-feature), [Run an A/B test](https://vercel.com/docs/flags/vercel-flags/cli/run-ab-test). For cleanup, follow the deployment and evaluation checks below before archiving.

- **Promote**: deploy the code to preview, `enable` or `set` the flag in preview, verify on the preview URL, deploy to production, then change production (`enable`, `set`, `split`, or `rollout`). Each environment keeps its own configuration; preview stays on its current value until you change it.
- **Serve vs define**: `enable` / `disable` work on boolean flags only. `set` changes the served variant for any kind. `update` adds, removes, or renames variants and does not change what is served. A variant can only be removed when no environment configuration or rule references it, including rules that are stored but not active ([Deleting a variant](https://vercel.com/docs/flags/vercel-flags/dashboard/feature-flag#deleting-a-variant)).
- **Static value vs targeting**: `set` / `enable` / `disable` put the environment in static value mode; its split, rollout, and rules are preserved in the background. `targeting enable` (`use-targeting` before CLI 65) switches back to targets and rules mode ([Switching between static and rules modes](https://vercel.com/docs/flags/vercel-flags/dashboard/feature-flag#switching-between-static-and-rules-modes)). Run `inspect` first so you know what the environment serves today.
- **Confirm a change**: `inspect` for the served state, `versions` for the change history (the dashboard can restore any earlier configuration), `evaluations` to confirm traffic reaches the new variant or to check whether a flag is still evaluated before archiving ([Evaluation metrics](https://vercel.com/docs/flags/vercel-flags/evaluation-metrics)). Local development evaluates the Development environment configuration.
- **Deploy removal first**: search for the flag key and its camelCase name, remove the declaration and conditionals, verify in preview, and complete the rollout to production and every other environment using the flag. A merged PR or preview deployment is not sufficient. Older deployments can still evaluate it through [Skew Protection](https://vercel.com/docs/skew-protection#configure-maximum-age): inspect the project's configured maximum age and account for longer-lived traffic, including crawler exceptions, rather than assuming a fixed 24 or 48 hours.
- **Verify no evaluations**: before archiving, use `vercel flags evaluations <flag> --since <window> --json` with the explicit project/team target. Require no evaluations over an observation window after rollout that covers the applicable Skew Protection period. Check that the returned time range covers the window and the data is not truncated. Clients using `@vercel/flags-core` before 1.6.0 do not report evaluations, so verify reporting coverage; an empty result alone does not prove disuse ([Evaluation metrics](https://vercel.com/docs/flags/vercel-flags/evaluation-metrics)). If evaluations continue, reporting coverage is unknown, or the window has not elapsed, leave the flag active.
- **Archive before delete**: only after those checks pass, `archive` the flag. `unarchive` restores its configuration and history. Keep it archived through the agreed observation period before permanent deletion; `rm` requires an archived flag and cannot be undone ([Archive](https://vercel.com/docs/flags/vercel-flags/dashboard/archive)).
- **Agent runs**: `archive`, `unarchive`, `rm`, and `update --remove-variant` prompt for confirmation. Pass `--yes` when the user has approved the action.

CLI reference: https://vercel.com/docs/cli/flags
