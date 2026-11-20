# Plugin files: plugin-skill-studio — manifests and top-level files

Source: `plugins/plugin-skill-studio`. Files outside the `skills/*` folders, embedded as text.

## File: `AGENTS.md`

### Candidate development

Read references/studio-policy.md. Keep edits within this candidate; do not mutate original packages, caches or previous candidates. Maintain both manifests and registry coverage. Skills, runtime modules, scripts and local references must work from a fresh ZIP without original source paths or external plugins. No auth files or global configuration changes are needed.

Run `node --test tests/*.test.mjs`, `node scripts/studio.mjs self-check` and the bundled generic validator before packaging. Use `python -B tools/package.py --out <new-directory>` for deterministic builds and fresh extraction checks. Preserve license notices. A practical fixture test is not a live model benchmark; record live preflight blockers honestly. Do not install, commit, push, upload, publish or clean other paths without the corresponding user scope.

## File: `LICENSE`

```text
MIT License

Copyright (c) 2026 Zilvereyes

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## File: `PRIVACY.md`

### Privacy

Plugin-Skill-Studio operates on selected local files and adds no telemetry. Static scans never execute the target. Reports can contain filenames and excerpts; review them before sharing. Known secret shapes are redacted, which does not guarantee all sensitive content can be recognized.

Direct public retrieval occurs only for an explicit catalog source. Codex benchmarks use existing host authentication and model configuration; the model provider's terms and privacy policy apply. No new API keys are created and authentication files are never copied into fixtures or packages.

Benchmarks retain the exact temporary workspaces reported by the runner for review. Imported source content and release observations remain local until separately authorized sharing/publication. No private browser profiles or cookie stores are read. Account, browser and other host capability policies remain separate.

## File: `README.md`

### Plugin-Skill-Studio

Version **0.3.33**. Independent Zilvereyes plugin with local creation, discovery, conversion, engineering workflows, Skill Eval, plugin evaluation, risk review, evidence worksheets, optional local Windows desktop control and deterministic packaging.

All required skills, scripts, policies and references are bundled. Node 20+ and Python 3.10+ are host runtimes, not companion plugins. Optional Windows desktop commands use the already installed Windows PowerShell 5.1 and .NET components. No npm/pip install, npx, external plugin, App binding or MCP server is required. Model benchmarks use the user's existing Codex CLI and login; host terminal/browser capabilities are required for corresponding operations. Direct public lookups are explicit and bounded. No telemetry is added.

Windows desktop capture, inspection and guarded mouse operations are integrated in the existing `automate-ui` workflow. Read [the local Desktop guide](_plugin-references.md#file-referenceswindows-desktopmd). This is an alternative local backend; OpenAI's native Computer Use binary and existing App/OAuth connections are unchanged.

#### Start

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

#### Practical Skill Eval

```powershell
node scripts/studio.mjs benchmark-init skills/skill-eval --out benchmark.json
node scripts/studio.mjs skill-eval skills/skill-eval --mode benchmark --config benchmark.json --out benchmark-results
node scripts/studio.mjs compare-reports before.json after.json
```

Edit the starter configuration first: use a separate non-secret fixture directory, concrete task prompts and explicit verifier command/argument arrays. Three scenarios and six sequential baseline/with-skill runs are the default; each model run is bounded at five minutes. Configurations without explicit verifiers cannot run. No fixed model is selected; record the effective model from the existing configuration. Trigger scenarios should include positive, negative and boundary requests and an untouched held-out set.

Preflight checks the real CLI, effective catalog, MCP/App/plugin settings, hooks and existing authentication before any model request. Invocation-only overrides disable unrelated skills/services. If isolation or authentication cannot be observed, the result is BLOCKED with the reason. Authentication files are never copied. Temporary test workspaces are retained for review; their exact generated path is reported. The original skill and fixtures remain unchanged. Fixture-runner regression tests are distinct from a real Codex benchmark.

#### Discovery, evidence and import

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

Catalog input is a package root, supplied JSON snapshot or explicit public HTTPS URL. No links are automatically followed. Rankings and history are UNKNOWN unless supported by attributed observations. Local installation and global account permissions are distinct from manifest declarations. [Service contracts](_plugin-src.md#file-srcservicesreadmemd) describe exact fields and bounds.

Use the [version audit](_plugin-references.md#file-referencesinventory-versionsmd) to capture and compare installed versions, public Git manifests and explicitly related vendor releases for one host and account. Add `--components <workspace>` to capture native App, skill and MCP discovery in the same attested scope.

If an upgrade removed a skill path during the current turn, use the host's existing
rediscovery rule and a new successful full CLI installed observation. The read-only
`resolve-installed` helper checks the exact identity/version and contained current
cache root/skill; it never runs a command from input, picks the highest cache,
restores a stale directory or changes settings/connections. Snapshot timestamps
remain observations, not attested freshness or entitlement. Per-skill activation
is separate. See [in-session cache recovery](_plugin-references.md#file-referencesinstalled-cache-resolutionmd).

GPT import accepts user-supplied text/configuration and previously authorized visible source content. No hidden GPT configuration, cookies, private browser profile or credentials are retrieved. Imported capability names do not activate tools. Batch import and GPT conversion create reviewable local candidates, never host installations. The compatible skill installer runs a bundled pre-install risk scan: preview includes findings, and active or incomplete scans block writing unless exact reviewed fingerprint/rule-version suppressions clear them.

#### Creation, packaging and release

The compatible commands `scripts/plugin-studio.mjs` and `scripts/skill-studio.mjs` remain available. Autopilot's local analyzer, validator and packager live under `skills/plugin-autopilot/scripts/`. `python -B tools/package.py --out <new-output-directory>` builds two byte-identical ZIPs, validates a fresh extraction and writes SHA256SUMS and a verification receipt. Development tests/fixtures are excluded from the runtime ZIP.

`release-checkpoint <input.json>` and `release-advance <checkpoint.json> <event.json>` record bounded, identity-checked release observations. They do not perform remote publication. Authorized browser operations use actual native host capabilities, never companion plugins. Prepared, uploaded, scanned, submitted and published are separate states; published requires observed evidence and a directory URL.

#### Integration and rights

The registry at `references/integration-registry.json` maps **15 sources**, every original workflow and all local entrypoints. MIT sources with complete licenses (Studio baseline, Matt Skills Curated, Skillquiver and the Zilvereyes Autopilot derivative) were adapted with attribution. Proprietary, restricted and license-unclear implementations were replaced with independent local implementations. Original sources, installed caches and earlier candidates remain intact. Upstream URLs are provenance/documentation, not required plugin connections.

The full catalog is routed progressively. `references/studio-policy.md` resolves overlap among TDD, research, planning and review workflows. Imported upstream recommendations never supersede user or host instructions. Context Handoff remains separate; its lifecycle hooks are not bundled. The generic Matt handoff worksheet does not authorize new chats or source archival.

The optional modern-web-guidance source informed escaped HTML evidence, semantic tables and keyboard-focusable scroll regions. Its corpus is not copied because a redistribution license was not established; an independently authored local checklist is bundled instead.

#### Verification and status

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

## File: `SUPPORT.md`

### Support

Report local candidate issues to its owner with the version, command, redacted diagnostic and relevant receipt. No public support endpoint is configured for Plugin-Skill-Studio. Upstream authors do not support this derivative's modifications. Do not share authentication files, browser profiles, private target contents or unredacted tokens.

## File: `TERMS.md`

### Terms

Independent Zilvereyes software under the included MIT license, with upstream MIT notices preserved in THIRD_PARTY_NOTICES.md and references. No safety certification, guaranteed task success, affiliation or endorsement is implied. Public source links are attribution/documentation and not a transfer of ownership or support obligations to upstream maintainers.

This is a local candidate. Publisher verification, public legal URLs, installation and public release are separate actions. User and host authorization govern mutations, online model usage, network access and publication.

## File: `THIRD_PARTY_NOTICES.md`

### Third-party notices

Plugin-Skill-Studio is an independent Zilvereyes package.

- matt-skills-curated: adapted under MIT. Full license: references/matt-skills-curated-LICENSE.txt.
- skillquiver: adapted under MIT. Full license: references/skillquiver-LICENSE.txt.
- zilvereyes-plugin-autopilot: adapted under MIT. Full license: references/zilvereyes-plugin-autopilot-LICENSE.txt.

Studio baseline is MIT; its original LICENSE remains included. Full file-hash provenance and independent implementation decisions appear in references/integration-registry.json. Proprietary, restricted or license-unclear source implementation and assets were not copied. Hosted App bindings and server endpoints are not included.

## File: `package.json`

```json
{
  "name": "plugin-skill-studio",
  "version": "0.3.33",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test tests/*.test.mjs",
    "validate": "node scripts/studio.mjs self-check"
  },
  "engines": {
    "node": ">=20"
  }
}
```

## File: `plugin.json`

```json
{
  "$schema": "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json",
  "name": "plugin-skill-studio",
  "version": "0.3.33",
  "description": "Self-contained local plugin and skill creation, discovery, evidence, evaluation, risk review, conversion and deterministic packaging. Host execution capabilities and explicit public lookups remain separate.",
  "author": {
    "name": "Zilvereyes"
  },
  "license": "MIT",
  "extensions": {
    "com.openai": {
      "interface": {
        "displayName": "Plugin-Skill-Studio",
        "shortDescription": "Byg og vurder plugins & skills",
        "longDescription": "Self-contained local plugin and skill creation, discovery, evidence, evaluation, risk review, conversion and deterministic packaging. Host execution capabilities and explicit public lookups remain separate.",
        "developerName": "Zilvereyes",
        "category": "Developer Tools",
        "capabilities": [
          "Interactive",
          "Write"
        ],
        "defaultPrompt": [
          "Byg eller udvid et plugin med lokale workflows.",
          "Vurdér denne skill med Skill Eval og vis evidensen.",
          "Find, importér og gennemgå mine plugin- og skill-kilder."
        ],
        "logo": "./assets/logo-512.png",
        "composerIcon": "./assets/composer-128.png",
        "brandColor": "#635BFF",
        "brandColorDark": "#A7A2FF",
        "websiteURL": "https://github.com/WinRecoveryProject/PluginMarketplace/tree/main/plugins/plugin-skill-studio",
        "privacyPolicyURL": "https://github.com/WinRecoveryProject/PluginMarketplace/blob/main/plugins/plugin-skill-studio/PRIVACY.md",
        "termsOfServiceURL": "https://github.com/WinRecoveryProject/PluginMarketplace/blob/main/plugins/plugin-skill-studio/TERMS.md"
      }
    }
  }
}
```
