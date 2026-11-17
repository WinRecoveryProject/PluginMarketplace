# Installeret audit og historisk afstemning — 17. november 2026

Gennemgangen bruger Plugin-Skill-Studio 0.3.6. Fundene i optælling og versionsmetadata er rettet i **Studio 0.3.7**. [Maskinrapport](INSTALLED-AUDIT-STUDIO036-20261117.json) · [fuld historisk afstemning](INSTALLED-PLUGIN-HISTORY-20261117.json) · [bevarede rå fund og vurderinger](INSTALLED-AUDIT-STUDIO036-20261117-findings.json).

## Korrekt omfang

| Kilde | Verificeret antal |
|---|---:|
| Fuld lokal CLI-installationsliste | 61 pluginregistreringer |
| Yderligere personlige remote-registreringer | 7 |
| Union af præcise `name@marketplace`-identiteter, alle kildegennemgået | 68 |
| Apps, særskilt fra plugins | 28 |
| MCP-registreringer | 9 |
| Unikke native skillstier / selvstændige skills | 561 / 28 |

Det tidligere tal 34 beskrev kun et filtreret katalogudsnit. Apps må ikke bruges som pluginantal. Flere registreringer kan være visninger af samme produkt eller dele en App; der påstås ikke 68 forskellige produkter.

## Historik: alle 52 tidligere installationer afstemt

- 42 tidligere identiteter findes stadig direkte.
- Codex Dev Workflows, Codex Coordinator og Context Handoff har vedligeholdte personlige modparter. Den oprindelige identitet kaldes ikke installeret, når kun modparten findes.
- Efter brugerens udtrykkelige valg beholdes Plugin Autopilot, Skill Risk Check, Plugins Radar, Skills Evidence Matrix, Matt Skills Curated, Universal Plugin Installer og GPTs to Plugin **samlet i Studio**. Originalpakkerne er ikke geninstalleret. De konkrete tilpasninger og implementeringsfiler er dokumenteret; fuld adfærdslighed med alle originale tjenester påstås ikke.

## Rettelser og prøver

Studio får en dataafstemning, som kræver både fuld CLI-liste og native remote-katalog, holder Apps adskilt, viser versionskonflikter og sammenligner historik uden navnegæt. En anden rettelse synkroniserer integrationsregisterets forældede versionsfelt og kontrollerer det fremover.

**117 Studio-tests** og **71 upstream-regressionstests** består. Dockerfile-kontrollerne er aktive. De 13 tidligere installationsopskrifter og deres kopier er fortsat rettede. De nye signaler i Studios egne detektionsregler og test-fixtures er vurderet mod præcis udgivet kilde; ingen regler er globalt undertrykt. Rå advisories og bevidst deaktiverede upstream-entrypoints er bevaret.

En frisk kontrol af den eksisterende personlige OneDrive-konto, drev og rod lykkes gennem samme App-rute som CloudStorage Portal. Værtens aktuelle schema kræver et annonceret `link_id`; dette vælges fra den eksisterende Primary-konto. Tre indledende kald manglede dette argument og blev afvist af værten. De korrekte genkald lykkedes uden ændret login, server eller forbindelse. Ingen cloudfiler er skrevet under denne kontrol.

Budget: **0 kr.** Apps/MCP-status og målrettede tests betyder ikke, at alle eksterne funktioner eller vilkårlige skill-forløb er praktisk certificeret. Business-licensgrænsen er ikke genåbnet som loginfejl. Slutrapporten angiver særskilt den efterfølgende installations- og forbindelsesverifikation.

## Levering verificeret

Studio **0.3.7** er udgivet i det eksisterende kilde-repo, det eksisterende personlige plugin og Marketplace og installeret i Desktop. Alle 13 frosne kildepakker matcher deres hashes; Studio har 326 kildefiler i Marketplace/Desktop/installationen. Den personlige runtime har 311 identiske filer og ét værtsnormaliseret manifest. Begge ændrede Studio-rødder er genanalyseret efter installation; ingen nye uvurderede signaler. De 10 målrettede tests fra den installerede pakke består. Marketplace består 1.598 kontroller. Eksisterende App-tilstande, konfiguration, providerbindinger og alle 37 deaktiverede skillstier er bevaret; de 37 rettede MegaLinter-filer matcher stadig patchkvitteringen.

Den første skill-liste efter opdateringen viste kun 284 stier. Konfigurationens 37 deaktiveringer var stadig bevaret, og ingen tidligere deaktiveret skill var ændret til aktiv. Efter indlæsning af hele kataloget og normalisering af projektstier viste både den friske og den gentagne varme kontrol igen 561 stier med alle 37 deaktiveringer. Der blev ikke ændret indstillinger for at gennemføre genkontrollen. Den præcise fordeling mellem katalog-opvarmning og stinormalisering som årsag er ikke fastslået.
