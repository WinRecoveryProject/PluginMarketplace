# Skill: cloudstorage-portal

- Plugin: `cloudstorage-portal` (0.9.14)
- Source: `plugins/cloudstorage-portal/skills/cloudstorage-portal/SKILL.md`

> Use when the user wants to search, read, upload, organize, share, inspect file history or transfer files across Dropbox, Google Drive and OneDrive through their existing App or MCP connections.

## Instructions

### CloudStorage Portal

Use the existing authorized connections for Dropbox, Google Drive and OneDrive. The App bindings in .app.json preserve compatibility; a declaration alone does not prove that its App is installed or connected in the current account. Dropbox may already be provided by the connected Dropbox MCP. Discover its actual tools and identity rather than requesting a second login because the historical Dropbox App is unavailable. OneDrive uses the canonical hosted OneDrive App. Preserve existing names, icons and connections; do not start a separate Local runtime.

Discover the actual provider tools and confirm account identity before operations. Read the relevant provider skill. Tool discovery, OAuth consent, actual operations and successful readback are separate evidence; do not claim a complete integration from login or package validation alone. Missing write scopes require the host OAuth flow, not a silent token substitution.

#### Workflow routing

Use the full provider workflows included in this package; do not limit the portal to search and read.

| Request | Packaged skill |
| --- | --- |
| Setup documentation, 0 kr. architecture, callbacks and matching credential fields | [cloudstorage-setup-docs](../cloudstorage-setup-docs/SKILL.md) |
| Dropbox search | [find-dropbox-content](../find-dropbox-content/SKILL.md) |
| Dropbox metadata and content | [inspect-dropbox-file](../inspect-dropbox-file/SKILL.md) |
| Dropbox folders, copy, move and rename | [organize-dropbox-folder](../organize-dropbox-folder/SKILL.md) |
| Dropbox sharing | [share-dropbox-content](../share-dropbox-content/SKILL.md) |
| Save a file from this conversation to Dropbox | [upload-to-dropbox](../upload-to-dropbox/SKILL.md) |
| Collect uploads from other people with a Dropbox file request | [collect-files-with-request](../collect-files-with-request/SKILL.md) |
| Dropbox cleanup | [clean-up-dropbox-content](../clean-up-dropbox-content/SKILL.md) |
| Google Drive files, folders, import, export and versions | [google-drive](../google-drive/SKILL.md) |
| Google Docs | [google-docs](../google-docs/SKILL.md) |
| Google Sheets | [google-sheets](../google-sheets/SKILL.md) |
| Google Slides | [google-slides](../google-slides/SKILL.md) |
| Google Drive comments | [google-drive-comments](../google-drive-comments/SKILL.md) |
| Three-provider OAuth and connection setup | [cloudstorage-connections](../cloudstorage-connections/SKILL.md) |
| OneDrive operations and adapter readiness | [onedrive](../onedrive/SKILL.md) |

Skills contain workflows; executable tools, granted scopes and resource permissions determine actual access. Never report a copied skill as a newly granted permission. Provider tools remain provider-specific. Google Docs, Sheets and Slides operations have no automatic OneDrive or Dropbox equivalent.

1. Discover available provider tools and their current account selectors. Treat dependency installation, an advertised account, successful reads, write capability and current consent as separate states. Never infer a connected account from a remembered email.
2. For Google Drive, inspect each current tool schema before choosing an account. If it exposes link_id, pass only an exact currently allowed selector. If it has no account selector, do not send a remembered link_id: verify the current profile, bind the operation to that observed identity, and report native multi-account selection as unavailable. Never treat removal of a selector as permission to write to a default account. After an argument-binding failure, re-read the schema and reconcile identity/resources with read-only calls before any retry; never replay uncertain writes. For supported cross-account reads, issue the same bounded query independently for all intended accounts; aggregate only after every result settles. A failed account is a partial failure, never an empty successful result. Keep each provider's pagination cursor bound to the account and original query.
3. Attach provider, account identity, item ID, returned URL and read status to each result. Use `(provider, account-selector, item-id)` as identity. Do not collapse equal file names across accounts. A search hit is metadata, not read content.
4. Before writes, resolve both source and destination accounts and resources. Ask only when the intended target is ambiguous. Apply the provider's existing consent and permission rules. This plugin cannot transfer, elevate or permanently preserve permissions. Do not change plugin permissions unless the user requests an exact mode and target.
5. For Dropbox, reuse its current authorized connection and returned paths/IDs. Follow the Dropbox workflow for sharing, uploads, moves and deletion. Preserve sharing state unless the user asks to change it.
6. Include OneDrive in every three-provider readiness report. Discover a supported integration or the configured Microsoft Graph adapter, verify account identity and drive access, and report the precise missing dependency when unavailable. Never treat SharePoint eligibility or a local OneDrive folder as proof of personal OneDrive API access. Do not fabricate account IDs, credentials or connected status. Follow the packaged OneDrive workflow.
7. For a transfer, read the exact source version, materialize through supported provider tools, verify bytes/hash where possible, write to the resolved destination and read back metadata. Record a receipt. Do not delete the source unless explicitly requested. Never replay uncertain writes automatically.
8. Keep credentials in provider-managed authentication. Do not put tokens, refresh tokens, passwords, permission grants or consent assertions into configuration, SQL, source code, logs or component archives.

The Portal routes to the existing provider Apps or MCP connections. Its OneDrive skill documents the current hosted read/write contract and limits. Historical Local-runtime evidence remains reference material; never use it as proof for the active App.

## Bundled files

### File: `agents/openai.yaml`

```yaml
interface:
  display_name: "CloudStorage Portal"
  short_description: "Coordinate Dropbox, Google Drive, and OneDrive"
  icon_small: "./assets/cloudstorage-portal.png"
  icon_large: "./assets/cloudstorage-portal.png"
  brand_color: "#2557D6"
  default_prompt: "Use $cloudstorage-portal to inspect my available cloud connections and route this task to Dropbox, Google Drive, or OneDrive."
```

### File: `references/inspection.md`

#### Provider package inspection, 2026-10-21

##### Copied source

Dropbox 6.0.0: six complete skill directories for discovery, inspection, organization, sharing, file requests and cleanup.

Google Drive 0.1.22: five complete skill directories for Drive, Docs, Sheets, Slides and comments, including packaged scripts, runtimes, host bridges, references and assets. All 71 imported files were SHA-256 compared with their installed source copies before packaging. See provider-provenance.json.

The two packages' root .app.json files point to existing connector app IDs. The portal already uses those same app IDs; they are retained. These identifiers are connector dependencies, not reusable OAuth client registrations for a new broker.

