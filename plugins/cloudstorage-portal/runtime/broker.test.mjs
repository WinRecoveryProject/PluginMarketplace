import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import http from 'node:http';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { providerNames, readIdentity, readRoot } from './providers.mjs';
import { Broker } from './broker.mjs';
import { createPortal, listenLoopback } from './server.mjs';
import { createMcpServer, executeTool, toolDefinitions } from './mcp.mjs';
import { localOneDriveStatus, readLocalOneDriveRoot, readLocalOneDriveFolder } from './local-onedrive.mjs';

const env = { DROPBOX_CLIENT_ID: 'test-dropbox', GOOGLE_CLIENT_ID: 'test-google', MICROSOFT_CLIENT_ID: 'test-microsoft' };
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

test('platform labels retain OneDrive identity and reject SharePoint as a provider alias', async () => {
  const broker = new Broker({ env: {} });
  const status = broker.status(broker.createSession());
  assert.deepEqual(status.providers.map(provider => [provider.provider, provider.label]), [
    ['dropbox', 'Dropbox'], ['google', 'Google Drive'], ['onedrive', 'OneDrive'],
  ]);
  assert.equal(providerNames.includes('sharepoint'), false);
  let calls = 0;
  const request = async () => { calls++; return {}; };
  await assert.rejects(readIdentity('sharepoint', request), /Unknown provider/u);
  await assert.rejects(readRoot('sharepoint', request), /Unknown provider/u);
  assert.equal(calls, 0);
});

function fixture({ connectionStore } = {}) {
  let timestamp = 1000000;
  let refreshCount = 0;
  let refreshResponse = { access_token: 'refreshed', token_type: 'Bearer', expires_in: 3600 };
  let failRoot = false;
  const calls = [];
  const mockFetch = async (url, options = {}) => {
    calls.push({ url, options });
    if (url.endsWith('/token')) {
      const parameters = new URLSearchParams(options.body);
      if (parameters.get('grant_type') === 'refresh_token') {
        refreshCount++;
        await new Promise(resolve => setTimeout(resolve, 5));
        return json(refreshResponse, refreshResponse.error ? 400 : 200);
      }
      return json({ access_token: 'test-access', refresh_token: 'test-refresh', token_type: 'Bearer', expires_in: 3600 });
    }
    if (url.includes('get_current_account')) return json({ account_id: 'dbid:account', name: { display_name: 'Dropbox Test' } });
    if (url.includes('/about?')) return json({ user: { permissionId: 'drive-subject', displayName: 'Google Test' } });
    if (url.includes('/me?$select')) return json({ id: 'microsoft-subject', displayName: 'Microsoft Test' });
    if (url.includes('/me/drive?$select')) return json({ id: 'drive-id', driveType: 'personal' });
    if (failRoot && url.includes('/files/list_folder')) return json({ error: 'unauthorized' }, 401);
    if (url.includes('/files/list_folder')) return json({ entries: [{ id: 'db-file', name: 'Dropbox file', '.tag': 'file' }], has_more: true });
    if (url.includes('/drive/v3/files?')) return json({ files: [{ id: 'g-file', name: 'Google file', mimeType: 'text/plain' }] });
    if (url.includes('/drive/root/children?')) return json({ value: [{ id: 'm-file', name: 'Microsoft folder', folder: {} }] });
    if (url.includes("/root/search(q='")) return json({ value: [{ id: 'm-file', name: 'Microsoft folder', folder: {}, parentReference: { driveId: 'drive-id' } }] });
    if (url.includes('/items/m-file?')) return json({ id: 'm-file', name: 'Microsoft folder', folder: {}, parentReference: { driveId: 'drive-id' }, eTag: 'm-version' });
    throw new Error(`Unexpected test URL: ${url}`);
  };
  const broker = new Broker({ origin: 'http://127.0.0.1:53682', env, fetchImpl: mockFetch, now: () => timestamp, connectionStore });
  const owner = broker.createSession();
  const connect = async (provider = 'dropbox', session = owner) => {
    const authorization = new URL(broker.begin(session, provider));
    const parameters = new URLSearchParams({ state: authorization.searchParams.get('state'), code: 'test-code' });
    return broker.complete(session, provider, parameters);
  };
  return { broker, owner, calls, connect, advance: seconds => { timestamp += seconds * 1000; },
    setRefresh: result => { refreshResponse = result; }, count: () => refreshCount, failRoot: () => { failRoot = true; } };
}

