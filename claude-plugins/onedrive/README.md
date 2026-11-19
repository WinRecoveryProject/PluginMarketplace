# OneDrive for Claude Code on a desktop

This package configures the existing WinRecoveryProject HTTPS OneDrive MCP server and includes a skill for verifying the connected account before accessing files.

```text
/plugin install onedrive --marketplace WinRecoveryProject/PluginMarketplace
```

After installing in local Claude Code, select the OneDrive server in `/mcp` and complete Microsoft sign-in there when you want to connect. Claude Code keeps its own OAuth session. The existing Codex OneDrive and CloudStorage Portal app connections remain in Codex. The broker accepts the desktop loopback callback at `http://localhost:<port>/callback` or `http://127.0.0.1:<port>/callback`. The hosted Claude web connector is outside this package's scope.

Once connected, ask the skill to verify the intended Microsoft account and its drive. Start with a read-only check of a named test folder. A successful sign-in is separate from permission to read or change files in a drive. File writes require a user task that authorizes the operation.

Installation and account access are separate checks. The package contains the URL and transport. Use Claude Code's OAuth interface to authorize access.

VS Code 1.146.0 displays `http://127.0.0.1:33418` and `https://vscode.dev/redirect` for OAuth client registration. The current broker requires the exact `/callback` path for loopback redirects and limits HTTPS redirects to ChatGPT and OpenAI domains. The two VS Code addresses fall outside that allowlist.
