# WinRecoveryProject maintenance revision

This is a modified MIT-licensed derivative of Codex Dev Workflows 0.4.2.
The original license, branding and package identity are retained. This revision
is maintained by WinRecoveryProject; it is not an upstream release.

Changes on 2026-11-22 in version 0.4.2-wrp.1:

- Added platform guidance for PowerShell (Windows PowerShell 5.1 and PowerShell 7),
  Batch/CMD scripts and launchers, and Lua including World of Warcraft addons in
  `shared/platforms/`. The three pages are copied unchanged from
  WinRecoveryProject-DevSuite `references/platforms/` (commit fa2f537), where they
  are original WinRecoveryProject content.
- `platform-guidance` routes to the new pages, and `feature-development` names the
  new stacks. The four original platform pages are unchanged.
- `IMPORT-RECEIPT.json` and `COPY-COMPLETE.json` describe the original import and
  are historical; they are not a new import claim.

Changes on 2026-11-23 in version 0.4.2-wrp.2:

- The plugin description and long description now point to
  winrecoveryproject-devsuite for WinRecoveryProject work. DevSuite merged these
  workflows (see its `references/source-provenance.json`) and adds integrated
  planning, review and verification. No skill text changed.
