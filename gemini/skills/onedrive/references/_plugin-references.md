# Plugin files: onedrive — `references/`

Source: `plugins/onedrive`. Files outside the `skills/*` folders, embedded as text.

## File: `references/legacy/.mcp.json`

```json
{
  "mcpServers": {
    "onedrive": {
      "type": "streamable-http",
      "url": "https://cloudstorage-onedrive-mcp.vercel.app/mcp",
      "headers": {},
      "extensions": {
        "com.openai": {
          "auth": {
            "type": "oauth",
            "client": {
              "mode": "dcr"
            },
            "defaultScopes": [
              "onedrive.read",
              "onedrive.write"
            ],
            "baseScopes": [
              "onedrive.read",
              "onedrive.write"
            ]
          }
        }
      }
    }
  }
}
```

## File: `references/legacy/README.md`

### Historical standalone MCP configuration

These are the unchanged 1.1.8 standalone MCP declarations. They are retained
only as historical configuration evidence. Version 1.2.0 reuses the existing
registered OneDrive App and its hosted MCP connection.

Do not copy these files to the package root. The native loader auto-discovers
top-level `.mcp.json` even when `mcpServers` is absent from the native manifest;
that would recreate a second OAuth client and a second sign-in route.

## File: `references/legacy/mcp.json`

```json
{
  "$schema": "https://agent-plugins.org/schemas/1.0.0/mcp.schema.json",
  "mcpServers": {
    "onedrive": {
      "type": "streamable-http",
      "url": "https://cloudstorage-onedrive-mcp.vercel.app/mcp",
      "extensions": {
        "com.openai": {
          "auth": {
            "type": "oauth",
            "client": {
              "mode": "dcr"
            },
            "defaultScopes": [
              "onedrive.read",
              "onedrive.write"
            ],
            "baseScopes": [
              "onedrive.read",
              "onedrive.write"
            ]
          }
        }
      }
    }
  }
}
```

## File: `references/portable-plugin.json`

```json
{
  "$schema": "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json",
  "name": "onedrive",
  "version": "1.2.2",
  "description": "OneDrive files through the existing registered App and its hosted CloudStorage Portal MCP connection.",
  "author": {
    "name": "Zilvereyes",
    "email": "zilver.muhlig.hansen@gmail.com"
  },
  "license": "MIT",
  "keywords": [
    "onedrive",
    "microsoft-graph",
    "cloud-storage",
    "files"
  ],
  "extensions": {
    "com.openai": {
      "interface": {
        "displayName": "OneDrive",
        "shortDescription": "Dine OneDrive-filer",
        "longDescription": "Læs og administrér OneDrive-filer: mapper, søgning, download, upload, flytning, kopiering, versioner og deling gennem den eksisterende CloudStorage Portal-server.",
        "developerName": "Zilvereyes",
        "category": "Productivity",
        "websiteURL": "https://github.com/WinRecoveryProject/CloudStorage-Portal",
        "privacyPolicyURL": "https://github.com/WinRecoveryProject/PluginMarketplace/blob/main/docs/cloudstorage-privacy.md",
        "termsOfServiceURL": "https://github.com/WinRecoveryProject/PluginMarketplace/blob/main/docs/cloudstorage-terms.md",
        "capabilities": [],
        "defaultPrompt": "Vis min verificerede OneDrive-konto og indholdet i roden uden at ændre filer.",
        "logo": "./assets/logo-512.png",
        "composerIcon": "./assets/composer-128.png",
        "brandColor": "#0078D4",
        "brandColorDark": "#4CC2FF"
      },
      "apps": "./.app.json",
      "onboardingSkill": "./skills/onedrive-setup/SKILL.md"
    }
  }
}
```
