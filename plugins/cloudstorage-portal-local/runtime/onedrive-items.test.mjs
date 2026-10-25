import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { Broker } from './broker.mjs';
import { getOneDriveItem, listOneDriveFolder, readOneDriveText, searchOneDrive, textByteLimit } from './onedrive-items.mjs';

const content = 'CloudStorage Portal isolated probe\n';
const metadata = () => ({ id: 'drive!probe', name: 'probe.txt', size: Buffer.byteLength(content), file: { mimeType: 'text/plain' }, parentReference: { driveId: 'drive' }, eTag: 'version1' });

test('OneDrive folder validates exact drive/item identity and never returns capability URLs', async () => {
  const urls = [];
  const result = await listOneDriveFolder('drive', 'folder', async url => {
    urls.push(url);
    return url.includes('/children?') ? { value: [
      { ...metadata(), '@microsoft.graph.downloadUrl': 'private' },
      { id: 'remote', name: 'Remote shortcut', remoteItem: { id: 'elsewhere' }, parentReference: { driveId: 'drive' } },
      { id: 'foreign', name: 'Foreign result', file: {}, parentReference: { driveId: 'other' } },
    ], '@odata.nextLink': 'private-page' }
      : { id: 'folder', folder: {}, parentReference: { driveId: 'drive' } };
  });
  assert.equal(urls.length, 2);
  assert.ok(urls.every(url => url.startsWith('https://graph.microsoft.com/v1.0/drives/drive/items/folder')));
  assert.equal(result.more, true);
  assert.equal(result.filteredResults, 2);
  assert.equal(result.items.length, 1);
  assert.equal(result.items[0].name, 'probe.txt');
  assert.equal(JSON.stringify(result).includes('private'), false);
  await assert.rejects(listOneDriveFolder('drive', '../other', async () => assert.fail()), /invalid_onedrive_item_id/u);
  await assert.rejects(listOneDriveFolder('drive', 'folder', async () => ({ id: 'folder', folder: {}, parentReference: { driveId: 'other' } })), /identity_mismatch/u);
});

test('OneDrive exact item metadata stays bound to the selected drive and strips capability URLs', async () => {
  const item = { ...metadata(), createdDateTime: '2026-10-01T00:00:00Z', lastModifiedDateTime: '2026-10-02T00:00:00Z', '@microsoft.graph.downloadUrl': 'private' };
  const result = await getOneDriveItem('drive', 'drive!probe', async url => {
    assert.ok(url.startsWith('https://graph.microsoft.com/v1.0/drives/drive/items/drive!probe?'));
    return item;
  });
  assert.equal(result.item.id, 'drive!probe');
  assert.equal(result.eTag, 'version1');
  assert.equal(result.lastModifiedDateTime, '2026-10-02T00:00:00Z');
  assert.equal(JSON.stringify(result).includes('private'), false);
  await assert.rejects(getOneDriveItem('drive', 'drive!probe', async () => ({ ...item, remoteItem: {} })), /identity_mismatch/u);
  await assert.rejects(getOneDriveItem('drive', 'drive!probe', async () => ({ ...item, parentReference: { driveId: 'other' } })), /identity_mismatch/u);
});

test('OneDrive search stays inside the selected personal drive and strips capability URLs', async () => {
  const urls = [];
  const result = await searchOneDrive('drive', "Dennis' plan", 2, async url => {
    urls.push(url);
    return { value: [
      { ...metadata(), '@microsoft.graph.downloadUrl': 'private' },
      { id: 'remote', name: 'Remote result', remoteItem: { id: 'elsewhere' }, parentReference: { driveId: 'drive' } },
    ], '@odata.nextLink': 'private-page' };
  });
  assert.equal(urls.length, 1);
  assert.ok(urls[0].startsWith("https://graph.microsoft.com/v1.0/drives/drive/root/search(q='Dennis%27%27%20plan')"));
  assert.equal(result.items.length, 1);
  assert.equal(result.filteredResults, 1);
  assert.equal(result.more, true);
  assert.equal(JSON.stringify(result).includes('private'), false);
  await assert.rejects(searchOneDrive('drive', '', 2, async () => assert.fail()), /invalid_onedrive_search_query/u);
  await assert.rejects(searchOneDrive('drive', 'probe', 26, async () => assert.fail()), /invalid_onedrive_search_limit/u);
  await assert.rejects(searchOneDrive('drive', 'probe', 1, async () => ({ value: [metadata(), metadata()] })), /invalid_onedrive_search_response/u);
});

