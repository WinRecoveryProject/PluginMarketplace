# Dropbox-appregistrering: verificeret deltrin

Observeret 2026-10-21 direkte i Dropbox App Console og den installerede lokale portal.

- Appnavn: CloudStorage Portal Local.
- Offentlig App key: `nbl4o9y83v6m5l0`. Dette er ikke App secret eller et access token.
- Appen er i development med Development users: Only you. Flere konti er derfor endnu ikke live-verificeret, og eventuel udvidelse skal gennemgås særskilt.
- Permissions: account_info.read var valgt fra starten. Kun files.metadata.read blev tilføjet efter brugerens præcise godkendelse. Dropbox viste Permissions change successful.
- Redirect URI: `http://127.0.0.1:53683/oauth/dropbox/callback`, tilføjet efter særskilt godkendelse. Dropbox viste OAuth URI added, og adressen fremgår af listen.
- Allow public clients (Implicit Grant & PKCE) stod allerede på Allow; denne indstilling blev ikke ændret.
- App secret blev ikke vist eller kopieret. Generate access token blev ikke brugt.
- Den offentlige App key blev gemt gennem den installerede portals eksisterende klient-ID-formular. Portalen bekræftede Klient-ID gemt og viste Dropbox-login aktiveret. OneDrive-kontoen stod fortsat som identitets- og rodverificeret.

## Manglende live-bevis

Dropbox OAuth-samtykke er ikke gennemført gennem vores egen app endnu. En registreret app og gemt klient-ID beviser ikke login, refresh, mappeadgang eller fler-konto-funktion. De eksisterende native Dropbox-workflows og grants er ikke erstattet.

Dropboxs autorisationsreference kræver systembrowser frem for indlejret webview. Næste eget Dropbox-login skal derfor åbnes i systembrowseren og bevare brokerens session/state/PKCE-binding; eksisterende connectorcredentials må ikke bruges som genvej.

Kilde: https://www.dropbox.com/developers/paper-api-alpha (afsnit /oauth2/authorize, læst 2026-10-21). Den aktuelle API-reference er også tilgængelig via https://www.dropbox.com/developers/documentation/http/documentation#oauth2-authorize.

## Skærmbeviser

I arbejdsområdets outputs-mappe: dropbox-permissions-saved.png og dropbox-callback-saved.png. Disse beviser appkonfigurationen, ikke et gennemført OAuth-login.
