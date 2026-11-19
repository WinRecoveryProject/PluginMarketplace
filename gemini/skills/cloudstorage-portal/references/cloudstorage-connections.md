# Skill: cloudstorage-connections

- Plugin: `cloudstorage-portal` (0.9.14)
- Source: `plugins/cloudstorage-portal/skills/cloudstorage-connections/SKILL.md`

> Configure or inspect unified connection management for Dropbox, Google Drive and OneDrive. Use for OAuth, login, account IDs, token lifecycle, scopes, linking accounts and three-provider readiness.

## Instructions

### CloudStorage connections

The Portal coordinates three providers: Dropbox, Google Drive and OneDrive. Preserve the existing App bindings for compatibility, while discovering the actual authorized App or MCP connection in the current account. An unavailable historical Dropbox App is not a reason to replace an already connected Dropbox MCP or request another login. Verify its identity through its current tools. The Portal does not own a separate MCP runtime. Preserve provider names, icons and account boundaries. Discover OneDrive's current file-tool inventory rather than relying on a historical count.

For OneDrive, discover the actual App tools and verify the account before accessing files. Read-only grants use onedrive.read; writes require onedrive.read plus onedrive.write and explicit Microsoft Graph Files.ReadWrite consent through the host OAuth flow. A missing write grant must cause reauthorization, never credential extraction or a fallback to the local sync folder. Keep account/drive identifiers and continuation handles bound to the authenticated connection.

Historical local runtime and staging receipts describe separate experiments. Do not start, install or select CloudStorage Portal Local for current Portal workflows. Tool discovery, consent, live reads, live writes and refresh are separate verification checkpoints.

Present one portal connection list with three providers: Dropbox, Google Drive and OneDrive. Record each provider's actual App or MCP route and readiness separately; a missing optional App declaration does not override a verified existing provider connection. Reuse authorized tools and never copy credentials between routes. Read [the broker contract](../cloudstorage-portal/references/oauth-broker.md) before designing a separate OAuth service.

1. Discover current tools and supported account selectors. Record provider, connection reference, observed immutable account ID, tenant if applicable, granted capabilities when observable, and verification evidence. Unknown values remain unknown.
2. Report registration, adapter availability, consent, identity verification, read verification and write verification separately for each provider. Three-provider completion requires all three identities and intended operations to be verified.
3. A unified portal session may own multiple provider connections. Each provider uses its own OAuth app registration, authorization grant and access/refresh tokens. Never reuse a Google token for Microsoft or Dropbox. Do not extract credentials from existing connectors or browser storage.
4. If implementing an independent broker, obtain the hosting/callback address and app registration status. Request no secrets in chat. Configure secrets through the deployment platform's secret manager. App registration, callback registration and interactive provider consent must actually finish before live authorization can be claimed.
5. Derive requested scopes from intended operations using current official provider documentation. Do not grant broad write scopes just because a skill exists. Treat Google file access, Docs, Sheets, Slides, Dropbox file requests and sharing, and Microsoft delegated drive access separately.
6. Bind each operation to the authenticated portal owner and exact connection. Reject cross-user IDs, revoked connections, missing scopes and account mismatch. Never silently fall back to another account.
7. Refresh server-side through the matching provider, preserve an existing refresh token if the response omits one, atomically store rotations, and reauthenticate on invalid grants. Disconnect must remove portal access and use supported provider revocation without claiming remote revocation when unverified.
8. Return a capability matrix and the exact missing setup. A saved skill or design is not a deployed OAuth server.

## Bundled files

### File: `agents/openai.yaml`

```yaml
interface:
  display_name: "CloudStorage Connections"
  short_description: "Inspect cloud accounts, grants, and routing readiness"
  icon_small: "./assets/cloudstorage-portal.png"
  icon_large: "./assets/cloudstorage-portal.png"
  brand_color: "#2557D6"
  default_prompt: "Use $cloudstorage-connections to inspect Dropbox, Google Drive, and OneDrive connection readiness without changing an account or grant."
```

### Not embedded

- `assets/cloudstorage-portal.png` (binary asset, not embedded)
