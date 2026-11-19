# Plugin files: onedrive — manifests and top-level files

Source: `plugins/onedrive`. Files outside the `skills/*` folders, embedded as text.

## File: `.app.json`

```json
{
  "apps": {
    "dev-6ae8b541a3d08191ae893ea0925a2fe5": {
      "id": "asdk_app_6ae8b541a3d08191ae893ea0925a2fe5"
    }
  }
}
```

## File: `PROVENANCE.json`

```json
{
  "sourceArchive": "OneDrive_unified_v1.1.5.zip",
  "sha256": "1e72b800989c636eb1c0ead9eb9f049a5b77962249490a5cd73e3570a3c9e163",
  "version": "1.2.2",
  "canonicalMcp": "https://cloudstorage-onedrive-mcp.vercel.app/mcp",
  "appBinding": "asdk_app_6ae8b541a3d08191ae893ea0925a2fe5",
  "personalAccountAppAccess": "CONNECTED_PRIMARY_ACCOUNT_UI_VERIFIED",
  "liveFileOperations": "REGISTERED_APP_READ_WRITE_VERIFIED",
  "sourceArchiveVersion": "1.1.5",
  "changes": [
    "Use native Codex manifest as Desktop entrypoint; preserve portable manifest as export reference.",
    "Codex actual loader fixture: 1 App, 1 MCP, 2 skills.",
    "Replace inaccessible historical App binding with the personally registered, connected OneDrive App; preserve server and icon.",
    "Correct setup link, align onboarding directory/name and distinguish App/native authentication routes.",
    "Version 1.2.0: preserve the existing OneDrive App, icon and two skills; remove the duplicate standalone native MCP login route.",
    "Archive historical top-level MCP declarations under references/legacy so the native loader does not auto-discover them.",
    "Native candidate verification: one existing App, zero extra MCP declarations, two provider/setup skills. Account and Graph acceptance remain separate live tests.",
    "Version 1.2.2 verifies linked-account selection and reuses CloudStorage Portal 0.9.13 exact-parent resolution after a successful empty search."
  ],
  "loaderEvidence": "app-only-package-test.json",
  "historicalLoaderEvidence": "ONEDRIVE-MANIFEST-LOADER-TEST-20261102.json",
  "historicalConnectionEvidenceNote": "The UI and live file-operation statuses above are retained historical evidence, not new acceptance tests for version 1.2.0.",
  "connectionEvidence": "ONEDRIVE-APP-CREATION-20261102.json",
  "connectionModel": "Existing registered OneDrive App only; hosted MCP remains behind that App. No independent native MCP OAuth client.",
  "unificationLoaderEvidence": "app-only-package-test.json",
  "branding": {
    "logo": "assets/logo-512.png",
    "composer": "assets/composer-128.png",
    "origin": "Original Zilvereyes icon designed for this package in November 2026"
  },
  "sharedResolver": {
    "from": "CloudStorage Portal 0.9.13",
    "path": "skills/onedrive/scripts/resolve-onedrive-child.mjs",
    "sha256": "dda57aed33557d1246da1dc05a31c8769de4b6c74af0521dfe4e863e5543bd0c"
  }
}
```

## File: `README.md`

### OneDrive — one App connection

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

#### Connect

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

#### Host presentation

A Git Marketplace package and the host-generated remote App card are different
presentations of the same registered App. The Marketplace carries provider
skills, setup guidance and package branding; the App card carries connected
accounts and the platform-managed hosted MCP connection. Their technical package
IDs and menus need not be identical. Do not delete the App as duplicate cleanup.
The existing name **OneDrive**, App identity, logo and connection are retained.

#### Verification and limits

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
