# Skill: bash-docs

- Plugin: `powershell-workbench` (0.9.0-beta.7)
- Source: `plugins/powershell-workbench/skills/bash-docs/SKILL.md`

> Use when researching bash syntax, runtime, parser and component-contract documentation with explicit version scope inside PowerShell Workbench.

## Instructions

### Bash Docs

Read ../powershell-scaffold/references/language-docs.md and the `bash` entry in
../../assets/language-documentation-catalog.json. Scope: Bash version versus POSIX sh and shell expansion rules.
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
  display_name: "Bash Docs"
  short_description: "Research bash documentation"
  icon_small: "./assets/bash-original.svg"
  icon_large: "./assets/bash-original.svg"
  default_prompt: "Find version-specific primary documentation for bash components."
```

### File: `assets/bash-original.svg`

_Binary asset, not embedded._

### File: `references/notes.md`

#### Bash and POSIX sh: version cues, pitfalls and safe checks

These notes are research leads, not verified facts for a given project. Identify the exact version first, open the primary source for anything you rely on, and record what you checked.

##### Identify the version first

- Check the shebang and how the script is run. `#!/bin/sh` is often dash, not bash. macOS ships bash 3.2 by default; Linux distributions ship bash 5.x.
- Note whether it runs in Git Bash, MSYS2, WSL or Cygwin on Windows; paths and line endings differ.

##### Primary sources

Start with the catalog seed for this language, then:

- <https://www.gnu.org/software/bash/manual/> (Bash reference)
- <https://pubs.opengroup.org/onlinepubs/9799919799/utilities/V3_chap02.html> (POSIX shell language)
- <https://www.shellcheck.net/wiki/> (explanations of common shell bugs)

##### Pitfalls that change behavior

- `[[ ]]`, arrays, `function` and `$'…'` are bash, not POSIX sh. Associative arrays, `mapfile` and `${var,,}` need bash 4 or newer.
- Unquoted `$var` is split on whitespace and expanded as a glob; quote expansions unless splitting is intended.
- `set -e` does not stop the script inside conditions, `&&`/`||` chains or most command substitutions.
- CRLF line endings cause errors such as `$'\r': command not found`.
- A pipeline's exit status is the last command's unless `set -o pipefail` is used.

##### Safe checks that do not run the code

- `bash -n script.sh` parses without running. ShellCheck checks statically and does not execute the script.
- Run checks with the same shell (bash versus sh) and version that will run the script.
