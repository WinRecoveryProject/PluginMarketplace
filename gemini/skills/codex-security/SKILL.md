---
name: codex-security
description: "Codex Security: Codex Security workflows for security scans, analysis, and investigation. Use when the user asks for attack-path-analysis, deep-security-scan, define-security-policy, finding-discovery, fix-finding, propose-security-hardening, security-diff-scan, security-scan, threat-model, track-findings, triage-finding, validation work, or names the codex-security plugin."
---

# Codex Security

Gemini export of the `codex-security` plugin from WinRecoveryProject/PluginMarketplace, version `0.1.22`. Source: `plugins/codex-security`.

> Installing this plugin from the Marketplace gets the upstream package `0.1.33` from https://github.com/openai/plugins (plugins/codex-security), not this local snapshot. Mention that difference when version-specific behaviour matters.

Codex Security packages reusable workflows for security scans, analysis, validation, and investigation across code, diffs, and related artifacts.

## How to use this skill

1. Pick the sub-skill below whose description matches the request.
2. Read its reference file completely before acting; it holds the original instructions plus every bundled script, template and reference as embedded text.
3. Scripts are shown for reading, adapting and explaining. Gemini cannot run them here; give the user the exact command to run locally (PowerShell/Node/Python as written in the file) and ask for the output when it matters.
4. Treat the original instructions as authoritative. Where they mention Codex- or Claude-only tools, use the closest Gemini capability or tell the user what to run.
5. When you propose a change to this plugin, name the original repository path (shown in each reference) so it can be applied in PluginMarketplace.
6. Instructions sometimes name another file by its original path (for example `../../shared/x.md` or `references/y.md`). Those paths do not exist in this upload: resolve them against the `Source:`/`File:` path of the text you are reading and look them up in `references/_index.md`, which says which reference file and section holds the content.

## Sub-skills

| Skill | When to use | Reference |
| --- | --- | --- |
| `attack-path-analysis` | Use when Codex is already in the attack-path-analysis phase of a security scan or the user explicitly asks to trace a security finding from source to sink and calibrate severity. Do not use as the primary trigger for full PR, commit, branch, patch, or repository scans. | `references/attack-path-analysis.md` |
| `deep-security-scan` | Use when the user asks for a deep, exhaustive, multi-pass, or variance-reducing repository-wide or scoped-path Codex Security scan. Run repeated complete independent Standard scans with the Codex Security deep-scan tool, which aggregates their validated findings and prepares the canonical artifacts; then complete the same scan once. Do not use for PRs, commits, branch diffs, or working-tree diffs. | `references/deep-security-scan.md` |
| `define-security-policy` | Define, review, or update SECURITY.md guidance for a repository or component. Use when the user wants to clarify what Codex Security should review, what is out of scope, which security properties must hold, or whether existing guidance still matches the code. | `references/define-security-policy.md` |
| `finding-discovery` | Use when Codex is already in the finding-discovery phase of a security scan or the user explicitly asks to discover candidate security findings in a repository or code change. Do not use as the primary trigger for full PR, commit, branch, patch, or repository scans. | `references/finding-discovery.md` |
| `fix-finding` | Use when the user explicitly asks to fix and verify a validated or plausible security finding. Do not use as the primary trigger for full PR, commit, branch, patch, or repository scans. | `references/fix-finding.md` |
| `propose-security-hardening` | Develop evidence-backed structural and architectural security hardening proposals from vulnerability disclosures, supplied findings, incident or assessment documents, source code, or a completed Codex Security scan. Use when a user asks for systemic improvements, alternatives beyond per-finding patches, before-and-after security architecture views, engineering tradeoff analysis, or an implementation-ready plan for a selected hardening option. Also use automatically after a Codex Security scan with reportable findings when the top-level scan workflow requests final-report hardening guidance. | `references/propose-security-hardening.md` |
| `security-diff-scan` | Review a pull request, commit, branch diff, or working-tree patch for security vulnerabilities. | `references/security-diff-scan.md` |
| `security-scan` | Use for a standard, single-pass security audit of an entire repository or a scoped path, package, folder, or submodule with no diff to review. This is the default repository scan. Do not use for PR, commit, branch, or working-tree diffs, or for deep, multi-pass scans. | `references/security-scan.md` |
| `threat-model` | Use when Codex is already in the threat-modeling phase of a security scan, the user explicitly invokes $threat-model, or the user explicitly asks to create, update, or persist a repository threat model. Do not use as the primary trigger for full PR, commit, branch, patch, or repository scans. | `references/threat-model.md` |
| `track-findings` | Track validated Codex Security findings in Linear, Jira, GitHub issues, or draft GitHub security advisories. Use it for one finding or an explicitly selected batch of up to 25 findings tracked as Linear, Jira, or GitHub issues. Includes duplicate checks, exact previews, approval-gated writes, and readback. Do not use it for scans or fixes. | `references/track-findings.md` |
| `triage-finding` | Use when the user supplies or imports existing security findings, vulnerability reports, or security/vulnerability Jira/Linear tickets from scanners, advisories, GitHub, Atlassian Rovo, Linear, or similar backlog sources and wants static repo-impact triage. Do not use for discovery, duplicate-bug triage, validation, or fixes. | `references/triage-finding.md` |
| `validation` | Use when Codex is already in the validation phase of a security scan or the user explicitly asks to determine whether one or more candidate security findings are valid. Do not use as the primary trigger for full PR, commit, branch, patch, or repository scans. | `references/validation.md` |
| `verify-fix` | Use when the user asks whether an existing security fix, patch, finding, or completed issue actually remediates the original vulnerability without modifying the repository. Do not use to validate candidate findings, implement patches, or run full repository scans. | `references/verify-fix.md` |
| `vulnerability-writeup` | Turn vulnerability notes, disclosure reports, PoCs, source code, or Codex Security findings into self-contained, sceptically validated, natural-sounding vulnerability reports. Use for one vulnerability or a disclosure campaign; a Codex Security scan is optional. | `references/vulnerability-writeup.md` |

## Example prompts

- Run a Codex Security scan on this repository.
- Run a Codex Security diff scan on this PR, commit, branch diff, or working-tree patch.
- Triage existing security findings against this repository.

## Plugin-level files

Manifests, hooks, top-level scripts, tests and docs (outside `skills/`):

- `references/_plugin.md`
- `references/_plugin-assets.md`
- `references/_plugin-codex-plugin.md`
- `references/_plugin-examples.md`
- `references/_plugin-mcp.md`
- `references/_plugin-preflight.md`
- `references/_plugin-references.md`
- `references/_plugin-schemas.md`
- `references/_plugin-scripts-part01.md`
- `references/_plugin-scripts-part02.md`
- `references/_index.md`
