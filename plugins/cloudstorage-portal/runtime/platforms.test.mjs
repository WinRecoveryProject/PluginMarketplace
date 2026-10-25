import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { platformNames, platformDefinition, platformOAuth, platformCapabilities, validatePlatformIdentity } from './platforms.mjs';
import { Broker } from './broker.mjs';
import { mcpServerIdentity } from './mcp.mjs';

test('three platforms are first-class and retain all eleven native workflows', () => {
  assert.deepEqual(platformNames, ['dropbox', 'google', 'onedrive']);
  assert.deepEqual(platformNames.map(provider => platformDefinition(provider).label), ['Dropbox', 'Google Drive', 'OneDrive']);
  const skills = platformNames.flatMap(provider => platformDefinition(provider).nativeWorkflowSkills);
  assert.equal(skills.length, 11);
  assert.equal(new Set(skills).size, 11);
  for (const provider of ['sharepoint', 'constructor', '__proto__', 'unknown']) assert.throws(() => platformDefinition(provider), /Unknown provider/u);
});

test('platform definitions cannot be changed by another account or configuration caller', () => {
  assert.throws(() => { platformDefinition('onedrive').label = 'SharePoint'; }, TypeError);
  const config = platformOAuth('onedrive', { MICROSOFT_CLIENT_ID: 'public-client' });
  config.scopes.push('unexpected');
  config.extra.prompt = 'none';
  assert.equal(platformOAuth('onedrive').scopes.includes('unexpected'), false);
  assert.equal(platformOAuth('onedrive').extra.prompt, 'select_account');
});

test('each platform receives only its own registration and endpoints', () => {
  const env = { DROPBOX_CLIENT_ID: 'dropbox-id', GOOGLE_CLIENT_ID: 'google-id', MICROSOFT_CLIENT_ID: 'microsoft-id', GOOGLE_CLIENT_SECRET: 'test-google-only' };
  assert.equal(platformOAuth('dropbox', env).clientId, 'dropbox-id');
  assert.equal(platformOAuth('google', env).clientId, 'google-id');
  assert.equal(platformOAuth('onedrive', env).clientId, 'microsoft-id');
  assert.equal(platformOAuth('onedrive', env).clientSecret, undefined);
  assert.equal(platformOAuth('dropbox', env).clientSecret, undefined);
  assert.equal(platformOAuth('google', env).clientSecret, 'test-google-only');
});

test('OneDrive requires its own drive identity and is not passed off as a native appbinding', () => {
  assert.throws(() => validatePlatformIdentity('onedrive', { subject: 'person' }), /Incomplete/u);
  validatePlatformIdentity('onedrive', { subject: 'person', driveId: 'drive', driveType: 'personal' });
  const oneDrive = platformCapabilities('onedrive');
  assert.equal(oneDrive.label, 'OneDrive');
  assert.equal(oneDrive.hostBindingDeclared, false);
  assert.equal(oneDrive.nativeAppReference, null);
  assert.deepEqual(oneDrive.runtimeOperations, ['identity', 'root', 'folder', 'item', 'text', 'search']);
  assert.equal(oneDrive.cloudWritesImplemented, false);
  assert.equal(platformCapabilities('dropbox').nativeConnectionState, 'not-observed-by-local-runtime');
  assert.deepEqual(mcpServerIdentity, { name: 'onedrive', version: '0.8.0-dev.11' });
  for (const manifest of ['../.mcp.json', '../mcp.json']) {
    const document = JSON.parse(readFileSync(new URL(manifest, import.meta.url), 'utf8'));
    assert.deepEqual(Object.keys(document.mcpServers), ['onedrive']);
  }
});

test('broker exposes the same three-platform contract without claiming live accounts', () => {
  const broker = new Broker({ env: {} });
  const status = broker.status(broker.createSession());
  assert.deepEqual(status.platforms.map(platform => platform.provider), platformNames);
  assert.equal(status.connections.length, 0);
  assert.equal(status.platforms[2].provider, 'onedrive');
  assert.equal(status.platforms[2].hostBindingDeclared, false);
});
