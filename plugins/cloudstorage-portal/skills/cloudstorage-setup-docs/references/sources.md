# Officielle sites og deling

Dokumentationsgrundlag kontrolleret 27. oktober 2026; UI og adgangskrav kan ændre sig.

| Formål | Site |
| --- | --- |
| App registrations og credentials | https://entra.microsoft.com/ |
| Hosting, plan, deployments og Environment Variables | https://vercel.com/ |
| Personlig MCP-forbindelse | https://chatgpt.com/ |
| MCP/OAuth, resource, DCR/CIMD og callbacks | https://developers.openai.com/plugins/build/auth |
| Developer mode | https://help.openai.com/en/articles/12584461-developer-mode-and-full-mcp-connectors-in-chatgpt |
| Microsoft OBO | https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-on-behalf-of-flow |
| Redirect URI-regler | https://learn.microsoft.com/en-us/entra/identity-platform/reply-url |
| Credentials og Value | https://learn.microsoft.com/en-us/entra/identity-platform/how-to-add-credentials |
| 7000215 | https://learn.microsoft.com/en-us/entra/msal/dotnet/advanced/exceptions/confidential-client-troubleshoot |
| Vercel variabler | https://vercel.com/docs/environment-variables |
| Hobby | https://vercel.com/docs/plans/hobby |
| Limits | https://vercel.com/docs/limits |
| Graph | https://graph.microsoft.com/v1.0/ |
| Google Drive | https://drive.google.com/ |
| Dropbox | https://www.dropbox.com/ |

MS authorize/token og Graph er protokol-endpoints, ikke steder hvor brugeren manuelt skal indsætte secrets. https://login.live.com/oauth20_desktop.srf er en desktop redirect-mulighed, ikke en hosted MCP OAuth-broker.

## Projektgrundlag

Hosted kilde og audit er separate fra portalens App-/skillpakke. Det private projekt har START_HERE.md, PROJECT_TRUTH.md, DEPLOYMENT_TRACE.md, OAUTH_CONTRACT_DIFF-20261026.md, OAUTH_FIX_PACKAGE-20261026.md, HOST_SECRET_DIAGNOSIS-20261027.md og evidence/staging-connected-api-fixed-20261027.json. Dette er lokale revisionsdokumenter, ikke filer der automatisk følger med skillen.

Den delbare vejledning bruger pladsholdere og medtager ingen credentials, brugeridentiteter eller maskinspecifikke mapper.

## Licens og release

Vejledningen er ny original dokumentation baseret på egne observationer og korte henvisninger. Tredjepartsimplementationer er ikke kopieret ind.

Referencebibliotekerne kan have forskellige licenser, herunder non-commercial og Elastic-2.0. Portalens MIT-licens gør ikke alt referenceindhold MIT. Afklar licens, attribution og afhængigheder før genbrug.

Publicér ikke private revisionsbilleder, registreringsudtræk, identiteter eller credentials uden særskilt gennemgang. Den præcise testede serverkilde skal følge en reproducerbar offentlig udgivelse; portaldokumentation alene er ikke serverdistribution. Installation, commit, push og publicering er separate handlinger.
