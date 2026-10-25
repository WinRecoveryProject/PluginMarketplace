---
name: component-archive
description: "Use when extracting reusable PowerShell fragments, untangling shared variables, generating code from a component archive, or composing registered functions, scripts and modules."
---
# Component archive

1. Resolve explicit source roots, destination archive and target PowerShell versions from the request or project profile. Inventory only scoped roots; do not scan drives. If roots are missing, prepare contracts and ask for the roots before extraction. Never execute or dot-source inspected code.
2. Read [contract.md](references/contract.md). Search the project's canonical component archive before generating code. If none exists, create one in the selected project; keep mutable components outside the installed plugin cache. Track the archive with Git.
3. Compare candidates by purpose, input/output contract, target versions, dependencies, side effects, validation and provenance. Prefer a suitable verified candidate over an unverified closer text match. Record candidates and the reason for selection or creation.
4. Inspect selected PowerShell with its parser AST when available; inspect surrounding scopes and callers. Use PowerShell Workbench fragment extraction/composition helpers when available, preserving their source hashes. Their output alone does not prove dependency closure. If no parser is available, mark manual analysis and unresolved items; do not invent AST results.
5. Build a dependency map: reads/writes and scope, parameters, defaults, automatic/preference/environment variables, functions, modules, native tools, files, registry, pipeline input/output, streams, exceptions and return/exit/break/continue behavior. Include mutation of referenced objects, closures, dot-sourcing and dynamic invocation. Mark dynamic names or unknown calls unresolved. Read [extraction.md](references/extraction.md).
6. Extract a coherent unit. Turn implicit inputs into typed parameters and implicit outputs into explicit results where behavior can be preserved. Retain inseparable statements as a composite component. Never assume textual splitting preserves execution semantics.
7. Assign every fragment, function, script, module and composite an immutable UUID component ID. Revisions of the same contract retain the ID and increment version; a new adapted purpose receives a new ID and derivedFrom. Pin composition dependencies by ID, version and code hash.
8. Register every new or adapted result as draft immediately; record source, purpose and validation state. Failed candidates remain rejected/quarantined, never eligible by default for assembly. Reuse unchanged components without duplicate records. Never promote unchecked code as verified.
9. Run target-appropriate parser checks and isolated contract tests when available. Include failure paths and composition behavior. Mock native/system operations. Capture exact commands, runtime versions, results and unavailable checks. Parser success is not a behavioral test. Evidence applies only to the tested component hash.
10. Compose only compatible pinned components. Reject missing dependencies, cycles, unresolved bindings, export collisions or conflicting side effects. Give the assembly its own ID and a lock manifest. Register the assembly and validation evidence.
11. Commit authorized source/archive changes in the chosen Git project. Report created IDs, reused IDs, unresolved dependencies and actual validation. Do not claim Windows PowerShell 5.1 compatibility from PowerShell 7 testing alone.

Research/extraction does not authorize running registry changes, SFC, CHKDSK, DISM, ADK DISM, mounting, servicing or rebooting. Generate reviewable plans and adapters; use target-specific authorization for execution. Code generation itself is authorized by a request to build code.

This is an agent workflow, not an automatic code interception hook or a bundled AST engine. For Workbench integration read [workbench.md](references/workbench.md); for evaluation read [evaluation.md](references/evaluation.md).
