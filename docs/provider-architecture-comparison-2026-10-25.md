# Provider architecture comparison — 2026-10-25

## Question

Can CloudStorage use the same current pattern as Dropbox and Google Drive so that each provider keeps one registered connection surface, while the Portal only supplies coordination and skills?

The answer is **yes, conditionally**. The current package contains enough evidence to define the target, but the duplicate OneDrive route must first be verified against the registered App before it is removed.

## What Dropbox and Google Drive do now

The locally installed current packages have the same essential shape:

```text
provider-plugin/
├── .codex-plugin/plugin.json
├── .app.json
└── skills/
```

Neither current package distributes an MCP manifest.

### Dropbox 6.0.0

- `.app.json` references `asdk_app_69b31dc2110c8191b8b47dc98fe5a052`.
- The compatibility manifest references `.app.json` and the skills directory.
- The registered App is the connection/tool surface; the plugin adds provider presentation and workflows.

### Google Drive 0.1.22

- `.app.json` references `connector_5f3c8c41a1e54ad7a76272c89e2554fa`.
- The compatibility manifest references `.app.json` and the skills directory.
- The connector is the connection/tool surface; the plugin adds Drive/Docs/Sheets/Slides presentation and workflows.

The current plugin-management dependency resolver also identifies each App ID as the canonical provider plugin currently installed for the user.

## What OpenAI's package model says

There are two distinct server-integration mechanisms:

1. `.app.json` maps a plugin alias to an **existing registered MCP server/App**. It does not create the server, grant permissions or contain OAuth credentials.
2. Root `mcp.json` distributes a **bundled MCP server definition** with the plugin. Authentication is declared under that server's OpenAI extension. Secret values do not belong in the package.

A package can technically contain multiple resources, but these mechanisms should not both describe the same provider endpoint and capability surface. That creates duplicate connection prompts, tools and account-routing paths instead of useful composition.

The portable `mcp.json` and compatibility `.mcp.json` formats are not interchangeable names. A standalone portable package uses root `plugin.json` and root `mcp.json`; a Codex compatibility package uses `.codex-plugin/plugin.json` and `.mcp.json`.

These formats must currently be published as separate package roots when the Codex marketplace package references Apps. Codex classifies a package with root `plugin.json` as an Agent Plugin and suppresses its App declarations for non-global marketplaces. CloudStorage therefore keeps the portable manifests under `references/` and leaves `.codex-plugin/plugin.json`, `.app.json` and `.mcp.json` as the only active manifests in the Git-marketplace packages.

Official references:

- <https://developers.openai.com/plugins/build/plugins>
- <https://learn.chatgpt.com/docs/enterprise/plugin-management>

## What the registered CloudStorage OneDrive App contains

The owned private plugin `plugin_asdk_app_6ade0fe240408191bd087bff2df78e79` was inspected read-only through Plugin Creator.

- App ID: `asdk_app_6ade0fe240408191bd087bff2df78e79`
- Scope: personal/private
- Version: `1.0.0`
- Description: `OneDrive via the CloudStorage Portal MCP server`
- Files: only `.app.json` and `.codex-plugin/plugin.json`

Its `.app.json` points back to the same registered App ID. This confirms that the App-backed layer is already the current Dropbox/Google-style connection surface. The App's stored package does not need to expose the server URL or OAuth client configuration again.

## Current duplication in CloudStorage OneDrive

The marketplace package currently has both:

- `.app.json` referencing the registered OneDrive App; and
- root `mcp.json` declaring `https://cloudstorage-onedrive-mcp.vercel.app/mcp` plus the Microsoft client ID, scope and OAuth method.

If the registered App ID represents that same Vercel MCP endpoint—as the App description and the creation history indicate—these are two descriptions of the same provider route. The direct bundled definition can cause a second OAuth/connection surface and is not needed merely to add skills and branding.

This is the architectural equivalent of reintroducing Dropbox's or Google Drive's old MCP file next to their current App binding.

## Current duplication in CloudStorage Portal

The Portal currently combines:

- three registered App references: Dropbox, Google Drive and OneDrive;
- provider skills copied into one package; and
- a local stdio MCP runtime also named `onedrive`, with its own account, OAuth and local-folder concerns.

The local runtime has functions that the three registered Apps do not necessarily provide, especially local sync-folder inspection and Portal account coordination. Those functions are real, but they are a separate interface. Calling both the registered provider App and the local bridge `onedrive` makes the boundary unclear.

## Recommended target architecture

```text
CloudStorage Portal
├── App reference: Dropbox
├── App reference: Google Drive
├── App reference: CloudStorage OneDrive
└── Portal routing skills

CloudStorage OneDrive
├── App reference: registered hosted OneDrive MCP
└── focused OneDrive skills

CloudStorage Local Bridge (optional separate package)
├── bundled local stdio MCP
└── local sync-folder and local account-inspection skills
```

This model gives each provider one cloud connection surface. The Portal coordinates rather than reimplementing provider OAuth. Local-machine capabilities remain possible, but their package name, tool namespace and purpose make it clear that they are not a second cloud OneDrive connector.

## Controlled migration test

Do not delete either MCP definition first. Use this order:

1. Create a candidate copy of the standalone package without root `mcp.json`.
2. Keep `.app.json` required and keep the focused skill.
3. Install the candidate from the Git marketplace without removing the current working installation.
4. Verify that the App dependency resolves to `asdk_app_6ade0fe240408191bd087bff2df78e79`.
5. Verify that exactly the four hosted read-only tools remain discoverable and that authentication reuses the registered App connection.
6. Verify account identity, root listing, folder listing and text reading against a harmless test folder.
7. Only after that proof, remove the duplicate packaged `mcp.json` from the canonical standalone package.
8. Separately decide whether the Portal's local stdio runtime should become `cloudstorage-local-bridge`; do not remove it until its unique local functions are inventoried and covered elsewhere.

## Immediate decision

- Learn from Dropbox and Google Drive by adopting their **App reference plus skills** separation.
- Do not copy their private implementation or add old MCP manifests.
- Treat the registered `asdk_app_...` OneDrive App as the likely canonical hosted connection surface.
- Treat the marketplace's direct Vercel `mcp.json` as a duplicate candidate, not as confirmed removable until the controlled test succeeds.
- Keep the local Portal bridge separate from provider-cloud identity in the eventual package layout.