test('all three authorization URLs use distinct registrations and S256 PKCE', () => {
  const { broker, owner } = fixture();
  const states = new Set();
  for (const provider of ['dropbox', 'google', 'onedrive']) {
    const url = new URL(broker.begin(owner, provider));
    const state = url.searchParams.get('state');
    const pending = broker.pending.get(state);
    states.add(state);
    assert.equal(url.searchParams.get('code_challenge_method'), 'S256');
    assert.equal(url.searchParams.get('code_challenge'), createHash('sha256').update(pending.verifier).digest('base64url'));
    assert.equal(url.searchParams.get('redirect_uri'), `${broker.origin}/oauth/${provider}/callback`);
    assert.ok(!url.searchParams.has('client_secret'));
  }
  assert.equal(states.size, 3);
});

test('Google client secret remains protected until token exchange and loads only once', async () => {
  let secretLoads = 0;
  const tokenBodies = [];
  const broker = new Broker({
    origin: 'http://127.0.0.1:53682',
    env: { GOOGLE_CLIENT_ID: 'test-google' },
    secretConfigured: { google: true },
    secretLoaders: { google: () => { secretLoads++; return 'test-secret'; } },
    fetchImpl: async (url, options = {}) => {
      if (url.includes('/token')) {
        tokenBodies.push(new URLSearchParams(options.body));
        return json({ access_token: 'test-access', refresh_token: 'test-refresh', token_type: 'Bearer', expires_in: 3600 });
      }
      if (url.includes('/about?')) return json({ user: { permissionId: 'drive-subject', displayName: 'Google Test' } });
      throw new Error(`Unexpected test URL: ${url}`);
    },
  });
  const owner = broker.createSession();
  const before = broker.status(owner).providers.find(provider => provider.provider === 'google');
  assert.equal(before.clientSecretConfigured, true);
  assert.equal(before.clientSecretLoaded, false);
  assert.equal(before.clientSecretLoadAttempted, false);
  assert.equal(secretLoads, 0);

  for (let attempt = 0; attempt < 2; attempt++) {
    const authorization = new URL(broker.begin(owner, 'google'));
    await broker.complete(owner, 'google', new URLSearchParams({ state: authorization.searchParams.get('state'), code: `code-${attempt}` }));
  }

  assert.equal(secretLoads, 1);
  assert.equal(tokenBodies.length, 2);
  assert.ok(tokenBodies.every(body => body.get('client_secret') === 'test-secret'));
  const after = broker.status(owner).providers.find(provider => provider.provider === 'google');
  assert.equal(after.clientSecretLoaded, true);
  assert.equal(after.clientSecretLoadAttempted, true);
  assert.equal(after.clientSecretLoadError, null);
});

test('missing registration and unsupported providers fail before any network request', () => {
  const broker = new Broker({ origin: 'http://127.0.0.1:53682', env: {} });
  const owner = broker.createSession();
  assert.throws(() => broker.begin(owner, 'dropbox'), { code: 'client_registration_missing' });
  assert.throws(() => broker.begin(owner, 'other'), { code: 'unknown_provider' });
});

test('callback rejects wrong owner, wrong provider, expiration and replay', async () => {
  const { broker, owner, advance, calls } = fixture();
  const url = new URL(broker.begin(owner, 'dropbox'));
  const parameters = new URLSearchParams({ state: url.searchParams.get('state'), code: 'test' });
  await assert.rejects(broker.complete(broker.createSession(), 'dropbox', parameters), { code: 'invalid_oauth_state' });
  await assert.rejects(broker.complete(owner, 'google', parameters), { code: 'invalid_oauth_state' });
  assert.equal(calls.length, 0);
  await broker.complete(owner, 'dropbox', parameters);
  await assert.rejects(broker.complete(owner, 'dropbox', parameters), { code: 'invalid_oauth_state' });
  const stillValid = new URL(broker.begin(owner, 'dropbox'));
  advance(1799);
  await broker.complete(owner, 'dropbox', new URLSearchParams({ state: stillValid.searchParams.get('state'), code: 'test' }));
  const expired = new URL(broker.begin(owner, 'dropbox'));
  advance(1801);
  await assert.rejects(broker.complete(owner, 'dropbox', new URLSearchParams({ state: expired.searchParams.get('state'), code: 'test' })), { code: 'invalid_oauth_state' });
});

