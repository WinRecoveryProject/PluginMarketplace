# Plugin files: cloudstorage-portal — manifests and top-level files

Source: `plugins/cloudstorage-portal`. Files outside the `skills/*` folders, embedded as text.

## File: `.app.json`

```json
{
  "apps": {
    "dropbox": {
      "id": "asdk_app_69b31dc2110c8191b8b47dc98fe5a052"
    },
    "google-drive": {
      "id": "connector_5f3c8c41a1e54ad7a76272c89e2554fa"
    },
    "onedrive": {
      "id": "asdk_app_6ae8b541a3d08191ae893ea0925a2fe5"
    }
  }
}
```

## File: `.gitattributes`

```text
# Preserve exact package bytes, including the upstream provider provenance hashes.
* -text
```

## File: `BUILD-NEXT.md`

### Tre platforme fra integrationsmodellens bund

#### Separat OneDrive HTTPS-MCP-kandidat

Den lokale pakke beholder Dropbox og Google Drive som native App-bindinger. OneDrive må ikke omdøbes fra SharePoint eller låne en anden connectors identitet. En clean-room, deploy-klar HTTPS-kandidat ligger derfor i `../cloudstorage-onedrive-remote` og annoncerer MCP-servernavnet `onedrive`.

Kandidaten bruger to adskilte Microsoft Entra-appregistreringer ejet af brugeren og dokumenterede Microsoft identity platform-/Graph-endpoints. API-/middle-tier-registreringen ejer MCP'ens `access_as_user`-scope, Graph-rettighederne og Vercel-hemmeligheden. En separat værtsklient ejer plugin-login og den host-genererede callback. Serveren validerer både værtsklient, API-audience, tenant, scope og udløb og udveksler derefter tokenet server-side gennem Microsoft On-Behalf-Of til et separat Graph-token. Graph-tokenet sendes aldrig tilbage til værten. Fire read-only værktøjer tilbyder kontoidentitet, rod, mappe og afgrænset tekstlæsning. Der er ingen cloudskrivning og ingen kopierede providercredentials.

Før den kan erstatte den lokale stdio-reference i det private webplugin, mangler eksterne handlinger i denne rækkefølge: eksponer `access_as_user` på den eksisterende API-registrering, opret en separat værtsklientregistrering, giv værtsklienten delegeret adgang til API-scope'et, opret en tidsbegrænset API-credential direkte hos Microsoft, opret Vercel-projektet, sæt `MICROSOFT_API_CLIENT_ID`, `MICROSOFT_API_CLIENT_SECRET`, `MICROSOFT_HOST_CLIENT_ID` og den endelige `MCP_PUBLIC_URL` direkte i Vercel, registrer den callback-adresse som ChatGPT/Codex viser på værtsklienten og gennemfør Microsoft-samtykket. Hvis værten kræver en client secret, skal den være en separat værtsklient-credential og må kun indtastes i værtsforbindelsen. Først efter live tool discovery opdateres pluginets `mcp.json` til den verificerede HTTPS-URL. Ingen placeholder-URL eller secret må publiceres.

`scripts/write-remote-onedrive-mcp.mjs` producerer den endelige remote `mcp.json` fra en præcis, verificeret `https://*.vercel.app/mcp`-adresse samt to forskellige, gyldige app-ID'er. Generatoren låser servernavnet til `onedrive`, placerer kun værtsklientens ID i OAuth-klientfeltet, anmoder om API-registreringens `access_as_user`-scope samt `offline_access`, og afviser identiske eller ugyldige app-ID'er, placeholders, credentials i URL'en, query/fragment, forkert sti og ikke-godkendte værtsdomæner. Graphs `User.Read` og `Files.Read` gives kun til middle-tier appen og anvendes kun ved OBO-udvekslingen. Generatoren skriver aldrig over en eksisterende fil og pakker aldrig credentialværdier.

