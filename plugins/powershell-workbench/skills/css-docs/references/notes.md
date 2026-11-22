# CSS: version cues, pitfalls and safe checks

These notes are research leads, not verified facts for a given project. Identify the exact version first, open the primary source for anything you rely on, and record what you checked.

## Identify the version first

- CSS has no single version. Identify the modules involved (Selectors, Cascade, Grid, and so on) and the browsers the project must support.

## Primary sources

Start with the catalog seed for this language, then:

- <https://www.w3.org/Style/CSS/current-work> (status of each module)
- <https://developer.mozilla.org/en-US/docs/Web/CSS> (properties, values and compatibility tables)
- <https://drafts.csswg.org/> (editor's drafts; may describe features no browser ships)

## Pitfalls that change behavior

- Unsupported properties or values are dropped silently, so a typo does not fail visibly.
- Specificity, source order, `!important`, cascade layers (`@layer`) and origin decide which rule wins; layer order beats specificity.
- Custom properties are resolved at computed-value time; an invalid value makes the property `unset`, not the fallback.
- Vendor prefixes and old syntax may still be needed for some targets; check compatibility data, not memory.

## Safe checks that do not run the code

- Parse or lint locally (for example with stylelint) to find syntax errors.
- Parsing does not show how a browser renders; keep rendering claims separate and name the browser and version.
