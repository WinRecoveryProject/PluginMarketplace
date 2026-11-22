# Batch and CMD guidance

Use this reference for `.bat` and `.cmd` launchers and scripts. First find out how each file is started (double-click, another script, a scheduled task, an installer) and which Windows versions must run it.

## Implementation focus

- Keep `.bat`/`.cmd` files with CRLF line endings; LF-only files can break labels, `goto` and `call :label`. A `.gitattributes` rule (`*.cmd text eol=crlf`) keeps checkouts correct.
- Use `setlocal` so variables do not leak into the caller, and delayed expansion (`!var!`) for values changed inside parenthesized blocks.
- Quote paths: `"%~dp0"` for the script folder (it ends with a backslash) and `set "name=value"` to avoid trailing spaces.
- Escape `&`, `|`, `<`, `>`, `^` and parentheses outside quotes, including inside `echo` lines within blocks; quote path-bearing messages.
- Return explicit exit codes with `exit /b <code>` and check `if errorlevel 1` right after the command that matters.
- Keep launchers thin: resolve the project root, call the real PowerShell or other tool with explicit arguments, and pass its exit code back.
- Never delete with `rmdir /s /q` or `del /s` on a path built from arguments without first validating it.

## Validation

There is no built-in parser check, and running the file is not a test. Review by reading: balanced parentheses, `%var%` inside blocks, every exit path, and quoting of every path. Exercise launchers through the project's own test harness in a simulation folder when one exists.

## QA watch list

- paths containing spaces, parentheses, `&` or `!`
- behavior with delayed expansion on versus off
- code page (`chcp 65001`) and non-ASCII output
- `pause` in non-interactive contexts such as CI or scheduled tasks
- the command-line length limit of 8191 characters
