# WinRecoveryProject Digital Plugin Marketplace

Én samlet Git-markedsplads for de personlige Codex-plugins, der vedligeholdes under WinRecoveryProject/Zilvereyes.

## Tilføj markedspladsen

```powershell
codex plugin marketplace add WinRecoveryProject/PluginMarketplace
```

| Plugin | Version | Installation |
| --- | --- | --- |
| CloudStorage Portal | `0.8.0-dev.20` | `codex plugin add cloudstorage-portal@winrecoveryproject-digital` |
| CloudStorage OneDrive | `0.1.5` | `codex plugin add cloudstorage-onedrive@winrecoveryproject-digital` |
| Component Forge | `0.1.2` | `codex plugin add component-forge@winrecoveryproject-digital` |
| Plugin Eval | `0.1.3` | `codex plugin add plugin-eval@winrecoveryproject-digital` |
| PowerShell Workbench | `0.9.0-beta.2` | `codex plugin add powershell-workbench@winrecoveryproject-digital` |
| Windows Dism Update Docs | `0.1.3` | `codex plugin add windows-dism-update-docs@winrecoveryproject-digital` |
| Codex Security | `0.1.22` | `codex plugin add codex-security@winrecoveryproject-digital` |

## Struktur

- `.agents/plugins/marketplace.json` er det eneste markedspladsmanifest.
- `plugins/` indeholder versionsfrosne, selvstændigt installerbare pluginpakker.
- `docs/onedrive-skills-inventory.md` dokumenterer de lokale OneDrive-relaterede skills, som ikke automatisk er separate plugins.
- `docs/consolidation-audit-2026-10-25.md` fastlægger de kanoniske kilder og den sikre oprydningsrækkefølge.
- `docs/skill-evaluation-2026-10-25.md` sammenligner Plugin Eval-resultater med den faktiske CloudStorage-arkitektur.
- `docs/provider-architecture-comparison-2026-10-25.md` beskriver Dropbox/Google Drive-mønstret og en kontrolleret vej til færre OneDrive-grænseflader.

## App- og OAuth-identitet

Codex App-ID'er som `asdk_app_...` og `connector_...` må kun komme fra eksisterende Codex App-bindinger. Microsoft Entra application/client-ID'er er OAuth-identiteter og må ikke omdøbes til et opdigtet `asdk_app_...`-ID. CloudStorage Portal refererer til de verificerede Dropbox-, Google Drive- og OneDrive-apps. CloudStorage OneDrive bevarer desuden sin egen MCP/OAuth-konfiguration.

Installerede plugins migreres ikke automatisk fra ældre markedspladser. Det beskytter eksisterende plugin-data, OAuth-grants og rollback-muligheder.

## Konsolideringspolitik

- Denne Git-markedsplads er den kanoniske kilde til Zilvereyes-pakkerne.
- Officielle Dropbox- og Google Drive-pakker kopieres ikke ind som selvstændige Zilvereyes-plugins. De bruges som verificerede App-afhængigheder og som versionsfrosne skills i CloudStorage Portal.
- Mapper under `.codex/plugins/cache` er installationscache, ikke redigerbare kilder.
- Ældre eksport- og sammenligningsmapper bevares som arkiv, men registreres ikke som markedspladser og installeres ikke parallelt.
- En gammel markedsplads eller plugininstallation fjernes først, når den tilsvarende pakke fra denne markedsplads er installeret og dens App-, skill- og MCP-opdagelse er verificeret.
