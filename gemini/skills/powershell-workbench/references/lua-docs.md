# Skill: lua-docs

- Plugin: `powershell-workbench` (0.9.0-beta.7)
- Source: `plugins/powershell-workbench/skills/lua-docs/SKILL.md`

> Use when researching lua syntax, runtime, parser and component-contract documentation with explicit version scope inside PowerShell Workbench.

## Instructions

### Lua Docs

Read ../powershell-scaffold/references/language-docs.md and the `lua` entry in
../../assets/language-documentation-catalog.json. Scope: Exact Lua runtime, host embedding and game API version.
Then read references/notes.md: version cues, primary sources, pitfalls and safe checks for this language.

Open relevant primary sources before technical claims. Read ../../assets/component-parser-catalog.json
for parser IDs/capability states and apply ../powershell-scaffold/references/component-pipeline.md
before executing generated code. Documentation coverage does not imply parser support.

Use this skill only for documentation research within the stated language and
version scope. Do not execute examples, install tools, change systems or request
credentials as part of this research. Separate documented behavior from observed
parser support and tests.

## Bundled files

### File: `agents/openai.yaml`

```yaml
interface:
  display_name: "Lua Docs"
  short_description: "Research lua documentation"
  icon_small: "./assets/lua-original.svg"
  icon_large: "./assets/lua-original.svg"
  default_prompt: "Find version-specific primary documentation for lua components."
```

### File: `assets/lua-original.svg`

_Binary asset, not embedded._

### File: `references/notes.md`

#### Lua: version cues, pitfalls and safe checks

These notes are research leads, not verified facts for a given project. Identify the exact version first, open the primary source for anything you rely on, and record what you checked.

##### Identify the version first

- Find the runtime before anything else: PUC Lua 5.1, 5.2, 5.3 or 5.4, LuaJIT (5.1 plus extensions), or an embedded host such as World of Warcraft.
- World of Warcraft embeds a modified Lua 5.1 with its own API, restricted libraries and taint rules. Lua 5.4 parser success says nothing about WoW.

##### Primary sources

Start with the catalog seed for this language, then:

- <https://www.lua.org/manual/5.1/> (and the 5.2, 5.3 and 5.4 manuals at the same path; pick the matching one)
- <https://www.lua.org/manual/5.4/manual.html#8> (incompatibilities with the previous version; each manual has this section)
- <https://luajit.org/extensions.html> (LuaJIT additions and limits)
- <https://warcraft.wiki.gg/wiki/World_of_Warcraft_API> (community WoW API reference; verify against the game build)

##### Pitfalls that change behavior

- 5.1 has `unpack`, `setfenv` and `loadstring`; 5.2+ moved to `table.unpack`, `_ENV` and `load`.
- `goto` and labels exist from 5.2; integers, `//` and native bitwise operators from 5.3; `<const>` and `<close>` from 5.4.
- In 5.3+, `string.format('%d', 1.5)` raises an error; in 5.1 it truncates.
- `#t` on a table with holes can return any border, not the count of elements.
- The implicit `arg` table for varargs is a Lua 5.0 leftover (compatibility only in 5.1, removed in 5.2); use `...` and `select('#', ...)`.
- Globals are shared across all addons in WoW; prefer locals and a single addon table.

##### Safe checks that do not run the code

- The Workbench Lua parser is unavailable in this release; do not report parser validation.
- If the user has a `luac` that matches the target version, `luac -p file.lua` parses without running. A match in version matters more than the result.
- Search for version-specific functions (`unpack`, `setfenv`, `goto`, `//`, `<const>`) to spot code written for a different Lua.
