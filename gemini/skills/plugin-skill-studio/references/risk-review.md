# Skill: risk-review

- Plugin: `plugin-skill-studio` (0.3.33)
- Source: `plugins/plugin-skill-studio/skills/risk-review/SKILL.md`

> Use when reviewing skills or plugins for risky instructions, downloads, permissions or secret exposure before admitting them.

## Instructions

### Skill Risk Check

Read [Studio policy](_plugin-references.md#file-referencesstudio-policymd) first.

Run `node scripts/studio.mjs risk-scan <target> --format markdown`. Named `Dockerfile` and `Containerfile` members and files ending in `.dockerfile` or `.containerfile` are included as text; binary companions such as `Dockerfile.pkl` are excluded. Size limits still apply and an unreadable or oversized supported file makes coverage incomplete. Review each finding at its exact file and line. Scanning is read-only: never execute, import, source, install, enable, upload, or contact endpoints named by the target. Findings are signals, not proof of intent; clean output is not a safety certification. Suppress only an exact rule ID, rule version and fingerprint with a concrete reason. JSON, Markdown and SARIF are available. Installation remains a separately authorized action.

## Bundled files

### File: `agents/openai.yaml`

```yaml
interface:
  icon_small: "./assets/wrp-icon-128.png"
  icon_large: "./assets/wrp-icon-256.png"
  display_name: "Skill Risk Check"
  short_description: "Use when reviewing skills or plugins for risky instructions, downloads, permiss"
  default_prompt: "Use $risk-review for this task."
```

### Not embedded

- `assets/wrp-icon-128.png` (binary asset, not embedded)
- `assets/wrp-icon-256.png` (binary asset, not embedded)
