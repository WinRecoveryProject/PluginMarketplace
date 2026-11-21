# cmd.exe (interactive and command lines): version cues, pitfalls and safe checks

These notes are research leads, not verified facts for a given project. Identify the exact version first, open the primary source for anything you rely on, and record what you checked.

## Identify the version first

- Note the Windows version and how cmd.exe is started: interactive, `cmd /c`, `cmd /k`, or from another program that builds the command line.
- Check for an `AutoRun` value under `HKCU` or `HKLM\Software\Microsoft\Command Processor`; `cmd /d` skips it.

## Primary sources

Start with the catalog seed for this language, then:

- <https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/cmd> (switches, quote handling for `/c` and `/k`)
- <https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/windows-commands> (command index)
- <https://learn.microsoft.com/en-us/troubleshoot/windows-client/shell-experience/command-line-string-limitation> (8191-character limit)

## Pitfalls that change behavior

- Interactive and batch parsing differ: an undefined `%name%` stays literal at the prompt but becomes empty in a batch file, and `for` uses `%i` interactively but `%%i` in files.
- `cmd /c "..."` may strip the first and last quote of the command line; read the documented `/s` rules before nesting quotes.
- `/v:on` enables delayed expansion for that instance, `/e:off` disables extensions, `/u` makes redirected output UTF-16.
- The full command line is limited to 8191 characters, including expanded variables.
- Programs are found through `PATH` and `PATHEXT`, so the same command name can resolve differently on another machine.

## Safe checks that do not run the code

- Reconstruct the exact command line a caller builds and read it; do not execute it to see what happens.
- Compare the quoting against the `cmd /?` rules for `/c` and `/s`.
