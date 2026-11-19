const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const vscode = require('vscode');

exports.run = async () => {
  const extension = vscode.extensions.getExtension('Zilvereyes.onedrive');
  assert.ok(extension, 'The isolated host must load the installed OneDrive extension');
  assert.equal(extension.packageJSON.version, '1.2.2');
  assert.equal(path.relative(process.env.WRP_ONEDRIVE_TEST_EXTENSIONS, path.dirname(extension.extensionPath)), '');
  assert.equal(vscode.workspace.isTrusted, true);
  assert.deepEqual(extension.packageJSON.contributes.mcpServerDefinitionProviders, [
    { id: 'onedrive', label: 'OneDrive' },
  ]);
  assert.equal(vscode.workspace.getConfiguration('chat.mcp').get('autostart'), 'never');
  await extension.activate();
  assert.equal(extension.isActive, true);
  const proof = {
    id: extension.id,
    version: extension.packageJSON.version,
    hostVersion: vscode.version,
    nativeProviderActivated: true,
    autoStart: 'never',
  };
  await fs.writeFile(process.env.WRP_ONEDRIVE_TEST_PROOF, JSON.stringify(proof, null, 2) + '\n');
};