##### Login findings

The Google Docs entrypoint explicitly delegates authentication to connector tools. Its trusted-read wrapper likewise calls authenticated connector tools and explicitly does not use a separate credential setup. Google Docs and Slides host/runtime programs normalize, render or bridge content; copying them does not copy a login server. The six Dropbox skills describe tool workflows and do not contain an OAuth authorization-code exchange implementation.

No provider authorization server implementation or reusable OAuth client secret was found in the copied skill trees. The visible connector tools expose content operations and identity reads, not token export. This is a finding about the inspected distribution, not an assertion about inaccessible hosted server source.

##### Reusable parts

Reuse all eleven provider workflows, tool routing, target resolution, content helpers and provider-specific safety/verification rules. Preserve existing native connector authentication for native operations. Tool inventory records the observed executable interface; tools remain supplied by their original connectors.

For an independent login system, implement one connection broker with separate Dropbox, Google and Microsoft adapters and independent grants. Account IDs are provider-scoped. Link provider accounts only through an authenticated portal session and successful authorization; matching email is insufficient. OneDrive requires its own verified connector or Graph implementation.

##### Cost-conscious next implementation

The user has no provider app registrations and prefers a free path. Start with a personal/local development client and loopback callback where supported, avoiding paid hosting. Select public-client versus confidential-client registration from actual runtime requirements and current official docs. Local callbacks alone do not make a local broker reachable from a cloud-hosted ChatGPT plugin; host integration must be chosen and tested separately.

Dropbox documents no developer charge for its platform. Google documents standard Drive API use at no additional cost. Microsoft standard Graph APIs are included with the relevant user license within usage thresholds. Existing storage subscriptions, public hosting, special APIs and public-app verification can still carry costs. Google's restricted-scope requirements include personal/development exceptions; do not promise a free public broad-access app.

Sources: https://www.dropbox.com/developers/support ; https://developers.google.com/workspace/drive/api/guides/limits ; https://learn.microsoft.com/en-us/graph/metered-api-overview ; https://developers.google.com/identity/protocols/oauth2/production-readiness/restricted-scope-verification

##### Verification limits

Package copying and routing are verified separately from actual login. No new OAuth app was registered, no provider consent performed, no cloud files modified, no new OAuth server deployed, and no OneDrive operation verified by this update. All three clouds remain the required final acceptance target.

### File: `references/oauth-broker.md`

#### Unified OAuth broker contract

Current implementation, 2 November 2026: CloudStorage Portal routes to the existing native Dropbox and Google Drive Apps and the registered personal OneDrive App. OneDrive uses the hosted OAuth broker at https://cloudstorage-onedrive-mcp.vercel.app/mcp, runtime 0.3.2, DCR and onedrive.read plus onedrive.write. Connected-account UI, identity, root listing and isolated read/write operations through the App route are live verified. Refresh is a separate pending checkpoint. CloudStorage Portal Local has been retired; do not install it or route through its sync-folder adapter. For the deployed contract and field mapping, read [architecture](../../cloudstorage-setup-docs/references/architecture.md) and [setup](../../cloudstorage-setup-docs/references/setup-guide.md).

The remaining sections are design requirements for a hypothetical independent multi-provider broker. They are not a description of the active Portal, and do not imply that native Google/Dropbox credentials can be extracted or reused. A broad multi-provider broker, persistent revocation and multi-instance replay protection are not proven by the OneDrive implementation.

##### Identity and connection boundaries

One portal login/session maps to multiple separately consented cloud connections. Model the portal user separately from provider accounts. An email match never links accounts automatically. Store owner ID, opaque connection ID, provider, immutable provider subject, optional tenant and drive ID, granted scopes, expiry and verification state as metadata. Keep credentials encrypted in a server-side secret store, isolated by owner and connection. Logs and plugin archives contain no credentials.

Use authorization-code flows with PKCE where supported by the selected client type. Bind a short-lived, single-use state value to the session, provider, redirect URI and pending connection; validate it before code exchange. Validate OIDC issuer, audience, expiry and nonce when using ID tokens. Dropbox account identity is obtained through its authorized account API rather than assuming OIDC support. Prevent arbitrary token endpoints, redirect URLs or caller-provided owners. Use official SDKs and current provider documentation.

##### Independent provider configuration

| Provider | Separate registration | Credential boundary | Identity/read acceptance |
| --- | --- | --- | --- |
| Dropbox | Dropbox app and registered redirect URI | Dropbox access and optional refresh token | Authorized account identity and bounded folder read |
| Google Drive | Google OAuth client and consent configuration | Google access and optional refresh token | Selected Google identity and Drive read; verify Docs/Sheets/Slides separately |
| OneDrive | Microsoft Entra application with intended account types and redirect URI | Microsoft delegated Graph access and refresh token | Intended Microsoft identity, drive identity and bounded drive read |

Request only operation-appropriate scopes. Google offline authorization uses its documented offline-access flow; Dropbox has its own offline token request; Microsoft uses delegated consent and offline_access when refresh access is needed. Refresh-token issuance is provider-dependent. Never copy connector client credentials or tokens into a new broker. Native connector grants cannot be assumed to authorize the new application.

##### Service interface to implement

- Begin connection: authenticated owner, allowlisted provider and requested operation set; create bound pending authorization and return an authorization redirect.
- Complete callback: verify provider, state, expiry, replay protection and PKCE; exchange code server-side and resolve actual account identity before linking.
- List connections: return only the authenticated owner's redacted metadata and per-operation capability evidence.
- Execute operation: authorize owner/connection/provider, check granted scopes and resource permissions, then call the matching adapter.
- Refresh: serialize concurrent refresh for a connection, retain omitted refresh tokens and commit returned rotations atomically.
- Disconnect: deny subsequent operations immediately, remove stored credentials and attempt documented provider revocation; report actual revocation outcome.

Protect sessions against CSRF and use secure, HttpOnly cookies. Use TLS outside supported local development callbacks. Avoid logging authorization codes, tokens or signed download URLs. Never blindly retry uncertain writes.

##### Release gates

All three app registrations, verified callback hosting, secret-store provisioning, adapter implementations and interactive consent are still required for an independent deployment. Validate account isolation, wrong-provider callback rejection, state replay, revoked access, refresh rotation and partial-provider failures. Test actual reads for all three clouds and test requested writes independently with explicit targets. Until these pass, report the native-workflow release separately from OAuth deployment.

##### Official sources

