# Skill: vercel-tracing

- Plugin: `vercel` (0.56.0-wrp.1)
- Source: `plugins/vercel/skills/vercel-tracing/SKILL.md`

> Set up OpenTelemetry instrumentation for Vercel Tracing and query the resulting spans. Use when adding or fixing `@vercel/otel`, wiring a framework's server startup hook (Next.js, SvelteKit, and others), adding custom spans, turning on spans from libraries such as the AI SDK, Flags SDK, or database clients, propagating trace context between services, configuring always-on tracing sampling, searching or inspecting spans with `vercel traces`, or debugging failed or slow server requests.

## Instructions

### Vercel Tracing

Use Vercel Tracing to instrument server code with OpenTelemetry and inspect spans from deployed traffic. The workflow is **register `@vercel/otel` from the framework's server startup hook → deploy and exercise a server route → search and inspect the trace with `vercel traces`**. Use the same traces to debug failed requests and measure slow operations. Read only the references needed for the current task.

Tracing only covers server code: requests to dynamic routes, API routes, functions, and on-demand rendering, and [daemons](https://vercel.com/docs/daemons/tracing) (Public Beta, production only) that export spans to the Unix socket at `VERCEL_OTEL_SOCKET_PATH`. In a Node.js daemon, call `registerOTel` from `@vercel/otel` 2.3.0+ at the top of the worker's entry file; in other languages, point an OpenTelemetry exporter that supports Unix sockets (OTLP/HTTP, not gRPC) at that path. Setting `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT` or `OTEL_EXPORTER_OTLP_ENDPOINT`, or passing a custom `traceExporter` to `registerOTel`, bypasses the socket. Find daemon spans by the `serviceName` the daemon registers, with `vercel traces search --project <project> --service <serviceName>`. Static and prerendered pages and CDN cache hits run no application code, so traces cannot explain or speed them up; optimize those with caching, bundle size, and Core Web Vitals work instead.

#### Reference index

| Reference | Read when |
| --- | --- |
| [Collection](references/collection.md) | Deciding which spans need application setup, or choosing always-on tracing, request capture, or a browser session |
| [Instrumentation](references/instrumentation.md) | Discovering a framework's startup hook, wiring and verifying SDK setup, or using Sentry |
| [Next.js](references/nextjs.md) | Checking Next.js 16.5+ default tracing, setting up Next.js instrumentation, or enabling verbose spans |
| [SvelteKit](references/sveltekit.md) | Enabling server tracing and the instrumentation hook on SvelteKit 2 or 3 |
| [Library spans](references/library-spans.md) | Turning on spans from the AI SDK, Flags SDK, Workflow, or database and cache clients |
| [Custom spans](references/custom-spans.md) | Measuring an application operation and recording failures |
| [Context propagation](references/context-propagation.md) | Connecting traces across services: outbound URL matching, non-fetch clients and queues, incoming requests |
| [Configuration](references/configuration.md) | Inspecting or changing always-on tracing sampling rules |
| [Capture](references/capture.md) | Reproducing a request or tracing a browser flow |
| [Search](references/search.md) | Finding slow or failed spans, choosing filters, or parsing results |
| [Inspection](references/inspection.md) | Retrieving a request trace and choosing timeline, tree, or waterfall |
| [Performance](references/performance.md) | Making a route, API, function, or server-rendered page faster: wrapping operations in custom spans, reading exact durations, comparing before and after |
| [Troubleshooting](references/troubleshooting.md) | Investigating empty results, failed lookups, missing spans, or truncated attributes |

#### Setup workflow

1. Check existing setup: framework and adapter versions, any registered OpenTelemetry provider or Sentry v8+, and framework tracing flags. Extend an existing provider; never register a second one.
2. Decide what needs application setup. Infrastructure and outbound-fetch spans are automatic; framework, library, and custom spans need `@vercel/otel`. On Next.js 16.5+, check [default tracing](references/nextjs.md) first. When Vercel adds `@vercel/otel`, framework spans need no setup, and step 3 is only for custom or library spans. See [collection](references/collection.md).
3. Install `@vercel/otel` and `@opentelemetry/api`, then register the SDK once from the framework's verified server startup hook. On Next.js, that is `register()` in `instrumentation.ts`:

   ```ts
   import { registerOTel } from '@vercel/otel';

   export function register() {
     registerOTel({ serviceName: process.env.VERCEL_PROJECT_NAME });
   }
   ```

   Under default tracing, Vercel stops adding `@vercel/otel` once this file exists, and `VERCEL_PROJECT_NAME` keeps the service name unchanged. For other frameworks, follow [SvelteKit](references/sveltekit.md) or [another framework](references/instrumentation.md#integrate-another-framework); see [Next.js](references/nextjs.md) for default tracing, verbose spans, and prerendering. Next.js and SvelteKit join the incoming request trace automatically; other frameworks may need [incoming-context extraction](references/context-propagation.md#incoming-requests). Add [custom spans](references/custom-spans.md) and [context propagation](references/context-propagation.md) where needed.
4. Turn on [library spans](references/library-spans.md) for the libraries in the application's `package.json`, such as the AI SDK, the Flags SDK, or a database client.
5. Build, deploy to preview or production, exercise a server-executed route, and [inspect its trace](references/inspection.md). Confirm span names and parent relationships with `inspect`, and `service.name` with search JSON. A local exporter check does not prove Vercel collection.

#### Investigation workflow

Investigate errors and improve application performance with traces. Measure before optimizing: don't claim a speedup until deployed spans confirm it.

When the cause looks obvious in the code, such as sequential awaits, still measure. Add spans around the suspected operations in the same change as the fix, or in a baseline deploy first when one is possible. Report the expected gain as an estimate until deployed traces confirm it, and name the spans the user should compare. Code reading finds candidates; it does not show which one dominates on Vercel, where database location, cold starts, and external APIs change the cost.

1. Confirm the slow or failing route runs server code on each request; a static, prerendered, or cached response has no application spans. Verify preview or production deployment, collection mode, and traffic. Check application OpenTelemetry setup for framework and custom spans and sampling rules for always-on tracing. Reuse completed setup, and turn on library spans from the `vercel-tracing` skill for installed libraries that are missing them.
2. Find slow or failed requests for the affected project, route, environment, and time window, or capture a reproduction.
3. Wrap each suspected operation (database queries, external calls, cache reads, rendering, CPU-heavy work) in a custom span with `startActiveSpan`, deploy, and read exact durations from traces. Save these as the baseline.
4. Inspect traces to locate failed operations, the slowest span on the critical path, sequential waits, and unmeasured gaps between a parent and its children; relate them to application code. Add spans to any gap and measure again.
5. Change the measured cause, keeping its span. After deploying, compare that span and the whole request across equivalent requests under similar load and collection settings. Report before and after timings, sample counts, errors, and remaining uncertainty.

A limited span search is not a complete latency distribution. Use browser profiling alongside traces for rendering or interaction bottlenecks.

#### CLI scope

Confirm that `vercel traces --help` lists the subcommand needed. `vc` and `vercel` are equivalent.

The CLI runs with `--non-interactive` by default when it detects an agent and stdin is not a TTY. In that mode `search` and `config` print JSON, `search --columns` is rejected, production capture needs `--yes`, and `config rm` returns the command for the user to run instead of prompting.

Search covers all projects in the selected team, even from a linked directory. Use `--scope` for the team and `--project` for one application's search. `inspect` and `config` remain project-scoped; after a team search, use the result's project for retrieval.

Do not change sampling merely to investigate an issue. Empty sampled results do not prove a request never happened; distinguish authentication or API failures from successful empty searches.

## Bundled files

### File: `references/capture.md`

#### Targeted capture

Use this reference to reproduce a request or browser flow without changing always-on tracing rules. Verify [collection prerequisites](collection.md); framework and custom spans still need deployed instrumentation.

##### Capture a request

Target the deployment explicitly, from a directory linked to the same project. `vercel traces create` is an alias for `vercel curl --trace`:

```bash
vercel traces create /api/status --deployment https://my-app-abc123.vercel.app --scope my-team --json
```

Without `--deployment`, the CLI picks the linked project's deployment and prefers production. Production capture needs `--yes` when stdin is not a TTY, as in agent shells. The CLI adds a protection bypass for protected deployments; for other access, `⤳ skill: access-protected-vercel-deployment`.

Pass curl options after `--`, for example to reproduce an authorized POST:

```bash
vercel traces create /api/test --deployment https://my-app-abc123.vercel.app --scope my-team -- --request POST --header 'Content-Type: application/json' --data '{"name":"John"}'
```

With `--json`, the command prints `{ response, requestId }`, not search JSON Lines. `response` is the body only; to see the HTTP status, rerun without `--json` and add `-- --silent --output /dev/null --write-out '%{http_code}\n'`. [Inspect](inspection.md) `requestId` in the deployment's project and team; if the result is not the captured request, see [troubleshooting](troubleshooting.md#inspect-returns-the-wrong-trace). See [CLI capture](https://vercel.com/docs/cli/traces#create).

##### Capture a browser flow

Use a preview or production deployment with the Vercel Toolbar enabled:

1. Open **Tracing** in the Toolbar. Select **Run Page Trace** for one page load, or **Start Tracing Session** for a flow; the page reloads to activate capture.
2. Reproduce the flow. Open the completed page trace or **View Session Traces** to inspect captured requests.
3. Select **Stop Tracing Session** when finished. Sessions stay active until stopped or browser cookies are cleared.

See [browser capture instructions](https://vercel.com/docs/tracing/session-tracing). Use [inspection](inspection.md) to choose a trace view.

### File: `references/collection.md`

#### Collection prerequisites

Use this reference before setup or querying when collection is uncertain. Reuse completed setup.

##### Choose the spans needed

Infrastructure and outbound-fetch spans are automatic and need no application OpenTelemetry setup. Framework and custom spans need [application instrumentation](instrumentation.md) deployed to the target environment, except framework spans under Next.js 16.5+ [default tracing](nextjs.md). Library spans also need it, plus an [opt-in](library-spans.md) for each installed library that has one. See [automatic instrumentation](https://vercel.com/docs/tracing#automatic-instrumentation).

##### Choose a collection mode

| Mode | Use for | Required setup |
| --- | --- | --- |
| Always-on tracing | Investigating sampled traffic already captured | Matching positive [sampling rules](configuration.md) for the project, environment, and paths |
| Single request | Reproducing an endpoint from the terminal | [CLI request capture](capture.md#capture-a-request) against a deployment |
| Browser session or page | Reproducing a flow interactively | [Browser capture](capture.md#capture-a-browser-flow) with the Vercel Toolbar enabled |

Request and browser capture do not require always-on tracing rules. See [session tracing](https://vercel.com/docs/tracing/session-tracing).

##### Verify before querying

1. Select the intended team, project, and preview or production deployment. Local execution alone is insufficient.
2. For framework and custom spans, check that [instrumentation](instrumentation.md) is deployed. Under Next.js 16.5+ [default tracing](nextjs.md), framework spans need none unless Vercel skips adding `@vercel/otel`; custom spans still do.
3. Check the selected mode's setup. For always-on tracing, inspect existing rules before an authorized change; see [configuration](configuration.md).
4. Send requests after collection is enabled. Query the same project, environment, and time window, then [inspect a representative trace](inspection.md).

Use [troubleshooting](troubleshooting.md) if the expected spans are absent.

### File: `references/configuration.md`

#### Sampling rules reference

Use this reference for always-on tracing. [Request and browser capture](capture.md) work separately from these rules.

##### Inspect and configure

Inspect rules in the intended project before changing them:

```bash
vercel traces config ls --scope my-team --project my-app --json
```

For an authorized sampling change, set the rate and verify the resulting rules:

```bash
vercel traces config set 10 /api --environment production --scope my-team --project my-app
vercel traces config ls --scope my-team --project my-app --json
```

##### Rule matching

Rules match an environment and optional path prefix. `set` changes the rate for an existing pair or appends a new rule. Environments are `production`, `preview`, and `any`. The first matching rule wins, so an earlier broad rule can shadow a later narrow rule. Up to 10 rules are allowed. CLI rates are integers from 1 to 100; use the dashboard for a zero-rate exclusion. A positive rule enables always-on tracing; removing all rules disables it. Requests matching no rule are not collected. Sampling makes one decision per trace, rather than sampling its spans independently; [size limits](troubleshooting.md#oversized-telemetry) can still leave spans missing.

Next.js 16.5+ [default tracing](nextjs.md) starts with one rule, which `ls` shows as `any (all paths) 100%`. This default rule matches every request first, so any rule that `set` adds below it never applies. To trace less overall, change the default rule's rate in place with `set <rate> --environment any`. To give one path its own rate, `set` the path rule, have the user run `rm --environment any --default`, then `set` the default rule again so it lands below. This order never leaves the project without a rule, so tracing stays on. In the dashboard, which also accepts zero-rate exclusions, remove the default rule, add the path rule, and add the default rule back before saving.

##### Trace Drains are separate

Trace Drains use their own rules. An empty Drain rule set forwards all traces; an empty always-on tracing rule set collects none. Do not infer one configuration from the other. See [Trace Drain sampling](https://vercel.com/docs/drains/reference/traces#sampling-rate).

##### Remove rules

`rm /api --environment production` removes one rule, `rm --environment production --default` removes only the rule without a path prefix, and `rm --environment production` removes every production rule. `rm --environment any` removes only rules whose environment is `any`, not every rule. `set` and `rm` take `--environment` in Vercel CLI 64.7.0+; older CLIs take the environment as the first argument. See the [CLI reference](https://vercel.com/docs/cli/traces#config-remove).

Removal requires an interactive confirmation and has no bypass flag. In non-interactive mode, `rm` lists the rules at risk and returns the exact command to run in a terminal; give that command to the user. When tracing is disabled but saved rules remain, `rm` refuses until `set` re-enables tracing. Do not change sampling merely to investigate an issue. Consult [collection pricing and retention](https://vercel.com/docs/tracing/configure-tracing) for current pricing and retention.

### File: `references/context-propagation.md`

#### Context propagation

Use this reference when related operations appear in disconnected traces or beneath an unexpected parent. Propagation needs both sides: the caller injects `traceparent` into the outgoing request, and the receiver extracts it. If either side is missing, each service produces its own trace.

##### Outgoing requests

`@vercel/otel` instruments global `fetch` and Node's `http`/`https` modules, so libraries built on them, such as axios on Node, are covered too. By default it sends context only to the deployment's own host (`VERCEL_URL`, `VERCEL_BRANCH_URL`, or the incoming request's host). Calls to another Vercel project, any other domain, or an external service need an explicit allow rule.

Merge fetch settings into the existing `registerOTel` call, using the application's actual destinations:

```ts
import { registerOTel } from '@vercel/otel';

registerOTel({
  serviceName: 'checkout',
  instrumentationConfig: {
    fetch: {
      propagateContextUrls: ['https://api.example.com/', /^https:\/\/[a-z0-9-]+\.example\.com\//],
      dontPropagateContextUrls: ['https://api.example.com/public/'],
      ignoreUrls: ['https://health.example.com/'],
    },
  },
});
```

String matchers are prefixes of the full URL, including the scheme. `'api.example.com'` never matches `https://api.example.com/orders`, so headers are silently not sent. Use a full origin such as `'https://api.example.com/'` or a regular expression. Use `'*'` only when every destination is trusted.

- `propagateContextUrls` sends context headers to matching URLs.
- `dontPropagateContextUrls` blocks headers and wins over `propagateContextUrls`; the call is still traced.
- `ignoreUrls` skips tracing the call entirely.

To override one call, pass `fetch(url, { opentelemetry: { propagateContext: true } })`. Next.js needs version 14.1.1 or later for this option. See the [`@vercel/otel` options](https://github.com/vercel/otel/blob/main/packages/otel/README.md).

Avoid sending `traceparent` to third parties that do not need it; it exposes trace IDs and can make their tracing join yours.

##### Clients and transports that are not instrumented

Inject the context manually for clients that do not use `fetch` or `node:http`, such as gRPC, WebSocket messages, queue messages (including Vercel Queues), and workflow steps:

```ts
import { context, propagation } from '@opentelemetry/api';

const carrier: Record<string, string> = {};
propagation.inject(context.active(), carrier);
await queue.send({ payload, trace: carrier });
```

Adapt `queue.send` to the actual client. Put the carrier where the transport carries metadata: message attributes, gRPC metadata, or a field in the payload. Inject while the active span is the one that should become the parent. The consumer extracts the carrier with `propagation.extract` and runs its work inside `context.with`, as shown below.

##### Incoming requests

Next.js 14.0.1+ and SvelteKit with `tracing.server` enabled extract incoming context automatically. Prefer the framework's tracing integration when it already does this. Otherwise, extract the headers and run the existing handler inside that context:

```ts
import { context, propagation } from '@opentelemetry/api';
import { handleCheckout } from './checkout-handler';

export function handleRequest(request: Request): Promise<Response> {
  const parent = propagation.extract(
    context.active(),
    Object.fromEntries(request.headers),
  );
  return context.with(parent, () => handleCheckout(request));
}
```

Adapt the handler and the header carrier to the framework; not every framework exposes a Web `Headers` object. For middleware, call the framework's `next()` or equivalent inside the `context.with` callback, keeping awaited work and the existing middleware chain inside it, so later handlers and their spans inherit the extracted parent.

##### Sampling across services

When a request arrives with `traceparent`, Vercel combines the inbound decision with its own sampling rules. An unsampled parent drops the trace. A sampled parent is still dropped unless a Vercel rule also samples the request. Both services need matching collection rules for a connected trace. Manual SDK setup without `@vercel/otel` lacks session tracing and Trace Drains support. See [Vercel sampling behavior](https://vercel.com/docs/tracing/instrumentation#sampling-behavior).

##### Verify

Deploy both services, send one request through the caller, and inspect it with [inspection](inspection.md). The receiver's server span should share the caller's trace ID and sit under the caller's outbound span. If it starts a new trace, check the URL matcher first, then that the receiver extracts the context.

### File: `references/custom-spans.md`

#### Custom spans

Use this reference when framework spans do not expose the operation being investigated. Complete [SDK setup](instrumentation.md) first. To find which operation makes a request slow, follow [performance](performance.md).

Add one helper so every measured operation uses the same pattern. It uses `startActiveSpan`, so nested calls inherit the span's context:

```ts
import { SpanStatusCode, trace, type Attributes } from '@opentelemetry/api';

const tracer = trace.getTracer('checkout');

export function measure<T>(
  name: string,
  attributes: Attributes,
  operation: () => Promise<T>,
): Promise<T> {
  return tracer.startActiveSpan(name, { attributes }, async (span) => {
    try {
      return await operation();
    } catch (error) {
      if (error instanceof Error) span.recordException(error);
      span.setStatus({ code: SpanStatusCode.ERROR, message: error instanceof Error ? error.message : String(error) });
      throw error;
    } finally {
      span.end();
    }
  });
}
```

Wrap an existing operation without changing it:

```ts
import { measure } from './lib/measure';
import { chargePayment } from './payments';

export function checkout(orderId: string) {
  return measure('checkout.charge-payment', { 'order.id': orderId }, () => chargePayment(orderId));
}
```

Adapt the names, attributes, and imports to the application. Keep `await` inside the `try` so the span covers the full operation and catches rejected promises. The helper records exceptions, marks failed spans as errors with the error message, rethrows the original value, and ends the span in `finally`. `inspect` shows that message as `[error: <message>]`; the recorded exception is only in search JSON.

- Name spans `<area>.<operation>` with stable, low-cardinality names. Put IDs and sizes in attributes, not names.
- For CPU-bound synchronous work, wrap it in an `async` callback; the span still measures the full blocking time.
- Never record secrets, tokens, or personal data, and keep attributes small to avoid [truncation](troubleshooting.md#oversized-telemetry).

`startSpan` inherits the current context without becoming active. Use it when nested operations should keep their existing parent. Edge runtime functions do not support custom spans; use the Node.js runtime.

##### Verify after deployment

Deploy the change and exercise the operation using the chosen [collection mode](collection.md). Find the span through [search](search.md) and [inspect the trace](inspection.md) to confirm awaited calls appear beneath it. For a reproduced failure, confirm the error status with `inspect` and the recorded exception in search JSON at `.data.span.events`. See [Vercel custom spans](https://vercel.com/docs/tracing/instrumentation#adding-custom-spans).

### File: `references/inspection.md`

#### Inspect a trace

Use this reference after finding or capturing a representative request.

`vercel traces inspect` accepts either a trace ID or a request ID. A 32-character hexadecimal ID selects trace-ID lookup; any other ID selects request-ID lookup. Use a trace ID from `.data.span.traceId` in a JSON search result, or a request ID from logs, capture output, or `.data.span.attributes["vercel.request_id"]`. JSON Lines keeps routing-region prefixes on that attribute, such as `iad1::`; pass only the part after the last `::`, as the search table and `vercel traces create` do. Prefer the trace ID; not every span has a request ID. After a team search, pass the result's project and the same team:

```bash
vercel traces inspect 0870e4ead46aafba39ccfbcb001835db --scope my-team --project my-app
vercel traces inspect qb46r-1790847620933-1145d2891a3e --scope my-team --project my-app --json
vercel traces inspect 0870e4ead46aafba39ccfbcb001835db --scope my-team --project my-app --open --view=tree
```

`inspect` is the default subcommand, so `vercel traces <id>` does the same. `vercel traces get` still works but prints a deprecation warning; older CLIs only have `get`, which may accept request IDs only. Check `vercel traces --help` and use whichever subcommand it lists.

Without `--project`, `inspect` uses the linked project. Without a link, pass `--scope` and `--project`.

##### Output formats

- Default: a Markdown summary with the trace ID, request ID, endpoint, duration, span count, repeated operations (count, total, per-call time, and share of the root span), and a span tree with each span's duration, share, and start offset. Read this first; it often shows the slow or repeated operation directly.
- `--json`: the raw trace, with `traceId`, `rootSpanId`, and `spans[]`. Each span has `spanId`, `parentSpanId`, `name`, `attributes`, `status`, and `startTime` and `duration` as `[seconds, nanoseconds]` pairs. Progress lines go to stderr.
- `--open`: opens the dashboard. `--view` requires `--open`; `--open` cannot combine with `--json`.

`inspect` output omits span events, span kind, and resource attributes. Read `service.name` and recorded exceptions from [search](search.md#read-the-output) JSON (`.data.resource.attributes`, `.data.span.events`).

Expect platform spans next to application spans. Each outbound fetch appears twice: Vercel's `GET <host>/` span under the function span and the SDK's `fetch GET <url>` span under the active custom span. The SDK's export appears as `POST localhost/v1/traces`. The edge and function spans can share a name such as `GET /api/checkout`, so the repeated-operations table may count them as one repeated operation.

See [CLI retrieval](https://vercel.com/docs/cli/traces#inspect).

##### Choose the view

| View | Investigate |
| --- | --- |
| `timeline` | Duration, overlap, and sequential waits |
| `tree` | Parent-child relationships and which operation called another |
| `waterfall` | Hierarchy and timing together |

Use timing to identify waits on the request's critical path; concurrent spans overlap, so adding all span durations overstates elapsed request time. Relate expensive or failed operations to application code before changing it. See [trace views](https://vercel.com/docs/tracing#switching-between-trace-views).

Save representative trace IDs and observed timings for comparison after deployment. Compare equivalent routes, inputs, environments, load, and collection settings; a few traces do not establish a complete latency distribution.

A searchable ID does not guarantee retrieval. Read [lookup troubleshooting](troubleshooting.md#trace-lookup-returns-404) when `inspect` returns `Trace not found (404)`.

### File: `references/instrumentation.md`

#### Application SDK setup

Use this reference when framework and custom spans are needed, or when SDK registrations conflict. Infrastructure and outbound-fetch spans need no application OpenTelemetry setup; see [collection](collection.md).

##### Check existing setup

Check framework and adapter versions, SDK registration, and tracing flags. Enable built-in framework spans where available; they still need SDK and exporter setup to reach Vercel, unless Next.js 16.5+ [default tracing](nextjs.md) adds it. Extend the existing provider rather than registering a second one.

Install `@vercel/otel` and `@opentelemetry/api` with the application's package manager as needed. If the package manager does not install peer dependencies automatically, also install the peers listed by `npm view @vercel/otel peerDependencies`. Follow [Next.js](nextjs.md) or [SvelteKit](sveltekit.md) setup for those frameworks.

##### Integrate another framework

1. Identify the installed framework and adapter versions, target runtime, and how the affected route executes. Verify that the operation runs on the server for the requests being investigated; prerendered or cached responses may skip application code. Custom spans require a supported runtime.
2. Find the framework's native tracing flags and documented server startup, preload, or initialization hook. Use version-appropriate official docs; inspect adapter source when the integration is unclear. Record which entrypoint loads initialization and when it runs. A special filename alone does not prove it is loaded.
3. Wire one server-only SDK setup module, such as the one below, into that verified hook. Initialize automatic instrumentations before loading the libraries they instrument. See [OpenTelemetry initialization order](https://opentelemetry.io/docs/languages/js/instrumentation/#initialize-the-sdk).
4. Check whether the framework already establishes incoming trace context. When it does not, map its request headers and handler or middleware continuation to [context propagation](context-propagation.md#incoming-requests). Preserve existing middleware and configuration.
5. Build and verify the expected spans using the checks below. If no supported initialization path can be established, report the missing integration and source evidence before proceeding.

For a new SDK setup, a module such as `telemetry.ts` can contain:

```ts
import { registerOTel } from '@vercel/otel';

registerOTel({ serviceName: 'checkout' });
```

Import it from the verified server entrypoint or hook, adapting the relative path:

```ts
import './telemetry';
```

This import must execute in the deployed server runtime and register once per runtime instance. Keep it out of client bundles, using the framework's server-only file convention when it has one. See [Vercel instrumentation](https://vercel.com/docs/tracing/instrumentation).

Some adapters supply a default server entry when the project has none. Before creating that file to add the import, start from the adapter's documented template for Vercel so streaming and response handling keep working; a generic framework template can differ. If the file exists, add only the import line.

Without native framework spans, a slow loader or handler appears as one long function span; add [custom spans](custom-spans.md) around its operations.

##### Coexist with Sentry

Sentry v8+ initializes OpenTelemetry automatically, which can conflict with `@vercel/otel`. Decide which integration owns setup before changing it. When Vercel owns OpenTelemetry setup, merge `skipOpenTelemetrySetup: true` into the existing Sentry initialization:

```ts
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  skipOpenTelemetrySetup: true,
});
```

Use the application's existing Sentry package and preserve its other options. If Sentry tracing must also use the shared provider, follow [Sentry's custom OpenTelemetry integration](https://docs.sentry.io/platforms/javascript/guides/node/opentelemetry/custom-setup/); disabling its automatic setup alone does not implement that integration. See [Vercel's Sentry guidance](https://vercel.com/docs/tracing#using-custom-opentelemetry-setup-with-sentry).

##### Deploy and verify

1. Run the application's framework or adapter build and available type checks. A prompt to install a checker is not a completed check. When startup loading is uncertain, inspect emitted server output to confirm the setup module executes before the instrumented operation.
2. Verify the expected operation's span. Use native framework spans where available, or add a small [custom span](custom-spans.md). An isolated local exporter check can verify SDK initialization and parent context; it does not prove Vercel collection.
3. Deploy to preview or production and choose a [collection mode](collection.md). Exercise a server-executed operation, then [inspect its collected trace](inspection.md) in the same project and environment. Confirm the span's name, service, timing, and parent relationships; verify error status when reproducing a failure.

### File: `references/library-spans.md`

#### Library spans

Use this reference when the application depends on libraries that can emit their own spans, such as the AI SDK, the Flags SDK, Workflow, or database clients. Library spans reach Vercel through the provider that `registerOTel` registers; complete [SDK setup](instrumentation.md) first.

##### Check dependencies

Match `dependencies` in the application's `package.json`, or in each server app's `package.json` in a monorepo, against this table, and apply the row for each match. Registering `@vercel/otel` is enough only for the first two rows; the others emit no spans until they are turned on.

| Library | After `registerOTel` alone | Turn on |
| --- | --- | --- |
| Workflow (`workflow`) | Workflow runtime spans | Nothing to add; `WORKFLOW_TRACE_MODE` only changes how step traces link |
| SDKs that call HTTP APIs (OpenAI, Stripe, Upstash, Supabase) | Outbound HTTP spans | Nothing to add; they have no spans of their own |
| AI SDK 7 (`ai`) | No AI SDK spans | `registerTelemetry(new OpenTelemetry())` from `@ai-sdk/otel` |
| AI SDK 6 and earlier | No AI SDK spans | `experimental_telemetry: { isEnabled: true }` on each call |
| Flags SDK (`flags`) on Next.js | No flag spans | `setTracerProvider(trace)` |
| Database and cache clients (`pg`, `mysql2`, `ioredis`, `mongodb`, Prisma) | No query spans | An OpenTelemetry instrumentation package; Prisma 4.2 to 6.0 also needs `previewFeatures = ["tracing"]` in `schema.prisma` |

For other installed server libraries, check their docs or published `dist` for a telemetry option, a tracer setter, or an instrumentation package, and turn on any that exist. A dependency on `@opentelemetry/api` does not prove the library emits spans by default.

Report which library spans were turned on and which installed libraries have none.

##### Turn on built-in spans

When `ai` 7 is installed, install `@ai-sdk/otel`. Call each opt-in once in the same startup hook, after `registerOTel`. On Next.js, with both the AI SDK and the Flags SDK installed:

```ts
import { trace } from '@opentelemetry/api';
import { OpenTelemetry } from '@ai-sdk/otel';
import { registerOTel } from '@vercel/otel';
import { registerTelemetry } from 'ai';
import { setTracerProvider } from 'flags';

export function register() {
  registerOTel({ serviceName: process.env.VERCEL_PROJECT_NAME });
  registerTelemetry(new OpenTelemetry());
  setTracerProvider(trace);
}
```

AI SDK 7 then traces every call; pass `telemetry: { functionId: 'checkout-assistant' }` to name a call, or `telemetry: { isEnabled: false }` to skip one.

##### Add instrumentation packages

When a database or cache client is installed, install its instrumentation package: `@opentelemetry/instrumentation-<client>` for `pg`, `mysql2`, `ioredis`, and `mongodb`, or `@prisma/instrumentation` for Prisma. Pick the release whose `@opentelemetry/instrumentation` dependency fits the range in `npm view @vercel/otel peerDependencies`; the latest release can need a newer OpenTelemetry API than `@vercel/otel` supports and fail `next build`. Check a release with `npm view @opentelemetry/instrumentation-pg@<version> dependencies`. Pass it to `registerOTel` and keep `'auto'` in the list; the option replaces the default, so a list without `'auto'` or `'fetch'` drops outbound fetch spans:

```ts
import { registerOTel } from '@vercel/otel';

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { PgInstrumentation } = await import('@opentelemetry/instrumentation-pg');
    registerOTel({ serviceName: process.env.VERCEL_PROJECT_NAME, instrumentations: ['auto', new PgInstrumentation()] });
  } else {
    registerOTel({ serviceName: process.env.VERCEL_PROJECT_NAME });
  }
}
```

These packages run only in the Node.js runtime, and they patch a library when it loads, so the library must not be bundled. Next.js leaves `pg`, `mongodb`, `mongoose`, and `@prisma/client` unbundled by default; add other clients, such as `ioredis` and `mysql2`, to `serverExternalPackages` in `next.config`.

##### Verify after deployment

Deploy, exercise a route that calls the library, and [inspect its trace](inspection.md). Confirm the library's spans appear beneath the request and that outbound fetch spans are still present.

### File: `references/nextjs.md`

#### Next.js instrumentation

Use this reference when the application uses Next.js.

Projects created on or after November 5, 2026 that build on Vercel (not `--prebuilt`) with Next.js 16.5+, include a Node.js function, and haven't turned tracing off get default tracing. After the first successful build, Vercel adds one sampling rule tracing 100% of requests in all environments, and adds `@vercel/otel` to each build for framework spans. Spans use the project name as the service name; set the `OTEL_SERVICE_NAME` environment variable to change it. The default rule matches every request first, so read [rule matching](configuration.md#rule-matching) before adding rules. Removing every sampling rule turns tracing off and stops the injection from the next deployment; Vercel doesn't re-add the default rule, but adding any sampling rule turns tracing back on and resumes the injection from the next deployment. See [default tracing](https://vercel.com/docs/tracing/configure-tracing#default-tracing-for-new-next.js-projects).

Vercel doesn't add `@vercel/otel` when the project has its own `instrumentation` file (in the project, `src`, or a monorepo parent folder), uses `@opentelemetry/api` 1.10+ directly or through another package, or sets `instrumentationInject` in its Next.js config, directly or through a plugin. Tracing still collects infrastructure spans, but framework spans then need the setup below. Custom and library spans need it even under default tracing.

Check [SDK ownership](instrumentation.md) before registering OpenTelemetry, and install `@vercel/otel` and `@opentelemetry/api` as described there. Put `instrumentation.ts` at the project root, or in `src` if the application uses it. Under default tracing, Vercel stops adding `@vercel/otel` once this file exists, and `VERCEL_PROJECT_NAME` keeps the service name unchanged:

```ts
import { registerOTel } from '@vercel/otel';

export function register() {
  registerOTel({ serviceName: process.env.VERCEL_PROJECT_NAME });
}
```

Instrumentation is [stable in Next.js 15+](https://nextjs.org/docs/app/api-reference/file-conventions/instrumentation#version-history). For older versions, check that version's instrumentation-hook requirements before adding configuration.

Next.js already emits framework spans and, from 14.0.1, extracts incoming trace context. To include additional spans, optionally set this environment variable on the target deployment and redeploy:

```dotenv
NEXT_OTEL_VERBOSE=1
```

This expands span detail; it does not replace SDK setup or Vercel sampling. See [Next.js OpenTelemetry](https://nextjs.org/docs/app/guides/open-telemetry).

Prerendered routes run no server code and produce no server spans. If `next.config` enables `cacheComponents`, call `await connection()` from `next/server` in route handlers and pages you trace, wrapping page content that awaits it in `<Suspense>`. Confirm that `next build` marks the route dynamic (`ƒ`) or partially prerendered (`◐`).

Deploy the change to preview or production, then verify [collection](collection.md) and exercise the affected route.

### File: `references/performance.md`

#### Measure and improve performance with custom spans

Use this reference when a user wants to make a server route, API, function, or server-rendered page faster. Measure first: wrap each suspected operation in a custom span, deploy, read exact durations from traces, change the slowest operation on the critical path, then measure again. Do not optimize from intuition or from total request time alone.

This only works for routes that run server code on each request. Static and prerendered pages and CDN cache hits produce no server spans, so tracing cannot speed them up. Browser rendering, bundle size, and Core Web Vitals need browser profiling, not server spans.

##### 1. Pick the request and list its operations

1. Identify the slow route or function, its environment, and an example input. Find recent slow requests with [search](search.md) when collection is already on:

   ```bash
   vercel traces search --scope my-team --project my-app --environment production --query 'span.duration > 1000' --kind server --since 1h --json
   ```

2. Read the handler and list each awaited operation that could cost time: database queries, external API calls, cache reads, file or blob I/O, rendering, serialization, and CPU-heavy loops. Note which run sequentially and which run in parallel.
3. Check what is already measured. Automatic outbound-fetch spans time the function's outbound HTTP requests; Next.js emits route and render spans once [instrumented](instrumentation.md). Turn on [library spans](library-spans.md) for installed libraries that are missing them, such as AI SDK calls or database queries. Add custom spans only for operations that are not already visible.

##### 2. Wrap each operation in a span

Add the `measure` helper from [custom spans](custom-spans.md), then wrap the operations in the existing handler, keeping their order and concurrency:

```ts
import { measure } from './lib/measure';

const user = await measure('checkout.load-user', { 'user.id': userId }, () => getUser(userId));
const [cart, prices] = await Promise.all([
  measure('checkout.load-cart', { 'cart.id': cartId }, () => getCart(cartId)),
  measure('checkout.fetch-prices', { 'price.count': skus.length }, () => fetchPrices(skus)),
]);
const order = await measure('checkout.create-order', {}, () => createOrder(user, cart, prices));
```

Adapt names and calls to the application, following the naming and attribute rules in [custom spans](custom-spans.md). For measurement:

- Add attributes that explain cost, such as row counts, payload bytes, or item counts.
- Wrap operations, not tight inner loops; time the whole loop once instead.

##### 3. Collect durations from deployed traffic

Local timing does not reflect Vercel regions, cold starts, or network distance. Deploy to preview, or production when authorized, then capture requests:

```bash
vercel traces create /api/checkout --deployment https://my-app-abc123.vercel.app --scope my-team --json
```

Repeat the capture several times with the same input to see variance, or let always-on tracing gather real traffic. Then read the measured spans. `span.duration` is in milliseconds:

```bash
vercel traces search --scope my-team --project my-app --query 'span.name:checkout.*' --since 1h --limit 500 --json \
  | jq -r 'select(.type == "span") | [.data.span.name, .data.span.duration] | @tsv'
```

The final `summary` line reports `pagination.hasMore`; when it is `true`, continue with `--next` before treating the durations as complete. See [search](search.md#read-the-output).

For one request, start with the default [summary](inspection.md#output-formats):

```bash
vercel traces inspect 0870e4ead46aafba39ccfbcb001835db --scope my-team --project my-app
```

To sort every span by duration, use `--json`, which reports durations as `[seconds, nanoseconds]`:

```bash
vercel traces inspect 0870e4ead46aafba39ccfbcb001835db --scope my-team --project my-app --json 2>/dev/null \
  | jq -r '.spans[] | [((.duration[0] * 1000) + (.duration[1] / 1e6)), .name] | @tsv' | sort -rn
```

To see which spans are sequential, add `--open --view=waterfall`; see [inspection](inspection.md#choose-the-view).

##### 4. Find the operation to change

- Fix the critical path. A slow span that overlaps a slower one does not shorten the request.
- Compare each span with its parent. A large gap between the parent's duration and its children means unmeasured work: add another span there and measure again before changing code.
- Look for these common causes: sequential awaits that could run in parallel, the same query or fetch repeated per item (N+1), uncached repeated calls, large payloads, and cold connections to a database or API.
- Write down a baseline for each key span from equivalent requests: route, input, environment, and request count. A few samples are not a full latency distribution; say how many you used.

##### 5. Change one thing and compare

Change the slowest operation on the critical path, keep its span in place, deploy, and capture equivalent requests with the same input and collection settings. Report before and after durations for that span and for the whole request, the sample counts, and any errors. If the fix ships before deployed numbers exist, name the spans to compare and the expected result, for example "`checkout.handler` should drop from about the sum of the three child spans to about the longest one." If the time moved to another span instead of disappearing, say so.

Keep spans that will be useful later. Remove only noisy, temporary spans after the investigation.

### File: `references/search.md`

#### Span search reference

Use this reference to find slow or failed spans across a team or project. Verify [collection](collection.md) for the spans and projects under investigation. Use `vercel traces search --help` or the [CLI reference](https://vercel.com/docs/cli/traces#search) for the full filter, field, and column list.

##### Select the team and project

Search covers all projects in the selected team, even from a linked project directory. `--project` restricts search to one project. Pass `--scope <team>`, and ask the user which team if you don't know it: since CLI 64.0.2, agents ignore the team saved by `vercel switch`, and `vercel switch` itself is refused (`agent_cannot_switch`). `inspect` and `config` still operate on a single project.

##### Find slow or failed requests

Use the affected project, environment, and time window:

```bash
vercel traces search --scope my-team --project my-app --environment production --status error --since 1h --json
vercel traces search --scope my-team --project my-app --environment production --query 'span.duration > 2000' --since 1h --json
vercel traces search --scope my-team --project my-app --environment production --query 'http.route:"/api/checkout"' --kind server --since 1h --json
```

Direct filters and `--query` combine with AND. KQL is field-based, not full-text, and the CLI does not normalize values:

- `span.duration` is in milliseconds.
- `span.status.code` uses `Error`, `Ok`, or `Unset`.
- `span.kind` uses OTLP values 0–5 (2 server, 3 client), which differ from the JavaScript SDK's enum values.
- Other field names search span attributes first, then resource attributes, for example `http.status_code >= 500`.

A rejected query is an error, not evidence of zero matching spans.

##### Limits the CLI enforces

- Defaults are the last hour and 100 spans; `--limit` accepts 1–1000.
- `--since` must be within the last 30 days, and the window cannot exceed 30 days. Actual retention can be shorter.
- ISO timestamps need `Z` or an offset; dates mean midnight UTC.
- Results are newest first. Duration filters do not sort by duration.
- Search always excludes internal-kind spans (`span.kind` 1) from services whose names start with `vercel.`. Those spans can appear in `inspect` and the dashboard without appearing in search.

##### Read the output

In non-interactive mode, the default when the CLI detects an agent, search prints JSON Lines even without `--json`, and `--columns` is rejected. Each span is a `{"type":"span","data":{...}}` line, and the output ends with a `summary` line holding `recordsReturned`, `timeRange`, `pagination: { hasMore, next }`, and `excludedIntervals`. Read spans under `.data`, for example `jq 'select(.type == "span") | .data.span.name'`:

- Trace ID: `.data.span.traceId`
- Span attributes: `.data.span.attributes`; events: `.data.span.events`; resource attributes: `.data.resource.attributes`
- Request ID: `.data.span.attributes["vercel.request_id"]`. It can carry routing-region prefixes, such as `iad1::`; strip them before passing it to `inspect`, for example `jq -r 'select(.type == "span") | .data.span.attributes["vercel.request_id"] // empty | split("::") | last'`

CLI versions before 64 print bare `{ span, resource }` objects with no summary line or `--next`; check `vercel traces search --help`.

After a team search, [inspect](inspection.md) the result's trace ID with its project via `--project` and the same team via `--scope`.

Before concluding that a span does not exist, check the summary's `pagination.hasMore` and `excludedIntervals`. To read more, pass `pagination.next` to `--next` rather than raising `--limit` or widening the window. The cursor keeps the original project, filters, and window: repeat only `--scope` and optionally `--limit`, because the CLI rejects other search flags alongside `--next`. A summary with `recordsReturned: 0` is a successful search with no matches.

Use [inspection](inspection.md) for request retrieval and [troubleshooting](troubleshooting.md) for missing spans or lookup failures.

### File: `references/sveltekit.md`

#### SvelteKit instrumentation

Use this reference when the application uses SvelteKit. Check [SDK ownership](instrumentation.md) before registering OpenTelemetry.

With `tracing.server` enabled, SvelteKit emits `sveltekit.handle.root`, `sveltekit.resolve`, `sveltekit.load`, `sveltekit.form_action`, and `sveltekit.remote.*` spans; `+server` handlers run inside `sveltekit.resolve`. It also extracts incoming trace context. Without `tracing.server`, custom spans start separate traces instead of joining the request.

On SvelteKit 3, merge `tracing` into the existing `sveltekit()` plugin options in `vite.config.js`, preserving the adapter and other settings. SvelteKit loads `src/instrumentation.server.ts` automatically when it exists:

```js
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [sveltekit({ tracing: { server: true } })],
});
```

On SvelteKit 2.31+, both options are experimental and live in `svelte.config.js`:

```js
export default {
  kit: {
    experimental: {
      tracing: { server: true },
      instrumentation: { server: true },
    },
  },
};
```

Initialize Vercel's SDK in `src/instrumentation.server.ts`:

```ts
import { registerOTel } from '@vercel/otel';

registerOTel({ serviceName: 'checkout' });
```

`instrumentation.server.ts` loads before application code. `@sveltejs/adapter-vercel` 7, for SvelteKit 3, no longer supports the Edge runtime and picks the Node.js runtime from the build's Node version; build with Node 22 or 24, or set `adapter({ runtime: 'nodejs24.x' })`. See [SvelteKit observability](https://svelte.dev/docs/kit/observability) and [migrating to SvelteKit 3](https://svelte.dev/docs/kit/migrating-to-sveltekit-3#Observability).

Deploy the change to preview or production, then verify [collection](collection.md) and exercise the affected route.

### File: `references/troubleshooting.md`

#### Missing or incomplete traces

Use this reference when search is empty, retrieval fails, or expected span details are missing.

##### Search returns no spans

1. Confirm `vercel traces --help` lists `search`. Distinguish authentication or API errors and rejected KQL from successful empty results.
2. Check the selected team, project, environment, and query window. Search is team-wide unless `--project` is provided; retention may be shorter than accepted time bounds.
3. Verify [collection](collection.md) and traffic after it was enabled. For always-on tracing, check first-match rules, excluded paths, and the inbound sampling decision. For targeted capture, check that the request or session was captured.
4. Check deployed [instrumentation](instrumentation.md) for framework and custom spans. Under Next.js 16.5+ [default tracing](nextjs.md), Vercel skips adding `@vercel/otel`, and framework spans go missing, when the project has an `instrumentation` file that doesn't call `registerOTel`, depends on `@opentelemetry/api` 1.10+ directly or through another package, or has an `instrumentationInject` entry. Incoming context and competing SDK providers can prevent collection; see [propagation](context-propagation.md).
5. Check the telemetry limits below and the [search limits](search.md#limits-the-cli-enforces): search hides internal-kind spans from `vercel.*` services, which still appear in `inspect`. Custom spans from Edge runtime functions do not appear in traces.

##### Library or fetch spans are missing

- A library emits no spans after `registerOTel`: most need an opt-in; see [library spans](library-spans.md).
- Outbound fetch spans disappeared after adding `instrumentations` to `registerOTel`: the option replaces the default, so add `'auto'` back to the list.
- The build log reports `Detected OpenTelemetry dependency`, but no fetch spans appear: Vercel leaves fetch spans to the application when it finds `@vercel/otel`, `@opentelemetry/api`, or `@opentelemetry/sdk-trace-node`. Confirm that `registerOTel` runs in the deployed runtime, or remove the unused OpenTelemetry packages.

##### Inspect returns the wrong trace

When `inspect <requestId>` shows `Endpoint: <unknown>`, only a few spans, or custom spans as roots, find the request's own trace: run `vercel traces search --request-id <id> --project <project> --json`, take the `.data.span.traceId` of the `GET <path>` span, and inspect that trace ID. Two causes:

- Startup spans share the request ID. Next.js emits `register instrumentation` and `prepare route module` as separate root traces.
- The app does not extract incoming context, so each custom span starts its own trace and the request's trace has none. Enable `tracing.server` on SvelteKit, or follow [context propagation](context-propagation.md#incoming-requests) for other frameworks.

##### Trace lookup returns 404

A searchable ID does not guarantee `inspect` can retrieve it; the CLI prints `Trace not found (404)` and exits 1. Request-ID lookup needs a matching root span in the same project within 30 minutes after the request-ID timestamp. Retry with the span's trace ID (`.data.span.traceId` in search JSON), which skips that request-ID resolution. Verify the ID, team, and the result's project. A missing root can cause 404; do not automatically attribute it to retention.

##### Oversized telemetry

`inspect` warns `Trace is incomplete because it exceeded the span limit.` when it returns a partial trace; treat its span tree and repeated-operation counts as incomplete. Spans over 1 MB compressed can have large attributes truncated; `<attribute_name>.truncated: true` identifies affected values. Spans still over 1 MB after truncation are dropped. Each traced request is limited to 10 MB compressed.

Inspect span attributes for truncation markers. Reduce large payload attributes in the instrumentation and deploy before reproducing; sampling changes do not fix oversized telemetry. See [attribute truncation](https://vercel.com/docs/tracing#attribute-truncation) and [trace limits](https://vercel.com/docs/tracing#limitations).

For current retention and pricing, consult [collection documentation](https://vercel.com/docs/tracing/configure-tracing) rather than assuming the CLI's accepted window is retained.
