# Pakker og kilde-repositories

Den private marketplace indeholder én post pr. vedligeholdt pakke. Installation
sker fra `plugins/<navn>` i dette repository; de selvstændige repositories bevares
som udviklingskilder. Mapperne er almindelige, fulde Git-snapshots, ikke submodules,
symlinks eller indlejrede `.git`-mapper. Derfor kræver en marketplace-installation
ikke en ekstra rekursiv submodule-hentning.

| Pakke | Version | Selvstændig kilde | Kildemappe |
| --- | --- | --- | --- |
| CloudStorage Portal | 0.9.0 | [CloudStorage-Portal](https://github.com/WinRecoveryProject/CloudStorage-Portal) | repository-rod |
| PowerShell Workbench | 0.9.0-beta.2 | [PowerShellWorkbench](https://github.com/WinRecoveryProject/PowerShellWorkbench) | `plugins/powershell-workbench` |
| Plugin-Skill-Studio | 0.3.0 | [Zilvereyes-Plugin-Studio](https://github.com/WinRecoveryProject/Zilvereyes-Plugin-Studio) | repository-rod |
| Component Forge | 0.1.2 | [Component-Forge](https://github.com/WinRecoveryProject/Component-Forge) | repository-rod |
| Windows Dism Update Docs | 0.1.3 | [Windows-Dism-Update-Docs](https://github.com/WinRecoveryProject/Windows-Dism-Update-Docs) | repository-rod |

`plugin-sources.lock.json` fastholder hver kildecommit, kildemappe, version og SHA256
for samtlige snapshotfiler. Opdater kilden først, overfør dens committede pakke,
opdater låsefilen og kør `node validate-marketplace.mjs` før publicering.
En ny source-commit ændrer ikke automatisk denne marketplace-kopi.

Plugin-Skill-Studio erstatter katalogposten `zilvereyes-plugin-studio`; selve
GitHub-repositoryets navn og historik er bevaret. Den udgåede
`cloudstorage-portal-local` er fjernet fra kataloget og den publicerede `plugins/`
mappe. Historiske omtaler i auditdokumenter er historik, ikke installationsposter.

## OneDrive og testgrænsen

OneDrive 1.1.5 er overført fra brugerens `OneDrive_unified_v1.1.5.zip`.
`plugins/onedrive/PROVENANCE.json` fastholder arkivets SHA256 og den eksisterende
App-binding. Pakken indeholder App-reference, hosted MCP-forbindelse, ikon og to
skills. Der er ikke oprettet en ny OneDrive-identitet eller en ny server.

En pakket App-reference, MCP-URL eller et vellykket mocktest beviser ikke, at en
personlig konto og en Business-workspace deler adgang eller OAuth-session.
Dropbox 6.1.0 har både App- og MCP-deklarationer, men bindingsnøglen i den pakke er
ikke dokumentation for en universel OAuth-migrationsmekanisme.

Runtime-kontrollen 2. november 2026 gav 54 beståede lokale tests samt gyldig offentlig
OAuth-discovery med `onedrive.read` og `onedrive.write`; anonym MCP-adgang gav 401.
Det beviser kontrakten og adgangskravet, ikke et Microsoft-login eller en live
filoperation. Aktuel login-, fil- og refresh-evidens skal registreres separat for
web, Desktop og workspace. Brug aldrig staging- eller SharePoint-værktøjer som
erstatning for et vellykket kald gennem denne OneDrive-pakke.