- https://developers.dropbox.com/oauth-guide
- https://dropbox.tech/developers/using-oauth-2-0-with-offline-access
- https://developers.google.com/identity/protocols/oauth2/web-server
- https://learn.microsoft.com/en-us/graph/auth-v2-user

### File: `references/onedrive-local-findings.md`

#### Lokal OneDrive-undersøgelse, 21. oktober 2026

OneDrive.exe og den undersøgte programmappe har version 26.189.0928.0007. Mappen indeholder adal.dll, FileSyncClient.dll, SyncEngine.dll, FileCoAuth-komponenter og OneDrive.Sync.Service-komponenter. Tilstedeværelse er ikke bevis for et offentligt login-API.

com.microsoft.onedrive.nucleus.auth.provider.json registrerer Microsoft.SharePoint.NativeMessagingClient.exe som native authentication provider for Microsoft Nucleus. Manifestet angiver stdio og præcis to tilladte Chrome extension-origins. Det er ikke et MCP-manifest eller en generel OAuth-loginindgang. Authenticode returnerede Valid for den undersøgte native messaging-klient og adal.dll; det beviser ikke offentlig API-understøttelse.

AppData/Local/Microsoft/OneDrive indeholder EBWebView, ListSync, logs, settings, setup og Update. settings har en Personal-mappe. Ingen settings- eller login-cachefiler blev åbnet. OneAuth har mapperne accounts og blobs; kun dette niveau blev listet, ingen account-/blob-filer blev åbnet, kopieret eller afkodet.

OneDrive og OneDriveConsumer-miljøvariablerne peger begge på C:\Users\zilve\CloudStorage\OneDrive. Det identificerer en konkret lokal rod, ikke aktuelt cloud-login eller fuldført synkronisering.

##### Implementeret lokal vej

runtime/local-onedrive.mjs bruger en udtrykkeligt konfigureret ONEDRIVE_LOCAL_ROOT med højeste prioritet. Når nøglen helt mangler, udledes den fra Windows-miljøets første absolutte `OneDriveConsumer`, `OneDriveCommercial` eller `OneDrive`; en eksplicit tom værdi deaktiverer fortsat funktionen. Adapteren lister højst 25 direkte elementer, åbner ingen filindhold, går ikke ned i undermapper og følger ikke child-links. Availability/hydration-status er ukendt. Metadataopslag kan afhænge af sync-klientens placeholder-håndtering; adapteren anmoder ikke aktivt om download, pinning eller hydrering.

En faktisk test mod C:\Users\zilve\CloudStorage\OneDrive fandt 17 direkte elementer. Resultatet er local-sync med cloudIdentityVerified=false, cloudSyncVerified=false og fileContentRead=false. Ingen filnavne blev udskrevet i testkvitteringen.

Dette giver eksisterende lokal OneDrive-adgang uden nye Microsoft OAuth-credentials til det begrænsede workflow. Det erstatter ikke Graph-søgning, deling, versionshistorik, ikke-synkroniserede cloudområder eller Google Docs/Sheets/Slides-funktioner.

##### Windows-integreret login

Microsoft dokumenterer MSAL.NET med Web Account Manager som vej til Windows-kendte konti. Vores app skal have sin egen registrering og relevante scopes; SSO og ekstra samtykke afhænger af konto og politik. Brug offentliggjorte biblioteker frem for at indlæse OneDrives private DLL'er eller behandle OneAuth som et SDK.

Microsoft omtaler OneAuth som credential-cache i sin OneDrive-fejlsøgningsvejledning. Cachefilerne er ikke brugt som credentialkilde, ryddet eller ændret i denne undersøgelse.

##### Kilder

- https://learn.microsoft.com/en-us/entra/msal/dotnet/acquiring-tokens/desktop-mobile/wam
- https://learn.microsoft.com/en-us/windows/win32/cfapi/build-a-cloud-file-sync-engine
- https://learn.microsoft.com/en-us/troubleshoot/sharepoint/sync/cant-sync-after-migration

### File: `references/portal-contract.md`

#### Historical Portal contract

This file records retired Local-runtime experiments through 0.8.0-dev.15. It is
historical evidence, not the active package or connection contract. The current
Portal uses the existing provider Apps or MCP connections, including the hosted
OneDrive App. It does not require a separate Local plugin, runtime or login.

For current behavior, read the [Portal workflow](../SKILL.md) and
[setup documentation](../../cloudstorage-setup-docs/SKILL.md). Verify current
account identity and actual file access independently of the archived results.

##### Archived implementation notes

Plugin version 0.8.0-dev.15 embeds local runtime 0.8.0-dev.9. It is separately installed as `cloudstorage-portal@cloudstorage-local` and passed direct MCP discovery. `cloudstorage_execute` binds each implemented read to an explicit provider and connection. One own-app Dropbox grant and one own-app OneDrive grant were previously present together and live-verified for identity/root; OneDrive folder/text were also verified. Runtime dev.9 adds bounded search within the selected personal OneDrive drive, filters shortcuts and cross-drive results, and never aliases SharePoint as the provider. Google Drive API, test audience, test user, `drive.readonly`, Desktop OAuth client and the local DPAPI-protected client secret are configured; startup leaves that secret encrypted until token exchange or refresh needs it. Google consent, immutable identity, bounded root read and a real process stop/restart followed by token refresh, identity revalidation and a second root read are live-verified. OAuth authorization state is single-use and remains valid for 30 minutes, replacing the five-minute window that expired during a real interactive login. The eleven imported Dropbox/Google workflows and their native app references are preserved; the local broker neither copies their credentials nor claims to observe their selected accounts.

The verified package contains 122 plugin-owned files outside `node_modules`, with zero candidate/install mismatches. It preserves 71 imported provider files with zero provenance-hash mismatches, all 11 provider workflows and all 14 total skills. Native Dropbox and Google connector reads were separately live-audited across the imported workflow surfaces without performing mutations. Those native connections remain distinct from the broker's own OAuth grants. The current dev.6 suite has 56 passing tests and zero failures, including a real Windows DPAPI round trip and protected provider-secret storage.

Version 0.5.0 adds a sixth local MCP tool for relative subfolder metadata, plus an authenticated browser endpoint with CSRF protection. The local adapter checks path components and canonical root containment and rejects directory links. It does not expose content reads, recursive scans or write operations. Nineteen tests passed in the source runtime. Live provider OAuth remains pending.

Version 0.4.0 uses the official MCP Server SDK 2.3.1 for the local runtime, including stdio transport, version handling, tool listing and tool calls. Five existing tools retain their operation boundaries and use strict argument schemas. The dependency lock and license texts are shipped. An actual 2025-06-18 stdio client exchange was tested against the SDK implementation; live cloud OAuth and host MCP installation are still pending. Historical implementation notes follow.

