# CloudStorage Portal: lokal OAuth-runtime

## Aktuel udviklingskandidat: tre platforme og fælles kontorute

0.8.0-dev.10 har tolv MCP-værktøjer. `cloudstorage_execute` er den fælles kontoafgrænsede rute: `root` for Dropbox, Google Drive og OneDrive samt `folder`, `item`, `text` og `search` for OneDrive. Alle kald kræver eksplicit udbyder og `connection_id`; OneDrive-itemkald kræver også `item_id`, mens søgning kræver en afgrænset forespørgsel. De ældre specialværktøjer er bevaret. Browseren bruger samme execute-rute, så UI og MCP ikke har hver sin kontofallback.

Den 21. oktober 2026 opdagede Codex-hostens faktiske MCP-session alle ti værktøjer fra den separat installerede runtime. Samme portalsession holdt én egen Dropbox-forbindelse og én egen OneDrive-forbindelse samtidigt. Identitet og rod blev live-verificeret for begge. OneDrive-mappe og fuld 181-byte `probe.txt` blev læst med matchende SHA256. Se `outputs/OWN-OAUTH-LIVE-VERIFICATION.md`. Google-projektet har nu aktiveret Drive API, en ekstern testmålgruppe med ejerkontoen som eneste testbruger, præcis `drive.readonly` og en Desktop OAuth-klient. Den 23. oktober bekræftede eget Google-login immutable kontoidentitet og læste 12 afgrænsede rodmetadataelementer, inklusive den isolerede testmappe, uden cloudændringer. Genstart/restoration mangler stadig live-verifikation. Dette er ikke bevis for cloudskrivning, flere forskellige konti hos samme udbyder eller en tredje native ChatGPT-appbinding.

Version 0.5.0 indførte det officielle MCP Server SDK 2.3.1 til protokol, værktøjsregistrering og stdio. Egne appregistreringer kræves fortsat til de selvstændige OAuth-forbindelser. Lokal OneDrive-sync-adgang kan bruges uden dem.

Version 0.5.0 tilføjer cloudstorage_list_local_onedrive_folder med argumentet relative_path og en tilsvarende mappevisning i browseren. Angiv eksempelvis Dokumenter eller Codex/2026-10-21; en tom streng viser roden. Hvert kald lister højst 25 direkte navne/typer, følger ikke child-links og åbner intet filindhold. Der er ingen rekursiv scanning, indholdslæsning, skrivning eller sidefortsættelse. Absolutte stier, .., alternate data streams og directory-links afvises, og den kanoniske målsti kontrolleres mod den konfigurerede rod. Kontrollen forudsætter et betroet lokalt filsystem; den er ikke en OS-sandbox mod samtidige ændringer fra en lokal angriber.

Version 0.6.0 har syv værktøjer og 25 automatiske tests, inklusive mappeafgrænsning, junction-escape, klient-ID-opsætning og kontoskift. Pakkens versionsnummer er ikke bevis for lokal installation eller genindlæsning i hosten; kontrollér den særskilte installationskvittering.

## Flere konti og hurtigskift i udviklingskoden

Hver platform kan have flere separate forbindelser i samme lokale session. Tilføj en konto med platformens loginknap, og vælg derefter Brug denne konto. Den valgte konto er separat for Dropbox, Google og OneDrive. cloudstorage_select_account gør det samme gennem MCP med et eksplicit connection_id. Valget ændrer ikke native connectorværktøjers konti og giver ikke nye tilladelser. cloudstorage_read_root kræver fortsat et eksplicit connection_id, så et kontoskift ikke stiltiende kan omdirigere en læsning. Afbrydelse vælger ikke automatisk en anden konto. Gentagne login til samme identitet er separate forbindelser, ikke bevis for flere forskellige konti.

Opsætningsformularen accepterer kun offentlige klient-ID'er. På Windows gemmes de som standard i `%LOCALAPPDATA%/CloudStoragePortal/client-settings.json`, uden for projektet. Miljøvariabler har forrang og kan ikke overskrives gennem formularen. Eksisterende forbindelser skal afbrydes før en platforms registrering ændres. Runtime 0.8.0-dev.8 gemmer kun refresh-grants og tilhørende verificeret kontoidentitet i `%LOCALAPPDATA%/CloudStoragePortal/connections.dpapi.json`; hele payloaden beskyttes med Windows DPAPI for den aktuelle bruger og skrives atomisk. Google Desktop-klientens lokale `client_secret` ligger separat i `%LOCALAPPDATA%/CloudStoragePortal/google-client-secret.dpapi.json` med samme CurrentUser-DPAPI-beskyttelse og vises aldrig af portalen. Adgangstokens gemmes aldrig på disk. Den beskyttede Google-hemmelighed dekrypteres først, når et Google-token faktisk skal udstedes eller fornyes; MCP-håndtryk og status gør det ikke. Efter genstart fornyes tokenet, og udbyderens immutable konto-/driveidentitet skal matche den gemte identitet før første cloudlæsning. Et manglende refresh-token forbliver memory-only. Samtidige Dropbox- og OneDrive-forbindelser er live-verificeret fra den tidligere memory-only runtime; selve genstartsbevarelsen skal live-verificeres efter installation af denne version. Flere forskellige konti hos samme udbyder er endnu ikke live-verificeret. Et påbegyndt OAuth-login har en 30-minutters, engangsbeskyttet state; derefter skal login startes igen fra portalen.

