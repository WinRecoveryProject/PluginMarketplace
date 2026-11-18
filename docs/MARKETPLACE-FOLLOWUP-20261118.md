# Plugin-Skill-Studio-opfølgning — 18. november 2026

Den personlige konto er afstemt med Plugin-Skill-Studio 0.3.10: **74 CLI-poster og
2 yderligere personlige remote-poster**, i alt **76 eksakte plugin-identiteter**.
Der er 29 Apps og 481 registrerede skillstier; alle 28 selvstændige skill-filer er
fundet. Det indledende MCP-statusopslag viste syv servere; se den efterfølgende
fulde status nedenfor. Der er ingen skill-indlæsningsfejl eller versionskonflikter.
Apps, produkter og namespace-specifikke installationer tælles hver for sig.

## Rettelser

| Pakke | Version | Resultat |
| --- | --- | --- |
| PowerShell Workbench | 0.9.0-beta.5 | Typede, attributterede og tuple-tildelinger til beskyttede automatiske variabler bliver nu fundet. Lovlige RHS-, indeks- og member-læsninger forbliver tilladt. |
| WinRecoveryProject DevSuite | 0.2.1 | Eksplicitte Jobs/Tasks-bestillinger beholder den rette arbejdsgang, også når workload indeholder test/fix/implement. Negationer og arbejde på integrationskoden starter ikke en execution-rute. |
| CloudStorage Portal | 0.9.6 | Dødt kontraktlink repareret; udfaset Local-dokumentation er tydeligt historisk. Eksisterende App- og providerbindinger er bevaret. |
| Codex Process Jobs | 0.5.3-wrp.2 | Den distribuerede README linker til den eksisterende upstream-releasevejledning. Dette er en dokumentationsrettelse i den tydeligt markerede WRP-vedligeholdelsesudgave; ingen controller eller eksisterende jobs ændres. |
| AgentMemory-ASUS | 1.0.0 | Ny selvstændigt forfattet Marketplace-wrapper med ét fokuseret workflow og egne assets. Den genbruger den allerede eksisterende App-identitet og tilføjer ingen MCP-server eller forbindelse. |

AgentMemory-ASUS-katalogposten opretter eller genudgiver ikke den oprindelige
private App. MIT-licensen omfatter den nye wrapper, dokumentation og workflow;
den eksterne App/server beholder sine egne vilkår. Wrapperen er en katalogtilføjelse,
ikke en automatisk ekstra installation. Marketplace har nu **33 poster**. MegaLinter
forbliver en installeret reference uden en Marketplace-post.

README'ens tidligere aktuelle 61+7-opgørelse er mærket historisk, og de forskellige
Linter-/DevSuite-versioner står nu hver for sig.

## Praktisk kontrol

- Workbench: fire falske PASS reproduceret før rettelsen på PowerShell 5.1 og 7.
  Efter rettelsen består de uafhængige reproduktionscases og 11 regressionstilfælde
  pr. runtime samt throw-mode, pipelineaggregation og eksisterende context-kontrakter.
- DevSuite: 32 pakketests og 79 uafhængige lokale kontroller består. App-binding,
  execution-helper og eksisterende ikoner er bevaret. Ingen remote Codex-opgave
  eller betalt compute blev startet.
- Installeret Linter 0.1.1 er klargjort med produktets eksplicitte, låste gratis
  afhængigheder. 41 tests, to ekstra adfærdsprøver og tre CLI-exitkontrakter består
  direkte i installationen på tværs af alle 15 sprogfamilier. Lua 5.1, XML-DTD-afvisning,
  TOC-referencer og manglende kildeeksekvering er afprøvet. Dette er dokumenteret
  parser-/lintdækning, ikke fulde framework-builds eller XML-schema-validering.
- Portalens eksisterende hybrid-kontrakt og boundary-test består; 54 lokale links
  har ingen manglende mål. App-bindinger og providerfiler er uændrede.
- AgentMemory består 16 helbredstjek gennem både native MCP og den eksisterende
  ASUS-App. Dette er diagnoseevidens; vilkårlige skrive-/synkroniseringsfunktioner
  er ikke dermed afprøvet.
