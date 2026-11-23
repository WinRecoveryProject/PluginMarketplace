---
name: codex-security
description: "Codex Security: Codex Security workflows for security scans, analysis, and investigation. Use when the user asks for assess-patch-risk, attack-path-analysis, check-skills, cloud-findings, deep-security-scan, define-security-policy, finding-discovery, fix-finding, propose-security-hardening, publish-findings, resolve-dependency-alert, security-diff-scan work, or names the codex-security plugin."
---

# Codex Security

Gemini export of the `codex-security` plugin from WinRecoveryProject/PluginMarketplace, version `0.1.33`. Source: `plugins/codex-security`.

> Installing this plugin from the Marketplace gets the upstream package `0.1.33` from https://github.com/openai/plugins (plugins/codex-security), not this local snapshot. Mention that difference when version-specific behaviour matters.

Codex Security packages reusable workflows for security scans, analysis, validation, and investigation across code, diffs, and related artifacts.

## How to use this skill

1. Pick the sub-skill below whose description matches the request.
2. Read its reference file completely before acting; it holds the original instructions plus every bundled script, template and reference as embedded text.
3. Scripts are shown for reading, adapting and explaining. Gemini cannot run them here; give the user the exact command to run locally (PowerShell/Node/Python as written in the file) and ask for the output when it matters.
4. Treat the original instructions as authoritative. Where they mention Codex- or Claude-only tools, use the closest Gemini capability or tell the user what to run.
5. When you propose a change to this plugin, name the original repository path (shown in each reference) so it can be applied in PluginMarketplace.
6. Instructions sometimes name another file by its original path (for example `../../shared/x.md` or `references/y.md`). Those paths do not exist in this upload: resolve them against the `Source:`/`File:` path of the text you are reading and look them up in `references/_index.md`, which says which reference file and section holds the content.
7. This plugin is large, so its code-only plugin files (scripts, assets, tests) are in the companion skill `codex-security-source`. When the index or a link points there and that skill is not available, ask the user to upload `gemini/skills/codex-security-source/` or to paste the file.

## Sub-skills

