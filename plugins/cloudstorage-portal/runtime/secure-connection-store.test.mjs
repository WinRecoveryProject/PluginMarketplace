import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { SecureConnectionStore, SecureTextStore, transformWithDpapi } from './secure-connection-store.mjs';

const state = {
  version: 1,
  connections: [{
    id: '11111111-2222-4333-8444-555555555555', provider: 'onedrive',
    identity: { subject: 'subject', tenantId: 'tenant', driveId: 'drive', driveType: 'personal', label: 'Account' },
    refreshToken: 'refresh-secret', grantedScopes: ['Files.Read'], identityVerifiedAt: 1,
    rootVerifiedAt: null, state: 'connected',
  }],
  activeConnections: { onedrive: '11111111-2222-4333-8444-555555555555' },
};

test('secure store writes only protected payload and restores the validated state', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'cloudstorage-store-'));
  const file = path.join(directory, 'connections.dpapi.json');
  const protect = bytes => Buffer.from(Buffer.from(bytes).toString('base64url').split('').reverse().join(''));
  const unprotect = bytes => Buffer.from(Buffer.from(bytes).toString().split('').reverse().join(''), 'base64url');
  try {
    const store = new SecureConnectionStore(file, { protect, unprotect });
    store.save(state);
    const onDisk = await readFile(file, 'utf8');
    assert.ok(!onDisk.includes('refresh-secret'));
    assert.ok(!onDisk.includes('subject'));
    assert.deepEqual(store.load(), state);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('secure store rejects malformed and internally inconsistent payloads', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'cloudstorage-store-'));
  const file = path.join(directory, 'connections.dpapi.json');
  try {
    await writeFile(file, JSON.stringify({ version: 1, protection: 'plain', payload: 'bad' }));
    assert.throws(() => new SecureConnectionStore(file).load(), /connection_store_invalid/u);
    const passthrough = bytes => bytes;
    const store = new SecureConnectionStore(file, { protect: passthrough, unprotect: passthrough });
    const invalid = structuredClone(state);
    invalid.activeConnections.dropbox = invalid.connections[0].id;
    assert.throws(() => store.save(invalid), /connection_store_invalid/u);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('Windows DPAPI round trip keeps cleartext out of the protected bytes', { skip: process.platform !== 'win32' }, () => {
  const cleartext = Buffer.from('CloudStorage Portal DPAPI probe', 'utf8');
  const protectedBytes = transformWithDpapi('protect', cleartext);
  assert.notDeepEqual(protectedBytes, cleartext);
  assert.deepEqual(transformWithDpapi('unprotect', protectedBytes), cleartext);
});

test('secure text store protects and restores a provider client secret', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'cloudstorage-secret-'));
  const file = path.join(directory, 'google-client-secret.dpapi.json');
  const protect = bytes => Buffer.from(Buffer.from(bytes).toString('base64url').split('').reverse().join(''));
  const unprotect = bytes => Buffer.from(Buffer.from(bytes).toString().split('').reverse().join(''), 'base64url');
  try {
    const store = new SecureTextStore(file, { protect, unprotect });
    assert.equal(store.hasValue(), false);
    store.save('provider-client-secret');
    assert.equal(store.hasValue(), true);
    assert.equal(store.load(), 'provider-client-secret');
    assert.ok(!(await readFile(file, 'utf8')).includes('provider-client-secret'));
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
