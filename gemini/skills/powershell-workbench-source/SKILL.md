---
name: powershell-workbench-source
description: "Source code of the PowerShell Workbench plugin (powershell-workbench): code-only plugin files such as scripts, assets and tests, embedded as text. Companion to the powershell-workbench skill; use when a powershell-workbench instruction or its references/_index.md points here, or the user asks to read or explain that code."
---

# PowerShell Workbench: source files

Companion to the `powershell-workbench` skill. The guidance, sub-skills and the path index live there; this skill holds the plugin-level files of `plugins/powershell-workbench` that contain no Markdown, so the main skill stays small.

## How to use this skill

1. Start from the `powershell-workbench` skill. Its `references/_index.md` says which file below holds a given source path.
2. Scripts are shown for reading, adapting and explaining. Gemini cannot run them; give the user the exact command to run locally and ask for the output when it matters.
3. Each file keeps its original path in its `File:` heading, so changes can be applied in PluginMarketplace.

## References

- `references/_plugin-assets-part01.md`
- `references/_plugin-assets-part02.md`
- `references/_plugin-assets-part03.md`
- `references/_plugin-assets-part04.md`
- `references/_plugin-assets-part05.md`
- `references/_plugin-assets-part06.md`
- `references/_plugin-assets-part07.md`
- `references/_plugin-assets-part08.md`
- `references/_plugin-assets-part09.md`
- `references/_plugin-assets-part10.md`
- `references/_plugin-assets-part11.md`
- `references/_plugin-assets-part12.md`
- `references/_plugin-scripts-part01.md`
- `references/_plugin-scripts-part02.md`
- `references/_plugin-tests.md`