test('denied consent consumes state without exchanging a code', async () => {
  const { broker, owner, calls } = fixture();
  const url = new URL(broker.begin(owner, 'dropbox'));
  const parameters = new URLSearchParams({ state: url.searchParams.get('state'), error: 'access_denied' });
  await assert.rejects(broker.complete(owner, 'dropbox', parameters), { code: 'provider_consent_not_completed' });
  assert.equal(calls.length, 0);
  assert.equal(broker.pending.size, 0);
});

for (const provider of ['dropbox', 'google', 'onedrive']) {
  test(`${provider}: account identity and bounded root read remain attributed`, async () => {
    const { broker, owner, connect } = fixture();
    const connection = await connect(provider);
    assert.equal(connection.provider, provider);
    assert.ok(connection.identity.subject);
    assert.equal(connection.rootVerifiedAt, null);
    const result = await broker.root(owner, connection.id);
    assert.equal(result.provider, provider);
    assert.equal(result.connectionId, connection.id);
    assert.equal(result.items.length, 1);
    assert.ok(broker.status(owner).connections[0].rootVerifiedAt);
    const serialized = JSON.stringify(broker.status(owner));
    assert.ok(!serialized.includes('test-access'));
    assert.ok(!serialized.includes('test-refresh'));
    assert.equal(connection.grantedScopes, null);
  });
}

test('connections are isolated by session and duplicate accounts do not overwrite', async () => {
  const { broker, owner, connect } = fixture();
  const first = await connect();
  const second = await connect();
  assert.notEqual(first.id, second.id);
  const other = broker.createSession();
  assert.equal(broker.status(other).connections.length, 0);
  await assert.rejects(broker.root(other, first.id), { code: 'connection_not_found' });
  assert.throws(() => broker.disconnect(other, first.id), { code: 'connection_not_found' });
  assert.equal(broker.status(owner).connections.length, 2);
});

test('concurrent refresh is serialized and omitted refresh tokens are retained', async () => {
  const { broker, owner, connect, advance, count } = fixture();
  const connection = await connect();
  advance(3590);
  await Promise.all([broker.root(owner, connection.id), broker.root(owner, connection.id)]);
  assert.equal(count(), 1);
  assert.equal(broker.connection(owner, connection.id).tokens.refresh, 'test-refresh');
});

test('refresh rotation is stored and invalid grants require new authorization', async () => {
  const { broker, owner, connect, advance, setRefresh } = fixture();
  const connection = await connect();
  setRefresh({ access_token: 'next-access', refresh_token: 'rotated', token_type: 'Bearer', expires_in: 3600 });
  advance(3590);
  await broker.root(owner, connection.id);
  assert.equal(broker.connection(owner, connection.id).tokens.refresh, 'rotated');
  setRefresh({ error: 'invalid_grant' });
  advance(3590);
  await assert.rejects(broker.root(owner, connection.id), { code: 'reauthentication_required' });
  assert.equal(broker.status(owner).connections[0].state, 'reauthentication_required');
});

