# Plugin files: agentmemory-asus — manifests and top-level files

Source: `plugins/agentmemory-asus`. Files outside the `skills/*` folders, embedded as text.

## File: `.app.json`

```json
{
  "apps": {
    "agentmemory-asus": {
      "id": "asdk_app_6afcbaea744c8191bf18756ef4058cf0",
      "required": false
    }
  }
}
```

## File: `LICENSE`

```text
MIT License

Copyright (c) 2026 Zilvereyes

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## File: `PRIVACY.md`

### Privatliv

Denne wrapper indeholder instruktioner og en reference til den eksisterende App.
Den indfører ingen separat lagring, telemetri, netværksklient eller credentials.
Den tilsluttede AgentMemory-ASUS-tjeneste behandler de data, brugeren vælger at
læse eller gemme, efter dens eksisterende adgang, drift og datavilkår. Denne
wrapper udvider ikke delingskredsen og ændrer ikke tjenestens opbevaring.

Brug snævert projekt-/opgavescope. Undlad passwords, tokens, nøgler, auth-filer og
andre hemmeligheder. Eksport, deling, synkronisering og sletning kræver konkret
autorisation. Statisk audit må ikke automatisk gemme brugerdata.

## File: `README.md`

### AgentMemory-ASUS — Marketplace workflow 1.0.0

En selvstændigt forfattet arbejdsgang til den **eksisterende AgentMemory-ASUS App**.
Pakken samler diagnose, afgrænset søgning og konkret godkendte hukommelsesopgaver.
Den ændrer ikke Appens identitet, hukommelsesdata, server, authentication eller
separat installerede native MCP-forbindelse.

`.app.json` refererer til den eksisterende App
`asdk_app_6afcbaea744c8191bf18756ef4058cf0`. `required:false` erklærer valgfri
integration; feltet er ikke et bevis for værtsfortolkning, adgang eller samtykke.
Hvis værten ikke eksponerer Appen, forbliver App-ruten UNAVAILABLE. Pakken
provisionerer ingen fallback og indeholder ingen MCP-server, endpoints, hooks,
credentials, settings, netværksklient eller backendimplementering.

Læs [skillen](skills/agentmemory-asus/SKILL.md), [proveniens](references/provenance.json),
[privatliv](PRIVACY.md) og [vilkår](TERMS.md). MIT-licensen dækker kun disse egne
metadata, dokumenter, egne assets og workflow-instruktioner. Den giver ingen licens til den
eksterne App, serverimplementering eller brugerdata.

Den oprindelige private App-release har to filer og ingen logo-/licensfil. Dens
manifests developer-felt er generisk `App developer`, mens det native katalog
viser Zilvereyes. Denne egne wrapper bruger Zilvereyes som forfatter uden at
påstå ejerskab til en kopieret backend eller ændre den oprindelige App. Wrapperens
nye, selvstændigt genererede branding er ikke kopieret fra Appen eller backend.
Originalens manglende ikon er bevaret som provenance.

Budget: 0 kr. Statisk validering er ikke en fuld funktionstest. Diagnose, genfinding,
verificeret skrivning og værtskonto-adgang skal rapporteres hver for sig. Ingen
funktioner kaldes automatisk ved audit eller installation.

## File: `SUPPORT.md`

### Support

Registrér problemer i det eksisterende
[PluginMarketplace-repository](https://github.com/WinRecoveryProject/PluginMarketplace).
Skeln mellem wrapperens instruktioner, værtskontoens App-eksponering og den
eksisterende AgentMemory-ASUS-tjenestes faktiske diagnose eller dataoperationer.
Del kun saniterede fejlbeskeder og afgrænset evidens; del ingen credentials,
private hukommelsesudtræk eller signed URLs. Denne vejledning sender ingen sag
eller besked automatisk.

## File: `TERMS.md`

### Vilkår

Egne wrapper-metadata, dokumenter og instruktioner leveres under MIT-licensen.
Den eksisterende App, dens servere, data og tredjepartsfunktioner er separate
tjenester med deres egne gældende vilkår og licenser. Der gives ingen ny adgang,
garanteret oppetid, sikkerhedscertificering eller garanti for gratis eksternt forbrug.

Projektets budget er 0 kr. Kontrollér faktisk adgang og inkluderet brug før en
ekstern handling. Opret ikke ekstra konti, betalingsplaner eller forbindelser.
