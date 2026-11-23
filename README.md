# WinRecoveryProject Digital Plugin Marketplace

[Linter 0.1.2: Windows-rettelser og stabil lokal runtime](docs/LINTER-012-20261118.md).
[Originalpakker gendannet i Personlig](docs/ORIGINALS-RECOVERY-20261118.md).

[Seneste personlige afstemning og rettelser: 18. november](docs/MARKETPLACE-FOLLOWUP-20261118.md).

Grundlaget i DevSuite **0.2.0**: [samlede Codex-workflows og nye assets](docs/DEVSUITE-020-20261117.md). Business: [79 installerede identiteter afstemt](docs/BUSINESS-INVENTORY-20261117.md).

Studio **0.3.11**: [præcis genfinding efter pluginopdateringer](docs/STUDIO-CACHE-RECOVERY-20261118.md).

Studio **0.3.10**: [integreret Windows-styring og Desktop-/filprøver](docs/STUDIO-DESKTOP-20261117.md).

Tidligere personlige plugin-/skillliste: [52 plugin-identiteter og 3 lokale skills afstemt](docs/USER-PLUGIN-CHECKLIST-20261117.md).

Seneste rettelser og praktiske regnearks-/PDF-prøver: [Marketplace-opfølgning](docs/MARKETPLACE-FOLLOWUP-20261117.md).

Praktiske prøver og resterende runtime-begrænsninger: [Studio 0.3.7](docs/PRACTICAL-STUDIO037-20261117.md).

**Gemini:** [upload-klare færdigheder for alle plugins](gemini/README.md).

Én samlet Git-markedsplads for de personlige Codex-plugins, der vedligeholdes under WinRecoveryProject/Zilvereyes.

Seneste samlede installationskontrol: [fuld installationsliste og historisk afstemning med Studio 0.3.6/0.3.7](docs/INSTALLED-AUDIT-STUDIO036-20261117.md).

Verificeret samlet mål: [opgaver, færdigkriterier og verifikation](docs/GOAL-WORKLIST-20261117.md).

Opfølgning: [rettede upstream-installationsopskrifter og Studio 0.3.6](docs/UPSTREAM-REMEDIATION-20261117.json). De tidligere 13 tilbageholdte opskrifter er rettet i den eksisterende MegaLinter-kopi; MegaLinter tilføjes ikke som Marketplace-plugin.

## Tilføj markedspladsen

```powershell
codex plugin marketplace add WinRecoveryProject/PluginMarketplace
```

