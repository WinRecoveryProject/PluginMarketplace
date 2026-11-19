# Zilvereyes Context Handoff for Claude

Use the `zilvereyes-context-handoff` skill to preserve a task's goal, constraints, evidence and next action in a local Markdown packet. The skill uses the same Python 3 packet helper as the Codex package. Confirm the packet before carrying it into a new conversation.

```text
/plugin install zilvereyes-context-handoff --marketplace WinRecoveryProject/PluginMarketplace
```

The Claude package contains a skill and a local helper. Codex lifecycle hooks and thread operations belong to the Codex package. The helper uses Python's standard library. This derivative includes the original MIT notice from Tim Yu's Context Handoff.
