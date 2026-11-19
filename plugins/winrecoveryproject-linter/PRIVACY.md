# Privacy

WinRecoveryProjectLinter 0.1.6 scans local files locally. It has no telemetry,
cloud analysis, account creation or credential requirement. It does not upload
source or reports. Reports written through shell redirection are controlled by
the user. The Codex host has its own privacy policies.

Explicit setup downloads public dependencies from npm, PyPI and official GitHub
releases. Those services receive ordinary connection metadata. Scan, doctor,
init and list-linters do not download dependencies. Third-party tools have their
own licenses and privacy behavior. No paid service is enabled.

SQL snapshots are sent only to the plugin's fixed local PostgreSQL parser
process. The parser never connects to a database, applies migrations, fetches
SQL URLs or executes SQL/project templates. Parser dependencies are downloaded
only through explicit setup, under the same pinned public-dependency policy.
