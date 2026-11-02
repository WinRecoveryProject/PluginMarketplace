# Arkitektur og konti

## Tre forskellige pakker

| Del | Ansvar |
| --- | --- |
| CloudStorage Portal | App-referencer og provider-workflows, herunder denne docs-skill |
| OneDrive hosted MCP | HTTPS MCP, OAuth-broker, Microsoft-tokenudveksling, Graph-verifikation og OneDrive-værktøjer |
| CloudStorage Portal Local | Separat lokal stdio MCP og egne lokale forbindelser |

Dropbox og Google Drive bruger allerede forbundne native connectors. Deres fungerende UI er reference for synlig succes, men referencefiler med lignende navne er ikke bevis for OpenAIs interne implementation.

Hosted source findes separat i projektets work/cloudstorage-onedrive-remote. Portalens skillpakke indeholder ikke automatisk denne server. Ved offentlig reproduktion skal det præcise testede serverkildesæt også gøres tilgængeligt under afklarede licensvilkår.

## To konto-akser

ChatGPT Personal/Business bestemmer connectorens ejer-/arbejdsområde i klienten. Microsoft Personal/Entra bestemmer brugeridentitet og Microsoft-ressourcer. Personlig ChatGPT kan derfor starte Microsofts arbejds-/skolelogin.

En Entra-tenant eller en gæstekonto garanterer ikke en provisioneret OneDrive for Business. Test identitet og driveadgang separat. En EXT-/gæsteidentitet kan være forskellig fra både personlig Microsoft-konto og en provisioneret organisationsbruger.

## To OAuth-ben

    ChatGPT/Codex → broker → Microsoft → broker-callback
      → ChatGPT-callback → broker-token → Microsoft-token
      → broker-access-token → MCP → API-appens OBO → Graph

| Felt | Klient → broker | Broker → Microsoft |
| --- | --- | --- |
| client_id | Brokerens DCR-klient | Host-appens Application (client) ID |
| scope | onedrive.read | api://<API_APP_ID>/access_as_user offline_access |
| resource | https://<STAGING_HOST>/mcp | Ikke videresendt i dette projekts Microsoft-request |
| redirect_uri | Klientens registrerede callback | https://<STAGING_HOST>/oauth/callback |
| Klientmetode | none + PKCE S256 | client_secret_post med host-secret |

Graph-verifikationen bruger API-appens særskilte OBO-udveksling: API_APP_ID, API-secret, brugerassertion og Graph .default-scope. Host-secret og API-secret må ikke byttes eller genbruges mellem rollerne.

## Hvorfor broker her?

Den oprindelige direkte Microsoft-request kombinerede en HTTPS MCP-resource og et api://-scope og fik AADSTS9010010. At registrere den delte vercel.app-adresse som API identifierUri blev afvist med krav om verificeret organisationsdomæne.

Brokeren bevarer MCP-resourcebindingen mod klienten og bruger den eksisterende api://-identitet mod Microsoft. Det er projektets dokumenterede gratis løsning, ikke et bevis for at alle andre arkitekturer er umulige.

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
