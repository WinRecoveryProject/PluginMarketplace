---
name: zilvereyes-install-skill
description: Use when the user wants to inventory, preview or install a Codex skill from a local directory or GitHub URL with validation, hashes, receipts and no overwrite.
---

# Install a skill safely

Installation changes the user's Codex skill directory. A request to inspect, compare or improve a skill is not installation permission.

1. Resolve the exact local directory or `github.com` tree URL. Do not accept an arbitrary download host.
2. Inventory with `node scripts/skill-studio.mjs inventory <root>` when the user has not selected a single skill.
3. Preview the selected skill with `node scripts/skill-studio.mjs install <source> --dry-run`. Report its name, destination, file count, bytes and validation result.
4. Before writing, require that the user actually asked to install that exact source. Do not interpret creation, evaluation or cleanup as installation approval.
5. Install with `node scripts/skill-studio.mjs install <source> [--dest <skills-root>]`. The command rejects symbolic links, invalid skills and existing target directories.
6. Verify copied SHA-256 hashes and retain `.zilvereyes-install-receipt.json` in the installed skill.
7. Tell the user the skill becomes discoverable on a later turn or after the host reloads it. Do not remove older skills unless the user separately names the exact removal target.
