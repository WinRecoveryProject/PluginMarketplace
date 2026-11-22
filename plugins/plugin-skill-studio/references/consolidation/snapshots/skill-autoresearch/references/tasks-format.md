# tasks.json format

`DATA/tasks.json` is a JSON array. One object per task:

| Field | Type | Required | Meaning |
|---|---|---|---|
| `id` | string | yes | Short, unique, `[a-z0-9-]` |
| `prompt` | string | yes | The task text the agent receives |
| `fixture` | string | yes | Folder name under `DATA/fixtures/` the task starts from |
| `check` | string | yes | Bash command run inside a copy of the fixture after the agent is done. Exit 0 = pass, anything else = fail. No network. |
| `timeout_s` | number | no | Max seconds for `check` (default 60). Timeout = fail. |
| `targets` | string | yes | Which instruction in the skill this task tests |

Example:

```json
[
  {
    "id": "metadata-fallback",
    "prompt": "Bars.lua reads the addon version. Make it work on clients where GetAddOnMetadata is missing.",
    "fixture": "metadata-fallback",
    "check": "grep -q 'C_AddOns' Bars.lua && grep -q 'rawget(_G' Bars.lua",
    "timeout_s": 30,
    "targets": "Section 'API fallbacks': use C_AddOns.GetAddOnMetadata with rawget(_G, ...) fallback"
  }
]
```

Good checks:
- Test an outcome the skill's instruction should cause, not the exact wording of a solution.
- Fail on the untouched fixture (phase 2 discards tasks whose check already passes).
- Use tools that exist locally, e.g. `grep`, `node script.js`, or the Lua check (not on PATH; use the full path to the VS Code sumneko extension and grep its output): `"$LLS" --check . --checklevel Warning 2>&1 | grep -q 'no problems found'`.
