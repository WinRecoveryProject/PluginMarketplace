# Skill: ai-gateway

- Plugin: `vercel` (0.56.0-wrp.3)
- Source: `plugins/vercel/skills/ai-gateway/SKILL.md`

> Vercel AI Gateway guidance for setup, model discovery, authentication, routing, fallbacks, virtual models, evaluation models, BYOK, budgets, spend reporting, observability, compatible APIs, and coding-agent configuration. Use when adding AI Gateway to an app, migrating provider calls, choosing models or providers, centralizing model configuration, evaluating application state, debugging gateway requests, or running `vercel ai-gateway` commands.

## Instructions

### Vercel AI Gateway

AI Gateway exposes models from multiple providers through shared authentication, model IDs, routing, billing, and observability. Model availability, SDK APIs, CLI commands, prices, and product capabilities change frequently. Verify them from current sources before changing code.

#### Start with current sources

Before implementing:

1. Inspect the project's language, package manager, installed AI SDK version, and existing provider integration.
2. Read the relevant Vercel page under <https://vercel.com/docs/ai-gateway>. Use the page's `.md` form when a tool needs Markdown.
3. Fetch the complete live model list. Do not construct model variants by analogy:

   ```bash
   curl -fsSL https://ai-gateway.vercel.sh/v1/models
   ```

4. If the code uses the `ai` package, load the `ai-sdk` skill when available. Read version-matched docs under `node_modules/ai/docs/` and source under `node_modules/ai/src/`. If the skill is not installed, use those bundled files directly.
5. Run `vercel ai-gateway <command> --help` before documenting or scripting CLI flags.

The live model endpoint and installed package take precedence over model names or SDK syntax remembered from training data.

#### Vercel CLI inventory

The `vercel ai-gateway` command manages gateway resources for the current team. The `setup` subcommand connects local coding agents; the rest of the CLI covers the jobs that previously required dashboard work:

