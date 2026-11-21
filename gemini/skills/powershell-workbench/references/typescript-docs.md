# Skill: typescript-docs

- Plugin: `powershell-workbench` (0.9.0-beta.7)
- Source: `plugins/powershell-workbench/skills/typescript-docs/SKILL.md`

> Use when researching typescript syntax, runtime, parser and component-contract documentation with explicit version scope inside PowerShell Workbench.

## Instructions

### Typescript Docs

Read ../powershell-scaffold/references/language-docs.md and the `typescript` entry in
../../assets/language-documentation-catalog.json. Scope: Compiler version, tsconfig, declaration and emit behavior.
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
  display_name: "Typescript Docs"
  short_description: "Research typescript documentation"
  icon_small: "./assets/typescript-original.svg"
  icon_large: "./assets/typescript-original.svg"
  default_prompt: "Find version-specific primary documentation for typescript components."
```

### File: `assets/typescript-original.svg`

_Binary asset, not embedded._

### File: `references/notes.md`

#### TypeScript: version cues, pitfalls and safe checks

These notes are research leads, not verified facts for a given project. Identify the exact version first, open the primary source for anything you rely on, and record what you checked.

##### Identify the version first

- Read the compiler version (`typescript` in `package.json`) and `tsconfig.json`, including `extends`: `target`, `module`, `moduleResolution`, `strict`, `lib`.
- Find out whether `tsc` emits the JavaScript or another tool does (esbuild, swc, Babel, a bundler); they ignore type errors and some options.

##### Primary sources

Start with the catalog seed for this language, then:

- <https://www.typescriptlang.org/tsconfig> (every compiler option)
- <https://www.typescriptlang.org/docs/handbook/release-notes/overview.html> (changes per version)
- <https://www.typescriptlang.org/docs/handbook/modules/reference.html> (module resolution modes)

##### Pitfalls that change behavior

- Types are erased: nothing is validated at runtime unless code does it.
- `paths` aliases are not rewritten in emitted JavaScript; the runtime or bundler must resolve them.
- `moduleResolution` `node16`/`nodenext` requires file extensions in relative ESM imports; `bundler` does not.
- `isolatedModules` and `verbatimModuleSyntax` change which imports are kept; `enum` and `namespace` produce runtime code.
- `skipLibCheck` hides errors in `.d.ts` files, including the project's own declarations.

##### Safe checks that do not run the code

- `tsc --noEmit -p <tsconfig>` type-checks without writing files and without running project code.
- Use the project's own TypeScript version; results differ between compiler versions.
