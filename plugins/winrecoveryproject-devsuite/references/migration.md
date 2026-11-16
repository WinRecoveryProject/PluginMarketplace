# Migration proposal: triggers only, connections preserved

This document and [exact overlap rows](migration-plan.json) are proposals. The source
builder changes no installed plugin, config, marketplace, provider state or account.
The integration owner performs the separately authorized migration after validation.

1. Snapshot exact native config and inventory every installed variant. Do not infer
   state solely from source caches. Guardrails exists in both created-by-me-remote
   and winrecoveryproject-digital catalogs; consider both sets of overlapping skills.
2. Install the new owned package after local tests and asset/native manifest checks.
   Verify its skills and optional Apps load, with no duplicate MCP server or hook.
3. Use the actual host-supported skill-enable configuration to disable only the exact
   old overlapping skill paths named in the matrix. Preserve all other settings/bytes.
   Retain packages and their App/MCP bindings when needed for backends. Never uninstall,
   disconnect, clear auth, recreate Apps or rotate credentials to remove duplicate
   instruction triggers. Missing source skill inventory is UNKNOWN; never blanket-disable
   unknown CloudConvert functionality.
4. Keep existing Codex Security installed/MCP enabled for licensed workbench/Deep,
   artifacts, indexes and remediation. Keep managed Cloud/CloudConvert providers and
   their connections. Optional Atlassian remains optional and needs no new sign-in.
5. DevSuite does not auto-register hooks. Existing Coordinator SessionStart/Stop may
   stay active. They point to old guidance, so a later reviewed migration may replace
   that single registration with the contained owned hooks and update exact old
   discovery text. Activate exactly one pair; do not add duplicate hooks. Existing
   schema 2 board state remains compatible and no transcript/history migration occurs.
6. Verify effective trigger precedence, real tool inventory and preserved connection
   identities after reload. Provider availability is conditional; do not claim a live
   scan/conversion/cloud session passed from static configuration or package tests.
   Restore the exact config snapshot to roll back, without disconnecting accounts.

The source registry covers 32 available original skills with 207 function mappings.
Some original functions are phases of larger workflows rather than primary triggers.
The JSON overlap list records every available skill including orchestrate-work and
both installed Guardrails variants. CloudConvert original source/skill inventory is
unavailable; only its actual App metadata and independent owned conversion behavior
can be validated here. Free quota and live conversion remain unverified.
