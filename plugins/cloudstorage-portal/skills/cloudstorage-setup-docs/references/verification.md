# Verifikation og næste mål

## Faktisk status 27. oktober 2026

Aktuel Desktop-pakke: OneDrive og Portal refererer nu udtrykkeligt til den eksisterende personlige App, hvis værktøjer faktisk er tilgængelige i hosten. Den tekniske forbindelse hedder OneDrive Broker Staging. Gentesten returnerede samme immutable identitet, 17 rod-elementer, host_refresh=200 og endnu en vellykket rodliste efter refresh. App-ID og workspace er ikke produktkrav; Google Drive og Dropbox er uændrede native App-referencer. De efterfølgende produktionsfund er separat historik og må ikke blandes sammen med denne valgte forbindelse.

Google Drive og Dropbox har svaret med de aktuelle kontoprofiler gennem deres native værktøjer. OneDrive Broker Staging er særskilt live verificeret med stabil personlig identitet, 17 rod-elementer og faktisk refresh efterfulgt af rodliste.

Den nye OneDrive-App bruger produktionsbrokeren med DCR og onedrive.read. Den gennemførte personligt Microsoft-login og viste Connected accounts og Primary. Workspace-registeret bekræftede Enabled, Available og fire læseværktøjer. Produktionsloggen viste vellykket token/OBO-, profil-, drev- og autentificeret MCP-adgang. Separat identitet, rodliste og refresh skal stadig verificeres gennem netop den nye App i den opdaterede Codex-installation; staging-resultater må ikke bruges som erstatning for disse prøver.

Et bestemt App-ID er ikke et produktkrav. Opdatér de relevante pakkereferencer, når en defekt registrering erstattes. Den gamle direkte Microsoft-konfiguration er historik, ikke en forudsætning for succes. Arbejds-/skolekontoens OneDrive, skrivning, deling og flere konti er særskilte prøver og er ikke bevist af den personlige loginprøve.

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

## Næste mål: Entra-login

Vælg Microsofts arbejds-/skolekonto gennem den eksisterende stagingforbindelse på personlig ChatGPT-konto. Det kræver ikke først at flytte connectoren til ChatGPT Business.

Registrér tenant, kontotype og immutable identitet uden tokens. En gæst/EXT-bruger er ikke automatisk en provisioneret OneDrive for Business-bruger. Hvis login accepteres men drive mangler, behold begge fund: login PASS, driveadgang FAIL med præcis fejl. Opret ingen betalte licenser som stiltiende del af 0 kr.-testen.

Når Entra-forløbet er afklaret, vurderes referencebibliotekerne til funktionel udvidelse. Kopieret workflow er ikke implementeret Graph-operation, tilladelse eller værktøjsbevis. Kontroller licens, kontotype, aktuelle endpoints, scopes og read/write-tests før integration.
