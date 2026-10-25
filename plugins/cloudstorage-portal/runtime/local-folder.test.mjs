import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { mkdtemp, mkdir, writeFile, symlink, rm } from 'node:fs/promises';
import { readLocalOneDriveFolder, resolveLocalOneDriveEnvironment } from './local-onedrive.mjs';

test('Windows OneDrive environment discovery preserves explicit configuration and provider priority', () => {
  const discovered = resolveLocalOneDriveEnvironment({
    OneDriveConsumer: 'C:\\Cloud\\Personal',
    OneDriveCommercial: 'C:\\Cloud\\Work',
    OneDrive: 'C:\\Cloud\\Fallback',
  });
  assert.equal(discovered.ONEDRIVE_LOCAL_ROOT, 'C:\\Cloud\\Personal');
  const explicit = resolveLocalOneDriveEnvironment({
    ONEDRIVE_LOCAL_ROOT: 'D:\\Explicit',
    OneDriveConsumer: 'C:\\Cloud\\Personal',
  });
  assert.equal(explicit.ONEDRIVE_LOCAL_ROOT, 'D:\\Explicit');
  assert.equal(resolveLocalOneDriveEnvironment({ ONEDRIVE_LOCAL_ROOT: '', OneDriveConsumer: 'C:\\Cloud\\Personal' }).ONEDRIVE_LOCAL_ROOT, 'C:\\Cloud\\Personal');
  assert.equal(resolveLocalOneDriveEnvironment({ ONEDRIVE_LOCAL_ROOT: 'relative', OneDriveConsumer: 'C:\\Cloud\\Personal' }).ONEDRIVE_LOCAL_ROOT, 'C:\\Cloud\\Personal');
  assert.equal(resolveLocalOneDriveEnvironment({ OneDriveConsumer: 'relative' }).ONEDRIVE_LOCAL_ROOT, undefined);
});

test('local folder browsing bounds results and blocks traversal, aliases and junction escape', async () => {
  const fixture = await mkdtemp(path.join(process.cwd(), '.cloudstorage-folder-test-'));
  const root = path.join(fixture, 'root');
  const outside = path.join(fixture, 'outside');
  const env = { ONEDRIVE_LOCAL_ROOT: root };
  try {
    await mkdir(path.join(root, 'nested', 'child'), { recursive: true });
    await mkdir(outside);
    await writeFile(path.join(root, 'file.txt'), 'fixture');
    await symlink(outside, path.join(root, 'escape'), process.platform === 'win32' ? 'junction' : 'dir');
    for (let index = 0; index < 30; index++) await mkdir(path.join(root, 'nested', `folder-${index}`));
    const result = await readLocalOneDriveFolder('nested', env);
    assert.equal(result.items.length, 25);
    assert.equal(result.more, true);
    assert.equal(result.fileContentRead, false);
    assert.equal(result.cloudIdentityVerified, false);
    assert.equal((await readLocalOneDriveFolder('nested\\child', env)).relativePath, 'nested/child');
    for (const invalid of ['..', '../outside', 'nested/../../outside', 'nested//child', './nested', 'nested.', 'nested ', 'C:\\Windows', 'C:relative', '/etc', '\\\\server\\share', 'file.txt:stream', 'nested\u0000bad', '*']) {
      await assert.rejects(readLocalOneDriveFolder(invalid, env), { code: 'invalid_local_relative_path' });
    }
    await assert.rejects(readLocalOneDriveFolder('escape', env), { code: 'local_link_not_allowed' });
    await assert.rejects(readLocalOneDriveFolder('file.txt', env), { code: 'local_target_not_directory' });
    await assert.rejects(readLocalOneDriveFolder('missing', env), { code: 'local_onedrive_root_unavailable' });
  } finally {
    assert.equal(path.dirname(path.resolve(fixture)), process.cwd());
    assert.ok(path.basename(fixture).startsWith('.cloudstorage-folder-test-'));
    await rm(fixture, { recursive: true, force: true });
  }
});
