# Evaluation rubric

Evaluate the package in five independent sections. A high aggregate score never overrides a blocking error.

## Identity and provenance

- unique package name and accurate developer identity;
- strict versioning;
- source, license and derivation recorded;
- no invented App or connector IDs;
- upstream and derived sources remain distinguishable.

## Packaging

- valid portable `plugin.json` when portability is claimed;
- synchronized `.codex-plugin/plugin.json` when compatibility is required;
- referenced skills, assets, App manifests and MCP manifests exist;
- short description is no more than 30 characters;
- assets are contained relative paths.

## Skills

- unique skill names;
- complete YAML frontmatter;
- trigger descriptions identify when to use each workflow;
- destructive steps have explicit boundaries;
- supporting references are reachable and scoped.

## Apps and MCP

- App IDs use verified supported prefixes;
- OAuth metadata matches the actual client type;
- each MCP route has one owner and one purpose;
- App binding and direct MCP binding are not duplicated without a documented reason;
- no credential is packaged.

## Verification

- JSON and YAML parse;
- local tests pass;
- tool discovery and harmless execution are verified separately;
- unavailable hosted validation remains unavailable, never counted as a pass;
- installed state is not inferred from source presence.
