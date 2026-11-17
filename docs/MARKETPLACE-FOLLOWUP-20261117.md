# Marketplace opfølgning 17 november 2026

## Rettelser

- Plugin-Skill-Studio **0.3.8** gemmer portable importkvitteringer. De private lokale stier findes fortsat i det lokale API-resultat, men følger ikke med nye kandidaters kvitteringer.
- Fem eksisterende kvitteringer i Marketplace har fået portable kilde- og målreferencer. Hashes og den oprindelige importhistorik er bevaret.
- Codex Process Jobs **0.5.3-wrp.1** er en tydeligt markeret Apache-2.0-vedligeholdelsesudgave med originalt navn, forfatter og ikon. Logrotationens Windows-fejl er rettet, inklusive genåbning, præcise halebuffer, cursor/generation og sekventielle writes gennem flere handles.

## Praktiske prøver

Studio består **118** regressionstests og **9** uafhængige importscenarier. Process Jobs består **6** regressionstests og **23** uafhængige logscenarier.

Regneark er nu afprøvet med den faktiske bundled Artifact Tool: formel, genberegning efter inputændring, XLSX-eksport, genindlæsning, danske tegn og renderet visuel kontrol. Summen ændrede sig korrekt fra 5 til 7.

PDF er afprøvet med bundled ReportLab, pypdf og Poppler: en interaktiv formular blev oprettet, udfyldt, genåbnet og renderet. Den kanoniske feltværdi, widgetværdi, appearance-stream og danske tegn stemmer.

## Afstemning og installationer

Den seneste brugerliste er afstemt med de faktiske installationer: **52/52 forskellige plugin-identiteter og 3/3 lokale skills er fundet**. Gentagne links og Word/Documents- samt Excel/Spreadsheets-aliaser tæller ikke som nye produkter. [Hele listen](USER-PLUGIN-CHECKLIST-20261117.md) skelner tilstedeværelse fra aktivering og funktionstest.

De to lokale Zilvereyes-grafikskills har fået portable projekt-/skillstier. Inventory-scriptet afviser manglende eller tvetydige projekter og angiver Git-fejl uden at kalde mappen ren. **8 regressionstilfælde og 21 uafhængige scenarier** består; seks uafhængige scenarier bruger den faktiske CLI. Git-successgrene er mocktestet; rigtige grafikprojekter, billedgenerering og Blender er ikke berørt. [Filhashes og afgrænsning](LOCAL-SKILL-PORTABILITY-20261117.json).

En opdateringskommando installerede først fire hidtil fraværende Marketplace-kopier. De fire nye installationer er fjernet igen; katalogposterne og de oprindelige personlige pakker er bevaret. Den oprindelige installationsmængde, aktiveringsflag og konfigurationsbytes er verificeret genoprettet. Et nyt [læsebaseret opdateringspreview](INSTALLED-UPDATE-PREVIEW.md) skelner mellem katalogposter og allerede installerede, aktive identiteter; det udfører ingen installation.

Slutkontrollen viser **61 CLI-poster og 7 yderligere personlige remote-identiteter**, **28 Apps**, **561 skillstier** og **37 bevarede skill-deaktiveringer**. Der er ingen skill-indlæsningsfejl. Kilde-, katalog- og installationspayloads er sammenlignet med **3.329 filhashkontroller**; de to personlige udgivelser er også sammenlignet separat. App-identiteter og forbindelseskonfiguration er bevaret.

## Fortsat åbent

Agentmemory-forbindelsens Tailscale-netværk kan ikke synkronisere eller finde den eksisterende server. Login og credentials er ikke ændret. Computer Uses tidligere værtsfejl er ikke erklæret løst af denne opfølgning.

Process Jobs-controlleren er fortsat macOS/Linux-only. Windows bruger den eksisterende host-session-rute. Controlleren og eksisterende brugerjobs er ikke startet eller ændret. Linux-runtime og samtidige multi-process-writers er ikke verificeret.

Dette er afgrænset funktionsevidens. Den tidligere [68-identiteters gennemgang](PRACTICAL-STUDIO037-20261117.md) og dens uafprøvede funktioner gælder fortsat. Se [maskinrapporten](MARKETPLACE-FOLLOWUP-20261117.json) for præcist scope. Budget: **0 kr**.