test('refresh grants survive restart and restored identities are revalidated before use', async () => {
  const connectionStore = {
    state: { version: 1, connections: [], activeConnections: {} },
    load() { return structuredClone(this.state); },
    save(state) { this.state = structuredClone(state); },
  };
  const first = fixture({ connectionStore });
  const connection = await first.connect('onedrive');
  assert.equal(connectionStore.state.connections.length, 1);
  assert.equal(connectionStore.state.connections[0].refreshToken, 'test-refresh');
  assert.equal(Object.hasOwn(connectionStore.state.connections[0], 'accessToken'), false);

  const restarted = fixture({ connectionStore });
  const restoredStatus = restarted.broker.status(restarted.owner);
  assert.equal(restoredStatus.connections[0].id, connection.id);
  assert.equal(restoredStatus.connections[0].restoredFromSecureStore, true);
  assert.equal(restoredStatus.credentialStore.protection, 'windows-dpapi-current-user');
  const result = await restarted.broker.root(restarted.owner, connection.id);
  assert.equal(result.provider, 'onedrive');
  assert.equal(restarted.broker.status(restarted.owner).connections[0].restoredFromSecureStore, false);
  assert.ok(restarted.calls.some(call => call.url.includes('/me?$select')));
  assert.ok(!JSON.stringify(restarted.broker.status(restarted.owner)).includes('test-refresh'));
});

test('one provider failure leaves other connections independently usable', async () => {
  const { broker, owner, connect, failRoot } = fixture();
  const first = await connect('dropbox');
  const second = await connect('google');
  failRoot();
  await assert.rejects(broker.root(owner, first.id), { code: 'reauthentication_required' });
  assert.equal(broker.connection(owner, second.id).state, 'connected');
  assert.equal((await broker.root(owner, second.id)).items.length, 1);
});

test('disconnect removes local credentials without asserting remote revocation', async () => {
  const { broker, owner, connect } = fixture();
  const connection = await connect();
  const result = broker.disconnect(owner, connection.id);
  assert.equal(result.providerRevoked, false);
  await assert.rejects(broker.root(owner, connection.id), { code: 'connection_not_found' });
});

test('disconnect during refresh cannot restore the removed connection', async () => {
  const { broker, owner, connect, advance } = fixture();
  const connection = await connect();
  advance(3590);
  const reading = broker.root(owner, connection.id);
  broker.disconnect(owner, connection.id);
  await assert.rejects(reading, { code: 'connection_not_found' });
  assert.equal(broker.status(owner).connections.length, 0);
});

test('expired sessions cannot read connection metadata', async () => {
  const { broker, owner, connect, advance } = fixture();
  await connect();
  advance(8 * 3600);
  assert.throws(() => broker.status(owner), { code: 'session_required' });
});

test('MCP exposes twelve local tools including personal OneDrive search and exact metadata and rejects invalid calls', async () => {
  const { broker, owner, connect } = fixture();
  const portal = { broker, owner, portalUrl: () => 'http://127.0.0.1:53682/' };
  assert.ok(createMcpServer(portal).server);
  assert.equal(toolDefinitions.length, 12);
  const status = await executeTool(portal, 'cloudstorage_status');
  assert.equal(JSON.parse(status.content[0].text).providers.length, 3);
  assert.ok(!status.content[0].text.includes('csrf'));
  await assert.rejects(executeTool(portal, 'cloudstorage_read_root', { connection_id: 'id', owner: 'someone-else' }));
  const connected = await connect('onedrive');
  const result = await executeTool(portal, 'cloudstorage_read_root', { connection_id: connected.id });
  assert.equal(JSON.parse(result.content[0].text).provider, 'onedrive');
  assert.ok(!result.content[0].text.includes('test-access'));
  const search = await executeTool(portal, 'cloudstorage_search_onedrive', { connection_id: connected.id, query: 'Microsoft', top: 5 });
  assert.equal(JSON.parse(search.content[0].text).items[0].name, 'Microsoft folder');
  assert.ok(!search.content[0].text.includes('test-access'));
  const item = await executeTool(portal, 'cloudstorage_get_onedrive_item', { connection_id: connected.id, item_id: 'm-file' });
  assert.equal(JSON.parse(item.content[0].text).item.name, 'Microsoft folder');
  assert.ok(!item.content[0].text.includes('test-access'));
});

