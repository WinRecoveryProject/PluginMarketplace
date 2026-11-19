const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const vm = require('node:vm');
const manifest = require('../package.json');

test('registers one matching HTTPS provider with native authentication', () => {
  let registration;
  const disposable = { dispose() {} };
  const vscode = {
    Uri: { parse: value => new URL(value) },
    McpHttpServerDefinition: class {
      constructor(label, uri, headers) {
        Object.assign(this, { label, uri, headers });
      }
    },
    lm: {
      registerMcpServerDefinitionProvider(id, provider) {
        assert.equal(registration, undefined);
        registration = { id, provider };
        return disposable;
      },
    },
  };
  const loaded = { exports: {} };
  const script = fs.readFileSync(path.join(__dirname, '..', 'extension.cjs'), 'utf8');
  vm.runInNewContext(script, {
    module: loaded,
    require(id) {
      assert.equal(id, 'vscode');
      return vscode;
    },
  });
  const context = { subscriptions: [] };
  loaded.exports.activate(context);
  assert.deepEqual(context.subscriptions, [disposable]);
  assert.equal(registration.id, manifest.contributes.mcpServerDefinitionProviders[0].id);
  const [definition, surplus] = registration.provider.provideMcpServerDefinitions();
  assert.equal(surplus, undefined);
  assert.equal(definition.label, 'OneDrive');
  assert.equal(definition.uri.href, 'https://cloudstorage-onedrive-mcp.vercel.app/mcp');
  assert.equal(definition.headers, undefined);
  assert.equal(registration.provider.resolveMcpServerDefinition, undefined);
});
