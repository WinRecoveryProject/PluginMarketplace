import assert from 'node:assert/strict';
import test from 'node:test';
import { remoteMcpManifest } from './write-remote-onedrive-mcp.mjs';

const apiClientId = '611e57ce-a334-46da-b172-98d03bf2bb9b';
const hostClientId = '22222222-3333-4444-8555-666666666666';

test('remote OneDrive manifest preserves provider identity and exact OAuth client', () => {
  const manifest = remoteMcpManifest('https://cloudstorage-onedrive-mcp.vercel.app/mcp', apiClientId, hostClientId);
  assert.deepEqual(Object.keys(manifest.mcpServers), ['onedrive']);
  const server = manifest.mcpServers.onedrive;
  assert.equal(server.type, 'streamable-http');
  assert.equal(server.extensions['com.openai'].auth.type, 'oauth');
  assert.equal(server.extensions['com.openai'].auth.client.clientId, hostClientId);
  assert.equal(server.extensions['com.openai'].auth.client.tokenEndpointAuthMethod, 'none');
  assert.deepEqual(server.extensions['com.openai'].auth.baseScopes, [`api://${apiClientId}/access_as_user`, 'offline_access']);
});

test('remote OneDrive manifest rejects placeholders, credentials and wrong paths', () => {
  for (const url of [
    'http://cloudstorage-onedrive-mcp.vercel.app/mcp',
    'https://user:pass@cloudstorage-onedrive-mcp.vercel.app/mcp',
    'https://cloudstorage-onedrive-mcp.vercel.app/',
    'https://cloudstorage-onedrive-mcp.vercel.app/mcp?token=no',
    'https://example.invalid/mcp',
  ]) assert.throws(() => remoteMcpManifest(url, apiClientId, hostClientId));
});

test('remote OneDrive manifest requires separate exact API and host registrations', () => {
  const url = 'https://cloudstorage-onedrive-mcp.vercel.app/mcp';
  assert.throws(() => remoteMcpManifest(url, 'not-a-guid', hostClientId), /API client ID/u);
  assert.throws(() => remoteMcpManifest(url, apiClientId, 'not-a-guid'), /Host client ID/u);
  assert.throws(() => remoteMcpManifest(url, apiClientId, apiClientId), /must be separate/u);
});