test('OneDrive text follows one trusted Graph download redirect without forwarding its bearer', async () => {
  const calls = [];
  const result = await readOneDriveText('drive', 'drive!probe', async () => metadata(), async (url, options) => {
    calls.push({ url, options });
    return calls.length === 1 ? new Response(null, { status: 302, headers: { location: 'https://my.microsoftpersonalcontent.com/content?temporary=secret' } }) : new Response(content);
  }, 'private-token');
  assert.equal(calls[0].options.headers.Authorization, 'Bearer private-token');
  assert.equal(calls[0].options.redirect, 'manual');
  assert.equal(calls[1].options.headers, undefined);
  assert.equal(calls[1].options.redirect, 'error');
  assert.equal(result.text, content);
  assert.equal(result.sha256, createHash('sha256').update(content).digest('hex'));
  assert.equal(JSON.stringify(result).includes('secret'), false);
  assert.equal(JSON.stringify(result).includes('private-token'), false);
});

test('OneDrive content rejects unsafe redirect destinations before contacting them', async () => {
  for (const location of ['http://public.files.1drv.com/a', 'https://127.0.0.1/a', 'https://files.1drv.com.evil.test/a', 'https://my.microsoftpersonalcontent.com.evil.test/a', 'https://evil.microsoftpersonalcontent.com/a', 'https://user:password@files.1drv.com/a', 'https://files.1drv.com:444/a', 'https://example.org/a']) {
    let calls = 0;
    await assert.rejects(readOneDriveText('drive', 'drive!probe', async () => metadata(), async () => {
      calls++;
      return new Response(null, { status: 302, headers: { location } });
    }, 'private-token'), /untrusted_onedrive_download_location/u);
    assert.equal(calls, 1);
  }
});

test('OneDrive text rejects oversized metadata and non-text types without download', async () => {
  await assert.rejects(readOneDriveText('drive', 'drive!probe', async () => ({ ...metadata(), size: textByteLimit + 1 }), async () => assert.fail(), 'token'), /too_large/u);
  await assert.rejects(readOneDriveText('drive', 'drive!probe', async () => ({ ...metadata(), file: { mimeType: 'application/pdf' } }), async () => assert.fail(), 'token'), /type_unsupported/u);
  await assert.rejects(readOneDriveText('drive', 'drive!probe', async () => ({ ...metadata(), remoteItem: {} }), async () => assert.fail(), 'token'), /identity_mismatch/u);
});

test('OneDrive stream bound, UTF-8 decoding and version reconciliation fail closed', async () => {
  await assert.rejects(readOneDriveText('drive', 'drive!probe', async () => metadata(), async () => new Response('a'.repeat(textByteLimit + 1)), 'token'), /too_large/u);
  await assert.rejects(readOneDriveText('drive', 'drive!probe', async () => ({ ...metadata(), size: 1 }), async () => new Response(new Uint8Array([255])), 'token'), /not_utf8/u);
  let reads = 0;
  await assert.rejects(readOneDriveText('drive', 'drive!probe', async () => ({ ...metadata(), eTag: ++reads === 1 ? 'old' : 'new' }), async () => new Response(content), 'token'), /changed_during_read/u);
});

test('OneDrive item reads require the exact session and OneDrive connection', async () => {
  let networkCalls = 0;
  const broker = new Broker({ env: {}, fetchImpl: async () => { networkCalls++; assert.fail(); } });
  const owner = broker.createSession();
  const otherOwner = broker.createSession();
  broker.connections.set('test', { owner, provider: 'google' });
  await assert.rejects(broker.oneDriveItem(otherOwner, 'test', 'folder', 'folder'), /connection_not_found/u);
  await assert.rejects(broker.oneDriveItem(owner, 'test', 'folder', 'folder'), /onedrive_connection_required/u);
  assert.equal(networkCalls, 0);
});