Version 0.3.0 preserves all eleven imported provider skills and their support files, and adds a local OAuth prototype, five stdio MCP tools and an optional OneDrive sync-folder metadata adapter. The local adapter has been tested against the user's actual sync root. OAuth provider flows are implemented and tested with simulated responses; client registrations and live consent are still pending. There is no hosted deployment or automatic MCP installation. See [oauth-broker.md](oauth-broker.md), [onedrive-local-findings.md](onedrive-local-findings.md) and the [current Portal workflow](../SKILL.md) for the active contract. The retired runtime README is not distributed with the current package.

A future server must use a trusted per-user connection broker, not copied ChatGPT connector tokens. Store connection metadata separately from credentials. Identify connections by owner, provider, tenant (when applicable) and immutable provider subject; email is a display label. Bind each operation to a server-authorized connection. A requested account ID is not proof of access.

Expose account discovery, bounded search, file metadata and content reads first. Keep pagination and errors per account. Return no-store responses and render provider names as text. For writes, require a clear target, provider authorization and platform consent; use idempotency keys and reconciliation before retry.

OneDrive requires a supported connector or a separately registered Microsoft application, verified redirect URI and delegated authorization. Discover the actual personal/business account capability before choosing scopes. Record granted scopes from the authorization service. Support revocation and reauthentication. Never request passwords in chat.

Sites deployment is pending: the required list_plugin_eligibility capability was unavailable during creation. Before a hosted implementation, rerun eligibility discovery, preserve canonical plugin IDs, and follow the Sites server/identity documentation. Do not substitute an arbitrary host to bypass the unavailable eligibility check.

Acceptance checks: two Google accounts searched independently; account A failure leaves B's results labeled; writes cannot fall back to another account; revoked connection fails closed; cross-user connection IDs are rejected; OneDrive readback proves the intended account; no credentials in logs or artifacts. Hosted access and write consent must be tested separately from native connector reads.

### File: `references/provider-local-overrides.json`

```json
[
  {
    "path": "skills/google-docs/SKILL.md",
    "originalSha256": "1c4f8e6477a61d45370731143fd926d2b8917594982f9cb39677909d645625c1",
    "currentSha256": "f8a284bd10f292af86bd7073ddec36351b2406e572df94bf31ec083eef50188e",
    "appliedInPortalVersion": "0.9.2",
    "reason": "Reviewed discovery-trigger clarification; original upstream provenance remains unchanged."
  },
  {
    "path": "skills/google-slides/SKILL.md",
    "originalSha256": "f85bd1d7080becf8c043a3646b6c3a53fbcd6d2a77c62a15112b8d89e01a4b83",
    "currentSha256": "b6f41518b28d7854c71fb4160b54dc1f69cea8000fc84468bc7720f58e33711a",
    "appliedInPortalVersion": "0.9.5",
    "reason": "Reviewed native Node host injection and Windows regression coverage; existing POSIX workflow retained. Original upstream provenance is unchanged. New Node adapter and Windows guide are original Portal additions."
  },
  {
    "path": "skills/google-slides/host/export-and-render-slides.mjs",
    "originalSha256": "43d2436482267426bd48ec20e11787b7c2f84e72adde26e2fee2d1a121aecec4",
    "currentSha256": "3bd8d59ad482093895faab53ac8e89c808553714e11906d5500bd04d47cfbe1e",
    "appliedInPortalVersion": "0.9.5",
    "reason": "Reviewed native Node host injection and Windows regression coverage; existing POSIX workflow retained. Original upstream provenance is unchanged. New Node adapter and Windows guide are original Portal additions."
  },
  {
    "path": "skills/google-slides/host/export-and-render-slides.test.mjs",
    "originalSha256": "6bc4c07cde3183bd40495a1d985862b432f3e5c1f110d2b309ea803096034ce8",
    "currentSha256": "4a992c64ba9915bfe023fbdc3b1c3d4ef9696f4ad9187b1daf7a4ea1bf45cc26",
    "appliedInPortalVersion": "0.9.5",
    "reason": "Reviewed native Node host injection and Windows regression coverage; existing POSIX workflow retained. Original upstream provenance is unchanged. New Node adapter and Windows guide are original Portal additions."
  },
  {
    "path": "skills/google-slides/host/read-template-to-file.mjs",
    "originalSha256": "bdeb61186088aab091f2f8c5330449a6aa5e9e3a1e1abbfc0cf132dfc8b27484",
    "currentSha256": "e2ae070ca9777fdc0f91505493fb8c80db64a2fefc13ecdae7601015f3e4db37",
    "appliedInPortalVersion": "0.9.5",
    "reason": "Reviewed native Node host injection and Windows regression coverage; existing POSIX workflow retained. Original upstream provenance is unchanged. New Node adapter and Windows guide are original Portal additions."
  }
]
```

### File: `references/provider-provenance.json`

