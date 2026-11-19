# Skill: cloudstorage-setup-docs

- Plugin: `cloudstorage-portal` (0.9.14)
- Source: `plugins/cloudstorage-portal/skills/cloudstorage-setup-docs/SKILL.md`

> Explain and reproduce the documented zero-cost CloudStorage Portal setup, Microsoft Entra app roles, hosted OneDrive broker, callbacks, DCR and secret-field mapping; use for setup documentation, onboarding and login troubleshooting.

## Instructions

### CloudStorage Portal — opsætning og arkitektur

Forklar den dokumenterede opsætning og hjælp en ny bruger gennem den. Denne skill er en vejledning, ikke en credentialbutik eller en ny MCP-runtime.

Aktuel pakke: Portal bruger den eksisterende Dropbox MCP-forbindelse og de eksisterende Google Drive- og OneDrive-App-bindinger. Portalen har ingen separat MCP-runtime. CloudStorage Portal Local er udgået. Opdag det aktuelle værktøjsudvalg gennem den valgte forbindelse; historiske værktøjsantal er ikke en aktuel kontrakt. OneDrive-skriveadgang kræver onedrive.read + onedrive.write og Microsoft-samtykke til Graph Files.ReadWrite. Bevar et eksisterende gyldigt samtykke; en manglende skrivebevilling kræver ny godkendelse. Referencerne indeholder også historiske læse-/OBO-forløb; brug dem ikke som den aktuelle skrivekontrakt.

#### Opslag

- Første opsætning: [0 kr.-guiden](references/setup-guide.md).
- Konti, pakker og OAuth-kontrakter: [arkitektur](references/architecture.md).
- Fejlkoder og sammenhørende felter: [fejlfinding](references/troubleshooting.md).
- Faktisk bevis og acceptance-tests: [verifikation](references/verification.md).
- Officielle sites, kildegrundlag og deling: [kilder](references/sources.md).

#### Arbejdsform

1. Skeln mellem Microsoft-kontoen, der autentificeres, ChatGPT/Codex-kontoen, der ejer forbindelsen, og den hosted server. En Entra-konto er ikke et ChatGPT Business-arbejdsområde.
2. Find eksisterende kilde, deployment og forbindelse. Pluginpakke, installation/cache, referencebibliotek og hosted runtime er forskellige objekter.
3. Brug de præcise feltnavne på den aktuelle skærm. Giv ét brugertrin ad gangen ved credentials og login. Nævn kun det app-/variabelpar, brugeren arbejder med nu.
4. Læs kun den relevante reference. Undersøg første faktiske fejlende led før ændringer. Kontroller aktuelle udbyderregler hos den officielle kilde.
5. Credentials indtastes af brugeren i tjenesternes sikre felter. Bed aldrig om Value, tokens, callbackkoder eller clipboardindhold i chat. Undgå screenshots, mens en ny Value vises.
6. Overhold 0 kr.: ingen køb, domæner, betalte aggregatorkonti eller opgraderinger. Kontrollér planvilkår og kvoter. Gratis hosting garanterer ikke gratis adgang til alle produkter.
7. Save og Ready er ikke loginbevis. Kontrollér ny deployment, rigtigt alias, faktisk tokenudveksling og Connected accounts.
8. Bind alle konto-/rodprøver til den rigtige forbindelse og identitet. Brug ikke lokal syncmappe eller en anden konto som skjult fallback.
9. Rapportér Connect, consent/callback, token, Connected accounts, discovery, identitet, rod og refresh separat. Den aktive App hedder OneDrive og bruger produktionsbrokerens URL. Staging og tidligere Business-installationer er historiske referenceforløb, ikke alternative produktkrav.

#### Leverance

Giv næste konkrete trin og en præcis bevisgrænse. Brug pladsholdere i offentlig dokumentation. Bevar kilde, licens, revisionsspor og en konkret tilbageførsel. Installation, deployment, credentialændringer og publicering udføres kun inden for den aktuelt autoriserede opgave.

