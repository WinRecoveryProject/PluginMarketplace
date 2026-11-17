# Verifikation og næste mål

## Seneste dokumenterede personlige kontrol: 16. november 2026

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

## Historisk kontrol: 2. november 2026

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

## Acceptance-tests

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

## Særskilt kontrol: Business-driveadgang

Login og driveadgang er separate kontrolpunkter. Når brugeren allerede har bekræftet Entra-login, skal loginfejlsøgning ikke genstartes. Undersøg først den eksisterende forbindelses kontovalg og den autoriserede Business-kontos driveadgang. Det kræver ikke først at flytte connectoren til ChatGPT Business. Bevar den personlige konto og eksisterende forbindelser.

Registrér tenant, kontotype og immutable identitet uden tokens. En gæst/EXT-bruger er ikke automatisk en provisioneret OneDrive for Business-bruger. Hvis login accepteres men drive mangler, behold begge fund: login PASS, driveadgang FAIL med præcis fejl. Opret ingen betalte licenser som stiltiende del af 0 kr.-testen.

Ved funktionel udvidelse vurderes referencebibliotekerne særskilt. Kopieret workflow er ikke implementeret Graph-operation, tilladelse eller værktøjsbevis. Kontroller licens, kontotype, aktuelle endpoints, scopes og read/write-tests før integration.
