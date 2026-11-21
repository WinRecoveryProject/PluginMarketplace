# Skill: css-docs

- Plugin: `powershell-workbench` (0.9.0-beta.6)
- Source: `plugins/powershell-workbench/skills/css-docs/SKILL.md`

> Use when researching css syntax, runtime, parser and component-contract documentation with explicit version scope inside PowerShell Workbench.

## Instructions

### Css Docs

Read ../powershell-scaffold/references/language-docs.md and the `css` entry in
../../assets/language-documentation-catalog.json. Scope: Module level, browser support and cascade context.

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
  display_name: "Css Docs"
  short_description: "Research css documentation"
  icon_small: "./assets/css3-original-wordmark.svg"
  icon_large: "./assets/css3-original-wordmark.svg"
  default_prompt: "Find version-specific primary documentation for css components."
```

### File: `assets/css3-original-wordmark.svg`

_Binary asset, not embedded._
