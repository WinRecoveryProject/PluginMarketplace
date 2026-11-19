# Skill: sql-docs

- Plugin: `powershell-workbench` (0.9.0-beta.6)
- Source: `plugins/powershell-workbench/skills/sql-docs/SKILL.md`

> Use when researching sql syntax, runtime, parser and component-contract documentation with explicit version scope inside PowerShell Workbench.

## Instructions

### Sql Docs

Read ../powershell-scaffold/references/language-docs.md and the `sql` entry in
../../assets/language-documentation-catalog.json. Scope: Identify database vendor/version first; this seed covers T-SQL only.

Open relevant primary sources before technical claims. Read ../../assets/component-parser-catalog.json
for parser IDs/capability states and apply ../powershell-scaffold/references/component-pipeline.md
before executing generated code. Documentation coverage does not imply parser support.

## Bundled files

### File: `agents/openai.yaml`

```yaml
interface:
  display_name: "Sql Docs"
  short_description: "Research sql documentation"
  icon_small: "./assets/sqldeveloper-original.svg"
  icon_large: "./assets/sqldeveloper-original.svg"
  default_prompt: "Find version-specific primary documentation for sql components."
```

### Not embedded

- `assets/sqldeveloper-original.svg` (binary asset, not embedded)
