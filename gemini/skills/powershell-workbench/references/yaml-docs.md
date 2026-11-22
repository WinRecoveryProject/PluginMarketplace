# Skill: yaml-docs

- Plugin: `powershell-workbench` (0.9.0-beta.7)
- Source: `plugins/powershell-workbench/skills/yaml-docs/SKILL.md`

> Use when researching yaml syntax, runtime, parser and component-contract documentation with explicit version scope inside PowerShell Workbench.

## Instructions

### Yaml Docs

Read ../powershell-scaffold/references/language-docs.md and the `yaml` entry in
../../assets/language-documentation-catalog.json. Scope: YAML version, loader behavior, custom tags and schema.
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
  display_name: "Yaml Docs"
  short_description: "Research yaml documentation"
  icon_small: "./assets/yaml-original.svg"
  icon_large: "./assets/yaml-original.svg"
  default_prompt: "Find version-specific primary documentation for yaml components."
```

### File: `assets/yaml-original.svg`

_Binary asset, not embedded._

### File: `references/notes.md`

#### YAML: version cues, pitfalls and safe checks

These notes are research leads, not verified facts for a given project. Identify the exact version first, open the primary source for anything you rely on, and record what you checked.

##### Identify the version first

- Find out which loader reads the file and which YAML version it implements. PyYAML follows YAML 1.1; ruamel.yaml and many newer libraries follow 1.2. GitHub Actions, Kubernetes and others have their own schemas.

##### Primary sources

Start with the catalog seed for this language, then:

- <https://yaml.org/spec/1.2.2/> (YAML 1.2)
- <https://yaml.org/type/bool.html> (YAML 1.1 boolean values)
- <https://pyyaml.org/wiki/PyYAMLDocumentation> (`safe_load` versus `load`)

##### Pitfalls that change behavior

- In YAML 1.1, `yes`, `no`, `on`, `off`, `y` and `n` are booleans: country code `NO` becomes `false` and an `on:` key can become `true`. Quote such values.
- Numbers differ too: `010` is octal in 1.1 and decimal in 1.2; `1_000` and `0o10` parse differently between versions.
- Tabs are not allowed for indentation.
- Anchors and aliases can expand exponentially ("billion laughs"); set limits on untrusted input.
- Custom tags such as `!!python/object` can construct objects or run code with unsafe loaders. Use safe loaders only.

##### Safe checks that do not run the code

- Parse with a safe loader (`yaml.safe_load` or equivalent) and do not act on the content.
- Check the application's schema separately; a file can be valid YAML and still be rejected by the tool that reads it.
