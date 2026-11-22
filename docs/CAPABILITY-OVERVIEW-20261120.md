# Oversigt over plugins, skills og ressourcer (2026-11-20)

Opgørelsen er målt read-only på grenen `feat/studio-lifecycle-consolidation`. Den dækker de installerede Claude-pakker og kataloget i `plugins/` og `claude-plugins/`. Codex' installationsliste er ikke læst, så Codex-siden er ikke målt. "Tynd" betyder her højst 20 linjer uden egne `references/` eller `scripts/`. Det er et signal, ikke en dom.

## Overblik

| | Pakker | Skills |
|---|---|---|
| Kataloget (Codex `plugins/` og Claude `claude-plugins/`) | 21 | 265 |
| Installeret i Claude | 60 | 505 |
| Unikke skills i alt (pakke + navn) | | 572 |

## Katalogets pakker

| Pakke | Kanal | Version | Skills | Kodefiler | Testfiler | Proveniens |
|---|---|---|---|---|---|---|
| plugin-skill-studio | plugins | 0.4.0 (PR) | 79 | 102 | 28 | låst til eget kilderepo |
| vercel | plugins | 0.56.0-wrp.1 | 66 | 0 | 0 | upstream med lokale patches |
| powershell-workbench | plugins | 0.9.0-beta.6 | 33 | 68 | 1 | låst til eget kilderepo |
| cloudstorage-portal | plugins | 0.9.14 | 16 | 36 | 5 | låst til eget kilderepo |
| winrecoveryproject-devsuite | plugins / claude | 0.2.7 / 0.2.7 | 14 / 8 | 16 / 3 | 5 / 0 | låst til eget kilderepo |
| codex-security | plugins | 0.1.22 | 14 | 37 | 0 | **ingen låsepost** |
| codex-dev-workflows | plugins | 0.4.2 | 12 | 0 | 0 | personligt snapshot (tredjepart) |
| codex-process-jobs | plugins | 0.5.3-wrp.2 | 6 | 17 | 1 | vedligeholdt snapshot |
| winrecoveryproject-linter | plugins / claude | **0.1.6** / 0.1.7 | 2 / 2 | 24 / 12 | 10 / 0 | låst til eget kilderepo |
| onedrive | plugins / claude | **1.2.2** / 1.2.3 | 2 / 1 | 1 / 0 | 0 | ejet i dette repo |
| codex-engineering-guardrails | plugins | 1.1.1 | 2 | 0 | 0 | personligt snapshot (tredjepart) |
| component-forge | plugins | 0.1.3 | 2 | 0 | 0 | låst |
| codex-coordinator | plugins | 0.4.0 | 1 | 5 | 0 | personligt snapshot |
| zilvereyes-context-handoff | plugins / claude | 0.3.5+zilvereyes.1 | 1 / 1 | 2 / 1 | 0 | vedligeholdt snapshot |
| coderabbit | plugins | 1.1.7-wrp.1 | 1 | 0 | 0 | upstream med lokale patches |
| agentmemory-asus | plugins | 1.0.0 | 1 | 0 | 0 | ejet App-wrapper |
| windows-dism-update-docs | plugins | 0.1.4 | 1 | 0 | 0 | låst |

## Installeret i Claude, ud over katalogets pakker

**Allerede opsuget af Plugin-Skill-Studio.** Disse fire er rene dubletter:

- skillquiver 2.2.0 (25 skills)
- skill-craft 1.3.0 (3 skills)
- modern-web-guidance (2 skills)
- auto-research 1.0.0 (1 skill)

Studio har deres indhold med proveniens. Når de er installeret samtidig, kan modellen vælge den gamle kopi.

**Fagpakker uden overlap til dit katalog:**

- tres-finance-plugin (25 skills)
- idmp-plugin (23)
- streaming-skills-plugin (17)
- realize-plugin (9)
- hostinger (7)
- data (10)
- design (7)
- product-management (8)
- slint
- pdf-viewer
- ory-agent-plugin (10)

De udvider, hvad du kan, og bør bevares.

**Generelle arbejdsgangspakker med stort overlap til Studio, DevSuite og hinanden:**

- zizi-skills (36)
- agent-protocols (25 skills, 8 agenter)
- truthstone-practices (6)
- codebase-mentor
- codex-review
- code-review-harness
- code-review-plugin
- code-review (kommando)
- code-simplifier
- code-metrics-tracker
- plugin-pilot
- plugin-manager
- plugin-packaging
- plugin-dev
- cowork-plugin-management

## Overlap på tværs af alt installeret og katalogiseret

