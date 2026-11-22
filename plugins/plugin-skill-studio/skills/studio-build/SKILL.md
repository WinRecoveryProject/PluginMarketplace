---
name: studio-build
description: "Use when creating, updating, importing, installing, packaging, releasing or managing plugins and skills with the self-contained Studio: new plugin or skill candidates, safe plugin updates, folder or GPT imports, previewed skill installs, repo-to-plugin autopilot conversion, submission and release checkpoints, portfolio worklists, catalog discovery, and the full skill authoring lifecycle from scratch. Do NOT use for evaluating, reviewing, benchmarking or improving an existing skill (use studio-quality), for general software coding tasks, or for using pre-existing skills."
---

# Studio Build

<a id="src-plugin-skill-studio-plugin-skill-studio"></a>
Read [Studio policy](../../references/studio-policy.md) first.

Read the local capability registry first, and route only the relevant workflow; do not load the complete catalog. Use `node scripts/studio.mjs capabilities` and `route <request>` to locate the local skill, its mode and the supporting module.

- All required workflows are bundled. Never resolve companion plugins or external skills.
- A missing host terminal or browser is a missing host capability, not a reason to install a plugin.
- Source records in `references/integration-registry.json` distinguish adapted from independently implemented behavior.
- Preserve the user's intent and the entire worklist.
- Context Handoff is a separate product and is not bundled.

Pick one mode, read only that mode file, and follow it. Run commands from the Plugin-Skill-Studio package root.

| Mode | Use when | Read |
|---|---|---|
| <a id="mode-create-plugin"></a>create-plugin | A new local or marketplace plugin candidate from selected sources | [modes/create-plugin.md](modes/create-plugin.md) |
| <a id="mode-create-skill"></a>create-skill | Create or update a skill with scoped instructions and progressive disclosure | [modes/create-skill.md](modes/create-skill.md) |
| <a id="mode-update"></a>update | Inspect or update an owned local or Git-managed plugin | [modes/update.md](modes/update.md) |
| <a id="mode-import"></a>import | Adapt a folder of local skills or plugins, or GPT instructions or exports, into candidates | [modes/import.md](modes/import.md) |
| <a id="mode-install"></a>install | Inventory, preview or install a skill from a local directory or GitHub URL | [modes/install.md](modes/install.md) |
| <a id="mode-autopilot"></a>autopilot | Convert an agentic repository into a plugin, or build, repair, validate, package, submit or audit an existing plugin end to end | [modes/autopilot.md](modes/autopilot.md) |
| <a id="mode-release"></a>release | Prepare, package or resume a plugin release with checkpoints and bounded retries | [modes/release.md](modes/release.md) |
| <a id="mode-portfolio"></a>portfolio | Inspect a directory of plugins and skills, keep the complete worklist, choose the next candidate | [modes/portfolio.md](modes/portfolio.md) |
| <a id="mode-catalog"></a>catalog | Find local skills or analyze public directory snapshots | [modes/catalog.md](modes/catalog.md) |
| <a id="mode-lifecycle"></a>lifecycle | Authoring discipline for the whole skill lifecycle: draft → test → review → improve → package | [modes/lifecycle.md](modes/lifecycle.md) |

<a id="mode-router"></a>
When no mode matches, use this file's routing rules. Evaluation, review, benchmarking and improvement of an existing skill belong to `studio-quality`.
