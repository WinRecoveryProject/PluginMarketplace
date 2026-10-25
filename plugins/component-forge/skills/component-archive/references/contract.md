# Component contract v1

Store components at components/<uuid>/<version>/ with code, component.json and evidence. Keep a rebuildable search index; manifests are authoritative. Never store secrets or live credentials. Do not overwrite published versions. Use an atomic directory promotion for a complete record; validate before promotion and serialize competing index updates. A duplicate ID/version with different content is an error.

Required component.json fields:
- schemaVersion: 1
- componentId: UUID; version: SemVer; kind: fragment/function/script/module/composite
- name, purpose, language (PowerShell initially), entryPoint (relative contained path)
- codeSha256: SHA-256 over exact saved code bytes
- compatibility: edition, minimum version, tested versions, OS and architecture
- inputs: name, type, required, default and validation
- outputs: type, shape, stream and semantics
- dependencies: exact component ID/version/hash pins, modules and versions, native tools
- bindings: source variable, read/write, scope, replacement, unresolved flag
- effects: files, registry, processes, network, elevation and reboot behavior
- controlFlow: pipeline, exceptions, exit/return and cleanup semantics
- provenance: source path or repository/ref, source SHA-256, selector/extent, retrieval date, license and attribution; use origin=generated for new code
- derivedFrom: ID/version/hash of ancestors, or []
- validation: state (draft/verified/rejected), evidence paths, tested code hash, checks, runtime versions, results, limitations

An assembly lock records assembly ID/version/hash, exact dependencies, binding mappings, ordering constraints, exported commands and validation. Reject absolute or escaping code/evidence paths. Verify source hash before extraction and code hashes before reuse. External code with unknown reuse permission stays quarantined until provenance is resolved. Keep operational evidence separate from reusable code.

Example: a module containing two functions is one module component referring to two function components. A changed function produces a new version and a new module lock. Unchanged members retain their original IDs. A function adapted for a different purpose gets a new ID and derivedFrom.
