# OneDrive: én appforbindelse og tydelig Entra-status

## Samling af forbindelsen

OneDrive 1.2.0 bevarer den eksisterende registrerede OneDrive-app, logoet og to skills. CloudStorage Portal bruger fortsat samme app. Den ekstra native MCP-klient er fjernet fra pakken; den hosted MCP-server fortsætter bag appen.

Den tidligere Marketplace-pakke 1.1.8 viste **Apps 1 + MCP-servere 1 + Skills 2**. Den havde dermed både appens konto og en ekstra selvstændig DCR-loginrute. Den nye pakke viser **Apps 1 + Skills 2** og kræver kun appens eksisterende forbindelse.

Den personlige remote-post er værtens appkort for den samme registrerede app. Dens 1.0.0-wrapper og pakkens 1.2.0 er forskellige værtselementer, så versionstal og menuer er ikke tvunget identiske. Det er ikke to Microsoft-appregistreringer. Remote-appen må ikke afinstalleres som dublet: både Marketplace-pakken og Portal bruger dens forbindelse.

Native loader-kontrollen bekræfter **én eksisterende app, nul ekstra MCP-ruter og to skills**. Begge tidligere rod-MCP-filer er arkiveret under `references/legacy`, fordi Desktop ellers opdager dem automatisk, selv uden `mcpServers` i manifestet.

## Entra-login

Broker 0.3.3 skelner mellem autentificeret Microsoft-profil og adgang til et OneDrive-drev. Tidligere kunne et afvist drev omdanne et ellers gennemført login til generisk HTTP 500 og “Login failed”.

En verificeret profil kan nu gennemføre kontolæsning og værktøjsopdagelse. Hvis drevet er utilgængeligt, afviser alle filværktøjer adgang med en afgrænset årsag. Der bruges aldrig den personlige kontos drev som erstatning for Entra-kontoens drev. Ugyldige profiler og Microsoft 401 afvises fortsat. Login uden drev er ikke bevis for fungerende OneDrive Business.

Diagnostikken viser kun faste fase-/operationsnavne, HTTP-status, godkendte fejlkoder og validerede request-ID’er. Tokens, rå fejltekster, profiloplysninger og filnavne logges ikke.

## Kontrol og økonomi

- 69/69 lokale servertests består, herunder 11 nye tests for Entra-/drevadskillelse.
- Den native pakkekontrol og Marketplace-valideringen består.
- Appbinding og logo er bevaret; Microsoft-scopes er ikke udvidet.
- Personlig cloudadgang og et frisk Entra-forsøg verificeres særskilt efter udrulning. Den historiske licensfejl fra oktober er ikke fremstillet som et nyt livefund.
- Eksisterende Vercel-projekt og Hobby-plan genbruges. Ingen konto, licens, credential eller betalt ressource oprettes. Budget: **0 kr.**
