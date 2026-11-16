# Source and licensing notices

Original DevSuite code and original workflow descriptions: Copyright (c) 2026
Zilvereyes, MIT. [LICENSE](LICENSE) covers this original work.

MIT adaptations retain complete notices:

- Codex Coordinator 0.4.0, Copyright (c) 2026 Six Ideas. State/lifecycle/session/stop
  helpers adapted into runtime/coordinator. [License](licenses/coordinator.txt).
- Codex Dev Workflows 0.4.2, Copyright (c) 2026 Codex Dev Workflows contributors.
  Workflow behavior merged and platform references adapted. [License](licenses/workflows.txt).
- Codex Engineering Guardrails 1.1.1, copyright retained exactly in its per-skill MIT
  notices. Engineering decision/verification references retained; workflow behavior
  merged. [First license](licenses/guardrails.txt), [second license](licenses/guardrails-1.txt).

Inspected but not redistributed:

- Codex Security 0.1.32 identifies its implementation as Proprietary. No proprietary
  skills, scripts, native binaries, compressed MCP bundles, schemas or source assets
  are copied. Original DevSuite security methods use existing licensed host tools
  conditionally. Existing provider installation/MCP must remain for that backend.
- Cloud Environment 0.2.1 is INTERNAL_ONLY and supplies no redistribution license.
  No source skills, references or installer script are copied. Original DevSuite
  environment guidance reuses the existing managed App/tools conditionally.
- CloudConvert exact selected package has metadata only; no source/license grant
  was available. Only the verified App ID and original conversion workflow are used.

[Provenance](references/source-provenance.json) lists 215 inspected source file hashes,
integration methods, licenses and source gaps. Source paths are audit citations, not
runtime dependencies. The capability matrix separates owned instructions, bundled
runtime and conditional external providers. No credentials or environment values
are included; source manifests were inspected as data, not adopted wholesale.
