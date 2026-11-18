# Plugin-Skill-Studio

Version **0.3.18**. Independent Zilvereyes plugin with local creation, discovery, conversion, engineering workflows, Skill Eval, plugin evaluation, risk review, evidence worksheets, optional local Windows desktop control and deterministic packaging.

All required skills, scripts, policies and references are bundled. Node 20+ and Python 3.10+ are host runtimes, not companion plugins. Optional Windows desktop commands use the already installed Windows PowerShell 5.1 and .NET components. No npm/pip install, npx, external plugin, App binding or MCP server is required. Model benchmarks use the user's existing Codex CLI and login; host terminal/browser capabilities are required for corresponding operations. Direct public lookups are explicit and bounded. No telemetry is added.

Windows desktop capture, inspection and guarded mouse operations are integrated in the existing `automate-ui` workflow. Read [the local Desktop guide](references/windows-desktop.md). This is an alternative local backend; OpenAI's native Computer Use binary and existing App/OAuth connections are unchanged.

## Start

From this package root:

```powershell
node scripts/studio.mjs self-check
node scripts/studio.mjs route "Vurder denne skill"
node scripts/studio.mjs skill-eval skills/skill-eval --format markdown
node scripts/studio.mjs skill-eval skills/skill-eval --format html --out report.html
node scripts/studio.mjs plugin-eval . --format markdown
node scripts/studio.mjs risk-scan ./skills/skill-eval --format sarif
node scripts/studio.mjs capabilities
```

Report output files refuse overwrite. A static eval returns 1 for blocking findings, 2 for an execution error. Risk scans return 0 for no active configured matches, 1 for reviewable matches and 2 for incomplete scanning. Neither a high score nor a clean scan certifies safety.

## Practical Skill Eval

```powershell
node scripts/studio.mjs benchmark-init skills/skill-eval --out benchmark.json
node scripts/studio.mjs skill-eval skills/skill-eval --mode benchmark --config benchmark.json --out benchmark-results
node scripts/studio.mjs compare-reports before.json after.json
```

Edit the starter configuration first: use a separate non-secret fixture directory, concrete task prompts and explicit verifier command/argument arrays. Three scenarios and six sequential baseline/with-skill runs are the default; each model run is bounded at five minutes. Configurations without explicit verifiers cannot run. No fixed model is selected; record the effective model from the existing configuration. Trigger scenarios should include positive, negative and boundary requests and an untouched held-out set.

Preflight checks the real CLI, effective catalog, MCP/App/plugin settings, hooks and existing authentication before any model request. Invocation-only overrides disable unrelated skills/services. If isolation or authentication cannot be observed, the result is BLOCKED with the reason. Authentication files are never copied. Temporary test workspaces are retained for review; their exact generated path is reported. The original skill and fixtures remain unchanged. Fixture-runner regression tests are distinct from a real Codex benchmark.

## Discovery, evidence and import

```powershell
node scripts/studio.mjs evidence-matrix evidence.json
node scripts/studio.mjs catalog-snapshot . --out catalog.json
node scripts/studio.mjs catalog-search catalog.json "evaluation"
node scripts/studio.mjs catalog-compare old.json new.json
node scripts/studio.mjs local-inventory .
node scripts/studio.mjs resolve-installed request.json
node scripts/studio.mjs inventory-versions capture.json
node scripts/studio.mjs import-preview input-folders --out import-plan.json
node scripts/studio.mjs import-apply import-plan.json --out candidates
node scripts/studio.mjs gpt-import authorized-export.json --out candidates
```

Evidence input uses `asOf`, `freshWithinDays`, `skills`, and `evidence` records containing `skill`, `date`, `fact` and `source`. This measures evidence recency, not human competence or agent quality. Future dates do not establish recent evidence. The local module also supports adult user-controlled competency worksheets.

Catalog input is a package root, supplied JSON snapshot or explicit public HTTPS URL. No links are automatically followed. Rankings and history are UNKNOWN unless supported by attributed observations. Local installation and global account permissions are distinct from manifest declarations. [Service contracts](src/services/README.md) describe exact fields and bounds.

