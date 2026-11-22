# Gate mode

<a id="src-devsuite-quality-intro"></a>
<a id="src-devsuite-quality-apply-one-shared-quality-gate"></a>
## Apply one shared quality gate

Read [the policy](../../../references/policy.md). Discover commands from repository docs, manifests and CI. Select by behavior/risk: focused reproduction, affected unit/contract/integration suites, lint/types/format check, build/package and meaningful end-to-end/security/performance/migration/recovery checks. Coverage percentage and worker agreement are not behavior evidence.

Existing Linter or MegaLinter is optional. Reuse project configuration, installed runner or CI results for the tested revision. Inspect side effects and availability. Do not install another plugin, download runners, invoke npx, change hooks/configuration, upgrade dependencies, enable telemetry or buy CI capacity merely to lint. If missing, run available native project checks and label the Linter layer UNAVAILABLE. Missing is never successful lint.

Use nonwriting modes for review. Parallelize independent processes; serialize caches, snapshots, generated files, ports, databases and accounts unless isolation is proven. Inspect full results and exits, retaining failures. Do not silently retry until green.

Map criteria to fresh direct evidence. Inspect assertions for tautologies, implementation mirroring, excessive mocks and missing negatives. Classify failures as product, test, environment, flaky, pre-existing or unresolved. Report command, revision/environment, result and limits; separate specification and quality verdicts. Dependency limits yield PARTIAL or UNAVAILABLE. `python scripts/devsuite.py doctor` verifies this package only; it does not prove the target product or providers work.

When the Linter, CodeRabbit or PowerShell Workbench quality-gate plugins are already installed, their existing configuration and runners may serve as the lint layer. Never install them for this gate.
