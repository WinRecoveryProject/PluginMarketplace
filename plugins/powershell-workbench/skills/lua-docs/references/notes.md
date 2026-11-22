# Lua: version cues, pitfalls and safe checks

These notes are research leads, not verified facts for a given project. Identify the exact version first, open the primary source for anything you rely on, and record what you checked.

## Identify the version first

- Find the runtime before anything else: PUC Lua 5.1, 5.2, 5.3 or 5.4, LuaJIT (5.1 plus extensions), or an embedded host such as World of Warcraft.
- World of Warcraft embeds a modified Lua 5.1 with its own API, restricted libraries and taint rules. Lua 5.4 parser success says nothing about WoW.

## Primary sources

Start with the catalog seed for this language, then:

- <https://www.lua.org/manual/5.1/> (and the 5.2, 5.3 and 5.4 manuals at the same path; pick the matching one)
- <https://www.lua.org/manual/5.4/manual.html#8> (incompatibilities with the previous version; each manual has this section)
- <https://luajit.org/extensions.html> (LuaJIT additions and limits)
- <https://warcraft.wiki.gg/wiki/World_of_Warcraft_API> (community WoW API reference; verify against the game build)

## Pitfalls that change behavior

- 5.1 has `unpack`, `setfenv` and `loadstring`; 5.2+ moved to `table.unpack`, `_ENV` and `load`.
- `goto` and labels exist from 5.2; integers, `//` and native bitwise operators from 5.3; `<const>` and `<close>` from 5.4.
- In 5.3+, `string.format('%d', 1.5)` raises an error; in 5.1 it truncates.
- `#t` on a table with holes can return any border, not the count of elements.
- The implicit `arg` table for varargs is a Lua 5.0 leftover (compatibility only in 5.1, removed in 5.2); use `...` and `select('#', ...)`.
- Globals are shared across all addons in WoW; prefer locals and a single addon table.

## Safe checks that do not run the code

- The Workbench Lua parser is unavailable in this release; do not report parser validation.
- If the user has a `luac` that matches the target version, `luac -p file.lua` parses without running. A match in version matters more than the result.
- Search for version-specific functions (`unpack`, `setfenv`, `goto`, `//`, `<const>`) to spot code written for a different Lua.
