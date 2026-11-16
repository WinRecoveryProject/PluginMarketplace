# WinRecoveryProject Digital Plugin Marketplace

Én samlet Git-markedsplads for de personlige Codex-plugins, der vedligeholdes under WinRecoveryProject/Zilvereyes.

## Tilføj markedspladsen

```powershell
codex plugin marketplace add WinRecoveryProject/PluginMarketplace
```

| Plugin | Git-pakkens version ved kontrol | Installation |
| --- | --- | --- |
| OneDrive | `1.2.0` | `codex plugin add onedrive@winrecoveryproject-digital` |
| CloudStorage Portal | `0.9.2` | `codex plugin add cloudstorage-portal@winrecoveryproject-digital` |
| Component Forge | `0.1.2` | `codex plugin add component-forge@winrecoveryproject-digital` |
| Plugin-Skill-Studio | `0.3.3` | `codex plugin add plugin-skill-studio@winrecoveryproject-digital` |
| PowerShell Workbench | `0.9.0-beta.2` | `codex plugin add powershell-workbench@winrecoveryproject-digital` |
| Windows Dism Update Docs | `0.1.3` | `codex plugin add windows-dism-update-docs@winrecoveryproject-digital` |
| Codex Security | `0.1.22` | `codex plugin add codex-security@winrecoveryproject-digital` |
| Linear | `upstream` | `codex plugin add linear@winrecoveryproject-digital` |
| Codex Coordinator | `0.4.0` | `codex plugin add codex-coordinator@winrecoveryproject-digital` |
| Codex Dev Workflows | `0.4.2` | `codex plugin add codex-dev-workflows@winrecoveryproject-digital` |
| Codex Engineering Guardrails | `1.1.1` | `codex plugin add codex-engineering-guardrails@winrecoveryproject-digital` |
| Codex Process Jobs | `0.5.2` | `codex plugin add codex-process-jobs@winrecoveryproject-digital` |
| Zilvereyes Context Handoff | `0.3.4+zilvereyes.1` | `codex plugin add zilvereyes-context-handoff@winrecoveryproject-digital` |
| SharePoint | `0.1.7` | `codex plugin add sharepoint@winrecoveryproject-digital` |
| Vercel | `0.21.4` | `codex plugin add vercel@winrecoveryproject-digital` |
| GitHub | `0.1.12` | `codex plugin add github@winrecoveryproject-digital` |
| Google Drive | `0.1.15` | `codex plugin add google-drive@winrecoveryproject-digital` |
| OpenAI Developers | `1.2.3` | `codex plugin add openai-developers@winrecoveryproject-digital` |
| Dropbox | `5.0.1` | `codex plugin add dropbox@winrecoveryproject-digital` |
| MegaLinter | `1.0.33` | `codex plugin add megalinter@winrecoveryproject-digital` |
| Skill Risk Check | `0.1.5` | `codex plugin add agent-skillguard@winrecoveryproject-digital` |
| Context Handoff | `0.3.7` | `codex plugin add context-handoff@winrecoveryproject-digital` |
| Plugin Creator Plus | `0.1.2+codex.20260925002000` | `codex plugin add plugin-creator-plus@winrecoveryproject-digital` |
| Skill Craft | `1.3.0` | `codex plugin add skill-craft@winrecoveryproject-digital` |
| Plugin Autopilot | `0.8.0` | `codex plugin add chatgpt-codex-plugin-autopilot@winrecoveryproject-digital` |
| Skillquiver | `2.2.0` | `codex plugin add skillquiver@winrecoveryproject-digital` |
| Gmail | `0.1.9` | `codex plugin add gmail@winrecoveryproject-digital` |
| Google Calendar | `1.2.6` | `codex plugin add google-calendar@winrecoveryproject-digital` |
| Slack | `0.1.7` | `codex plugin add slack@winrecoveryproject-digital` |
| Plugin Eval | `0.1.2` | `codex plugin add plugin-eval@winrecoveryproject-digital` |

Den samlede oversigt dækker **54 produkter**: 30 Marketplace-poster, 15 originale kataloglinks og 9 værtsbundne produkter. [Se hele samlingen](docs/full-plugin-list-check-20261116.md) og [kontrollen af alle 52 aktuelle installationer](docs/installed-plugins-and-suppliers-20261116.md). Flere offentlige Git-pakker er ældre end de installerede katalogversioner. Ingen installerede pakker er ændret af katalogopdateringen.

## Struktur

- `.agents/plugins/marketplace.json` er det eneste markedspladsmanifest.
- `plugins/` indeholder versionsfrosne, selvstændigt installerbare pluginpakker.
- De selvstændige kilde-repositories bevares. `plugin-sources.lock.json` fastlåser commit og filhash for deres marketplace-snapshots; se [kildeoversigten](docs/marketplace-sources-20261102.md).
- `cloudstorage-portal-local` er udgået og fjernet fra både kataloget og den publicerede pakkemappe. OneDrive og CloudStorage Portal er de to aktive cloudpakker.
- `plugins/plugin-eval/` bevares som en lokal sammenligningsreference. Marketplace-posten peger direkte på OpenAIs originale Git-kilde; den bevarede mappe er ikke publiceringskilden.
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

Codex App-ID'er som `asdk_app_...` og `connector_...` kommer fra eksisterende Codex App-bindinger. Microsoft Entra application/client-ID'er er separate OAuth-identiteter. OneDrive 1.2.0 samler den eksisterende registrerede App, ikonet og to skills; den hosted MCP-server ligger bag Appen. Pakken tilføjer ikke en ekstra native MCP-klient eller et ekstra Microsoft-login. Det portable manifest er bevaret under `references/portable-plugin.json` til eksport; det må ikke skygge Desktop-manifestet i roden. CloudStorage Portal refererer fortsat til samme Dropbox-, Google Drive- og OneDrive-apps. Marketplace-pakken og værtens remote App-kort er to visninger af samme registrerede OneDrive-app; deres versionsnumre og menuer behøver ikke være ens. Microsoft-login og faktisk adgang til et personligt eller Entra-tilknyttet drev verificeres hver for sig.

OneDrive-bindingen er fastholdt fra den leverede ZIP; ingen ny App-identitet er opfundet. Personlig konto og Business-workspace er forskellige adgangsområder, og tidligere testresultater skal ikke fremstilles som aktuelle livekontroller.

## Konsolideringspolitik

- Denne Git-markedsplads er kataloget for Zilvereyes-pakkerne og udvalgte eksterne originalkilder. Zilvereyes-pakker vedligeholdes lokalt; OpenAI-pakker peger direkte på OpenAIs repository.
- En bevaret upstream-reference er ikke automatisk et Zilvereyes-plugin. Den publiceres først efter en reel, licenskompatibel afledning med egen identitet, funktion og dokumenteret provenance.
- Officielle Dropbox- og Google Drive-pakker kopieres ikke ind som selvstændige Zilvereyes-plugins. De bruges som verificerede App-afhængigheder og som versionsfrosne skills i CloudStorage Portal.
- Mapper under `.codex/plugins/cache` er installationscache, ikke redigerbare kilder.
- Ældre eksport- og sammenligningsmapper bevares som arkiv, men registreres ikke som markedspladser og installeres ikke parallelt.
- En gammel markedsplads eller plugininstallation fjernes først, når den tilsvarende pakke fra denne markedsplads er installeret og dens App-, skill- og MCP-opdagelse er verificeret.
