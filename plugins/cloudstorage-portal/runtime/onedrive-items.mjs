import { createHash } from 'node:crypto';
import { BrokerError } from './broker.mjs';

export const textByteLimit = 65536;

function segment(value) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9!._-]{1,256}$/u.test(value) || value === '.' || value === '..') throw new BrokerError('invalid_onedrive_item_id');
  return encodeURIComponent(value);
}

function itemBase(driveId, itemId) {
  return `https://graph.microsoft.com/v1.0/drives/${segment(driveId)}/items/${segment(itemId)}`;
}

function validateItem(item, driveId, itemId) {
  if (!item || item.id !== itemId || item.remoteItem || item.parentReference?.driveId?.toLowerCase() !== driveId.toLowerCase()) throw new BrokerError('onedrive_item_identity_mismatch', 502);
}

function summary(item) {
  return { id: item.id, name: item.name, kind: item.remoteItem ? 'remote' : item.folder ? 'folder' : item.file ? 'file' : 'other', size: item.size, mimeType: item.file?.mimeType };
}

function belongsToDrive(item, driveId) {
  return Boolean(item) && !item.remoteItem && item.parentReference?.driveId?.toLowerCase() === driveId.toLowerCase();
}

function searchExpression(value) {
  if (typeof value !== 'string') throw new BrokerError('invalid_onedrive_search_query');
  const query = value.trim();
  if (!query || query.length > 128 || /[\u0000-\u001f\u007f]/u.test(query)) throw new BrokerError('invalid_onedrive_search_query');
  return encodeURIComponent(query.replaceAll("'", "''")).replaceAll("'", '%27');
}

export async function searchOneDrive(driveId, query, top, request) {
  const limit = top ?? 25;
  if (!Number.isInteger(limit) || limit < 1 || limit > 25) throw new BrokerError('invalid_onedrive_search_limit');
  const url = `https://graph.microsoft.com/v1.0/drives/${segment(driveId)}/root/search(q='${searchExpression(query)}')?$top=${limit}&$select=id,name,size,file,folder,remoteItem,parentReference`;
  const result = await request(url);
  if (!Array.isArray(result.value) || result.value.length > limit) throw new BrokerError('invalid_onedrive_search_response', 502);
  const items = result.value.filter(item => !item.remoteItem && item.parentReference?.driveId?.toLowerCase() === driveId.toLowerCase());
  return { query: query.trim(), items: items.map(summary), filteredResults: result.value.length - items.length, more: Boolean(result['@odata.nextLink']) };
}

export async function listOneDriveFolder(driveId, itemId, request) {
  const base = itemBase(driveId, itemId);
  const item = await request(`${base}?$select=id,name,folder,parentReference,remoteItem`);
  validateItem(item, driveId, itemId);
  if (!item.folder) throw new BrokerError('onedrive_item_not_folder');
  const result = await request(`${base}/children?$top=25&$select=id,name,size,file,folder,remoteItem,parentReference`);
  if (!Array.isArray(result.value) || result.value.length > 25) throw new BrokerError('invalid_onedrive_folder_response', 502);
  const items = result.value.filter(child => belongsToDrive(child, driveId));
  return { folder: summary(item), items: items.map(summary), filteredResults: result.value.length - items.length, more: Boolean(result['@odata.nextLink']) };
}

export async function getOneDriveItem(driveId, itemId, request) {
  const item = await request(`${itemBase(driveId, itemId)}?$select=id,name,size,file,folder,remoteItem,parentReference,eTag,createdDateTime,lastModifiedDateTime`);
  validateItem(item, driveId, itemId);
  return {
    item: summary(item),
    eTag: item.eTag,
    createdDateTime: item.createdDateTime,
    lastModifiedDateTime: item.lastModifiedDateTime,
  };
}

function downloadLocation(value) {
  let url;
  try { url = new URL(value); } catch { throw new BrokerError('invalid_onedrive_download_location', 502); }
  const domains = ['files.1drv.com', 'onedrive.live.com', 'storage.live.com', 'sharepoint.com', 'sharepoint-df.com'];
  const trustedHost = url.hostname === 'my.microsoftpersonalcontent.com' || domains.some(domain => url.hostname === domain || url.hostname.endsWith(`.${domain}`));
  if (url.protocol !== 'https:' || url.username || url.password || url.port || !trustedHost) {
    console.error(`OneDrive download destination rejected: ${url.protocol}//${url.hostname}${url.port ? `:${url.port}` : ''}`);
    throw new BrokerError('untrusted_onedrive_download_location', 502);
  }
  return url.href;
}

async function boundedBytes(response) {
  if (!response.ok || response.status !== 200 || !response.body) throw new BrokerError('onedrive_download_failed', 502);
  const length = response.headers.get('content-length');
  if (length !== null && (!/^\d+$/u.test(length) || Number(length) > textByteLimit)) {
    await response.body.cancel();
    throw new BrokerError('onedrive_text_too_large', 413);
  }
  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > textByteLimit) throw new BrokerError('onedrive_text_too_large', 413);
      chunks.push(value);
    }
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
  return Buffer.concat(chunks, total);
}

export async function readOneDriveText(driveId, itemId, request, fetchImpl, access) {
  const base = itemBase(driveId, itemId);
  const metadataUrl = `${base}?$select=id,name,size,file,folder,parentReference,remoteItem,eTag`;
  const item = await request(metadataUrl);
  validateItem(item, driveId, itemId);
  const mime = item.file?.mimeType?.split(';')[0].toLowerCase();
  if (item.folder || !item.file || !['text/plain', 'text/markdown', 'text/csv', 'application/json'].includes(mime)) throw new BrokerError('onedrive_text_type_unsupported');
  if (!Number.isSafeInteger(item.size) || item.size < 0 || item.size > textByteLimit) throw new BrokerError('onedrive_text_too_large', 413);
  if (typeof item.eTag !== 'string' || !item.eTag) throw new BrokerError('onedrive_version_missing', 502);
  let response;
  try {
    response = await fetchImpl(`${base}/content`, { headers: { Authorization: `Bearer ${access}` }, redirect: 'manual', signal: AbortSignal.timeout(15000) });
    if (response.status === 302) {
      const location = downloadLocation(response.headers.get('location'));
      await response.body?.cancel();
      response = await fetchImpl(location, { redirect: 'error', signal: AbortSignal.timeout(15000) });
    }
  } catch (error) {
    if (error instanceof BrokerError) throw error;
    throw new BrokerError('onedrive_download_unreachable', 502);
  }
  const bytes = await boundedBytes(response);
  if (bytes.length !== item.size) throw new BrokerError('onedrive_content_size_mismatch', 409);
  let text;
  try { text = new TextDecoder('utf-8', { fatal: true }).decode(bytes); } catch { throw new BrokerError('onedrive_text_not_utf8'); }
  if (text.includes('\0')) throw new BrokerError('onedrive_text_contains_binary');
  const current = await request(metadataUrl);
  validateItem(current, driveId, itemId);
  if (current.eTag !== item.eTag || current.size !== item.size) throw new BrokerError('onedrive_file_changed_during_read', 409);
  return { item: summary(item), eTag: item.eTag, encoding: 'utf-8', byteLength: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex'), text };
}