Dette er en separat lokal kandidat i brugerens nye arbejdsmappe. Publiceret CloudStorage Portal 0.6.2, native appforbindelser og credentials er ikke erstattet. Pluginidentiteten bevares i kandidatmanifestet; der er ikke oprettet et nyt account-plugin. Kandidaten installeres gennem en isoleret lokal Codex-markedsplads som `cloudstorage-portal@cloudstorage-local`; pluginpakken er version 0.8.0-dev.16 og den indlejrede runtime er version 0.8.0-dev.10.

#### Implementeret første byggelag

runtime/platforms.mjs er nu fælles sandhedskilde for Dropbox, Google Drive og OneDrive: navn, offentlig klient-ID-konfiguration, OAuth-endpoints/scopes, identitetskrav, egne implementerede operationer, native appreferencer og de elleve providerworkflows. Provideradapterne, brokerens identitetsvalidering og status samt browserens visning anvender denne model. OneDrive har samme status som de to andre i modellen, men får ikke et opdigtet host-app-ID. Da kataloget kun tilbyder Microsofts canonical `SharePoint`-App og ikke en canonical `OneDrive`-App, deklareres vores faktiske Graph-runtime som MCP-serveren `onedrive`. Det bevarer navnet OneDrive og giver en ægte hostintegration uden at udgive SharePoint som OneDrive. Dropbox og Google Drive forbliver native App-bindinger.

De eksisterende, afprøvede komponenter til PKCE/state, separate grants, session-/kontobinding, hurtigskift, lokal sync og Graph mappe/tekst er genbrugt. Genopbygning betyder her en ny sammenhængende integrationsmodel, ikke at korrekt afprøvet OAuth-kode kasseres og skrives uprøvet om.

Kandidaten har pluginversion 0.8.0-dev.16 og runtimeversion 0.8.0-dev.10. Den hybride lokale pluginpakke bevarer begge native App-bindinger, alle 14 skills og deklarerer den lokale Graph-integration som MCP-serveren `onedrive`. Runtime 0.8.0-dev.10 bevarer DPAPI-beskyttet refresh-grant-lagring, behovsindlæst Google Desktop-klienthemmelighed, identitetsgenvalidering, 30-minutters OAuth-state og Windows-autodetektion af lokal sync-rod. Den clean-room personlige OneDrive-del er udledt af SharePoint-connectorens observerbare Graph-kontrakter, men er implementeret under vores egen `onedrive`-identitet: afgrænset søgning, eksakt fil-/mappemetadata, mappevisning og tekstlæsning. Eksakt metadata og mappevisning afviser fremmede drev og remote shortcuts og returnerer ingen capability-URL'er. Google-grantets faktiske stop/genstart, tokenfornyelse, immutable identitetsmatch og nye rodlæsning er live-verificeret. Dropbox- og OneDrive-grants skal stadig have samme live genstartsbevis separat.

#### Samlingsrækkefølge