```json
[
  {
    "version": "0.1.22",
    "sha256": "1C4F8E6477A61D45370731143FD926D2B8917594982F9CB39677909D645625C1",
    "provider": "google-drive",
    "path": "skills/google-docs/SKILL.md"
  },
  {
    "version": "0.1.22",
    "sha256": "07A3096D020B624D1246D411E6D81CC4686A77E8CB4F486D9B43C13BF4261F17",
    "provider": "google-drive",
    "path": "skills/google-docs/agents/openai.yaml"
  },
  {
    "version": "0.1.22",
    "sha256": "2A61BAAEF537798F02530BED0C41DC0B6FBF964134563F2811D1E0C6DEC8304C",
    "provider": "google-drive",
    "path": "skills/google-docs/assets/google-docs-small.svg"
  },
  {
    "version": "0.1.22",
    "sha256": "B416735B10FB7BC27FE80F72007EF957486D7C29AE603083E137CA689D6920D5",
    "provider": "google-drive",
    "path": "skills/google-docs/assets/google-docs.png"
  },
  {
    "version": "0.1.22",
    "sha256": "97F002CCA96055FC8EC5F1C032A89A2966BA2A0F96CA51567CF450CA66163B4A",
    "provider": "google-drive",
    "path": "skills/google-docs/host/docs-dropdown-executor.mjs"
  },
  {
    "version": "0.1.22",
    "sha256": "47CD11AE7872BF7CDA18CD5E78E7229BA6485045585838C93B9265117F38B878",
    "provider": "google-drive",
    "path": "skills/google-docs/host/docs-dropdown-file-bridge.mjs"
  },
  {
    "version": "0.1.22",
    "sha256": "A31A4A530AD61538385CE28D87D2BE5C44810095DF4DE1AC6EED84628C492DD4",
    "provider": "google-drive",
    "path": "skills/google-docs/host/docs-stdin-receiver.pl"
  },
  {
    "version": "0.1.22",
    "sha256": "8EE2B99C05D1ADCDD4A4AB71C4F904DBF4BEAD9CD1C4DAAB2DD2644B37C3FBD4",
    "provider": "google-drive",
    "path": "skills/google-docs/host/docs-trusted-read-file-bridge.mjs"
  },
  {
    "version": "0.1.22",
    "sha256": "C7C1AFFE5FD3E37924F005C27AA0D6FFBC10E1D2D7CA8FB55D8F38F288CA2EAD",
    "provider": "google-drive",
    "path": "skills/google-docs/host/docs-trusted-read-wrapper.mjs"
  },
  {
    "version": "0.1.22",
    "sha256": "AFF93372198D3DD36ECB33C777F82B5EA359600CACFC636BAE94102FD7BD3DA7",
    "provider": "google-drive",
    "path": "skills/google-docs/references/reference-direct-request-composition.md"
  },
  {
    "version": "0.1.22",
    "sha256": "070AF740894DCDA59B8A7CC1849689DF416EA92F255AB30BFF3FF0A52948E9E9",
    "provider": "google-drive",
    "path": "skills/google-docs/references/reference-meeting-notes-direct.md"
  },
  {
    "version": "0.1.22",
    "sha256": "96DEBF093BE85229F863694A3FB6D6023A88DC5ECD38E353891F23FE9602A7A5",
    "provider": "google-drive",
    "path": "skills/google-docs/references/reference-smart-chips-and-building-blocks.md"
  },
  {
    "version": "0.1.22",
    "sha256": "DEFDD8AC40E32C11C5AA65471CD7AE4078721076B1815A51078A027C7DF53B04",
    "provider": "google-drive",
    "path": "skills/google-docs/references/reference-trusted-read-wrapper.md"
  },
  {
    "version": "0.1.22",
    "sha256": "324DE06DEDC0476C91F7F3D2FE4B15C4CB992ACE2AFB9E57DF498A994020878A",
    "provider": "google-drive",
    "path": "skills/google-docs/runtime/docs-read-normalizer.mjs"
  },
  {
    "version": "0.1.22",
    "sha256": "F845319BD56C8BF07F74CC62CFDF10421D58464F0EFFCCF8A720319B091CFBA7",
    "provider": "google-drive",
    "path": "skills/google-docs/runtime/dropdown-common.mjs"
  },
  {
    "version": "0.1.22",
    "sha256": "2894E9B9EA6304BE097E0F8C67E96E7E9BD9A7181C38B95DABD6056CB8197536",
    "provider": "google-drive",
    "path": "skills/google-docs/runtime/dropdown-contract.mjs"
  },
  {
    "version": "0.1.22",
    "sha256": "5D4229FC4E37C21921A9E749C07239A9DAB36E00C4F6B57BAAA8466AF4130043",
    "provider": "google-drive",
    "path": "skills/google-docs/runtime/dropdown-inventory.mjs"
  },
  {
    "version": "0.1.22",
    "sha256": "92D39533DD1C908699B5DB941F170543BCFCCAA8EB8CED7A5D5D332A6D8F8939",
    "provider": "google-drive",
    "path": "skills/google-docs/runtime/dropdown-plan.mjs"
  },
  {
    "version": "0.1.22",
    "sha256": "2F1CA983FA3A8E21312E4FCAD392C8DABD443D3720706FAC8239E3DAB0B4F8DC",
    "provider": "google-drive",
    "path": "skills/google-docs/runtime/dropdown-routing.mjs"
  },
  {
    "version": "0.1.22",
    "sha256": "F7E08AD9AA36373043FF1B36FB81E1721B922B0CA6B44A9CB5EE5287535279E1",
    "provider": "google-drive",
    "path": "skills/google-docs/scripts/build_docs_dropdown_inventory.mjs"
  },
  {
    "version": "0.1.22",
    "sha256": "E439D12AD25F60049C15D8BBFABB9E29FA6B3233C42E653006049127414C2521",
    "provider": "google-drive",
    "path": "skills/google-docs/scripts/canonicalize_google_workspace_url.mjs"
  },
  {
    "version": "0.1.22",
    "sha256": "CF8C99D6D2D40409AB36CCEBBCC7C54A010178D7BF41E12F52CC12CC96F99ED5",
    "provider": "google-drive",
    "path": "skills/google-docs/scripts/create_docs_dropdown_execution_context.mjs"
  },
  {
    "version": "0.1.22",
    "sha256": "BB0FE83D265F2DB2EB47302514EEBB7FCA1B844D4BE247E63640FFDA6DD6E154",
    "provider": "google-drive",
    "path": "skills/google-docs/scripts/freeze_docs_dropdown_contract.mjs"
  },
  {
    "version": "0.1.22",
    "sha256": "1AB562784F52C3AEFEC0858B5134E5EFA0EC7B79B129B9E338576C068E6AFDAA",
    "provider": "google-drive",
    "path": "skills/google-docs/scripts/validate_docs_dropdown_plan.mjs"
  },
  {
    "version": "0.1.22",
    "sha256": "DABAE8A192C861B76CF7B5742BDF14F8ED35E67D8E6CACFD5F746FFBEFD6DA5C",
    "provider": "google-drive",
    "path": "skills/google-drive/SKILL.md"
  },
  {
    "version": "0.1.22",
    "sha256": "C78A0CFF8B8127845B3626AD2FE285BA2333268C5252B124EB3E2DDAA22BA2FB",
    "provider": "google-drive",
    "path": "skills/google-drive/agents/openai.yaml"
  },
  {
    "version": "0.1.22",
    "sha256": "A0DA54A5F966E876668AB59D8DF987DDAD1328846216578356E6C10B07791F6C",
    "provider": "google-drive",
    "path": "skills/google-drive/assets/app-icon.png"
  },
  {
    "version": "0.1.22",
    "sha256": "5B31886B56B95450F7B9763D9B2FEF49CB6076D52B69D35CCAD48F454BC03021",
    "provider": "google-drive",
    "path": "skills/google-drive/assets/google-drive-small.svg"
  },
  {
    "version": "0.1.22",
    "sha256": "A0DA54A5F966E876668AB59D8DF987DDAD1328846216578356E6C10B07791F6C",
    "provider": "google-drive",
    "path": "skills/google-drive/assets/google-drive.png"
  },
  {
    "version": "0.1.22",
    "sha256": "5B31886B56B95450F7B9763D9B2FEF49CB6076D52B69D35CCAD48F454BC03021",
    "provider": "google-drive",
    "path": "skills/google-drive/assets/google-drive.svg"
  },
  {
    "version": "0.1.22",
    "sha256": "0DDBD940CFBD379BEF232FC01E628EF02A3B7C2182E7D6983D281199B651F600",
    "provider": "google-drive",
    "path": "skills/google-drive/references/slides/chart-refresh-workflows.md"
  },
  {
    "version": "0.1.22",
    "sha256": "7FA958F5DD4E7575857C5E1FF8761646F650694A3BC3CC8ED302943332452C3D",
    "provider": "google-drive",
    "path": "skills/google-drive/references/slides/deck-scope-verification.md"
  },
  {
    "version": "0.1.22",
    "sha256": "601D323942D4A944D8EC84CB8BE149EC1D1865AB33EDE91BF25D3CA6DA3A978A",
    "provider": "google-drive",
    "path": "skills/google-drive/references/slides/sheets-chart-replacement.md"
  },
  {
    "version": "0.1.22",
    "sha256": "6AB9B64580FE2DCC9DEF5535DE9F549A4728EAE26D447FB1D7BA479D04BD25EB",
    "provider": "google-drive",
    "path": "skills/google-drive/references/slides/visual-change-loop.md"
  },
  {
    "version": "0.1.22",
    "sha256": "A3077375A8F7558B9E052C98047747B8A4A1A90A9A90B552009C28FCDADFE94A",
    "provider": "google-drive",
    "path": "skills/google-drive-comments/SKILL.md"
  },
  {
    "version": "0.1.22",
    "sha256": "FFF0196ED7C1E0F3CD9F67EFEC78730D06ED95B4C9A0CC9AEA28C3395ED4940D",
    "provider": "google-drive",
    "path": "skills/google-drive-comments/agents/openai.yaml"
  },
  {
    "version": "0.1.22",
    "sha256": "1851109D8F2C182236D28DB136FB161D30C85287E5BC4FA79CF137673184C58D",
    "provider": "google-drive",
    "path": "skills/google-sheets/SKILL.md"
  },
  {
    "version": "0.1.22",
    "sha256": "4D55928FC0F63AAE133F8C00219E3FD7DFDD3A49EF457CEEC6BCF0F014FFAE00",
    "provider": "google-drive",
    "path": "skills/google-sheets/agents/openai.yaml"
  },
  {
    "version": "0.1.22",
    "sha256": "502B9FCFB51A6345D03DB408B36BE40676EE1483A4EFA24A2751AD65128C4945",
    "provider": "google-drive",
    "path": "skills/google-sheets/assets/google-sheets-small.svg"
  },
  {
    "version": "0.1.22",
    "sha256": "E3775513BEF981E135ED001EE82BE2381E04C6361093628628360B565635E4FE",
    "provider": "google-drive",
    "path": "skills/google-sheets/assets/google-sheets.png"
  },
  {
    "version": "0.1.22",
    "sha256": "18E645B4F05F4F399CEFF0C2EE62501A38609709B087E7140457EEF2C60C8E9E",
    "provider": "google-drive",
    "path": "skills/google-sheets/references/reference-batch-update-recipes.md"
  },
  {
    "version": "0.1.22",
    "sha256": "F8428DB55E2CDDEE66BF1BF7CED1CBEFF75B06893F1477BF175AF56BB2026EAC",
    "provider": "google-drive",
    "path": "skills/google-sheets/references/reference-chart-recipes.md"
  },
  {
    "version": "0.1.22",
    "sha256": "66C6845A16547D65AC3EAF2AE8B7762FB534F2ACFB5700716827B21CFF9B149A",
    "provider": "google-drive",
    "path": "skills/google-sheets/references/reference-edit-workflow.md"
  },
  {
    "version": "0.1.22",
    "sha256": "749791A220C1E1AB18F99C0F0BE56DE106E9E4701D28B82385B673C8F9D1CC56",
    "provider": "google-drive",
    "path": "skills/google-sheets/references/reference-formula-patterns.md"
  },
  {
    "version": "0.1.22",
    "sha256": "C0F78AAD392819AFF85A389CB04E4F560C54BDC4DA249E0BD2CBF24DF166F0FD",
    "provider": "google-drive",
    "path": "skills/google-sheets/references/reference-import-spreadsheet-to-native-sheets.md"
  },
  {
    "version": "0.1.22",
    "sha256": "BD13045E10FD7F8CB5389512EAD5DC3482AA04BA328CD95DA87A9A09D0B3C981",
    "provider": "google-drive",
    "path": "skills/google-sheets/references/reference-live-read-search-safety.md"
  },
  {
    "version": "0.1.22",
    "sha256": "989E30E41EC064712B45966DD88AEA8613631653FA981559038D4E0549338E47",
    "provider": "google-drive",
    "path": "skills/google-sheets/references/reference-native-cell-structure.md"
  },
  {
    "version": "0.1.22",
    "sha256": "869601926708D005D8A9CE7E2EBAC859BD31D54D42150B0B8D6F1F2D01B93129",
    "provider": "google-drive",
    "path": "skills/google-sheets/references/reference-visual-quality.md"
  },
  {
    "version": "0.1.22",
    "sha256": "A3AFA692E57BB2BCD91AA3EA540147FC0789CE576215D587B2EE55DF30E32C65",
    "provider": "google-drive",
    "path": "skills/google-sheets/references/style-profiles.md"
  },
  {
    "version": "0.1.22",
    "sha256": "F85BD1D7080BECF8C043A3646B6C3A53FBCD6D2A77C62A15112B8D89E01A4B83",
    "provider": "google-drive",
    "path": "skills/google-slides/SKILL.md"
  },
  {
    "version": "0.1.22",
    "sha256": "C93B66486CC6DF212D2EB3FABB57A3495EBA07E3AE900612C3C72A1CB2315605",
    "provider": "google-drive",
    "path": "skills/google-slides/agents/openai.yaml"
  },
  {
    "version": "0.1.22",
    "sha256": "702CB4708C85D38833F075BFBD2870E5CF07F934B2A06124E57A00EAFE68B486",
    "provider": "google-drive",
    "path": "skills/google-slides/assets/google-slides-small.svg"
  },
  {
    "version": "0.1.22",
    "sha256": "B9E27DE164F75478C181D2F2804B259F96BCD2D28B8AF4328F94AB20DD0CD71D",
    "provider": "google-drive",
    "path": "skills/google-slides/assets/google-slides.png"
  },
  {
    "version": "0.1.22",
    "sha256": "43D2436482267426BD48EC20E11787B7C2F84E72ADDE26E2FEE2D1A121AECEC4",
    "provider": "google-drive",
    "path": "skills/google-slides/host/export-and-render-slides.mjs"
  },
  {
    "version": "0.1.22",
    "sha256": "6BC4C07CDE3183BD40495A1D985862B432F3E5C1F110D2B309EA803096034CE8",
    "provider": "google-drive",
    "path": "skills/google-slides/host/export-and-render-slides.test.mjs"
  },
  {
    "version": "0.1.22",
    "sha256": "BDEB61186088AAB091F2F8C5330449A6AA5E9E3A1E1ABBFC0CF132DFC8B27484",
    "provider": "google-drive",
    "path": "skills/google-slides/host/read-template-to-file.mjs"
  },
  {
    "version": "0.1.22",
    "sha256": "95D9F2FFFD6B1EB02292F574370F6424DF8DAA45969AD1B5F0E617679E39159F",
    "provider": "google-drive",
    "path": "skills/google-slides/host/slides-stdin-receiver.pl"
  },
  {
    "version": "0.1.22",
    "sha256": "DA0497E25983D4CEA67F0F588F213D9F587C7F6A865DEE28E9D24A7E76B7733E",
    "provider": "google-drive",
    "path": "skills/google-slides/runtime/common.mjs"
  },
  {
    "version": "0.1.22",
    "sha256": "4E393F1486C2E7209FC833FDD2FCA4A2094AB3B0FF4E5CE20A83612B441CF0FB",
    "provider": "google-drive",
    "path": "skills/google-slides/runtime/design-system.mjs"
  },
  {
    "version": "0.1.22",
    "sha256": "4D0930A9D2BEC3ED29F10A19C430A319DC450BC087C96DBB47239CD5171666B6",
    "provider": "google-drive",
    "path": "skills/google-slides/runtime/media-geometry.mjs"
  },
  {
    "version": "0.1.22",
    "sha256": "3B7F5267F61335410B5AECCCA75271B7A810E4306EF9EDC5E28A3B7BE2D0D8FA",
    "provider": "google-drive",
    "path": "skills/google-slides/runtime/normalize.mjs"
  },
  {
    "version": "0.1.22",
    "sha256": "45F8A2F8C70C5356B050BA84C1C0A7E3D4B7B421DB3929C99AF73037D6D3198D",
    "provider": "google-drive",
    "path": "skills/google-slides/runtime/output-issues.mjs"
  },
  {
    "version": "0.1.22",
    "sha256": "1C516FAC28909B0C5F98B07A2CD9378885E9838182A9A0B907B5188C8324EB7E",
    "provider": "google-drive",
    "path": "skills/google-slides/runtime/result.mjs"
  },
  {
    "version": "0.1.22",
    "sha256": "095179A53E10EDAAEB1381E7A4A24C1B461C1C61E245B9E707881C8DE6A85B9C",
    "provider": "google-drive",
    "path": "skills/google-slides/scripts/check_output_issues.mjs"
  },
  {
    "version": "0.1.22",
    "sha256": "5985A2FBA34D769E7839A90FBA7745B070D82773B8DA4A2E1A77213C70E4C914",
    "provider": "google-drive",
    "path": "skills/google-slides/scripts/parse_template_design_system.mjs"
  },
  {
    "version": "6.0.0",
    "sha256": "0BEFED62B8DD03A7CD2A2CE56DF16331B64355D3362F136BFF289B8DD34A021B",
    "provider": "dropbox",
    "path": "skills/clean-up-dropbox-content/SKILL.md"
  },
  {
    "version": "6.0.0",
    "sha256": "F9DE5FD6848B363B189C860455702DB097EBAEAE51306D9D06183A362224687D",
    "provider": "dropbox",
    "path": "skills/collect-files-with-request/SKILL.md"
  },
  {
    "version": "6.0.0",
    "sha256": "6AFF4CA5C0FED3961AC5CC92E51C2FBD2405B46673558291F2836BB1021FC271",
    "provider": "dropbox",
    "path": "skills/find-dropbox-content/SKILL.md"
  },
  {
    "version": "6.0.0",
    "sha256": "DE44C9809C8D498823ED5130F49494DE9B161C85812BD741AAF709B0861DCF9F",
    "provider": "dropbox",
    "path": "skills/inspect-dropbox-file/SKILL.md"
  },
  {
    "version": "6.0.0",
    "sha256": "AC628ECB0FE11803011D4A2703CFC725D099546384FB023CE60B812DD3D362C8",
    "provider": "dropbox",
    "path": "skills/organize-dropbox-folder/SKILL.md"
  },
  {
    "version": "6.0.0",
    "sha256": "4B54A3D146D43E7A8F4BB909CF5F32F6BBC16B625B975F89BDDAE3856A8F18F7",
    "provider": "dropbox",
    "path": "skills/share-dropbox-content/SKILL.md"
  }
]
```

