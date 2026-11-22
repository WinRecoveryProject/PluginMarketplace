# Plugin files: cloudstorage-portal — `references/`

Source: `plugins/cloudstorage-portal`. Files outside the `skills/*` folders, embedded as text.

## File: `references/README.md`

### Portable manifest references

This file preserves the Agent Plugins representation of CloudStorage Portal. It is a reference and is not an active manifest in this Git-marketplace package.

The active Codex package intentionally uses `.codex-plugin/plugin.json` and `.app.json`. Current Codex releases classify a package with a root `plugin.json` as an Agent Plugin and suppress its app declarations unless it comes from the remote global marketplace. Keeping the portable root manifest beside the Codex manifest would therefore hide Dropbox, Google Drive and OneDrive from the plugin detail page.

To build a separate portable distribution, copy `portable-plugin.json` to `plugin.json` in a separate package root. The retired CloudStorage Portal Local runtime is historical reference only. The current Portal routes to the existing provider Apps or MCP connections, including the hosted OneDrive App; do not add a separate Local plugin or runtime.

## File: `references/portable-plugin.json`

```json
{
  "$schema": "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json",
  "author": {
    "email": "zilver.muhlig.hansen@gmail.com",
    "name": "Zilvereyes"
  },
  "license": "MIT",
  "description": "Coordinate Dropbox, Google Drive and OneDrive through existing authorized App or MCP connections and a unified skill layer.",
  "extensions": {
    "com.openai": {
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
      }
    }
  },
  "name": "cloudstorage-portal",
  "repository": "https://github.com/WinRecoveryProject/CloudStorage-Portal",
  "version": "0.9.14"
}
```