Du skal have Node.js 22 eller nyere. Installer de låste MCP-afhængigheder i runtime-mappen før første MCP-start eller test:

```powershell
npm.cmd ci --ignore-scripts --no-audit --no-fund
```

package-lock.json låser hele det lille afhængighedstræ. Der er ingen globale installationer eller lifecycle-scripts. SDK-serveren og core-pakken er version 2.3.1, og Zod er version 4.6.7. Licenstekster ligger i licenses/. Den selvstændige browserportal kan stadig startes med node server.mjs uden MCP-afhængighederne. Lokal udvikling kræver ingen betalt hosting.

## Hvad runtime kan

Til lokal OneDrive-adgang kan du undlade appregistrering og lade den installerede sync-klient håndtere sit login. En eksplicit `ONEDRIVE_LOCAL_ROOT` har altid forrang, inklusive en eksplicit tom værdi som deaktivering. Når nøglen mangler, udleder Windows-runtime roden fra den første absolutte værdi i `OneDriveConsumer`, `OneDriveCommercial` eller `OneDrive`. Brug den særskilte lokale knap. Kun navne og typer læses; ingen filindhold åbnes. Den faktiske rod C:\Users\zilve\CloudStorage\OneDrive blev afprøvet med 18 elementer. Det bekræfter lokal enumeration, ikke cloudidentitet, synkronisering eller Graph-adgang.

```powershell
$env:ONEDRIVE_LOCAL_ROOT = 'C:\Users\zilve\CloudStorage\OneDrive'
node server.mjs
```

- Én lokal oversigt over Dropbox, Google Drive og OneDrive og flere forbundne konti.
- Authorization Code med S256 PKCE og sessionsbundet, kortlivet engangs-state.
- Udveksling og fornyelse af udbyderspecifikke tokens, inklusive refresh-token-rotation.
- Identitetsopslag og højst 25 filer/mapper i kontoroden pr. læsetest. Yderligere sider hentes ikke.
- Lokal afbrydelse, kontoafgrænsning, CSRF-kontrol og anmodninger til faste udbyderendpoints.

Adgangstokens findes kun i Node-processens hukommelse. På Windows kan et modtaget refresh-token og den verificerede immutable provideridentitet gemmes atomisk i den CurrentUser-DPAPI-beskyttede grantfil. Efter genstart skal grantet først fornyes, og den samme provideridentitet skal genbekræftes, før forbindelsen må bruges. Forbindelser uden refresh-token forbliver memory-only. Lokal afbrydelse fjerner den lokale grant, men tilbagekalder ikke automatisk udbyderens grant; fjern appadgangen i udbyderens kontoindstillinger, hvis den også skal tilbagekaldes dér. Runtime ændrer ingen cloudfiler.

De elleve importerede Dropbox/Google-skills bruger fortsat deres oprindelige connectorværktøjer. Denne broker erstatter dem ikke og leverer kun de operationer, som statusmatricen angiver. Kandidaten er plugin 0.8.0-dev.16 med runtime 0.8.0-dev.10 og tolv værktøjer; den tidligere installerede dev.15/dev.9-udgave har separat direkte håndtryksbevis. En frisk installation og værtsgenindlæsning af dev.16 kræves, før den nye metadatafunktion kan erklæres aktiv i Codex. En lokal loopback-adresse er ikke en offentligt tilgængelig OAuth-server.

## Registrer klienterne

Kildens standardport er 53682. Den installerede Codex-konfiguration bruger 53683. Tabellen viser den installerede opsætning. Brug altid callback fra den faktisk kørende portals status; ændrer du porten, skal registreringerne følge med.

| Udbyder | Registrering | Callback | Miljøvariabler |
| --- | --- | --- | --- |
| Dropbox | Egen scoped Dropbox-app; vælg App folder eller Full Dropbox bevidst | http://127.0.0.1:53683/oauth/dropbox/callback | DROPBOX_CLIENT_ID |
| Google | Eget Cloud-projekt, aktiveret Drive API, consent-konfiguration og OAuth-klient af typen Desktop app | http://127.0.0.1:53683/oauth/google/callback | GOOGLE_CLIENT_ID, eventuelt GOOGLE_CLIENT_SECRET |
| Microsoft | Egen Entra-app, kontotype der omfatter dine personlige/work-school konti, native Mobile and desktop application med loopback-callback | http://127.0.0.1:53683/oauth/onedrive/callback | MICROSOFT_CLIENT_ID |

Microsoft-klienten skal være en native/offentlig klient, ikke en SPA. Hvis registreringssiden ikke accepterer loopback-IP som HTTP-redirect, følg Microsofts dokumenterede manifestvej for loopback-IP. Google Desktop-app bruger loopback-flowet og har ikke samme redirect-registreringsformular som en Web-klient. Googles Desktop-klientværdi kaldet client_secret er ikke en fortrolig serverhemmelighed, men den skal stadig kun indlæses lokalt og aldrig deles i chat.

