# OneDrive

OneDrive App package used by CloudStorage Portal. The App keeps the agreed name
OneDrive and the existing assets/onedrive.png logo/composer icon. .app.json binds
to the canonical hosted App at https://cloudstorage-onedrive-mcp.vercel.app/mcp,
not OneDrive Broker Staging. No separate Local runtime is required.

Runtime 0.3.0 exposes 28 tools (14 read/status/export and 14 changes). Small
binary transfers are bounded to 2 MiB; larger new uploads use resumable chunks.
The skill documents account binding, exact eTags, scope gates, sharing, versions,
limits and readback. Old read tokens cannot write; write operations require
onedrive.read + onedrive.write and the applicable Microsoft consent.

54 local tests pass and the App UI has discovered 28 tools. Live file writes,
cloud-App icon and final Desktop presentation still require verification. These
are not claimed complete by the package version. No credentials are packaged.
