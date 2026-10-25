# Provider package inspection, 2026-10-21

## Copied source

Dropbox 6.0.0: six complete skill directories for discovery, inspection, organization, sharing, file requests and cleanup.

Google Drive 0.1.22: five complete skill directories for Drive, Docs, Sheets, Slides and comments, including packaged scripts, runtimes, host bridges, references and assets. All 71 imported files were SHA-256 compared with their installed source copies before packaging. See provider-provenance.json.

The two packages' root .app.json files point to existing connector app IDs. The portal already uses those same app IDs; they are retained. These identifiers are connector dependencies, not reusable OAuth client registrations for a new broker.

## Login findings

The Google Docs entrypoint explicitly delegates authentication to connector tools. Its trusted-read wrapper likewise calls authenticated connector tools and explicitly does not use a separate credential setup. Google Docs and Slides host/runtime programs normalize, render or bridge content; copying them does not copy a login server. The six Dropbox skills describe tool workflows and do not contain an OAuth authorization-code exchange implementation.

No provider authorization server implementation or reusable OAuth client secret was found in the copied skill trees. The visible connector tools expose content operations and identity reads, not token export. This is a finding about the inspected distribution, not an assertion about inaccessible hosted server source.

## Reusable parts

Reuse all eleven provider workflows, tool routing, target resolution, content helpers and provider-specific safety/verification rules. Preserve existing native connector authentication for native operations. Tool inventory records the observed executable interface; tools remain supplied by their original connectors.

For an independent login system, implement one connection broker with separate Dropbox, Google and Microsoft adapters and independent grants. Account IDs are provider-scoped. Link provider accounts only through an authenticated portal session and successful authorization; matching email is insufficient. OneDrive requires its own verified connector or Graph implementation.

## Cost-conscious next implementation

The user has no provider app registrations and prefers a free path. Start with a personal/local development client and loopback callback where supported, avoiding paid hosting. Select public-client versus confidential-client registration from actual runtime requirements and current official docs. Local callbacks alone do not make a local broker reachable from a cloud-hosted ChatGPT plugin; host integration must be chosen and tested separately.

Dropbox documents no developer charge for its platform. Google documents standard Drive API use at no additional cost. Microsoft standard Graph APIs are included with the relevant user license within usage thresholds. Existing storage subscriptions, public hosting, special APIs and public-app verification can still carry costs. Google's restricted-scope requirements include personal/development exceptions; do not promise a free public broad-access app.

Sources: https://www.dropbox.com/developers/support ; https://developers.google.com/workspace/drive/api/guides/limits ; https://learn.microsoft.com/en-us/graph/metered-api-overview ; https://developers.google.com/identity/protocols/oauth2/production-readiness/restricted-scope-verification

## Verification limits

Package copying and routing are verified separately from actual login. No new OAuth app was registered, no provider consent performed, no cloud files modified, no new OAuth server deployed, and no OneDrive operation verified by this update. All three clouds remain the required final acceptance target.
