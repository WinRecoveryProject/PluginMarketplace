# Praktiske prøver med Plugin-Skill-Studio 0.3.7

De lokale produktfejl er rettet og udgivet. Samlet runtime-status er **PARTIAL**, fordi nogle værts-/netværksfunktioner fejler eller ikke er afprøvet.

## Rettelser

- Linter 0.1.1: nul kontroller giver INCOMPLETE; alle 15 sprogfamilier er afprøvet med gyldige og ugyldige fixtures.
- DevSuite 0.1.1: danske quality/review-forespørgsler og fejlformede provider-data håndteres korrekt; 23 tests består.
- Workbench 0.9.0-beta.4: direkte File-start i Windows PowerShell 5.1 kontrollerer de eksplicitte filer; 10 CLI-prøver består på tværs af 5.1 og 7.

OneDrive og Portal bruger fortsat den samme eksisterende App. En separat testfil blev oprettet, genlæst, opdateret og genlæst med korrekt UTF-8 og SHA-256. Testfil og testmappe blev flyttet til papirkurven.

Uafhængige genprøver mod de installerede nye versioner: **40/40 består** — DevSuite/Linter 16 og Workbench 24. Dette er afgrænset regressionsevidens, ikke en godkendelse af alle operationer.

## Begrænsninger

- Agentmemory bestod først, men den eksisterende remote-forbindelse mistede senere DNS-adgang. Indstillinger og credentials er bevaret.
- Computer Use giver timeout ved vindueslisten. Browser kunne læse den delte ChatGPT-side; lokal Visualize-rendering blev afvist af browserpolitikken.
- Process Jobs-controlleren understøtter ikke Windows; logrotationshelperen fejler med EPERM dér. Den eksisterende host-session-rute er bevaret.
- Code Tytor returnerede en browser-executor, ikke et serverkørt Python-resultat.
- Betaling, onboarding, nøglevisning, samtykkeændringer, deling og beskeder blev ikke udført for at opnå et testresultat.

## Dækning pr installation

68 installationsidentiteter er afstemt. Dubletter/aliaser tæller ikke som særskilte produkter. PASS gælder kun den angivne prøve; alle operationer og 561 skill-adfærd er ikke certificeret.

