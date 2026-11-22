# Skill: cmd-docs

- Plugin: `powershell-workbench` (0.9.0-beta.7)
- Source: `plugins/powershell-workbench/skills/cmd-docs/SKILL.md`

> Use when researching cmd syntax, runtime, parser and component-contract documentation with explicit version scope inside PowerShell Workbench.

## Instructions

### Cmd Docs

Read ../powershell-scaffold/references/language-docs.md and the `cmd` entry in
../../assets/language-documentation-catalog.json. Scope: cmd.exe switches, interactive versus batch parsing, quoting and command extensions.
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
  display_name: "Cmd Docs"
  short_description: "Research cmd documentation"
  icon_small: "./assets/powershell.png"
  icon_large: "./assets/powershell.png"
  brand_color: "#2671BE"
  default_prompt: "Find version-specific primary documentation for cmd components."
```

### File: `assets/powershell.png`

_Binary asset, not embedded._

### File: `references/notes.md`

#### cmd.exe (interactive and command lines): version cues, pitfalls and safe checks

These notes are research leads, not verified facts for a given project. Identify the exact version first, open the primary source for anything you rely on, and record what you checked.

##### Identify the version first

- Note the Windows version and how cmd.exe is started: interactive, `cmd /c`, `cmd /k`, or from another program that builds the command line.
- Check for an `AutoRun` value under `HKCU` or `HKLM\Software\Microsoft\Command Processor`; `cmd /d` skips it.

##### Primary sources

Start with the catalog seed for this language, then:

- <https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/cmd> (switches, quote handling for `/c` and `/k`)
- <https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/windows-commands> (command index)
- <https://learn.microsoft.com/en-us/troubleshoot/windows-client/shell-experience/command-line-string-limitation> (8191-character limit)

##### Pitfalls that change behavior

- Interactive and batch parsing differ: an undefined `%name%` stays literal at the prompt but becomes empty in a batch file, and `for` uses `%i` interactively but `%%i` in files.
- `cmd /c "..."` may strip the first and last quote of the command line; read the documented `/s` rules before nesting quotes.
- `/v:on` enables delayed expansion for that instance, `/e:off` disables extensions, `/u` makes redirected output UTF-16.
- The full command line is limited to 8191 characters, including expanded variables.
- Programs are found through `PATH` and `PATHEXT`, so the same command name can resolve differently on another machine.

##### Safe checks that do not run the code

- Reconstruct the exact command line a caller builds and read it; do not execute it to see what happens.
- Compare the quoting against the `cmd /?` rules for `/c` and `/s`.
