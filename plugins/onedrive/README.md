# OneDrive

Marketplace package for the registered OneDrive connection used by CloudStorage Portal.

The active Codex package references the live-verified personal OneDrive App with ID `asdk_app_6adfe5cd5d9c81918d3e167643ddc0fd` through `.app.json`. CloudStorage Portal uses the same replaceable reference. Its existing connector is technically named OneDrive Broker Staging and uses `https://cloudstorage-onedrive-staging.vercel.app/mcp` with DCR, PKCE S256 and `onedrive.read`. The current host verified the same immutable personal identity, 17 root items, a real token refresh and another successful root read on 27 October 2026. This explicitly selected personal route does not require a Business workspace. It is not the separate production App, and no deployment promotion is implied. The package already includes the existing OneDrive logo and composer icon; the cloud App icon still needs a separate UI correction. No credentials are packaged.

ChatGPT maintains this App record separately from the marketplace package. In the App details UI, `dev mode` is the lifecycle label for the directly registered development App, `DEVELOPMENT` is its review state, `asdk_app_...` is the persistent App ID, and `asdk_app_v_...` identifies the generated App version. These values do not come from this package's `version` field or from the MCP server's implementation version.

The earlier App IDs `asdk_app_6ade0fe240408191bd087bff2df78e79` and `asdk_app_6ade878e235c8191b19c6f72fc31981a` were deleted and are retained only in `PROVENANCE.json` as replacement history. Neither is an active dependency.

The separate CloudStorage Portal Local package owns the local broker runtime. This package does not register a second MCP server and CloudStorage Portal remains the three-provider aggregation layer.

The earlier hosted MCP candidate is preserved under `references/hosted-mcp-0.1.5.json`. It is not an active `mcp.json`, because its legacy `extensions.com.openai.auth` shape is rejected by the current Codex MCP parser and its deployed OAuth metadata has not yet been verified as compatible with the current callback/resource contract.
