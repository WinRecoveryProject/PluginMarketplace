# Skill: csharp-docs

- Plugin: `powershell-workbench` (0.9.0-beta.6)
- Source: `plugins/powershell-workbench/skills/csharp-docs/SKILL.md`

> Use when researching csharp syntax, runtime, parser and component-contract documentation with explicit version scope inside PowerShell Workbench.

## Instructions

### Csharp Docs

Read ../powershell-scaffold/references/language-docs.md and the `csharp` entry in
../../assets/language-documentation-catalog.json. Scope: C# language version, SDK, framework and project type.

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
  display_name: "Csharp Docs"
  short_description: "Research csharp documentation"
  icon_small: "./assets/csharp-original.svg"
  icon_large: "./assets/csharp-original.svg"
  default_prompt: "Find version-specific primary documentation for csharp components."
```

### File: `assets/csharp-original.svg`

_Binary asset, not embedded._
