# Skill: game-tooling-development

- Plugin: `powershell-workbench` (0.9.0-beta.6)
- Source: `plugins/powershell-workbench/skills/game-tooling-development/SKILL.md`

> Use when asked to develop PowerShell-centered game tooling that combines Lua addons, VS Code extensions, Node, .NET, native tools, CASC/game data, or web documentation.

## Instructions

### Game Tooling Development

Use this skill for game-data utilities, World of Warcraft addon tooling, editor extensions, exporters, local data services, and similar mixed-language projects.

1. Run `../../scripts/Resolve-PowerShellWorkbenchContext.ps1` and inspect actual manifests and entry points. Treat PowerShell as orchestration, not as a replacement for Lua, TypeScript, .NET, native, or data-format ownership.
2. For WoW addons, treat `.toc` metadata, Lua load order, events, widget handlers, secure APIs, SavedVariables, and client-version changes as separate contracts.
3. For CASC, exporters, and local game-data services, preserve binary-format boundaries, build identity, cache integrity, path safety, and deterministic provenance.
4. Use current upstream documentation when exact APIs or events matter. Never rely on remembered API signatures when they may vary by game build.
5. Keep generated or extracted assets out of initial scans unless explicitly scoped. Do not redistribute proprietary game data or credentials.
6. Route checks to each component's declared toolchain and use `powershell-quality-gate` only for requested aggregate validation.
7. Read `references/wow-ecosystem.md` for the user-provided starting sources and project signals.

#### Registered file types and generation

Route .ps1/.psm1/.psd1, .lua, .xml, .toc, .json/.jsonc, .js/.cjs/.mjs, .ts/.tsx, .cs/.csproj, .cmd/.bat, HTML/CSS and schemas to their native contracts. JSONC is not strict JSON; JSX/TSX is not plain JavaScript; project XML is not proof a build succeeds. Binary CASC/BLP/ADT/WDT/DBC/DB2 assets require format-specific readers and game-build evidence; never treat a text parser as validation. Use the file-type routing reference under powershell-scaffold.

Apply ../powershell-scaffold/references/component-pipeline.md to every generated executable member and assembly before execution. Capture WoW client branch/build, Lua runtime, TOC load order, XML handlers and external API dependencies. Missing native/dialect parsers block the checkpoint; explicit data-only assets use format validation rather than execution clearance.

## Bundled files

### File: `agents/openai.yaml`

```yaml
interface:
  display_name: "Game Tooling Development"
  short_description: "Build PowerShell-centered game tooling"
  icon_small: "./assets/skill-icon.png"
  icon_large: "./assets/skill-icon.png"
  brand_color: "#2671BE"
  default_prompt: "Use $game-tooling-development to develop this PowerShell-centered game tooling workflow."
```

### File: `references/wow-ecosystem.md`

#### World of Warcraft tooling context

Verify details at task time because APIs and client behavior change.

- [Warcraft Wiki API](https://warcraft.wiki.gg/wiki/World_of_Warcraft_API)
- [Events](https://warcraft.wiki.gg/wiki/Events)
- [Widget handlers](https://warcraft.wiki.gg/wiki/Widget_script_handlers)
- [Widget API](https://warcraft.wiki.gg/wiki/Widget_API)
- [Layer concept](https://warcraft.wiki.gg/wiki/Layer)
- [VS Code WoW API wiki](https://github.com/Ketho/vscode-wow-api/wiki)
- User project signals: `vscode-wow-toc`, `wow.tools.local`, `wow.export`, and `gwa2`.

Treat repository source and tests as primary evidence. Treat wiki/API pages as version-sensitive documentation, and distinguish retail, classic, PTR, beta, and build-specific behavior.

### Not embedded

- `assets/skill-icon.png` (binary asset, not embedded)
