---
name: portfolio
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

An upgrade can invalidate a skill cache path while the same exact package remains
installed at its new version. Record this as a stale reference, obtain a new host
installed observation and use [exact cache resolution](../../references/installed-cache-resolution.md).
Never count every cached version as installed or guess a replacement from a matching
display name. Do not recreate old caches, alter SDK/global instructions, install a
replacement or change connections to hide the host's frozen in-session catalog.
