---
name: shadcn
description: shadcn/ui expert guidance — CLI, component installation, composition patterns, custom registries, theming, Tailwind CSS integration, and high-quality interface design. Use when initializing shadcn, adding components, composing product UI, building custom registries, configuring themes, or troubleshooting component issues.
metadata:
  priority: 6
  docs:
    - "https://ui.shadcn.com/docs"
    - "https://ui.shadcn.com/docs/components"
  pathPatterns:
    - 'components.json'
    - 'components/ui/**'
    - 'src/components/ui/**'
    - 'apps/*/components/ui/**'
    - 'apps/*/src/components/ui/**'
    - 'packages/*/components/ui/**'
    - 'packages/*/src/components/ui/**'
  bashPatterns:
    - '\bnpx\s+shadcn\b'
    - '\bnpx\s+shadcn@latest\s+(init|add|build|search|list|migrate|info|docs|view)\b'
    - '\bnpx\s+create-next-app\b'
    - '\bbunx\s+create-next-app\b'
    - '\bpnpm\s+create\s+next-app\b'
    - '\bnpm\s+create\s+next-app\b'
---

# Shadcn

1. Inspect the project's existing components, package manager, Tailwind configuration and registry before changing dependencies.
2. Use the matching guide section for initialization, components, registry, theming or accessibility. Verify the resulting state in the target UI.

Read the relevant section of the [full guide](guide.md) before applying its examples.
