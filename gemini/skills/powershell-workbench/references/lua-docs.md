# Skill: lua-docs

- Plugin: `powershell-workbench` (0.9.0-beta.6)
- Source: `plugins/powershell-workbench/skills/lua-docs/SKILL.md`

> Use when researching lua syntax, runtime, parser and component-contract documentation with explicit version scope inside PowerShell Workbench.

## Instructions

### Lua Docs

Read ../powershell-scaffold/references/language-docs.md and the `lua` entry in
../../assets/language-documentation-catalog.json. Scope: Exact Lua runtime, host embedding and game API version.

Open relevant primary sources before technical claims. Read ../../assets/component-parser-catalog.json
for parser IDs/capability states and apply ../powershell-scaffold/references/component-pipeline.md
before executing generated code. Documentation coverage does not imply parser support.

Use this skill only for documentation research within the stated language and
version scope. Do not execute examples, install tools, change systems or request
credentials as part of this research. Separate documented behavior from observed
parser support and tests.

## Bundled files

### File: `agents/openai.yaml`

```yaml
interface:
  display_name: "Lua Docs"
  short_description: "Research lua documentation"
  icon_small: "./assets/lua-original.svg"
  icon_large: "./assets/lua-original.svg"
  default_prompt: "Find version-specific primary documentation for lua components."
```

### File: `assets/lua-original.svg`

_Binary asset, not embedded._
