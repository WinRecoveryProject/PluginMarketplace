import assert from 'node:assert/strict';
import test from 'node:test';
import { checkDocumentedVersions } from './check-documented-versions.mjs';

const id = 'plugin-skill-studio@winrecoveryproject-digital';
const report = {
  schemaVersion: 1,
  publicationsExpected: 1,
  plugins: [{ id, published: { id, version: '0.3.18' }, installedVersion: '0.3.16' }],
  counterparts: [{ publishedId: id, availableVersion: '0.3.19' }],
};
const row = (version, identity = id) => `| Studio | \`${version}\` | \`codex plugin add ${identity}\` |`;

test('checks the exact published version independently of installed and counterpart versions', () => {
  assert.deepEqual(checkDocumentedVersions(row('0.3.18') + '\r\n', report), { checked: 1, problems: [] });
  assert.deepEqual(checkDocumentedVersions(row('0.3.17'), report).problems,
    [`${id}: README 0.3.17, published Git 0.3.18.`]);
});

test('reports missing, duplicate, and unlisted entries', () => {
  const wrong = 'wrong@winrecoveryproject-digital';
  const readme = [row('0.3.18', wrong), row('0.3.18', wrong)].join('\n');
  assert.deepEqual(checkDocumentedVersions(readme, report).problems, [
    `${wrong}: README row has no published Git entry.`,
    `${wrong}: duplicate README row.`,
    `${wrong}: README row has no published Git entry.`,
    `${id}: missing README row.`,
  ]);
});

test('rejects an unverified or partial Git publication list', () => {
  assert.throws(() => checkDocumentedVersions(row('0.3.18'), {
    ...report, plugins: [{ id, published: null }],
  }), /published Git version is unverified/);
  assert.throws(() => checkDocumentedVersions(row('0.3.18'), {
    ...report, publicationsExpected: 2,
  }), /full publication list/);
});
