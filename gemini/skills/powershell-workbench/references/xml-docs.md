# Skill: xml-docs

- Plugin: `powershell-workbench` (0.9.0-beta.6)
- Source: `plugins/powershell-workbench/skills/xml-docs/SKILL.md`

> Use when researching xml syntax, runtime, parser and component-contract documentation with explicit version scope inside PowerShell Workbench.

## Instructions

### Xml Docs

Read ../powershell-scaffold/references/language-docs.md and the `xml` entry in
../../assets/language-documentation-catalog.json. Scope: XML version, namespaces, schema or application dialect.

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
  display_name: "Xml Docs"
  short_description: "Research xml documentation"
  icon_small: "./assets/xml-original.svg"
  icon_large: "./assets/xml-original.svg"
  default_prompt: "Find version-specific primary documentation for xml components."
```

### Not embedded

- `assets/xml-original.svg` (binary asset, not embedded)
