---
name: turborepo
description: Turborepo expert guidance. Use when setting up or optimizing monorepo builds, configuring task caching, remote caching, parallel execution, or the --affected flag for incremental CI.
metadata:
  priority: 5
  docs:
    - "https://turborepo.dev/docs"
  sitemap: "https://turborepo.dev/sitemap.xml"
  pathPatterns: 
    - 'turbo.json'
    - 'turbo/**'
  bashPatterns: 
    - '\bturbo\s+(run|build|test|lint|dev)\b'
    - '\bnpx\s+turbo\b'
    - '\bbunx\s+turbo\b'
---

# Turborepo

1. Inspect the package manager lockfile, workspace layout, task graph and build outputs.
2. Use the guide to select task dependencies, cache inputs and outputs, affected builds or CI settings. Validate the actual build or test command.

Read the relevant section of the [full guide](guide.md) before applying its examples.
