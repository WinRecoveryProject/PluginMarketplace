---
name: setup-linters
description: "Use when explicitly setting up the locally detected or selected pinned linter tools, with no paid service and no global configuration changes."
---

# Prepare local linters

Resolve this plugin's directory as `../..` from the directory containing this SKILL.md. Use only its relative packaged scripts.

Setup is a separate explicit operation. A scan request alone never authorizes network installation. When the user requests setup, proceed within that authorization without asking again.

1. Require Node >=24 with npm. The packaged CLI bootstraps missing Node libraries during explicit setup, using its own lockfile, official registry, trusted empty npm config files and `--ignore-scripts`. Never run npm install in the target project or alter global npm settings.
2. Run `node "<plugin-directory>/bin/wrp-lint.mjs" setup "<project-root>" --detected --format json`, or `--types batch,bash` for the user's explicit selection. It never installs the full MegaLinter catalog. Python 3.11–3.15 is needed for isolated Blinter; PowerShell >=7.4.6 and PSScriptAnalyzer 1.25.0 are required for PowerShell. The CLI reports missing runtimes separately rather than modifying system configuration.
3. Blinter is separately downloaded into `<plugin-directory>/.tools/blinter` using a pinned, hash-checked wheel requirements file. Blinter is AGPL-3.0-or-later and is not bundled/relicensed as MIT. On Windows ShellCheck 0.11.0 installs into `.tools/shellcheck` from the official checksum-pinned archive. Bash, PowerShell and Python runtimes must already exist. Other platforms currently require manual ShellCheck 0.11.0 installation from its official release.
4. Run doctor, then scan with the same selection. Distinguish installation success, availability and actual lint success.

Use 0 kr paid services. No credentials, cloud actions, subscriptions, global config writes, source fixes or automatic project config creation. `init` creates only `.wrp-lint.json` on explicit request and refuses overwrites. Do not claim unsupported languages or unavailable tools are checked.