| Klynge | Skills | Pakker |
|---|---|---|
| Kodegennemgang og verifikation | 103 | 32 |
| Dokumentation og skrivning | 81 | 25 |
| Planlægning, spec og mål | 65 | 21 |
| Plugin- og skill-forfatterskab | 59 | 15 |
| Design, UI og frontend | 59 | 14 |
| Fejlsøgning | 47 | 20 |
| Research | 38 | 10 |
| Test og TDD | 33 | 15 |
| Handoff, genoptagelse og session | 33 | 17 |
| Sikkerhed | 31 | 12 |
| Refaktorering og kodekvalitet | 31 | 17 |
| Git, grene og worktrees | 23 | 11 |

Klyngerne er fundet med nøgleord, så én skill kan tælle i flere klynger. Tallene viser, hvor meget samme arbejde dækkes flere gange.

## Hvad der bør opdateres

1. **Studio 0.3.33 → 0.4.0 installeret.** Først når PR'erne er merget: WinRecoveryProject/Zilvereyes-Plugin-Studio#1 og WinRecoveryProject/PluginMarketplace#3.
2. **Codex-kanalen halter efter Claude-kanalen:** Linter 0.1.6 mod 0.1.7, og OneDrive 1.2.2 mod 1.2.3. Hæv Codex-pakkerne til samme version.
3. **CodeRabbit er installeret i to versioner:** upstream 1.2.0 og katalogets patchede 1.1.7-wrp.1. Ret katalogets patch ind på 1.2.0, og behold kun én installation.
4. **codex-security mangler låsepost i `plugin-sources.lock.json`.** Den har 37 kodefiler, men ingen fastlåst kilde og ingen tests. Proveniensen bør låses som for de øvrige pakker.
5. **Fire dubletter er installeret ved siden af Studio:** skillquiver, skill-craft, modern-web-guidance og auto-research. Afinstaller dem, når Studio 0.4.0 er installeret. Det gør du selv. Studio dækker dem.
6. **Den portede plugin-eval-motor læser `~/.codex`-caches** til sin budget-baseline. Det gør den langsom på maskiner med store caches. Gør scanningen opt-in.

## Hvad der bør maksimeres frem for at skæres ned

Målet er mere dybde pr. skill, ikke bare færre skills. Hver sammenlægning bruger en evne-matrix, så summen bevares, og ingen evne kasseres uden dit ja.

1. **Gør tekst til motorer, hvor reglerne kan måles.**
   - Studio har allerede motorer bag eval, risiko, matrix og autoresearch.
   - DevSuite (`scripts/devsuite.py`), Linter, Process Jobs og CloudStorage Portal har også kode.
   - De rene tekstpakker har ingen kode, og deres regler kan ikke testes: codex-dev-workflows, guardrails, coderabbit, vercel, agentmemory og component-forge.
   - Prioritér review/verifikation, fordi den klynge er størst.
2. **Gør gentagne indpakninger parametriske.**
   - PowerShell Workbench har 19 docs-skills (`lua-docs`, `json-docs` osv.) med samme tekst og kun forskellig sprogpost.
   - Én `language-docs`-skill med sprog som parameter giver samme dækning og fjerner 18 trigger-beskrivelser fra konteksten. Kataloget i `assets/` bevares fuldt.
3. **Test det, der har kode:**
   - codex-security: 37 kodefiler, 0 tests.
   - PowerShell Workbench: 68 kodefiler, 1 test.
   - Claude-kanalerne af DevSuite og Linter: 0 tests.
   - Brug `studio-quality` improve med låste benchmark-opgaver til at måle skills, før de ændres.
4. **Saml klyngerne, så summen bevares.** Rækkefølgen efter størrelse:
   1. review/verifikation, med DevSuite som vært
   2. planlægning/spec
   3. fejlsøgning
   4. handoff/genoptagelse
   5. test
   6. research

   Tredjeparts-snapshots bevares uændrede, indtil alle deres skills er opsuget. Først derefter udfases de som helhed, sådan som det skete for plugin-eval.
5. **Bevar bredden.** Fagpakkerne til finans, IDMP, streaming, Vercel, hosting, data og design er ikke dubletter. De er din bredde og skal ikke skæres ned.
6. **Gør triggerne skarpere frem for at fjerne skills.** Hvor en skill er dækket to steder, får den bedste version de fælles trigger-ord og en `Do NOT use for…`-grænse. Det reducerer fejlvalg uden at fjerne evner.

## Begrænsninger

- Codex' installationsliste (`codex plugin list --json`) er ikke læst, så Codex-siden er ikke målt.
- Klyngerne er nøgleordsbaserede og kan både over- og undertælle.
- Kode- og testtal er filoptællinger. De siger intet om kvalitet eller testdækning.
- Upstream-versioner for tredjepartspakker er ikke slået op på nettet.
