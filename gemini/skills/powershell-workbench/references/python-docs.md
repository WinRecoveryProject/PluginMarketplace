# Skill: python-docs

- Plugin: `powershell-workbench` (0.9.0-beta.7)
- Source: `plugins/powershell-workbench/skills/python-docs/SKILL.md`

> Use when researching python syntax, runtime, parser and component-contract documentation with explicit version scope inside PowerShell Workbench.

## Instructions

### Python Docs

Read ../powershell-scaffold/references/language-docs.md and the `python` entry in
../../assets/language-documentation-catalog.json. Scope: Exact Python minor version, grammar and runtime APIs.
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
  display_name: "Python Docs"
  short_description: "Research python documentation"
  icon_small: "./assets/python-original-wordmark.svg"
  icon_large: "./assets/python-original-wordmark.svg"
  default_prompt: "Find version-specific primary documentation for python components."
```

### File: `assets/python-original-wordmark.svg`

_Binary asset, not embedded._

### File: `references/notes.md`

#### Python: version cues, pitfalls and safe checks

These notes are research leads, not verified facts for a given project. Identify the exact version first, open the primary source for anything you rely on, and record what you checked.

##### Identify the version first

- Read `requires-python` in `pyproject.toml`, `python_requires` in `setup.cfg`/`setup.py`, `.python-version`, and the CI matrix. On Windows the `py -3.X` launcher may pick a different interpreter than `python`.

##### Primary sources

Start with the catalog seed for this language, then:

- <https://docs.python.org/3/whatsnew/index.html> (changes per version)
- <https://docs.python.org/3/reference/grammar.html> (full grammar for the documented version)
- <https://peps.python.org/> (accepted language changes)
- <https://docs.python.org/3/library/ast.html> (parsing without running code)

##### Pitfalls that change behavior

- Syntax by version: `:=` (3.8), `match` (3.10), `except*` (3.11), new f-string grammar (3.12, PEP 701), `type` statements (3.12).
- Removed modules break imports: `distutils` and `asynchat`/`asyncore`/`imp` are gone in 3.12; `cgi`, `crypt` and other legacy modules in 3.13.
- Text files use the locale encoding unless UTF-8 mode is on (PEP 540, PEP 686); pass `encoding='utf-8'` explicitly.
- `ast.parse(..., feature_version=(3, X))` is best effort and does not reproduce every older grammar exactly.

##### Safe checks that do not run the code

- `ast.parse` parses without executing. `py_compile` and `compileall` write `.pyc` files, so avoid them for read-only checks.
- Run any check with the interpreter version the project targets, not just the one that happens to be installed.
