
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { resolveOneDriveChild } from '../plugins/onedrive/skills/onedrive/scripts/resolve-onedrive-child.mjs';

const folder = name => new URL('../plugins/' + name + '/', import.meta.url);
const read = (name, file) => readFileSync(new URL(file, folder(name)));
const account = { subject: 'test-subject', driveId: 'test-drive', driveType: 'personal' };
const match = { id: 'fixture', name: 'exact.txt', kind: 'file', parentId: 'known-parent' };
const page = (items, more = false) => ({ account, parentId: match.parentId, more, items });
const lookup = pages => resolveOneDriveChild({ account, parentId: match.parentId, name: match.name, kind: match.kind, pages });

test('OneDrive and CloudStorage Portal use the same exact-child resolver and App', () => {
  const target = 'scripts/resolve-onedrive-child.mjs';
  assert.deepEqual(read('onedrive', 'skills/onedrive/' + target), read('cloudstorage-portal', target));
  const ids = name => Object.values(JSON.parse(read(name, '.app.json')).apps).map(app => app.id);
  const oneDrive = ids('onedrive');
  assert.equal(oneDrive.length, 1);
  assert.ok(ids('cloudstorage-portal').includes(oneDrive[0]));
});

test('direct lookup selects the exact unique item across all pages', () => {
  const initialPage = page([{ ...match, name: 'Exact.txt', id: 'other' }], true);
  assert.deepEqual(lookup([initialPage, page([match])]), {
    status: 'MATCHED', itemId: match.id, parentId: match.parentId, name: match.name, kind: match.kind,
  });
  assert.equal(lookup([page([])]).status, 'NOT_FOUND');
});

test('ambiguous, incomplete and wrong-account pages cannot select an item', () => {
  assert.equal(lookup([page([match, { ...match, id: 'different' }])]).status, 'AMBIGUOUS');
  assert.equal(lookup([page([match], true)]).status, 'INCOMPLETE');
  assert.equal(lookup([{ ...page([match]), account: { ...account, driveId: 'another-drive' } }]).status, 'INCOMPLETE');
});