## Bundled files

### File: `agents/openai.yaml`

```yaml
interface:
  icon_large: "./assets/wrp-icon-256.png"
  icon_small: "./assets/wrp-icon-128.png"
  display_name: "Cloudstorage Setup Docs"
  short_description: "Guidance for cloud setup and login troubleshooting."
  default_prompt: "Use $cloudstorage-setup-docs to help with this task."
```

### File: `references/architecture.md`

#### Arkitektur og konti

Arkitekturkontrakt dokumenteret 2. november 2026 for runtime 0.3.2. Seneste dokumenterede personlige runtimekontrol: 0.3.4 den 16. november 2026; se [verifikation](verification.md). Versioner og kontroller nedenfor er dateret evidens.

##### Aktive dele

| Del | Ansvar |
| --- | --- |
| CloudStorage Portal | Eksisterende App-/MCP-forbindelser og provider-workflows, herunder denne docs-skill; ingen separat MCP-runtime |
| OneDrive hosted MCP | HTTPS MCP, OAuth-broker, Microsoft-tokenudveksling, Graph-verifikation og OneDrive-værktøjer |
| OneDrive-plugin | Registreret App-reference, hosted MCP-forbindelse, ikon og skills |

CloudStorage Portal Local er udgået og fjernet fra marketplace. Installér den ikke som del af denne opsætning.

Dropbox bruger den eksisterende Dropbox MCP-forbindelse. Google Drive og OneDrive bruger eksisterende App-bindinger. En historisk App-deklaration er ikke grund til at erstatte en fungerende forbindelse. Deres fungerende UI er reference for synlig succes, men referencefiler med lignende navne er ikke bevis for OpenAIs interne implementation.

Hosted source findes separat i projektets work/cloudstorage-onedrive-remote. Portalens skillpakke indeholder ikke automatisk denne server. Ved offentlig reproduktion skal det præcise testede serverkildesæt også gøres tilgængeligt under afklarede licensvilkår.

##### To konto-akser

ChatGPT Personal/Business bestemmer connectorens ejer-/arbejdsområde i klienten. Microsoft Personal/Entra bestemmer brugeridentitet og Microsoft-ressourcer. Personlig ChatGPT kan derfor starte Microsofts arbejds-/skolelogin.

En Entra-tenant eller en gæstekonto garanterer ikke en provisioneret OneDrive for Business. Test identitet og driveadgang separat. En EXT-/gæsteidentitet kan være forskellig fra både personlig Microsoft-konto og en provisioneret organisationsbruger.

##### To OAuth-ben

    ChatGPT/Codex → broker → Microsoft → broker-callback
      → ChatGPT-callback → broker-token → Microsoft-token
      → broker-access-token → MCP → Graph

| Felt | Klient → broker | Broker → Microsoft |
| --- | --- | --- |
| client_id | Brokerens DCR-klient | Host-appens Application (client) ID |
| scope for aktiv læse-/skriveforbindelse | onedrive.read onedrive.write | https://graph.microsoft.com/User.Read https://graph.microsoft.com/Files.ReadWrite offline_access |
| resource | https://<MCP_HOST>/mcp | Ikke videresendt i dette projekts Microsoft-request |
| redirect_uri | Klientens registrerede callback | https://<MCP_HOST>/oauth/callback |
| Klientmetode | none + PKCE S256 | client_secret_post med host-secret |

Runtime 0.3.2 bruger direkte delegeret Graph-adgang, når grantet indeholder onedrive.write. Microsoft-tokenet forbliver server-side; klienten får brokerens ressourcebundne token. Et grant med kun onedrive.read bruger fortsat api://<API_APP_ID>/access_as_user offline_access og API-appens særskilte OBO-udveksling. De to grene er forskellige upstream-kontrakter. Host-secret og API-secret må ikke byttes eller genbruges. Eksisterende API-konfiguration bevares; denne vejledning autoriserer ikke fjernelse af registreringer eller credentials.

