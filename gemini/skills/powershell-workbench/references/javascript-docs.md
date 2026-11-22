# Skill: javascript-docs

- Plugin: `powershell-workbench` (0.9.0-beta.7)
- Source: `plugins/powershell-workbench/skills/javascript-docs/SKILL.md`

> Use when researching javascript syntax, runtime, parser and component-contract documentation with explicit version scope inside PowerShell Workbench.

## Instructions

### Javascript Docs

Read ../powershell-scaffold/references/language-docs.md and the `javascript` entry in
../../assets/language-documentation-catalog.json. Scope: ECMAScript versus Node/browser runtime and CommonJS versus ESM.
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
  display_name: "Javascript Docs"
  short_description: "Research javascript documentation"
  icon_small: "./assets/javascript-original.svg"
  icon_large: "./assets/javascript-original.svg"
  default_prompt: "Find version-specific primary documentation for javascript components."
```

### File: `assets/javascript-original.svg`

_Binary asset, not embedded._

### File: `references/notes.md`

#### JavaScript (Node.js and browsers): version cues, pitfalls and safe checks

These notes are research leads, not verified facts for a given project. Identify the exact version first, open the primary source for anything you rely on, and record what you checked.

##### Identify the version first

- Decide the runtime: Node.js (version from `engines` in `package.json` or `.nvmrc`), a browser target (browserslist), or another host.
- Decide the module system: `.mjs` is ESM, `.cjs` is CommonJS, and plain `.js` follows the nearest `package.json` `"type"`.

##### Primary sources

Start with the catalog seed for this language, then:

- <https://nodejs.org/api/esm.html> (ES modules in Node.js)
- <https://nodejs.org/api/packages.html> (module resolution and `type`)
- <https://developer.mozilla.org/en-US/docs/Web/JavaScript> (language and browser compatibility tables)
- <https://tc39.es/ecma262/> (the language specification)

##### Pitfalls that change behavior

- ESM has no `require`, `module.exports`, `__dirname` or `__filename`; use `import`, `import.meta.url` and, on recent Node versions, `import.meta.dirname`.
- Top-level `await` works only in ESM. ESM code is always strict, and top-level `this` is `undefined`.
- Importing JSON in ESM needs an import attribute (`with { type: 'json' }`) on current Node versions.
- CommonJS can load ESM only with `import()` (or `require(esm)` on newer Node versions with its own limits).

##### Safe checks that do not run the code

- `node --check file.js` parses a file without running it, using the module type Node would choose.
- Read `package.json` `type`, `exports` and `engines` before judging an import.