| Plugin | Git-pakkens version ved kontrol | Installation |
| --- | --- | --- |
| OneDrive | `1.2.2` | `codex plugin add onedrive@winrecoveryproject-digital` |
| CloudStorage Portal | `0.9.15` | `codex plugin add cloudstorage-portal@winrecoveryproject-digital` |
| Component Forge | `0.1.3` | `codex plugin add component-forge@winrecoveryproject-digital` |
| Plugin-Skill-Studio | `0.6.0` | `codex plugin add plugin-skill-studio@winrecoveryproject-digital` |
| PowerShell Workbench | `0.9.0-beta.7` | `codex plugin add powershell-workbench@winrecoveryproject-digital` |
| Windows Dism Update Docs | `0.1.4` | `codex plugin add windows-dism-update-docs@winrecoveryproject-digital` |
| Codex Security | `0.1.33` | `codex plugin add codex-security@winrecoveryproject-digital` |
| Linear | `5.0.1` | `codex plugin add linear@winrecoveryproject-digital` |
| Codex Coordinator | `0.4.0` | `codex plugin add codex-coordinator@winrecoveryproject-digital` |
| Codex Dev Workflows | `0.4.2-wrp.1` | `codex plugin add codex-dev-workflows@winrecoveryproject-digital` |
| Codex Engineering Guardrails | `1.1.1` | `codex plugin add codex-engineering-guardrails@winrecoveryproject-digital` |
| Codex Process Jobs | `0.5.3-wrp.2` | `codex plugin add codex-process-jobs@winrecoveryproject-digital` |
| Zilvereyes Context Handoff | `0.3.5+zilvereyes.1` | `codex plugin add zilvereyes-context-handoff@winrecoveryproject-digital` |
| WinRecoveryProjectLinter | `0.1.6` | `codex plugin add winrecoveryproject-linter@winrecoveryproject-digital` |
| WinRecoveryProject DevSuite | `0.4.0` | `codex plugin add winrecoveryproject-devsuite@winrecoveryproject-digital` |
| CodeRabbit | `1.1.7-wrp.1` | `codex plugin add coderabbit@winrecoveryproject-digital` |
| SharePoint | `0.1.7` | `codex plugin add sharepoint@winrecoveryproject-digital` |
| Vercel | `0.56.0-wrp.3` | `codex plugin add vercel@winrecoveryproject-digital` |
| GitHub | `0.1.12` | `codex plugin add github@winrecoveryproject-digital` |
| Google Drive | `0.1.15` | `codex plugin add google-drive@winrecoveryproject-digital` |
| OpenAI Developers | `1.2.3` | `codex plugin add openai-developers@winrecoveryproject-digital` |
| Dropbox | `5.0.1` | `codex plugin add dropbox@winrecoveryproject-digital` |
| Skill Risk Check | `0.1.5` | `codex plugin add agent-skillguard@winrecoveryproject-digital` |
| Context Handoff | `0.3.7` | `codex plugin add context-handoff@winrecoveryproject-digital` |
| Plugin Creator Plus | `0.1.2+codex.20260925002000` | `codex plugin add plugin-creator-plus@winrecoveryproject-digital` |
| Skill Craft | `1.3.0` | `codex plugin add skill-craft@winrecoveryproject-digital` |
| Plugin Autopilot | `0.8.0` | `codex plugin add chatgpt-codex-plugin-autopilot@winrecoveryproject-digital` |
| Skillquiver | `2.2.0` | `codex plugin add skillquiver@winrecoveryproject-digital` |
| Gmail | `0.1.9` | `codex plugin add gmail@winrecoveryproject-digital` |
| Google Calendar | `1.2.6` | `codex plugin add google-calendar@winrecoveryproject-digital` |
| Slack | `0.1.7` | `codex plugin add slack@winrecoveryproject-digital` |
| AgentMemory-ASUS | `1.0.0` | `codex plugin add agentmemory-asus@winrecoveryproject-digital` |
| Game Development Studio | `1.4.0` | `codex plugin add game-development-studio@winrecoveryproject-digital` |
| Atlassian Rovo | `1.0.6` | `codex plugin add atlassian-rovo@winrecoveryproject-digital` |
| Codex Advisor | `1.4.11` | `codex plugin add advisor@winrecoveryproject-digital` |

