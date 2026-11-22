# JavaScript (Node.js and browsers): version cues, pitfalls and safe checks

These notes are research leads, not verified facts for a given project. Identify the exact version first, open the primary source for anything you rely on, and record what you checked.

## Identify the version first

- Decide the runtime: Node.js (version from `engines` in `package.json` or `.nvmrc`), a browser target (browserslist), or another host.
- Decide the module system: `.mjs` is ESM, `.cjs` is CommonJS, and plain `.js` follows the nearest `package.json` `"type"`.

## Primary sources

Start with the catalog seed for this language, then:

- <https://nodejs.org/api/esm.html> (ES modules in Node.js)
- <https://nodejs.org/api/packages.html> (module resolution and `type`)
- <https://developer.mozilla.org/en-US/docs/Web/JavaScript> (language and browser compatibility tables)
- <https://tc39.es/ecma262/> (the language specification)

## Pitfalls that change behavior

- ESM has no `require`, `module.exports`, `__dirname` or `__filename`; use `import`, `import.meta.url` and, on recent Node versions, `import.meta.dirname`.
- Top-level `await` works only in ESM. ESM code is always strict, and top-level `this` is `undefined`.
- Importing JSON in ESM needs an import attribute (`with { type: 'json' }`) on current Node versions.
- CommonJS can load ESM only with `import()` (or `require(esm)` on newer Node versions with its own limits).

## Safe checks that do not run the code

- `node --check file.js` parses a file without running it, using the module type Node would choose.
- Read `package.json` `type`, `exports` and `engines` before judging an import.
