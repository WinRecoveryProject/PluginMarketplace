# Skill: bash-docs

- Plugin: `powershell-workbench` (0.9.0-beta.6)
- Source: `plugins/powershell-workbench/skills/bash-docs/SKILL.md`

> Use when researching bash syntax, runtime, parser and component-contract documentation with explicit version scope inside PowerShell Workbench.

## Instructions

### Bash Docs

Read ../powershell-scaffold/references/language-docs.md and the `bash` entry in
../../assets/language-documentation-catalog.json. Scope: Bash version versus POSIX sh and shell expansion rules.

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
  display_name: "Bash Docs"
  short_description: "Research bash documentation"
  icon_small: "./assets/bash-original.svg"
  icon_large: "./assets/bash-original.svg"
  default_prompt: "Find version-specific primary documentation for bash components."
```

### Not embedded

- `assets/bash-original.svg` (binary asset, not embedded)