##### Hvorfor broker her?

Den oprindelige direkte Microsoft-request kombinerede en HTTPS MCP-resource og et api://-scope og fik AADSTS9010010. At registrere den delte vercel.app-adresse som API identifierUri blev afvist med krav om verificeret organisationsdomæne.

Brokeren bevarer MCP-resourcebindingen mod klienten og oversætter scopes til den valgte Microsoft-gren. MCP-URL som resource videresendes ikke til Microsoft. Det er projektets dokumenterede gratis løsning, ikke et bevis for at alle andre arkitekturer er umulige.

##### Hosted kildefiler og ruter

| Fil | Ansvar |
| --- | --- |
| api/entry.mjs | Vercel-entrypoint |
| src/remote.mjs | Runtimekonfiguration og kobling mellem broker, Graph og MCP |
| src/oauth-broker.mjs | DCR, authorize, state, PKCE, callback, token og refresh |
| src/graph.mjs | Microsoft/Graph-verifikation og API-tokenudveksling |
| vercel.json | Rewrites til entrypoint |
| package-lock.json | Låste afhængigheder til det konkrete testede kildesæt |

Ruter: /mcp, /.well-known/oauth-authorization-server, /.well-known/oauth-protected-resource, /.well-known/oauth-protected-resource/mcp, /oauth/register, /oauth/client/:registration, /oauth/authorize, /oauth/callback og /oauth/token.

Staging blev verificeret med en deployment-specifik entrypoint-override, der gav createOneDriveRemote en eksplicit staging-publicUrl. Den almindelige lokale entrypoint blev bevaret. Reproduktion skal kontrollere sin egen kanoniske URL; et gammelt MCP_PUBLIC_URL-projektfelt kan ellers få staging-discovery til at annoncere produktion. Diagnostik-overriden er et revisionsartefakt, ikke en ny releaseversion.

Aktiv canonical MCP: https://cloudstorage-onedrive-mcp.vercel.app/mcp. En kopi bruger sin egen kanoniske URL. Ovenstående staging-override er historik og bruges ikke som den aktive forbindelse.

### File: `references/setup-guide.md`

#### Opsætning med 0 kr. i ekstra budget

Statusdato: 2. november 2026. Aktiv runtime: 0.3.2. Den aktuelle OneDrive-App bruger læse-/skrivekontrakten beskrevet nedenfor. Planvilkår, adgangskrav, UI-navne og kvoter skal genkontrolleres ved ny opsætning.

##### 1. Tjenester og kilde

Brug Microsoft Entra admin center til appregistreringer, Vercel til hosted broker/MCP og ChatGPT/Codex til klientforbindelsen. Google Drive og Dropbox forbliver separate native connectors.

Eget domæne, betalt aggregator, ekstern database og OpenAI API-nøgle var ikke nødvendige for denne personlige loginprøve. Et ChatGPT-abonnement og adgang til tjenesterne kan have egne krav. “0 kr.” betyder ingen ekstra køb her, ikke at alle produkter er gratis for alle.

Vercel-planen var Hobby. Kontroller Billing/planvisningen og de aktuelle anvendelsesvilkår før deployment. Brug ingen opgraderinger eller betalte tilvalg. Stop ved betalingskrav.

Brug den eksisterende hosted serverkilde i work/cloudstorage-onedrive-remote og dens låste dependencies. Kør dens eksisterende tests, og bind præcis kilde til revision eller filhashes. Den tidligere 41/41-kvittering er dateret evidens, ikke et nyt testresultat for andre kopier. Portalens repository er separat.

##### 2. API-appen i Entra

Åbn App registrations og vælg/opret appen, der repræsenterer OneDrive MCP API'et.

