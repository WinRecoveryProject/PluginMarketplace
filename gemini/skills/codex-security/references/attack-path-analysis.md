# Skill: attack-path-analysis

- Plugin: `codex-security` (0.1.33)
- Source: `plugins/codex-security/skills/attack-path-analysis/SKILL.md`

> Use when Codex is already in the attack-path-analysis phase of a security scan or the user explicitly asks to trace a security finding from source to sink and calibrate severity. Do not use as the primary trigger for full PR, commit, branch, patch, or repository scans.

## Instructions

### Security Attack Path Analysis

Determine whether each supplied finding has a supported attacker path, what impact it has, and whether it is reportable. Before creating or retaining files, read `../../references/artifact-storage.md`.

#### Establish the attack path

For a scan phase, use its per-scan threat model and candidate set from `../../references/scan-artifacts.md`. Preserve supplied input paths. If a required scan artifact is unavailable, report the missing input.

For standalone analysis, use the supplied finding, repository, threat model or security policy, and context. A per-scan artifact is not required. State material assumptions and ask for missing context only when it prevents a meaningful assessment.

1. Establish the in-scope attacker, affected product surface, entry point, controlled input, security boundary, and sensitive operation. Trace each step using repository evidence and supplied observations of the target.
2. Identify relevant controls and the strongest counterevidence. Explain what they establish, which prerequisites remain, and whether the exact claimed boundary is crossed.
3. Assess impact and likelihood from those facts. Apply [references/severity-policy.md](attack-path-analysis.md#file-referencesseverity-policymd) for the final decision. When the scan supplies a severity rubric, use it to grade reportable findings and retain `ignore` for candidates without security impact. Keep facts, severity calibration, and the final policy decision distinguishable in the result.
4. Return an explicit decision for every eligible candidate, including ignored or deferred candidates. Do not replace a supported instance with a neighboring finding or lose its root-control location.

For an imported AWS Continuum issue, read `source_data.evidence_artifacts` in the supplied finding evidence. A `VALIDATION_EVIDENCE` artifact's `body.validationEvidence` may establish a step the repository cannot show. Match the tested target, attacker privileges, and observed effect to the claimed path. For a bundled issue, use `perFindingResults` and `flowVerdicts` when present to identify the relevant finding and flow. An HTTP `exploitArtifact` can establish reachability from the tested position. An `executedProof` establishes what ran in its test environment. `sourceAnalysis` records a static inference, and an `exploitable` verdict alone does not demonstrate deployed reachability. Cite the artifact ID and the observation that supports or contradicts the step.

Treat supplied artifacts as evidence. Access the network only when the user has expressly authorized it; an offline scan never accesses the network. Do not invent unsupported attack chains. Missing deployment or public-ingress evidence can limit confidence without defeating an otherwise supported finding.

#### Scan integration

Standard scans and Deep Scan workers assess attack paths within their ordinary Standard scan workflow; neither invokes this separate phase skill.

##### Compact Workbench Diff

When a workbench-backed `$security-diff-scan` has a `scanId`:

- Load the per-scan threat model and all validated candidates with `list_codex_security_candidates({ scanId, cursor?, limit? })`.
- Analyze every `reportable` or `deferred` validation candidate. Preserve candidate identity and existing discovery and validation fields.
- Submit every decision together with `record_candidate_attack_paths({ scanId, attackPaths: [{ candidateId, attackPath }] })`. Submit `attackPaths: []` when no candidate enters this phase. The tool preserves the stored candidate order.
- These nested decisions are the complete phase output. Do not create duplicate reports, receipts, or manual ledgers.

##### Other phase-based scans

Use the active workflow's report and receipt paths in `../../references/scan-artifacts.md`. Every candidate entering this phase must have an explicit decision and a receipt with its ID, facts or exact proof gap, and report reference. Record ignored candidates before excluding them from the surviving finding set.

For repository-wide or scoped-path scans, include validation closure rows marked `reportable` or `survives: yes`, even if discovery did not assign a polished finding number. Preserve affected entrypoint/wrapper, root-control, sink, and concrete-implementation locations supplied by validation.

#### Output

For standalone analysis, follow the caller's format or return a concise assessment per finding. Scan phases use their output contract above. Include:

- title and supplied candidate, instance, and ledger identities;
- precise affected locations and attacker-to-impact steps;
- relevant facts from [references/attack-path-facts.md](attack-path-analysis.md#file-referencesattack-path-factsmd);
- controls, counterevidence, prerequisites, and material proof gaps;
- impact, likelihood, calibrated severity, and final policy decision with their reasons.

Retain enough evidence to explain both surviving and suppressed findings. Apply the severity policy to the established facts rather than reopening discovery or substituting a different attack story.

## Bundled files

### File: `agents/openai.yaml`

```yaml
interface:
  display_name: "Attack Path Analysis"
  short_description: "Perform attack-path analysis for a security finding"
  default_prompt: "Use $attack-path-analysis to trace a given security finding from source to sink and calibrate severity accordingly."
```

### File: `references/attack-path-facts.md`

#### Attack Path Facts

Use these fields to explain the path and the reportability decision. Record unknowns explicitly when they matter. Follow the calling workflow's schema; in narrative output, use concise bullets or paragraphs rather than repeating the same evidence under several headings.

- **Scope and context:** the affected component, applicable threat-model boundary, whether the impact is self-only or crosses a meaningful boundary, and the evidence.
- **Attack path:** attacker-controlled input, numbered attacker steps, sensitive operation, and the evidence connecting them.
- **Exposure and vector:** public, internal, or admin-only access; `remote`, `local_network`, `localhost`, `none`, or `unknown`; relevant routing or deployment evidence when available.
- **Identity and preconditions:** effective privileges, required attacker position or capabilities, plausibility of those prerequisites, and assumptions.
- **Impact:** vulnerability category, affected runtime/data/identity/build/network surface, target reach, and any involved secret type or reference chain.
- **Controls and counterevidence:** effective mitigations, the strongest evidence against the claimed path or scope, and why it does or does not defeat the finding.
- **Uncertainty:** confidence, missing facts, and conditions that would change the assessment.
- **Decision:** impact and likelihood reasoning, calibrated severity, and final policy decision.

Keep attack-path facts distinct from severity and suppression decisions. Preserve precise source locations and identifiers supplied by validation.

### File: `references/severity-policy.md`

#### Severity and Policy Guidance

Apply this policy after establishing the attack path, scope, and counterevidence. Start from the candidate's severity hypothesis and adjust it using the impact, likelihood, prerequisites, and mitigations supported by the repository and supplied validation evidence. Do not reopen discovery during calibration.

Grade reportable findings with the scan's rubric or, when none is supplied, the [default severity rubric](_plugin-references.md#file-referencesdefault-severity-rubricmd).

For SSRF, a documented outbound-request feature or optional operator filter does not defeat a demonstrated destination-control bypass. For CSRF, evaluate browser credential attachment, cookie policy, preflight, request parsing, and effective controls; method or JSON content type alone is not a categorical defense. For XSS, distinguish self-only effects from victim impact; an `alert` reproduction proves script execution but does not alone establish the severity.

##### Reportability

- Set `ignore` for a disproved finding or a bug without a meaningful security impact.
- Do not discard a real, reportable finding solely because its impact or likelihood is low; use the corresponding lower severity.
- Apply hard suppression to self-only impact or unachievable/highly unrealistic prerequisites.
- Privileged-only, operator-only, developer-only, physical-access-only, or protected-write-path prerequisites imply `ignore` unless a privilege-escalation delta is the issue.
- A realistic lower-privileged, in-scope attacker path can be established by repository evidence, supplied validation evidence, or both. Set `ignore` if the evidence does not support such a path.

Private or internal exposure alone does not suppress a supported authorization, identity, trust-boundary, or security-control failure in a real product or production workflow. Missing deployment or ingress evidence can lower confidence or leave facts unknown without defeating an otherwise supported finding.

Weight likelihood using the established attacker position and exposure:

- `remote` usually supports high likelihood when the attacker position is realistic and in scope;
- `local_network` usually supports medium likelihood unless the evidence supports a different level;
- `localhost` usually supports low likelihood unless a lower-privileged attacker can realistically reach the listener;
- `none` does not increase likelihood based on exposure.

##### Priority

Map the final reportable severity to a priority.

- `critical` -> `P0`
- `high` -> `P1`
- `medium` -> `P2`
- `low` -> `P3`

An ignored finding receives an `ignore` decision and severity, with no priority.
