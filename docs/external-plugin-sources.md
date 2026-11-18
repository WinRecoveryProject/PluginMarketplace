# External plugin sources

## Versionskanaler · 2026-11-18

Kontrollen sammenlignede 33 Marketplace-poster med de respektive Git-manifester på de aktuelle revisionsnumre. Alle 29 installerede poster med identiteten `@winrecoveryproject-digital` matchede deres Git-kilde. OpenAIs katalog viste ni nyere udgaver. Seks var installeret på kontrolmaskinen, og tre stod som tilgængelige.

| Plugin | Git-kilde i WinRecoveryProject Digital | OpenAI-katalog | Status på kontrolmaskinen |
| --- | --- | --- | --- |
| SharePoint | `0.1.7` | `0.1.8` | Tilgængelig |
| Vercel | `0.21.4` | `0.54.1` | Installeret |
| GitHub | `0.1.12` | `0.1.13-77c10e110b37` | Tilgængelig |
| Google Drive | `0.1.15` | `0.1.26` | Installeret |
| OpenAI Developers | `1.2.3` | `1.3.16` | Tilgængelig |
| Dropbox | `5.0.1` | `6.1.0` | Installeret |
| Gmail | `0.1.9` | `0.1.10` | Installeret |
| Google Calendar | `1.2.6` | `1.2.7` | Installeret |
| Slack | `0.1.7` | `0.1.8` | Installeret |

Katalogopslaget brugte `codex plugin list --marketplace openai-curated-remote --available --json`, som også viser tilgængelige pakker uden en lokal installation.

Git-versionerne er aflæst fra [OpenAIs publicerede manifests](https://github.com/openai/plugins/tree/985fff07dcefa03e40e8664e24363d10b2bacd44/plugins). Den offentlige Git-kilde havde ingen release-tags ved kontrollen. Vercels eget repository havde version 0.56.0 for andre værter. Den revision havde hverken en native Codex-manifestfil eller Vercel App-deklarationen. [Vercels offentlige kilde](https://github.com/vercel/vercel-plugin/tree/e69e3ba0ac0d7d24033c5ba95041acc4fc656480)

Brug den eksisterende udgave fra OpenAI-kataloget, når den nyere udgave er nødvendig. Marketplace-posterne henter deres publicerede pakker fra de angivne Git-kilder. Opdatering af en Marketplace-installation gælder det pågældende katalog-ID.

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
