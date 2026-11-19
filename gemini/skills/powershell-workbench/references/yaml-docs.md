# Skill: yaml-docs

- Plugin: `powershell-workbench` (0.9.0-beta.6)
- Source: `plugins/powershell-workbench/skills/yaml-docs/SKILL.md`

> Use when researching yaml syntax, runtime, parser and component-contract documentation with explicit version scope inside PowerShell Workbench.

## Instructions

### Yaml Docs

Read ../powershell-scaffold/references/language-docs.md and the `yaml` entry in
../../assets/language-documentation-catalog.json. Scope: YAML version, loader behavior, custom tags and schema.

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
  display_name: "Yaml Docs"
  short_description: "Research yaml documentation"
  icon_small: "./assets/yaml-original.svg"
  icon_large: "./assets/yaml-original.svg"
  default_prompt: "Find version-specific primary documentation for yaml components."
```

### Not embedded

- `assets/yaml-original.svg` (binary asset, not embedded)
