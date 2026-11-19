---
description: Scan selected project file types and report lint coverage and findings.
---

Use the lint-project skill on the requested project. Use Node.js 24 or newer. Open the plugin's own `scripts/wrp-lint.mjs` using the absolute plugin directory, and run `doctor` followed by `scan` with the same selected file types and the project directory as an explicit argument. Report incomplete checks separately from findings. Install pinned tools only when the user has asked for setup.
