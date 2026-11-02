# WinRecoveryProject Digital Plugin Marketplace

Én samlet Git-markedsplads for de personlige Codex-plugins, der vedligeholdes under WinRecoveryProject/Zilvereyes.

## Tilføj markedspladsen

```powershell
codex plugin marketplace add WinRecoveryProject/PluginMarketplace
```

| Plugin | Version | Installation |
| --- | --- | --- |
| OneDrive | `1.1.5` | `codex plugin add onedrive@winrecoveryproject-digital` |
| CloudStorage Portal | `0.9.0` | `codex plugin add cloudstorage-portal@winrecoveryproject-digital` |
| Component Forge | `0.1.2` | `codex plugin add component-forge@winrecoveryproject-digital` |
| Plugin-Skill-Studio | `0.3.0` | `codex plugin add plugin-skill-studio@winrecoveryproject-digital` |
| PowerShell Workbench | `0.9.0-beta.2` | `codex plugin add powershell-workbench@winrecoveryproject-digital` |
| Windows Dism Update Docs | `0.1.3` | `codex plugin add windows-dism-update-docs@winrecoveryproject-digital` |
| Codex Security (OpenAI source) | `0.1.32` | `codex plugin add codex-security@winrecoveryproject-digital` |
| Linear (OpenAI source) | `5.0.1` | `codex plugin add linear@winrecoveryproject-digital` |

## Struktur

- `.agents/plugins/marketplace.json` er det eneste markedspladsmanifest.
- `plugins/` indeholder versionsfrosne, selvstændigt installerbare pluginpakker.
- De fem selvstændige kilde-repositories bevares. `plugin-sources.lock.json` fastlåser commit og filhash for deres marketplace-snapshots; se [kildeoversigten](docs/marketplace-sources-20261102.md).
- `cloudstorage-portal-local` er udgået og fjernet fra både kataloget og den publicerede pakkemappe. OneDrive og CloudStorage Portal er de to aktive cloudpakker.
- `plugins/plugin-eval/` bevares som en ikke-publiceret OpenAI-reference til udvikling og sammenligning; den er ikke en post i markedspladsmanifestet.
- OpenAI-ejede publiceringsposter bruger en direkte `git-subdir`-reference til `https://github.com/openai/plugins.git`; en bevaret lokal sammenligningsmappe er ikke publiceringskilden.
- `docs/onedrive-skills-inventory.md` dokumenterer de lokale OneDrive-relaterede skills, som ikke automatisk er separate plugins.
- `docs/consolidation-audit-2026-10-25.md` fastlægger de kanoniske kilder og den sikre oprydningsrækkefølge.
- `docs/skill-evaluation-2026-10-25.md` sammenligner Plugin Eval-resultater med den faktiske CloudStorage-arkitektur.
- `docs/provider-architecture-comparison-2026-10-25.md` beskriver Dropbox/Google Drive-mønstret og en kontrolleret vej til færre OneDrive-grænseflader.
- `docs/codex-mcp-config-audit-2026-10-25.md` skelner mellem den aktive Portal-runtime, den registrerede OneDrive-forbindelse og den karantænerede, ufuldstændige Vercel-udviklingsrute.
- `docs/plugin-worklist-2026-10-25.md` fastholder hele arbejdslisten og skelner mellem Codex-kilder, referencer, kandidater, installationer og publicering.
- `docs/external-plugin-sources.md` dokumenterer eksterne `git-subdir`-poster og bevarer den oprindelige udgiver som kilde.
- `docs/component-boundaries.md` fastlåser forskellen mellem OneDrive-Appreferencen, den lokale MCP-runtime og CloudStorage Portal-samlepakken.

## Validering

Kør repositoryets målrettede kontrol før commit, publicering eller markedspladsopgradering:

```powershell
node .\validate-marketplace.mjs
```

Kontrollen kræver blandt andet, at `.agents/plugins/marketplace.json` er udfoldet med to indrykningsmellemrum. En kompakt énlinje- eller delvist sammenklappet udgave bliver afvist.

## App- og OAuth-identitet

Codex App-ID'er som `asdk_app_...` og `connector_...` må kun komme fra eksisterende Codex App-bindinger. Microsoft Entra application/client-ID'er er OAuth-identiteter og må ikke omdøbes til et opdigtet `asdk_app_...`-ID. OneDrive 1.1.5 pakker den eksisterende App-binding, den kanoniske hosted MCP-forbindelse med DCR, ikonet og to skills. CloudStorage Portal samler provider-skills og refererer til Dropbox-, Google Drive- og OneDrive-apps; den ejer ikke en ekstra Local-runtime. En pakket binding beviser ikke kontoens adgang eller en fælles OAuth-session. Login, faktisk værktøjsopdagelse, filoperationer og refresh skal verificeres i den valgte vært.

OneDrive-bindingen er fastholdt fra den leverede ZIP; ingen ny App-identitet er opfundet. Personlig konto og Business-workspace er forskellige adgangsområder, og tidligere testresultater skal ikke fremstilles som aktuelle livekontroller.

## Konsolideringspolitik

- Denne Git-markedsplads er kataloget for Zilvereyes-pakkerne og udvalgte eksterne originalkilder. Zilvereyes-pakker vedligeholdes lokalt; OpenAI-pakker peger direkte på OpenAIs repository.
- En bevaret upstream-reference er ikke automatisk et Zilvereyes-plugin. Den publiceres først efter en reel, licenskompatibel afledning med egen identitet, funktion og dokumenteret provenance.
- Officielle Dropbox- og Google Drive-pakker kopieres ikke ind som selvstændige Zilvereyes-plugins. De bruges som verificerede App-afhængigheder og som versionsfrosne skills i CloudStorage Portal.
- Mapper under `.codex/plugins/cache` er installationscache, ikke redigerbare kilder.
- Ældre eksport- og sammenligningsmapper bevares som arkiv, men registreres ikke som markedspladser og installeres ikke parallelt.
- En gammel markedsplads eller plugininstallation fjernes først, når den tilsvarende pakke fra denne markedsplads er installeret og dens App-, skill- og MCP-opdagelse er verificeret.
