# CloudStorage privacy notice

CloudStorage Portal and the standalone OneDrive plugin coordinate access to cloud-storage providers selected by the user.

The local Portal runtime stores connection metadata and refresh grants in its plugin data directory. Refresh grants are encrypted for the current Windows user with Windows Data Protection API; access tokens are held in memory and are not intentionally written to disk. The plugins do not package provider tokens, client secrets or copied credentials from another connector.

Provider operations are sent only to the provider or App selected for that operation. Dropbox, Google and Microsoft apply their own privacy terms to those requests. The local OneDrive sync-folder tools read local names and item types and explicitly do not claim that a local item proves cloud identity, synchronization state or Microsoft Graph access.

Diagnostics can contain local paths, provider names, account identifiers and error metadata. Review diagnostic output before sharing it outside the machine. The plugins do not intentionally add advertising or third-party analytics.

Removing a plugin does not by itself revoke a provider grant. Provider grants and connected Apps must be reviewed or revoked through their respective account controls when no longer wanted.