### File: `references/tool-inventory.json`

```json
{
  "observed": "2026-10-21",
  "providers": {
    "dropbox": [
      "mcp__codex_apps__dropbox_check_job_status",
      "mcp__codex_apps__dropbox_check_upload_file_status",
      "mcp__codex_apps__dropbox_copy",
      "mcp__codex_apps__dropbox_create_file_request",
      "mcp__codex_apps__dropbox_create_folder",
      "mcp__codex_apps__dropbox_create_shared_link",
      "mcp__codex_apps__dropbox_delete",
      "mcp__codex_apps__dropbox_download_link",
      "mcp__codex_apps__dropbox_fetch",
      "mcp__codex_apps__dropbox_file_preview",
      "mcp__codex_apps__dropbox_get_file_metadata",
      "mcp__codex_apps__dropbox_get_file_request",
      "mcp__codex_apps__dropbox_get_shared_link_metadata",
      "mcp__codex_apps__dropbox_list_file_requests",
      "mcp__codex_apps__dropbox_list_file_revisions",
      "mcp__codex_apps__dropbox_list_folder",
      "mcp__codex_apps__dropbox_list_restore_events",
      "mcp__codex_apps__dropbox_list_shared_links",
      "mcp__codex_apps__dropbox_move",
      "mcp__codex_apps__dropbox_restore_file_revision",
      "mcp__codex_apps__dropbox_restore_folder",
      "mcp__codex_apps__dropbox_search",
      "mcp__codex_apps__dropbox_upload_file",
      "mcp__codex_apps__dropbox_who_am_i"
    ],
    "google_drive": [
      "mcp__codex_apps__google_drive_batch_update_document",
      "mcp__codex_apps__google_drive_batch_update_presentation",
      "mcp__codex_apps__google_drive_batch_update_spreadsheet",
      "mcp__codex_apps__google_drive_bulk_update_file_comments",
      "mcp__codex_apps__google_drive_copy_file",
      "mcp__codex_apps__google_drive_create_file",
      "mcp__codex_apps__google_drive_create_folder",
      "mcp__codex_apps__google_drive_create_presentation_from_template",
      "mcp__codex_apps__google_drive_delete_file",
      "mcp__codex_apps__google_drive_duplicate_sheet_in_new_spreadsheet",
      "mcp__codex_apps__google_drive_export_file",
      "mcp__codex_apps__google_drive_fetch",
      "mcp__codex_apps__google_drive_fetch_file_revision",
      "mcp__codex_apps__google_drive_find_document_text_range",
      "mcp__codex_apps__google_drive_get_document",
      "mcp__codex_apps__google_drive_get_document_comments",
      "mcp__codex_apps__google_drive_get_document_paragraph_range",
      "mcp__codex_apps__google_drive_get_document_tables",
      "mcp__codex_apps__google_drive_get_document_text",
      "mcp__codex_apps__google_drive_get_file_comments",
      "mcp__codex_apps__google_drive_get_file_metadata",
      "mcp__codex_apps__google_drive_get_presentation",
      "mcp__codex_apps__google_drive_get_presentation_comments",
      "mcp__codex_apps__google_drive_get_presentation_outline",
      "mcp__codex_apps__google_drive_get_presentation_tables",
      "mcp__codex_apps__google_drive_get_presentation_text",
      "mcp__codex_apps__google_drive_get_profile",
      "mcp__codex_apps__google_drive_get_slide",
      "mcp__codex_apps__google_drive_get_slide_thumbnail",
      "mcp__codex_apps__google_drive_get_spreadsheet_cells",
      "mcp__codex_apps__google_drive_get_spreadsheet_comments",
      "mcp__codex_apps__google_drive_get_spreadsheet_metadata",
      "mcp__codex_apps__google_drive_get_spreadsheet_range",
      "mcp__codex_apps__google_drive_import_document",
      "mcp__codex_apps__google_drive_import_presentation",
      "mcp__codex_apps__google_drive_import_spreadsheet",
      "mcp__codex_apps__google_drive_list_drives",
      "mcp__codex_apps__google_drive_list_file_revisions",
      "mcp__codex_apps__google_drive_list_folder",
      "mcp__codex_apps__google_drive_recent_documents",
      "mcp__codex_apps__google_drive_search",
      "mcp__codex_apps__google_drive_search_spreadsheet_rows",
      "mcp__codex_apps__google_drive_share_file",
      "mcp__codex_apps__google_drive_update_file",
      "mcp__codex_apps__google_drive_upload_file"
    ]
  },
  "note": "Tool availability snapshot, not implementation source or proof of authorization."
}
```

