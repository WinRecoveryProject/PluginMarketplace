# Studio 0.3.11: genfinding efter pluginopdatering

En aktiv chats skilloversigt kan stadig pege på en tidligere cacheversion efter
en almindelig pluginopdatering. Det blev reproduceret for Workbench: beta.4-stien
gav ENOENT, mens den registrerede beta.5 og dens skill fandtes. En fungerende
installation skal ikke repareres ved at genskabe den gamle cache.

Studio tilføjer `resolve-installed <request.json>`. Kaldet læser en ny, vellykket
CLI-installationsobservation og verificerer den præcise `name@namespace`, den
registrerede version, manifestet og den ønskede skillsti. Det vælger aldrig den
højeste cacheversion eller en anden leverandørs pakke. Manglende, deaktiverede,
tvetydige eller usikre stier giver `UNAVAILABLE`.

Snapshot og tidspunkt leveres af værten; 60-sekunderskontrollen er ingen
uafhængig attestation. Resultatet er kun `PATH_RESOLUTION_ONLY`. Individuel
skillaktivering forbliver `UNKNOWN`, kontoadgang er ikke verificeret, og resultatet
giver ingen eksekveringsautorisation. Værtens allerede injicerede oversigt kan
stadig være gammel. Den nye funktion ændrer ikke den begrænsning.

## Kontrol før udgivelse

- 138 Studio-tests bestod uden fejl eller spring over.
- 68 uafhængige adversarialprøver bestod, herunder namespace/version,
  gamle/fremtidige observationer, traversal, UNC/ADS, junctions, manifestfejl
  og forkert formede JSON-identiteter.
- Tre særskilte integrationsprøver verificerede API, CLI og UTF-8 BOM-input.
- Selvkontrol og generisk pluginvalidering bestod uden fejl. Den isolerede
  pakkekontrol gav en generel publiceringsnote om ingen særskilt liste over
  interne undtagelser; ændringen tilføjer ingen intern tjeneste eller credential.
- Den faktiske nye CLI-observation fandt Workbench beta.5 med korrekt manifest
  og den eksisterende safe-editing-skill. Den gamle beta.4-sti blev ikke genskabt.

Slutkontrollens resolver-SHA-256:
`1523d9abd1b95b2b99872edf533ee0412d6186a816462be6ea327bf2d0ea4a10`.

Ingen SDK-filer, globale agentinstruktioner, forbindelser eller kontoindstillinger
ændres af denne rettelse. Ingen autentificering, installation eller netværkskald
udføres af resolveren. Budget: **0 kr.**

Kilden er udgivet som [commit 13b0f59](https://github.com/WinRecoveryProject/Zilvereyes-Plugin-Studio/commit/13b0f5901b0b72152ba4666b5c73c1794ba1852e).
Den isolerede 0.3.11-pakke er bygget to gange med identiske bytes, valideret og
genprøvet fra frisk udpakning. Marketplace-valideringen består 1.672 kontroller.
Pakken bevarer de eksisterende erklæringer; der er ingen ny App, MCP-server eller
forbindelse.

## Installation efterprøvet

Den eksisterende Marketplace-installation er opdateret til 0.3.11. De 74
CLI-identiteter og deres aktiveringsflag, 29 Apps med deres flag, 486 skillposter
pr. kontrolleret arbejdsmappe og ni annoncerede MCP-identiteter/auth-statusser
er bevaret i de friske før/efter-observationer. Workspace-OneDrive er ikke ændret.

1.002 filhashsammenligninger stemmer mellem Marketplace, det konfigurerede
katalog og installationen. Alle otte resolver-regressioner består i den faktiske
installation. Nye faktiske CLI-opslag opløser både Workbench beta.5 og Studio
0.3.11 til deres korrekte skills. Den installerede selvkontrol består også.

Det verificerer installation og stiopløsning, ikke adgang til samtlige eksterne
udbydere eller omskrivning af en aktiv chats allerede injicerede skilloversigt.
