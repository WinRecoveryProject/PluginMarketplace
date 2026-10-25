---
name: zilvereyes-improve-skill
description: Use when the user wants to improve an existing Codex skill from evaluation evidence while preserving intent, invocation policy, provenance and rollback.
---

# Improve a skill from evidence

1. Evaluate the current skill with `node scripts/skill-studio.mjs evaluate <skill-root>` and retain the before report.
2. Separate required structural failures from recommended clarity, budget and progressive-disclosure improvements.
3. Confirm that the selected path is an editable source rather than an installation cache or upstream snapshot.
4. Apply only changes supported by the findings and the user's intended use cases. Do not accumulate universal rules from one example.
5. Preserve frontmatter fields and `agents/openai.yaml` policy/dependencies not involved in the requested change.
6. Re-run validation and evaluation. Compare before and after evidence, including unresolved limitations.
7. Do not install, publish, delete the original or replace another same-name skill without a separate exact request.
