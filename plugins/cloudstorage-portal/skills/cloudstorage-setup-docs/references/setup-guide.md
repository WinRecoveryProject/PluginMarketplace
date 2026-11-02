# Opsætning med 0 kr. i ekstra budget

Statusdato: 2. november 2026. Aktiv runtime: 0.3.2. Den aktuelle OneDrive-App bruger læse-/skrivekontrakten beskrevet nedenfor. Planvilkår, adgangskrav, UI-navne og kvoter skal genkontrolleres ved ny opsætning.

## 1. Tjenester og kilde

Brug Microsoft Entra admin center til appregistreringer, Vercel til hosted broker/MCP og ChatGPT/Codex til klientforbindelsen. Google Drive og Dropbox forbliver separate native connectors.

Eget domæne, betalt aggregator, ekstern database og OpenAI API-nøgle var ikke nødvendige for denne personlige loginprøve. Et ChatGPT-abonnement og adgang til tjenesterne kan have egne krav. “0 kr.” betyder ingen ekstra køb her, ikke at alle produkter er gratis for alle.

Vercel-planen var Hobby. Kontroller Billing/planvisningen og de aktuelle anvendelsesvilkår før deployment. Brug ingen opgraderinger eller betalte tilvalg. Stop ved betalingskrav.

Brug den eksisterende hosted serverkilde i work/cloudstorage-onedrive-remote og dens låste dependencies. Kør dens eksisterende tests, og bind præcis kilde til revision eller filhashes. Den tidligere 41/41-kvittering er dateret evidens, ikke et nyt testresultat for andre kopier. Portalens repository er separat.

## 2. API-appen i Entra

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

## 3. Host-appen i Entra

Vælg/opret den særskilte app, der repræsenterer brokerens Microsoft-klient.

- Application (client) ID: dit HOST_APP_ID.
- Supported account types: omfatter kontoen der skal testes; projektets app tillader både Entra og personlige Microsoft-konti.
- API permissions for læse-/skrivegrenen: delegeret Microsoft Graph User.Read og Files.ReadWrite; brugeren skal give det konkrete samtykke. Den eksisterende access_as_user-tilladelse hører til læse-/OBO-grenen og må ikke forveksles med Files.ReadWrite.
- Authentication → Redirect URI configuration → Add Redirect URI → Web: https://<MCP_HOST>/oauth/callback, hvor MCP_HOST er den konkrete brokers host. Projektets aktive callback er https://cloudstorage-onedrive-mcp.vercel.app/oauth/callback; staging bruger sit eget alias.
- Certificates & secrets → Client secrets: host-appens egen credential.

I broker-modellen sender Microsoft sin kode tilbage til brokeren. ChatGPT-callbacken ligger på det andet OAuth-ben og håndteres via brokerens klientregistrering. Brug den callback der faktisk sendes, og bevar eksisterende callbacks indtil deres fjernelse er konkret bestilt.

## 4. Felter der hører sammen

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

## 5. Deploy staging

Environment Variables er siden, Preview er målet, og Save er knappen. Gemte variabler gælder først i en ny deployment.

Kontroller projekt, team, gratisplan og source/build-input. Deploy det testede kildesæt til staging/Preview. Redeploy-dialogen kan stå på Production; brug den ikke til staging uden at rette målet.

I projektets REST-API krævedes target=staging, mens target=preview blev afvist. Det er en observeret API-detalje, ikke et UI-feltnavn. Andre klienter skal følge deres dokumenterede Preview-fremgangsmåde.

Knyt staging-aliaset til den nye deployment. Kontroller runtime-publicUrl og discovery:
- /.well-known/oauth-authorization-server: brokerens issuer og egne OAuth-endpoints.
- /.well-known/oauth-protected-resource/mcp: korrekt HTTPS-resource og onedrive.read.
- /mcp uden token: 401 med OAuth-challenge.

OpenAI-serveren skal kunne nå adressen. Her blev kun det konkrete staging-alias undtaget fra Vercel-loginbeskyttelse efter brugerens godkendelse. Brokerens OAuth blev bevaret. Slå ikke hele projektets eller produktionens beskyttelse fra.

## 6. Klientforbindelsen

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

## 7. Test og vedligehold

Følg verification.md. Arbejds-/skolekonto testes særskilt fra personlig Microsoft-konto. Connected accounts er første synlige sluttilstand; værktøjer, identitet, rodliste og refresh skal testes bagefter.

Følg credentialudløb, quotas, revokering og dependency-opdateringer. Rotér én credential ad gangen, deploy det rigtige mål og gentest. Bevar forrige deployment til tilbageførsel.

Stateless krypterede grants er ikke en varig revokeringsliste. Fuld flerinstans-replaykontrol og serverbaseret per-connection-revocation er ikke bevist her. Dokumentér grænserne før bred offentlig drift; guiden er ikke et produktionssikkerhedsbevis.

## 8. Produktion og Portal-pakken

Efter en verificeret staging-prøve skal produktionens eget alias, kanoniske publicUrl, Web-callback og credentialmål kontrolleres. Gemte Preview-variabler overføres ikke automatisk til Production. Ændr kun de konkret autoriserede mål og deploy det samme verificerede kildesæt med den korrekte publicUrl. Kontrollér discovery igen.

Opret eller genkonfigurér OneDrive-forbindelsen mod produktionsbrokeren med DCR og både onedrive.read og onedrive.write. En gammel registrering kan beholde sine tidligere OAuth-endpoints, selv om serveren annoncerer nye. Bevar derfor ikke et defekt App-ID som et mål i sig selv. Genlæs den faktisk fungerende Apps ID og opdatér både OneDrive-pakkens og Portalens .app.json samt marketplace-reference og relevant proveniens.

Brug de eksisterende ikonfiler fra projektet. App-formularens Choose icon har en 10 KB-grænse, mens pakkens logo/composerIcon er separate filreferencer. Kontroller det synlige ikon efter upload og efter installation. Tilgængeliggørelse i et workspace er en særskilt publicering; hver bruger forbinder fortsat sin egen Microsoft-konto. Test til sidst Portalens tre Apps og den nye OneDrive-forbindelses identitet, rod og refresh i den aktuelle host.
