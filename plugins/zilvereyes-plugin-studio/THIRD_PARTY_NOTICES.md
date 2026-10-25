# Third-party source notices

Zilvereyes Plugin Studio is an independent implementation. The following archived Codex sources informed its requirements and compatibility decisions.

## Skill Installer

- Source snapshot: `C:\Users\zilve\_GitRootArchive_\CodexPluginProject\skill-installer`
- License: Apache License 2.0
- Use here: behavioral reference for listing and installing skills, GitHub source handling, destination selection and refusal to overwrite.
- Modification: Studio implements these behaviors independently in Node.js and adds dry-run plans, SHA-256 receipts and post-copy verification. The archived Python implementation and its artwork are not bundled.

## Skill Creator

- Source snapshot: `C:\Users\zilve\_GitRootArchive_\CodexPluginProject\skill-creator`
- License: Apache License 2.0
- Use here: structural and authoring reference for `SKILL.md`, progressive disclosure, `agents/openai.yaml`, initialization and validation.
- Modification: Studio implements its own scaffold and validator in Node.js. The archived Python implementation and its artwork are not bundled.

## Plugin Eval

- Source snapshot: `C:\Users\zilve\_GitRootArchive_\CodexPluginProject\plugin-eval`
- License: MIT
- Use here: design reference for deterministic local evaluation, normalized findings, budget visibility, improvement order and comparison.
- Modification: Studio has an independent compact evaluator and does not bundle the archived evaluator source, fixtures or artwork.

## Plugin Creator

- Source snapshot: `C:\Users\zilve\_GitRootArchive_\CodexPluginProject\plugin-creator`
- License: Proprietary
- Use here: compatibility and behavior reference only for supported plugin layouts and workflows.
- No proprietary implementation, text asset, App binding or artwork is copied into Studio.

The original source directories remain unchanged and retain their own licenses and authorship.
