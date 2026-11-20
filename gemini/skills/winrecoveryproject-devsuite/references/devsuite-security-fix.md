# Skill: devsuite-security-fix

- Plugin: `winrecoveryproject-devsuite` (0.2.7)
- Source: `plugins/winrecoveryproject-devsuite/skills/devsuite-security-fix/SKILL.md`

> Use when fixing security findings, verifying remediation, proposing hardening, writing policy/disclosures or tracking validated findings.

## Instructions

### Remediate the broken boundary

Read [the policy](_plugin-references.md#file-referencespolicymd), [remediation methods](_plugin-references.md#file-referencessecurity-remediationmd) and [providers](_plugin-references.md#file-referencesprovidersmd). Classify current state as vulnerable, already safe or unproven before patching. Suspicion is not successful exploitation or a verified fix.

For an authorized fix inspect implementation, callers, representations, parser/validation-to-use transitions, lifecycle copies and sibling sinks. State invariant, narrowest shared enforcement boundary and legitimate API/error/compatibility requirements. Independently seek bypass/compatibility counterexamples in a separate pass; subagents require explicit authority. Reject truncation/reinterpretation or partial controls that preserve an alternate unsafe path.

Demonstrate safely, implement the smallest coherent complete boundary fix, test malicious variants and legitimate workflows, and inspect the patch independently. Repeat original and sibling/negative cases and repository checks. Compare against the prior vulnerable revision when safe/useful. Separate fixed, already safe, partial and unproven. Real workbench remediation/patch review owns its stages and artifact IDs when present; never spoof it.

Hardening, policy, vulnerability writeups and tracker/advisory batches follow [methods](_plugin-references.md#file-referencessecurity-remediationmd). Prepare evidence and concrete payloads. Honor existing authorization; external writes require explicit authority when not already covered. GitHub, Linear and optional Atlassian reuse existing bindings. Missing Jira access never authorizes connecting it. A scan finding never itself authorizes disclosure, messages, tickets or merging.

Report outcome, locations, invariant, patch/reproduction evidence, compatibility checks, risks and unavailable provider steps. Severity reflects impact/reachability rather than alarming wording.

## Bundled files

### File: `agents/openai.yaml`

```yaml
interface:
  display_name: "DevSuite · Sikkerhedsrettelser"
  short_description: "Ret godkendte fund og kontrollér beskyttelsen."
  icon_small: "./assets/wrp-icon-128.png"
  icon_large: "./assets/wrp-icon-256.png"
  brand_color: "#00BDA5"
  default_prompt: "Brug $devsuite-security-fix til denne opgave, og bevar de eksisterende forbindelser og budgettet på 0 kr."
```

### File: `assets/icon.png`

_Binary asset, not embedded._

### File: `assets/wrp-icon-128.png`

_Binary asset, not embedded._

### File: `assets/wrp-icon-256.png`

_Binary asset, not embedded._
