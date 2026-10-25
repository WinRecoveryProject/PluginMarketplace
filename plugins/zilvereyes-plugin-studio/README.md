# Zilvereyes Plugin Studio

Zilvereyes Plugin Studio is a preservation-first creator, installer and evaluator for local Codex plugins and skills. It combines independent Zilvereyes workflows informed by the archived Skill Installer, Skill Creator, Plugin Eval and Plugin Creator sources while treating upstream packages, installed packages, account plugins, marketplace entries, editable sources and archives as separate states.

It never treats matching display names as permission to delete or replace files.

## Included workflows

- inventory a plugin portfolio without mutation;
- scaffold a new self-contained plugin candidate without overwriting an existing directory;
- scaffold and validate Codex skills with progressive-disclosure checks;
- preview or install a local/GitHub skill with SHA-256 evidence and strict no-overwrite behavior;
- validate portable and Codex compatibility manifests;
- evaluate plugin manifests, skill structure, assets, App references and MCP declarations;
- compare two candidates while retaining both;
- maintain an explicit worklist and provenance record.

## Local CLI

```powershell
node scripts/plugin-studio.mjs inventory <portfolio-root>
node scripts/plugin-studio.mjs validate <plugin-root>
node scripts/plugin-studio.mjs evaluate <plugin-root>
node scripts/plugin-studio.mjs compare <before-plugin-root> <after-plugin-root>
node scripts/plugin-studio.mjs scaffold <output-parent> --name my-plugin --display-name "My Plugin"
node scripts/skill-studio.mjs inventory <skills-root>
node scripts/skill-studio.mjs scaffold <output-parent> --name my-skill --description "Use when ..."
node scripts/skill-studio.mjs validate <skill-root>
node scripts/skill-studio.mjs evaluate <skill-root>
node scripts/skill-studio.mjs install <skill-root-or-github-url> --dry-run
node scripts/skill-studio.mjs install <skill-root-or-github-url> [--dest <skills-root>]
```

All read-only commands emit JSON. Both scaffold commands refuse an existing target. Skill installation validates first, copies through a same-volume staging directory, verifies every file hash, records a receipt and refuses an existing destination.

## Upstream boundary

The four selected archived sources and their licensing treatment are documented in `THIRD_PARTY_NOTICES.md` and `references/source-integration.md`. Skill Installer and Skill Creator are Apache-2.0 references, Plugin Eval is an MIT reference, and proprietary Plugin Creator is used only for behavior and format compatibility; its implementation and assets are not copied.
