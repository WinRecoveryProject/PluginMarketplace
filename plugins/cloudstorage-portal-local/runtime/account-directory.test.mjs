import test from 'node:test';
import assert from 'node:assert/strict';
import { accountDirectory } from './account-directory.mjs';
import { Broker } from './broker.mjs';
import { executeTool } from './mcp.mjs';

function connection(provider, id, subject, driveId) {
  return { id, provider, owner: 'owner', state: 'connected', identityVerifiedAt: 123,
    identity: { subject, label: 'Same display name', email: 'same@example.test', ...(provider === 'onedrive' ? { driveId, driveType: 'personal' } : {}) },
    tokens: { access: 'do-not-return', refresh: 'do-not-return', expires: Date.now() + 3600000 } };
}

test('directory distinguishes platforms and immutable identities rather than display email', () => {
  const accounts = accountDirectory([
    connection('dropbox', 'db', 'same'), connection('google', 'gg', 'same'),
    connection('onedrive', 'od1', 'same', 'drive1'), connection('onedrive', 'od2', 'same', 'drive2'),
  ], { onedrive: 'od2' });
  assert.equal(accounts.length, 4);
  assert.equal(new Set(accounts.map(account => account.accountId)).size, 4);
  assert.equal(accounts.filter(account => account.connections.some(item => item.selected)).length, 1);
  assert.equal(JSON.stringify(accounts).includes('do-not-return'), false);
});

test('directory groups duplicate login grants without overwriting their connection IDs', () => {
  const accounts = accountDirectory([connection('onedrive', 'first', 'person', 'drive'), connection('onedrive', 'second', 'person', 'drive')], { onedrive: 'second' });
  assert.equal(accounts.length, 1);
  assert.deepEqual(accounts[0].connections.map(item => item.connectionId), ['first', 'second']);
  assert.deepEqual(accounts[0].connections.map(item => item.selected), [false, true]);
});

test('broker directory excludes another session and cannot expose credential fields', () => {
  const broker = new Broker({ env: {} });
  const owner = broker.createSession();
  const other = broker.createSession();
  broker.connections.set('mine', { ...connection('google', 'mine', 'me'), owner });
  broker.connections.set('other', { ...connection('google', 'other', 'not-me'), owner: other });
  const status = broker.status(owner);
  assert.equal(status.accounts.length, 1);
  assert.equal(status.accounts[0].identity.subject, 'me');
  assert.equal(JSON.stringify(status).includes('do-not-return'), false);
});

test('common operation router rejects provider mismatch, unsupported operations and foreign sessions before network', async () => {
  const broker = new Broker({ env: {}, fetchImpl: async () => assert.fail('Unexpected network') });
  const owner = broker.createSession();
  const other = broker.createSession();
  broker.connections.set('mine', { ...connection('google', 'mine', 'me'), owner });
  await assert.rejects(broker.executeAccountOperation(owner, { provider: 'onedrive', connectionId: 'mine', operation: 'root' }), /provider_mismatch/u);
  await assert.rejects(broker.executeAccountOperation(owner, { provider: 'google', connectionId: 'mine', operation: 'text', itemId: 'file' }), /not_implemented/u);
  await assert.rejects(broker.executeAccountOperation(other, { provider: 'google', connectionId: 'mine', operation: 'root' }), /connection_not_found/u);
  await assert.rejects(broker.executeAccountOperation(owner, { provider: 'google', connectionId: 'mine', operation: 'root', itemId: 'file' }), /rejects_item_id/u);
});

test('common MCP entrypoint executes all three root adapters with exact attribution', async () => {
  for (const provider of ['dropbox', 'google', 'onedrive']) {
    const urls = [];
    const broker = new Broker({ env: {}, fetchImpl: async url => {
      urls.push(url);
      return Response.json(provider === 'dropbox' ? { entries: [], has_more: false } : provider === 'google' ? { files: [] } : { value: [] });
    } });
    const owner = broker.createSession();
    broker.connections.set('mine', { ...connection(provider, 'mine', 'person', 'drive'), owner });
    const result = await executeTool({ broker, owner }, 'cloudstorage_execute', { provider, connection_id: 'mine', operation: 'root' });
    assert.equal(result.isError, false);
    const data = JSON.parse(result.content[0].text);
    assert.equal(data.provider, provider);
    assert.equal(data.connectionId, 'mine');
    assert.equal(urls.length, 1);
    assert.equal(new URL(urls[0]).hostname, provider === 'dropbox' ? 'api.dropboxapi.com' : provider === 'google' ? 'www.googleapis.com' : 'graph.microsoft.com');
  }
});

test('quick switching keeps same-provider accounts separate and routes the selected connection explicitly', async () => {
  const authorizations = [];
  const broker = new Broker({ env: {}, fetchImpl: async (url, options) => {
    authorizations.push({ url, authorization: options.headers.Authorization });
    return Response.json({ files: [] });
  } });
  const owner = broker.createSession();
  const first = { ...connection('google', 'first', 'person-one'), owner, tokens: { access: 'access-one', refresh: 'refresh-one', expires: Date.now() + 3600000 } };
  const second = { ...connection('google', 'second', 'person-two'), owner, tokens: { access: 'access-two', refresh: 'refresh-two', expires: Date.now() + 3600000 } };
  broker.connections.set(first.id, first);
  broker.connections.set(second.id, second);
  broker.selectConnection(owner, first.id);
  assert.equal(broker.status(owner).activeConnections.google, first.id);
  await broker.executeAccountOperation(owner, { provider: 'google', connectionId: first.id, operation: 'root' });
  broker.selectConnection(owner, second.id);
  assert.equal(broker.status(owner).activeConnections.google, second.id);
  await broker.executeAccountOperation(owner, { provider: 'google', connectionId: second.id, operation: 'root' });
  assert.deepEqual(authorizations.map(call => call.authorization), ['Bearer access-one', 'Bearer access-two']);
  assert.equal(JSON.stringify(broker.status(owner)).includes('access-one'), false);
  assert.equal(JSON.stringify(broker.status(owner)).includes('access-two'), false);
});

test('disconnect and reauthentication fall back to another connected account for the same provider', async () => {
  const broker = new Broker({ env: {} });
  const owner = broker.createSession();
  const first = { ...connection('dropbox', 'first', 'person-one'), owner };
  const second = { ...connection('dropbox', 'second', 'person-two'), owner };
  broker.connections.set(first.id, first);
  broker.connections.set(second.id, second);
  broker.selectConnection(owner, second.id);
  const disconnected = broker.disconnect(owner, second.id);
  assert.equal(disconnected.replacementConnectionId, first.id);
  assert.equal(broker.status(owner).activeConnections.dropbox, first.id);
  const expired = { ...connection('dropbox', 'expired', 'person-three'), owner, state: 'reauthentication_required' };
  broker.connections.set(expired.id, expired);
  assert.throws(() => broker.selectConnection(owner, expired.id), { code: 'reauthentication_required' });
  broker.selectConnection(owner, first.id);
  broker.requireReauthentication(owner, first);
  assert.equal(broker.status(owner).activeConnections.dropbox, undefined);
});