| Felt | Projektets model |
| --- | --- |
| Application (client) ID | Dit API_APP_ID |
| Supported account types / signInAudience | AzureADandPersonalMicrosoftAccount |
| Manifest → api.requestedAccessTokenVersion | 2 |
| Expose an API → Application ID URI | api://<API_APP_ID> |
| Expose an API → scope | access_as_user, aktiveret |
| Fuldt scope | api://<API_APP_ID>/access_as_user |
| API permissions | Delegerede Graph User.Read og Files.Read til læsning |
| Certificates & secrets → Client secrets | API-appens egen credential til API/OBO |

Kontroller faktiske admin-/brugersamtykker særskilt. Konfigurerede permissions er ikke bevis på et gennemført samtykke for den aktuelle bruger.

Et lokalt desktop-callback er ikke hosted broker-callback. Tilføj ikke nativeclient eller LiveSDK alene for at reparere hosted login.

##### 3. Host-appen i Entra

Vælg/opret den særskilte app, der repræsenterer brokerens Microsoft-klient.

- Application (client) ID: dit HOST_APP_ID.
- Supported account types: omfatter kontoen der skal testes; projektets app tillader både Entra og personlige Microsoft-konti.
- API permissions for læse-/skrivegrenen: delegeret Microsoft Graph User.Read og Files.ReadWrite; brugeren skal give det konkrete samtykke. Den eksisterende access_as_user-tilladelse hører til læse-/OBO-grenen og må ikke forveksles med Files.ReadWrite.
- Authentication → Redirect URI configuration → Add Redirect URI → Web: https://<MCP_HOST>/oauth/callback, hvor MCP_HOST er den konkrete brokers host. Projektets aktive callback er https://cloudstorage-onedrive-mcp.vercel.app/oauth/callback; staging bruger sit eget alias.
- Certificates & secrets → Client secrets: host-appens egen credential.

I broker-modellen sender Microsoft sin kode tilbage til brokeren. ChatGPT-callbacken ligger på det andet OAuth-ben og håndteres via brokerens klientregistrering. Brug den callback der faktisk sendes, og bevar eksisterende callbacks indtil deres fjernelse er konkret bestilt.

##### 4. Felter der hører sammen

| Fra | Til Vercel Environment Variables |
| --- | --- |
| Host-app → Application (client) ID | MICROSOFT_HOST_CLIENT_ID |
| Host-app → Client secrets → Value | MICROSOFT_HOST_CLIENT_SECRET |
| API-app → Application (client) ID | MICROSOFT_API_CLIENT_ID |
| API-app → Client secrets → Value | MICROSOFT_API_CLIENT_SECRET |
| Separat kryptografisk tilfældig broker-hemmelighed | OAUTH_BROKER_SECRET |
| Kanonisk HTTPS MCP-adresse | MCP_PUBLIC_URL |

OAUTH_BROKER_SECRET er ikke en tredje Entra-app-secret. Den beskytter brokerens egne krypterede konvolutter. Generér den kryptografisk sikkert efter kildekodens formatkrav; genbrug ikke Microsoft-credentials.

Ved brugerhjælp gives kun ét konkret par ad gangen:
1. Åbn den rigtige app.
2. Opret en ny secret hvis den gamle Value ikke er bevaret sikkert.
3. Kopiér Value, aldrig Secret ID. Value vises kun ved oprettelsen.
4. I Vercel: Environment Variables → den sammenhørende variabel → Edit.
5. Vælg det relevante Preview-mål til staging, indsæt i Value og tryk Save.
6. Luk credentialvisningen før skærmdeling.

Bed ikke om værdier, screenshots med Value eller clipboard i chat. Slet ikke gamle credentials før ny credential er testet og andre forbrugere er kortlagt. Notér beskrivelse og udløbsdato uden Value.

##### 5. Deploy staging

Environment Variables er siden, Preview er målet, og Save er knappen. Gemte variabler gælder først i en ny deployment.

