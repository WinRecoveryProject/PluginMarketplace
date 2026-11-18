---
name: observability
description: Vercel Observability expert guidance — Drains (logs, traces, speed insights, web analytics), Web Analytics, Speed Insights, runtime logs, custom events, OpenTelemetry integration, and monitoring dashboards. Use when instrumenting, debugging, or optimizing application performance and user experience on Vercel.
metadata:
  priority: 6
  docs:
    - "https://vercel.com/docs/observability"
    - "https://vercel.com/docs/observability/otel-overview"
  sitemap: "https://vercel.com/sitemap/docs.xml"
  pathPatterns:
    - 'instrumentation.ts'
    - 'instrumentation.js'
    - 'src/instrumentation.ts'
    - 'src/instrumentation.js'
    - 'app/layout.*'
    - 'src/app/layout.*'
    - 'pages/_app.*'
    - 'src/pages/_app.*'
    - 'apps/*/instrumentation.ts'
    - 'apps/*/instrumentation.js'
    - 'apps/*/app/layout.*'
    - 'apps/*/src/app/layout.*'
    - 'apps/*/pages/_app.*'
    - 'apps/*/src/pages/_app.*'
    - 'sentry.client.config.*'
    - 'sentry.server.config.*'
    - 'sentry.edge.config.*'
  bashPatterns:
    - '\bvercel\s+logs?\b'
    - '\bvercel\s+logs?\s+.*--follow\b'
    - '\bvercel\s+logs?\s+.*--level\b'
    - '\bvercel\s+logs?\s+.*--since\b'
    - '\bcurl\s+.*deployments.*events\b'
    - '\bnpm\s+(install|i|add)\s+[^\n]*@vercel/analytics\b'
    - '\bpnpm\s+(install|i|add)\s+[^\n]*@vercel/analytics\b'
    - '\bbun\s+(install|i|add)\s+[^\n]*@vercel/analytics\b'
    - '\byarn\s+add\s+[^\n]*@vercel/analytics\b'
    - '\bnpm\s+(install|i|add)\s+[^\n]*@vercel/speed-insights\b'
    - '\bpnpm\s+(install|i|add)\s+[^\n]*@vercel/speed-insights\b'
    - '\bbun\s+(install|i|add)\s+[^\n]*@vercel/speed-insights\b'
    - '\byarn\s+add\s+[^\n]*@vercel/speed-insights\b'
    - '\bnpm\s+(install|i|add)\s+[^\n]*@sentry/nextjs\b'
    - '\bpnpm\s+(install|i|add)\s+[^\n]*@sentry/nextjs\b'
    - '\bbun\s+(install|i|add)\s+[^\n]*@sentry/nextjs\b'
    - '\byarn\s+add\s+[^\n]*@sentry/nextjs\b'
    - '\bnpm\s+(install|i|add)\s+[^\n]*@sentry/node\b'
    - '\bpnpm\s+(install|i|add)\s+[^\n]*@sentry/node\b'
    - '\bbun\s+(install|i|add)\s+[^\n]*@sentry/node\b'
    - '\byarn\s+add\s+[^\n]*@sentry/node\b'
    - '\bnpm\s+(install|i|add)\s+[^\n]*@datadog/browser-rum\b'
    - '\bpnpm\s+(install|i|add)\s+[^\n]*@datadog/browser-rum\b'
    - '\bbun\s+(install|i|add)\s+[^\n]*@datadog/browser-rum\b'
    - '\byarn\s+add\s+[^\n]*@datadog/browser-rum\b'
    - '\bnpm\s+(install|i|add)\s+[^\n]*\bcheckly\b'
    - '\bpnpm\s+(install|i|add)\s+[^\n]*\bcheckly\b'
    - '\bbun\s+(install|i|add)\s+[^\n]*\bcheckly\b'
    - '\byarn\s+add\s+[^\n]*\bcheckly\b'
    - '\bnpm\s+(install|i|add)\s+[^\n]*\bnewrelic\b'
    - '\bpnpm\s+(install|i|add)\s+[^\n]*\bnewrelic\b'
    - '\bbun\s+(install|i|add)\s+[^\n]*\bnewrelic\b'
    - '\byarn\s+add\s+[^\n]*\bnewrelic\b'
  promptSignals:
    phrases:
      - "add logging"
      - "add logs"
      - "set up logging"
      - "setup logging"
      - "configure logging"
      - "structured logging"
      - "log drain"
      - "log drains"
      - "vercel analytics"
      - "speed insights"
      - "web analytics"
      - "opentelemetry"
      - "otel"
      - "instrumentation"
      - "monitoring"
      - "set up monitoring"
      - "add observability"
      - "track errors"
      - "error tracking"
      - "sentry"
      - "datadog"
      - "check the logs"
      - "show me the error"
      - "what went wrong"
      - "where did it fail"
      - "show me the logs"
      - "find the error"
      - "why did it fail"
      - "debug the error"
    allOf:
      - [add, logging]
      - [add, monitoring]
      - [set up, logs]
      - [configure, analytics]
      - [vercel, logs]
      - [vercel, analytics]
      - [track, performance]
      - [track, errors]
    anyOf:
      - "logging"
      - "monitoring"
      - "analytics"
      - "observability"
      - "telemetry"
      - "traces"
      - "metrics"
      - "debug"
      - "debugging"
      - "stuck"
      - "hanging"
      - "hung"
      - "waiting"
      - "stalled"
      - "spinning"
      - "timeout"
      - "slow"
      - "pending"
      - "unresponsive"
    minScore: 6
---

# Observability

1. Locate the existing Vercel project and deployment. Choose the relevant guide section for runtime logs, Web Analytics, Speed Insights, OpenTelemetry or drains.
2. Verify data sources, approved destinations and plan constraints. Use the connected App for project-scoped inspection.

Read the relevant section of the [full guide](guide.md) before applying its examples.
