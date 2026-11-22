# Bash and POSIX sh: version cues, pitfalls and safe checks

These notes are research leads, not verified facts for a given project. Identify the exact version first, open the primary source for anything you rely on, and record what you checked.

## Identify the version first

- Check the shebang and how the script is run. `#!/bin/sh` is often dash, not bash. macOS ships bash 3.2 by default; Linux distributions ship bash 5.x.
- Note whether it runs in Git Bash, MSYS2, WSL or Cygwin on Windows; paths and line endings differ.

## Primary sources

Start with the catalog seed for this language, then:

- <https://www.gnu.org/software/bash/manual/> (Bash reference)
- <https://pubs.opengroup.org/onlinepubs/9799919799/utilities/V3_chap02.html> (POSIX shell language)
- <https://www.shellcheck.net/wiki/> (explanations of common shell bugs)

## Pitfalls that change behavior

- `[[ ]]`, arrays, `function` and `$'…'` are bash, not POSIX sh. Associative arrays, `mapfile` and `${var,,}` need bash 4 or newer.
- Unquoted `$var` is split on whitespace and expanded as a glob; quote expansions unless splitting is intended.
- `set -e` does not stop the script inside conditions, `&&`/`||` chains or most command substitutions.
- CRLF line endings cause errors such as `$'\r': command not found`.
- A pipeline's exit status is the last command's unless `set -o pipefail` is used.

## Safe checks that do not run the code

- `bash -n script.sh` parses without running. ShellCheck checks statically and does not execute the script.
- Run checks with the same shell (bash versus sh) and version that will run the script.
