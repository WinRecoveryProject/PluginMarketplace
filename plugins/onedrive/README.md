# OneDrive — single unified plugin

**Version:** 1.1.5  
**Plugin:** https://chatgpt.com/plugins/plugins_6ae5eb90d3948191a5b94a8f93aca0d7

This package bundles the registered OneDrive App mapping in `.app.json`, the
OneDrive MCP server in `mcp.json` / `.mcp.json`, the primary OneDrive skill in
`skills/onedrive/SKILL.md`, and the guided onboarding skill in
`skills/setup/SKILL.md`.

## Connect

1. Open the private plugin page, install and enable **OneDrive**.
2. Run the **OneDrive Setup** onboarding flow.
3. Connect the OneDrive App and complete Microsoft sign-in and consent in the
   authenticated connection dialog; **do not paste credentials into chat**.
4. Verify the App and MCP server use the same Microsoft account/session.
5. Confirm authenticated account, drive metadata and root contents via OneDrive
   plugin tools before performing any write operation.

## Endpoint and caveats

- MCP endpoint: `https://cloudstorage-onedrive-mcp.vercel.app/mcp`.
- The Vercel project has been observed as deployed to production, but external
  OAuth/MCP reachability has not been confirmed.
- The source claims 28 MCP tools; discover their actual runtime availability.
- ChatGPT App and MCP bearer credentials are separate from Microsoft Graph
  delegated credentials, even if onboarding appears as one user login.
- `onedrive.read` and `onedrive.write` are currently requested as base/default
  broker scopes. Do not assume read-only-first consent.
- No user cloud files should be modified as part of installation verification.
- The official shared logo is `assets/onedrive.png` (unchanged original PNG).

## Contact and support

Configuration source and existing OneDrive project: Zilvereyes/CloudStorage Portal.
Do not expose OAuth secrets, Microsoft tokens, or personal file listings in logs.
