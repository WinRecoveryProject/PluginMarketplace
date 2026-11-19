const vscode = require('vscode');

function activate(context) {
  const provider = {
    provideMcpServerDefinitions() {
      return [
        new vscode.McpHttpServerDefinition(
          'OneDrive',
          vscode.Uri.parse('https://cloudstorage-onedrive-mcp.vercel.app/mcp')
        ),
      ];
    },
  };
  context.subscriptions.push(vscode.lm.registerMcpServerDefinitionProvider('onedrive', provider));
}

module.exports = { activate };