Versionerne i tabellen er de udgaver, som Marketplace kan hente fra de respektive Git-kilder. Se [versionskontrollen](docs/external-plugin-sources.md#seneste-versionsfund-med-studio-0329) for de senest kontrollerede katalogforskelle og [Vercel-opdateringen](docs/VERCEL-056-WRP-20261118.md).

Game Development Studio følger udviklerens frigivne 1.4.0. Praktisk brug kræver den separate `game-dev`-CLI. Atlassian Rovo tilbyder den offentlige pakke 1.0.6 med det eksisterende Jira/Confluence-App-ID. Den kuraterede 1.0.7 er fortsat en separat udgivelseskanal. [Game Development Studio 1.4.0](https://github.com/theisegoria/game-development-studio-skills/tree/v1.4.0) · [Atlassian Rovos Git-manifest](https://github.com/openai/plugins/blob/981b02c0c44058b595f3b4180002c3ae3c806d40/plugins/atlassian-rovo/.codex-plugin/plugin.json)

Den historiske leverandøroversigt fra 16. november dækker **56 produkter**: 32 Marketplace-poster, 15 originale kataloglinks og 9 værtsbundne produkter. [Se samlingen](docs/full-plugin-list-check-20261116.md) og [de daværende 52 installationer](docs/installed-plugins-and-suppliers-20261116.md). Opgørelsen fra 17. november var 61 CLI-registreringer og 7 yderligere personlige remote-identiteter. [Se den historiske kontrol og forklaringerne](docs/INSTALLED-AUDIT-STUDIO036-20261117.md).

Studio 0.3.33 genkører versionssammenligningen med `--counterparts` og de fastlagte katalog-ID'er. Tilføj `--components <workspace>` for at få native App-, skill- og MCP-opslag i samme kontokontekst. [Versionskontrol](plugins/plugin-skill-studio/references/inventory-versions.md) · [Katalog-ID'er](docs/catalog-counterparts.json)

Kør `node scripts/check-documented-versions.mjs <rapport.json>` med en frisk Studio-rapport efter en udgivelse. Kontrollen sammenligner alle rækker med de observerede Git-manifester og melder manglende eller forældede versionsangivelser.

Plugin Autopilot 0.8.0, Context Handoff 0.3.7 og Skillquiver 2.2.0 hentes fra roden af deres respektive Git-kilder på fastlåste commits. De to første matcher udgivelserne med samme version. Skillquiver 2.2.0 er en kildeversion efter udgivelsestagget 2.1.0.

Codex Advisor 1.4.11 kommer fra udgiverens tag og kræver Codex, Python, jq og en POSIX-shell til konsultationer. [Udgiverens version](https://github.com/dave-schmidt-dev/advisor/tree/v1.4.11)

De 16 pakker, der ligger i dette repository, indlæses via relative stier i det installerede Marketplace. Codex kan derfor genbruge katalogets download til hver af de pakker. Eksterne pakker bevarer deres originale Git-kilder og fastlåste revisioner.

## Claude Desktop og Claude Code

Claude Desktop og Claude Code kan bruge samme GitHub-repository. Claude-kataloget viser de lokale plugins, der kan indlæses uden Codex’ App-forbindelser. Brug `WinRecoveryProject/PluginMarketplace` i Claude Desktop eller kør `claude plugin marketplace add WinRecoveryProject/PluginMarketplace` i Claude Code.

Kataloget omfatter også Codex Dev Workflows, Codex Engineering Guardrails og CodeRabbit. Codex Process Jobs er bevidst kun i Codex-kataloget: den bygger på Codex' kørsel og afsluttende meddelelser. CodeRabbit kræver sin egen fungerende CLI og forbindelse. Git-kilder med Codex-specifikke Apps, hooks eller værktøjer kræver en Claude-integration, før de kan levere de funktioner dér.

WinRecoveryProject DevSuite 0.4.0 tilbyder seks lokale arbejdsgange og en startguide i Claude; `devsuite-review` samler kodegennemgang, verifikation og kvalitetskontrol, og `devsuite-planning` samler opdagelse, interview, spec, plan, tickets, spørgeskemaer, mål og kortlægning. Installér via `claude plugin install winrecoveryproject-devsuite@winrecoveryproject-digital`. Codex-forbundne arbejdsgange bruger fortsat deres eksisterende plugin og App-forbindelser. [Kilde og testvejledning](https://github.com/WinRecoveryProject/WinRecoveryProject-DevSuite/tree/main/editors/claude)

Zilvereyes Context Handoff bruger samme Python 3-hjælper i begge kataloger. Claude-skillen opretter og kontrollerer en lokal Markdown-pakke til overdragelse af en opgave. Installér via `claude plugin install zilvereyes-context-handoff@winrecoveryproject-digital`. Codex-versionen håndterer sine eksisterende hooks og chats. [Claude-pakken](./claude-plugins/zilvereyes-context-handoff)

OneDrive 1.2.2 til lokal Claude Code bruger den eksisterende OneDrive-server og har en skill til at verificere Microsoft-kontoen og drevet før filhandlinger. Installér via `claude plugin install onedrive@winrecoveryproject-digital`. Brug `/mcp` til at forbinde den lokale klient med dens eget Microsoft-samtykke. Pakkens versionsnoter om VS Code beskriver broker 0.3.4. Broker 0.3.5 og den aktuelle kompatibilitet er dokumenteret i kontokontrollen. [Claude-pakken](./claude-plugins/onedrive) · [Aktuel broker- og kontokontrol](docs/onedrive-unification-20261116.md)

Claude henter Skillquiver 2.2.0 fra udgiverens native Claude-pakke på den fastlåste kildecommit med 24 skills. Claude henter Skill Craft 1.3.0 direkte fra udgiverens pakkemappe og Vercels egen `vercel-plugin` 0.56.0 direkte fra udgivelsens commit. Vercel-pakken indeholder udgiverens kommandoer, skills, sessionshooks med skill-telemetri og officielle MCP-server. Pakken kræver Node.js og Bun til udgiverens værktøjer. Kontofunktionerne bruger Vercels OAuth i Claude. [Skill Craft](https://github.com/MuhammadBahaa/majarrah-marketplace/tree/4b22ec0e2645ce30059cfa7f35d37b03b60498f9/plugins/skill-craft) · [Vercel](https://github.com/vercel/vercel-plugin/tree/v0.56.0)

Kør `node scripts/claude-marketplace.mjs --write`, når en pakke får en ny version. `--check` kontrollerer det genererede katalog lokalt. `--verify-sources` kontrollerer også de låste kataloger og manifester hos udgiverne. Kør derefter `claude plugin validate .`.

## Visual Studio Code

OneDrive 1.2.2 registrerer den eksisterende OneDrive-server i VS Codes native MCP-liste. Udvidelsen er testet i VS Code 1.146. Første forbindelse bruger Microsoft-samtykke i VS Code. [Download VSIX](https://github.com/WinRecoveryProject/PluginMarketplace/releases/download/onedrive-vscode-v1.2.2/onedrive-1.2.2.vsix) · [Kilde](editors/vscode-onedrive)

WinRecoveryProjectLinter 0.1.6 bruger samme lintmotor som CLI-udgaven og viser fund i Problems og checkerdækning i Output. [Download VSIX](https://github.com/WinRecoveryProject/WinRecoveryProjectLinter/releases/download/v0.1.6/winrecoveryproject-linter-0.1.6.vsix) · [Kilde og byggevejledning](https://github.com/WinRecoveryProject/WinRecoveryProjectLinter/tree/main/editors/vscode)

WinRecoveryProject DevSuite 0.2.7 bruger Python til at åbne pakkens workflowguides og viser den lokale Doctor-kontrol i Output. [Download VSIX](https://github.com/WinRecoveryProject/WinRecoveryProject-DevSuite/releases/download/v0.2.7/winrecoveryproject-devsuite-0.2.7.vsix) · [Kilde og byggevejledning](https://github.com/WinRecoveryProject/WinRecoveryProject-DevSuite/tree/main/editors/vscode)

Plugin-Skill-Studio 0.3.31 gennemgår en valgt lokal plugin- eller skill-mappe og viser statiske fund med fil og linjenummer i Output. Det kræver VS Code 1.96 eller nyere. Hent VSIX-filen med den eksisterende GitHub-adgang til Studio-repoet. [Download VSIX](https://github.com/WinRecoveryProject/Zilvereyes-Plugin-Studio/releases/download/vscode-v0.3.31/plugin-skill-studio-0.3.31.vsix) · [Kilde og byggevejledning](https://github.com/WinRecoveryProject/Zilvereyes-Plugin-Studio/tree/vscode-v0.3.31/editors/vscode)

VS Code kan også læse Claude-kataloget direkte som agent-plugins (preview). Slå `chat.plugins.enabled` til, og tilføj `WinRecoveryProject/PluginMarketplace` i `chat.plugins.marketplaces` eller via Configure Marketplaces i Agent Customizations. Efter bekræftelse af tillid vises Claude-pakkerne i kataloget. Kun selve visningen i kataloget er kontrolleret. Det er ikke kontrolleret, at alle skills, kommandoer og hooks indlæses i VS Code. Pakker uden Claude-post (Codex-only) vises ikke.

## Struktur

- `.agents/plugins/marketplace.json` er Codex-kataloget. `.claude-plugin/marketplace.json` er Claude-kataloget.
- `plugins/` indeholder versionsfrosne, selvstændigt installerbare pluginpakker.
- De selvstændige kilde-repositories bevares. `plugin-sources.lock.json` fastlåser commit og filhash for deres marketplace-snapshots; se [kildeoversigten](docs/marketplace-sources-20261102.md).
- `cloudstorage-portal-local` er udgået og fjernet fra både kataloget og den publicerede pakkemappe. OneDrive og CloudStorage Portal er de to aktive cloudpakker.
- `plugin-eval` er udgået af kataloget. Motoren og dens tests er portet ind i Plugin-Skill-Studio (`studio-quality`, eval-tilstand, `scripts/plugin-eval.js`), og hver evne er dokumenteret i `plugins/plugin-skill-studio/references/consolidation/lifecycle-matrix.json`. OpenAIs original findes fortsat i OpenAIs eget katalog.
- OpenAI-ejede publiceringsposter bruger en direkte `git-subdir`-reference til `https://github.com/openai/plugins.git`; en bevaret lokal sammenligningsmappe er ikke publiceringskilden.
- `docs/onedrive-skills-inventory.md` dokumenterer de lokale OneDrive-relaterede skills, som ikke automatisk er separate plugins.
- `docs/consolidation-audit-2026-10-25.md` fastlægger de kanoniske kilder og den sikre oprydningsrækkefølge.
- `docs/skill-evaluation-2026-10-25.md` sammenligner Plugin Eval-resultater med den faktiske CloudStorage-arkitektur.
- `docs/provider-architecture-comparison-2026-10-25.md` beskriver Dropbox/Google Drive-mønstret og en kontrolleret vej til færre OneDrive-grænseflader.
- `docs/codex-mcp-config-audit-2026-10-25.md` er en historisk gennemgang af daværende runtime- og udviklingsruter. Den aktuelle Portal har ingen separat MCP-runtime; brug slutverifikationen ovenfor.
- `docs/plugin-worklist-2026-10-25.md` fastholder hele arbejdslisten og skelner mellem Codex-kilder, referencer, kandidater, installationer og publicering.
- `docs/external-plugin-sources.md` dokumenterer eksterne `git-subdir`-poster og bevarer den oprindelige udgiver som kilde.

## Validering

Kør repositoryets målrettede kontrol før commit, publicering eller markedspladsopgradering:

```powershell
node .\validate-marketplace.mjs
```

Kontrollen kræver blandt andet, at `.agents/plugins/marketplace.json` er udfoldet med to indrykningsmellemrum. En kompakt énlinje- eller delvist sammenklappet udgave bliver afvist.

## App- og OAuth-identitet

Codex App-ID'er som `asdk_app_...` og `connector_...` kommer fra eksisterende Codex App-bindinger. Microsoft Entra application/client-ID'er er separate OAuth-identiteter. Marketplace-pakken OneDrive 1.2.2 samler den eksisterende registrerede App, ikonet og to skills. Appen bruger den hostede OneDrive-broker. Det portable eksportmanifest ligger i `references/portable-plugin.json`. CloudStorage Portal samler de eksisterende Dropbox-, Google Drive- og OneDrive-App-bindinger. Marketplace-OneDrive og CloudStorage Portal henviser begge til den registrerede OneDrive-App i Personlig. App-kortet under **Personlige → Oprettet af dig** administrerer dens forbindelse. [Aktuel broker- og kontokontrol](docs/onedrive-unification-20261116.md)

I Business har den eksisterende OneDrive-post under arbejdsområdefanen sin egen App-registrering. Det var den post, der bestod læse- og skrivetesten i Business Work med den eksisterende Microsoft-forbindelse. Begge Marketplace-pakker beholder den personlige App-reference i Business. Den native Business-kontrol på ASUS viste arbejdsområdets OneDrive-App som tilgængelig til værktøjskald. Den personlige App var fraværende i den aktive Business-appoversigt. Vælg OneDrive under arbejdsområdets katalogfane til filopgaver i Business.

## Konsolideringspolitik

- Denne Git-markedsplads er kataloget for Zilvereyes-pakkerne og udvalgte eksterne originalkilder. Zilvereyes-pakker vedligeholdes lokalt; OpenAI-pakker peger direkte på OpenAIs repository.
- En bevaret upstream-reference er ikke automatisk et Zilvereyes-plugin. Den publiceres først efter en reel, licenskompatibel afledning med egen identitet, funktion og dokumenteret provenance.
- Officielle Dropbox- og Google Drive-pakker kopieres ikke ind som selvstændige Zilvereyes-plugins. De bruges som verificerede App-afhængigheder og som versionsfrosne skills i CloudStorage Portal.
- Mapper under `.codex/plugins/cache` er installationscache, ikke redigerbare kilder.
- Ældre eksport- og sammenligningsmapper bevares som arkiv, men registreres ikke som markedspladser og installeres ikke parallelt.
- En gammel markedsplads eller plugininstallation fjernes først, når den tilsvarende pakke fra denne markedsplads er installeret og dens App-, skill- og MCP-opdagelse er verificeret.

## Egne udviklingsværktøjer

WinRecoveryProjectLinter er et lokalt CLI og plugin med fokuserede sprogkontroller. WinRecoveryProject DevSuite samler udvikling, koordinering, kvalitetskontrol og sikkerhedsarbejde og genbruger faktiske providerforbindelser. Linter er 0.1.6, og DevSuite er 0.2.7. Begge har selvstændige kilderepositories. MegaLinter bevares som dokumenteret designreference uden en installerbar Marketplace-post; eksisterende installationer fjernes ikke.

[Udgivelse og testdækning](docs/product-release-20261116.md) · [Installeret plugin-gennemgang](docs/current-installed-audit-20261116.md).

[Endelig installationskontrol og rettelser](docs/final-installed-audit-20261116.md) · [Verificeret deployment](docs/product-deployment-20261116.json).

CodeRabbit 1.1.7-wrp.1 er vores dokumenterede pakketilpasning af officiel 1.1.6 med bevaret navn, udgiver og ikoner; opdateringsvejledning og skillens ikonstier er rettet. Den gamle værtsleverede 1.1.4-skill forbliver deaktiveret; kun den rettede udgave aktiveres. [Kontrol af installationsrettelsen](docs/coderabbit-installation-repair-20261117.md).
