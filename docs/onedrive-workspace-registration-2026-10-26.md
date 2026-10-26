# OneDrive workspace registration — 2026-10-26

## Current identity

- Visible App name: `OneDrive`
- Workspace: `WinRecoveryProject Workspace an Zilvereyes Creation`
- Workspace ID: `13dd9826-ca61-4006-a842-f6cb02ddf7b9`
- App ID: `asdk_app_6adee7aa468881a4940e6933f518ddaa`
- Technical plugin ID: `plugin_asdk_app_6adee7aa468881a4940e6933f518ddaa`
- MCP endpoint: `https://cloudstorage-onedrive-mcp.vercel.app/mcp`
- ChatGPT OAuth callback: `https://chatgpt.com/connector/oauth/8km5JPM_K7ZN`

The App is referenced by both the dedicated `onedrive` package and the three-provider `cloudstorage-portal` package. The separate `cloudstorage-portal-local` package owns the local stdio broker and does not own this App identity.

## Microsoft OAuth registration

- Microsoft host client ID: `c3943220-6e15-4d13-b397-ea0c1a1a639b`
- API application ID: `611e57ce-a334-46da-b172-98d03bf2bb9b`
- Delegated scope: `api://611e57ce-a334-46da-b172-98d03bf2bb9b/access_as_user`
- Token endpoint authentication method requested by the App: `none`
- Client secret packaged: no

## Remaining verification boundary

Registration is not proof of a working OAuth exchange or file access. The deployed MCP server was previously observed advertising `client_secret_post`, while the workspace App is a public client using `none`. Its resource/scope metadata must be corrected and redeployed before login and read-only OneDrive tests can be reported as current proof.

Evidence screenshot: `evidence/onedrive-workspace-registration-2026-10-26.png`.
