---
name: zilvereyes-plugin-portfolio
description: Use when the user wants to inspect a directory of plugins and skills, maintain the complete worklist, distinguish duplicates from references, or choose the next candidate.
---

# Manage the plugin portfolio

1. Run `node scripts/plugin-studio.mjs inventory <root>` for each named source root.
2. Group results by package identity, not display name alone.
3. Label each entry as upstream reference, owned source, derived candidate, installed copy, cache or historical archive using available evidence.
4. Preserve every unclassified item and mark the classification unknown.
5. Read `../../references/upstream-sources.md` as the initial worklist, then append newly discovered candidates instead of replacing the list.
6. Report license and provenance constraints separately from technical usefulness.
7. Propose the next candidate based on user priority, missing capability and readiness; do not remove lower-priority items.
