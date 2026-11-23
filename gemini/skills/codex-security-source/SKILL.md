---
name: codex-security-source
description: "Source code of the Codex Security plugin (codex-security): code-only plugin files such as scripts, assets and tests, embedded as text. Companion to the codex-security skill; use when a codex-security instruction or its references/_index.md points here, or the user asks to read or explain that code."
---

# Codex Security: source files

Companion to the `codex-security` skill. The guidance, sub-skills and the path index live there; this skill holds the plugin-level files of `plugins/codex-security` that contain no Markdown, so the main skill stays small.

## How to use this skill

1. Start from the `codex-security` skill. Its `references/_index.md` says which file below holds a given source path.
2. Scripts are shown for reading, adapting and explaining. Gemini cannot run them; give the user the exact command to run locally and ask for the output when it matters.
3. Each file keeps its original path in its `File:` heading, so changes can be applied in PluginMarketplace.

## References

- `references/_plugin-assets.md`
- `references/_plugin-mcp.md`
- `references/_plugin-schemas.md`
- `references/_plugin-scripts-part01.md`
- `references/_plugin-scripts-part02.md`
- `references/_plugin-scripts-part03.md`
- `references/_plugin-shared.md`
