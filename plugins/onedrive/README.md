# OneDrive — one App connection

**Desktop package version:** 1.2.2
**Registered OneDrive App:** https://chatgpt.com/plugins/plugin_asdk_app_6ae8b541a3d08191ae893ea0925a2fe5

OneDrive combines the existing registered App, its hosted CloudStorage Portal
MCP connection, the original logo and two provider/setup skills. CloudStorage
Portal refers to the same App. This package no longer declares a second native
MCP OAuth client alongside the App, so it does not require a second sign-in.

The native Desktop entrypoint is `.codex-plugin/plugin.json`. The portable
manifest is retained at `references/portable-plugin.json` for export and must
not be placed at the package root. Historical standalone MCP declarations are
archived under `references/legacy`; they are not active connection settings.

## Connect

1. Install or update **OneDrive** from WinRecoveryProject Digital.
2. Reuse the existing connected OneDrive account. If none is connected, connect
   **OneDrive** through its supported Microsoft sign-in flow.
3. Discover the actual App tools, then verify account identity and drive metadata.
4. Use read-only root/file checks when requested. Changes to cloud files require
   the user's actual task or specifically approved disposable fixtures.

Never paste credentials into chat, copy tokens between routes or reinstall the
registered App merely to test sign-in. Microsoft sign-in, broker token exchange
and access to a OneDrive drive are separate verification stages. A successful
Microsoft login does not prove that Graph accepted the selected drive.

Version 1.2.2 verifies the linked account before file operations. If search returns no matches and the direct parent is known, the skill checks the complete parent listing for one exact item and verifies its metadata before a read or write.

## Host presentation

A Git Marketplace package and the host-generated remote App card are different
presentations of the same registered App. The Marketplace carries provider
skills, setup guidance and package branding; the App card carries connected
accounts and the platform-managed hosted MCP connection. Their technical package
IDs and menus need not be identical. Do not delete the App as duplicate cleanup.
The existing name **OneDrive**, App identity, logo and connection are retained.

## Verification and limits

- Canonical hosted MCP: `https://cloudstorage-onedrive-mcp.vercel.app/mcp`.
- Native candidate contract: one existing App, zero extra native MCP servers,
  two skills. Valid package files do not prove a user login.
- Read/write capabilities remain behind the existing App. Discover the current
  tool list rather than treating source descriptions as live proof.
- This packaging update changes no account, consent scope, credential, server
  deployment or cloud file. Entra and personal-account access need separate live
  acceptance checks.
- Original shared logo: `assets/onedrive.png`.

Configuration source: Zilvereyes / CloudStorage Portal. Never include secrets,
tokens, callback codes or private file listings in logs or published packages.
