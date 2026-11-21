# Skill: component-archive

- Plugin: `component-forge` (0.1.3)
- Source: `plugins/component-forge/skills/component-archive/SKILL.md`

> Use when extracting reusable PowerShell fragments, untangling shared variables, generating code from a component archive, or composing registered functions, scripts and modules.

## Instructions

### Component archive

1. Resolve explicit source roots, destination archive and target PowerShell versions from the request or project profile. Inventory only scoped roots; do not scan drives. If roots are missing, prepare contracts and ask for the roots before extraction. Never execute or dot-source inspected code.
2. Read [contract.md](component-archive.md#file-referencescontractmd). Search the project's canonical component archive before generating code. If none exists, create one in the selected project; keep mutable components outside the installed plugin cache. Track the archive with Git.
3. Compare candidates by purpose, input/output contract, target versions, dependencies, side effects, validation and provenance. Prefer a suitable verified candidate over an unverified closer text match. Record candidates and the reason for selection or creation.
4. Inspect selected PowerShell with its parser AST when available; inspect surrounding scopes and callers. Use PowerShell Workbench fragment extraction/composition helpers when available, preserving their source hashes. Their output alone does not prove dependency closure. If no parser is available, mark manual analysis and unresolved items; do not invent AST results.
5. Build a dependency map: reads/writes and scope, parameters, defaults, automatic/preference/environment variables, functions, modules, native tools, files, registry, pipeline input/output, streams, exceptions and return/exit/break/continue behavior. Include mutation of referenced objects, closures, dot-sourcing and dynamic invocation. Mark dynamic names or unknown calls unresolved. Read [extraction.md](component-archive.md#file-referencesextractionmd).
6. Extract a coherent unit. Turn implicit inputs into typed parameters and implicit outputs into explicit results where behavior can be preserved. Retain inseparable statements as a composite component. Never assume textual splitting preserves execution semantics.
7. Assign every fragment, function, script, module and composite an immutable UUID component ID. Revisions of the same contract retain the ID and increment version; a new adapted purpose receives a new ID and derivedFrom. Pin composition dependencies by ID, version and code hash.
8. Register every new or adapted result as draft immediately; record source, purpose and validation state. Failed candidates remain rejected/quarantined, never eligible by default for assembly. Reuse unchanged components without duplicate records. Never promote unchecked code as verified.
9. Run target-appropriate parser checks and isolated contract tests when available. Include failure paths and composition behavior. Mock native/system operations. Capture exact commands, runtime versions, results and unavailable checks. Parser success is not a behavioral test. Evidence applies only to the tested component hash.
10. Compose only compatible pinned components. Reject missing dependencies, cycles, unresolved bindings, export collisions or conflicting side effects. Give the assembly its own ID and a lock manifest. Register the assembly and validation evidence.
11. Commit authorized source/archive changes in the chosen Git project. Report created IDs, reused IDs, unresolved dependencies and actual validation. Do not claim Windows PowerShell 5.1 compatibility from PowerShell 7 testing alone.

Research/extraction does not authorize running registry changes, SFC, CHKDSK, DISM, ADK DISM, mounting, servicing or rebooting. Generate reviewable plans and adapters; use target-specific authorization for execution. Code generation itself is authorized by a request to build code.

This is an agent workflow, not an automatic code interception hook or a bundled AST engine. For Workbench integration read [workbench.md](component-archive.md#file-referencesworkbenchmd); for evaluation read [evaluation.md](component-archive.md#file-referencesevaluationmd).

## Bundled files

### File: `agents/openai.yaml`

```yaml
interface:
  icon_small: "./assets/wrp-icon-128.png"
  icon_large: "./assets/wrp-icon-256.png"
  display_name: "Component Archive"
  short_description: "Extract and compose PowerShell components"
  brand_color: "#36B37E"
  default_prompt: "Search the archive before generating PowerShell code and register component contracts."
```

### File: `assets/component-forge.png`

_Binary asset, not embedded._

### File: `assets/wrp-icon-128.png`

_Binary asset, not embedded._

### File: `assets/wrp-icon-256.png`

_Binary asset, not embedded._

### File: `references/contract.md`

#### Component contract v1

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

### File: `references/evaluation.md`

#### Evaluation and acceptance

Use Plugin Eval start and analyze against the plugin root. A missing CLI blocks measured evaluation; a manual checklist is not a Plugin Eval score. Compare Windows DISM Update Docs research boundaries and Workbench fragment contracts. Never copy their project-specific paths into a generic plugin.

Acceptance scenarios (all currently unexecuted):
1. Extract a region reading a script variable and mutating a shared list: identify both and preserve caller behavior.
2. Encounter a dynamically selected command: record unresolved; block verified promotion.
3. Request a close existing purpose: compare archive candidates and adapt with new ID/derivedFrom; preserve parent.
4. Reuse unchanged code: retain ID/version; do not duplicate.
5. Tamper with saved code: reject hash mismatch.
6. Compose missing/cyclic dependencies or duplicate exports: fail before generation is promoted.
7. Assemble valid pinned components: produce assembly ID and lock; test output and error paths.
8. Inspect registry/DISM code: never execute system mutations during extraction/tests.
9. Missing PowerShell 5.1: report untested compatibility.
10. Concurrent registrations: no partial record or lost index entry.
11. Source without license/provenance: quarantine external borrowed code.
12. Change child version: preserve old lock and create new assembly version.

Strongest intended capability: archive-first generation with explicit provenance. Largest unimplemented dependency: executable AST/data-flow analyzer, transactional archive tooling and Windows runtime validation. Instructions cannot guarantee global interception of every future code request; the plugin must be selected or its skill invoked.

### File: `references/extraction.md`

#### Untangling and composition

Treat assignment as a possible output, not proof of local ownership. Resolve parent, script and global scope; distinguish automatic variables from caller state. Trace aliases, splatting, callbacks, scriptblocks, closures, member mutation, pipeline enumeration and error preferences. Record dependencies that static analysis cannot resolve. Do not convert exit into return or move try/finally without proving equivalent caller behavior.

Example: a region reads $MountPath, calls a helper, appends to $Results and reads $LASTEXITCODE. Extract the helper dependency, expose MountPath, return a structured result, and capture the native exit code immediately after invocation. Preserve stream behavior and caller aggregation. Until tested, keep it draft. An unresolved dynamically selected helper prevents verified standalone status.

PowerShell 5.1 and 7 are separate validation targets. Native command quoting and encoding require target testing. A module import must not invoke servicing or modify registry/files as an import side effect. Declare exports explicitly. Do not execute untrusted code during inventory or tests. Unit tests mock all mutating adapters; an integration test must name its disposable target and authorization.

### File: `references/workbench.md`

#### Workbench extension boundary

The read installed powershell-scaffold skill already routes whole artifacts to New-PowerShellArtifact.ps1 and function/region fragments to New-PowerShellWorkbenchFragmentTemplate.ps1 and Join-PowerShellWorkbenchFragmentTemplate.ps1, preview by default and source SHA-256 preservation.

Add archive lookup before selection; add dependency contracts before extraction; add component ID/version/hash and draft registration after extraction; require exact pins and collision/closure checks before composition; register composed artifacts and results afterwards. Preserve preview defaults, source hash evidence, Windows PowerShell 5.1/7 scope and no-overwrite behavior. These requirements supplement Workbench; this plugin does not replace its scripts or modify its installed skill.

Before applying a patch to Workbench, resolve its actual repository layout and revision, read helper implementations and tests, then prepare a minimal change against that source. Never edit a version cache as the canonical source. Do not claim the extension is installed until updated files and actual helper behavior are verified.

GitHub stores code, contracts, pins, tests and revisions. Linear stores milestones, blockers and links to exact revisions; it is not the component source of truth. Resolve the intended repository/project before remote writes. Failure of a connector must not be represented as a created issue or pushed commit.
