# Arkitektur og konti

Arkitekturkontrakt dokumenteret 2. november 2026 for runtime 0.3.2. Seneste dokumenterede personlige runtimekontrol: 0.3.4 den 16. november 2026; se [verifikation](verification.md). Versioner og kontroller nedenfor er dateret evidens.

## Aktive dele

| Del | Ansvar |
| --- | --- |
| CloudStorage Portal | Eksisterende App-/MCP-forbindelser og provider-workflows, herunder denne docs-skill; ingen separat MCP-runtime |
| OneDrive hosted MCP | HTTPS MCP, OAuth-broker, Microsoft-tokenudveksling, Graph-verifikation og OneDrive-værktøjer |
| OneDrive-plugin | Registreret App-reference, hosted MCP-forbindelse, ikon og skills |

CloudStorage Portal Local er udgået og fjernet fra marketplace. Installér den ikke som del af denne opsætning.

Dropbox bruger den eksisterende Dropbox MCP-forbindelse. Google Drive og OneDrive bruger eksisterende App-bindinger. En historisk App-deklaration er ikke grund til at erstatte en fungerende forbindelse. Deres fungerende UI er reference for synlig succes, men referencefiler med lignende navne er ikke bevis for OpenAIs interne implementation.

Hosted source findes separat i projektets work/cloudstorage-onedrive-remote. Portalens skillpakke indeholder ikke automatisk denne server. Ved offentlig reproduktion skal det præcise testede serverkildesæt også gøres tilgængeligt under afklarede licensvilkår.

## To konto-akser

ChatGPT Personal/Business bestemmer connectorens ejer-/arbejdsområde i klienten. Microsoft Personal/Entra bestemmer brugeridentitet og Microsoft-ressourcer. Personlig ChatGPT kan derfor starte Microsofts arbejds-/skolelogin.

En Entra-tenant eller en gæstekonto garanterer ikke en provisioneret OneDrive for Business. Test identitet og driveadgang separat. En EXT-/gæsteidentitet kan være forskellig fra både personlig Microsoft-konto og en provisioneret organisationsbruger.

## To OAuth-ben

    ChatGPT/Codex → broker → Microsoft → broker-callback
      → ChatGPT-callback → broker-token → Microsoft-token
      → broker-access-token → MCP → Graph

| Felt | Klient → broker | Broker → Microsoft |
| --- | --- | --- |
| client_id | Brokerens DCR-klient | Host-appens Application (client) ID |
| scope for aktiv læse-/skriveforbindelse | onedrive.read onedrive.write | https://graph.microsoft.com/User.Read https://graph.microsoft.com/Files.ReadWrite offline_access |
| resource | https://<MCP_HOST>/mcp | Ikke videresendt i dette projekts Microsoft-request |
| redirect_uri | Klientens registrerede callback | https://<MCP_HOST>/oauth/callback |
| Klientmetode | none + PKCE S256 | client_secret_post med host-secret |

Runtime 0.3.2 bruger direkte delegeret Graph-adgang, når grantet indeholder onedrive.write. Microsoft-tokenet forbliver server-side; klienten får brokerens ressourcebundne token. Et grant med kun onedrive.read bruger fortsat api://<API_APP_ID>/access_as_user offline_access og API-appens særskilte OBO-udveksling. De to grene er forskellige upstream-kontrakter. Host-secret og API-secret må ikke byttes eller genbruges. Eksisterende API-konfiguration bevares; denne vejledning autoriserer ikke fjernelse af registreringer eller credentials.

## Hvorfor broker her?

Den oprindelige direkte Microsoft-request kombinerede en HTTPS MCP-resource og et api://-scope og fik AADSTS9010010. At registrere den delte vercel.app-adresse som API identifierUri blev afvist med krav om verificeret organisationsdomæne.

Brokeren bevarer MCP-resourcebindingen mod klienten og oversætter scopes til den valgte Microsoft-gren. MCP-URL som resource videresendes ikke til Microsoft. Det er projektets dokumenterede gratis løsning, ikke et bevis for at alle andre arkitekturer er umulige.

## Hosted kildefiler og ruter

| Fil | Ansvar |
| --- | --- |
| api/entry.mjs | Vercel-entrypoint |
| src/remote.mjs | Runtimekonfiguration og kobling mellem broker, Graph og MCP |
| src/oauth-broker.mjs | DCR, authorize, state, PKCE, callback, token og refresh |
| src/graph.mjs | Microsoft/Graph-verifikation og API-tokenudveksling |
| vercel.json | Rewrites til entrypoint |
| package-lock.json | Låste afhængigheder til det konkrete testede kildesæt |

Ruter: /mcp, /.well-known/oauth-authorization-server, /.well-known/oauth-protected-resource, /.well-known/oauth-protected-resource/mcp, /oauth/register, /oauth/client/:registration, /oauth/authorize, /oauth/callback og /oauth/token.

Staging blev verificeret med en deployment-specifik entrypoint-override, der gav createOneDriveRemote en eksplicit staging-publicUrl. Den almindelige lokale entrypoint blev bevaret. Reproduktion skal kontrollere sin egen kanoniske URL; et gammelt MCP_PUBLIC_URL-projektfelt kan ellers få staging-discovery til at annoncere produktion. Diagnostik-overriden er et revisionsartefakt, ikke en ny releaseversion.

Aktiv canonical MCP: https://cloudstorage-onedrive-mcp.vercel.app/mcp. En kopi bruger sin egen kanoniske URL. Ovenstående staging-override er historik og bruges ikke som den aktive forbindelse.
