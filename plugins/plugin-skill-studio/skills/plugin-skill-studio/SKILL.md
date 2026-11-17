---
name: plugin-skill-studio
description: "Use when building, discovering, reviewing, importing or managing plugins and skills with the self-contained Studio."
---

# Plugin-Skill-Studio

Read [Studio policy](../../references/studio-policy.md) first.

Read the local capability registry first. Route only the relevant workflow; do not load the complete catalog. Use `node scripts/studio.mjs capabilities` and `route <request>` to locate the local skill and supporting module. All required workflows are bundled. Never resolve companion plugins or external skills. A missing host terminal/browser is a missing host capability, not a reason to install a plugin. Source records in references/integration-registry.json distinguish adapted and independently implemented behavior. Preserve user intent and the entire worklist. Context Handoff is a separate product and is not bundled.
