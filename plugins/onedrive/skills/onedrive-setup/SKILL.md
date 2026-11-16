---
name: onedrive-setup
description: "Use when configuring, verifying or diagnosing the existing OneDrive App's Microsoft login, hosted MCP tools, account identity or drive access without creating another connection."
---
# OneDrive Setup

Use **OneDrive** from WinRecoveryProject Digital
(`onedrive@winrecoveryproject-digital`). This package includes the existing
registered OneDrive App, its original logo and two skills. The hosted MCP remains
behind that App. There is no separately declared native MCP OAuth client.

The existing registered App is
https://chatgpt.com/plugins/plugin_asdk_app_6ae8b541a3d08191ae893ea0925a2fe5.
Its hosted MCP endpoint is
https://cloudstorage-onedrive-mcp.vercel.app/mcp.

## Safe setup procedure

1. Verify the exact installed package and the host's parsed declarations: one
   existing App, two skills, zero extra native MCP declarations. Desktop uses
   `.codex-plugin/plugin.json`; a root portable manifest can shadow it.
2. Verify that the App is the existing OneDrive App. A cache directory or package
   version does not prove a connected account. The generated remote App card can
   have different menus from the Git Marketplace package.
3. Reuse the current connected account. If none is connected, use **OneDrive**'s
   supported Microsoft sign-in and consent flow. Credential entry belongs in the
   provider's secure UI. Do not create another MCP connection, request copied
   OAuth secrets or sign in again merely to demonstrate functionality.
4. Discover the actual tools exposed by the registered OneDrive App. Never use
   SharePoint or OneDrive Broker Staging as proof of this App's access.
5. Read `onedrive_account` when available, then drive metadata. Bind subsequent
   operations to the observed account and drive. Read root/file metadata only
   within the user's requested scope. Never write files merely for onboarding.
6. Record each stage separately: installed package, App connection, Microsoft
   authorization, broker callback/token exchange, tool discovery, account identity
   and Graph drive access. Separate observed success, failure and untested steps.
   Never infer drive access from a successful login.

## Diagnose sign-in and drive errors

- The existing App owns its OAuth client, broker scopes and hosted MCP connection.
  Package 1.2.0 reuses them; it does not change permissions or create a new client.
  Broker scopes `onedrive.read`/`onedrive.write` are not Microsoft Graph scopes.
  Never exchange tokens between providers or store credentials in files or chat.
- If Microsoft completes sign-in but the host reports failure, identify the
  failing stage from redacted broker responses and logs. Capture stable error
  codes and Graph status, never authorization codes, tokens or secret values.
- Personal and Entra access are independent tests. Check the actual account/tenant
  binding and drive response. Do not label a drive permission/provisioning failure
  as an invalid password or silently fall back to the personal account.
- If tools are unavailable, verify the exact App binding, enabled state and public
  discovery/authentication challenge. READY is not proof that a client can reach
  protected discovery. Do not weaken deployment protection or change tenant/app
  registrations without the corresponding user authorization.
- If identities disagree or are unknown, stop writes and diagnose the mismatch.
  Never disconnect a working personal account as a probe. Do not remove the
  registered remote App as a duplicate: Marketplace and Portal depend on it.

## Controlled verification

Use read-only checks first. Create/update/recycle only specifically authorized
disposable fixtures; use current eTags, verify readback and reject stale-version
overwrites. Never share, revoke or permanently delete merely to test a feature.
Report a missing host capability and continue independent checks.

All user-facing labels are **OneDrive**. Use unchanged `assets/onedrive.png` where
the host supports artwork. The setup skill identifier remains `onedrive-setup`.
