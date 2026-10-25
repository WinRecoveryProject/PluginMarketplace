# Unified OAuth broker contract

Status: the hosted broker remains a specification. Version 0.3.0 includes a local development implementation in runtime/, with provider-specific code exchange, in-memory tokens, refresh, account identity and bounded root reads. It exposes five optional local stdio MCP tools and loopback browser controls. Live provider OAuth is not verified and the MCP server is not installed in the host. An opt-in OneDrive local-sync adapter lists the existing sync root independently. The local implementation loses credentials on restart and must not be exposed as a hosted service.

## Identity and connection boundaries

One portal login/session maps to multiple separately consented cloud connections. Model the portal user separately from provider accounts. An email match never links accounts automatically. Store owner ID, opaque connection ID, provider, immutable provider subject, optional tenant and drive ID, granted scopes, expiry and verification state as metadata. Keep credentials encrypted in a server-side secret store, isolated by owner and connection. Logs and plugin archives contain no credentials.

Use authorization-code flows with PKCE where supported by the selected client type. Bind a short-lived, single-use state value to the session, provider, redirect URI and pending connection; validate it before code exchange. Validate OIDC issuer, audience, expiry and nonce when using ID tokens. Dropbox account identity is obtained through its authorized account API rather than assuming OIDC support. Prevent arbitrary token endpoints, redirect URLs or caller-provided owners. Use official SDKs and current provider documentation.

## Independent provider configuration

| Provider | Separate registration | Credential boundary | Identity/read acceptance |
| --- | --- | --- | --- |
| Dropbox | Dropbox app and registered redirect URI | Dropbox access and optional refresh token | Authorized account identity and bounded folder read |
| Google Drive | Google OAuth client and consent configuration | Google access and optional refresh token | Selected Google identity and Drive read; verify Docs/Sheets/Slides separately |
| OneDrive | Microsoft Entra application with intended account types and redirect URI | Microsoft delegated Graph access and refresh token | Intended Microsoft identity, drive identity and bounded drive read |

Request only operation-appropriate scopes. Google offline authorization uses its documented offline-access flow; Dropbox has its own offline token request; Microsoft uses delegated consent and offline_access when refresh access is needed. Refresh-token issuance is provider-dependent. Never copy connector client credentials or tokens into a new broker. Native connector grants cannot be assumed to authorize the new application.

## Service interface to implement

- Begin connection: authenticated owner, allowlisted provider and requested operation set; create bound pending authorization and return an authorization redirect.
- Complete callback: verify provider, state, expiry, replay protection and PKCE; exchange code server-side and resolve actual account identity before linking.
- List connections: return only the authenticated owner's redacted metadata and per-operation capability evidence.
- Execute operation: authorize owner/connection/provider, check granted scopes and resource permissions, then call the matching adapter.
- Refresh: serialize concurrent refresh for a connection, retain omitted refresh tokens and commit returned rotations atomically.
- Disconnect: deny subsequent operations immediately, remove stored credentials and attempt documented provider revocation; report actual revocation outcome.

Protect sessions against CSRF and use secure, HttpOnly cookies. Use TLS outside supported local development callbacks. Avoid logging authorization codes, tokens or signed download URLs. Never blindly retry uncertain writes.

## Release gates

All three app registrations, verified callback hosting, secret-store provisioning, adapter implementations and interactive consent are still required for an independent deployment. Validate account isolation, wrong-provider callback rejection, state replay, revoked access, refresh rotation and partial-provider failures. Test actual reads for all three clouds and test requested writes independently with explicit targets. Until these pass, report the native-workflow release separately from OAuth deployment.

## Official sources

- https://developers.dropbox.com/oauth-guide
- https://dropbox.tech/developers/using-oauth-2-0-with-offline-access
- https://developers.google.com/identity/protocols/oauth2/web-server
- https://learn.microsoft.com/en-us/graph/auth-v2-user
