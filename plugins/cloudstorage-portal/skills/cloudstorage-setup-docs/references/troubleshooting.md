# Første fejlende led

| Observation | Næste præcise kontrol |
| --- | --- |
| AADSTS9010010 ved direkte Microsoft authorize | Sammenhold requestens resource/scope, discovery og API identifierUris; skeln mellem brokerens to kontrakter |
| IdentifierUris kræver verificeret domæne | Bevar api://-URI og undersøg broker; køb ikke automatisk et domæne |
| Host-callback mangler | Den faktiske redirect_uri skal registreres som Web på den rigtige host-app |
| 7000215 ved host_code | Host-appens Value → MICROSOFT_HOST_CLIENT_SECRET |
| 7000215 ved graph_obo | API-appens Value → MICROSOFT_API_CLIENT_SECRET |
| Authentication succeeded, action discovery failed | Login lykkedes; undersøg næste API/OBO-, Graph- og MCP-led |
| Tools: 0 | Verificér autentificeret initialize/tools/list, schemas og Refresh tools |
| Save lykkes, gammel fejl fortsætter | Ny deployment, rigtigt mål og alias; sammenhold tidsstempler |
| Staging-discovery peger på produktion | Kontroller runtime-publicUrl og eksisterende MCP_PUBLIC_URL |
| Vercel-login foran MCP | Undersøg kun tilsigtet alias og bevar broker-auth |
| Entra-login lykkes, /me/drive fejler | Kontotype, tenant, provisionering, delegerede rettigheder og konkret Graph-fejl |

## Den faktiske credentialfejl

Stagingens MICROSOFT_HOST_CLIENT_SECRET var præcis lig med Entras Secret ID. Det blev bevist med en boolesk lighedskontrol, uden at udskrive Value eller secret-hash. Efter sikker brugerrettelse og redeploy returnerede host_code og host_refresh 200.

Næste afvisning gjaldt API-appens credential, ikke den samme host-fejl. Efter separat rettelse af MICROSOFT_API_CLIENT_SECRET returnerede OBO og Graph 200, og klienten blev Connected. Den tidligere API-værdis præcise fejlindtastning blev ikke selvstændigt bevist; den må ikke automatisk kaldes endnu en Secret ID-fejl.

## Sikker diagnostik

Log faste ruter uden query, statuskoder, sikre OAuth-fejl-enums og numeriske Microsoft-fejlkoder. Offentlige app-id'er og nødvendige booleske wiring-kontroller kan indgå.

Log aldrig client_secret, Authorization, code, code_verifier, state, assertion, tokens eller fulde callback-URL'er med query. Udskriv ikke komplette Microsoft-fejlbeskrivelser ukritisk. Secret-hashes er ikke nødvendige for en Secret ID-kontrol.

En negativ probe med bevidst ugyldig kode kan bevise requestens feltnavne og klientmetode. Dens fejl er ikke et loginbevis eller bevis for Microsofts valideringsrækkefølge.
