# Skill: json-docs

- Plugin: `powershell-workbench` (0.9.0-beta.7)
- Source: `plugins/powershell-workbench/skills/json-docs/SKILL.md`

> Use when researching json syntax, runtime, parser and component-contract documentation with explicit version scope inside PowerShell Workbench.

## Instructions

### Json Docs

Read ../powershell-scaffold/references/language-docs.md and the `json` entry in
../../assets/language-documentation-catalog.json. Scope: Strict JSON syntax versus JSON Schema and application contract.
Then read references/notes.md: version cues, primary sources, pitfalls and safe checks for this language.

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

### File: `assets/json-original.svg`

_Binary asset, not embedded._

### File: `references/notes.md`

#### JSON: version cues, pitfalls and safe checks

These notes are research leads, not verified facts for a given project. Identify the exact version first, open the primary source for anything you rely on, and record what you checked.

##### Identify the version first

- Decide which dialect the consumer accepts: strict JSON (RFC 8259), JSON with comments (`tsconfig.json`, VS Code settings), JSON5, or a format that only looks like JSON.
- Then decide whether a schema applies (JSON Schema draft and the application's own rules).

##### Primary sources

Start with the catalog seed for this language, then:

- <https://www.rfc-editor.org/rfc/rfc8259> (strict JSON)
- <https://json-schema.org/specification> (JSON Schema drafts)
- <https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.utility/convertfrom-json>
- <https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.utility/convertto-json>

##### Pitfalls that change behavior

- Strict JSON has no comments, no trailing commas and only double-quoted strings.
- Duplicate keys are not forbidden but their handling differs per parser; do not rely on either value.
- Numbers beyond 2^53 lose precision in JavaScript and other double-based parsers.
- `ConvertTo-Json` defaults to `-Depth 2` and silently truncates deeper objects; PowerShell 7 warns, Windows PowerShell 5.1 does not.
- PowerShell 7 `ConvertFrom-Json` turns ISO date strings into `DateTime` objects and offers `-AsHashtable`; 5.1 does neither.
- Writing JSON with a UTF-8 BOM breaks some consumers; RFC 8259 says not to add one.

##### Safe checks that do not run the code

- Parse without acting on the content, for example `ConvertFrom-Json` or `python -m json.tool`.
- Validate against the schema separately from syntax, and say which check you ran.