Kontroller projekt, team, gratisplan og source/build-input. Deploy det testede kildesæt til staging/Preview. Redeploy-dialogen kan stå på Production; brug den ikke til staging uden at rette målet.

I projektets REST-API krævedes target=staging, mens target=preview blev afvist. Det er en observeret API-detalje, ikke et UI-feltnavn. Andre klienter skal følge deres dokumenterede Preview-fremgangsmåde.

Knyt staging-aliaset til den nye deployment. Kontroller runtime-publicUrl og discovery:
- /.well-known/oauth-authorization-server: brokerens issuer og egne OAuth-endpoints.
- /.well-known/oauth-protected-resource/mcp: korrekt HTTPS-resource og onedrive.read.
- /mcp uden token: 401 med OAuth-challenge.

OpenAI-serveren skal kunne nå adressen. Her blev kun det konkrete staging-alias undtaget fra Vercel-loginbeskyttelse efter brugerens godkendelse. Brokerens OAuth blev bevaret. Slå ikke hele projektets eller produktionens beskyttelse fra.

##### 6. Klientforbindelsen

Observeret personlig UI: Plugins → Add → Add custom MCP server. UI kan siden hedde Apps; brug de aktuelle skærmnavne.

| Felt | Værdi til din kopi |
| --- | --- |
| Name | OneDrive; separat tydeligt staging-navn kun ved en isoleret test |
| Server URL | Din kanoniske HTTPS MCP-URL; projektets er https://cloudstorage-onedrive-mcp.vercel.app/mcp |
| Authentication | OAuth |
| Advanced OAuth settings | Brokerens discovery-endpoints |
| Registreringsmetode | DCR |
| Default/base scopes for denne læse-/skriveforbindelse | onedrive.read og onedrive.write, begge valgt |
| Token endpoint auth method | none med PKCE S256 |

Denne kandidat kan ikke direkte bruge ChatGPTs private_key_jwt-CIMD-klient: brokerens CIMD-validering accepterer kun none. Metadata-annonce om CIMD beviser ikke kompatibilitet. Den verificerede rute bruger DCR.

Opret forbindelsen og vælg Connect. Vælg den tilsigtede Microsoft-konto, og gennemfør kun tilsigtet samtykke. Brugeren håndterer credentials og uventede adgangsudvidelser.

##### 7. Test og vedligehold

Følg verification.md. Arbejds-/skolekonto testes særskilt fra personlig Microsoft-konto. Connected accounts er første synlige sluttilstand; værktøjer, identitet, rodliste og refresh skal testes bagefter.

Følg credentialudløb, quotas, revokering og dependency-opdateringer. Rotér én credential ad gangen, deploy det rigtige mål og gentest. Bevar forrige deployment til tilbageførsel.

Stateless krypterede grants er ikke en varig revokeringsliste. Fuld flerinstans-replaykontrol og serverbaseret per-connection-revocation er ikke bevist her. Dokumentér grænserne før bred offentlig drift; guiden er ikke et produktionssikkerhedsbevis.

##### 8. Produktion og Portal-pakken

Efter en verificeret staging-prøve skal produktionens eget alias, kanoniske publicUrl, Web-callback og credentialmål kontrolleres. Gemte Preview-variabler overføres ikke automatisk til Production. Ændr kun de konkret autoriserede mål og deploy det samme verificerede kildesæt med den korrekte publicUrl. Kontrollér discovery igen.

Opret eller genkonfigurér OneDrive-forbindelsen mod produktionsbrokeren med DCR og både onedrive.read og onedrive.write. En gammel registrering kan beholde sine tidligere OAuth-endpoints, selv om serveren annoncerer nye. Bevar derfor ikke et defekt App-ID som et mål i sig selv. Genlæs den faktisk fungerende Apps ID og opdatér både OneDrive-pakkens og Portalens .app.json samt marketplace-reference og relevant proveniens.

