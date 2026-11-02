# Arkitektur og konti

Statusdato: 2. november 2026. Aktiv personlig OneDrive-App og runtime 0.3.2.

## Aktive dele

| Del | Ansvar |
| --- | --- |
| CloudStorage Portal | App-referencer og provider-workflows, herunder denne docs-skill |
| OneDrive hosted MCP | HTTPS MCP, OAuth-broker, Microsoft-tokenudveksling, Graph-verifikation og OneDrive-vÃ¦rktÃ¸jer |
| OneDrive-plugin | Registreret App-reference, hosted MCP-forbindelse, ikon og skills |

CloudStorage Portal Local er udgÃ¥et og fjernet fra marketplace. InstallÃ©r den ikke som del af denne opsÃ¦tning.

Dropbox og Google Drive bruger allerede forbundne native connectors. Deres fungerende UI er reference for synlig succes, men referencefiler med lignende navne er ikke bevis for OpenAIs interne implementation.

Hosted source findes separat i projektets work/cloudstorage-onedrive-remote. Portalens skillpakke indeholder ikke automatisk denne server. Ved offentlig reproduktion skal det prÃ¦cise testede serverkildesÃ¦t ogsÃ¥ gÃ¸res tilgÃ¦ngeligt under afklarede licensvilkÃ¥r.

## To konto-akser

ChatGPT Personal/Business bestemmer connectorens ejer-/arbejdsomrÃ¥de i klienten. Microsoft Personal/Entra bestemmer brugeridentitet og Microsoft-ressourcer. Personlig ChatGPT kan derfor starte Microsofts arbejds-/skolelogin.

En Entra-tenant eller en gÃ¦stekonto garanterer ikke en provisioneret OneDrive for Business. Test identitet og driveadgang separat. En EXT-/gÃ¦steidentitet kan vÃ¦re forskellig fra bÃ¥de personlig Microsoft-konto og en provisioneret organisationsbruger.

## To OAuth-ben

    ChatGPT/Codex â†’ broker â†’ Microsoft â†’ broker-callback
      â†’ ChatGPT-callback â†’ broker-token â†’ Microsoft-token
      â†’ broker-access-token â†’ MCP â†’ Graph

| Felt | Klient â†’ broker | Broker â†’ Microsoft |
| --- | --- | --- |
| client_id | Brokerens DCR-klient | Host-appens Application (client) ID |
| scope for aktiv lÃ¦se-/skriveforbindelse | onedrive.read onedrive.write | https://graph.microsoft.com/User.Read https://graph.microsoft.com/Files.ReadWrite offline_access |
| resource | https://<MCP_HOST>/mcp | Ikke videresendt i dette projekts Microsoft-request |
| redirect_uri | Klientens registrerede callback | https://<MCP_HOST>/oauth/callback |
| Klientmetode | none + PKCE S256 | client_secret_post med host-secret |

Runtime 0.3.2 bruger direkte delegeret Graph-adgang, nÃ¥r grantet indeholder onedrive.write. Microsoft-tokenet forbliver server-side; klienten fÃ¥r brokerens ressourcebundne token. Et grant med kun onedrive.read bruger fortsat api://<API_APP_ID>/access_as_user offline_access og API-appens sÃ¦rskilte OBO-udveksling. De to grene er forskellige upstream-kontrakter. Host-secret og API-secret mÃ¥ ikke byttes eller genbruges. Eksisterende API-konfiguration bevares; denne vejledning autoriserer ikke fjernelse af registreringer eller credentials.

## Hvorfor broker her?

Den oprindelige direkte Microsoft-request kombinerede en HTTPS MCP-resource og et api://-scope og fik AADSTS9010010. At registrere den delte vercel.app-adresse som API identifierUri blev afvist med krav om verificeret organisationsdomÃ¦ne.

Brokeren bevarer MCP-resourcebindingen mod klienten og oversÃ¦tter scopes til den valgte Microsoft-gren. MCP-URL som resource videresendes ikke til Microsoft. Det er projektets dokumenterede gratis lÃ¸sning, ikke et bevis for at alle andre arkitekturer er umulige.

## Hosted kildefiler og ruter

| Fil | Ansvar |
| --- | --- |
| api/entry.mjs | Vercel-entrypoint |
| src/remote.mjs | Runtimekonfiguration og kobling mellem broker, Graph og MCP |
| src/oauth-broker.mjs | DCR, authorize, state, PKCE, callback, token og refresh |
| src/graph.mjs | Microsoft/Graph-verifikation og API-tokenudveksling |
| vercel.json | Rewrites til entrypoint |
| package-lock.json | LÃ¥ste afhÃ¦ngigheder til det konkrete testede kildesÃ¦t |

Ruter: /mcp, /.well-known/oauth-authorization-server, /.well-known/oauth-protected-resource, /.well-known/oauth-protected-resource/mcp, /oauth/register, /oauth/client/:registration, /oauth/authorize, /oauth/callback og /oauth/token.

Staging blev verificeret med en deployment-specifik entrypoint-override, der gav createOneDriveRemote en eksplicit staging-publicUrl. Den almindelige lokale entrypoint blev bevaret. Reproduktion skal kontrollere sin egen kanoniske URL; et gammelt MCP_PUBLIC_URL-projektfelt kan ellers fÃ¥ staging-discovery til at annoncere produktion. Diagnostik-overriden er et revisionsartefakt, ikke en ny releaseversion.

Aktiv canonical MCP: https://cloudstorage-onedrive-mcp.vercel.app/mcp. En kopi bruger sin egen kanoniske URL. Ovenstående staging-override er historik og bruges ikke som den aktive forbindelse.
