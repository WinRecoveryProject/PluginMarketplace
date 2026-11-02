# OneDrive: faktisk indlæsning i Codex Desktop

Kontrol: 2. november 2026 med den installerede Desktop-runtime
`0.166.0-alpha.5.1`, dens genererede protokolschema og `plugin/read`.
Ingen modelkald eller nye chats indgik i testen.

| Ikke-installeret testfixture | Apps indlæst | MCP-servere indlæst |
| --- | ---: | ---: |
| Brugerens originale OneDrive 1.1.5 | 0 | 0 |
| Samme portable format, uden MCP-serverens `extensions` | 0 | 1 |
| Samme indhold med native Desktop-entrypoint | 1 | 1 |

De tre fixtures blev læst fra separate lokale testmapper; ingen blev installeret
eller registreret i brugerens konfiguration. Skills og ikon blev bevaret.

Den portable MCP-parser i den relevante Codex-implementation afviser ukendte
felter i en serverdefinition (`deny_unknown_fields`). `extensions` er ikke blandt
de accepterede serverfelter. Desuden aktiveres portable App-deklarationer kun for
den særlige remote-curated-kilde, mens native/legacy-formatet understøtter dem
for private Git-pakker. Et gyldigt manifest eller en vellykket installation
beviser derfor ikke, at App og MCP faktisk blev indlæst.

Primære kilder:
- [MCP-parser](https://github.com/openai/codex/blob/main/codex-rs/codex-mcp/src/agent_plugin_config.rs)
- [App-routing](https://github.com/openai/codex/blob/main/codex-rs/core-plugins/src/app_mcp_routing.rs)
- [Plugin-loader](https://github.com/openai/codex/blob/main/codex-rs/core-plugins/src/loader.rs)

Kildelæsningen understøtter forklaringen. Den udførte fixturetest beviser
adfærden i brugerens installerede runtime; en nyere upstream-branch alene gør ikke.

## Rettelse i 1.1.6

Det native Desktop-manifest er entrypoint. Det portable manifest er bevaret i
`references/portable-plugin.json` og skygger derfor ikke Desktop-manifestet.
Navnet OneDrive, App-bindingen, MCP-endpointet og det eksisterende ikon bevares.
Der oprettes ikke en ekstra App, server eller lokal broker.

Indlæsning er stadig et særskilt checkpoint før OAuth, Connected Account,
Graph-identitet, filoperationer og refresh. Ingen af disse efterfølgende trin
må markeres bestået alene ud fra denne test.