1. Fælles tre-platformskontrakt og bevarede workflows: implementeret og testet.
2. Fælles kontoregister for egne brokerforbindelser: implementeret i account-directory.mjs og koblet til status/browser. Samme immutable identitet grupperer gentagne login uden at overskrive separate forbindelser/grants. Provider, subject-kind, tenant og drev holdes adskilt; samme e-mail er ikke en fælles konto. Kun den aktuelle sessions forbindelser medtages, og tokens returneres ikke. Native connector-konti er endnu ikke integreret og må ikke erklæres aktive ud fra et app-ID alene.
3. Én operationsoverflade med eksplicit provider, konto og kapabilitet: implementeret som Broker.executeAccountOperation, HTTP execute-ruten og det nye tiende MCP-værktøj cloudstorage_execute. Browserens rod-/OneDrive-itemknapper bruger samme rute. Eksisterende specialværktøjer er bevaret. Provider mismatch, fremmede sessioner, ukendte operationer og uimplementerede kapabiliteter afvises. Native værktøjsbro mangler stadig.
4. Sikkert vedvarende login samt faktiske fler-konto-/refresh-tests: Windows CurrentUser-DPAPI-lagring, atomisk rotation, identity-revalidation og automatiske genstartstests er implementeret. Faktisk stop/genstart med en live providergrant og live flere forskellige konti hos samme udbyder mangler fortsat.
5. Understøttet lokal hostregistrering: implementeret som et hybridplugin med `apps` og `mcpServers` i samme kompatibilitetsmanifest, installeret via Codex' lokale markedsplads. Den faste portable `mcp.json` er også pakket, bruger `${PLUGIN_ROOT}` til et kaldestedsuafhængigt entrypoint og er begrænset til Codex-loaderens accepterede `type`, `command`, `args`, `env` og `cwd`-felter. Dropbox- og Google Drive-bindingerne er bevaret; OneDrive leveres af den særskilte lokale Graph-MCP. Dev.16-installationen opdager tolv værktøjer direkte; frisk Codex-hostopdagelse af dev.16 mangler endnu.
6. Samlet live-accept, installation og udgivelse: Dropbox og OneDrive er live-verificeret gennem den tidligere side-by-side MCP i samme portalsession. Hybridpluginet er lokalt installeret, dets 14 skills er synlige i Codex' modelinput, og Codex app-serveren har tidligere opdaget de daværende 10 værktøjer med korrekt plugin-ID og serveridentitet. Google Drive API, testmålgruppe, ejer-testbruger, `drive.readonly`, Desktop OAuth-klient, lokal DPAPI-konfiguration, eget Google-login, immutable kontoidentitet, afgrænset rodlæsning og live genstartsbevarelse er nu gennemført. Aktuel Codex-hostindlæsning af dev.16 med alle 12 værktøjer, live søgning/eksakt metadata, særskilt restart-bevis for Dropbox/OneDrive og opdatering af den eksisterende remote pluginudgivelse mangler fortsat; tre kort alene tæller ikke som accept.

Der er ingen ny cloudadgang, skrivning, deling eller sletning i dette byggetrin. Brugerens Microsoft-klient-ID, Google-klienthemmelighed og provider-tokens er ikke kopieret ind i kandidatpakken. Offentlige klient-ID'er indlæses fra den eksisterende lokale opsætning ved faktisk start. Adgangstokens holdes kun i processens hukommelse; kvalificerede refresh-grants og den lokale Google Desktop-klienthemmelighed gemmes separat med Windows CurrentUser-DPAPI uden for pluginpakken.

#### Seneste test- og livestatus

Efter hostgenstart opdagede Codex alle ti værktøjer fra den installerede runtime. `cloudstorage_status`, `cloudstorage_open_portal` og `cloudstorage_execute` blev kaldt direkte gennem hosten. Egen Dropbox OAuth blev godkendt med `account_info.read` og `files.metadata.read`; identitet og rod blev verificeret. Egen OneDrive OAuth blev derefter genoptaget i samme brokersession; identitet, rod, den isolerede testmappe og den fulde 181-byte tekstprobe blev verificeret. Google Cloud-projektet har branding i testtilstand, ejerkonto som eneste testbruger, aktiveret Drive API, præcis `drive.readonly`, Desktop-klient og lokal DPAPI-konfiguration. Eget Google-login bekræftede immutable drive-permission-identitet og læste 12 rodmetadataelementer, inklusive den isolerede testmappe, uden cloudændringer. Genstart/restoration skal stadig bevises live.

Systembrowser-handoff er implementeret: cloudstorage_open_portal udsteder et nyt privat engangslink til den samme eksisterende brokersession, også efter første link er brugt. Linket udløber efter fem minutter, erstatter et eventuelt ubrugt link og ophæver ikke eksisterende browsercookies eller forbindelser. Kun MCP-/proceskald kan udstede linket; der er ingen anonym HTTP-rute til udstedelse. Sessions-, Origin-, CSRF- og callback/state-kontroller bevares. En udløbet session kan ikke genoplives. Browserhandoff kører nu i den aktive installerede MCP-proces og blev brugt til det live-verificerede Dropbox-login.

