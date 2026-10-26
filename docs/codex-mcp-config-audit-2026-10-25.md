# Codex MCP configuration audit — 2026-10-25

This audit separates the three OneDrive-facing integration routes currently visible on the Windows host.

## Active routes

1. `node_repl` is a Codex desktop runtime service pinned to the installed desktop build. Codex parses and starts it successfully. Its build-specific executable, Node path, trusted service map and native-pipe values should be maintained by the desktop installation rather than copied into a plugin.
2. `cloudstorage-portal-local` is the CloudStorage Portal local stdio broker. It owns the Portal's local sync-folder mode and its own provider grants. Fresh Codex discovery and execution were verified against the historically installed Portal `0.8.0-dev.20` / runtime `0.8.0-dev.11`, whose server identity was `onedrive`; the publication candidate is Portal `0.8.0-dev.27` / runtime `0.8.0-dev.13`. The Portal broker name is intentionally distinct from the independent `onedrive` App declaration so Codex retains both routes.
3. OneDrive references the workspace-owned Codex App `asdk_app_6adee7aa468881a4940e6933f518ddaa` under the explicit declaration name `onedrive`. It does not register a second plugin MCP server. The earlier private App IDs were deleted and replaced; the current workspace App was registered on 26 October 2026.

## Quarantined development route

`cloudstorage_onedrive_dev` points to `https://cloudstorage-onedrive-mcp.vercel.app/mcp`. It is preserved in `C:\Users\zilve\.codex\config.toml` but set to `enabled = false`.

It must remain disabled because the live authorization-server metadata currently advertises `client_secret_post`, while the Entra host registration is designed as a public PKCE client without a client secret. The live protected-resource identifier is the MCP URL, while the requested delegated scope belongs to `api://611e57ce-a334-46da-b172-98d03bf2bb9b/access_as_user`. Microsoft documents `AADSTS9010010` as an exact mismatch between the OAuth `resource` parameter and the app registration's Application ID URI. The retained Entra export also has no public-client redirect URI.

The loopback callback form in `config.toml` is supported by Codex for a pre-registered OAuth client, but support in Codex does not register that callback in Microsoft Entra. Microsoft requires the redirect URI on the application object and requires an exact path match. A portless `127.0.0.1` URI must be added through the application manifest when using plain HTTP.

## Conditions before re-enabling

- Choose one protected-resource identity and use it consistently in the server metadata, Entra Application ID URI, requested scope and Codex `oauth_resource`.
- Advertise a public-client-compatible token endpoint authentication method (`none`) only after the server and Entra client are actually configured that way.
- Register the exact loopback callback path on the host application as a public-client redirect URI, without introducing a client secret.
- Verify the authorization-server issuer contract, including issuer-bound responses if the stable shared Codex client metadata is used.
- Complete a new interactive `codex mcp login cloudstorage_onedrive_dev` and verify authenticated discovery plus one bounded Graph read before changing `enabled` back to `true`.

## Callback surfaces are not interchangeable

- `https://chatgpt.com/connector_platform_oauth_redirect` belongs to ChatGPT connector/App OAuth flows.
- Codex CLI's documented OAuth flow uses a loopback callback and may use ChatGPT-hosted client metadata derived from the MCP URL.
- `https://platform.openai.com/apps-manage/oauth` is an OpenAI Platform management surface; it does not register a Microsoft Entra redirect URI for the local Codex MCP client.

References:

- [Codex MCP OAuth client registration and callbacks](https://learn.chatgpt.com/docs/extend/mcp?surface=cli#oauth-client-registration-and-callbacks)
- [Codex configuration reference](https://learn.chatgpt.com/docs/config-file/config-reference)
- [Microsoft redirect URI restrictions and loopback guidance](https://learn.microsoft.com/entra/identity-platform/reply-url)
- [Microsoft Entra MCP resource troubleshooting](https://learn.microsoft.com/entra/agent-id/secure-mcp-server-with-entra-id)
