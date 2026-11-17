# Marketplace opfølgning 17 november 2026

## Rettelser

- Plugin-Skill-Studio **0.3.8** gemmer portable importkvitteringer. De private lokale stier findes fortsat i det lokale API-resultat, men følger ikke med nye kandidaters kvitteringer.
- Fem eksisterende kvitteringer i Marketplace har fået portable kilde- og målreferencer. Hashes og den oprindelige importhistorik er bevaret.
- Codex Process Jobs **0.5.3-wrp.1** er en tydeligt markeret Apache-2.0-vedligeholdelsesudgave med originalt navn, forfatter og ikon. Logrotationens Windows-fejl er rettet, inklusive genåbning, præcise halebuffer, cursor/generation og sekventielle writes gennem flere handles.

## Praktiske prøver

Studio består **118** regressionstests og **9** uafhængige importscenarier. Process Jobs består **6** regressionstests og **23** uafhængige logscenarier.

Regneark er nu afprøvet med den faktiske bundled Artifact Tool: formel, genberegning efter inputændring, XLSX-eksport, genindlæsning, danske tegn og renderet visuel kontrol. Summen ændrede sig korrekt fra 5 til 7.

PDF er afprøvet med bundled ReportLab, pypdf og Poppler: en interaktiv formular blev oprettet, udfyldt, genåbnet og renderet. Den kanoniske feltværdi, widgetværdi, appearance-stream og danske tegn stemmer.

## Fortsat åbent

Agentmemory-forbindelsens Tailscale-netværk kan ikke synkronisere eller finde den eksisterende server. Login og credentials er ikke ændret. Computer Uses tidligere værtsfejl er ikke erklæret løst af denne opfølgning.

Process Jobs-controlleren er fortsat macOS/Linux-only. Windows bruger den eksisterende host-session-rute. Controlleren og eksisterende brugerjobs er ikke startet eller ændret. Linux-runtime og samtidige multi-process-writers er ikke verificeret.

Dette er afgrænset funktionsevidens. Den tidligere [68-identiteters gennemgang](PRACTICAL-STUDIO037-20261117.md) og dens uafprøvede funktioner gælder fortsat. Se [maskinrapporten](MARKETPLACE-FOLLOWUP-20261117.json) for præcist scope. Budget: **0 kr**.
