# Compare installed and published plugin versions

Run this once per device and active account. The collector reads installed Codex state, the active account's native plugin directory, the public Git manifests behind a Marketplace, and relevant versions already visible in the vendor catalog. It performs no installation, source execution, git push or account refresh.

## Capture and compare

Run from the Studio package root with your actual Codex CLI executable and an up-to-date local checkout of the published Marketplace. Use the current account scope, then use separate output files for each run.

```powershell
python -B tools/capture-inventory-versions.py --codex C:/path/to/codex.exe --marketplace C:/path/to/PluginMarketplace --host Acer --account personal --counterparts C:/private/counterparts.json --out C:/private/capture.json
node scripts/studio.mjs inventory-versions C:/private/capture.json --out C:/private/report.json
```

Add `--components C:/path/to/workspace` to include the native App list, skills resolved from that workspace, and MCP discovery for the active account. The collector verifies the account before and after the requests. It does not sign in, refresh the login, run a skill, or invoke an MCP tool. Codex may start a configured MCP server during its normal tool discovery. Run this option with the MCP servers you intend to discover already configured.

The capture's `components` object reports each of `apps`, `skills` and `mcpServers` as `OBSERVED` or `INCOMPLETE`, with any partial observations preserved. App `enabled` and `accessible` describe native configuration and access. Skill entries retain their paths and owning plugin IDs when available. MCP entries contain auth and runtime status, a tool count and a discovery-error flag. An unavailable runtime status remains null. Keep the capture private. It omits raw logs, tool definitions, endpoints, install links and account details. A successful component observation establishes discovery coverage. Functional tests establish data access. The version report's exit code covers versions and installed files independently of these component statuses.

Before resolving skills, Studio reads the unscoped native plugin catalog in the same app-server session and workspace. The request uses the native default cache behavior. The skill observation includes catalog source names and marks coverage incomplete if the catalog fails to load or omits the curated source. It still retains any skills discovered.

The component requests share a 145-second budget. Studio requests a fresh native App list once, with up to 75 seconds for its first page. Subsequent pages reuse the native cursor and have up to 25 seconds per request. The app list includes accessible apps and other catalog entries. Streamed pages remain distinct by App ID, up to 10,000 entries. A timeout preserves the rows already observed and sets `NATIVE_TIMEOUT` for that component.

The collector resolves public GitHub HEAD revisions and verifies that the local checkout contains the published Marketplace revision. If the default Git ref request times out or reports a transient transport error such as a GitHub connection refusal, Studio makes one SHA-only request for the same public repository's default commit through the GitHub REST API. The request has an eight-second timeout and uses no credentials or redirects. The result must be a complete commit hash. Studio reads manifests at the observed commits. A transient public manifest timeout, interrupted response or selected HTTP server error gets one retry at the same URL and Git revision. The first request has a 12-second network timeout and the retry has a 5-second timeout. After a second transient transport error, Studio tries the public GitHub Contents endpoint once for the same repository, path and revision. It verifies the returned file path, size and Git blob digest. Permission, rate-limit and TLS errors remain unresolved without an alternate request. Missing, still unreachable or conflicting manifests remain unverified. It runs the public catalog reads and the native account-scope read through the host's existing CLI, without refreshing sign-in. Native load errors and missing scope-specific directories stay visible as incomplete results.

For a Git root with source type `url` or a Git subdirectory that specifies a complete 40-hex commit in `sha`, the collector reads the manifest at that commit. Codex gives a full SHA precedence when both `sha` and `ref` are present. A named ref alone, a malformed selector or an unreachable pinned manifest leaves the publication unverified. A pinned manifest confirms the source version. A successful installation requires separate host evidence.

A Marketplace source like `"./plugins/example"` is relative to the Marketplace repository root. Studio reads that package’s manifest from the same exact commit verified against the Marketplace origin. It ignores working-tree edits and local Git replacements. A missing, unnormalized or out-of-scope path leaves that plugin’s publication unverified.

Business plugin CLI listings have a 110-second budget per command. On Personal the full installed list and curated vendor list have 75 seconds so the host's remote installed pagination can finish. Ordinary scoped lists and Git command budgets stay at 30 seconds. If the full installed CLI listing times out, fails or warns that a remote marketplace failed to load, the collector still records independent native, Git publication and vendor catalog evidence. The report returns exit code 2 with a CLI evidence gap. If the full CLI fails, Studio reads the configured marketplace names and tries each ordinary namespace with a separate, bounded command. The published Git Marketplace remains a candidate if the registry read fails. Exact namespace matches from successful lists are reported in `scopedCliNamespaces`. A successful vendor-scoped listing also supplies its exact installed identities when the broad CLI fails. This includes installations outside the declared comparison pairs. The audit remains incomplete and missing ordinary installations and historical absences stay unverified. The capture records a one-way workspace fingerprint when the native account was identified consistently, alongside the operator's host label.

Supply counterpart IDs only after identifying equivalent products and catalog entries. The file is a JSON array.

```json
[
  {
    "publishedId": "dropbox@winrecoveryproject-digital",
    "catalogId": "app-69b31dc2110c8191b8b47dc98fe5a052@openai-curated-remote"
  }
]
```

