# Skill: devsuite-security-assess

- Plugin: `winrecoveryproject-devsuite` (0.6.0)
- Source: `plugins/winrecoveryproject-devsuite/skills/devsuite-security-assess/SKILL.md`

> Use for repository or diff security audits, threat models, discovery, static triage, attack paths and controlled validation.

## Instructions

### Assess security from evidence

Read [the policy](_plugin-references.md#file-referencespolicymd), [assessment methods](_plugin-references.md#file-referencessecurity-assessmentmd) and [providers](_plugin-references.md#file-referencesprovidersmd). These are independently owned workflows. Proprietary Codex Security implementation, canonical sealing, workbench storage/indexing, Deep Scan SDK and model workers remain the licensed existing host provider. Never copy them or present a stand-in as that provider.

Choose one entry mode: standard is one source-backed repository/path pass; diff is the immutable PR/commit/branch/working-tree comparison plus necessary surrounding code; deep explicitly requests repeated independent whole-scope passes and needs the actual provider. Never silently reduce deep to standard or invoke deep for an ordinary diff. Preserve exact scope/context, supplied threat model and inherited SECURITY.md exclusions. Resolve revision and ignore rules without widening directly authorized files.

For host-backed scans, discover schemas; start/resume the exact owned scan, honor SDK lifecycle and returned IDs/claim tokens/paths. Run actual capability/configuration preflight. Save semantic partial checkpoints and honest coverage, record final drafts, complete/seal only through the real provider when ownership allows. SDK-owned completion returns to its owner. Progress reflects reviewed files/phases. Preserve failures and partial coverage. Never manufacture proprietary artifacts/completion. Standard/Deep reports, saved results, usage, feedback and cancellation use available provider tools. Without them, ordinary source review can produce a clearly labeled DevSuite assessment; Deep/workbench completion is UNAVAILABLE.

Build trust boundaries, discover broken-invariant candidates, statically triage imported reports, trace attacker-to-impact paths, test controlled reproductions and seek counterevidence. Findings need root cause, reachable control, location, impact, calibrated confidence/severity and reproduction state. Missing optional advisory access does not require new authentication; continue supported work with limitations. [Assessment methods](_plugin-references.md#file-referencessecurity-assessmentmd) defines each function. Fixes and issue writes are distinct authorized phases in [remediation](devsuite-security-fix.md).

## Bundled files

### File: `agents/openai.yaml`

```yaml
interface:
  display_name: "DevSuite · Sikkerhedstjek"
  short_description: "Undersøg kode og fund med sporbar evidens."
  icon_small: "./assets/wrp-icon-128.png"
  icon_large: "./assets/wrp-icon-256.png"
  brand_color: "#00BDA5"
  default_prompt: "Brug $devsuite-security-assess til denne opgave, og bevar de eksisterende forbindelser og budgettet på 0 kr."
```

### File: `assets/icon.png`

_Binary asset, not embedded._

### File: `assets/wrp-icon-128.png`

_Binary asset, not embedded._

### File: `assets/wrp-icon-256.png`

_Binary asset, not embedded._
