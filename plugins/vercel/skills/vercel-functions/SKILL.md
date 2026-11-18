---
name: vercel-functions
description: Vercel Functions expert guidance — Node.js/Bun/Python runtimes, Fluid Compute, long-duration (30 min) functions, large functions (5 GB bundles), Docker/OCI container images, plan limits, streaming, WebSockets, and legacy Cron Jobs (new scheduled work belongs to vercel-schedules). Use when configuring, debugging, or optimizing server-side code running on Vercel.
summary: "Vercel Functions run on Fluid Compute with Node.js as the default runtime — strongly prefer it over `runtime = 'edge'` (Vercel recommends migrating off Edge, and Next.js 16.3+ no longer supports it). Duration: 300s default on every plan including Hobby, 800s max on Pro/Enterprise, 1800s (30 min) per-function in the extended beta; beyond that use Vercel Workflow. Bundles: 250 MB standard (500 MB Python), 5 GB via the large functions beta (`VERCEL_SUPPORT_LARGE_FUNCTIONS=1`). Request/response bodies cap at 4.5 MB. Memory is dashboard-only (Standard 2 GB/1 vCPU, Performance 4 GB/2 vCPU; Hobby fixed). Docker works: add `Dockerfile.vercel` to run an OCI image as an autoscaling, stateless, scale-to-zero Function."
metadata:
  priority: 8
  docs:
    - "https://vercel.com/docs/functions"
    - "https://vercel.com/docs/functions/runtimes"
    - "https://vercel.com/docs/functions/limitations"
    - "https://vercel.com/docs/functions/configuring-functions/duration"
    - "https://vercel.com/docs/functions/runtimes/container"
    - "https://vercel.com/docs/fluid-compute"
    - "https://vercel.com/docs/functions/websockets"
  sitemap: "https://vercel.com/sitemap.xml"
  pathPatterns:
    - 'api/**/*.*'
    - 'pages/api/**'
    - 'src/pages/api/**'
    - 'app/**/route.*'
    - 'src/app/**/route.*'
    - 'apps/*/api/**/*.*'
    - 'apps/*/app/**/route.*'
    - 'apps/*/src/app/**/route.*'
    - 'apps/*/pages/api/**'
    - 'vercel.json'
    - 'apps/*/vercel.json'
    - 'vercel.ts'
    - 'apps/*/vercel.ts'
    # Vercel builds `Dockerfile.vercel` / `Containerfile.vercel` into a
    # container-image Function, so these are Functions config, not generic Docker.
    - 'Dockerfile.vercel'
    - '*/Dockerfile.vercel'
    - 'Containerfile.vercel'
    - '*/Containerfile.vercel'
  bashPatterns:
    - '\bvercel\s+dev\b'
    - '\bvercel\s+logs\b'
    - '\bvercel\s+vcr\b'
  importPatterns:
    - 'ws'
    - 'socket.io'
    - 'socket.io-client'
  promptSignals:
    phrases:
      - "websocket"
      - "websockets"
      - "web socket"
      - "socket.io"
      # Polling is the classic technique people reach for when they think Vercel
      # lacks websockets. We intentionally do NOT trigger on named third-party
      # services (Pusher, PubNub, Ably) — those are deliberate choices, not a
      # signal that someone is working around a missing feature.
      - "long polling"
      - "long-polling"
      # Duration: people hit the ceiling and ask about it in these words.
      - "maxduration"
      - "max duration"
      - "function timeout"
      - "function times out"
      - "long-running function"
      - "long running function"
      - "504"
      # Bundle size: the 250 MB error message is the usual entry point.
      - "unzipped maximum size"
      - "250mb"
      - "250 mb"
      - "large function"
      - "bundle size limit"
      # Containers: Dockerfile.vercel is a Functions feature, not just packaging.
      - "dockerfile"
      - "container image"
      - "container registry"
      - "runtime edge"
      - "edge runtime"
    allOf:
      - ["docker", "vercel"]
      - ["hobby", "limit"]
    anyOf:
      - "realtime"
      - "bidirectional"
      - "ws server"
      - "polling"
      - "server-sent events"
      - "fluid compute"
      - "active cpu"
    noneOf: []
    minScore: 6
