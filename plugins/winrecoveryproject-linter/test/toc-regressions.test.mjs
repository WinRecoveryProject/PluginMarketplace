import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { scan } from '../src/engine.mjs';

async function scanReferences(t, references) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'wrp-toc-boundaries-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  await fs.writeFile(path.join(root, 'Addon.toc'), [
    '## Interface: 110000', '## Title: Synthetic TOC fixture', ...references
  ].join('\n'));
  return scan(root, { types: ['toc'] });
}

test('TOC known tokens do not hide unsupported tokens in either order', async t => {
  const references = [
    'file_[Game]_[Family].lua',
    'file_[Family]_[Game].lua',
    'Locale_[TextLocale]_[Family].xml',
    'file_[gAmE]_[Family].lua',
    'file_[Family].lua'
  ];
  const report = await scanReferences(t, references);
  assert.equal(report.status, 'FINDINGS');
  for (const [index, reference] of references.entries()) {
    assert.ok(report.findings.some(item => item.rule === 'TOC-token' && item.line === index + 3 && item.message.includes(reference)));
  }
  assert.equal(report.notices.filter(item => item.includes('dynamic TOC path deferred')).length, 0);
  assert.ok(!report.findings.some(item => item.rule === 'TOC-missing-file'));
});

test('TOC known-token paths still reject static absolute and outside-root paths', async t => {
  const references = [
    'C:/outside/Game_[Game].lua',
    'C:\\outside\\Locale_[TextLocale].lua',
    '/outside/Game_[Game].lua',
    '//host/share/Game_[Game].lua',
    '../outside/Locale_[TextLocale].lua',
    '..\\outside\\Game_[Game].lua'
  ];
  const report = await scanReferences(t, references);
  assert.equal(report.status, 'FINDINGS');
  for (const [index] of references.entries()) {
    assert.ok(report.findings.some(item => item.rule === 'TOC-path' && item.line === index + 3));
  }
  assert.equal(report.notices.filter(item => item.includes('dynamic TOC path deferred')).length, 0);
  assert.ok(!report.findings.some(item => item.rule === 'TOC-missing-file'));
});

test('TOC reports both lexical path and unsupported-token failures before deferral', async t => {
  const report = await scanReferences(t, ['../outside/Game_[Game]_[Family].lua']);
  assert.equal(report.status, 'FINDINGS');
  for (const rule of ['TOC-path', 'TOC-token']) {
    assert.ok(report.findings.some(item => item.rule === rule && item.line === 3));
  }
  assert.equal(report.notices.filter(item => item.includes('dynamic TOC path deferred')).length, 0);
});

test('TOC bounded recognized-only tokens remain deferred without inventing target files', async t => {
  const references = [
    'Game_[Game].lua',
    'Locale_[TextLocale].xml',
    'nested/Game_[gAmE]_[TextLocale].lua [AllowLoadGameType mainline]',
    'nested/../Locale_[TextLocale].lua'
  ];
  const report = await scanReferences(t, references);
  assert.equal(report.status, 'CLEAN', JSON.stringify(report));
  assert.equal(report.notices.filter(item => item.includes('dynamic TOC path deferred')).length, references.length);
  assert.equal(report.findings.length, 0);
});
