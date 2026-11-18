# Resolve an installed plugin after an in-session upgrade

A host may inject a skill catalog once and retain an old cache path for the rest of
the turn. An ordinary plugin upgrade can remove that version while the current
version is correctly installed. Studio cannot rewrite the host's injected catalog
or UI state. It must not recreate an old cache to make an outdated reference work.

## Read-only recovery

1. After an attributed skill path returns ENOENT, use the host's actual read-only
   `codex plugin list --json` capability. Capture the full returned installed list,
   successful exit status and UTC completion time. Native discovery can establish
   the current account and per-skill enabled state separately. Never invent a path,
   version or provider from a similar display name.
2. Make a request for the same exact `name@namespace` and relative skill path. The
   host-observed local physical cache root is a parameter, not a hardcoded home or
   environment change. The resolver uses only the matching installed record's
   version; it never sorts cache directories or uses `source.path`, shell strings,
   endpoints, auth or environment fields from input.
3. Run `node scripts/studio.mjs resolve-installed request.json`. A valid result is
   `RESOLVED` with scope `PATH_RESOLUTION_ONLY`: the current manifest and contained
   root/skill file were read and checked. It is not account entitlement, per-skill
   activation, permission to execute, provider health or successful task evidence.
4. Read only that returned skill when the host/user scope permits it. If the cache
   changes again or a new ENOENT occurs, perform one new host lookup and resolution.
   If it remains unavailable, report that precise missing capability and continue
   independent work. Do not install, authenticate, upgrade, enable a skill, restore
   a stale version, change settings or touch SDK files as recovery.

The request has this shape (placeholders are observations to supply, not defaults):

```json
{
  "pluginId": "powershell-workbench@winrecoveryproject-digital",
  "cacheRoot": "<canonical absolute local cache root from this host>",
  "snapshot": {
    "kind": "codex-cli-installed",
    "capturedAt": "<UTC completion time of the new successful lookup: YYYY-MM-DDTHH:mm:ss[.sss]Z>",
    "exitCode": 0,
    "data": {"installed": []}
  },
  "skill": "skills/powershell-safe-editing/SKILL.md"
}
```

The timestamp format accepts no fractional seconds or exactly three digits before
`Z`, as produced by `new Date().toISOString()` at lookup completion. Other precision,
such as six fractional digits, must be formatted explicitly; never restamp old data.
Replace `snapshot.data` with the complete raw JSON from that lookup; the empty
array above is illustrative and resolves nothing. Do not refresh a timestamp on
an old snapshot. `skill` is optional for root-only resolution. Version is never a
request override. A JavaScript caller can import `resolveInstalledPlugin` from
`src/services/index.mjs`; its optional `now` test clock is not a CLI request field.

## Validation and limits

The resolver requires a successful observed CLI snapshot no older than 60 seconds
and rejects future timestamps, ambiguous records, absent/disabled installations
and unsafe identity/version/path components. This is a caller-supplied observation,
not authenticated freshness or independent current-entitlement proof. The result
reports that limitation and never executes the CLI or a target from request data.

Only the exact `<cacheRoot>/<namespace>/<name>/<installedVersion>` is considered.
The authoritative native `.codex-plugin/plugin.json` is preferred; `plugin.json`
is used only when the native manifest is absent. Manifest name/version must match.
Requested skills must be regular, bounded UTF-8 SKILL.md files under the manifest's
declared relative skills directory. Parent links, junctions, UNC/device aliases,
traversal, manifest/path changes observed during resolution and unsupported layouts
return `UNAVAILABLE`, never a guessed alternative. Native per-skill activation is
reported as `UNKNOWN` by this path resolver and must be checked separately.

Successful resolution is point-in-time filesystem evidence. Reopening can still
fail after another upgrade; the host's stale injected references remain a separate
limitation. The helper performs no network calls, mutations, installs, target
execution, configuration changes or cache restoration. Budget: 0 kr.