| Command | What it does |
| --- | --- |
| `api-keys create/list/inspect/revoke` | Create and manage AI Gateway API keys, with budgets, spend alerts, expiry, and restriction exemptions. `revoke` needs CLI 64.6+; older CLIs use `remove` |
| `budgets set/list/inspect/remove` | Set metered spend limits for the team, a project, a user, or an API key |
| `budgets set/inspect/remove --default`, `budgets list --defaults` | Set per-scope default limits covering projects, keys, or members without a custom budget. Needs CLI 59.13+; the older `budgets defaults` group is deprecated |
| `models list` / `models endpoints <model>` | List the model catalog and one model's provider endpoints from the CLI |
| `virtual-models create/list/inspect/update/delete/restore` | Manage reusable, team-scoped model configurations addressed as `vmc/<slug>`. `update` needs CLI 64.4+ and `delete` 64.6+; older CLIs use `edit` and `remove` |
| `rules add/list/update/remove` | Manage routing rules; the CLI marks rules beta, so check `--help` before relying on them. `update` needs CLI 64.4+; older CLIs use `edit`. REST CRUD exists under `https://api.vercel.com/ai-gateway/rules` |
| `setup` | Configure supported coding agents; see [references/coding-agents.md](ai-gateway.md#file-referencescoding-agentsmd) |
| `leaderboard` | Explore public, anonymized usage leaderboards; rarely needed for implementation work |

Use the CLI for credential and spend management when the user is working from a terminal or in CI. Check `vercel ai-gateway <command> --help` for current flags before scripting; do not copy a flag list from this skill into generated code.

#### Route the request to the right guide

| User's job | Read |
| --- | --- |
| Ask a coding agent to make one Gateway request, or handle first-request credentials, compatible SDKs, or migration | [references/setup.md](ai-gateway.md#file-referencessetupmd) |
| Provider selection, model fallbacks, caching, BYOK, or timeouts | [references/routing.md](ai-gateway.md#file-referencesroutingmd) |
| Reusable model configuration, a `vmc/<slug>`, or provider options for a client that cannot send them | [references/virtual-models.md](ai-gateway.md#file-referencesvirtual-modelsmd) |
| Typed decisions (formerly evaluation) through AI SDK, the OpenAI-compatible `POST /v1/decisions`, the deprecated `POST /v1/evaluate`, or the TypeSafe-compatible API | [references/evaluation.md](ai-gateway.md#file-referencesevaluationmd) |
| Credits, budgets, reporting, Logs, or request debugging | [references/spend-observability.md](ai-gateway.md#file-referencesspend-observabilitymd) |
| Route Claude Code, Codex, OpenCode, Pi, or another coding agent's own model traffic through Gateway | [references/coding-agents.md](ai-gateway.md#file-referencescoding-agentsmd) |

Read each relevant reference before editing. A task can require more than one.

#### Choose the integration surface

| Existing project | Default path |
| --- | --- |
| JavaScript or TypeScript using AI SDK | Use a plain `provider/model` string with `generateText`, `streamText`, `ToolLoopAgent`, or the relevant modality API |
| Python using AI SDK for Python | Use `ai.get_model('provider/model')` and the current Python SDK docs |
| Existing OpenAI SDK | Keep the SDK and point `baseURL` or `base_url` to `https://ai-gateway.vercel.sh/v1` |
| Existing Anthropic SDK | Keep the SDK and point `baseURL` or `base_url` to `https://ai-gateway.vercel.sh` |
| Decisions over provider-neutral HTTP | Send the OpenAI-compatible Decisions request shape to `POST https://ai-gateway.vercel.sh/v1/decisions`; `POST /v1/evaluate` is deprecated |
| Existing TypeSafe evaluation client | Keep `@typesafe-ai/sdk` and point `baseURL` to `https://ai-gateway.vercel.sh/typesafe` |
| Provider-neutral HTTP | Use an AI Gateway compatible endpoint, such as Chat Completions or OpenResponses |
| Existing direct-provider AI SDK integration | Replace the provider instance with a live AI Gateway `provider/model` string, then remove provider credentials only after verifying the gateway path |
| Coding agent | Use `vercel ai-gateway setup`; inspect its help before claiming agent support. Use a Virtual Model when the agent needs reusable routing or provider options it cannot send per request |

AI Gateway also supports OpenAI Responses, Anthropic Messages, OpenResponses, Cohere Rerank, embeddings, image and video generation, speech, transcription, realtime sessions, and decisions (formerly evaluation). Modality pages under <https://vercel.com/docs/ai-gateway/modalities> cover each request shape, including background jobs for long-running video generation. Decisions are available through AI SDK (`experimental_decide` in `ai` 7.0.128+, or the deprecated `experimental_evaluate` alias on earlier AI SDK 7 releases), the OpenAI-compatible `POST /v1/decisions`, the deprecated `POST /v1/evaluate`, and a TypeSafe-compatible API under `/typesafe`; they are not available through Chat Completions, Responses, or the Anthropic- or Cohere-compatible endpoints. Read [references/evaluation.md](ai-gateway.md#file-referencesevaluationmd) before choosing a surface. Read the relevant modality or API page instead of translating one request shape from memory.

#### Minimal AI SDK request

The current AI SDK requires Node.js 22 or later. Confirm the installed package's `engines` field before enforcing a version in an existing project.

```ts
import { generateText } from 'ai';

const model = process.env.AI_GATEWAY_MODEL;
if (!model) {
  throw new Error('Set AI_GATEWAY_MODEL to an ID returned by /v1/models');
}

const { text } = await generateText({
  model,
  prompt: 'Explain the project in one paragraph.',
});

console.log(text);
```

Honor an exact model the user or task specifies after confirming it exists. Otherwise fetch `/v1/models`, choose a model that fits the requested modality, capabilities, price, context window, data-retention policy, and team access, and set `AI_GATEWAY_MODEL` to that ID. Do not put a time-sensitive model recommendation in reusable examples.

Plain model strings route through AI Gateway. Add `@ai-sdk/gateway` only when the task needs its exported provider, types, model discovery, generation lookup, or spend-report helpers.

#### Authentication decision

- Use an **AI Gateway API key** for local scripts, CI, external servers, and non-Vercel deployments. Store it in `AI_GATEWAY_API_KEY` and never print or commit it.
- Use **Vercel OIDC** for Vercel deployments and linked local projects. Vercel deployments receive `VERCEL_OIDC_TOKEN`; local development uses `vercel link` and `vercel env pull`.
- **BYOK provider credentials do not replace AI Gateway request authentication.** They decide how AI Gateway authenticates to a model provider.
- A plain Node.js script does not automatically load `.env.local`. Export variables in the shell or load that file explicitly. Framework behavior may differ.

Do not ask the user to paste a secret into chat, source code, a committed config file, or a command that will enter shell history unless the repository has an established secure mechanism.

#### Implementation workflow

1. Establish the user's job, runtime, deployment target, current provider, and required capabilities.
2. Select authentication from the rules above. Preserve a working existing method unless the user asked to migrate it.
3. Fetch live model metadata and choose a compatible model. State why it fits.
4. Read the matching SDK, API, modality, routing, or coding-agent docs.
5. Make the smallest end-to-end change. Reuse the current project structure and error handling.
6. Handle only errors the application can act on. Common gateway outcomes include authentication failure, insufficient credits, budget exhaustion, rate limiting, and provider capacity failure.
7. Run the project's formatter, type checker, and focused tests.
8. When the task authorizes a live request, run one and inspect the returned model, text or media, usage, and provider metadata.
9. Verify the request in AI Gateway Logs when dashboard access is available. Logs can take about 90 seconds to ingest.

Only spend credits, create keys, change budgets, change routing rules, or write coding-agent config when the user requested or approved that outward-facing action. Prefer dry runs and interactive previews when available.

#### Routing invariants

- Model IDs use the exact `provider/model` strings returned by `/v1/models`.
- Default routing already fails over across providers. Add `order` (preference), `only` (hard filter, no failover outside it), or `sort` (one-metric ranking) only for a stated requirement.
- `models` lists fallback models after the primary model.
- `caching: 'auto'` manages provider prompt-cache markers. It is not an HTTP response cache.
- `providerTimeouts` applies to BYOK provider attempts. Streaming requests clear it at the first stream chunk; non-streaming requests time the complete response.
- A reasoning entry in `providerOptions` overrides the AI SDK top-level `reasoning` value entirely; the two never merge.
- `user` and `tags` attach reporting dimensions. They do not create per-user rate limits.
- Request-scoped provider credentials belong under `providerOptions.gateway.byok` and must remain secret.
- Virtual Model IDs use `vmc/<slug>`. A Virtual Model can pin routing and provider options server-side; settings it defines generally override the corresponding request settings, while unset settings remain request-configurable.

Read [references/routing.md](ai-gateway.md#file-referencesroutingmd) before adding any of these fields.

#### Verification checklist

- [ ] A direct model ID exists in the full live model response, or a Virtual Model exists for the authenticated team and resolves as `vmc/<slug>`.
- [ ] The selected API or SDK supports the requested modality and feature.
- [ ] Authentication works in the actual runtime, including `.env.local` loading where relevant.
- [ ] The example prints or returns a result instead of discarding the response.
- [ ] The project type checker and focused tests pass.
- [ ] A live request was made only when authorized, and its cost was understood.
- [ ] Provider routing or fallback behavior is visible in response metadata or Logs.
- [ ] No secret appears in source, logs, diffs, or the final response.
- [ ] The final report distinguishes code verification from live and dashboard verification.

#### Current documentation

- Getting started: <https://vercel.com/docs/ai-gateway/getting-started>
- Models and providers: <https://vercel.com/docs/ai-gateway/models-and-providers>
- Virtual Models: <https://vercel.com/docs/ai-gateway/models-and-providers/virtual-models>
- SDKs and APIs: <https://vercel.com/docs/ai-gateway/sdks-and-apis>
- Authentication and BYOK: <https://vercel.com/docs/ai-gateway/authentication-and-byok>
- Observability and spend: <https://vercel.com/docs/ai-gateway/observability-and-spend>
- Modalities: <https://vercel.com/docs/ai-gateway/modalities>
- Decision: <https://vercel.com/docs/ai-gateway/modalities/decision>
- TypeSafe API: <https://vercel.com/docs/ai-gateway/sdks-and-apis/typesafe>
- REST API reference: <https://vercel.com/docs/ai-gateway/sdks-and-apis/rest-api>
- FAQ: <https://vercel.com/docs/ai-gateway/faq>
- Coding agents: <https://vercel.com/docs/ai-gateway/coding-agents>
- AI SDK provider: <https://ai-sdk.dev/providers/ai-sdk-providers/ai-gateway>

## Bundled files

### File: `.vercel.approvers`

```text
@vercel/ai-gateway:team
```

### File: `references/coding-agents.md`

#### Coding agents through AI Gateway

Use this reference when routing a coding agent's model traffic through AI Gateway.

##### Distinguish the two coding-agent workflows

| Workflow | Meaning |
| --- | --- |
| Ask a coding agent to make a Gateway request | The agent writes and runs an application or HTTP request. The agent itself can use any model or provider; the request's `provider/model` is a separate target. Use the first-request guide routed from `SKILL.md`. |
| Route a coding agent through Gateway | Configure the agent's own inference traffic, model picker, credentials, and spend tracking to use AI Gateway. Continue with this reference. |

Do not describe the target model in a one-off Gateway request as "the coding agent." Name the controlling tool separately, such as Codex or Claude Code.

##### Recommended setup

One CLI command configures supported coding agents. It provisions or reuses an AI Gateway API key, detects installed agents, previews every planned config change, and asks for confirmation before writing:

```bash
vercel ai-gateway setup
```

Check `vercel ai-gateway setup --help` before documenting flags or agent support; the CLI is the source of truth for the current command shape.

Useful flags from the shipped help:

- `--agent <NAME>`: configure one agent; repeatable for a subset.
- `--all`: configure every supported agent.
- `--dry-run`: print the planned diff without writing.
- `--key <KEY>`: reuse an existing AI Gateway key instead of creating one. Do not put a literal key in a saved command or agent transcript; prefer the CLI's interactive or OS credential-store path.
- `--amount <USD>` and `--refresh-period <PERIOD>`: set a spend limit on a newly created key (`--amount` needs Vercel CLI 65.4+; older CLIs use `--budget`).
- `--expiration <PERIOD>`: expire a newly created key after a fixed period.
- `--apply prompt`: emit an agent prompt instead of writing files, for setups handled by another coding agent.

Behavior worth stating to users:

- On macOS, the key can be stored in Keychain rather than plaintext config.
- Existing Claude Desktop and Codex Desktop sessions can be copied so history survives the provider switch.
- Each agent gets the compatibility URL that matches its protocol, not a single generic one.

CLI docs: <https://vercel.com/docs/cli/ai-gateway#setup>. Coding-agents guide: <https://vercel.com/docs/ai-gateway/coding-agents>.

##### Custom configuration with Virtual Models

Many coding agents let the user select a model ID but cannot send AI SDK `providerOptions`. Use a [Virtual Model](ai-gateway.md#file-referencesvirtual-modelsmd) to move that configuration into AI Gateway:

1. Run `vercel ai-gateway setup` to connect the agent and establish authentication.
2. Create a Virtual Model with the base model, provider order or restriction, fallbacks, service tier, caching, compliance policy, observability tags, and provider-specific options the agent should use.
3. Where the agent accepts a model ID, select or configure `vmc/<slug>`. Read the current per-agent page for its model-picker or config syntax; setup-generated shortlists may require a manual addition.
4. Change the Virtual Model later to update new requests without rewriting every agent config.

This is not the same as sending `providerOptions` from the agent. The agent sends only `vmc/<slug>`; AI Gateway applies the saved configuration server-side. If the agent can also send request options, the Virtual Model's configured values take precedence according to [the Virtual Models reference](ai-gateway.md#file-referencesvirtual-modelsmd).

##### When the CLI does not cover an agent

Some agents may support AI Gateway without being configurable by the CLI. Do not infer CLI coverage from provider support or a remembered agent list.

The docs keep a per-agent setup page under <https://vercel.com/docs/ai-gateway/coding-agents>. Prefer the current page over remembered config keys, and use manual configuration when the current setup command does not cover an agent.

##### Manual configuration

Point the agent at the coding-agent surface unless it has a dedicated endpoint:

```text
https://ai-gateway.vercel.sh/coding-agent/v1
```

The generic coding-agent URL forwards to the same `/v1` handlers, so authentication, routing, billing, and errors are identical. A client that speaks the Anthropic protocol and appends `/v1/messages` itself should use `https://ai-gateway.vercel.sh/coding-agent` without the `/v1` suffix.

Dedicated endpoints exist for Claude Code, OpenAI Codex, and Cursor. Use each agent's page for what its endpoint adds; for example, Claude Code:

```bash
export ANTHROPIC_BASE_URL="https://ai-gateway.vercel.sh/claude-code"
export ANTHROPIC_API_KEY=""
export ANTHROPIC_AUTH_TOKEN="your-ai-gateway-api-key"
export CLAUDE_CODE_ENABLE_GATEWAY_MODEL_DISCOVERY=1
```

`ANTHROPIC_API_KEY` must be empty: a non-empty value is used instead of the gateway token. The discovery variable puts every gateway model in Claude Code's `/model` picker.

##### Verify a setup

1. Run a trivial prompt through the agent.
2. Confirm the request appears in AI Gateway Logs with the coding-agent authentication and the expected model.
3. For `vmc/<slug>`, confirm Logs show the resolved base model, provider, and expected routing or provider options.
4. Check that retries, model pickers, and spend tracking work. Coding-agent sessions can generate high token counts; recommend a key budget or expiration when appropriate.

If an agent fails, inspect Logs before rewriting its config: a `401` is authentication, a `402` is credits or budget, and a `429` is a rate limit.

##### Building an application that uses an agent

This reference covers routing existing coding agents. To build an agent application, read the `ai-sdk` skill and current `ToolLoopAgent` docs, or the eve and build-agents skills for a durable agent project. Do not conflate "route my coding agent" with "build my own agent."

### File: `references/evaluation.md`

#### Decision models

Use decision models (previously called evaluation models) to assess shared application state against typed questions. They return structured boolean probabilities, choices, or scores instead of free-form text.

##### Choose the evaluation surface

| Existing project | Use |
| --- | --- |
| JavaScript or TypeScript using AI SDK 7 | `experimental_decide` from `ai` 7.0.128+; earlier AI SDK 7 releases use the now-deprecated `experimental_evaluate` alias |
| New non-AI-SDK client, OpenAI SDK, or OpenAI Decisions API client | OpenAI-compatible `POST /v1/decisions` with base URL `https://ai-gateway.vercel.sh/v1` |
| Existing `/v1/evaluate` client | Deprecated `POST /v1/evaluate`; it keeps working, but migrate to `/v1/decisions` |
| Existing TypeSafe client | Keep `@typesafe-ai/sdk` and change its API key and `baseURL` |

Decisions are not supported through Chat Completions, Responses, or the Anthropic-compatible or Cohere-compatible endpoints. Use one of the surfaces above instead.

Choose a model from the current [Decision model list](https://vercel.com/ai-gateway/models?capabilities=decision). Do not assume a text-generation model supports decisions. Use the [Decision quickstart](https://vercel.com/docs/ai-gateway/getting-started/decision) for the AI SDK first-run workflow, the [Decision modality guide](https://vercel.com/docs/ai-gateway/modalities/decision) for AI SDK and HTTP request shapes, the [OpenAI-compatible Decisions API guide](https://vercel.com/docs/ai-gateway/sdks-and-apis/openai-decisions) for OpenAI's request shape, and the [TypeSafe API guide](https://vercel.com/docs/ai-gateway/sdks-and-apis/typesafe) when migrating a TypeSafe client.

##### AI SDK

Load the `ai-sdk` skill and read the installed `ai` package docs before writing code.

```ts
import { experimental_decide as decide } from 'ai';

const result = await decide({
  model: 'typesafe-ai/jev',
  state: 'The support agent issued a full refund to the customer.',
  questions: {
    refunded: {
      type: 'boolean',
      instructions: 'Was a refund issued?',
    },
  },
});

console.log(result.answers);
```

When using an explicit Gateway provider instance, use `gateway.decisionModel(<model-id>)` (`@ai-sdk/gateway` 4.0.104+, released with `ai` 7.0.128); earlier releases use `gateway.evaluationModel()`, which remains as a deprecated alias. A plain decision model string routes through AI Gateway without installing `@ai-sdk/gateway`.

##### HTTP API

For a client that does not use AI SDK, post OpenAI's Decisions shape to `POST https://ai-gateway.vercel.sh/v1/decisions`, or point the OpenAI SDK at `https://ai-gateway.vercel.sh/v1`:

```bash
curl https://ai-gateway.vercel.sh/v1/decisions \
  -H "Authorization: Bearer $AI_GATEWAY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "typesafe-ai/jev",
    "input": "The support agent issued a full refund.",
    "questions": [
      { "type": "predicate", "name": "refunded", "instructions": "Was a refund issued?" }
    ]
  }'
```

The response lists `answers` in question order, with `model`, `usage`, and `provider_metadata.gateway` routing and cost. The endpoint accepts AI Gateway controls under `providerOptions.gateway`.

`POST /v1/evaluate` is deprecated but keeps working for existing integrations, which send Gateway's evaluation shape:

```bash
curl https://ai-gateway.vercel.sh/v1/evaluate \
  -H "Authorization: Bearer $AI_GATEWAY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "typesafe-ai/jev",
    "state": "The support agent issued a full refund.",
    "questions": {
      "refunded": { "type": "boolean", "instructions": "Was a refund issued?" }
    }
  }'
```

The response contains `model`, `answers`, and camel-cased `usage`. The endpoint accepts AI Gateway controls under `providerOptions.gateway`, including `zeroDataRetention` and `only`. Dashboard-configured BYOK credentials are used automatically.

##### TypeSafe compatibility

For an existing TypeSafe client, keep its request and response shapes and change only the credential and base URL:

```ts
import { TypeSafeClient } from '@typesafe-ai/sdk';

const client = new TypeSafeClient({
  apiKey: process.env.AI_GATEWAY_API_KEY,
  baseURL: 'https://ai-gateway.vercel.sh/typesafe',
});
```

The compatibility surface provides:

- `POST /typesafe/v1/systemone` for evaluation;
- `GET /typesafe/v1/models` for the evaluation model list; and
- TypeSafe's `noul`, choice, score, confidence, legend, snake-case usage, and error shapes.

The TypeSafe-compatible request body also accepts AI Gateway controls under `providerOptions.gateway`. Use the OpenAI-compatible `/v1/decisions` endpoint for new HTTP integrations; use `/typesafe` when preserving an existing TypeSafe client is the goal.

On any decision surface, use [Decision Fallbacks](https://vercel.com/docs/ai-gateway/models-and-providers/decision-fallbacks) to rerun a successful but uncertain decision with another model: a conditional entry in `providerOptions.gateway.models`, such as a `confidenceBelow` threshold on a Choice or Score question. A triggered fallback bills both stages.

##### Question and state rules

- Gateway's AI SDK and `/v1/evaluate` surfaces use `boolean`; the TypeSafe-compatible surface uses `noul` and translates it internally.
- The OpenAI-compatible `/v1/decisions` surface uses OpenAI's shapes instead: `input` plus a `questions` array of `predicate`, `choice` (`choices`), and `score` (`levels`) entries with optional `name`. The rules below describe the other surfaces.
- `boolean` or `noul` returns a probability from 0 to 1. Optional `criteria` can define the true and false cases.
- `choice` selects one key from a named `criteria` record and returns probabilities for every option.
- `score` uses an ordered `criteria` array of at least two labels and returns an interpolated score plus rung probabilities.
- One request can ask multiple questions of different types against the same state.
- Gateway `state` can be a string, object, or array. The TypeSafe contract also permits null and preserves its broader optional instruction and criteria shapes.
- In AI SDK `ai` 7.0.133+, an array passed directly as `state` is an ordered list of parts (`{ type: 'text', text }`, `{ type: 'json', value }`), not JSON data; Gateway rejects `file` parts. Wrap a JSON array in an object (`state: { messages }`) or a `json` part (`state: [{ type: 'json', value: messages }]`).

Use stable question keys because each key in `questions` becomes the corresponding key in `answers`. Treat probabilities as model outputs, not certainty; define explicit criteria and validate thresholds against representative data before automating consequential actions.

##### Usage and verification

Evaluation responses include token usage and are billed at the selected model's rates. Some evaluation models price input tokens only, so check the live model page instead of assuming text-model pricing.

After implementation:

1. Run the formatter, type checker, and focused tests.
2. When authorized, make one live evaluation through the selected surface and inspect its answers and usage.
3. If using TypeSafe compatibility, verify the response retains TypeSafe naming and required confidence or legend fields.
4. Confirm the request, API format, routing, and cost in AI Gateway Logs.

### File: `references/routing.md`

#### Models, routing, caching, BYOK, and timeouts

Read current docs and fetch live model metadata before adding routing policy. These controls change request consequences and can affect cost, data handling, and availability.

##### Model discovery

```bash
curl -fsSL https://ai-gateway.vercel.sh/v1/models
```

The public list carries enough to shortlist a model without opening the dashboard. Each entry includes:

- `type` and `modalities`: language, embedding, image, video, speech, transcription, realtime, or reranking, with input and output arrays
- `tags`: capability flags such as `reasoning`, `tool-use`, `vision`, `web-search`, `implicit-caching`, and `fast`
- `pricing`: per-token input and output prices
- `context_window`, `max_tokens`, `supported_parameters`, and `supported_specifications`
- `zdr` and `no_training`: `all`, `some`, or `none` across the model's provider endpoints

Use the full response. Filter it after fetching rather than truncating before inspection:

```bash
curl -fsSL https://ai-gateway.vercel.sh/v1/models |
  jq '.data[] | select(.zdr == "all" and ((.tags // []) | index("tool-use"))) | .id'
```

For per-provider detail on one model:

```text
GET https://ai-gateway.vercel.sh/v1/models/{creator}/{model}/endpoints
```

Each endpoint adds `has_zdr` and `has_no_training` booleans, full pricing (cache reads and writes, per-region prices, any `discount`), `inference_regions`, live uptime plus `latency_last_1h` and `throughput_last_1h` measurements, and per-endpoint `tags`. A model with `zdr: "some"` needs this response to find which providers qualify.

When the user is working from a terminal, the CLI exposes the same catalog:

```bash
vercel ai-gateway models list
vercel ai-gateway models endpoints <provider/model>
```

The AI SDK provider also exposes current catalog helpers. Read the installed SDK docs for exact method names and types. Every endpoint above, plus credit balance and generation lookup, is in the REST API reference: <https://vercel.com/docs/ai-gateway/sdks-and-apis/rest-api>

Choose based on:

- requested modality and API specification
- required capabilities, such as tools, reasoning, image input, or implicit caching
- context and output limits
- team plan and model access
- price and service tier
- Zero Data Retention (ZDR), no-training, HIPAA, and region requirements
- provider availability and measured performance

Never choose a permanent default only because its semantic version looks newest.

##### Provider filtering, ordering, and sorting

Default routing needs no configuration. AI Gateway picks providers per request from recent uptime and latency and fails over to other providers serving the same model. Most apps should send no `order`, `only`, or `sort`.

Each option trades some of that resilience for control:

- `only` removes every unlisted provider. If the listed providers are down, rate limited, or out of capacity, the request fails with `no_providers_available` instead of failing over. A Virtual Model's Provider Only list does the same for every caller of the slug.
- `order` keeps every provider eligible and changes which is tried first.
- `sort` keeps every provider eligible and health-aware, but replaces the default ranking with one metric: `cost`, time to first token (`ttft`), or throughput (`tps`).

Before adding any of these, identify the requirement and use the control that matches it. These keep every qualifying provider eligible, including providers added later:

| Requirement | Control |
| --- | --- |
| No provider data retention | `zeroDataRetention: true` |
| No training on prompts | `disallowPromptTraining: true` |
| Data stays in a region | `inferenceRegion` |
| A model capability (tools, vision, structured output, implicit caching) | `has: [...]` |
| Avoid lower-precision hosts | `has: ['!quantization:fp8']` |
| Lower cost or latency | `sort` |
| A service tier | `serviceTier`; fallback providers apply it when they support it |
| Keep a conversation on the provider holding its prompt cache | Nothing; session affinity is on by default |
| An org-approved vendor list for all traffic | Team provider allowlist (team owner setting) |
| Prefer a provider | `order` |

Use `only` when a requirement names specific providers and none of the controls above express it, such as a contract that permits only named vendors. When you add it:

- State in one sentence what failover it gives up.
- Keep at least two providers in the list when the requirement allows.
- Make sure any `models` fallbacks are served by a listed provider.
- Leave a code comment naming the requirement.

Do not add `only`, `order`, or `sort` on your own initiative, to make routing explicit, or by copying an example. If the user asks for one, add it and mention the tradeoff once; do not refuse or argue.

```ts
providerOptions: {
  gateway: {
    order: ['bedrock', 'anthropic'], // Prefer Bedrock; other providers stay eligible
  },
},
```

Use only supported provider identifiers from current model endpoint data. Provider availability varies by model.

Docs: <https://vercel.com/docs/ai-gateway/models-and-providers/provider-filtering-and-ordering>

##### Model fallbacks

```ts
providerOptions: {
  gateway: {
    models: [
      '<fallback-model-id>', // from GET /v1/models, ideally another provider
      '<second-fallback-model-id>',
    ],
  },
},
```

The primary `model` is attempted first. If all eligible providers for it fail, AI Gateway tries each entry in `models` in order. Provider policy such as `order` or `only` applies to each model.

Do not imply that fallback is limited to one provider error class. Inspect current provider metadata and Logs to verify which model and provider succeeded.

Docs: <https://vercel.com/docs/ai-gateway/models-and-providers/model-fallbacks>

##### Service tiers and fast mode

Service tiers control processing priority and cost for providers that support them (currently OpenAI, Google AI Studio, Google Vertex AI, and SpaceXAI), and fast mode requests the faster serving path for a supported model through the `speed` option or the fast model slug, with fallback to the base model. Both change price and latency, so read the current pages before setting either:

- <https://vercel.com/docs/ai-gateway/models-and-providers/service-tiers>
- <https://vercel.com/docs/ai-gateway/models-and-providers/fast-mode>

##### Model filtering by capability

The `has` option restricts routing to models with specific capabilities, using the same tags the model list reports, such as `vision` or `implicit-caching`.

Docs: <https://vercel.com/docs/ai-gateway/models-and-providers/model-filtering>

##### Reasoning across providers and API formats

Reasoning configuration is not portable between providers by memory. A model's `reasoning_options` field in `/v1/models` declares what it accepts: a `toggle`, an `effort` list whose values vary per model (for example `low` through `high`, or `none` through `xhigh` and beyond), or `budget_tokens` with a minimum and maximum. Read it before setting a level.

Whichever API format a request uses, AI Gateway maps its reasoning parameter to the serving provider's native configuration:

- AI SDK 7 and later: the top-level `reasoning` level works across providers. The SDK coerces unsupported levels for the target model and warns.
- Chat Completions and Responses: the `reasoning` object (`effort`, plus `max_tokens` for a token budget in Chat Completions).
- Anthropic Messages: the `thinking` parameter.

Each format's parameter works with any reasoning model, not only models from the provider that defined the format. Effort-based providers receive the level directly (coerced when the model supports fewer levels); budget-based providers receive a share of the model's maximum output tokens. Claude 4.6 accepts deprecated token budgets, Claude 4.7 and later do not accept budgets at all, and the per-provider mapping table in the reasoning docs is the source of truth.

Precedence footgun: a reasoning-related entry in `providerOptions` (such as `reasoningEffort`, `thinking`, or `thinkingConfig`) takes full precedence over the top-level `reasoning` value. The two are never merged, so remove overlapping settings when migrating.

Usage and streaming differ by provider: OpenAI reports `reasoning_tokens` separately, while Anthropic counts thinking tokens as output tokens with no separate breakdown. Whether reasoning text is returned at all depends on the model and provider configuration, and `useChat` streams it to the client unless `sendReasoning` is disabled.

Docs: <https://vercel.com/docs/ai-gateway/models-and-providers/reasoning> and the per-format reasoning references linked from it.

##### Tools across API formats

A model's tool support is discoverable: the `tool-use` tag marks tool-capable models, and `supported_parameters` lists `tools` and `tool_choice` when the model accepts them. Check both before promising tool calling on a model.

Each API format's tool schema works with any tool-capable model, not only models from the provider that defined the format. The gateway translates tool definitions and tool calls to the serving provider; the Chat Completions reference, for example, runs an OpenAI-style `tools` array against an Anthropic model. Per-format entry points:

- AI SDK: `tools` and `toolChoice`; load the `ai-sdk` skill for agent loops and multi-step control
- Chat Completions: `tools` with function schemas, `tool_choice` (`auto`, `none`, or a forced function)
- Responses and OpenResponses: `tools`
- Anthropic Messages: `tools`

Web search is also available as a built-in tool for supported models instead of an application-defined function: <https://vercel.com/docs/ai-gateway/models-and-providers/web-search>

Read the per-format tool-calling page before writing schemas; argument serialization and streaming deltas differ by format.

##### Structured outputs across API formats

Each language API format accepts a JSON schema for the response, applied to whichever provider serves the request:

- Chat Completions: `response_format` with `type: 'json_schema'` and a named `json_schema.schema`. A legacy `type: 'json'` form exists for backward compatibility; use `json_schema` for new code.
- Responses, OpenResponses, and Anthropic Messages: each has its own structured-outputs page with the format's parameter shape.
- AI SDK: use its structured-data generation APIs; load the `ai-sdk` skill for exact exports.

With streaming, structured output arrives as ordinary content deltas; accumulate the full stream and parse once it finishes. Model support varies, so verify a schema-heavy flow with a live request before building on it.

Docs: <https://vercel.com/docs/ai-gateway/sdks-and-apis/openai-chat-completions/structured-outputs>

##### File attachments

Models with image or file input accept attachments as a content-part array in place of a plain string message, mixed with text parts in one message:

- Images: an `image_url` part carrying a data URI, with an optional `detail` field.
- PDFs: a `file` part carrying the document as a data URI.

Discovery: the model's `modalities.input` array and the `vision` and `file-input` tags in `/v1/models`. Each API format has its own attachments page, and part types differ by format, so read the one matching the request shape before writing payloads.

Docs: <https://vercel.com/docs/ai-gateway/sdks-and-apis/openai-chat-completions/images>

##### Automatic prompt caching

```ts
providerOptions: {
  gateway: {
    caching: 'auto',
  },
},
```

`caching: 'auto'` adds provider prompt-cache markers for explicit-caching providers such as Anthropic and MiniMax. Providers such as OpenAI, Google, and DeepSeek can cache implicitly without request modification.

This is prompt caching. It does not cache a complete AI response, accept HTTP `Cache-Control` semantics, or guarantee a cache hit. Cache reads and writes appear in token usage.

Automatic caching has a write premium for explicit-caching providers and benefits multi-turn or repeated-prefix traffic. It can cost more for a true one-shot request.

Responses API requests can also use current cache anchor and lifetime fields. Read the documentation before adding them.

Docs: <https://vercel.com/docs/ai-gateway/models-and-providers/automatic-caching>

##### Request-scoped BYOK

```ts
providerOptions: {
  gateway: {
    byok: {
      anthropic: [{ apiKey: process.env.ANTHROPIC_API_KEY }],
    },
  },
},
```

BYOK credentials authenticate AI Gateway to a provider. The request still needs an AI Gateway API key or OIDC token. Never log or return the provider credential.

A request may fall back from BYOK credentials to AI Gateway system credentials, depending on routing and credential availability. System-credential attempts use AI Gateway Credits. Read the BYOK page before promising credential precedence.

Dashboard-configured BYOK is team-scoped. Request-scoped BYOK places credentials in one request and should be used only when the application already handles the secret securely.

Docs: <https://vercel.com/docs/ai-gateway/authentication-and-byok/byok>

##### Provider timeouts

Provider timeouts currently apply to BYOK provider attempts. Values are milliseconds from 1,000 through 789,000.

```ts
providerOptions: {
  gateway: {
    providerTimeouts: {
      byok: {
        anthropic: 10000,
        bedrock: 15000,
      },
    },
  },
},
```

For streaming requests, the timeout clears at the first stream chunk; for non-streaming requests, it runs until the provider returns the complete response. Some providers may continue billing a timed-out request if stream cancellation is unsupported.

Docs: <https://vercel.com/docs/ai-gateway/models-and-providers/provider-timeouts>

##### Reporting dimensions

```ts
providerOptions: {
  gateway: {
    user: 'user-123',
    tags: ['feature:chat', 'env:production'],
  },
},
```

`user` and `tags` add Custom Reporting dimensions. They do not enforce application rate limits or budgets by themselves. Reporting writes and queries are billed separately, and the reporting endpoint is currently Pro/Enterprise.

App attribution is separate: it identifies the calling application to Vercel so the app can be featured on public AI Gateway pages. Read <https://vercel.com/docs/ai-gateway/ecosystem/app-attribution> before adding attribution headers.

Limits from current docs:

- up to 10 tags after deduplication
- each tag 1 to 64 characters
- user up to 256 characters

Docs: <https://vercel.com/docs/ai-gateway/observability-and-spend/custom-reporting>

##### Compliance and routing policy

AI Gateway supports request-level and team-level controls for provider restrictions, no-training routing, ZDR, HIPAA, regional inference, and model allowlists. These controls differ in availability, plan requirements, and price.

To find models that satisfy a retention policy, use the `zdr` and `no_training` fields in `/v1/models` (`all`, `some`, or `none`) and the per-endpoint `has_zdr` and `has_no_training` booleans in the model's endpoints response. Do not rely on a memorized list of compliant models.

`safetyIdentifier` in `providerOptions.gateway` sends an opaque per-end-user ID (at most 64 characters, hashed rather than personal information) so provider-side abuse action isolates one user instead of the team's whole traffic. AI Gateway forwards it as OpenAI's `safety_identifier` or Anthropic's `metadata.user_id`, and it follows provider and model fallbacks. Docs: <https://vercel.com/docs/ai-gateway/security-and-compliance/safety-identifiers>

A Virtual Model saves a base model, routing, fallbacks, provider options, caching, service tier, compliance constraints, and observability tags under a team-scoped `vmc/<slug>`. Use it when configuration should be reusable or centrally editable, especially for coding agents and other clients that cannot send `providerOptions`. Virtual Models can be managed in the dashboard or with `vercel ai-gateway virtual-models`. Read [virtual-models.md](ai-gateway.md#file-referencesvirtual-modelsmd) for precedence and coding-agent guidance.

Do not invent option names. Read the exact page for the requested policy:

- <https://vercel.com/docs/ai-gateway/security-and-compliance>
- <https://vercel.com/docs/ai-gateway/models-and-providers/routing-rules>

##### Verification

After changing routing:

1. Run a permitted live request.
2. Read `providerMetadata.gateway` where the selected SDK exposes it.
3. Inspect the request in AI Gateway Logs.
4. Confirm each attempted provider/model, credential type, timeout, status, and final model.
5. Confirm cost, data-retention, and regional consequences match the user's intent.

### File: `references/setup.md`

#### Setup and compatible APIs

Use this reference for first requests, authentication setup, migration, and compatible clients.

##### First request

1. Confirm a Vercel account and team are available.
2. For free AI Gateway Credits, the team needs a valid payment method. If the gateway returns `customer_verification_required`, use the action URL in the error.
3. Create an AI Gateway API key from the dashboard or CLI, or use OIDC for a Vercel deployment.
4. Export `AI_GATEWAY_API_KEY` in the shell or load it from an uncommitted environment file.
5. Fetch `/v1/models`, choose a current model, and make one request.
6. Print or return the result.
7. Open AI Gateway Logs and inspect the model, provider, usage, cost, status, and routing attempts. Allow about 90 seconds for ingestion.

Canonical tutorial: <https://vercel.com/docs/ai-gateway/getting-started>

When a user asks a coding agent to make this request, the coding agent is the tool writing and running the API call. Its own inference does not need to use AI Gateway. The selected `provider/model` is the target of the request, not the identity of the coding agent. Routing the agent's own model traffic is a separate workflow routed from `SKILL.md`.

##### API key setup

Dashboard: <https://vercel.com/d?to=%2F%5Bteam%5D%2F%7E%2Fai-gateway%2Fapi-keys&title=AI+Gateway+API+Keys>

```bash
export AI_GATEWAY_API_KEY="your_ai_gateway_api_key"
```

The key value is shown once. Never write it to committed source or print it in a response.

###### Agent-safe credential handling

Reuse an existing key without revealing it. Do not inspect the environment with broad commands such as `env`, bare `set`, or `printenv`, and do not echo the value. Use a subshell so tracing is restored automatically:

```bash
(
  set +x
  if [ -n "${AI_GATEWAY_API_KEY:-}" ]; then
    echo "AI_GATEWAY_API_KEY is set"
  else
    echo "AI_GATEWAY_API_KEY is missing"
  fi
)
```

If the key exists, skip CLI login and team-scope discovery unless another requested operation needs them. If it is missing and the user authorized key creation:

1. Use the existing project CLI when available; otherwise use `npx vercel@latest` without installing globally.
2. Read `ai-gateway api-keys create --help` before choosing flags.
3. Reuse the current CLI team scope. Ask for a team only when that scope is missing or ambiguous.
4. Prefer an interactive prompt or OS credential store. Never put a literal key in shell history or a command argument, and never send raw key output through agent logs or chat.
5. Keep shell tracing disabled while a secret is in scope; prefer a subshell so the prior tracing state returns automatically.

For a one-request smoke test, report the generated content, whether the request succeeded, and any action the user must take. Do not dump authorization headers or an unfiltered raw response.

Use the CLI when the user asks for CLI management:

```bash
vercel ai-gateway api-keys create --name my-api-key
```

The CLI can bind a budget, spend alerts, and an expiry at creation, which beats re-editing the key later (`--amount` needs Vercel CLI 65.4+; older CLIs use `--limit`, or `--budget` before 59.13):

```bash
vercel ai-gateway api-keys create --amount 500 --alert-thresholds 75,100 --expiration 90d
```

`inspect` shows a key's budget, spend, BYOK spend, alerts, and expiry; `list` shows every key. Run `vercel ai-gateway api-keys create --help` before scripting because available quota, expiration, alert, and restriction-exemption flags change.

##### OIDC setup

OIDC is preferred for Vercel deployments because the deployment receives `VERCEL_OIDC_TOKEN` automatically. For local development against a linked Vercel project:

```bash
vercel link
vercel env pull
```

The current OIDC documentation states that locally pulled tokens are valid for 12 hours. Re-run `vercel env pull` when the token expires.

Do not say that OIDC removes request authentication. The token authenticates the request to AI Gateway. BYOK credentials are separate provider credentials.

Docs: <https://vercel.com/docs/ai-gateway/authentication-and-byok/oidc>

##### AI SDK

Current AI SDK JavaScript releases require Node.js 22 or later. Verify the installed package rather than upgrading an established project without approval.

A plain `provider/model` string uses AI Gateway:

```ts
import { generateText } from 'ai';

const model = process.env.AI_GATEWAY_MODEL;
if (!model) {
  throw new Error('Set AI_GATEWAY_MODEL to an ID returned by /v1/models');
}

const { text } = await generateText({
  model,
  prompt: 'Explain this codebase.',
});

console.log(text);
```

Load the `ai-sdk` skill and read `node_modules/ai/docs/` before writing SDK-specific code. Use `@ai-sdk/gateway` exports only when needed. Do not add a provider-specific package for a model called through AI Gateway.

##### AI SDK for Python

Current AI SDK for Python releases require Python 3.12 or later. Install and follow its current docs:

```bash
uv add ai
```

```python
import asyncio
import os
import ai

async def main() -> None:
    model = ai.get_model(os.environ['AI_GATEWAY_MODEL'])
    messages = [ai.user_message('Explain this project.')]

    async with ai.stream(model, messages) as stream:
        async for event in stream:
            if isinstance(event, ai.events.TextDelta):
                print(event.chunk, end='', flush=True)

asyncio.run(main())
```

Docs: <https://vercel.com/docs/ai-gateway/sdks-and-apis/ai-sdk-python>

##### Compatible clients

| Client or API | Base URL or endpoint |
| --- | --- |
| OpenAI Chat Completions and OpenAI Responses SDKs | `https://ai-gateway.vercel.sh/v1` |
| Anthropic Messages SDK | `https://ai-gateway.vercel.sh` |
| OpenResponses HTTP | `https://ai-gateway.vercel.sh/v1/responses` |
| Decisions HTTP | `https://ai-gateway.vercel.sh/v1/decisions` (`/v1/evaluate` is deprecated) |
| TypeSafe SDK | Set `baseURL` to `https://ai-gateway.vercel.sh/typesafe` |
| Cohere Rerank | Follow the current Cohere Rerank page |

Keep the client's request shape and replace its base URL and request authentication. AI Gateway model IDs remain `provider/model` strings even when using an OpenAI or Anthropic SDK.

Docs: <https://vercel.com/docs/ai-gateway/sdks-and-apis>

##### Migration

For an existing integration:

1. Inventory the SDK, model IDs, provider-specific request fields, provider credentials, streaming behavior, and error handling.
2. Choose the closest AI Gateway API shape. An existing OpenAI or Anthropic client can usually keep its SDK.
3. Change request authentication and the base URL.
4. Map model IDs to live AI Gateway slugs. Do not mechanically prepend a provider name.
5. Preserve provider-specific options that the selected API supports.
6. Remove direct-provider credentials only after the AI Gateway path passes a live request.
7. Verify usage, cost, and routing in Logs.

Migration guide: <https://vercel.com/docs/ai-gateway/getting-started/migrate-to-ai-gateway>

##### Common first-request errors

| Status or type | Meaning | Action |
| --- | --- | --- |
| `401` | Missing, invalid, or revoked API key/OIDC token | Fix request authentication |
| `402 insufficient_funds` | No positive AI Gateway Credits balance | Add credits |
| `402 quota_for_entity_exceeded` | A team, project, API key, or user budget is exhausted | Wait for refresh or raise the budget |
| `403 customer_verification_required` | A valid payment method is required for free credits | Use the action URL in the error |
| `429` | Gateway or provider rate limit | Honor `retry-after` when present and retry with backoff; see the [rate limits page](https://vercel.com/docs/ai-gateway/rate-limits) |
| `503` | Provider capacity or gateway service unavailable | Retry if safe; inspect provider attempts before changing routing |

### File: `references/spend-observability.md`

#### Credits, budgets, reporting, and observability

Use this reference for AI Gateway Credits, spend caps, usage reporting, request logs, and debugging. Read current docs before editing billing or spend controls.

##### AI Gateway Credits and pricing

AI Gateway adds no platform markup to provider pricing, and some models are priced below provider list for every team; browse current ones at <https://vercel.com/ai-gateway/models?discount=true>. Volume commitments can negotiate custom discounts with invoice payment. Requests draw on AI Gateway Credits unless BYOK credentials are used. Docs: <https://vercel.com/docs/ai-gateway/pricing/discounts>

- A team needs a valid payment method to unlock free AI Gateway Credits. The gateway returns `customer_verification_required` with an action link when verification is missing.
- Free-tier requests use a subset of models and have lower per-model rate limits. Exceeding one returns `429`; buying credits moves the team to the paid tier and raises limits.
- A request that exceeds the balance fails with `402` and `insufficient_funds`. BYOK requests also require a positive balance so fallback providers remain available.
- Credits support manual top-up and auto top-up. Some opt-in extras bill separately: Custom Reporting writes and queries, Trace Drains, and team-wide compliance or provider-restriction policies.

Check the pricing page for the current free-credit amount and tiers instead of hardcoding it. Docs: <https://vercel.com/docs/ai-gateway/pricing>

##### Budgets

A budget caps AI Gateway spend at one of four scopes:

| Scope | Meters |
| --- | --- |
| Team | Every request across the team |
| Project | Requests authenticated by that project's OIDC tokens |
| API key | Requests using that one key |
| User | Requests using keys attributed to that member |

Budgets stack. A request must pass every budget in scope, and one exhausted budget rejects it even when the others have room. Exceeded budgets reject further requests with HTTP `402` and type `quota_for_entity_exceeded` until the budget resets or its limit is raised. A budget is a soft cap: the request that crosses the limit completes.

Refresh periods reset at UTC boundaries: daily at midnight, weekly on Monday, monthly on the first of the month. `none` never resets.

###### Default budgets

Each of project, API key, and user scopes can have one default that covers every covered resource without its own budget:

- The default applies immediately to existing and future resources in that scope.
- Each covered resource gets its own allowance; the limit is per resource, not split across them.
- A custom budget always wins over the default.
- Removing a default lifts the cap from every covered resource; only a wider team budget still applies.

###### Spend alerts

Custom budgets can email on 50%, 75%, or 100% of the limit, at most once per period per threshold. Recipients depend on scope: team and project budgets email team owners and members with the Billing role, an API key budget emails the key's creator, and a user budget emails that member. Alerts are informational; a threshold below 100% never blocks requests.

Default budgets do not send spend alerts; set a custom budget on a resource to get alerts for it.

BYOK spend is metered separately and does not count toward any budget.

###### CLI and API

The Vercel CLI manages budgets per scope. `set` creates or updates, `list` shows every scope's limit and spend, `inspect` shows one scope, and `remove` lifts a cap (falling back to the scope's default when one exists). Target a scope's default with `--default` on `set`, `inspect`, or `remove`, and list defaults with `list --defaults` (Vercel CLI 59.13+; the older `budgets defaults` group is deprecated):

```bash
vercel ai-gateway budgets set team --amount 500 --refresh-period monthly
vercel ai-gateway budgets set project my-project --amount 200
vercel ai-gateway budgets set api-key my-key --amount 50
vercel ai-gateway budgets set api-key --default --amount 50 --refresh-period monthly
vercel ai-gateway budgets inspect team
vercel ai-gateway budgets list
```

Check `vercel ai-gateway budgets set --help` for the current flag set before scripting; `--amount` needs Vercel CLI 65.4+, and older CLIs use `--limit`.

Budget changes take effect after a short delay, typically tens of seconds and up to about 5 minutes for an actively used key.

Docs: <https://vercel.com/docs/ai-gateway/observability-and-spend/budgets> and <https://vercel.com/docs/cli/ai-gateway#budgets>

##### Request authentication

Team budgets count every request. Project budgets apply only to OIDC-authenticated requests from that project's deployments. API key and user budgets apply to key usage. BYOK requests are metered but never counted against a limit. Read the budgets page before changing attribution or defaults; metering is not retroactive for a re-created budget.

###### Spend attribution and permissions

Each API key is attributed to the team or to the member who created it. Only member-attributed keys count toward a user budget; OIDC tokens, personal access tokens, and app tokens never do. Attribution is editable: <https://vercel.com/docs/ai-gateway/authentication-and-byok/api-keys#spend-attribution>

Every team role except Contributor can view budgets. An Owner can grant a member the AI Gateway Budget Manager permission, which covers budget writes at every scope except API key budgets, which follow key-editing permission.

##### Observability

The AI Gateway Overview shows usage, spend, time to first token, and token counts by model, plus request summaries by project and API key. AI Traces and Trace Drains cover OpenTelemetry tracing and export for Pro and Enterprise (<https://vercel.com/docs/ai-gateway/observability-and-spend/trace-drains>).

For individual requests, use the Logs page. It lists every request and asynchronous job newest first with status, model, provider, usage, cost, duration, and authentication, and supports filters for status, model, provider, authentication, routing, modality, latency, tokens, cost, and date range. Filters live in the URL, so a filtered view can be shared. Live mode tails new requests as they arrive; requests take about 90 seconds to fully ingest. Logs also exist at project scope under `/[team]/[project]/ai-gateway/logs`, and the page copies visible rows or exports loaded rows as CSV or JSON.

One request's details panel shows every provider attempt, including retries, credential source, time to first token, timing spans, status, and provider response, plus usage and cost breakdowns. Routing attempt details are kept for 30 days; the list allows up to 36 days.

Docs: <https://vercel.com/docs/ai-gateway/observability-and-spend/logs> and <https://vercel.com/docs/ai-gateway/observability-and-spend/observability>

##### Custom Reporting

The Custom Reporting API aggregates usage by model, user, tag, provider, credential type, ZDR status, or API key name, with filters for each dimension and day- or hour-level granularity. It requires a Pro or Enterprise plan and bills writes and queries.

Attach `user` and/or `tags` to requests through `providerOptions.gateway` (AI SDK) or `extra_body.providerOptions.gateway` (Python SDKs), or through the `ai-reporting-user` and `ai-reporting-tags` headers when a proxy stamps context without changing application code.

```bash
curl "https://ai-gateway.vercel.sh/v1/report?start_date=2026-01-01&end_date=2026-01-31&group_by=model" \
  -H "Authorization: Bearer $AI_GATEWAY_API_KEY"
```

Results can take a few minutes to appear. The AI SDK exposes equivalent helpers, such as `gateway.getSpendReport()` and `gateway.getGenerationInfo()`; confirm names against the installed package.

Docs: <https://vercel.com/docs/ai-gateway/observability-and-spend/custom-reporting>

##### Usage and billing endpoints

Two REST endpoints cover balance and per-request cost without opening the dashboard:

- `GET /v1/credits` returns the team's remaining credit balance and lifetime spend.
- `GET /v1/generation` returns cost, latency, finish reason, and token usage for one generation.

Every response carries its generation ID: the `id` field on a chat completion, injected into the first chunk of a stream, and `providerMetadata.gateway.generationId` in the AI SDK. Capture it when the application may need a cost lookup later.

Docs: <https://vercel.com/docs/ai-gateway/observability-and-spend/usage> and the REST API reference at <https://vercel.com/docs/ai-gateway/sdks-and-apis/rest-api>

##### Debugging checklist

1. Find the request in AI Gateway Logs by request ID, model, status, or time range.
2. Check authentication: the row names the API key, OIDC project, app token, or personal access token used.
3. Read the routing cards for every provider attempt and their statuses.
4. Compare usage and cost against the budget and credit balance.
5. For a failed request, match the status against the first-request error table before changing routing or credentials.
6. For recurring spend patterns, query Custom Reporting by model, tag, user, or credential type rather than reading individual logs one at a time.

### File: `references/virtual-models.md`

#### Virtual Models

A Virtual Model is a team-scoped `vmc/<slug>` that resolves to a base model plus reusable routing, behavior, compliance, observability, and provider-specific configuration. Use one stable model ID and update its server-side configuration without redeploying each caller.

Docs: <https://vercel.com/docs/ai-gateway/models-and-providers/virtual-models>

##### When to use one

Use a Virtual Model when:

- multiple applications or agents should share one model policy;
- a coding agent accepts a model ID but cannot send `providerOptions`;
- provider order, restrictions, fallbacks, service tier, caching, timeouts, compliance, or tags must be centrally managed;
- provider-specific options should apply to every request through the slug; or
- the underlying model or routing should change without editing callers.

Keep per-request `providerOptions` when policy genuinely varies by request and the client can send them. A Virtual Model is configuration, not a second inference request.

##### Create and inspect

Use the dashboard or the current CLI. Check help before scripting flags:

```bash
vercel ai-gateway virtual-models --help
vercel ai-gateway virtual-models create
vercel ai-gateway virtual-models inspect coding-agent
vercel ai-gateway models list --virtual
```

The CLI supports create, list, inspect, update, delete, and restore (`update` needs Vercel CLI 64.4+ and `delete` 64.6+; older CLIs use `edit` and `remove`). The slug is immutable after creation. Changes apply to new requests within a few minutes.

The Virtual Model's **Provider Options** field is a provider-keyed JSON map, for example:

```json
{
  "anthropic": {
    "effort": "high"
  }
}
```

Keys must be known provider slugs, and each nested option must be valid for that provider.

Do not confuse that field with Gateway routing controls. Provider order, `only`, model fallbacks, sorting, service tier, caching, timeouts, capabilities, compliance, and tags are separate Virtual Model settings. In an AI SDK request, those routing controls normally live under `providerOptions.gateway`.

##### Call the Virtual Model

Use the `vmc/` prefix anywhere AI Gateway accepts a model ID:

```ts
import { streamText } from 'ai';

const result = streamText({
  model: 'vmc/coding-agent',
  prompt: 'Review this change.',
  providerOptions: {
    gateway: {
      user: 'user-123',
    },
  },
});
```

The request may still supply settings the Virtual Model leaves unset. Saved settings resolve as follows:

- Provider order, `only`, fallbacks, fast mode, sort, service tier, caching, timeouts, inference region, required capabilities, and tags win when the Virtual Model sets them.
- Provider-specific options merge option by option; the Virtual Model wins collisions and request values fill unset options.
- Compliance settings only tighten. Neither side can turn off a restriction enabled by the other.
- A setting left unset by the Virtual Model remains request-configurable.
- A `vmc/<slug>` can appear in a request fallback list; its settings apply only to that fallback attempt.

Read the current docs before relying on `@default` or cleared settings; only selected fields support the tri-state behavior.

##### Coding-agent pattern

Coding agents frequently expose a model picker or model config but no way to send AI SDK `providerOptions`. In that case:

1. Connect the agent with `vercel ai-gateway setup`.
2. Create a Virtual Model containing the shared routing and provider configuration.
3. Select or configure `vmc/<slug>` as the agent's model. Use the agent's current AI Gateway page for exact config syntax. If its generated shortlist omits team Virtual Models, add the ID manually where the agent permits custom models.
4. Verify in AI Gateway Logs that the slug resolved to the expected base model and provider.

Do not promise that every agent discovers team Virtual Models automatically. Model discovery and custom-model support vary by agent. The Virtual Model solves server-side configuration; it does not change the client's model-picker capabilities.

##### Operational cautions

- Team Owners and Members can create Virtual Models; only the creator or a team Owner can edit, archive, remove, or restore one. Any team member can call one.
- Archived or removed slugs stop serving requests. Know the callers before changing lifecycle state.
- Virtual Model tags replace request tags when configured, so avoid unintentionally dropping caller attribution.
- Required capabilities replace the request's capability list rather than merging with it.
- Repointing a slug can change price, latency, retention, and model behavior for every caller. Verify Logs and cost after edits.
