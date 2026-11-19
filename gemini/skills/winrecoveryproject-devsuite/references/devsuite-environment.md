# Skill: devsuite-environment

- Plugin: `winrecoveryproject-devsuite` (0.2.7)
- Source: `plugins/winrecoveryproject-devsuite/skills/devsuite-environment/SKILL.md`

> Use for local/cloud development, repositories, packages, Docker, networking/VPN, desktop testing and environment repair.

## Instructions

### Use the selected computer and real tools

Read [the policy](../../references/policy.md) and [environment operations](../../references/environment.md). Inspect tools and selected machine before choosing local/cloud execution. This plugin creates no cloud machine, browser, repository access or remote desktop. For saved Codex Cloud configurations, use [Codex Tasks](../devsuite-tasks/SKILL.md) and its read-only environment list. For interactive managed desktop or networking, use Cloud Environment only when its actual tools are available to the active account. An optional App entry alone does not provide access. Check status on start/resume and after changes, bind observations to exact environment ID and discard stale status when machines change.

Match repository host/full owner/revision and preserve edits. Use the actual shell/runtime. Repeatable tests use project runners; visible behavior uses the named browser/tab/device/session. Start apps with documented commands, an allowed free project port and verified readiness. Native windows/file pickers use the desktop tool's first-call contract. Inspect results before success. Pause input during takeover/sign-in and resume after control returns; never record credentials. Play back requested recordings before delivery. Read back exports in intended format and link absolute paths.

[Environment operations](../../references/environment.md) covers repositories, dependencies, containers, HTTP/identity/VPN and repair. Preserve proxy, CA, TLS, identity and policy boundaries. Capability does not authorize bypass, secrets or paid compute. Preview is not public deployment. Tool absence is UNAVAILABLE with affected operation/machine; continue independent local development/checks.

Use the integrated [process jobs](../devsuite-jobs/SKILL.md) for local workload lifecycle and [Codex Tasks](../devsuite-tasks/SKILL.md) for registered remote tasks. Discover actual capabilities and retain existing handles; never restart from a missing receipt alone.

## Bundled files

### File: `agents/openai.yaml`

```yaml
interface:
  display_name: "DevSuite · Miljø"
  short_description: "Arbejd i det valgte lokale eller tilsluttede miljø."
  icon_small: "./assets/wrp-icon-128.png"
  icon_large: "./assets/wrp-icon-256.png"
  brand_color: "#00BDA5"
  default_prompt: "Brug $devsuite-environment til denne opgave, og bevar de eksisterende forbindelser og budgettet på 0 kr."
```

### Not embedded

- `assets/icon.png` (binary asset, not embedded)
- `assets/wrp-icon-128.png` (binary asset, not embedded)
- `assets/wrp-icon-256.png` (binary asset, not embedded)
