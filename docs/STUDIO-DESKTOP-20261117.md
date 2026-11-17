# Studio 0.3.10 — lokal Windows-styring

Plugin-Skill-Studio indeholder nu den lokale Windows-backend i den eksisterende `automate-ui`-workflow. Der tilføjes ingen ekstra plugin-, App- eller MCP-forbindelse. Node-CLI'en tilbyder vinduesvalg, UI-tekstlæsning, skærmfangst og afgrænsede museoperationer med eksisterende Windows-komponenter. Se [brugsvejledningen](../plugins/plugin-skill-studio/references/windows-desktop.md).

**Dette ændrer ikke OpenAIs native Computer Use-komponent.** Den fejler fortsat ved WGC-skærmfangst på den testede Windows 10-vært. Den integrerede lokale backend er den afprøvede alternative rute.

## Verifikation

- 130/130 kildetests, herunder 11 Desktop-tests, består. 18 uafhængige scenarier består. ZIP'en er reproducerbar og valideret efter frisk udpakning.
- Faktisk Desktop-prøve: skærmfangst, klik på Plugins, CloudStorage Portal og dens eksisterende OneDrive-App. Portal-siden viste Dropbox, Google Drive og OneDrive. OneDrive viste fortsat både personlig Primary og den separate Entra-konto. Ingen switches, konti eller tilladelser blev ændret.
- To nye UTF-8-testfiler blev oprettet og opdateret i en separat testmappe. Begge blev genlæst med præcist indhold og SHA-256. Portal og OneDrive bruger her samme eksisterende OneDrive-App og credential-rute; det er ikke to uafhængige loginprøver.
- Afviste klik ved nye input blev genobserveret. En tidlig serialiseringsfejl i UI-tekst og en miljøafhængig hash-cmdlet blev rettet. Ét klik ramte et tomt chatområde efter sideskift; det er registreret separat og tæller ikke som bestået navigation. Den efterfølgende faktiske Portal-/OneDrive-navigation er bekræftet visuelt og via UI-tekst.

## Afgrænsninger og bevaring

Evidens gemmes i en fysisk privat lokal mappe uden for pluginpakken. UNC-, netværks- og reparse-stier afvises. Klik kræver eksplicit execute-flag, faktisk brugerautorisation, præcis procesidentitet, frisk capture, uændret geometri/billede/input og korrekt ejerskab af punktet. En fejl må ikke automatisk genafspilles. Ingen login-, sikkerheds- eller brugerinputspærring må omgås.

Andre apps, skærmskaleringer, tokenfornyelse og den selvstændige scroll-/aktiveringsrute er ikke erklæret liveverificeret. Den personlige og Entra-kontoens tilstedeværelse beviser ikke en ny Entra-drevlicensprøve. Ingen Dropbox- eller Google Drive-filskrivning blev udført i denne prøve.

Navn, ikon og eksisterende Studio-identitet bevares. Distributionen følger de eksisterende private kanaler; ingen offentlig directory-indsendelse eller ny modtagerkreds. Budget: **0 kr**. Se [maskinrapporten](STUDIO-DESKTOP-20261117.json).

Den afsluttende routingsrettelse i 0.3.10 bevarer plugin-evaluering, oprettelse og opdatering, når anmodningen også nævner Desktop. En særskilt red/green-regression dækker disse tre tilfælde.
