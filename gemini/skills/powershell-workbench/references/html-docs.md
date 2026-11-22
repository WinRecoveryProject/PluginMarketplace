# Skill: html-docs

- Plugin: `powershell-workbench` (0.9.0-beta.7)
- Source: `plugins/powershell-workbench/skills/html-docs/SKILL.md`

> Use when researching html syntax, runtime, parser and component-contract documentation with explicit version scope inside PowerShell Workbench.

## Instructions

### Html Docs

Read ../powershell-scaffold/references/language-docs.md and the `html` entry in
../../assets/language-documentation-catalog.json. Scope: HTML parsing versus browser DOM, scripts and application behavior.
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
  display_name: "Html Docs"
  short_description: "Research html documentation"
  icon_small: "./assets/html5-original-wordmark.svg"
  icon_large: "./assets/html5-original-wordmark.svg"
  default_prompt: "Find version-specific primary documentation for html components."
```

### File: `assets/html5-original-wordmark.svg`

_Binary asset, not embedded._

### File: `references/notes.md`

#### HTML: version cues, pitfalls and safe checks

These notes are research leads, not verified facts for a given project. Identify the exact version first, open the primary source for anything you rely on, and record what you checked.

##### Identify the version first

- Decide what is being asked: parsing (what DOM a browser builds), conformance (what the standard allows), or rendering and script behavior in specific browsers.

##### Primary sources

Start with the catalog seed for this language, then:

- <https://html.spec.whatwg.org/multipage/parsing.html> (how browsers parse, including error recovery)
- <https://developer.mozilla.org/en-US/docs/Web/HTML> (elements, attributes and browser compatibility)
- <https://validator.w3.org/nu/> (Nu Html Checker; an online service, so ask before sending content)

##### Pitfalls that change behavior

- Browsers never reject HTML: invalid markup is repaired, so "it renders" proves little about correctness.
- Missing or unusual `<!DOCTYPE html>` switches to quirks mode and changes layout.
- Content placed directly inside `<table>` can be moved out of the table (foster parenting); `<p>` closes automatically before block elements.
- `<script>` and `<style>` contents are raw text; `</script>` inside a string ends the element.
- `<template>` contents are not part of the document until cloned.

##### Safe checks that do not run the code

- Parse locally with a standards-based parser (for example html5lib or parse5) to see the resulting tree.
- Do not open the page in a browser or run its scripts as part of documentation research.
