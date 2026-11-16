# Environment operations

These original workflows reuse the selected local or managed host. Cloud source code
and internal-only scripts are not redistributed. External execution remains conditional.

## Repository and revision

Resolve host and full owner/project path, matching the connection to GitHub.com,
Enterprise or GitLab as applicable. Inspect actual checkout, branch, HEAD and edits.
Resolve requested tag/branch/SHA and provider PR head/base; record the tested commit.
For latest, verify the current remote ref. Clone missing repos only within task scope.
Use supported isolation when needed and authorized, preserving branch/user changes.
A successful Git read does not prove API or push access. Distinguish missing
connection, denied access, concealed private 404, no match, empty repo and missing ref.
Reauthentication uses the existing workspace connection, never a parallel OAuth app.

## Packages and containers

Run as the task user with project package manager, lockfile and configured registry.
Prefer installed browsers/runners and project/user environments. For system tools use
the host's documented managed package helper only if present and permitted; no global
sudo/sandbox policy changes, arbitrary bootstrap downloads or default paid services.
Missing support yields a named blocker or legitimate user-level alternative.

For Docker inspect CLI, socket/daemon reachability and intended rootless/rootful model.
Do not restart or spawn another live daemon. Preserve proxy/CA, socket ownership,
data directory and storage driver. Separate image pull auth/rate limit/policy failures
from build/container networking and filesystem failures. Build arguments do not
configure daemon pulls. Container startup still requires readiness and actual behavior
checks; do not claim a configured Docker environment solely from CLI presence.

## Network and configured identity

Test the exact service with its actual client. Keep inherited proxies, NO_PROXY,
certificate trust and TLS verification. Shell success does not prove browser success;
compare the same URL in both when relevant. Identify proxy reachability, destination
policy, remote permission, TLS, DNS and request/rate limit failures separately. Honor
Retry-After and reduce payload for size limits. Do not expose tokens or signed URLs.

Bind status to the selected environment. Report enforcement only when current observed
status says policy enforced and identity/secret ready; desired configuration and startup
snapshots can be stale. Test a fresh connection after changes. Host wildcard rules may
exclude an apex; use exact required domains and preserve unrelated rules. Protected
destinations remain blocked. Never disable TLS or bypass managed security policies.

Use existing configured identities by alias/provider from the host's identity manifest
when offered. Read only needed selector metadata and preserve inherited bindings.
Azure uses existing identity endpoint/config directory; AWS profile/config; GCP config,
configuration and credential-file references. Never print values or copy credential
files. Network reachability and credential scope are separate checks. Report missing
manifest version/alias/setup outcome precisely rather than inventing credentials.

## VPN and forwarding

Use configured VPN state, enrollment outcome and published policy. Do not install
Tailscale or alter routing. Enrollment failure, missing private grants and service
auth/ACL failures are distinct. Native HTTP(S) follows existing HTTP proxy/CA. Private
TCP may use host-supported HTTP CONNECT or an installed local relay when authorized;
pass the original host for proxy DNS/policy and preserve service hostname verification.
If an install helper is absent, do not download the proprietary source script: use
the managed package route or report missing relay support. No new tunnels start merely
from diagnosis. Bind any authorized listener to loopback, keep its session/PID, connect
the client in the same namespace and stop the exact relay afterward. Check destination
grants and proxy errors before retrying. UDP/QUIC/ICMP/inbound/transparency are not
assumed. Revalidate after restart or VPN loss. No remote hostname is replaced by an
unverified IP just to bypass TLS or access policy.

## Environment changes and diagnostics

Read current selected-instance settings before proposing changes. Replacement-style
categories must include existing entries; omit unchanged categories. Use existing
vault references and let users enter secrets only in settings. Changes require host
approval where applicable; continue independent work while pending. After uncertain
save inspect revision/status before retrying. Test changed access with a fresh client.
Changes to a running machine do not imply reusable configuration promotion or other
running-task updates. Promotion/publishing/recreation must follow the user's scope
and actual managed tool contracts. Never create a new chat without explicit request.

Read only relevant bounded sanitized setup/diagnostic logs. Preserve raw evidence
locally where permitted while excluding credential values from reports. Report machine,
revision, exact failing operation, sanitized error and proven working paths. Do not
dump process environments, whole auth stores or unrelated private network inventories.

## Desktop, preview and delivery

Use the named browser/tab/window; otherwise use available tool selection rules. Follow
first-call docs and inspect actual loaded state. Existing session/native-window flows
need the real desktop; scripted suites use the project's runner. Start app using its
documented command and readiness check, respecting managed reserved ports. A port is
ready only after the expected response, not merely process creation. Use host preview
tools for access in the user's own browser. Preview is local/session access, not public
sharing. External deployment requires separate authority and a no-charge route.

For takeover pause all input until control returns, then inspect the same state.
Record only requested workflows, excluding credentials; play back the file. Validate
exported artifacts in intended applications, then link absolute deliverable paths.
When desktop status belongs to another machine or tools are absent, report that exact
limit and distinguish repeatable headless evidence from unverified session behavior.
