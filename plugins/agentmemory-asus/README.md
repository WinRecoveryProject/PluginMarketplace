# AgentMemory-ASUS — Marketplace workflow 1.0.0

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