validate:
  -
    pattern: export\s+default\s+function
    message: 'Use named exports (GET, POST, PUT, DELETE) instead of default export for route handlers'
    severity: error
    # Skip on App Router page / layout / loading / error / not-found / sitemap / template / default files,
    # which require a default export by Next.js convention. Detected via the 'use client' directive,
    # an App Router config export (metadata, dynamic, revalidate, fetchCache, runtime), an `export default
    # function` whose name matches an App Router file (Page / Layout / Loading / etc.), or any JSX
    # element with a capitalised component tag — all signals that the file is a page-style file rather
    # than a route handler. See anthropics/claude-code#54989.
    skipIfFileContains: "(?:^|\\n)\\s*['\"]use\\s+client['\"]|export\\s+const\\s+(?:metadata|dynamic|revalidate|fetchCache|runtime)\\b|export\\s+default\\s+(?:async\\s+)?function\\s+\\w*(?:Page|Layout|Loading|Error|NotFound|Sitemap|Template|Default|sitemap|robots|opengraph|manifest)\\b|<[A-Z][A-Za-z0-9]*|\\{\\s*children\\s*[,}:]|MetadataRoute\\.|from\\s+['\"]next/(?:font|image|link|navigation|headers|cookies)['\"]"
  -
    pattern: NextApiRequest|NextApiResponse
    message: 'NextApiRequest/NextApiResponse are Pages Router types — use Web API Request/Response'
    severity: error
  -
    # Vercel's docs recommend migrating off the Edge runtime, and Next.js 16.3+
    # doesn't support it. Surfaced as a recommendation rather than an error:
    # existing Edge functions still work, so this is a nudge, not a blocker.
    # Matches `"runtime": "edge"` in vercel.json too.
    pattern: 'runtime[''"]?\s*[=:]\s*[''"]edge[''"]'
    message: 'Consider dropping `runtime = "edge"`. Vercel recommends migrating from Edge to Node.js, and Next.js 16.3+ no longer supports it. Node.js on Fluid Compute runs in the same regions at the same price with full Node.js APIs, longer durations, and larger bundles.'
    severity: recommended
  -
    pattern: 'from\s+[''"](openai|@anthropic-ai/sdk|anthropic)[''"]|new\s+(OpenAI|Anthropic)\('
    message: 'Direct AI provider SDK detected in route handler. Use the Vercel AI SDK for streaming, tools, and provider abstraction.'
    severity: recommended
    upgradeToSkill: ai-sdk
    upgradeWhy: 'Replace vendor-locked provider SDKs with @ai-sdk/openai or @ai-sdk/anthropic for unified streaming and tool support.'
    skipIfFileContains: '@ai-sdk/|from\s+[''"](ai)[''"]|import.*from\s+[''"](ai)[''"]|streamText|generateText'
  -
    pattern: 'setTimeout\s*\(|setInterval\s*\(|await\s+new\s+Promise\s*\([^)]*setTimeout'
    message: 'Long-running or polling logic detected in a serverless handler. Functions have execution time limits.'
    severity: recommended
    upgradeToSkill: workflow
    upgradeWhy: 'Move delayed/polling logic to Vercel Workflow for durable execution with pause, resume, retries, and crash safety.'
    skipIfFileContains: 'use workflow|use step'
  -
    pattern: 'writeFile(Sync)?\(|createWriteStream\(|from\s+[''"](multer|formidable)[''"]|fs\.writeFile'
    message: 'Local filesystem write detected. Serverless functions have ephemeral, read-only filesystems.'
    severity: error
    upgradeToSkill: vercel-storage
    upgradeWhy: 'Replace local filesystem writes with Vercel Blob, Neon, or Upstash for persistent, platform-native storage.'
    skipIfFileContains: '@vercel/blob|@upstash/|@neondatabase/'
  -
    pattern: 'export\s+(async\s+)?function\s+(GET|POST|PUT|PATCH|DELETE)\b'
    message: 'Route handler has no observability instrumentation. Add logging and error tracking for production debugging.'
    severity: warn
    skipIfFileContains: 'console\.error|logger\.|captureException|Sentry|@vercel/otel|withTracing'
  -
    pattern: 'from\s+[''""](lru-cache|node-cache|memory-cache)[''""]|new\s+(LRUCache|NodeCache|Map)\(\s*\).*cache'
    message: 'In-process memory cache detected in serverless function. Process memory is not shared across invocations.'
    severity: recommended
    upgradeToSkill: runtime-cache
    upgradeWhy: 'Replace in-process caches with Vercel Runtime Cache (getCache from @vercel/functions) for region-aware caching that persists across invocations.'
    skipIfFileContains: 'getCache|from\s+[''""]\@vercel/functions[''""]'
  -
    pattern: 'maxRetries\s*[=:]|retryCount\s*[=:]|retry\s*\(\s*|for\s*\([^)]*retry|while\s*\([^)]*retry'
    message: 'Manual retry logic detected. Use Vercel Workflow SDK for automatic retries with durable execution.'
    severity: recommended
    upgradeToSkill: workflow
    upgradeWhy: 'Replace manual retry loops with Workflow SDK steps that provide automatic retries, crash safety, and observability.'
    skipIfFileContains: 'use workflow|use step|from\s+[''""](workflow)[''""]'
  -
    pattern: 'from\s+[''"](express)[''""]|require\s*\(\s*[''"](express)[''""\)]'
    message: 'Express.js detected in a Vercel project. Express deploys with zero configuration (default export or `app.listen`), but `express.static()` is ignored — serve static assets from `public/**`.'
    severity: recommended
    upgradeToSkill: vercel-functions
    upgradeWhy: 'If this is a Next.js app, prefer Route Handlers (export async function GET/POST) over a separate Express server; a standalone Express app deploys as-is and becomes a single Vercel Function on Fluid Compute.'
    skipIfFileContains: 'export\s+(async\s+)?function\s+(GET|POST|PUT|PATCH|DELETE)|from\s+[''""](next/server|@vercel/functions)[''""]'
