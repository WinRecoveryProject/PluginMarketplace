---
name: onedrive-setup
description: "Configure and verify the OneDrive Plugin's registered App, Microsoft login, MCP connection, account identity and read-only Graph access; diagnose failures without altering user data."
---
# OneDrive Setup

This skill is the onboarding entry point for the **OneDrive** plugin (the single
OneDrive App plus the bundled remote OneDrive MCP server). Use the supplied
OneDrive logo in `assets/onedrive.png` wherever the client supports a plugin
image. Do not ask the user to install another provider or copy OAuth secrets.

The current OneDrive plugin is private. Its plugin URL is
https://chatgpt.com/plugins/plugins_6ae5eb90d3948191a5b94a8f93aca0d7
and its declared MCP endpoint is
https://cloudstorage-onedrive-mcp.vercel.app/mcp.

## Safe setup procedure

1. Check whether this exact OneDrive plugin is installed and enabled for the
   current client. Discover available tools; do **not** interpret the presence
   of Microsoft SharePoint or `OneDrive_Broker_Staging` tools as confirmation.
   In Desktop, inspect the host's parsed App and MCP declarations, not just JSON
   files: the native entrypoint is `.codex-plugin/plugin.json`. A portable root
   manifest shadows it; the export reference lives under `references/`.
2. If the OneDrive plugin is not installed/enabled, direct the user to its
   private plugin page and ask them to install/enable it. Installation and
   Microsoft consent require user interaction. Do not claim to complete them.
3. Verify the registered App entry is the existing OneDrive App; verify that
   the plugin advertises an MCP server called `onedrive`. A registered App
   mapping and a remote MCP declaration do not inherently share a login.
4. Ask the user to connect **OneDrive** in the plugin's UI and follow the
   supported Microsoft authorization redirect. The app must perform the
   actual credential entry and consent. Never accept credentials in chat.
5. Determine whether the App and MCP connection end up with the SAME signed-in
   Microsoft identity. If the client initiates two independent OneDrive login
   prompts, record **single-login acceptance FAILED**; do not pretend a
   second prompt is the intended architecture. Inspect the remote broker's
   session-binding capability before trying to consolidate auth.
6. After authorization, discover the *actual* OneDrive MCP tools. Do not infer
   availability from the source skill's 28 described operations.
7. Read identity using `onedrive_account` if present, then request drive
   metadata/quota and root folder metadata using the actual tool schemas.
   Never change files just to prove connectivity. Only access data that the
   user has authorized for this test.
8. Report a concise PASS/FAIL/UNTESTED matrix for installation, App presence,
   MCP connectivity, OAuth completion, account consistency, tool discovery,
   account read and root listing. Do not display tokens, share links or
   private file names unless necessary for the user's requested work.

## Authentication design and diagnostics

- Separate the ChatGPT/MCP access-token boundary from the server-to-Microsoft
  Graph delegated-token boundary. The broker scopes `onedrive.read` and
  `onedrive.write` are **not** Graph scopes. Never store access or refresh
  tokens in skill files, logs, git, browser output or chat.
- This release declares Dynamic Client Registration (`client.mode: dcr`) in
  `mcp.json` / `.mcp.json`. Check the actual OAuth discovery and response
  before concluding registration works.
- The current manifests declare BOTH read and write scopes as `baseScopes`
  and `defaultScopes`. Do not claim first-login grants read-only scopes. Any
  future least-privilege adjustment requires a reviewed change to the
  connection's OAuth configuration and broker authorization policy.
- The Vercel project may have SSO Deployment Protection enabled. A production
  deployment in `READY` does not imply that an external ChatGPT MCP client can
  reach its OAuth discovery, registration, token and MCP endpoints. If the
  connection fails due to Vercel SSO, use a reviewed host-level access design;
  do NOT disable deployment protection or distribute bypass credentials on
  the user's behalf without explicit authorization.
- If tools do not load, check whether the App mapping refers to a valid
  registered MCP App and whether plugin installation actually enabled it;
  document the observed error, not a guessed cause.
- If consent fails, record the Microsoft error code (excluding tokens),
  callback mismatch or unsupported account type, and the step that failed.
- If MCP discovery works but Graph access fails, inspect account-binding,
  token audience/scope, tenant policy and Graph response codes using redacted
  diagnostics. Do not retry authorization in an infinite loop.
- If account identities disagree or are unavailable, do not perform a write.

## Write tests only by explicit instruction

After read-only verification, propose a disposable test folder with explicit
approval and the exact intended operations. Never create, update, share, move,
revoke, restore or delete anything merely to finish onboarding. If approved,
use current eTags for pre-existing items and verify each mutation by readback;
recycle only specifically approved disposable fixtures.

## Branding

All user-facing component labels are **OneDrive** (Plugin, App, MCP server).
The shared plugin image is `assets/onedrive.png`. The onboarding skill's own
technical identifier is `onedrive-setup` because skills require unique IDs;
the skill should still display the OneDrive name in ordinary text.