For vendor counterparts the collector requests `codex plugin list --marketplace <namespace> --available --json` and retains only the declared counterpart IDs. For a native counterpart add its exact `name@created-by-me-remote` identity for Personal or `name@workspace-directory` identity for Business to your private counterpart file. Run once per account with its active scope and separate output files. A mapping for the other native scope is shown as `OUT_OF_SCOPE`. Its installation and release stay unknown on this run. Use the canonical lowercase native namespace in counterpart IDs.

If the full OpenAI curated catalog query fails, Studio searches for explicitly mapped counterparts and reads exact matches using their server IDs. An optional printable `searchTerm` of up to 120 characters changes the catalog query for that counterpart. The exact identities must still match. If the detail request fails or the request budget expires after a search, a unique exact search row with an explicit null Marketplace path and a valid server ID can establish an advertised release when its availability is `AVAILABLE`. Installation, local version and enabled state still require a matching detail response. The active workspace and plan must match before and after the requests. A counterpart from these lookups has `observationScope` set to `TARGETED_VENDOR`. The full catalog gap remains open and uncovered identities stay unknown.

Native counterpart evidence comes from the same authenticated catalog snapshot as the inventory and requires a verified workspace fingerprint. Its `localVersion` is an installed version only when the catalog marks that row as installed. Its separate `version` field can establish an available release. An unavailable or invalid active catalog makes the report incomplete. Missing installed versions stay unknown, including on rows with a visible available release.

To include historical changes, pass a previous `codex plugin list --json` capture from the same host and account with `--previous`. A CLI-only history can confirm changes for the ordinary CLI inventory. Native catalog history needs its own scoped evidence. Keep the counterpart file and capture private because they can contain account-specific plugin identities and scope evidence.

## Verify the installed release files

After the native refresh, capture the current host again. For a Marketplace package tracked in its committed file ledger, supply a second JSON file with the managed checkout, its expected published revision, the local plug-in cache and exact installed IDs.

```json
{
  "checkout": "C:/path/to/managed/PluginMarketplace",
  "cacheRoot": "C:/path/to/.codex/plugins/cache",
  "revision": "0123456789abcdef0123456789abcdef01234567",
  "ids": ["plugin-skill-studio@winrecoveryproject-digital"]
}
```

```powershell
node scripts/studio.mjs inventory-versions C:/private/capture.json --installed-files C:/private/request.json --out C:/private/report.json
```

`installedFiles` records package versions and compares SHA-256 digests with the ledger committed at the requested revision. The managed checkout must be at that revision and, when present, its native receipt must match. Use the checkout and cache on the host where you took the capture. Installation and activation are observations from that capture. The file check reads the supplied cache and checks for changes during the read. Extra, missing and changed files make the result differ. The command returns the higher of the version audit and installed-file exit codes. This read-only check covers the observed installation and file contents. A functional test separately verifies the tools and connected account.

For a reviewed external Git source, the committed ledger can record a separate provider revision. Studio requires the catalog locator and the captured repository, revision, and manifest path to agree with that record. If the provider moves, the old file hashes cannot establish the new release. On Windows, a reviewed record can additionally supply hashes for exact checkout line endings on specified files. The report counts those as `windowsCheckoutMatches`. Other mismatches still fail the comparison.

## Read the report

- Exit `0` means the evidence is complete and the compared installed identities have no version differences. Uninstalled publications and newer counterpart channels still appear in the report.
- Exit `1` means a verified version difference on the same exact plugin ID. A newer version in another catalog never sets this exit code.
- Exit `2` means missing, conflicting or invalid evidence. Inspect the report's gaps or the command error.

The report keeps each counterpart's installed and available versions separate, with `installedComparison` and `availableComparison` against the same published Git version. The existing `comparison` field still follows the available release when present and follows the observed installation otherwise. When a Git manifest is unavailable, observed counterpart versions are retained and the comparison remains unknown. The comparisons preserve exact versions and apply SemVer precedence when both versions support it. Different build metadata can have the same precedence. Review new and missing identities against the previous capture before any installation change.

`publicationInstallation` counts installed, exact, absent, and uncertain publication identities. A publication can be installed with the matching version and still be disabled. Check the installed row's `enabled` value for that distinction. A native inventory without a verified workspace fingerprint gives an incomplete result even when no native counterparts were requested.

## Compare installations across two hosts

Use original capture JSON files from different hosts in the same verified account and workspace.

```powershell
node scripts/studio.mjs inventory-versions C:/private/acer-capture.json --against C:/private/asus-capture.json --out C:/private/host-report.json
```

`peerInstallation` shows installed IDs found on only one host and shared IDs with different installed versions or activation states. It includes packages outside the published Marketplace. It compares exact IDs and never treats cached directories, catalog availability or equivalent products as installations. It reports incomplete evidence and unverified differences separately, including when the other host lacks a full CLI observation for ordinary plugins or an attested native catalog for native plugins. A gap in Git or a vendor catalog does not invalidate independent installation evidence. `ALIGNED` means the captured installations, versions and activation states agree. The top-level status and exit code still refer to the current host's publication audit. Review both statuses. The peer section records both capture times so stale snapshots are visible. The comparison makes no installation changes.

Run [installed path recovery](installed-cache-resolution.md) separately if a skill path fails. An old version-audit receipt cannot establish fresh path or account access. Use active host tests for login, tools and file operations.
