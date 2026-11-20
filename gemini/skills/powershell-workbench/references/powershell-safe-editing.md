# Skill: powershell-safe-editing

- Plugin: `powershell-workbench` (0.9.0-beta.6)
- Source: `plugins/powershell-workbench/skills/powershell-safe-editing/SKILL.md`

> Use when asked to make precise, low-churn edits to compact, generated, or one-line PowerShell and mixed-language files, and diagnose patch payload, encoding, or invocation failures without executing the patch.

## Instructions

### PowerShell Safe Editing

Use this skill when a target file is compacted, generated, mostly one line, has dense semicolon-delimited PowerShell, or an exact patch has failed because its context did not match. Also use it when a patch wrapper reports pipeline encoding, stdin, shell-text, multiline-argument, or patch-envelope failures. Do not use it for ordinary readable source edits.

1. Identify the exact files and the smallest change before editing. Preserve existing encoding, line endings, and unrelated formatting.
2. Read only the smallest relevant region and choose an anchor that includes stable nearby syntax, not whitespace or a long fragile line.
3. Make one logical change per patch. Split independent files into separate patches so one mismatched anchor does not block unrelated work.
4. For dense one-line code, use a narrow replacement only when the old text is unique and the expected replacement count is exactly one. Fail closed if it is zero or greater than one.
5. Do not apply broad regex rewrites, whole-file formatting, or minifier output just to make a patch succeed. They obscure review and can change semantics.
6. After a rejected patch, inspect the smallest failed anchor, account for the actual text or line ending, then retry with a smaller patch. Do not repeat the identical patch.
7. Keep validation proportional to the requested work. Parse, test, lint, or run quality gates only when requested or when a changed deterministic helper requires direct verification.

For patch transport failures, separate payload validity from host capability:

1. Run `scripts/Test-PowerShellWorkbenchPatch.ps1` with `-PatchText` or `-PatchPath`, the intended `-InvocationMode`, and the actual `-HostAdapter`. This is read-only and never applies or transports the patch.
2. Proceed only when `Eligible` is true. Preserve `PatchSha256` when reporting or handing off the validated payload, and propagate every `FailedGates` value exactly.
3. Submit the complete payload through a dedicated patch tool or native executable as one direct argument. Do not pipe it, send it through stdin, or evaluate it as shell text.
4. Treat a Windows batch wrapper as multiline-unsafe. If a verified payload reached such a wrapper, stop retrying the identical patch and report `HostAdapterMultilineArgumentSafe`; do not work around it with `Invoke-Expression` or lossy quoting.

For PowerShell, preserve Windows PowerShell 5.1 and PowerShell 7 compatibility unless the user explicitly narrows the target runtime.

## Bundled files

### File: `agents/openai.yaml`

```yaml
interface:
  display_name: "PowerShell Safe Editing"
  short_description: "Make precise low-churn edits"
  icon_small: "./assets/skill-icon.png"
  icon_large: "./assets/skill-icon.png"
  brand_color: "#2671BE"
  default_prompt: "Use $powershell-safe-editing to make a precise, low-churn edit without executing the edited payload."
```

### File: `assets/skill-icon.png`

_Binary asset, not embedded._
