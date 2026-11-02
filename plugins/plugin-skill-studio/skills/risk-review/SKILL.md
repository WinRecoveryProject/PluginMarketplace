---
name: risk-review
description: "Use when reviewing skills or plugins for risky instructions, downloads, permissions or secret exposure before admitting them."
---

# Skill Risk Check

Read [Studio policy](../../references/studio-policy.md) first.

Run `node scripts/studio.mjs risk-scan <target> --format markdown`. Review each finding at its exact file and line. Scanning is read-only: never execute, import, source, install, enable, upload, or contact endpoints named by the target. Findings are signals, not proof of intent; clean output is not a safety certification. Suppress only an exact rule ID, rule version and fingerprint with a concrete reason. JSON, Markdown and SARIF are available. Installation remains a separately authorized action.
