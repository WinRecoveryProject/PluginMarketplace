# OneDrive: én appforbindelse og tydelig Entra-status

## Marketplace 1.2.2

OneDrive og CloudStorage Portal bruger den samme filopslagskode. Efter en tom, vellykket søgning kan opslaget finde ét eksakt match blandt alle direkte børn i en kendt mappe. Det kræver samme verificerede konto og en afsluttet mappeliste. Et nyt metadataopslag bekræfter navn, type og forældremappe før filhandlinger.

Den eksisterende Personlig-App er fælles for OneDrive og Portal. En afgrænset test gennem den fælles forbindelse oprettede én prøvefil. Genlæsningen matchede 72 byte og SHA-256, og Portals installerede mappelookup fandt filens eksakte ID. Oprettelsen var en særskilt test uden overskrivning.

Personlig remote er verificeret på 1.2.1. Værtens opdateringsværktøj afviste ændringen til den eksisterende App-post. Business-pakken bruger fortsat sit eget eksisterende App-ID, og den tilsvarende 1.2.2-ZIP er valideret. Business-pakkens aktivering og filadgang afventer den Business-scope, hvor posten er tilgængelig.

## Tokenfornyelse i produktion

Den 19. november kl. 07.42.14 dansk tid gennemførte den eksisterende OneDrive-broker en faktisk tokenfornyelse for Personlig. Efter fornyelsen viste samme diagnostiske ID et vellykket konto- og identitetskald. En rodlæsning med samme ID er dokumenteret i produktionskontrollen fra 16. november. Diagnostikken registrerer udfald og tidspunkt uden credentials. Den tilgængelige Business-post afventer separat livekontrol.

## Samling af forbindelsen

OneDrive 1.2.0 bevarer den eksisterende registrerede OneDrive-app, logoet og to skills. CloudStorage Portal bruger fortsat samme app. Den ekstra native MCP-klient er fjernet fra pakken; den hosted MCP-server fortsætter bag appen.

Den tidligere Marketplace-pakke 1.1.8 viste **Apps 1 + MCP-servere 1 + Skills 2**. Den havde dermed både appens konto og en ekstra selvstændig DCR-loginrute. Den nye pakke viser **Apps 1 + Skills 2** og kræver kun appens eksisterende forbindelse.

Den personlige remote-pakke er nu også opdateret til **1.2.0** med de samme to skills som Marketplace-pakken. Begge installerede pakker er kontrolleret i Desktop: samme eksisterende app, nul ekstra native MCP-ruter og to skills. De to skill-filer matcher byte for byte. CloudStorage Portal er også kontrolleret og henviser til samme app.

Remote-pakken bruger værtens automatiske opdagelse af `skills`-mappen. Appbinding, oprindelig præsentation og privat adgang er bevaret; manifestets eneste ændring er versionsnummeret. Pakkeeditoren afviste tilføjelse af eksplicitte skill-stier i manifestet, men accepterede de to skill-filer med oprindelig manifeststruktur og derefter en særskilt versionsændring.

Marketplace-siden og det personlige appkort kan fortsat have forskellige menuer og visninger. Det er ikke to Microsoft-appregistreringer. Remote-appen må ikke afinstalleres som dublet: både Marketplace-pakken og Portal bruger dens forbindelse.

Native loader-kontrollen bekræfter **én eksisterende app, nul ekstra MCP-ruter og to skills**. Begge tidligere rod-MCP-filer er arkiveret under `references/legacy`, fordi Desktop ellers opdager dem automatisk, selv uden `mcpServers` i manifestet.

## Entra-login

Broker 0.3.3 skelner mellem autentificeret Microsoft-profil og adgang til et OneDrive-drev. Tidligere kunne et afvist drev omdanne et ellers gennemført login til generisk HTTP 500 og “Login failed”.

En verificeret profil kan nu gennemføre kontolæsning og værktøjsopdagelse. Hvis drevet er utilgængeligt, afviser alle filværktøjer adgang med en afgrænset årsag. Der bruges aldrig den personlige kontos drev som erstatning for Entra-kontoens drev. Ugyldige profiler og Microsoft 401 afvises fortsat. Login uden drev er ikke bevis for fungerende OneDrive Business.

Diagnostikken viser kun faste fase-/operationsnavne, HTTP-status, godkendte fejlkoder og validerede request-ID’er. Tokens, rå fejltekster, profiloplysninger og filnavne logges ikke.

## Kontrol og økonomi

- 69/69 lokale servertests består, herunder 11 nye tests for Entra-/drevadskillelse.
- Den native pakkekontrol og Marketplace-valideringen består.
- Appbinding og logo er bevaret; Microsoft-scopes er ikke udvidet.
- Efter udrulning bestod den personlige konto profil-, drev- og rodlistekontrol. Fire læsninger af eksisterende isolerede testfiler bestod også. Det er ikke bevis for, at den tidligere periodiske læsefejl er permanent løst.
- Et frisk Entra-forsøg den 16. november lykkedes: brugeren bekræftede grønt login, kontoen blev tilføjet, og appens kontoværktøj returnerede den samme Entra-identitet før og efter pakkeopdateringen.
- Entra-drevadgang er fortsat afvist. Det friske forsøg gav Graph HTTP 400 og `onedrive_tenant_license_missing`; dette er et nyt livefund, adskilt fra oktobers historik. Login er bestået, men Business-filadgang er ikke bestået. Der blev ikke brugt et personligt drev som erstatning.
- Entra er nu den valgte konto. Den tidligere personlige kontrol er bevaret som særskilt evidens; den er ikke en ny kontrol efter kontoskiftet. En faktisk refresh-grant gennem den registrerede app er endnu ikke direkte observeret.
- Eksisterende Vercel-projekt og Hobby-plan genbruges. Ingen konto, licens, credential eller betalt ressource oprettes. Budget: **0 kr.**
