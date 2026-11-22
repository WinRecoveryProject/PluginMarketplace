# Plugin files: cloudstorage-portal — `.codex-plugin/`

Source: `plugins/cloudstorage-portal`. Files outside the `skills/*` folders, embedded as text.

## File: `.codex-plugin/plugin.json`

```json
{
  "apps": "./.app.json",
  "interface": {
    "capabilities": [],
    "category": "Productivity",
    "defaultPrompt": [
      "Vis mine tilgængelige cloudforbindelser og søg på tværs af de tilsluttede konti."
    ],
    "developerName": "Zilvereyes",
    "displayName": "CloudStorage Portal",
    "websiteURL": "https://github.com/WinRecoveryProject/CloudStorage-Portal",
    "privacyPolicyURL": "https://github.com/WinRecoveryProject/PluginMarketplace/blob/main/docs/cloudstorage-privacy.md",
    "termsOfServiceURL": "https://github.com/WinRecoveryProject/PluginMarketplace/blob/main/docs/cloudstorage-terms.md",
    "logo": "./assets/cloudstorage-portal.png",
    "composerIcon": "./assets/cloudstorage-portal-composer.png",
    "longDescription": "Dropbox, Google Drive and OneDrive workflows through existing authorized connections. Discover each available App or MCP route without duplicate login.",
    "shortDescription": "Cloudfiler på tværs af konti"
  },
  "name": "cloudstorage-portal",
  "version": "0.9.14",
  "description": "Coordinate Dropbox, Google Drive and OneDrive through existing authorized App or MCP connections and a unified skill layer.",
  "author": {
    "name": "Zilvereyes",
    "email": "zilver.muhlig.hansen@gmail.com"
  },
  "license": "MIT",
  "repository": "https://github.com/WinRecoveryProject/CloudStorage-Portal",
  "keywords": [],
  "skills": "./skills"
}
```
