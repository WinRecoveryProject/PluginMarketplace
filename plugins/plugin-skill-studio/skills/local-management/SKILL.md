---
name: local-management
description: "Use when inspecting local plugin identities, dependencies, declarations and installation evidence."
---

# Local Plugin Management

Read [Studio policy](../../references/studio-policy.md) first.

Run `local-inventory <root>`. Keep source, candidate, cache, installed and unknown classifications separate. An App ID or permission declaration does not prove account enablement, actual access or current global permission state. Inspect local receipts and effective supported host state where available. Make local installation changes only within explicit scope; never uninstall a source or same-name package as cleanup. Global account controls need native user-visible host settings; no Plugin Management connector is bundled.