test('fresh browser handoff retains the owner, expires, and cannot be replayed', async () => {
  const port = 40000 + Math.floor(Math.random() * 20000);
  const portal = createPortal({ port, env: {}, settingsStore: undefined });
  let timestamp = Date.now();
  portal.broker.now = () => timestamp;
  await new Promise((resolve, reject) => { portal.server.once('error', reject); portal.server.listen(port, '127.0.0.1', resolve); });
  const exchange = link => fetch(`${portal.origin}/api/session`, { method: 'POST', headers: {
    Origin: portal.origin, 'X-Bootstrap': new URLSearchParams(new URL(link).hash.slice(1)).get('bootstrap'),
  } });
  try {
    const first = await exchange(portal.launchUrl);
    assert.equal(first.status, 200);
    const firstCookie = first.headers.get('set-cookie').split(';')[0];
    const secondLink = portal.portalUrl();
    assert.notEqual(secondLink, portal.launchUrl);
    const second = await exchange(secondLink);
    assert.equal(second.status, 200);
    assert.equal(second.headers.get('set-cookie').split(';')[0], firstCookie);
    assert.equal(portal.broker.sessions.size, 1);
    assert.equal((await exchange(secondLink)).status, 403);
    const superseded = portal.portalUrl();
    const latest = portal.portalUrl();
    assert.equal((await exchange(superseded)).status, 403);
    timestamp += 5 * 60 * 1000;
    assert.equal((await exchange(latest)).status, 403);
    assert.equal((await exchange(portal.portalUrl())).status, 200);
    assert.equal((await fetch(`${portal.origin}/api/status`, { headers: { Cookie: firstCookie } })).status, 200);
    assert.equal((await fetch(`${portal.origin}/api/session`, { method: 'POST', headers: { Origin: portal.origin } })).status, 403);
    timestamp += 8 * 60 * 60 * 1000;
    assert.throws(() => portal.portalUrl(), { code: 'session_required' });
  } finally {
    await new Promise(resolve => portal.server.close(resolve));
  }
});

