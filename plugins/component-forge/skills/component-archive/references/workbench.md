# Workbench extension boundary

The read installed powershell-scaffold skill already routes whole artifacts to New-PowerShellArtifact.ps1 and function/region fragments to New-PowerShellWorkbenchFragmentTemplate.ps1 and Join-PowerShellWorkbenchFragmentTemplate.ps1, preview by default and source SHA-256 preservation.

Add archive lookup before selection; add dependency contracts before extraction; add component ID/version/hash and draft registration after extraction; require exact pins and collision/closure checks before composition; register composed artifacts and results afterwards. Preserve preview defaults, source hash evidence, Windows PowerShell 5.1/7 scope and no-overwrite behavior. These requirements supplement Workbench; this plugin does not replace its scripts or modify its installed skill.

Before applying a patch to Workbench, resolve its actual repository layout and revision, read helper implementations and tests, then prepare a minimal change against that source. Never edit a version cache as the canonical source. Do not claim the extension is installed until updated files and actual helper behavior are verified.

GitHub stores code, contracts, pins, tests and revisions. Linear stores milestones, blockers and links to exact revisions; it is not the component source of truth. Resolve the intended repository/project before remote writes. Failure of a connector must not be represented as a created issue or pushed commit.
