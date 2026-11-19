# Skill: json-docs

- Plugin: `powershell-workbench` (0.9.0-beta.6)
- Source: `plugins/powershell-workbench/skills/json-docs/SKILL.md`

> Use when researching json syntax, runtime, parser and component-contract documentation with explicit version scope inside PowerShell Workbench.

## Instructions

### Json Docs

Read ../powershell-scaffold/references/language-docs.md and the `json` entry in
../../assets/language-documentation-catalog.json. Scope: Strict JSON syntax versus JSON Schema and application contract.

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
  display_name: "Json Docs"
  short_description: "Research json documentation"
  icon_small: "./assets/json-original.svg"
  icon_large: "./assets/json-original.svg"
  default_prompt: "Find version-specific primary documentation for json components."
```

### Not embedded

- `assets/json-original.svg` (binary asset, not embedded)
