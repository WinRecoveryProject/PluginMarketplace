# Lua and World of Warcraft addon guidance

Use this reference for Lua code, including World of Warcraft addons. First identify the runtime: PUC Lua 5.1 to 5.4, LuaJIT, or an embedded host. World of Warcraft embeds a modified Lua 5.1 with its own API, so identify the game branch and build the addon targets (Retail or a Classic branch) and read the addon's TOC files.

## Implementation focus

- Write for the target version: World of Warcraft code cannot use `goto`, integer division `//`, native bitwise operators or `<const>`/`<close>`.
- Keep state local. Addons share one global environment, so expose at most one addon table and avoid leaking globals.
- Respect load order: files load in the order listed in the TOC, and libraries must load before code that uses them.
- Register for events instead of polling, and unregister when no longer needed.
- Treat API availability as branch-specific; check the current API for the targeted build instead of relying on memory.
- Avoid protected or secure actions in combat unless the API allows them; tainted code paths cause blocked actions.
- Keep `SavedVariables` names in the TOC in sync with the globals the code writes, and handle missing or old saved data.

## Validation

Use the project's configured checks, such as `luacheck` with the project's globals and a version-matched `luac -p` parse. Parse success does not prove World of Warcraft compatibility; in-game testing on the targeted build is the real check, and the user runs it.

## QA watch list

- nil handling for API returns that differ per branch or when data is not loaded yet
- `#` on tables with gaps, and integer versus float differences between Lua versions
- per-character versus account-wide saved data and migration from older formats
- localization, UI scaling and font differences
- event order at login, reload and zoning
