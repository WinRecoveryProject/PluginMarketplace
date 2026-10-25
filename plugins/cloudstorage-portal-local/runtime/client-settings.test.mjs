import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import os from 'node:os';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { Broker } from './broker.mjs';
import { createPortal } from './server.mjs';
import { ClientSettingsStore, validateClientId } from './client-settings.mjs';
import { executeTool } from './mcp.mjs';

test('MCP account switching validates arguments and preserves explicit read targeting', async () => {
  const broker = new Broker({ env: {} });
  const owner = broker.createSession();
  const foreign = broker.createSession();
  broker.connections.set('mine', { id: 'mine', owner, provider: 'onedrive', state: 'connected', tokens: {}, identity: { subject: 'personal', driveId: 'personal-drive', driveType: 'personal' } });
  broker.connections.set('foreign', { id: 'foreign', owner: foreign, provider: 'onedrive', state: 'connected', tokens: {}, identity: { subject: 'work', driveId: 'work-drive', driveType: 'business' } });
  const portal = { broker, owner };
  const selected = await executeTool(portal, 'cloudstorage_select_account', { connection_id: 'mine' });
  assert.equal(selected.isError, false);
  assert.equal(broker.status(owner).activeConnections.onedrive, 'mine');
  assert.equal((await executeTool(portal, 'cloudstorage_select_account', { connection_id: 'foreign' })).isError, true);
  await assert.rejects(executeTool(portal, 'cloudstorage_select_account', { connection_id: 'mine', provider: 'google' }));
  await assert.rejects(executeTool(portal, 'cloudstorage_read_root', {}));
});

test('quick account selection is separate per provider, session-bound and cleared on disconnect', () => {
  const broker = new Broker({ env: {} });
  const owner = broker.createSession();
  const otherOwner = broker.createSession();
  for (const provider of ['dropbox', 'google', 'onedrive']) {
    for (const account of ['personal', 'work']) {
      const id = `${provider}-${account}`;
      broker.connections.set(id, { id, owner, provider, state: 'connected', tokens: {}, identity: { subject: account, ...(provider === 'onedrive' ? { driveId: `${account}-drive`, driveType: account === 'personal' ? 'personal' : 'business' } : {}) } });
    }
    broker.selectConnection(owner, `${provider}-personal`);
    broker.selectConnection(owner, `${provider}-work`);
    assert.equal(broker.status(owner).activeConnections[provider], `${provider}-work`);
    assert.throws(() => broker.selectConnection(otherOwner, `${provider}-work`), { code: 'connection_not_found' });
  }
  assert.equal(broker.status(owner).connections.length, 6);
  broker.disconnect(owner, 'onedrive-work');
  assert.equal(broker.status(owner).activeConnections.onedrive, 'onedrive-personal');
  assert.equal(broker.status(owner).activeConnections.dropbox, 'dropbox-work');
  assert.equal(broker.status(owner).connections.length, 5);
});

async function settingsFixture(callback) {
  const directory = await mkdtemp(path.join(os.tmpdir(), '.cloudstorage-settings-test-'));
  try { await callback(new ClientSettingsStore(path.join(directory, 'settings.json'))); }
  finally {
    assert.equal(path.dirname(path.resolve(directory)), path.resolve(os.tmpdir()));
    assert.ok(path.basename(directory).startsWith('.cloudstorage-settings-test-'));
    await rm(directory, { recursive: true, force: true });
  }
}

test('public client IDs persist across restart and provider-specific states are invalidated', async () => {
  await settingsFixture(async store => {
    const broker = new Broker({ origin: 'http://127.0.0.1:53683', env: {}, settingsStore: store });
    const owner = broker.createSession();
    broker.configureClient(owner, 'google', '123-example.apps.googleusercontent.com', validateClientId);
    broker.configureClient(owner, 'dropbox', 'dropboxpublicid', validateClientId);
    const googleUrl = new URL(broker.begin(owner, 'google'));
    const dropboxUrl = new URL(broker.begin(owner, 'dropbox'));
    broker.configureClient(owner, 'google', '456-next.apps.googleusercontent.com', validateClientId);
    assert.equal(broker.pending.has(googleUrl.searchParams.get('state')), false);
    assert.equal(broker.pending.has(dropboxUrl.searchParams.get('state')), true);
    const restarted = new Broker({ env: {}, settingsStore: store });
    const nextOwner = restarted.createSession();
    assert.equal(restarted.status(nextOwner).providers.find(provider => provider.provider === 'google').clientId, '456-next.apps.googleusercontent.com');
    const file = JSON.parse(await readFile(store.file, 'utf8'));
    assert.deepEqual(Object.keys(file).sort(), ['clients', 'version']);
    assert.deepEqual(Object.keys(file.clients).sort(), ['dropbox', 'google']);
    assert.equal(JSON.stringify(file).includes('refresh_token'), false);
  });
});