Brug de eksisterende ikonfiler fra projektet. App-formularens Choose icon har en 10 KB-grænse, mens pakkens logo/composerIcon er separate filreferencer. Kontroller det synlige ikon efter upload og efter installation. Tilgængeliggørelse i et workspace er en særskilt publicering; hver bruger forbinder fortsat sin egen Microsoft-konto. Test til sidst Portalens tre Apps og den nye OneDrive-forbindelses identitet, rod og refresh i den aktuelle host.

### File: `references/sources.md`

#### Officielle sites og deling

Dokumentationsgrundlag kontrolleret 27. oktober 2026; UI og adgangskrav kan ændre sig.

| Formål | Site |
| --- | --- |
| App registrations og credentials | https://entra.microsoft.com/ |
| Hosting, plan, deployments og Environment Variables | https://vercel.com/ |
| Personlig MCP-forbindelse | https://chatgpt.com/ |
| MCP/OAuth, resource, DCR/CIMD og callbacks | https://developers.openai.com/plugins/build/auth |
| Developer mode | https://help.openai.com/en/articles/12584461-developer-mode-and-full-mcp-connectors-in-chatgpt |
| Microsoft OBO | https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-on-behalf-of-flow |
| Redirect URI-regler | https://learn.microsoft.com/en-us/entra/identity-platform/reply-url |
| Credentials og Value | https://learn.microsoft.com/en-us/entra/identity-platform/how-to-add-credentials |
| 7000215 | https://learn.microsoft.com/en-us/entra/msal/dotnet/advanced/exceptions/confidential-client-troubleshoot |
| Vercel variabler | https://vercel.com/docs/environment-variables |
| Hobby | https://vercel.com/docs/plans/hobby |
| Limits | https://vercel.com/docs/limits |
| Graph | https://graph.microsoft.com/v1.0/ |
| Google Drive | https://drive.google.com/ |
| Dropbox | https://www.dropbox.com/ |

MS authorize/token og Graph er protokol-endpoints, ikke steder hvor brugeren manuelt skal indsætte secrets. https://login.live.com/oauth20_desktop.srf er en desktop redirect-mulighed, ikke en hosted MCP OAuth-broker.

##### Projektgrundlag

Hosted kilde og audit er separate fra portalens App-/skillpakke. Det private projekt har START_HERE.md, PROJECT_TRUTH.md, DEPLOYMENT_TRACE.md, OAUTH_CONTRACT_DIFF-20261026.md, OAUTH_FIX_PACKAGE-20261026.md, HOST_SECRET_DIAGNOSIS-20261027.md og evidence/staging-connected-api-fixed-20261027.json. Dette er lokale revisionsdokumenter, ikke filer der automatisk følger med skillen.

Den delbare vejledning bruger pladsholdere og medtager ingen credentials, brugeridentiteter eller maskinspecifikke mapper.

##### Licens og release

Vejledningen er ny original dokumentation baseret på egne observationer og korte henvisninger. Tredjepartsimplementationer er ikke kopieret ind.

Referencebibliotekerne kan have forskellige licenser, herunder non-commercial og Elastic-2.0. Portalens MIT-licens gør ikke alt referenceindhold MIT. Afklar licens, attribution og afhængigheder før genbrug.

Publicér ikke private revisionsbilleder, registreringsudtræk, identiteter eller credentials uden særskilt gennemgang. Den præcise testede serverkilde skal følge en reproducerbar offentlig udgivelse; portaldokumentation alene er ikke serverdistribution. Installation, commit, push og publicering er separate handlinger.

### File: `references/troubleshooting.md`

#### Første fejlende led

