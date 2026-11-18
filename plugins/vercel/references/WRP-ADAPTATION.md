# Vercel Codex adaptation

This WinRecoveryProject Digital candidate retains the existing `vercel` plugin name, App declaration, MCP configuration, and existing Marketplace skill entry points. It carries Vercel's Apache-2.0 notice.

- Updated content comes from [Vercel v0.56.0](https://github.com/vercel/vercel-plugin/tree/e69e3ba0ac0d7d24033c5ba95041acc4fc656480).
- Compatibility content and the existing Codex declarations come from [the public OpenAI package](https://github.com/openai/plugins/tree/985fff07dcefa03e40e8664e24363d10b2bacd44/plugins/vercel).
- Vendor skills with a nested source copy use a separate reference filename so Codex exposes each skill once. The Marketplace, protected deployment and sandbox instructions document when existing connections can be reused and which operations need explicit authorization. The distribution has no vendor setup hooks.