test('environment registrations and live connections cannot be silently replaced', () => {
  const managed = new Broker({ env: { DROPBOX_CLIENT_ID: 'environmentId' } });
  const owner = managed.createSession();
  assert.throws(() => managed.configureClient(owner, 'dropbox', 'replacementId', validateClientId), { code: 'client_managed_by_environment' });
  const broker = new Broker({ env: {} });
  const localOwner = broker.createSession();
  broker.connections.set('existing', { owner: localOwner, provider: 'google' });
  assert.throws(() => broker.configureClient(localOwner, 'google', '123-client.apps.googleusercontent.com', validateClientId), { code: 'disconnect_provider_before_configuration_change' });
  assert.throws(() => broker.configureClient('wrong-owner', 'dropbox', 'replacementId', validateClientId), { code: 'session_required' });
  assert.throws(() => validateClientId('onedrive', 'not-a-guid'), { code: 'invalid_microsoft_client_id' });
});

test('saved settings reject unknown providers and secret-bearing objects', async () => {
  await settingsFixture(async store => {
    await writeFile(store.file, JSON.stringify({ version: 1, clients: {}, client_secret: 'dummy-not-real' }));
    assert.throws(() => store.load(), { code: 'client_settings_invalid' });
    await writeFile(store.file, JSON.stringify({ version: 1, clients: { untrusted: 'dummy-id' } }));
    assert.throws(() => store.load(), { code: 'client_settings_invalid' });
  });
});

test('browser configuration requires session, origin and CSRF and accepts only public IDs', async () => {
  await settingsFixture(async store => {
    const port = 40000 + Math.floor(Math.random() * 20000);
    const portal = createPortal({ port, env: {}, settingsStore: store });
    await new Promise((resolve, reject) => { portal.server.once('error', reject); portal.server.listen(port, '127.0.0.1', resolve); });
    try {
      const bootstrap = new URLSearchParams(new URL(portal.launchUrl).hash.slice(1)).get('bootstrap');
      const session = await fetch(`${portal.origin}/api/session`, { method: 'POST', headers: { Origin: portal.origin, 'X-Bootstrap': bootstrap } });
      const cookie = session.headers.get('set-cookie').split(';')[0];
      const status = await (await fetch(`${portal.origin}/api/status`, { headers: { Cookie: cookie } })).json();
      const headers = { Origin: portal.origin, Cookie: cookie, 'Content-Type': 'application/json', 'X-CSRF': status.csrf };
      const target = `${portal.origin}/api/configuration/dropbox`;
      const invalidOrigin = await fetch(target, { method: 'POST', headers: { ...headers, Origin: 'https://untrusted.invalid' }, body: JSON.stringify({ client_id: 'validPublicId' }) });
      assert.equal(invalidOrigin.status, 403);
      const noCsrf = await fetch(target, { method: 'POST', headers: { ...headers, 'X-CSRF': '' }, body: JSON.stringify({ client_id: 'validPublicId' }) });
      assert.equal(noCsrf.status, 403);
      const secret = await fetch(target, { method: 'POST', headers, body: JSON.stringify({ client_id: 'validPublicId', client_secret: 'dummy-not-real' }) });
      assert.equal(secret.status, 400);
      const saved = await fetch(target, { method: 'POST', headers, body: JSON.stringify({ client_id: 'validPublicId' }) });
      assert.equal(saved.status, 200);
      assert.equal((await saved.json()).loginVerified, false);
      const fresh = await (await fetch(`${portal.origin}/api/status`, { headers: { Cookie: cookie } })).json();
      assert.equal(fresh.providers.find(provider => provider.provider === 'dropbox').configured, true);
      assert.equal(store.load().dropbox, 'validPublicId');
    } finally { await new Promise(resolve => portal.server.close(resolve)); }
  });
});
