---
name: cloudstorage-connections
description: Configure or inspect unified connection management for Dropbox, Google Drive and OneDrive. Use for OAuth, login, account IDs, token lifecycle, scopes, linking accounts and three-provider readiness.
---
# CloudStorage connections

The active Portal uses three native App bindings: Dropbox, Google Drive and OneDrive. It has no local MCP runtime dependency. Preserve these names and existing icons. OneDrive uses the canonical hosted broker and 28 discovered file tools; OneDrive Broker Staging is a historical test connection, not the Portal's selected OneDrive App.

For OneDrive, discover the actual App tools and verify the account before accessing files. Read-only grants use onedrive.read; writes require onedrive.read plus onedrive.write and explicit Microsoft Graph Files.ReadWrite consent through the host OAuth flow. A missing write grant must cause reauthorization, never credential extraction or a fallback to the local sync folder. Keep account/drive identifiers and continuation handles bound to the authenticated connection.

Historical local runtime and staging receipts describe separate experiments. Do not start, install or select CloudStorage Portal Local for current Portal workflows. Tool discovery, consent, live reads, live writes and refresh are separate verification checkpoints.

Present one portal connection list with three required providers: Dropbox, Google Drive and OneDrive. Reuse the existing authorized native connectors for supported operations. Read [the broker contract](../cloudstorage-portal/references/oauth-broker.md) before designing a separate OAuth service.

1. Discover current tools and supported account selectors. Record provider, connection reference, observed immutable account ID, tenant if applicable, granted capabilities when observable, and verification evidence. Unknown values remain unknown.
2. Report registration, adapter availability, consent, identity verification, read verification and write verification separately for each provider. Three-provider completion requires all three identities and intended operations to be verified.
3. A unified portal session may own multiple provider connections. Each provider uses its own OAuth app registration, authorization grant and access/refresh tokens. Never reuse a Google token for Microsoft or Dropbox. Do not extract credentials from existing connectors or browser storage.
4. If implementing an independent broker, obtain the hosting/callback address and app registration status. Request no secrets in chat. Configure secrets through the deployment platform's secret manager. App registration, callback registration and interactive provider consent must actually finish before live authorization can be claimed.
5. Derive requested scopes from intended operations using current official provider documentation. Do not grant broad write scopes just because a skill exists. Treat Google file access, Docs, Sheets, Slides, Dropbox file requests and sharing, and Microsoft delegated drive access separately.
6. Bind each operation to the authenticated portal owner and exact connection. Reject cross-user IDs, revoked connections, missing scopes and account mismatch. Never silently fall back to another account.
7. Refresh server-side through the matching provider, preserve an existing refresh token if the response omits one, atomically store rotations, and reauthenticate on invalid grants. Disconnect must remove portal access and use supported provider revocation without claiming remote revocation when unverified.
8. Return a capability matrix and the exact missing setup. A saved skill or design is not a deployed OAuth server.