retrieval:
  aliases:
    - serverless functions
    - api routes
    - edge functions
    - lambda
    - websockets
    - socket.io
    - docker
    - dockerfile
    - container images
    - function timeout
    - max duration
    - bundle size
    - hobby limits
  intents:
    - create serverless function
    - configure function runtime
    - optimize cold starts
    - add api route
    - serve a websocket connection
    - run a function for longer than 5 minutes
    - deploy a dockerfile
    - fix a function that exceeds the bundle size limit
    - check plan limits for functions
  entities:
    - Serverless Functions
    - Edge Functions
    - Fluid Compute
    - Long-duration functions
    - Large functions
    - Container Images
    - Vercel Container Registry
    - streaming
    - WebSockets
    - Cron Jobs
chainTo:
  -
    pattern: 'from\s+[''\"](openai|@anthropic-ai/sdk|anthropic)[''"]|new\s+(OpenAI|Anthropic)\('
    targetSkill: ai-sdk
    message: 'Direct AI provider SDK in route handler — loading AI SDK guidance for unified streaming and tool support.'
  -
    pattern: 'setTimeout\s*\(|setInterval\s*\(|await\s+new\s+Promise\s*\([^)]*setTimeout'
    targetSkill: workflow
    message: 'Long-running or polling logic in serverless handler — loading Workflow SDK for durable execution.'
  -
    pattern: 'writeFile(Sync)?\(|createWriteStream\(|from\s+[''\"](multer|formidable)[''"]|fs\.writeFile'
    targetSkill: vercel-storage
    message: 'Local filesystem write in serverless function — loading Vercel Storage guidance for platform-native persistence.'
  -
    pattern: 'from\s+[''""]@vercel/(postgres|kv)[''""]'
    targetSkill: vercel-storage
    message: '@vercel/postgres and @vercel/kv are sunset — loading Vercel Storage guidance for Neon and Upstash migration.'
  -
    pattern: 'generateObject\s*\(|streamObject\s*\(|toDataStreamResponse|maxSteps\b|CoreMessage\b'
    targetSkill: ai-sdk
    message: 'Deprecated AI SDK v5 API detected — loading AI SDK guidance for migration.'
  -
    pattern: 'while\s*\(\s*true\s*\)\s*\{|for\s*\(\s*;\s*;\s*\)\s*\{|setInterval\s*\(\s*async'
    targetSkill: workflow
    message: 'Polling loop in serverless function detected — loading Workflow SDK for durable, crash-safe execution with pause/resume.'
    skipIfFileContains: "use workflow|use step|from\\s+['\"]workflow['\"]"
  -
    pattern: "from\\s+['\"]express['\"]|require\\s*\\(\\s*['\"]express['\"]"
    targetSkill: vercel-functions
    message: 'Express.js detected — loading Vercel Functions guidance (an Express app deploys as a single Vercel Function on Fluid Compute; express.static() is ignored, use public/**).'
    skipIfFileContains: "export\\s+(async\\s+)?function\\s+(GET|POST|PUT|PATCH|DELETE)"
  -
    pattern: 'from\s+[''""](lru-cache|node-cache|memory-cache)[''""]|new\s+(LRUCache|NodeCache|Map)\(\s*\).*cache'
    targetSkill: runtime-cache
    message: 'In-process memory cache in serverless function — loading Runtime Cache guidance for region-aware caching that persists across invocations.'
    skipIfFileContains: 'getCache|from\s+[''""]\@vercel/functions[''""]'
  -
    pattern: 'maxRetries\s*[=:]|retryCount\s*[=:]|retry\s*\(\s*|for\s*\([^)]*retry|while\s*\([^)]*retry'
    targetSkill: workflow
    message: 'Manual retry logic in serverless handler — loading Workflow SDK guidance for automatic retries with durable execution.'
    skipIfFileContains: 'use workflow|use step|from\s+[''""](workflow)[''""]'

  -
    pattern: 'import\s*\{[^}]*\bmetric\b[^}]*\}\s*from\s*[''"]@vercel/functions[''"]'
    targetSkill: custom-metrics
    message: '@vercel/functions metric() detected — loading Custom Metrics guidance for naming, attributes, and vc metrics queries.'
  -
    pattern: '@vercel/otel'
    targetSkill: vercel-tracing
    message: '@vercel/otel detected — loading Vercel Tracing guidance for instrumentation, sampling, and span inspection.'

---

# Vercel functions

1. Identify the deployed runtime, build output and exact symptom. Check the plan limits that apply to the actual project.
2. Choose the deployment, logging, streaming, Python, Node.js, Fluid Compute or performance section. Verify the behavior in the intended environment.

Read the relevant section of the [full guide](guide.md) before applying its examples.