### File: `references/workflow-verification.md`

#### Workflow verification boundaries

##### Current App routing

CloudStorage Portal declares the existing Dropbox, Google Drive and OneDrive Apps in `.app.json`. The [OneDrive skill](../../onedrive/SKILL.md) uses the same hosted App as the OneDrive Marketplace package for Personal. Availability in Business depends on the tools and account binding exposed by that workspace. Discover the current provider tools and confirm the intended account before file access.

Run `node scripts/verify-provider-workflows.mjs . <provider-tool-catalog.json>` with the tool names observed on the current host. The catalog uses `dropbox.tools`, `googleDrive.tools` and `oneDrive.tools`. It checks the twelve imported Dropbox and Google workflows plus the hosted OneDrive requirements for identity, drive, search, folder listing and creation, exact metadata, reading, uploading, updating and content readback. A missing OneDrive catalog or required tool fails the check. Catalog results establish tool availability. A live account, operation and readback each require their own evidence.

The Google Drive catalog check requires `get_profile` because workflows must confirm the active account when the connector exposes no account selector. Google has exposed schemas both with and without explicit `link_id` values. Use the current schema and confirm the active account before writes. Local OneDrive sync-folder access provides filesystem metadata only.

Follow the [exact-child fallback](../../onedrive/SKILL.md#resolve-a-known-file-or-folder-after-an-empty-search) only with an already verified direct parent and a successful empty OneDrive search. Record search, full parent listing and exact item readback separately.

##### Live verification contract

For each intended operation, record the exact current tool, provider identity, supported account selector or verified default identity, target IDs, requested effect, completion state and independent readback. Keep existing files outside an explicitly authorized test area untouched. Ask separately for sharing/access changes, file requests and cleanup. Never create public links just to test content reads. Keep signed monitor/download URLs and tokens out of receipts, source and archives.

When errors occur, distinguish schema/argument binding, missing dispatch, provider authorization, resource lookup, async pending state and actual write completion. Refresh the relevant schema and reconcile before retrying an uncertain write. Report partial results per account. Missing or failed checks remain incomplete; they are not polish.

##### Historical observations

The October 2026 local broker and SharePoint fallback predate the current hosted App routing. The [historical MCP record](../../../MCP-LIVE-PROOF.md) preserves those experiments, including the local broker restart failure. The observations below record the exact routes exercised at the time.

Authorized isolated test artifacts have demonstrated native provider folder creation/upload and content extraction on Dropbox, Google Drive and personal OneDrive. Google additionally demonstrated copy/move with parent readback, native Docs text conversion and revision-guarded insertion, native Sheets XLSX import and recalculation following an input edit, and native Slides PPTX import and revision-guarded text replacement. OneDrive demonstrated copy destination reconciliation and a same-drive move of the observed copy, followed by exact-item content readback.

These observations are dated integration evidence, not guaranteed current availability. Dropbox later returned Unknown tool for copy and read-only listing while the catalog still reported it installed. Google account-selector schemas changed during testing. Microsoft browser-link content resolution returned a serviceReadOnly error, whereas an authorized fetch of the same verified Graph drive/item succeeded. Record these distinct results; do not generalize one failed resolver to all account permissions or erase the resolver defect after another route works.

No sharing, file requests, destructive cleanup or Google comment lifecycle was tested under the isolated folder authorization. Advanced Docs/Sheets/Slides features and full render pipelines are not verified by text/cell smoke tests. Successful content extraction is not a byte-hash check. A copied item observed in the destination is not the same evidence as a polled terminal async monitor status.

### Not embedded

- `assets/cloudstorage-portal.png` (binary asset, not embedded)
