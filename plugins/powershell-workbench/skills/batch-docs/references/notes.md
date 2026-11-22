# Batch files (.bat/.cmd): version cues, pitfalls and safe checks

These notes are research leads, not verified facts for a given project. Identify the exact version first, open the primary source for anything you rely on, and record what you checked.

## Identify the version first

- Read the target Windows version and how the file is launched (double-click, scheduled task, another script). `setlocal EnableExtensions EnableDelayedExpansion` lines change parsing for the whole file.
- Command Extensions are on by default; a script started with `cmd /e:off` or a policy that disables them behaves differently.

## Primary sources

Start with the catalog seed for this language, then:

- <https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/set> (`set`, `set /a`, `set /p`)
- <https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/setlocal> (extensions and delayed expansion)
- <https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/if>
- <https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/call>
- <https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/goto>
- <https://ss64.com/nt/> (community reference; corroborate with Microsoft docs)

## Pitfalls that change behavior

- `%var%` is expanded when a whole parenthesized block is read, so a variable set inside `( … )` keeps its old value there. Use `!var!` with delayed expansion.
- With delayed expansion on, literal `!` characters in data are removed or misread; toggle it only around the code that needs it.
- `for` variables are `%%i` in a file and `%i` at an interactive prompt.
- `if errorlevel 1` means "1 or higher". `%ERRORLEVEL%` inside a block is stale for the same reason as other `%var%` values; `if not errorlevel 1` is safe there.
- Use `call :label` for subroutines and `exit /b <code>`; `goto :eof` ends the current call level.
- LF-only line endings can break labels, `goto` and `call :label`. Keep `.bat`/`.cmd` files CRLF (for example with a `.gitattributes` rule).
- `&`, `|`, `<`, `>`, `^` and parentheses must be escaped with `^` outside quotes. `set "name=value"` avoids trailing spaces and stray quotes in the value.
- `%~dp0` ends with a backslash, and `chcp 65001` changes how non-ASCII output and input are read.

## Safe checks that do not run the code

- Do not run the file and do not use `cmd /c` to syntax-test it.
- Check line endings, balanced parentheses and `%var%` uses inside parenthesized blocks by reading the file.
- List every `exit`, `exit /b` and `goto` target so the error-code path is clear.
