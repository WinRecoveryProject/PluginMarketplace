# JSON: version cues, pitfalls and safe checks

These notes are research leads, not verified facts for a given project. Identify the exact version first, open the primary source for anything you rely on, and record what you checked.

## Identify the version first

- Decide which dialect the consumer accepts: strict JSON (RFC 8259), JSON with comments (`tsconfig.json`, VS Code settings), JSON5, or a format that only looks like JSON.
- Then decide whether a schema applies (JSON Schema draft and the application's own rules).

## Primary sources

Start with the catalog seed for this language, then:

- <https://www.rfc-editor.org/rfc/rfc8259> (strict JSON)
- <https://json-schema.org/specification> (JSON Schema drafts)
- <https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.utility/convertfrom-json>
- <https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.utility/convertto-json>

## Pitfalls that change behavior

- Strict JSON has no comments, no trailing commas and only double-quoted strings.
- Duplicate keys are not forbidden but their handling differs per parser; do not rely on either value.
- Numbers beyond 2^53 lose precision in JavaScript and other double-based parsers.
- `ConvertTo-Json` defaults to `-Depth 2` and silently truncates deeper objects; PowerShell 7 warns, Windows PowerShell 5.1 does not.
- PowerShell 7 `ConvertFrom-Json` turns ISO date strings into `DateTime` objects and offers `-AsHashtable`; 5.1 does neither.
- Writing JSON with a UTF-8 BOM breaks some consumers; RFC 8259 says not to add one.

## Safe checks that do not run the code

- Parse without acting on the content, for example `ConvertFrom-Json` or `python -m json.tool`.
- Validate against the schema separately from syntax, and say which check you ran.
