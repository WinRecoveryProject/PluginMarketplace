# Privacy

DevSuite's local helpers use standard-library file operations only and add no
telemetry, network transport, credential store or background process. The optional
board stores bounded task ownership metadata and compact receipts, never transcripts.
Evidence reports are explicitly written only to the chosen local output directory.

External provider operations use the user's existing authorized connections and the
provider's policies. Only task-required data is submitted after scope and cost checks.
No external operation is performed by package validation. Secrets remain in host
bindings; no credential values are copied into this package or reports.
