# Skill: python-docs

- Plugin: `powershell-workbench` (0.9.0-beta.6)
- Source: `plugins/powershell-workbench/skills/python-docs/SKILL.md`

> Use when researching python syntax, runtime, parser and component-contract documentation with explicit version scope inside PowerShell Workbench.

## Instructions

### Python Docs

Read ../powershell-scaffold/references/language-docs.md and the `python` entry in
../../assets/language-documentation-catalog.json. Scope: Exact Python minor version, grammar and runtime APIs.

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
  display_name: "Python Docs"
  short_description: "Research python documentation"
  icon_small: "./assets/python-original-wordmark.svg"
  icon_large: "./assets/python-original-wordmark.svg"
  default_prompt: "Find version-specific primary documentation for python components."
```

### File: `assets/python-original-wordmark.svg`

_Binary asset, not embedded._
