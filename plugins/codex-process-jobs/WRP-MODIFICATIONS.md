# WinRecoveryProject maintenance revision

This is a modified Apache-2.0 derivative of Codex Process Jobs 0.5.2 by Joel Farthing.
Original author, license, branding and package identity are retained. This revision
is maintained by WinRecoveryProject; it is not an upstream release.

Changes on 2026-11-17 in version 0.5.3-wrp.1:

- Windows log helpers use writable handles and explicit byte positions, permitting
  truncation during bounded rotation. EOF is refreshed before an append so sequential
  writer handles preserve each other's bytes. POSIX retains O_APPEND and its writes.
- Import receipt machine paths are replaced by portable references. The receipt
  retains the original import's hashes/date and is historical, not a new import claim.
- Added isolated log regression tests. No controller or existing job was launched.

The current worker owns one writer per separate stdout/stderr file. Shared concurrent
multi-process writers/rotation are not supported by this helper. The POSIX controller
remains unsupported on Windows; its existing host-session workflow is unchanged.
Windows helper behavior was tested. Linux runtime behavior is not newly verified.

Changes on 2026-11-18 in version 0.5.3-wrp.2:

- Replaced the missing runtime-local release checklist link with the verified
  upstream maintainer documentation URL. The native snapshot contains no source
  release tooling; no controller, user job, log state or connection is changed.
- This documentation-only maintenance revision is not an upstream release.
