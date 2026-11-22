# Skill: css-docs

- Plugin: `powershell-workbench` (0.9.0-beta.7)
- Source: `plugins/powershell-workbench/skills/css-docs/SKILL.md`

> Use when researching css syntax, runtime, parser and component-contract documentation with explicit version scope inside PowerShell Workbench.

## Instructions

### Css Docs

Read ../powershell-scaffold/references/language-docs.md and the `css` entry in
../../assets/language-documentation-catalog.json. Scope: Module level, browser support and cascade context.
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
  display_name: "Css Docs"
  short_description: "Research css documentation"
  icon_small: "./assets/css3-original-wordmark.svg"
  icon_large: "./assets/css3-original-wordmark.svg"
  default_prompt: "Find version-specific primary documentation for css components."
```

### File: `assets/css3-original-wordmark.svg`

_Binary asset, not embedded._

### File: `references/notes.md`

#### CSS: version cues, pitfalls and safe checks

These notes are research leads, not verified facts for a given project. Identify the exact version first, open the primary source for anything you rely on, and record what you checked.

##### Identify the version first

- CSS has no single version. Identify the modules involved (Selectors, Cascade, Grid, and so on) and the browsers the project must support.

##### Primary sources

Start with the catalog seed for this language, then:

- <https://www.w3.org/Style/CSS/current-work> (status of each module)
- <https://developer.mozilla.org/en-US/docs/Web/CSS> (properties, values and compatibility tables)
- <https://drafts.csswg.org/> (editor's drafts; may describe features no browser ships)

##### Pitfalls that change behavior

- Unsupported properties or values are dropped silently, so a typo does not fail visibly.
- Specificity, source order, `!important`, cascade layers (`@layer`) and origin decide which rule wins; layer order beats specificity.
- Custom properties are resolved at computed-value time; an invalid value makes the property `unset`, not the fallback.
- Vendor prefixes and old syntax may still be needed for some targets; check compatibility data, not memory.

##### Safe checks that do not run the code

- Parse or lint locally (for example with stylelint) to find syntax errors.
- Parsing does not show how a browser renders; keep rendering claims separate and name the browser and version.
