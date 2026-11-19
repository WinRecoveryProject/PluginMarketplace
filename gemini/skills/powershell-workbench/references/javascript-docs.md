# Skill: javascript-docs

- Plugin: `powershell-workbench` (0.9.0-beta.6)
- Source: `plugins/powershell-workbench/skills/javascript-docs/SKILL.md`

> Use when researching javascript syntax, runtime, parser and component-contract documentation with explicit version scope inside PowerShell Workbench.

## Instructions

### Javascript Docs

Read ../powershell-scaffold/references/language-docs.md and the `javascript` entry in
../../assets/language-documentation-catalog.json. Scope: ECMAScript versus Node/browser runtime and CommonJS versus ESM.

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
  display_name: "Javascript Docs"
  short_description: "Research javascript documentation"
  icon_small: "./assets/javascript-original.svg"
  icon_large: "./assets/javascript-original.svg"
  default_prompt: "Find version-specific primary documentation for javascript components."
```

### Not embedded

- `assets/javascript-original.svg` (binary asset, not embedded)