- Remote Desktop Commander viser de to registrerede computere online.
- Create State krævede genlogin. Efter brugerens genforbindelse lykkes et læsebaseret
  projektopslag med et komplet tomt resultat. Ingen projektressourcer er oprettet.
- Studios lokale Windows-backend kan igen opregne Desktop-vinduer uden at sende input.

## Statiske fund og grænser

Studio har analyseret alle 74 CLI-pakker og 28 selvstændige skill-filer. De to
yderligere private App-poster er kontrolleret gennem native metadata og deres
eksisterende App-bindinger. Fem store pakker er genanalyseret med støttede,
eksplicit udvidede grænser: Browser, Chrome, begge Visualize og MegaLinter.

Alle 82 oprindelige advarsler er konkret gennemgået. De består af 62
dokumentations-/strukturheuristikker, to scanner-regexdefinitioner, 14 negative
testfixturelinjer og fire deterministiske testnøgler. De 14 rå fejl efter udvidet
dækning er også bevaret og kontekstklassificeret: to værtsbundne navnekonventioner,
forsætlige fixtures, pladsholdere, redaktionstestlitteraler, et dokumentationseksempel
og den deaktiverede upstream-CodeRabbit-skill. Den rettede Marketplace-CodeRabbit-skill
er aktiv. Ingen regler er globalt undertrykt og ingen aktiveringsflag er ændret
for at opnå et grønt resultat.

Der er ingen ukendte kontekster i disse signaler. Det er ikke en sikkerhedscertificering
eller en påstand om, at alle funktioner i alle eksterne tjenester er runtime-testet.
Private rå kvitteringer, konto-/enhedsoplysninger og fulde rapporter er ikke publiceret.

## Afgrænsning og udskudt arbejde

Workspace-OneDrives ikon og kontoafhængige binding er efter brugerens bestilling
udskudt til omkring **04.05 den 18. november, Europe/Copenhagen**. De er ikke ændret
i denne opfølgning. Den eksisterende personlige OneDrive- og Entra-forbindelse bevares.

OpenAIs native Computer Use-skærmfangst på den aktuelle Windows-vært er ikke erklæret
repareret. Studios lokale afhjælpning og dens konkrete tests er særskilt evidens.

Budget: **0 kr.** Ingen prøveperiode, credits, ny konto, credential eller betalt
infrastruktur er oprettet. Eksisterende forbindelser og uvedkommende arbejde bevares.

## Efter installationen

Alle fire eksisterende pakker er opdateret til versionerne i tabellen. De 74
CLI-identiteter og den samlede union på 76 installationer er bevaret, inklusive
aktiveringsflag. De samme 29 Apps er eksponeret med uændrede flag; alle 481
eksisterende skillaktiveringer, herunder 22 deaktiveringer, er bevaret. AgentMemory-ASUS
er tilføjet til kataloget uden automatisk installation af wrapperen.

Den installerede DevSuite 0.2.1 består de samme 79 uafhængige kontroller. Installeret
Workbench beta.5 består både de nye automatic-variable-kontrakter og eksisterende
context-kontrakter på PowerShell 5.1 og 7. Den installerede Portal 0.9.6 består den
eksisterende hybrid-/providerbindingkontrol. Den personlige OneDrive-App returnerer
fortsat den forventede personlige profil gennem den eksisterende Primary-forbindelse;
ingen filer er skrevet i denne ekstra forbindelsesprøve.

Efter fuld opdagelse annoncerer værten ni MCP-servere. Alle syv tidligere observerede
servere og deres auth-typer er stadig til stede. De to yderligere statusposter tilhører
de allerede installerede, uændrede Daybreak- og OpenAI Developers-pakker; de er ikke
MCP-servere tilføjet af disse fire pakkeopdateringer. En statusliste er ikke en
konfigurationsændringslog eller bevis for alle serverfunktioners tilgængelighed.

2.037 filhashsammenligninger bekræfter de opdaterede native-payloads i Marketplace,
det konfigurerede katalog og installationerne. Den nye katalogwrappers filer er
sammenlignet mellem Marketplace og det konfigurerede katalog. App-erklæringerne for
OneDrive, Portal og DevSuite er byte-identiske med før opdateringen. Ingen ny
forbindelse, konto, prøveperiode, credits eller betalt infrastruktur er oprettet.
