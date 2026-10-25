# Plugin consolidation audit — 2026-10-25

## Objective

Maintain one Git-backed marketplace for the Zilvereyes packages without losing App identities, OAuth grants, skills, MCP configuration or rollback evidence. A cache directory, an owned account plugin, an installed plugin, a marketplace entry and a source package are different states and must not be treated as duplicates merely because their display names match.

## Canonical destination

- Repository: `https://github.com/WinRecoveryProject/PluginMarketplace.git`
- Local source: `work/PluginMarketplace`
- Marketplace name: `winrecoveryproject-digital`
- Manifest: `.agents/plugins/marketplace.json`
- Developer identity: `Zilvereyes`

The marketplace currently advertises seven packages: CloudStorage Portal, CloudStorage OneDrive, Component Forge, Plugin Eval, PowerShell Workbench, Windows DISM Update Docs and Codex Security.

## Current marketplace registrations

The CLI currently considers eight marketplace roots:

1. `personal` — built-in personal source;
2. `openai-primary-runtime` — built-in runtime;
3. `openai-bundled` — built-in packages;
4. `openai-curated` — official curated packages;
5. `megalinter` — separate third-party Git marketplace;
6. `powershell-workbench` — existing dedicated Git marketplace;
7. `cloudstorage-local` — older local CloudStorage marketplace;
8. `winrecoveryproject-digital` — the new consolidated local checkout.

Only the last four are cleanup candidates. Built-in and official sources are not to be removed. MegaLinter is unrelated and should remain unless the user separately decides otherwise.

The CLI currently reports these exact installed marketplace packages:

- `cloudstorage-portal@cloudstorage-local` `0.8.0-dev.17` — installed and enabled;
- `cloudstorage-onedrive@cloudstorage-local` `0.1.1` — installed and enabled;
- `powershell-workbench@powershell-workbench` `0.9.0-beta.1` — installed and enabled;
- `megalinter@megalinter` `1.0.3` — installed and enabled.

The seven `winrecoveryproject-digital` packages are available but not installed. Therefore the CLI-managed marketplace channel currently has no same-name duplicates from the new marketplace. Owned personal/account plugins and cache entries remain separate states and require their own status check before removal.

## Dropbox and Google Drive comparison

### Dropbox

- Current candidate: Dropbox `6.0.0`, App ID `asdk_app_69b31dc2110c8191b8b47dc98fe5a052`.
- Old candidate: Dropbox `5.0.1` plus `.mcp.json` pointing at `https://mcp.dropbox.com/mcp`.
- All six current Dropbox skills are byte-identical to the six Dropbox skills already packaged in CloudStorage Portal.

Decision: keep the current App-backed Dropbox dependency and current skills. Do not revive the old `.mcp.json`; it has the obsolete dotted filename and would create a second execution route for the same provider.

### Google Drive

- Current candidate: Google Drive `0.1.22`, App ID `connector_5f3c8c41a1e54ad7a76272c89e2554fa`.
- Old candidate: Google Drive `0.1.15` plus `.mcp.json` containing placeholder OAuth client and secret fields.
- All 65 current Google Drive skill files are byte-identical to the Google files already packaged in CloudStorage Portal.
- The old tree has fourteen additional documents, but sixty shared files differ from the current release. Those old documents cannot be merged blindly because they describe an earlier runtime and safety contract.

Decision: keep the current App-backed Google Drive dependency and current `0.1.22` skills. Do not import the placeholder-secret MCP configuration. Review any old reference document individually before adapting its still-relevant guidance.

## OneDrive inventory decision

`C:\Users\zilve\.agents\skills` contains many overlapping OneDrive implementations. Several reuse the exact internal names `add-onedrive`, `microsoft-onedrive` or `onedrive`, so installing them together would cause ambiguous routing. Others depend on Power Apps, direct tokens, m365 CLI, Zapier, Apideck, ClawLink or Refly.

Decision: do not install those folders as plugins. Extract only capability and safety requirements that match the CloudStorage backend. Preserve the dedicated App ID `asdk_app_6ade0fe240408191bd087bff2df78e79` and the existing Microsoft OAuth identities.

## Verified current OneDrive surfaces

The dedicated hosted MCP advertises four read-only tools:

- `onedrive_account`
- `onedrive_list_root`
- `onedrive_list_folder`
- `onedrive_read_text`

The local Portal runtime advertises bounded status, account selection, local-root inspection, OneDrive search, metadata, folder and text reads. It does not currently provide cloud upload, move, copy, delete, sharing, permission, version, delta or webhook tools.

The standalone package now declares `tokenEndpointAuthMethod: none`, matching the approved public-client/PKCE configuration. No client secret is stored or expected. This corrects the previous `client_secret_post` declaration; it does not by itself resolve the separate Microsoft `resource` versus `scope` mismatch observed during connection.

The plugin documentation must report those operations as future gaps until the backend implements and verifies them.

## Safe cleanup sequence

1. Finish and validate the canonical Git source.
2. Commit and push it only after an explicit review of the intended Git changes.
3. Import or re-import the Git marketplace and verify its saved source, branch and sync report.
4. Install one test package at a time from `winrecoveryproject-digital`.
5. Verify display identity, version, App dependencies, skills and MCP discovery.
6. Verify that required existing connections and grants still work; do not infer this from an installed flag.
7. Only then uninstall the replaced personal/local plugin instance with its exact plugin ID.
8. Remove `cloudstorage-local` only after both CloudStorage replacements pass.
9. Remove the dedicated `powershell-workbench` marketplace only after its consolidated replacement passes and rollback evidence is recorded.
10. Keep source archives outside active marketplace registration. Archive is not installation.

No uninstall, marketplace removal, cache deletion or OAuth disconnection is authorized by this audit alone. Each destructive batch needs an exact target list and a verified replacement.