| Installation | Status | Afprøvet eller afgrænset |
| --- | --- | --- |
| `advisor@openai-curated-remote` | NOT_RUN | Instruction/reference or artifact workflow not individually executed in this run; previous static audit is separate evidence. |
| `agentmemory@openai-curated-remote` | FAIL_EXTERNAL | Initial daemon health passed; final live and fresh startup calls failed. Configured remote hostname DNS unavailable; existing settings preserved. |
| `app-695ff43f74488191a418ea8ac4f0f437@openai-curated-remote` | PARTIAL | Code Tytor returned browser Pyodide execution payload; widget execution not observed. |
| `app-69a5a77581c881918f398b27591d685d@openai-curated-remote` | NOT_RUN | Pocket FM playback and recommendation flow not exercised. |
| `app-69b31dc2110c8191b8b47dc98fe5a052@openai-curated-remote` | PASS | Existing Dropbox App returned bounded folder page; writes/sharing not tested. |
| `app-69cd66d6b11081919d55522e4f136fec@openai-curated-remote` | NOT_RUN | Create State persistent saves were not created solely for testing. |
| `app-6a057d268ebc81919918d37eec718425@openai-curated-remote` | PASS | Remote Desktop Commander listed existing devices and read existing configuration; no remote execution or changes. |
| `app-6aa47394ea708191bcef52a7c4bda7a2@openai-curated-remote` | PASS | Knowledge for Agents returned a valid complete no-match search response; no records published. |
| `browser@openai-bundled` | PASS | Read existing user-provided ChatGPT plugin upload page through Browser. Local file render was refused and not bypassed. |
| `chrome@openai-bundled` | NOT_RUN | No connected Chrome browser surface; no browser profile or extension installed. |
| `cloud-environment@openai-curated-remote` | NOT_RUN | No compute environment provisioned; included cost not verified. |
| `cloudstorage-portal@winrecoveryproject-digital` | PARTIAL | Shared existing OneDrive App create/read/update/read/recycle passed. Google Drive and Dropbox read routes passed. Other writes not exercised. |
| `coderabbit@openai-curated-remote` | NOT_RUN | Preserved account/login boundary and disabled upstream skill. No account, trial or paid credits created. |
| `coderabbit@winrecoveryproject-digital` | NOT_RUN | Preserved account/login boundary and disabled upstream skill. No account, trial or paid credits created. |
| `codex-coordinator@created-by-me-remote` | PASS | 20 actual board CLI scenarios on an isolated synthetic fixture; all fixture claims released. |
| `codex-dev-workflows@created-by-me-remote` | PARTIAL | Instruction-only workflow applied during this task; no independent executable helper or blanket model-behavior certification. |
| `codex-engineering-guardrails@created-by-me-remote` | PARTIAL | Instruction-only rules applied; no independent executable helper or blanket behavior certification. |
| `codex-engineering-guardrails@openai-curated-remote` | PARTIAL | Instruction-only rules applied; no independent executable helper or blanket behavior certification. |
| `codex-engineering-guardrails@winrecoveryproject-digital` | PARTIAL | Instruction-only rules applied; no independent executable helper or blanket behavior certification. |
| `codex-process-jobs@created-by-me-remote` | PARTIAL | 19 pure helpers passed; append-descriptor log rotation fails EPERM on Windows. Controller is explicitly unsupported there; existing host-session route and jobs preserved. |
| `codex-security@winrecoveryproject-digital` | PARTIAL | Fresh advisory TAC granted and supporting GitHub/Linear reads passed. No paid/model-backed security scan launched. |
| `component-forge@winrecoveryproject-digital` | PARTIAL | Actual Workbench component register/search/gate and XML rejection fixtures passed; Forge is an instruction workflow rather than a separate runtime. |
| `computer-use@openai-bundled` | FAIL_HOST | @oai/sky imports; list_apps times out. CUA inventory read succeeded but Edge accessibility unavailable. No input sent or security bypass attempted. |
| `defense-factory@openai-curated-remote` | NOT_RUN | Existing disabled/conditional cloud backend preserved; no scan or paid service started. |
| `dev-6ae8b541a3d08191ae893ea0925a2fe5@created-by-me-remote` | PASS | Existing personal OneDrive connection create/read/update/read/recycle passed with exact UTF-8 content and SHA-256 checks. |
| `documents@openai-primary-runtime` | NOT_RUN | Instruction/reference or artifact workflow not individually executed in this run; previous static audit is separate evidence. |
| `dropbox@winrecoveryproject-digital` | PASS | Existing shared Dropbox App and separate Dropbox MCP returned bounded pages; no completeness or write claim. |
| `game-development-studio@openai-curated-remote` | NOT_RUN | Instruction/reference or artifact workflow not individually executed in this run; previous static audit is separate evidence. |
| `github@openai-curated-remote` | PASS | Existing GitHub profile returned; authorized source and Marketplace pushes verified independently against remote main. |
| `github@winrecoveryproject-digital` | PASS | Existing GitHub profile returned; authorized source and Marketplace pushes verified independently against remote main. |
| `gmail@openai-curated-remote` | PASS | Profile and INBOX counts read; no message body read or sent. |
| `google-calendar@openai-curated-remote` | PASS | Profile and calendar metadata read; no event changes. |
| `google-contacts@openai-curated-remote` | PASS | Authenticated profile read; no contact changes. |
| `google-drive@openai-curated-remote` | PASS | Profile, bounded project search and exact existing disposable test-document fetch returned expected text; writes untested. |
| `google-drive@winrecoveryproject-digital` | PASS | Profile, bounded project search and exact existing disposable test-document fetch returned expected text; writes untested. |
| `linear@openai-curated-remote` | PASS | Authenticated self profile and team metadata read; no issue changes. |
| `linear@winrecoveryproject-digital` | PASS | Authenticated self profile and team metadata read; no issue changes. |
| `megalinter@megalinter` | PARTIAL | Previously patched 37 files retained. Current owned focused Linter practical tests do not prove every MegaLinter engine/container. |
| `onedrive@winrecoveryproject-digital` | PASS | Same existing App and personal connection as remote package; exact content round-trip and recycle passed. Business/refresh not forced in this run. |
| `openai-developers@openai-curated-remote` | NOT_RUN | Instruction/reference or artifact workflow not individually executed in this run; previous static audit is separate evidence. |
| `openai-templates@openai-curated-remote` | NOT_RUN | Instruction/reference or artifact workflow not individually executed in this run; previous static audit is separate evidence. |
| `pages@openai-curated-remote` | PASS | Existing space list read through Pages backend; no pages or chats created. |
| `pdf@openai-primary-runtime` | NOT_RUN | Instruction/reference or artifact workflow not individually executed in this run; previous static audit is separate evidence. |
| `plugin-creator-plus@openai-curated-remote` | NOT_RUN | User-selected Studio supersedes this authoring route; original installation preserved. |
| `plugin-creator@openai-curated-remote` | NOT_RUN | User explicitly prefers Studio; no duplicate plugin or new App created for a synthetic test. |
| `plugin-eval@openai-curated-remote` | NOT_RUN | Instruction/reference or artifact workflow not individually executed in this run; previous static audit is separate evidence. |
| `plugin-management@openai-curated-remote` | PASS | Actual full CLI and native catalog/App/MCP/skill inventory used; existing package versions updated without connection replacement. |
| `plugin-skill-studio@created-by-me-remote` | PASS | 0.3.7 routing/policy, independent verification workflow and actual validation/evaluation of all three repaired source packages applied. |
| `plugin-skill-studio@winrecoveryproject-digital` | PASS | 0.3.7 routing/policy, independent verification workflow and actual validation/evaluation of all three repaired source packages applied. |
| `powershell-workbench@winrecoveryproject-digital` | PASS | Reproduced direct -File false pass, fixed it; 10 CLI cases across PS5.1/7 plus both context contracts and structure passed. |
| `presentations@openai-primary-runtime` | NOT_RUN | Instruction/reference or artifact workflow not individually executed in this run; previous static audit is separate evidence. |
| `sharepoint@openai-curated-remote` | PASS | Existing personal profile read. Tenant storage access is outside this probe; no Entra login changes. |
| `sites@openai-curated-remote` | PASS | Existing owned site list returned an empty complete result; no site provisioned/published. |
| `skill-craft@openai-curated-remote` | NOT_RUN | Instruction/reference or artifact workflow not individually executed in this run; previous static audit is separate evidence. |
| `skillquiver@openai-curated-remote` | NOT_RUN | Instruction/reference or artifact workflow not individually executed in this run; previous static audit is separate evidence. |
| `slack@openai-curated-remote` | PASS | Existing workspace metadata list read; no messages read/sent. |
| `spreadsheets@openai-primary-runtime` | NOT_RUN | Instruction/reference or artifact workflow not individually executed in this run; previous static audit is separate evidence. |
| `template-creator@openai-primary-runtime` | NOT_RUN | Instruction/reference or artifact workflow not individually executed in this run; previous static audit is separate evidence. |
| `unified-computer-use@openai-bundled` | PARTIAL | Browser inventory and user-provided plugin page read. File URL blocked by browser policy; Edge native accessibility unavailable. |
| `vercel@openai-curated-remote` | PASS | Existing OneDrive project metadata read; no deployment or billing change. |
| `vercel@winrecoveryproject-digital` | PASS | Existing OneDrive project metadata read; no deployment or billing change. |
| `visualize@openai-bundled` | PARTIAL | Preferred version exported standalone HTML, validated correct/incorrect JS and refused overwrite; browser render unverified. Disabled older fallback preserved. |
| `visualize@openai-curated-remote` | PARTIAL | Preferred version exported standalone HTML, validated correct/incorrect JS and refused overwrite; browser render unverified. Disabled older fallback preserved. |
| `windows-dism-update-docs@winrecoveryproject-digital` | PARTIAL | Local documentation catalog route read; no OS servicing or fresh online research performed. |
| `winrecoveryproject-devsuite@winrecoveryproject-digital` | PASS | Actual routing/provider/report/budget tests; fixes verified by 23 tests and installed CLI regression checks. |
| `winrecoveryproject-linter@winrecoveryproject-digital` | PASS | All 15 language families tested good/bad; Lua5.1, XML DTD, TOC and non-execution checked. Empty/no-matching selection false CLEAN fixed. |
| `work-pets@openai-curated-remote` | PASS | Existing animated pets listed; no pet activation or generation. |
| `zilvereyes-context-handoff@created-by-me-remote` | PASS | Actual valid and invalid handoff fixtures validated; no chat lifecycle changes. |

Maskinrapport: [PRACTICAL-STUDIO037-20261117.json](PRACTICAL-STUDIO037-20261117.json). Rå kontodata, private stier, logs og screenshots er ikke medtaget. Budget: 0 kr.
