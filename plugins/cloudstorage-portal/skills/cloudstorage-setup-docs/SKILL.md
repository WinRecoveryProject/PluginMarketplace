---
name: cloudstorage-setup-docs
description: "Explain and reproduce the documented zero-cost CloudStorage Portal setup, Microsoft Entra app roles, hosted OneDrive broker, callbacks, DCR and secret-field mapping; use for setup documentation, onboarding and login troubleshooting."
---

# CloudStorage Portal — opsætning og arkitektur

Forklar den dokumenterede opsætning og hjælp en ny bruger gennem den. Denne skill er en vejledning, ikke en credentialbutik eller en ny MCP-runtime.

Aktuel pakke: Portal router til Dropbox, Google Drive og OneDrive via App-bindinger; CloudStorage Portal Local er ikke påkrævet. OneDrive har 28 annoncerede værktøjer. Skriveadgang kræver onedrive.read + onedrive.write og nyt Microsoft-samtykke til Graph Files.ReadWrite. De følgende referencer indeholder også historiske læse-/OBO-forløb; brug dem ikke som den aktuelle skrivekontrakt.

## Opslag

- Første opsætning: [0 kr.-guiden](references/setup-guide.md).
- Konti, pakker og OAuth-kontrakter: [arkitektur](references/architecture.md).
- Fejlkoder og sammenhørende felter: [fejlfinding](references/troubleshooting.md).
- Faktisk bevis og acceptance-tests: [verifikation](references/verification.md).
- Officielle sites, kildegrundlag og deling: [kilder](references/sources.md).

## Arbejdsform

1. Skeln mellem Microsoft-kontoen, der autentificeres, ChatGPT/Codex-kontoen, der ejer forbindelsen, og den hosted server. En Entra-konto er ikke et ChatGPT Business-arbejdsområde.
2. Find eksisterende kilde, deployment og forbindelse. Pluginpakke, installation/cache, referencebibliotek og hosted runtime er forskellige objekter.
3. Brug de præcise feltnavne på den aktuelle skærm. Giv ét brugertrin ad gangen ved credentials og login. Nævn kun det app-/variabelpar, brugeren arbejder med nu.
4. Læs kun den relevante reference. Undersøg første faktiske fejlende led før ændringer. Kontroller aktuelle udbyderregler hos den officielle kilde.
5. Credentials indtastes af brugeren i tjenesternes sikre felter. Bed aldrig om Value, tokens, callbackkoder eller clipboardindhold i chat. Undgå screenshots, mens en ny Value vises.
6. Overhold 0 kr.: ingen køb, domæner, betalte aggregatorkonti eller opgraderinger. Kontrollér planvilkår og kvoter. Gratis hosting garanterer ikke gratis adgang til alle produkter.
7. Save og Ready er ikke loginbevis. Kontrollér ny deployment, rigtigt alias, faktisk tokenudveksling og Connected accounts.
8. Bind alle konto-/rodprøver til den rigtige forbindelse og identitet. Brug ikke lokal syncmappe eller en anden konto som skjult fallback.
9. Rapportér Connect, consent/callback, token, Connected accounts, discovery, identitet, rod og refresh separat. Den aktive App hedder OneDrive og bruger produktionsbrokerens URL. Staging og tidligere Business-installationer er historiske referenceforløb, ikke alternative produktkrav.

## Leverance

Giv næste konkrete trin og en præcis bevisgrænse. Brug pladsholdere i offentlig dokumentation. Bevar kilde, licens, revisionsspor og en konkret tilbageførsel. Installation, deployment, credentialændringer og publicering udføres kun inden for den aktuelt autoriserede opgave.
