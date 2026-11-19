# Plugin files: codex-security — manifests and top-level files

Source: `plugins/codex-security`. Files outside the `skills/*` folders, embedded as text.

## File: `.app.json`

```json
{
  "apps": {
    "codex-security-access": {
      "id": "connector_openai_codex_security_access",
      "category": "Security",
      "required": false
    },
    "linear": {
      "id": "asdk_app_69a089a326dc8191b32a3f2553f5be2c",
      "category": "Work Tracking & Coordination"
    },
    "github": {
      "id": "connector_76869538009648d5b282a4bb21c3d157",
      "category": "Code Hosting & Security Findings"
    },
    "atlassian": {
      "id": "connector_692de805e3ec8191834719067174a384",
      "category": "Work Tracking & Coordination",
      "capabilities": [
        "read",
        "write"
      ]
    }
  }
}
```

## File: `.mcp.json`

```json
{
  "mcpServers": {
    "codex-security": {
      "command": "node",
      "args": ["./mcp/server.mjs", "--stdio"],
      "cwd": ".",
      "env_vars": ["CODEX_HOME"],
      "tool_timeout_sec": 900
    }
  }
}
```

## File: `OWNERS`

```text
[block, review]
/ @openai/cyber-products
```
