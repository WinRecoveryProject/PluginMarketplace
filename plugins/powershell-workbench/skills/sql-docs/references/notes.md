# SQL: version cues, pitfalls and safe checks

These notes are research leads, not verified facts for a given project. Identify the exact version first, open the primary source for anything you rely on, and record what you checked.

## Identify the version first

- Identify the database engine and version first: SQL Server or Azure SQL (T-SQL), PostgreSQL, MySQL or MariaDB, SQLite, Oracle. The catalog seed covers T-SQL only.
- For SQL Server, also check the database `COMPATIBILITY_LEVEL`, which can disable newer behavior on a newer server.

## Primary sources

Start with the catalog seed for this language, then:

- <https://learn.microsoft.com/en-us/sql/t-sql/language-reference> (T-SQL)
- <https://www.postgresql.org/docs/> (PostgreSQL; pick the major version)
- <https://dev.mysql.com/doc/> (MySQL)
- <https://mariadb.com/kb/en/documentation/> (MariaDB; differs from MySQL)
- <https://www.sqlite.org/lang.html> (SQLite)

## Pitfalls that change behavior

- Identifier quoting differs: `[name]` in T-SQL, `"name"` in standard SQL and PostgreSQL, backticks in MySQL.
- Row limits differ: `TOP`, `LIMIT`, or `OFFSET … FETCH`.
- String concatenation is `+` in T-SQL and `||` in most others; MySQL treats `||` as OR by default.
- `GO` is a batch separator for sqlcmd and SSMS, not a T-SQL statement.
- `= NULL` is never true; use `IS NULL`. Collations decide case and accent sensitivity.

## Safe checks that do not run the code

- Never run research queries against a live database.
- Parse offline with a dialect-aware parser for the identified engine, and say which dialect you used.
