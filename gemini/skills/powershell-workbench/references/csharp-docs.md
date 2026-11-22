# Skill: csharp-docs

- Plugin: `powershell-workbench` (0.9.0-beta.7)
- Source: `plugins/powershell-workbench/skills/csharp-docs/SKILL.md`

> Use when researching csharp syntax, runtime, parser and component-contract documentation with explicit version scope inside PowerShell Workbench.

## Instructions

### Csharp Docs

Read ../powershell-scaffold/references/language-docs.md and the `csharp` entry in
../../assets/language-documentation-catalog.json. Scope: C# language version, SDK, framework and project type.
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
  display_name: "Csharp Docs"
  short_description: "Research csharp documentation"
  icon_small: "./assets/csharp-original.svg"
  icon_large: "./assets/csharp-original.svg"
  default_prompt: "Find version-specific primary documentation for csharp components."
```

### File: `assets/csharp-original.svg`

_Binary asset, not embedded._

### File: `references/notes.md`

#### C#: version cues, pitfalls and safe checks

These notes are research leads, not verified facts for a given project. Identify the exact version first, open the primary source for anything you rely on, and record what you checked.

##### Identify the version first

- Read `<TargetFramework>` and `<LangVersion>` in the project file. The default language version follows the framework: C# 12 for .NET 8, C# 13 for .NET 9, C# 14 for .NET 10, and C# 7.3 for .NET Framework 4.x.
- Inside PowerShell: Windows PowerShell 5.1 `Add-Type` compiles with the .NET Framework compiler, which accepts only older C# (about C# 5). PowerShell 7 uses Roslyn.

##### Primary sources

Start with the catalog seed for this language, then:

- <https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/configure-language-version>
- <https://learn.microsoft.com/en-us/dotnet/csharp/whats-new/> (features per version)
- <https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.utility/add-type>

##### Pitfalls that change behavior

- Feature versions: records (9), file-scoped namespaces and global usings (10), `required` members and raw strings (11), primary constructors and collection expressions (12).
- `<Nullable>enable</Nullable>` turns nullable warnings on; `<ImplicitUsings>` adds hidden `using` directives.
- Top-level statements generate a hidden `Main`; only one file per project may use them.

##### Safe checks that do not run the code

- Read the project file and code. `dotnet build` runs MSBuild targets, which can execute arbitrary tasks, so treat it as running code.
- For `Add-Type` snippets, check the syntax against the C# version of the PowerShell host that will run them.
