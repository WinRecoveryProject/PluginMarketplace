# World of Warcraft TOC files: version cues, pitfalls and safe checks

These notes are research leads, not verified facts for a given project. Identify the exact version first, open the primary source for anything you rely on, and record what you checked.

## Identify the version first

- Find the game branch and build the addon targets (Retail or one of the Classic branches). Each branch has its own Interface number; read it from the game or a versioned source, never from memory.
- Check whether the addon ships branch-specific TOC files (for example names ending in `_Mainline`, `_Vanilla` or other branch suffixes) and which one the client loads.

## Primary sources

Start with the catalog seed for this language, then:

- <https://warcraft.wiki.gg/wiki/TOC_format> (community reference; corroborate with versioned game evidence)
- <https://warcraft.wiki.gg/wiki/Public_client_builds> (build and Interface numbers per branch)

## Pitfalls that change behavior

- Files load in the order listed; a file that uses a library must come after it.
- `## Dependencies`/`## RequiredDeps` and `## OptionalDeps` change load order and whether the addon loads at all.
- `## SavedVariables` and `## SavedVariablesPerCharacter` names must match the globals the code writes.
- A wrong or outdated `## Interface` marks the addon as out of date; it does not prove the code works on that build.
- Paths are relative to the addon folder; keep encoding and line endings consistent with the rest of the addon.

## Safe checks that do not run the code

- Read the TOC and compare every listed file with the files that exist; report missing or unlisted files.
- TOC parser support is unavailable in this release. Do not report manifest checks as Lua or API validation.
