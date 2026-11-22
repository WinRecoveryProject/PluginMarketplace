# HTML: version cues, pitfalls and safe checks

These notes are research leads, not verified facts for a given project. Identify the exact version first, open the primary source for anything you rely on, and record what you checked.

## Identify the version first

- Decide what is being asked: parsing (what DOM a browser builds), conformance (what the standard allows), or rendering and script behavior in specific browsers.

## Primary sources

Start with the catalog seed for this language, then:

- <https://html.spec.whatwg.org/multipage/parsing.html> (how browsers parse, including error recovery)
- <https://developer.mozilla.org/en-US/docs/Web/HTML> (elements, attributes and browser compatibility)
- <https://validator.w3.org/nu/> (Nu Html Checker; an online service, so ask before sending content)

## Pitfalls that change behavior

- Browsers never reject HTML: invalid markup is repaired, so "it renders" proves little about correctness.
- Missing or unusual `<!DOCTYPE html>` switches to quirks mode and changes layout.
- Content placed directly inside `<table>` can be moved out of the table (foster parenting); `<p>` closes automatically before block elements.
- `<script>` and `<style>` contents are raw text; `</script>` inside a string ends the element.
- `<template>` contents are not part of the document until cloned.

## Safe checks that do not run the code

- Parse locally with a standards-based parser (for example html5lib or parse5) to see the resulting tree.
- Do not open the page in a browser or run its scripts as part of documentation research.
