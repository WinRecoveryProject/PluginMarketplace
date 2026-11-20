# Skill: cmd-docs

- Plugin: `powershell-workbench` (0.9.0-beta.6)
- Source: `plugins/powershell-workbench/skills/cmd-docs/SKILL.md`

> Use when researching cmd syntax, runtime, parser and component-contract documentation with explicit version scope inside PowerShell Workbench.

## Instructions

### Cmd Docs

Read ../powershell-scaffold/references/language-docs.md and the `cmd` entry in
../../assets/language-documentation-catalog.json. Scope: cmd.exe switches, interactive versus batch parsing, quoting and command extensions.

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
  display_name: "Cmd Docs"
  short_description: "Research cmd documentation"
  icon_small: "./assets/powershell.png"
  icon_large: "./assets/powershell.png"
  brand_color: "#2671BE"
  default_prompt: "Find version-specific primary documentation for cmd components."
```

### File: `assets/powershell.png`

_Binary asset, not embedded._