| Skill | When to use | Reference |
| --- | --- | --- |
| `assess-patch-risk` | Assess an immutable patch artifact's program impact, regression risk, and auto-merge eligibility. Use for generated patch files, provider pull-request diffs, or commit ranges when reviewers need evidence about affected runtime paths, contracts, tests, and recoverability. This skill is read-only and does not generate, edit, apply, push, or merge the patch. | `references/assess-patch-risk.md` |
| `attack-path-analysis` | Use when Codex is already in the attack-path-analysis phase of a security scan or the user explicitly asks to trace a security finding from source to sink and calibrate severity. Do not use as the primary trigger for full PR, commit, branch, patch, or repository scans. | `references/attack-path-analysis.md` |
| `check-skills` | Review agent skills before installation or use. Use when a user or security team wants to check a skill file, bundle, or collection for unsafe instructions, scripts, permissions, or external dependencies. | `references/check-skills.md` |
| `cloud-findings` | Read existing Codex Security Cloud findings, reports, recorded assignment and verification, and scan status from the connected account. Use for Cloud read requests and finding links, not local scans or requests to change Cloud data. | `references/cloud-findings.md` |
| `deep-security-scan` | Run repeated Standard security scans of a repository or scoped path when the user requests a deep, exhaustive, or multi-pass audit. For changes to a PR, commit, branch or working tree, use security-diff-scan. | `references/deep-security-scan.md` |
| `define-security-policy` | Define, review, or update SECURITY.md guidance for a repository or component. Use when the user wants to clarify what Codex Security should review, what is out of scope, which security properties must hold, or whether existing guidance still matches the code. | `references/define-security-policy.md` |
| `finding-discovery` | Use when Codex is already in the finding-discovery phase of a security scan or the user explicitly asks to discover candidate security findings in a repository or code change. Do not use as the primary trigger for full PR, commit, branch, patch, or repository scans. | `references/finding-discovery.md` |
| `fix-finding` | Use only when the user explicitly asks to fix and verify a validated or plausible security vulnerability. Do not use for ordinary bug fixes, correctness or design review findings, general validation, or full PR, commit, branch, patch, or repository scans. | `references/fix-finding.md` |
| `propose-security-hardening` | Develop evidence-backed structural security hardening proposals from disclosures, findings, source code, or Codex Security scans. Use for systemic improvements, alternatives beyond individual patches, architectural tradeoffs, or implementation planning. Also use when a top-level scan requests final-report hardening guidance. | `references/propose-security-hardening.md` |
| `publish-findings` | Import findings from scanners, CI reports, vendor CLIs, APIs, or connected tools into the local workbench. Publish a selection of stored vendor findings to Codex Security Cloud. | `references/publish-findings.md` |
| `resolve-dependency-alert` | Investigate a vulnerable dependency from a scanner alert, advisory, or SBOM match. Trace what pulls it in and determine whether it can be upgraded. | `references/resolve-dependency-alert.md` |
| `security-diff-scan` | Review a pull request, commit, branch diff, or working-tree patch for security vulnerabilities. | `references/security-diff-scan.md` |
| `security-scan` | Find vulnerabilities in the current source of a whole repository or selected paths. This is the default single-pass audit. Use the diff skill for PR, commit, branch, or working-tree changes and the deep skill for an explicitly requested deep scan. | `references/security-scan.md` |
| `threat-model` | Use when Codex is already in the threat-modeling phase of a security scan, the user explicitly invokes $threat-model, or the user explicitly asks to create, update, or persist a repository threat model. Do not use as the primary trigger for full PR, commit, branch, patch, or repository scans. | `references/threat-model.md` |
| `threat-model-visualize` | Turn an existing threat model into an interactive architecture and threat-path explorer. Resolve simple requests for a target's last scan; do not perform a new assessment. | `references/threat-model-visualize.md` |
| `track-findings` | Track validated Codex Security findings in Linear, Jira, GitHub issues, or draft GitHub security advisories. Supports issue batches, duplicate checks, and reviewed writes. Do not use for scans or fixes. | `references/track-findings.md` |
| `triage-finding` | Triage supplied or imported security findings against a repository using its security policy and static code evidence. Accepts scanner reports, advisories, GitHub findings, and Jira or Linear tickets. Do not use for discovery, duplicate triage, runtime validation, or fixes. | `references/triage-finding.md` |
| `validation` | Use when Codex is already in the validation phase of a security scan or the user explicitly asks to determine whether one or more candidate security findings are valid. Do not use as the primary trigger for full PR, commit, branch, patch, or repository scans. | `references/validation.md` |
| `verify-fix` | Use only when the user explicitly requests verification that a security fix remediates a reported vulnerability. Do not invoke automatically while implementing fixes, reviewing ordinary code changes, or running tests. Do not use for non-security fixes, candidate finding validation, or full repository scans. | `references/verify-fix.md` |
| `vulnerability-writeup` | Turn vulnerability notes, disclosure reports, PoCs, source code, or Codex Security findings into self-contained vulnerability reports with clearly supported claims. Use for one vulnerability or a disclosure campaign; a Codex Security scan is optional. | `references/vulnerability-writeup.md` |

## Example prompts

- Run a Codex Security scan on this repository.
- Run a Codex Security diff scan on this PR, commit, branch diff, or working-tree patch.
- Triage existing security findings against this repository.

## Plugin-level files

Manifests, hooks, top-level scripts, tests and docs (outside `skills/`):

- `references/_plugin.md`
- `references/_plugin-codex-plugin.md`
- `references/_plugin-examples.md`
- `references/_plugin-references.md`
- `references/_index.md`

## In the companion skill `codex-security-source`

- `references/_plugin-assets.md`
- `references/_plugin-mcp.md`
- `references/_plugin-schemas.md`
- `references/_plugin-scripts-part01.md`
- `references/_plugin-scripts-part02.md`
- `references/_plugin-scripts-part03.md`
- `references/_plugin-shared.md`