Efter konto-/routerlaget bestod hele kandidatens suite med 45 tests, nul fejl. De første fulde tests afslørede to ældre fixtures, der oprettede OneDrive-forbindelser uden drevidentitet. Fixtures blev rettet til at følge den nye identitetskontrakt; produktvalideringen blev ikke svækket. Fler-kontolaget er siden skærpet, så hver eksplicit valgt forbindelse bruger sit eget token, udløbne forbindelser ikke kan vælges, portalens kontokort kun tilbyder gyldige skift, og en anden forbundet konto af samme platform automatisk vælges, når den aktive forbindelse afbrydes eller kræver nyt login. Den nuværende fulde suite har 60 tests, nul fejl, inklusive faktisk Windows-DPAPI-rundtur, separat krypteret provider-secret-store, behovsindlæsning af Google-hemmeligheden, OneDrive-søgning, eksakt metadata og genvejs-/cross-drive-filtrering. Tests for tre-provider-dispatch, søgning og metadata bruger simulerede udbydersvar; de to nye OneDrive-kald mangler fortsat live bevis.

De elleve importerede Dropbox-/Google-workflows har desuden fået en separat native-provider live-audit gennem de eksisterende Dropbox- og Google Drive-appforbindelser. Alle elleve gennemførte deres læsende discovery-/groundingsti mod de isolerede testartefakter. Auditten oprettede eller ændrede intet og må derfor ikke forveksles med nyt skrivebevis eller med Google-login gennem vores egen OAuth-broker. Detaljerne står i `outputs/NATIVE-WORKFLOW-LIVE-AUDIT.md`.

Det aktuelle Codex-værktøjskatalog er nu også verificeret maskinelt mod den installerede pakke. `scripts/verify-provider-workflows.mjs` læser de seks Dropbox-skills' deklarerede værktøjslister og et eksplicit minimumskatalog for de fem Google Drive/Docs/Sheets/Slides/comments-workflows. Kvitteringen `outputs/INSTALLED-NATIVE-WORKFLOW-AVAILABILITY.json` bekræfter præcis 11 importerede workflows, 29 indlæste Dropbox-værktøjer, 45 indlæste Google Drive-værktøjer og nul manglende krav. Kontrollen læser kun skillfiler og værktøjsnavne; den foretager ingen cloudlæsning, login eller mutation.

## File: `DROPBOX-REGISTRATION.md`

### Dropbox-appregistrering: verificeret deltrin

Observeret 2026-10-21 direkte i Dropbox App Console og den installerede lokale portal.

- Appnavn: CloudStorage Portal Local.
- Offentlig App key: `nbl4o9y83v6m5l0`. Dette er ikke App secret eller et access token.
- Appen er i development med Development users: Only you. Flere konti er derfor endnu ikke live-verificeret, og eventuel udvidelse skal gennemgås særskilt.
- Permissions: account_info.read var valgt fra starten. Kun files.metadata.read blev tilføjet efter brugerens præcise godkendelse. Dropbox viste Permissions change successful.
- Redirect URI: `http://127.0.0.1:53683/oauth/dropbox/callback`, tilføjet efter særskilt godkendelse. Dropbox viste OAuth URI added, og adressen fremgår af listen.
- Allow public clients (Implicit Grant & PKCE) stod allerede på Allow; denne indstilling blev ikke ændret.
- App secret blev ikke vist eller kopieret. Generate access token blev ikke brugt.
- Den offentlige App key blev gemt gennem den installerede portals eksisterende klient-ID-formular. Portalen bekræftede Klient-ID gemt og viste Dropbox-login aktiveret. OneDrive-kontoen stod fortsat som identitets- og rodverificeret.

#### Manglende live-bevis

Dropbox OAuth-samtykke er ikke gennemført gennem vores egen app endnu. En registreret app og gemt klient-ID beviser ikke login, refresh, mappeadgang eller fler-konto-funktion. De eksisterende native Dropbox-workflows og grants er ikke erstattet.

Dropboxs autorisationsreference kræver systembrowser frem for indlejret webview. Næste eget Dropbox-login skal derfor åbnes i systembrowseren og bevare brokerens session/state/PKCE-binding; eksisterende connectorcredentials må ikke bruges som genvej.

