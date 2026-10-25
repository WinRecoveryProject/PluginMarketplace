import path from 'node:path';
import { lstat, opendir, realpath } from 'node:fs/promises';
import { BrokerError } from './broker.mjs';

export function resolveLocalOneDriveEnvironment(env = process.env) {
  if (typeof env.ONEDRIVE_LOCAL_ROOT === 'string' && path.isAbsolute(env.ONEDRIVE_LOCAL_ROOT)) return { ...env };
  const discoveredRoot = [env.OneDriveConsumer, env.OneDriveCommercial, env.OneDrive]
    .find(candidate => typeof candidate === 'string' && path.isAbsolute(candidate));
  return discoveredRoot ? { ...env, ONEDRIVE_LOCAL_ROOT: discoveredRoot } : { ...env };
}

export function localOneDriveStatus(env = process.env) {
  return { configured: Boolean(env.ONEDRIVE_LOCAL_ROOT), root: env.ONEDRIVE_LOCAL_ROOT || null,
    provider: 'onedrive', transport: 'local-sync', cloudIdentityVerified: false, cloudSyncVerified: false,
    capabilities: ['list-root-metadata', 'list-folder-metadata'], fileContentRead: false };
}

export async function readLocalOneDriveRoot(env = process.env) {
  return readLocalOneDriveFolder('', env);
}

export async function readLocalOneDriveFolder(relativePath = '', env = process.env) {
  const status = localOneDriveStatus(env);
  if (!status.configured) throw new BrokerError('local_onedrive_root_missing', 409);
  if (!path.isAbsolute(status.root)) throw new BrokerError('local_onedrive_root_must_be_absolute');
  if (typeof relativePath !== 'string' || relativePath.length > 2048 || /[:\u0000*?]/u.test(relativePath) || path.win32.isAbsolute(relativePath) || path.posix.isAbsolute(relativePath)) {
    throw new BrokerError('invalid_local_relative_path');
  }
  const normalized = relativePath.replaceAll('\\', '/');
  const segments = normalized === '' ? [] : normalized.split('/');
  if (segments.some(segment => !segment || segment === '.' || segment === '..' || /[. ]$/u.test(segment))) throw new BrokerError('invalid_local_relative_path');
  try {
    const info = await lstat(status.root);
    if (info.isSymbolicLink() || !info.isDirectory()) throw new BrokerError('local_onedrive_root_not_directory');
    const canonicalRoot = await realpath(status.root);
    let target = canonicalRoot;
    for (const segment of segments) {
      target = path.join(target, segment);
      const component = await lstat(target);
      if (component.isSymbolicLink()) throw new BrokerError('local_link_not_allowed', 403);
      if (!component.isDirectory()) throw new BrokerError('local_target_not_directory');
    }
    const canonicalTarget = await realpath(target);
    const difference = path.relative(canonicalRoot, canonicalTarget);
    if (difference === '..' || difference.startsWith(`..${path.sep}`) || path.isAbsolute(difference)) throw new BrokerError('local_path_outside_root', 403);
    const items = [];
    let more = false;
    const directory = await opendir(canonicalTarget);
    for await (const entry of directory) {
      if (items.length === 25) {
        more = true;
        break;
      }
      items.push({ name: entry.name, kind: entry.isSymbolicLink() ? 'link-not-followed' : entry.isDirectory() ? 'folder' : entry.isFile() ? 'file' : 'other', contentAvailability: 'not-assessed' });
    }
    return { ...status, relativePath: normalized, items, more, localEnumerationVerifiedAt: Date.now() };
  } catch (error) {
    if (error instanceof BrokerError) throw error;
    throw new BrokerError('local_onedrive_root_unavailable', 409);
  }
}
