# MegaLinter 1.0.28 — verified-artifact remediation

This is a reviewed patch for the existing upstream installation, not another installable plugin or a fork of WinRecoveryProjectLinter. MegaLinter remains excluded from the Marketplace catalog. Original author, plugin identity, version, license and connections are retained.

## Root causes and changes

- Replace all 13 originally reported streamed installer commands with pinned, SHA-256-verified release artifacts or existing-service guidance.
- Fix 87 corresponding occurrences in 25 generated Dockerfiles, including four Rust bootstrap commands, and fix the Rust command generator itself.
- Replace two additional Kibana setup examples with configuration of an existing deployment. The examined start-local installer creates a 30-day trial; this remediation does not provision it or change an existing service.
- Support amd64 and arm64 explicitly. Version changes fail until the matching artifact hashes are reviewed. Unsupported architectures fail before downloading.
- Verify integrity before extraction, installation or a binary bootstrap. Downloaded text is never piped to a shell. A fresh shell enforces failure handling even inside a Docker `&&` chain.
- Extract the exact expected executable from linter archives; reject a symlink executable. Temporary cleanup is limited to the directory just created by `mktemp` and is tested on success and failure.

`release-assets.lock.json` records official versioned URLs, sizes and reviewed hashes. The ten linter archives and two Rust bootstrap binaries were actually downloaded and verified for both architectures. Publisher checksum manifests were cross-checked where available; Kingfisher uses GitHub's publisher asset digests. Hash verification fixes mutable/unverified transport, not publisher compromise or all runtime behavior. Rustup subsequently retrieves its toolchain through its own distribution mechanism, and the existing downstream `rustup default stable` step is retained; a complete offline, transitively pinned Rust installation is not claimed.

Ollama's Linux download/unpack flow is tested with small, explicitly substituted fixtures. Its multi-GB packages, macOS DMG and Windows installer were not installed or executed. Their pinned digests were checked against the official release metadata and checksum manifest. No model download or service startup is part of this patch.

## Apply to the existing installation

Run from this directory with Python's standard library:

```powershell
python -B apply.py "<existing MegaLinter 1.0.28 root>"
python -B apply.py "<existing MegaLinter 1.0.28 root>" --apply
```

The first command is a dry run. All 37 source files must match their recorded original hashes before any writes. The second command applies only these files; it does not execute/import the target, contact endpoints or install tools. Reapplication verifies the patched hashes and returns `ALREADY_APPLIED`. Source drift, mixed states, symlink/junction paths and unexpected patch output are rejected.

Originals and a receipt are kept **outside** the active plugin root at `<plugin-root-parent>/.wrp-remediations/<plugin-root-name>/megalinter-1.0.28-verified-artifacts-v1/`. Originals are not active plugin members or redistributed archives. An upstream refresh may replace the patched files: run the dry run again. A changed upstream version requires a newly reviewed patch; never bypass the hash checks.

For an exact rollback, which refuses to overwrite later edits:

```powershell
python -B apply.py "<existing MegaLinter 1.0.28 root>" --rollback --apply
```

## Reproduce the tests

Use an unmodified source root, or the external backup's `original` directory. Git Bash on Windows, or a POSIX bash with curl/coreutils/tar, is required. Tests refuse to run a recipe unless every side-effect command resolves to its isolated stub. Real linter executables never run; Rust bootstrap execution is explicitly mocked. No target configuration or services are loaded.

```powershell
python -B fetch_test_assets.py "<disposable assets directory>"
python -B test_remediation.py --original "<original source root>" --assets "<assets directory>" --bash "C:/Program Files/Git/bin/bash.exe" --commands recipes.json -v
```

Fetching is a separate explicit public download step; the regression tests use the local verified assets. Tests cover actual archive extraction, both architectures, version/architecture rejection, failed downloads, bad hashes (including conditional/AND-list callers), symlink payload rejection, cleanup, generated Dockerfile syntax, Python generator syntax, rollback and preservation of later edits. They also exercise the documented Ollama transport with fixtures. Full container builds, native Linux execution of the tools, and real Ollama/Rust service installation are not claimed.

See [the delivery report](../../docs/UPSTREAM-REMEDIATION-20261117.json) for results, scanner versions and current installation verification. Intentional upstream security-test fixtures remain unchanged and explicitly reviewed; no scanner suppression or exclusion was added to conceal a recipe.

## License and provenance

MegaLinter-derived replacement snippets are modifications to OX Security's [MegaLinter](https://github.com/oxsecurity/megalinter), supplied under **AGPL-3.0**, with the upstream license in `LICENSE-upstream.txt`. The new patch application, asset-fetch and regression-test utilities are original WinRecoveryProject code under the Marketplace's license. No vendor archive, executable, secret, model or account configuration is bundled. MegaLinter's manifests and branding are not rewritten to claim WinRecoveryProject authorship.
