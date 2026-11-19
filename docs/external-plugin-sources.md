# External plugin sources

## Dropbox MCP på Acer og ASUS

Begge værter returnerede 41 værktøjer fra `dropbox@winrecoveryproject-digital` 5.0.1, uden fejl i værktøjsopslaget. Manifest og App- og MCP-filer matchede byte for byte. Den tidligere Acer-log placerer fejlen i HTTP-opslaget efter OAuth-metadata, før værten brugte de gemte legitimationsoplysninger. Ved gentesten svarede Dropbox’ offentlige metadata HTTP 200. Den underliggende transportårsag er uafklaret. [Dropbox’ OAuth-metadata](https://mcp.dropbox.com/.well-known/oauth-protected-resource/mcp)

## Geninstallation ved ændret katalogrevision på Windows

Codex CLI `0.169.0-alpha.11.1` forsøger at geninstallere de konfigurerede pakker, når det opgraderede Git-katalog skifter revision. Det gælder også ændringer i Claude-kataloget og dokumentationen. På Acer returnerede Windows delingsfejl 32 for versionsmappen til OpenAI Developers 1.2.3. Den aktive version og de 30 pakkefiler kunne stadig læses. [Codex’ opdateringskode](https://github.com/openai/codex/blob/rust-v0.169.0-alpha.11.1/codex-rs/core-plugins/src/manager.rs#L3123-L3158) · [Rapporteret versionsmappelås](https://github.com/openai/codex/issues/56718)

## Codex Coordinator 0.5.0

Den seneste stabile udgivelse er 0.5.0 på commit `75afa2866bedd2f2454f6e703b66a670ef67056a`. Marketplace fortsætter med 0.4.0, mens adfærdsændringerne vurderes. Den nye `UserPromptSubmit`-hook kan afvise koordinationsformaterede beskeder uden for projekter, der har aktiveret koordinering. Udgivelsen hæver standarden for eksisterende schema-2-projekter fra tre til fem samtidige opgaver og fjerner det tidligere maksimum på tolv. [Officiel udgivelse](https://github.com/eyeinthesky6/codex-coordinator/releases/tag/v0.5.0)

## Genkontrol af OpenAI Developers-cachen

Marketplace registrerer de 30 kildehashes for OpenAI Developers 1.2.3. Studio kontrollerer den aktive cache mod det observerede eksterne commit. På Windows kan 28 dokumenterede Git-checkout-varianter med CRLF godkendes med deres egne hashes. [Officiel kilde](https://github.com/openai/plugins/tree/981b02c0c44058b595f3b4180002c3ae3c806d40/plugins/openai-developers)

Acers bulkopdatering kunne ikke omdøbe cachen til en backup. En skrivefri Windows-kontrol fik delingsfejl på versionsmappen. Cachen matchede fortsat den publicerede kilde. Den normale opdateringsrute og eksisterende App-binding bevares.

## Seneste versionsfund med Studio 0.3.29

Acer og ASUS i Personlig læste alle 36 Marketplace-manifester. Ni modparter havde en nyere installeret udgave i OpenAI-kataloget på Acer. Marketplace henter udgaverne fra den verificerede Git-kilde. [Offentlig kilde](https://github.com/openai/plugins/tree/981b02c0c44058b595f3b4180002c3ae3c806d40/plugins)

| Plugin | Marketplace Git | OpenAI-katalog installeret |
| --- | --- | --- |
| `atlassian-rovo` | `1.0.6` | `1.0.7` |
| `dropbox` | `5.0.1` | `6.1.0` |
| `github` | `0.1.12` | `0.1.13-77c10e110b37` |
| `gmail` | `0.1.9` | `0.1.10` |
| `google-calendar` | `1.2.6` | `1.2.7` |
| `google-drive` | `0.1.15` | `0.1.27` |
| `openai-developers` | `1.2.3` | `1.3.16` |
| `sharepoint` | `0.1.7` | `0.1.8` |
| `slack` | `0.1.7` | `0.1.8` |

## Installerede poster via originalkataloget

Disse 12 identiteter er verificeret installeret på begge værter. Find dem via deres eksakte katalog-ID. Leverandørhenvisningerne fører til produktet eller kataloget.

| Plugin | Katalog-ID | Installeret | Leverandør |
| --- | --- | --- | --- |
| Atlassian | `app-6a83901dde988191b3f3cefdcc19acfa@openai-curated-remote` | `2.0.2` | [Åbn](https://www.atlassian.com) |
| Code Assistant | `codeassistant@openai-curated-remote` | `1.0.1` | [Åbn](https://github.com/Fasih38/plugin-pages/blob/main/README.md) |
| Code Tutor | `code-tutor@openai-curated-remote` | `0.1.0` | [Åbn](https://thedoersfirm.com/) |
| Code Tytor: Python | `app-695ff43f74488191a418ea8ac4f0f437@openai-curated-remote` | `1.0.0` | [Åbn](https://www.pyxl.pro) |
| CodexPluginStats | `codex-plugin-stats@openai-curated-remote` | `0.1.2` | [Åbn](https://codex-plugin-stats.com) |
| Create State | `app-69cd66d6b11081919d55522e4f136fec@openai-curated-remote` | `1.0.0` | [Åbn](https://www.createstate.ai) |
| Google Contacts | `google-contacts@openai-curated-remote` | `1.0.0` | [Åbn](https://chatgpt.com/plugins/plugin_connector_1p_c97194162860819190a6f840a61b9889) |
| Knowledge for Agents | `app-6aa47394ea708191bcef52a7c4bda7a2@openai-curated-remote` | `0.7.4` | Find i originalkataloget |
| MemoryPlugin | `memoryplugin@openai-curated-remote` | `1.0.0` | [Åbn](https://www.memoryplugin.com) |
| Notion | `notion@openai-curated-remote` | `3.0.9` | [Åbn](https://www.notion.com/) |
| Pocket FM | `app-69a5a77581c881918f398b27591d685d@openai-curated-remote` | `1.0.0` | [Åbn](https://pocketfm.com/) |
| Remote Desktop Commander | `app-6a057d268ebc81919918d37eec718425@openai-curated-remote` | `2.0.3` | [Åbn](https://mcp.desktopcommander.app) |

Agent Memory 0.9.30 har en officiel kilde. Pakken registrerer `agentmemory` som MCP-server, et navn der allerede er konfigureret på begge værter. Pakken indeholder også seks lifecycle-hooks. [Udgiverens kilde](https://github.com/rohitg00/agentmemory/tree/8bf0c827aaaada297896b2b6efe2a64651ae9389/plugin)

## Seneste versionsfund med Studio 0.3.22

Google Drive 0.1.27 er bekræftet installeret og aktiveret som `google-drive@openai-curated-remote` på både Acer og ASUS. Fra ASUS bekræftede opslaget samtidig 0.1.27 som tilgængelig i OpenAI-kataloget. De installerede pakker deklarerer samme App-ID som Marketplace-pakken. En afgrænset søgning gennem den eksisterende Google Drive-forbindelse lykkedes uden filændringer.

Marketplace henter fortsat Google Drive 0.1.15 fra [OpenAIs Git-kilde](https://github.com/openai/plugins/tree/981b02c0c44058b595f3b4180002c3ae3c806d40/plugins/google-drive). OpenAIs Git-standardgren var rykket én commit ved genkontrollen. [Ændringen](https://github.com/openai/plugins/compare/985fff07dcefa03e40e8664e24363d10b2bacd44...981b02c0c44058b595f3b4180002c3ae3c806d40) berørte ingen af de 11 pakker, som Marketplace henter fra repositoryet.

## Versionskontrol med Studio 0.3.20

Kontrollen på Acer i Personlig den 18. november 2026 afstemte 81 installerede identiteter og 33 Marketplace-kilder. Nedenstående rækker viser de otte produkter med en nyere modpart i OpenAI-kataloget.

| Plugin | Git-udgave i Marketplace | OpenAI-katalog | Evidens i Personlig |
| --- | --- | --- | --- |
| Dropbox | `5.0.1` | `6.1.0` | Installeret |
| GitHub | `0.1.12` | `0.1.13-77c10e110b37` | Installeret |
| Gmail | `0.1.9` | `0.1.10` | Installeret |
| Google Calendar | `1.2.6` | `1.2.7` | Installeret |
| Google Drive | `0.1.15` | `0.1.26` | Installeret |
| OpenAI Developers | `1.2.3` | `1.3.16` | Tilgængelig |
| SharePoint | `0.1.7` | `0.1.8` | Installeret |
| Slack | `0.1.7` | `0.1.8` | Installeret |

Alle otte Marketplace-poster henter fortsat fra den officielle Git-kilde. Den offentlige standardgren var på [985fff0](https://github.com/openai/plugins/tree/985fff07dcefa03e40e8664e24363d10b2bacd44/plugins) ved kontrollen, og repositoryet publicerede ingen Git-tags. Versionsstrengen for GitHub `0.1.13-77c10e110b37` kunne ikke opløses til den tilsvarende revision i dette repository.

Den offentlige [udviklingsgren for OpenAI Developers](https://github.com/openai/plugins/tree/6774981fee17d182c46e343e9cbd03dbda7a7fa6/plugins/openai-developers) deklarerer `1.3.0` med samme App- og MCP-deklarationer som `1.2.3`. Grenen er divergeret fra standardgrenen. Den verificerer udviklingsversionen `1.3.0`. Katalogversionen `1.3.16` er fortsat kun verificeret i OpenAI-kataloget.

Studio sammenligner de eksakte navne og katalog-ID'er fra [modpartstabellen](catalog-counterparts.json). En opgradering af Git-posten kræver, at den relevante udgave kan hentes fra en verificeret kilde, og at den eksisterende binding er kontrolleret.

## Versionskanaler · 2026-11-18

Studio 0.3.17 sammenlignede 33 Marketplace-poster med Git og så 29 installerede Marketplace-pakker med præcist versionsmatch på Acer i Business. OpenAI-kataloget viste ni nyere modparter. Otte versioner blev bekræftet fra installerede pakker i den Business-session. SharePoint 0.1.8 blev bekræftet som tilgængelig i kataloget.

| Plugin | Git-kilde i WinRecoveryProject Digital | OpenAI-katalog | Evidens på Acer i Business |
| --- | --- | --- | --- |
| SharePoint | `0.1.7` | `0.1.8` | Tilgængelig |
| Vercel | `0.21.4` | `0.54.1` | Installeret |
| GitHub | `0.1.12` | `0.1.13-77c10e110b37` | Installeret |
| Google Drive | `0.1.15` | `0.1.26` | Installeret |
| OpenAI Developers | `1.2.3` | `1.3.16` | Installeret |
| Dropbox | `5.0.1` | `6.1.0` | Installeret |
| Gmail | `0.1.9` | `0.1.10` | Installeret |
| Google Calendar | `1.2.6` | `1.2.7` | Installeret |
| Slack | `0.1.7` | `0.1.8` | Installeret |

Katalogopslaget brugte `codex plugin list --marketplace openai-curated-remote --available --json`. En række med installeret evidens viser den installerede version på kontrolmaskinen. Tilgængelig evidens viser en separat version, som kataloget tilbyder den aktive konto. Den aktive konto og installationerne på værten afgør, hvilke af de to felter Studio kan udfylde.

De ni Marketplace-poster peger på [OpenAIs publicerede manifester ved 985fff0](https://github.com/openai/plugins/tree/985fff07dcefa03e40e8664e24363d10b2bacd44/plugins). Det var stadig den offentlige `main` ved genkontrollen. De nyere versionsangivelser i tabellen kommer fra OpenAI-kataloget. Vercels eget repository havde version 0.56.0 for andre værter. Den revision havde hverken en native Codex-manifestfil eller Vercel App-deklarationen. [Vercels offentlige kilde](https://github.com/vercel/vercel-plugin/tree/e69e3ba0ac0d7d24033c5ba95041acc4fc656480)

Brug den eksisterende udgave fra OpenAI-kataloget, når den nyere udgave er nødvendig. En Marketplace-opgradering kræver en nyere Codex-pakke fra en verificeret Git-kilde og kontrol af dens eksisterende App- eller MCP-binding. Opdatering af en Marketplace-installation gælder det pågældende katalog-ID.

[Modpartstabellen](catalog-counterparts.json) forbinder 22 kendte produkter til deres eksakte OpenAI-katalog-ID i Studios genkørbare versionskontrol. Den gemmer sammenligningsgrundlaget på GitHub. App-ID, OAuth, installation og valg af distributionskanal er separate. Codex' native test indlæste en almindelig Git-pakke og udelod forsøget med et direkte remote-plugin-ID i samme Marketplace-manifest.

Studio 0.3.18 kan også kontrollere en eksisterende personlig eller Business-post ud fra dens præcise ID. Brug en privat kopi af modpartstabellen med din egen post tilføjet. Studio bruger kataloget for den aktive konto og viser den installerede og den tilgængelige version hver for sig. Identiteter fra andre konti indgår ikke som observationer. Hvis CLI-listen fejler, bevarer Studio de verificerede katalog- og kildeopslag og markerer kontrollen som ufuldstændig. En uobserveret installation kan derfor stå som uafklaret. Business-opslag har en afgrænset frist på 110 sekunder. En advarsel om et fejlet fjernkatalog giver fortsat en ufuldstændig kontrol, også når CLI-processen afslutter normalt. [Sådan samles en versionskvittering](../plugins/plugin-skill-studio/references/inventory-versions.md)

ASUS Business blev også kontrolleret. Studio læste den eksisterende session gennem den aktive Codex Desktop-runtime 0.169.0-alpha.11.1. De 81 installerede identiteter og OneDrive 1.2.1 blev bekræftet i Business. De 33 Git-manifester blev afstemt efter separat genhentning af GitHub og SharePoint på samme revision. Personlig blev gendannet før genhentningen. Studio 0.3.18 genforsøger nu midlertidige netværksfejl ved manifestlæsning én gang på samme URL og revision.

## Workspace-wide continuation — 2026-11-16

The current installed inventory covers 52 installation records. The [full collection](full-plugin-list-check-20261116.md) now includes 30 native Marketplace entries, 15 original catalog links and 9 host-bundled products. Ten more original Git sources were verified: Gmail, Google Calendar, Slack, Plugin Eval, Plugin Autopilot, Skill Risk Check, Context Handoff, Skillquiver, Skill Craft and Plugin Creator Plus.

Authors, developers and repository owners are retained in [workspace source evidence](workspace-plugin-collection-20261116.json). Native loader testing with a local positive control confirmed that a local manifest's remote-ID source is silently omitted; catalog-only products are therefore kept as links. The earlier inclusion notes below describe the initial smaller collection.

## Collection update — 2026-11-16

Seven additional original-publisher Git entries are now included: Dropbox, Google Drive, GitHub, SharePoint, Vercel, OpenAI Developers and MegaLinter. Package code is fetched directly from the verified publisher repository, not copied from the installation cache. Original names, authors, licenses and App bindings remain publisher-controlled.

The public Git versions for several OpenAI-curated packages are still older than their installed catalog versions. These differences are explicit in the [complete collection](full-plugin-list-check-20261116.md); adding a catalog reference does not update or downgrade an installed package. Use the official catalog when the newer catalog package is required.

Plugin Creator, Cloud Environment, Daybreak Defense Factory and Plugin Management have verified original catalog links in that same collection. No public distributable Git package or supported local Marketplace manifest representation of a remote catalog ID was established. They are catalog links, not fictitious installable Git entries.

Observed revisions, manifests, App identities and installed-version comparisons are retained in [source evidence](external-plugin-collection-20261116.json). The historical observations below are retained as history, not the current inclusion decision.

The marketplace may curate a plugin without copying its package into the WinRecoveryProject publication path.

## OpenAI

`codex-security` is resolved directly from:

```json
{
  "source": "git-subdir",
  "url": "https://github.com/openai/plugins.git",
  "path": "plugins/codex-security"
}
```

Verified against the current `openai/plugins` `main` branch on 2026-10-25:

- OpenAI marketplace entry: `codex-security`
- package path: `plugins/codex-security`
- manifest: `.codex-plugin/plugin.json`
- observed version: `0.1.32`
- author/developer: OpenAI
- license declaration: Proprietary
- OpenAI policy: `AVAILABLE` with authentication `ON_USE`
- category: `Security`

`linear` is resolved from the same repository pattern at `plugins/linear`. Its published GitHub version and observed Codex version are both `5.0.1`; its OpenAI marketplace policy is `AVAILABLE` with authentication `ON_INSTALL`, category `Productivity`.

The directory `plugins/codex-security/` in this repository is retained as a historical comparison source. It is not the package resolved by the marketplace entry.

`plugin-eval` is deliberately not linked as a separate marketplace entry. Its selected behavior is being integrated into the independently named Zilvereyes Plugin Studio, while the archived source remains available for comparison and attribution.

## Earlier comparisons · 2026-10-25

The following observed Codex snapshots are newer than the manifests currently published on the `openai/plugins` `main` branch:

| Plugin | Observed in Codex | Published on GitHub `main` |
| --- | --- | --- |
| Dropbox | `6.0.0` | `5.0.1` |
| Google Drive | `0.1.22` | `0.1.15` |
| GitHub | `0.1.12-5f7cd798dc99` | `0.1.12` |
| OpenAI Developers | `1.3.6` | `1.2.3` |
| Vercel | `0.54.1` | `0.21.4` |

On 2026-10-25, the path-specific GitHub commit API exposed one commit for each of these plugin manifest paths, and none contained the newer observed version. Because `git-subdir` can only resolve a published Git ref or SHA, linking these entries now would select the older package. That was the initial inclusion decision. The current Marketplace links to the verified Git sources and lists their observed versions separately from the OpenAI catalog.

Before adding another external plugin, verify its exact current name, subdirectory, manifest identity, version, policy and license in the owning repository. Do not convert an upstream package to a local source merely to make it appear owned by WinRecoveryProject.

## OpenAI SDKs and development repositories are references, not plugins

The official `openai-python`, `openai-node`, `openai-ruby` and `openai-java` repositories are API client SDKs. They do not publish Codex plugin packages, marketplace entries, connector App IDs or provider OAuth grants, so they must not be added to `.agents/plugins/marketplace.json` as plugins.

They remain useful implementation references for code that intentionally calls the OpenAI API. The current CloudStorage Portal broker does not need an OpenAI API call to list or read Dropbox, Google Drive or OneDrive content, so adding one of these SDKs would introduce an unrelated API-key dependency without fixing provider authentication.

Observed official sources on 2026-10-25:

| Source | Observed release or repository state | Portfolio role |
| --- | --- | --- |
| `openai/openai-python` | `v3.37.0`, released 2026-10-22 | Python API SDK reference; its Decisions type change does not affect the JavaScript broker |
| `openai/openai-node` | `v7.43.0` shown as latest | Closest language match for a future intentional OpenAI API client in the Node runtime; not required by the provider broker |
| `openai/openai-ruby` | `v0.111.0` shown as latest | Ruby API SDK reference only |
| `openai/openai-java` | `v4.91.0` shown as latest | Java/Kotlin API SDK reference only |

The Node SDK supports server runtimes including Node.js and Vercel Edge, but browser use is disabled by default to protect secret API credentials. That is a useful security boundary to retain if a future, separately scoped OpenAI API feature is added.

Additional official sources reviewed on 2026-10-25:

| Source | Portfolio role |
| --- | --- |
| `openai/openai-dotnet` | Official .NET API SDK reference; not a plugin or provider connector |
| `openai/openai-openapi` release `2.0.0` | OpenAI API schema/reference material; not a runtime or marketplace package |
| `openai/openai-agents-js` | Agent and voice-workflow framework reference; not required by the storage-provider broker |
| `openai/openai-cookbook` | Examples and implementation guidance; not an installable Codex plugin |
| `openai/tunnel-client` | Relevant future transport option for exposing a private or localhost MCP without publishing it directly to the internet |
| `openai/codex` | Codex CLI and agent implementation reference; not a distributable CloudStorage dependency |
| `openai/codex-action` | GitHub Actions integration reference for separately scoped CI automation |
| `openai/terraform-provider-openai` | Infrastructure-as-code reference for OpenAI resources; not a provider-storage connector |
| `openai/openai-agents-python` | Python agent framework reference parallel to Agents JS |
| `openai/openai-guardrails-js` | TypeScript/JavaScript guardrail reference for future agent-facing validation boundaries |
| `openai/php2shell-checker` | Specialized security-analysis reference; unrelated to CloudStorage provider routing |

`openai/tunnel-client` is the only item in this group that could materially change the hosted OneDrive architecture. It may replace the public Vercel exposure in a separately evaluated design, but it does not supply a Microsoft App ID, repair OAuth metadata, register an Entra redirect URI or grant Microsoft consent. It is therefore recorded as an architectural candidate, not activated as part of the current plugin publication.