test('HTTP portal requires bootstrap, same origin, session and CSRF', async () => {
  const port = 40000 + Math.floor(Math.random() * 20000);
  const portal = createPortal({ port, env: {}, fetchImpl: async () => { throw new Error('No network expected'); } });
  await new Promise(resolve => portal.server.listen(port, '127.0.0.1', resolve));
  try {
    const root = await fetch(portal.origin);
    assert.equal(root.status, 200);
    assert.ok(root.headers.get('content-security-policy').includes("frame-ancestors 'none'"));
    for (const provider of ['dropbox', 'google-drive', 'onedrive']) {
      const icon = await fetch(`${portal.origin}/assets/providers/${provider}.png`);
      assert.equal(icon.status, 200);
      assert.equal(icon.headers.get('content-type'), 'image/png');
      assert.deepEqual([...new Uint8Array(await icon.arrayBuffer()).slice(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
    }
    assert.equal((await fetch(`${portal.origin}/api/status`)).status, 401);
    assert.equal((await fetch(`${portal.origin}/api/session`, { method: 'POST', headers: { Origin: 'https://example.invalid' } })).status, 403);
    const secret = new URLSearchParams(new URL(portal.launchUrl).hash.slice(1)).get('bootstrap');
    const headers = { Origin: portal.origin, 'X-Bootstrap': secret };
    const session = await fetch(`${portal.origin}/api/session`, { method: 'POST', headers });
    assert.equal(session.status, 200);
    assert.equal((await fetch(`${portal.origin}/api/session`, { method: 'POST', headers })).status, 403);
    const cookie = session.headers.get('set-cookie').split(';')[0];
    const status = await (await fetch(`${portal.origin}/api/status`, { headers: { Cookie: cookie } })).json();
    assert.equal(status.providers.length, 3);
    const operationHeaders = { Origin: portal.origin, Cookie: cookie };
    assert.equal((await fetch(`${portal.origin}/api/connect/dropbox`, { method: 'POST', headers: operationHeaders })).status, 403);
    operationHeaders['X-CSRF'] = status.csrf;
    const missing = await fetch(`${portal.origin}/api/connect/dropbox`, { method: 'POST', headers: operationHeaders });
    assert.equal(missing.status, 409);
    assert.equal((await missing.json()).error, 'client_registration_missing');
    const rejectedHost = await new Promise((resolve, reject) => {
      const request = http.get(`${portal.origin}/api/status`, { headers: { Host: 'untrusted.invalid', Cookie: cookie } }, response => {
        response.resume();
        resolve(response.statusCode);
      });
      request.on('error', reject);
    });
    assert.equal(rejectedHost, 403);
  } finally {
    await new Promise(resolve => portal.server.close(resolve));
  }
});

test('local OneDrive mode requires an explicit absolute root and never claims OAuth proof', async () => {
  assert.equal(localOneDriveStatus({}).configured, false);
  await assert.rejects(readLocalOneDriveRoot({}), { code: 'local_onedrive_root_missing' });
  await assert.rejects(readLocalOneDriveRoot({ ONEDRIVE_LOCAL_ROOT: 'relative' }), { code: 'local_onedrive_root_must_be_absolute' });
  const folder = await mkdtemp(path.join(process.cwd(), '.cloudstorage-test-'));
  try {
    await mkdir(path.join(folder, 'sample-folder'));
    await writeFile(path.join(folder, 'sample-file.txt'), 'test fixture');
    const result = await readLocalOneDriveRoot({ ONEDRIVE_LOCAL_ROOT: folder });
    assert.equal(result.transport, 'local-sync');
    assert.equal(result.cloudIdentityVerified, false);
    assert.equal(result.cloudSyncVerified, false);
    assert.equal(result.fileContentRead, false);
    assert.equal(result.items.length, 2);
    assert.deepEqual(new Set(result.items.map(item => item.kind)), new Set(['file', 'folder']));
  } finally {
    assert.equal(path.dirname(path.resolve(folder)), process.cwd());
    assert.ok(path.basename(folder).startsWith('.cloudstorage-test-'));
    await rm(folder, { recursive: true, force: true });
  }
});

test('loopback startup tolerates a retiring listener but rejects a persistently occupied port', async () => {
  const retiring = http.createServer();
  await new Promise(resolve => retiring.listen(0, '127.0.0.1', resolve));
  const port = retiring.address().port;
  const next = http.createServer();
  const release = setTimeout(() => retiring.close(), 60);
  try {
    await listenLoopback(next, port, { attempts: 20, delayMs: 10 });
    assert.equal(next.address().port, port);
    const blocked = http.createServer();
    await assert.rejects(listenLoopback(blocked, port, { attempts: 2, delayMs: 5 }), { code: 'EADDRINUSE' });
    assert.equal(blocked.listening, false);
    assert.equal(next.listening, true);
  } finally {
    clearTimeout(release);
    if (retiring.listening) await new Promise(resolve => retiring.close(resolve));
    if (next.listening) await new Promise(resolve => next.close(resolve));
  }
});

test('stdio MCP survives occupied login port, reports the error and recovers without restart', async () => {
  const port = 40000 + Math.floor(Math.random() * 20000);
  const occupied = http.createServer();
  await new Promise((resolve, reject) => { occupied.once('error', reject); occupied.listen(port, '127.0.0.1', resolve); });
  const child = spawn(process.execPath, [fileURLToPath(new URL('./mcp.mjs', import.meta.url))], { cwd: fileURLToPath(new URL('.', import.meta.url)), windowsHide: true,
    env: { ...process.env, LOCALAPPDATA: '', DROPBOX_CLIENT_ID: '', GOOGLE_CLIENT_ID: '', GOOGLE_CLIENT_SECRET: '', MICROSOFT_CLIENT_ID: '',
      ONEDRIVE_LOCAL_ROOT: '', OneDriveConsumer: '', OneDriveCommercial: '', OneDrive: '', PORTAL_PORT: String(port) },
    stdio: ['pipe', 'pipe', 'pipe'] });
  let stdout = '';
  let stderr = '';
  let pendingText = '';
  const waiting = new Map();
  child.stdout.on('data', chunk => {
    stdout += chunk;
    pendingText += chunk;
    const lines = pendingText.split('\n');
    pendingText = lines.pop();
    for (const line of lines) {
      const response = JSON.parse(line);
      waiting.get(response.id)?.resolve(response);
      waiting.delete(response.id);
    }
  });
  child.stderr.on('data', chunk => { stderr += chunk; });
  const exited = new Promise((resolve, reject) => {
    child.on('error', reject);
    child.on('exit', code => resolve(code));
  });
  const rejectPending = error => {
    for (const pending of waiting.values()) pending.reject(error);
    waiting.clear();
  };
  child.on('error', rejectPending);
  child.on('exit', code => rejectPending(new Error(`MCP exited before response: ${code}; ${stderr}`)));
  const timeout = setTimeout(() => {
    rejectPending(new Error('MCP test timed out'));
    child.kill();
  }, 20000);
  const send = message => new Promise((resolve, reject) => {
    if (child.exitCode !== null) return reject(new Error('MCP already exited'));
    waiting.set(message.id, { resolve, reject });
    child.stdin.write(JSON.stringify(message) + '\n');
  });
  try {
    const initialized = await send({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'cloudstorage-test', version: '1.0.0' } } });
    assert.equal(initialized.result.protocolVersion, '2025-06-18');
    child.stdin.write(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) + '\n');
    await send({ jsonrpc: '2.0', id: 2, method: 'tools/list' });
    await send({ jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'cloudstorage_status', arguments: {} } });
    const invalid = await send({ jsonrpc: '2.0', id: 4, method: 'tools/call', params: { name: 'cloudstorage_read_root', arguments: { connection_id: 'not-connected', owner: 'another-session' } } });
    assert.ok(invalid.error || invalid.result?.isError);
    const missingRoot = await send({ jsonrpc: '2.0', id: 5, method: 'tools/call', params: { name: 'cloudstorage_read_local_onedrive_root', arguments: {} } });
    assert.equal(missingRoot.result.isError, true);
    assert.equal(JSON.parse(missingRoot.result.content[0].text).error, 'local_onedrive_root_missing');
    const unavailable = await send({ jsonrpc: '2.0', id: 6, method: 'tools/call', params: { name: 'cloudstorage_open_portal', arguments: {} } });
    assert.equal(unavailable.result.isError, true);
    assert.equal(JSON.parse(unavailable.result.content[0].text).error, 'portal_port_in_use');
    const afterConflict = await send({ jsonrpc: '2.0', id: 7, method: 'tools/call', params: { name: 'cloudstorage_status', arguments: {} } });
    assert.equal(JSON.parse(afterConflict.result.content[0].text).portal.error, 'portal_port_in_use');
    await new Promise(resolve => occupied.close(resolve));
    const recovered = await send({ jsonrpc: '2.0', id: 8, method: 'tools/call', params: { name: 'cloudstorage_open_portal', arguments: {} } });
    assert.equal(recovered.result.isError, false);
    assert.ok(new URL(JSON.parse(recovered.result.content[0].text).url).hash.startsWith('#bootstrap='));
    const afterRecovery = await send({ jsonrpc: '2.0', id: 9, method: 'tools/call', params: { name: 'cloudstorage_status', arguments: {} } });
    assert.equal(JSON.parse(afterRecovery.result.content[0].text).portal.listening, true);
    assert.equal(JSON.parse(afterRecovery.result.content[0].text).portal.error, null);
    const resources = await send({ jsonrpc: '2.0', id: 10, method: 'resources/list' });
    const resourceTemplates = await send({ jsonrpc: '2.0', id: 11, method: 'resources/templates/list' });
    assert.deepEqual(resources.result.resources, []);
    assert.deepEqual(resourceTemplates.result.resourceTemplates, []);
    child.stdin.end();
    assert.equal(await exited, 0, stderr);
    const responses = stdout.trim().split('\n').map(line => JSON.parse(line));
    assert.equal(responses.length, 11);
    assert.equal(responses.find(response => response.id === 2).result.tools.length, 12);
    const status = JSON.parse(responses.find(response => response.id === 3).result.content[0].text);
    assert.ok(status.providers.every(provider => !provider.configured));
    assert.equal(status.localOneDrive.configured, false);
  } finally {
    clearTimeout(timeout);
    if (child.exitCode === null) child.kill();
    if (occupied.listening) await new Promise(resolve => occupied.close(resolve));
  }
});