Kilde: https://www.dropbox.com/developers/paper-api-alpha (afsnit /oauth2/authorize, læst 2026-10-21). Den aktuelle API-reference er også tilgængelig via https://www.dropbox.com/developers/documentation/http/documentation#oauth2-authorize.

#### Skærmbeviser

I arbejdsområdets outputs-mappe: dropbox-permissions-saved.png og dropbox-callback-saved.png. Disse beviser appkonfigurationen, ikke et gennemført OAuth-login.

## File: `LICENSE`

```text
MIT License

Copyright (c) 2026 Zilvereyes

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## File: `MCP-LIVE-PROOF.md`

### Historisk dokumentation for det lokale OneDrive-MCP-runtime

Dette dokument samler forsøg med det tidligere lokale runtime. CloudStorage Portal bruger nu de eksisterende Apps til Dropbox, Google Drive og OneDrive. Se [verifikation af den aktuelle App-rute](cloudstorage-portal.md#file-referencesworkflow-verificationmd). Daterede resultater herfra dokumenterer det runtime og den forbindelse, som var valgt i det enkelte forsøg.

#### 23. oktober 2026 — dev.17 host reconciliation

- The exact installed `0.8.0-dev.17` package and source match across all 127 non-`node_modules` files; 71 provider provenance hashes and both preserved native App IDs match.
- The installed `0.8.0-dev.11` runtime completes an independent MCP `2025-06-18` exchange, advertises server name `onedrive`, discovers exactly 12 tools, rejects an unknown connection, finds the local OneDrive root, and exits cleanly.
- The complete installed runtime test suite passes 62/62. The native workflow gate finds all 11 imported workflows against the current 29-tool Dropbox and 45-tool Google Drive catalogs with zero missing requirements.
- Current-host inspection found that the chat's `onedrive` transport still ran incomplete cache `dev.16`; that cache lacked `runtime/public`, and its live portal returned `internal_error`. The exact obsolete process was stopped. The transport did not hot-recreate, so current-host execution of `dev.17` remains unverified until Codex restarts.
- The redundant manual `cloudstorage_local` declaration was removed from Codex configuration. The plugin-owned `onedrive` declaration is now the only persistent MCP registration. User-level port `53683` and the local OneDrive root are prepared for the next host start.
- The DPAPI store still contains the connected Google grant. Dropbox and OneDrive Graph grants are absent, so simultaneous three-provider reads and their restart restoration remain required live gates.

Verificeret 21. oktober 2026. Denne test bruger den installerede runtime 0.7.0, ikke kandidatens 0.8.0-dev.1 og ikke en separat testserver.

1. cloudstorage_open_portal returnerede sessionlink fra den aktive MCP-proces.
2. Browseren gennemførte samme tidligere godkendte Microsoft-login uden nye scopes eller nyt samtykke.
3. cloudstorage_status i chatten observerede den nye OneDrive-forbindelse med subject fd2c6435e391d052 og personligt drive FD2C6435E391D052.
4. cloudstorage_list_onedrive_folder listede den isolerede testmappe med moved og probe.txt, more=false.
5. cloudstorage_read_onedrive_text læste probe.txt: 181 bytes UTF-8, SHA256 062622930fe0f432f4759725c2dbda1d23af58111d7cdd1f3d774bdcafa856b1, uændret eTag under læsningen. Hashen matcher den oprindelige probe.
6. cloudstorage_read_root returnerede 16 elementer, more=false. cloudstorage_select_account bekræftede den samme eksplicitte konto som valgt.

Alle ovenstående kald blev udført via de faktiske cloudstorage_local-værktøjer i denne Codex-chat. Browseren foretog kun login; mappe-, fil- og rodlæsning samt kontovalg blev udført gennem MCP. Ingen cloudfiler blev ændret, delt eller slettet. Det er ikke bevis for flere forskellige konti eller alle operationer.

Dette lukker end-to-end-hullet mellem egen Microsoft-loginforbindelse og den installerede Codex-MCP for de nævnte læseoperationer. Beviset blev optaget med den tidligere memory-only runtime. Plugin 0.8.0-dev.14 tilføjer DPAPI-beskyttede refresh-grants og Google-klienthemmelighed. Denne fil indeholder ingen tokens eller bootstrap-link.

Den 23. oktober 2026 gennemførte runtime 0.8.0-dev.6 et selvstændigt MCP 2025-06-18-håndtryk og annoncerede alle ti forventede værktøjer, servernavnet `onedrive`, tre særskilt konfigurerede udbydere samt CurrentUser-DPAPI som aktivt credential-lager. Der var nul resources, nul resource templates og ingen protokolfejl. Eget Google-login blev gennemført med præcis `drive.readonly`; immutable kontoidentitet og 12 rodmetadataelementer blev læst. Processen blev derefter stoppet helt. En ny installeret proces indlæste grantet som sikkert gendannet, fornyede adgangen, genvaliderede samme immutable Google-identitet og læste de samme 12 rodmetadataelementer igen. Ingen cloudfil blev ændret. Dette beviser Google-grantets restartforløb, ikke Dropbox- eller OneDrive-grants og ikke genindlæsning i den allerede kørende Codex-host.

En ny sanitiseret installationsprobe samme dag startede præcis `cloudstorage-local/cloudstorage-portal/0.8.0-dev.14/runtime/mcp.mjs` på en isoleret port. Den bekræftede igen MCP `2025-06-18`, servernavnet `onedrive`, runtime `0.8.0-dev.6`, ti værktøjer og nul resources/templates. Alle tre klientregistreringer var vedvarende konfigureret, Google-klienthemmeligheden blev gendannet uden fejl, og DPAPI-lageret havde ingen load- eller save-fejl. Kun Google-grantet fandtes i lageret; det blev gendannet, identiteten blev revalideret, og en ny live rodlæsning returnerede 12 metadataelementer uden næste side. Den lokale OneDrive-syncrod blev målt separat til 18 navne. Ingen Dropbox- eller OneDrive Graph-grant blev fundet, så de to restartforløb er fortsat åbne. Den fulde, redigerede kvittering ligger i `outputs/INSTALLED-RUNTIME-LIVE-PROBE.json`; den indeholder kun forkortede SHA-256-identifikatorer, status og antal, aldrig tokens, mailadresser, filnavne eller rå forbindelses-ID'er.

To samtidige instanser af præcis samme installerede runtime blev derefter startet på hver sin isolerede port. Begge gennemførte MCP-discovery, sikker gendannelse af Google-grantet, en ny Google-rodlæsning og den separate lokale OneDrive-rodlæsning uden cloudskrivning. Håndtrykkene tog henholdsvis 22.323 ms og 19.738 ms; de komplette prøver tog 28.793 ms og 29.103 ms. Kvitteringerne ligger i `outputs/INSTALLED-RUNTIME-PARALLEL-A.json` og `outputs/INSTALLED-RUNTIME-PARALLEL-B.json`. Målingen forklarer konkret, hvorfor Codex-hostens tidligere grænse på 15 sekunder kunne lukke transporten, og viser reel margin under den nu konfigurerede grænse på 60 sekunder. Den kan ikke genåbne transportobjekter, som allerede er lukket i den nuværende samtale.

Runtime 0.8.0-dev.7 flytter dekryptering af Google Desktop-klienthemmeligheden ud af MCP-starten og ind i den første faktiske Google-tokenudstedelse eller -fornyelse. En isoleret kildeprobe gennemførte håndtrykket på 1.779 ms og hele prøven på 7.403 ms; den installerede pakke gennemførte håndtrykket på 1.493 ms og hele prøven på 5.802 ms. I begge kvitteringer var hemmeligheden konfigureret, men ikke indlæst eller forsøgt indlæst før cloudlæsningen; efter den gendannede Google-forbindelses rodlæsning var den indlæst præcis ved behov uden fejl. Google returnerede fortsat 12 rodmetadataelementer, lokal OneDrive-sync returnerede fortsat 18 navne, alle ti MCP-værktøjer blev opdaget, og der blev ikke skrevet til skyen. Kvitteringerne er `outputs/SOURCE-RUNTIME-LAZY-SECRET-PROBE-DEV7.json` og `outputs/INSTALLED-RUNTIME-LAZY-SECRET-PROBE-DEV7.json`. Kilde og installation består hver 57/57 runtime-tests og er byte-identiske på alle 912 filer.

Runtime 0.8.0-dev.8 forlænger den ejerskabsbundne, PKCE-bundne og engangsbeskyttede OAuth-state fra fem til 30 minutter og genfinder den lokale sync-rod fra Windows' egne OneDrive-miljøvariabler, når `ONEDRIVE_LOCAL_ROOT` ikke er angivet. En eksplicit værdi—også tom—har fortsat forrang. Den virkelige Microsoft- og Dropbox-loginrunde viste, at fem minutter udløb, mens brugeren stadig var ved udbyderens login/advarselsvisning; de gamle callbacks ville derfor blive afvist som `invalid_oauth_state`. Broker-testen beviser både accept efter 1.799 sekunder og afvisning efter 1.801 sekunder samt uændret replay-, ejer- og providerafvisning. Kilde og installation består 58/58 tests og matcher 912/912 filer. En ny isoleret installeret probe identificerer server `onedrive` 0.8.0-dev.8, håndtrykker på 1.395 ms, opdager alle ti værktøjer, gendanner Google-grantet og læser 12 Google-rodposter samt 18 lokale OneDrive-navne uden cloudskrivning. Kvitteringen er `outputs/INSTALLED-RUNTIME-OAUTH-WINDOW-PROBE-DEV8.json`.

Runtime 0.8.0-dev.10 omsætter de observerbare personlige OneDrive-dele af Microsoft-connectorens Graph-kontrakt til vores egen, selvstændigt navngivne MCP. `cloudstorage_search_onedrive` og `cloudstorage_get_onedrive_item` kræver et eksplicit lokalt `connection_id`, bruger kun den pågældende forbindelses egen Graph-token og drive-ID, filtrerer remote shortcuts og resultater fra andre drev og returnerer ingen capability-URL'er. Mappevisningen håndhæver nu samme filtrering. Der kopieres ingen SharePoint-App-ID, connectorcredential eller token, og `sharepoint` accepteres fortsat ikke som provideralias. Kildesuiten består 60/60 tests; den direkte installationsprobe finder alle 12 værktøjer i plugin 0.8.0-dev.16, mens frisk værtsopdagelse og live metadata/søgning fortsat registreres særskilt.

## File: `README.md`

### CloudStorage-Portal
Cloud Storage Portal for Google Drive, Dropbox &amp; OneDrive

Version 0.9.15 renames the OneDrive skill to `cloudstorage-onedrive`, so it no longer shares the name `onedrive` with the standalone OneDrive plugin. The App binding and workflow are unchanged.

Version 0.9.14 requires Google Drive profile discovery in the provider tool catalog so the default-account workflow can verify the active identity.

Version 0.9.13 can resolve an exact OneDrive item in its known parent folder after a successful empty search. The workflow reports incomplete listings and refuses ambiguous matches.

Version 0.9.12 checks OneDrive search and folder creation in the provider tool catalog. The check reports the exact missing tool when either operation is unavailable. See the [workflow verification guide](cloudstorage-portal.md#file-referencesworkflow-verificationmd).

## File: `THIRD_PARTY_NOTICES.md`

### Third-party notices

The MIT license in this repository applies to the original Zilvereyes aggregation, manifests, routing material, scripts and documentation.

CloudStorage Portal also packages selected provider skills and assets originating from the OpenAI-curated Dropbox 6.0.0 and Google Drive 0.1.22 packages. Those provider files retain their upstream copyright, license, trademark and service terms. They are not relicensed by the CloudStorage Portal MIT license.

The exact imported provider files, versions and hashes are recorded in `skills/cloudstorage-portal/references/provider-provenance.json`.

Dropbox, Google Drive, Google Docs, Google Sheets, Google Slides, Microsoft and OneDrive are trademarks of their respective owners. Their appearance does not imply endorsement of this project.
