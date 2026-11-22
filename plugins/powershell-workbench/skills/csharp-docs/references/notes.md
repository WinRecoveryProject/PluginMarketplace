# C#: version cues, pitfalls and safe checks

These notes are research leads, not verified facts for a given project. Identify the exact version first, open the primary source for anything you rely on, and record what you checked.

## Identify the version first

- Read `<TargetFramework>` and `<LangVersion>` in the project file. The default language version follows the framework: C# 12 for .NET 8, C# 13 for .NET 9, C# 14 for .NET 10, and C# 7.3 for .NET Framework 4.x.
- Inside PowerShell: Windows PowerShell 5.1 `Add-Type` compiles with the .NET Framework compiler, which accepts only older C# (about C# 5). PowerShell 7 uses Roslyn.

## Primary sources

Start with the catalog seed for this language, then:

- <https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/configure-language-version>
- <https://learn.microsoft.com/en-us/dotnet/csharp/whats-new/> (features per version)
- <https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.utility/add-type>

## Pitfalls that change behavior

- Feature versions: records (9), file-scoped namespaces and global usings (10), `required` members and raw strings (11), primary constructors and collection expressions (12).
- `<Nullable>enable</Nullable>` turns nullable warnings on; `<ImplicitUsings>` adds hidden `using` directives.
- Top-level statements generate a hidden `Main`; only one file per project may use them.

## Safe checks that do not run the code

- Read the project file and code. `dotnet build` runs MSBuild targets, which can execute arbitrary tasks, so treat it as running code.
- For `Add-Type` snippets, check the syntax against the C# version of the PowerShell host that will run them.
