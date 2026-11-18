# Local service interfaces

These dependency-free ES modules implement Studio-owned services. They do not call plugin connectors, load external skills or execute target packages. Public imports are from `index.mjs`.

## Evidence matrix

`evidenceMatrix({asOf, freshWithinDays, skills, evidence})` is synchronous. `asOf` and dated evidence use valid `YYYY-MM-DD` calendar dates; `freshWithinDays` is a nonnegative integer. `skills` is a string array. Each evidence record has `skill`, optional text `fact`/`source`, and optional date. Duplicate skill names group once with a warning. Unknown-skill evidence is counted in a warning. Undated/future records remain visible in facts/counts but cannot establish current recency.

Rows return `missing evidence`, `older evidence` or `recent evidence`. The freshness boundary is inclusive and measured in UTC calendar days. No competence or agent-quality score is inferred. Invalid dates fail instead of inventing recency.

## Risk review

`await scanRisk(targetPath, options)` scans regular UTF-8 text without importing, executing, installing or uploading target content. Options: `severity` (`low|medium|high|critical`, default medium), `maxFiles` (default 10000), `maxFileBytes` (default 2 MiB), and `suppressions`. Suppressions accept an array or a local JSON file containing the array or `{suppressions:[...]}`. Each exact suppression requires `{fingerprint, ruleId, ruleVersion, reason}`. Wildcard/extra fields and empty reasons are rejected. Changed rule versions invalidate suppression matches.

Results contain redacted `findings` with rule/version, relative path, line/column, SHA-256 fingerprint and remediation. `complete:false` and `exitCode:2` mean some files could not be scanned reliably; `1` means unsuppressed findings meet the selected severity; `0` means no active deterministic match at that threshold. Binary/unsupported extensions are counted as skipped and reported separately. A clean scan is not a safety certification. `renderRisk(report, format)` supports `json`, `markdown`, and `sarif` (2.1.0).

## Inventory

`await inventory(localPath, options)` returns `{records, errors, complete}`. It reads portable/compatibility manifests as data, groups both manifests for a root, lists public skill directories, records declared components and listing field presence, and observes compatibility manifest synchronization. Paths containing `cache`, `candidates` or an explicit archive segment are classified accordingly; other paths remain `unknown`. Merely finding a manifest never proves installation, host enablement, global account permissions, OAuth connection or publisher verification. Those fields remain `UNKNOWN`.

## Installed and published versions

The `inventory-versions` command compares one host and account receipt with verified Git manifest observations and optionally related provider catalog IDs. See the [version audit contract](../../references/inventory-versions.md) for capture and exit codes.

## Exact installed-cache resolution

`await resolveInstalledPlugin({pluginId, cacheRoot, snapshot, skill?})` is read-only.
`snapshot` has `kind:'codex-cli-installed'`, `capturedAt` (`YYYY-MM-DDTHH:mm:ss[.sss]Z`,
no fractional seconds or exactly three digits), observed
`exitCode:0` and `data` containing the complete raw CLI `installed` array. Identity
is exact `name@namespace`; `cacheRoot` is an observed absolute physical local path;
`skill`, when supplied, is a relative forward-slash path under the manifest's
declared skills directory ending in `SKILL.md`. No version override is accepted.

Only one installed/enabled exact record is eligible. Its version and matching
current manifest determine the cache path; no glob, highest-version, source-path
or other-provider fallback occurs. A missing/unsafe/stale/incomplete observation or
path returns `UNAVAILABLE`. Successful `RESOLVED` means `PATH_RESOLUTION_ONLY`;
`skillEnabled:'UNKNOWN'`, `currentEntitlementVerified:false` and
`executionAuthorized:false` remain explicit. CLI unavailable results exit with 2.

The fixed 60-second timestamp check is a caller observation, not freshness attestation
or current account authorization. The optional `{now}` JavaScript test clock is not
a CLI request override. The resolver never executes an input command, invokes a
host lookup, installs, restores cache content or changes settings. On ENOENT the
calling host performs a new real read-only lookup, then retries once. See the
[cache recovery contract](../../references/installed-cache-resolution.md) for limits.

## Catalogs

`await catalogSnapshot(input, options)` accepts:

- a local package root or manifest path;
- a local JSON snapshot file (except a package's `plugin.json`), containing entries or `{entries, observedAt}`;
- an entries array or `{entries, observedAt}` object;
- one explicit HTTPS public URL returning JSON entries or visible HTML links.

Options: `asOf` observation timestamp (default current UTC); `maxEntries` (default 1000, maximum 10000); `maxBytes` (default 2 MiB, maximum 20 MiB); `timeoutMs` (default 10000, maximum 60000); `retries` (default 1, maximum 3). Retrieval pins a reviewed public DNS answer, bounds DNS/network time and streamed response size, and rejects embedded URL credentials, private/reserved addresses and redirects. Page links are returned as unverified candidates and never followed. `allowLocalhost:true` permits explicit loopback HTTP only for fixtures or deliberately selected local services. No endpoint named inside source files is automatically contacted.

`searchCatalog(snapshot, textQuery)` uses all case-insensitive query words across local name/display name/description/keywords. Popularity or page order is never converted into quality or rank. A supplied rank is retained only with a query and source attribution; otherwise it is null/`UNKNOWN`.

`compareCatalogs(before, after)` compares stable URL/name identities and substantive metadata, returning `added`, `removed`, and `changed` with observation/source metadata. Reversed observation order and ambiguous duplicate identities fail. Earlier history remains `UNKNOWN`; absence from a snapshot alone does not prove public directory removal.

These are local interfaces and calculations. Retrieval uses Node's standard networking APIs directly. No server/MCP route, telemetry, credential store or account administration is introduced.
