# Python: version cues, pitfalls and safe checks

These notes are research leads, not verified facts for a given project. Identify the exact version first, open the primary source for anything you rely on, and record what you checked.

## Identify the version first

- Read `requires-python` in `pyproject.toml`, `python_requires` in `setup.cfg`/`setup.py`, `.python-version`, and the CI matrix. On Windows the `py -3.X` launcher may pick a different interpreter than `python`.

## Primary sources

Start with the catalog seed for this language, then:

- <https://docs.python.org/3/whatsnew/index.html> (changes per version)
- <https://docs.python.org/3/reference/grammar.html> (full grammar for the documented version)
- <https://peps.python.org/> (accepted language changes)
- <https://docs.python.org/3/library/ast.html> (parsing without running code)

## Pitfalls that change behavior

- Syntax by version: `:=` (3.8), `match` (3.10), `except*` (3.11), new f-string grammar (3.12, PEP 701), `type` statements (3.12).
- Removed modules break imports: `distutils` and `asynchat`/`asyncore`/`imp` are gone in 3.12; `cgi`, `crypt` and other legacy modules in 3.13.
- Text files use the locale encoding unless UTF-8 mode is on (PEP 540, PEP 686); pass `encoding='utf-8'` explicitly.
- `ast.parse(..., feature_version=(3, X))` is best effort and does not reproduce every older grammar exactly.

## Safe checks that do not run the code

- `ast.parse` parses without executing. `py_compile` and `compileall` write `.pyc` files, so avoid them for read-only checks.
- Run any check with the interpreter version the project targets, not just the one that happens to be installed.