| Observation | Næste præcise kontrol |
| --- | --- |
| AADSTS9010010 ved direkte Microsoft authorize | Sammenhold requestens resource/scope, discovery og API identifierUris; skeln mellem brokerens to kontrakter |
| IdentifierUris kræver verificeret domæne | Bevar api://-URI og undersøg broker; køb ikke automatisk et domæne |
| Host-callback mangler | Den faktiske redirect_uri skal registreres som Web på den rigtige host-app |
| 7000215 ved host_code | Host-appens Value → MICROSOFT_HOST_CLIENT_SECRET |
| 7000215 ved graph_obo | API-appens Value → MICROSOFT_API_CLIENT_SECRET |
| Authentication succeeded, action discovery failed | Login lykkedes; undersøg næste API/OBO-, Graph- og MCP-led |
| Tools: 0 | Verificér autentificeret initialize/tools/list, schemas og Refresh tools |
| Save lykkes, gammel fejl fortsætter | Ny deployment, rigtigt mål og alias; sammenhold tidsstempler |
| Staging-discovery peger på produktion | Kontroller runtime-publicUrl og eksisterende MCP_PUBLIC_URL |
| Vercel-login foran MCP | Undersøg kun tilsigtet alias og bevar broker-auth |
| Entra-login lykkes, /me/drive fejler | Kontotype, tenant, provisionering, delegerede rettigheder og konkret Graph-fejl |

##### Den faktiske credentialfejl

Stagingens MICROSOFT_HOST_CLIENT_SECRET var præcis lig med Entras Secret ID. Det blev bevist med en boolesk lighedskontrol, uden at udskrive Value eller secret-hash. Efter sikker brugerrettelse og redeploy returnerede host_code og host_refresh 200.

Næste afvisning gjaldt API-appens credential, ikke den samme host-fejl. Efter separat rettelse af MICROSOFT_API_CLIENT_SECRET returnerede OBO og Graph 200, og klienten blev Connected. Den tidligere API-værdis præcise fejlindtastning blev ikke selvstændigt bevist; den må ikke automatisk kaldes endnu en Secret ID-fejl.

##### Sikker diagnostik

Log faste ruter uden query, statuskoder, sikre OAuth-fejl-enums og numeriske Microsoft-fejlkoder. Offentlige app-id'er og nødvendige booleske wiring-kontroller kan indgå.

Log aldrig client_secret, Authorization, code, code_verifier, state, assertion, tokens eller fulde callback-URL'er med query. Udskriv ikke komplette Microsoft-fejlbeskrivelser ukritisk. Secret-hashes er ikke nødvendige for en Secret ID-kontrol.

En negativ probe med bevidst ugyldig kode kan bevise requestens feltnavne og klientmetode. Dens fejl er ikke et loginbevis eller bevis for Microsofts valideringsrækkefølge.

### File: `references/verification.md`

#### Verifikation og næste mål

##### Seneste dokumenterede personlige kontrol: 16. november 2026

Den eksisterende OneDrive-App blev kontrolleret gennem `codex_apps / onedrive`
med runtime 0.3.4. Kvitteringen `personal-live-acceptance.json` fra projektets
lokale `outputs/onedrive-refresh-20261116/` dokumenterer 34 vellykkede
identitets-/rodkontroller, faktisk produktions-tokenfornyelse og to efterfølgende
UTF-8-fillæsninger med matchende SHA-256. Der blev ikke bedt om nyt login.
Fornyelsen er korreleret med sikre runtime-hændelser; token-payloads er ikke
indsamlet. Denne kontrol skrev ingen cloudfiler og er derfor ikke i sig selv
en ny skrivetest. Brug den særskilte funktionstestkvittering til skrivebevis.

Status er dateret evidens, ikke en garanti for en senere installation eller
en anden konto. Opdag aktuelle værktøjer og kontroller samme identitet/drive
ved en ny test. Del ikke rå kvitteringer med konto- eller filidentifikatorer.

##### Historisk kontrol: 2. november 2026

Den aktive personlige App hedder OneDrive og bruger produktionsbrokeren
https://cloudstorage-onedrive-mcp.vercel.app/mcp med DCR, onedrive.read og
onedrive.write. Connected accounts og Primary er bekræftet i UI. Det eksisterende
ikon er bevaret. CloudStorage Portal opløser Dropbox, Google Drive og samme
OneDrive-App; den har ingen selvstændig OneDrive-loginidentitet.