Use the [version audit](references/inventory-versions.md) to capture and compare installed versions, public Git manifests and explicitly related vendor releases for one host and account.

If an upgrade removed a skill path during the current turn, use the host's existing
rediscovery rule and a new successful full CLI installed observation. The read-only
`resolve-installed` helper checks the exact identity/version and contained current
cache root/skill; it never runs a command from input, picks the highest cache,
restores a stale directory or changes settings/connections. Snapshot timestamps
remain observations, not attested freshness or entitlement. Per-skill activation
is separate. See [in-session cache recovery](references/installed-cache-resolution.md).

GPT import accepts user-supplied text/configuration and previously authorized visible source content. No hidden GPT configuration, cookies, private browser profile or credentials are retrieved. Imported capability names do not activate tools. Batch import and GPT conversion create reviewable local candidates, never host installations. The compatible skill installer runs a bundled pre-install risk scan: preview includes findings, and active or incomplete scans block writing unless exact reviewed fingerprint/rule-version suppressions clear them.

## Creation, packaging and release

The compatible commands `scripts/plugin-studio.mjs` and `scripts/skill-studio.mjs` remain available. Autopilot's local analyzer, validator and packager live under `skills/plugin-autopilot/scripts/`. `python -B tools/package.py --out <new-output-directory>` builds two byte-identical ZIPs, validates a fresh extraction and writes SHA256SUMS and a verification receipt. Development tests/fixtures are excluded from the runtime ZIP.

`release-checkpoint <input.json>` and `release-advance <checkpoint.json> <event.json>` record bounded, identity-checked release observations. They do not perform remote publication. Authorized browser operations use actual native host capabilities, never companion plugins. Prepared, uploaded, scanned, submitted and published are separate states; published requires observed evidence and a directory URL.

## Integration and rights

The registry at `references/integration-registry.json` maps **15 sources**, every original workflow and all local entrypoints. MIT sources with complete licenses (Studio baseline, Matt Skills Curated, Skillquiver and the Zilvereyes Autopilot derivative) were adapted with attribution. Proprietary, restricted and license-unclear implementations were replaced with independent local implementations. Original sources, installed caches and earlier candidates remain intact. Upstream URLs are provenance/documentation, not required plugin connections.

The full catalog is routed progressively. `references/studio-policy.md` resolves overlap among TDD, research, planning and review workflows. Imported upstream recommendations never supersede user or host instructions. Context Handoff remains separate; its lifecycle hooks are not bundled. The generic Matt handoff worksheet does not authorize new chats or source archival.

The optional modern-web-guidance source informed escaped HTML evidence, semantic tables and keyboard-focusable scroll regions. Its corpus is not copied because a redistribution license was not established; an independently authored local checklist is bundled instead.

## Verification and status

Run `node --test tests/*.test.mjs` from the editable source tree. Tests cover local modules, CLI integration, real subprocess fixtures, invalid data, path escapes, links/junctions, bounded network behavior and source-preserving import. Fresh release evidence is generated outside the runtime package.

This is a local candidate. No host installation, replacement, commit, push, upload or publication is implied. The new package has no verified public website/privacy/terms URLs, so legacy Studio publication checks correctly report those three missing fields. Included local PRIVACY.md, TERMS.md and SUPPORT.md describe the candidate; publisher verification and public URLs remain separate publication gates.

Version 0.3.4 closes PowerShell download-to-execution detection gaps in both
review engines, versions the changed risk rule and clarifies evaluation-only
boundaries. No provider connection or permission change is required.

Self-check accepts both LF and Windows CRLF skill files without rewriting them.
For a deliberately larger read-only audit, `plugin-eval` and `skill-eval` accept
`--max-file-bytes`, `--max-total-bytes` and `--max-files`. Defaults remain 2 MiB,
32 MiB and 5,000 files; explicit budgets are capped at 32 MiB, 256 MiB and 25,000
files and are recorded in the report. Increasing a budget does not waive a rule,
execute the target, follow links or establish that its runtime is safe.

Version 0.3.8 keeps machine-specific source/destination paths in the private import result and stores portable identifiers in distributable import receipts. Source hashes and file evidence remain unchanged.
