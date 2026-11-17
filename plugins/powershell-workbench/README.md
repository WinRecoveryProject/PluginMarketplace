# PowerShell Workbench

Portable Codex plugin for PowerShell-centered and mixed-language project development.

PowerShell Workbench provides reusable PowerShell scaffolding, discovery, refactoring, environment diagnosis, agent-harness development, documentation routing and opt-in quality workflows. Potentially mutating or expensive gates remain explicit rather than running automatically.

## Package layout

- `.codex-plugin/plugin.json` — Codex plugin manifest.
- `plugin.json` — portable plugin manifest.
- `skills/` — PowerShell and mixed-language workflows.
- `scripts/` — bounded helper tools used by those workflows.
- `assets/` — plugin identity, privacy and terms assets.

## License

MIT. See `LICENSE`.

Version 0.9.0-beta.3 makes skill activation conditions explicit and adds
research-only boundaries to language documentation skills. Runtime tooling and
provider connections are unchanged.

Version 0.9.0-beta.4 fixes explicit automatic-variable scan paths under Windows PowerShell 5.1 -File with redirected stdin. Direct invocation and pipeline inputs are tested in both supported PowerShell hosts.


Version 0.9.0-beta.5 also rejects typed, attributed and tuple assignments to
protected automatic variables. RHS/index/member reads remain allowed. Regression
contracts pass in Windows PowerShell 5.1 and PowerShell 7; no project source is executed.