Dropbox-scopes: account_info.read og files.metadata.read. Google: drive.readonly. Microsoft: User.Read, Files.Read og offline_access. Google-scopet giver bred læseadgang til den valgte kontos Drive; brug personlig udvikling/test og gennemgå samtykket. Runtime beder ikke om skriverettigheder, Docs-/Sheets-/Slides-redigering eller Dropbox-deling/file requests.

For Dropbox App folder viser rodlæsningen kun appens mappe. For Google vises brugerens My Drive-rod, ikke alle Shared Drives. Microsoft læser den valgte brugers standarddrive. Disse afgrænsninger er ikke bevis for adgang til alle cloudområder.

## Start i PowerShell

Åbn en terminal i denne runtime-mappe. Sæt dine egne værdier i processens miljø. Gem ikke rigtige credentials i pluginpakken eller den OneDrive-synkroniserede arbejdsmappe.

```powershell
$env:DROPBOX_CLIENT_ID = 'dit-dropbox-app-key'
$env:GOOGLE_CLIENT_ID = 'dit-desktop-client-id.apps.googleusercontent.com'
$env:GOOGLE_CLIENT_SECRET = Read-Host 'Google Desktop client secret (kun lokalt)'
$env:MICROSOFT_CLIENT_ID = 'dit-microsoft-application-client-id'
node server.mjs
```

Åbn et frisk engangslink fra `cloudstorage_open_portal`. Linket opretter en lokal session; det er ikke et udbydertoken og skal heller ikke deles. Hvert kald udsteder et nyt fem-minutters link til den samme levende brokersession uden at ophæve eksisterende browsercookies eller forbindelser. Vælg Forbind konto for hver udbyder, gennemfør udbyderens login og brug derefter Afprøv læseadgang. En ukonfigureret udbyder vises som manglende registrering; MCP-serveren kan starte og opdage værktøjer uden at binde loginporten.

Login-callback skal åbnes i samme browserprofil som den lokale portalsession. Et nyt engangslink kræver servergenstart. Serveren lytter kun på 127.0.0.1 og må ikke eksponeres gennem tunnel eller netværksproxy. Denne session bruger loopback HTTP; en fremtidig hosted løsning kræver sin egen TLS- og sessionsimplementering.

## Test og bevis

```powershell
npm.cmd test
```

De 56 automatiske tests bruger simulerede udbydersvar og lokale HTTP-servere; de kontakter ikke cloudkonti. De tester PKCE, state-binding, replay, udløb, kontoadskillelse, eksplicit tokenrouting ved hurtigt kontoskift, portalens kontovalg, automatisk fallback ved afbrydelse/genlogin, alle tre læseadaptere, refresh-rotation, samtidige refresh, krypteret connection-store, krypteret Google-klienthemmelighed, genindlæsning og identitetskontrol efter genstart, browserhandoff, portkonflikt, afbrydelse og HTTP-adgangskontrol. DPAPI-rundturen testes desuden mod den aktuelle Windows-bruger. Separat livebevis findes for Dropbox og OneDrive. Først når Google også har gennemført eget login og læsetest, kan tre-platforms læseadgang kaldes live-verificeret.

## Lokal MCP-klient

Start enten `server.mjs` som selvstændig browserportal eller `mcp.mjs` gennem din lokale MCP-host, aldrig begge på samme port. `mcp.mjs` starter stdio med det samme og binder først loginporten ved `cloudstorage_open_portal`; en vedvarende portkonflikt returneres som en portalfejl uden at fjerne MCP-værktøjerne. `mcp-config.example.json` viser en generisk klientkonfiguration. Miljøvariabler skal være tilgængelige for den proces, som hosten starter.

De tolv MCP-værktøjer er `cloudstorage_status`, `cloudstorage_open_portal`, `cloudstorage_execute`, `cloudstorage_read_root`, `cloudstorage_list_onedrive_folder`, `cloudstorage_get_onedrive_item`, `cloudstorage_read_onedrive_text`, `cloudstorage_search_onedrive`, `cloudstorage_read_local_onedrive_root`, `cloudstorage_list_local_onedrive_folder`, `cloudstorage_select_account` og `cloudstorage_disconnect_local`. Start med status, åbn portalens lokale engangslink, og forbind ønskede konti i systembrowseren. Alle nye OAuth-forbindelser kræver deres egne registreringer. Lokal sync-adgang kræver kun den udtrykkeligt konfigurerede rod og erstatter ikke Graph eller de fulde connectorværktøjer.

## Officielle kilder

- https://developers.dropbox.com/oauth-guide
- https://developers.google.com/identity/protocols/oauth2/native-app
- https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-auth-code-flow
- https://learn.microsoft.com/en-us/entra/identity-platform/reply-url
- https://developers.google.com/workspace/drive/api/guides/limits
- https://www.dropbox.com/developers/support

Personlig lokal udvikling er målet for denne version. Lagerabonnementer, offentligt hostede tjenester og eventuelle krav til offentlig appverifikation er separate forhold.