Den registrerede App-rute er testet gennem Desktops officielle codex_apps-server
i den eksisterende testchat: stabil personlig identitet, gyldig rodliste,
oprettelse af isoleret testmappe, upload, read_text, indholdsopdatering og
UTF-8-readback med SHA-256 samt oprydning til papirkurven. Runtime 0.3.2 annoncerer
28 værktøjer. Det beviser ikke alle mulige operationer; deling og permanent
sletning blev ikke brugt som test.

Native MCP blev separat testet med bl.a. download, omdøbning, flytning, kopiering,
kopimonitor, versionsliste og download af historisk version. Bland ikke denne
evidens sammen med den registrerede App-rute. Staging-resultater fra oktober er
historik og må ikke stå som bevis for den aktive forbindelse.

På denne historiske kontroldato afventede refresh en kontinuitetstest efter
broker-access-tokenlevetiden. Det udestående punkt er afløst af den dokumenterede
produktionsfornyelse 16. november ovenfor. Lokale mocktests eller et ventende job
er ikke et live-refresh-bevis.

Lokale revisionskvitteringer i projektets outputs/: ONEDRIVE-APP-CREATION-20261102.json,
ONEDRIVE-CONNECTED-APP-WRITE-20261102.json, ONEDRIVE-032-SOURCE-VERIFY-20261102.json
og ONEDRIVE-SILENT-CONTINUITY-20261102.json. De kan indeholde brugeridentitet og
filmetadata og skal ikke lægges ukritisk i en offentlig pluginpakke.

##### Acceptance-tests

Brug PASS, FAIL eller NOT RUN. Stopper et tidligere led, er afhængige led NOT RUN.

| Led | PASS kræver |
| --- | --- |
| Deployment | Alias → deployment-ID → kilde/build-input, korrekt mål |
| Discovery | Resource, issuer, endpoints, scopes og klientmetode matcher |
| Authorize | Tilsigtet Microsoft-klient/konto og accepteret request |
| Callback | Præcis callback og korrekt state/PKCE-binding |
| Token | Faktisk host-tokenudveksling lykkes |
| Connected | Konto knyttet i klientens UI |
| Tools | initialize/tools/list lykkes, forventede værktøjer findes |
| Identity | Konto-værktøjet returnerer korrekt immutable identitet |
| Root | Rodværktøj giver gyldigt resultat for samme drive; tom rod er gyldig |
| Refresh | Fornyelse og ny rodliste med samme identitet/drive lykkes |

##### Særskilt kontrol: Business-driveadgang

Login og driveadgang er separate kontrolpunkter. Når brugeren allerede har bekræftet Entra-login, skal loginfejlsøgning ikke genstartes. Undersøg først den eksisterende forbindelses kontovalg og den autoriserede Business-kontos driveadgang. Det kræver ikke først at flytte connectoren til ChatGPT Business. Bevar den personlige konto og eksisterende forbindelser.

Registrér tenant, kontotype og immutable identitet uden tokens. En gæst/EXT-bruger er ikke automatisk en provisioneret OneDrive for Business-bruger. Hvis login accepteres men drive mangler, behold begge fund: login PASS, driveadgang FAIL med præcis fejl. Opret ingen betalte licenser som stiltiende del af 0 kr.-testen.

Ved funktionel udvidelse vurderes referencebibliotekerne særskilt. Kopieret workflow er ikke implementeret Graph-operation, tilladelse eller værktøjsbevis. Kontroller licens, kontotype, aktuelle endpoints, scopes og read/write-tests før integration.

### Not embedded

- `assets/wrp-icon-128.png` (binary asset, not embedded)
- `assets/wrp-icon-256.png` (binary asset, not embedded)
