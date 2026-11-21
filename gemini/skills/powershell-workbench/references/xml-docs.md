# Skill: xml-docs

- Plugin: `powershell-workbench` (0.9.0-beta.7)
- Source: `plugins/powershell-workbench/skills/xml-docs/SKILL.md`

> Use when researching xml syntax, runtime, parser and component-contract documentation with explicit version scope inside PowerShell Workbench.

## Instructions

### Xml Docs

Read ../powershell-scaffold/references/language-docs.md and the `xml` entry in
../../assets/language-documentation-catalog.json. Scope: XML version, namespaces, schema or application dialect.
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
  display_name: "Xml Docs"
  short_description: "Research xml documentation"
  icon_small: "./assets/xml-original.svg"
  icon_large: "./assets/xml-original.svg"
  default_prompt: "Find version-specific primary documentation for xml components."
```

### File: `assets/xml-original.svg`

_Binary asset, not embedded._

### File: `references/notes.md`

#### XML: version cues, pitfalls and safe checks

These notes are research leads, not verified facts for a given project. Identify the exact version first, open the primary source for anything you rely on, and record what you checked.

##### Identify the version first

- Separate the layers: XML 1.0 or 1.1 syntax, namespaces, a schema (XSD, RELAX NG or DTD), and the application dialect (MSBuild, `.config`, manifests and so on).

##### Primary sources

Start with the catalog seed for this language, then:

- <https://www.w3.org/TR/xml/> (XML 1.0)
- <https://www.w3.org/TR/xml-names/> (namespaces)
- <https://www.w3.org/TR/xmlschema11-1/> (XSD 1.1; many tools still implement XSD 1.0)
- <https://cheatsheetseries.owasp.org/cheatsheets/XML_External_Entity_Prevention_Cheat_Sheet.html>

##### Pitfalls that change behavior

- Well-formed is not the same as valid against a schema, and neither proves the application accepts it.
- A default namespace (`xmlns="…"`) applies to elements, not attributes, and XPath queries need an explicit prefix mapping for it.
- External entities and DTDs can read files or reach the network (XXE). Keep DTD processing off for untrusted input.
- The encoding declaration must match the actual bytes; a BOM and the declaration should agree.
- PowerShell `[xml]` loads into `XmlDocument`; whitespace is not preserved unless `PreserveWhitespace` is set before loading.

##### Safe checks that do not run the code

- Parse with DTD processing disabled and no network access.
- Validate against the schema only with a local copy of the schema, and report syntax, schema and application checks separately.
