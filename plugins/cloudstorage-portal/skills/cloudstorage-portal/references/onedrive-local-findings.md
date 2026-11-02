# Lokal OneDrive-undersøgelse, 21. oktober 2026

OneDrive.exe og den undersøgte programmappe har version 26.189.0928.0007. Mappen indeholder adal.dll, FileSyncClient.dll, SyncEngine.dll, FileCoAuth-komponenter og OneDrive.Sync.Service-komponenter. Tilstedeværelse er ikke bevis for et offentligt login-API.

com.microsoft.onedrive.nucleus.auth.provider.json registrerer Microsoft.SharePoint.NativeMessagingClient.exe som native authentication provider for Microsoft Nucleus. Manifestet angiver stdio og præcis to tilladte Chrome extension-origins. Det er ikke et MCP-manifest eller en generel OAuth-loginindgang. Authenticode returnerede Valid for den undersøgte native messaging-klient og adal.dll; det beviser ikke offentlig API-understøttelse.

AppData/Local/Microsoft/OneDrive indeholder EBWebView, ListSync, logs, settings, setup og Update. settings har en Personal-mappe. Ingen settings- eller login-cachefiler blev åbnet. OneAuth har mapperne accounts og blobs; kun dette niveau blev listet, ingen account-/blob-filer blev åbnet, kopieret eller afkodet.

OneDrive og OneDriveConsumer-miljøvariablerne peger begge på C:\Users\zilve\CloudStorage\OneDrive. Det identificerer en konkret lokal rod, ikke aktuelt cloud-login eller fuldført synkronisering.

## Implementeret lokal vej

runtime/local-onedrive.mjs bruger en udtrykkeligt konfigureret ONEDRIVE_LOCAL_ROOT med højeste prioritet. Når nøglen helt mangler, udledes den fra Windows-miljøets første absolutte `OneDriveConsumer`, `OneDriveCommercial` eller `OneDrive`; en eksplicit tom værdi deaktiverer fortsat funktionen. Adapteren lister højst 25 direkte elementer, åbner ingen filindhold, går ikke ned i undermapper og følger ikke child-links. Availability/hydration-status er ukendt. Metadataopslag kan afhænge af sync-klientens placeholder-håndtering; adapteren anmoder ikke aktivt om download, pinning eller hydrering.

En faktisk test mod C:\Users\zilve\CloudStorage\OneDrive fandt 17 direkte elementer. Resultatet er local-sync med cloudIdentityVerified=false, cloudSyncVerified=false og fileContentRead=false. Ingen filnavne blev udskrevet i testkvitteringen.

Dette giver eksisterende lokal OneDrive-adgang uden nye Microsoft OAuth-credentials til det begrænsede workflow. Det erstatter ikke Graph-søgning, deling, versionshistorik, ikke-synkroniserede cloudområder eller Google Docs/Sheets/Slides-funktioner.

## Windows-integreret login

Microsoft dokumenterer MSAL.NET med Web Account Manager som vej til Windows-kendte konti. Vores app skal have sin egen registrering og relevante scopes; SSO og ekstra samtykke afhænger af konto og politik. Brug offentliggjorte biblioteker frem for at indlæse OneDrives private DLL'er eller behandle OneAuth som et SDK.

Microsoft omtaler OneAuth som credential-cache i sin OneDrive-fejlsøgningsvejledning. Cachefilerne er ikke brugt som credentialkilde, ryddet eller ændret i denne undersøgelse.

## Kilder

- https://learn.microsoft.com/en-us/entra/msal/dotnet/acquiring-tokens/desktop-mobile/wam
- https://learn.microsoft.com/en-us/windows/win32/cfapi/build-a-cloud-file-sync-engine
- https://learn.microsoft.com/en-us/troubleshoot/sharepoint/sync/cant-sync-after-migration
