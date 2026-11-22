# Skill: sql-docs

- Plugin: `powershell-workbench` (0.9.0-beta.7)
- Source: `plugins/powershell-workbench/skills/sql-docs/SKILL.md`

> Use when researching sql syntax, runtime, parser and component-contract documentation with explicit version scope inside PowerShell Workbench.

## Instructions

### Sql Docs

Read ../powershell-scaffold/references/language-docs.md and the `sql` entry in
../../assets/language-documentation-catalog.json. Scope: Identify database vendor/version first; this seed covers T-SQL only.
Then read references/notes.md: version cues, primary sources, pitfalls and safe checks for this language.

Open relevant primary sources before technical claims. Read ../../assets/component-parser-catalog.json
for parser IDs/capability states and apply ../powershell-scaffold/references/component-pipeline.md
before executing generated code. Documentation coverage does not imply parser support.

## Bundled files

### File: `agents/openai.yaml`

```yaml
interface:
  display_name: "Sql Docs"
  short_description: "Research sql documentation"
  icon_small: "./assets/sqldeveloper-original.svg"
  icon_large: "./assets/sqldeveloper-original.svg"
  default_prompt: "Find version-specific primary documentation for sql components."
```

### File: `assets/sqldeveloper-original.svg`

_Binary asset, not embedded._

### File: `references/notes.md`

#### SQL: version cues, pitfalls and safe checks

These notes are research leads, not verified facts for a given project. Identify the exact version first, open the primary source for anything you rely on, and record what you checked.

##### Identify the version first

- Identify the database engine and version first: SQL Server or Azure SQL (T-SQL), PostgreSQL, MySQL or MariaDB, SQLite, Oracle. The catalog seed covers T-SQL only.
- For SQL Server, also check the database `COMPATIBILITY_LEVEL`, which can disable newer behavior on a newer server.

##### Primary sources

Start with the catalog seed for this language, then:

- <https://learn.microsoft.com/en-us/sql/t-sql/language-reference> (T-SQL)
- <https://www.postgresql.org/docs/> (PostgreSQL; pick the major version)
- <https://dev.mysql.com/doc/> (MySQL)
- <https://mariadb.com/kb/en/documentation/> (MariaDB; differs from MySQL)
- <https://www.sqlite.org/lang.html> (SQLite)

##### Pitfalls that change behavior

- Identifier quoting differs: `[name]` in T-SQL, `"name"` in standard SQL and PostgreSQL, backticks in MySQL.
- Row limits differ: `TOP`, `LIMIT`, or `OFFSET … FETCH`.
- String concatenation is `+` in T-SQL and `||` in most others; MySQL treats `||` as OR by default.
- `GO` is a batch separator for sqlcmd and SSMS, not a T-SQL statement.
- `= NULL` is never true; use `IS NULL`. Collations decide case and accent sensitivity.

##### Safe checks that do not run the code

- Never run research queries against a live database.
- Parse offline with a dialect-aware parser for the identified engine, and say which dialect you used.
