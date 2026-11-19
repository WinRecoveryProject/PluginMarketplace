
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { verifyInstalledRelease } from '../src/services/installed-release.mjs';

const id = 'studio@ours';
const binary = Buffer.from([0x41, 0x0d, 0x0a, 0xff]);
const digest = data => createHash('sha256').update(data).digest('hex');

async function fixture(t) {
  const temp = await fs.realpath(os.tmpdir());
  const base = await fs.mkdtemp(path.join(temp, 'studio-release-proof-'));
  t.after(async () => {
    assert.equal(path.dirname(path.resolve(base)), temp);
    await fs.rm(base, { recursive: true, force: true });
  });
  const checkout = path.join(base, 'checkout');
  const cacheRoot = path.join(base, 'cache');
  const packageRoot = path.join(cacheRoot, 'ours', 'studio', '0.3.29');
  const ledger = path.join(checkout, 'plugin-sources.lock.json');
  const receipt = path.join(checkout, '.codex-marketplace-install.json');
  const git = args => execFileSync('git', ['-C', checkout, ...args], { encoding: 'utf8' }).trim();
  const dataFile = path.join(packageRoot, 'card.bin');
  await fs.mkdir(path.join(checkout, '.agents', 'plugins'), { recursive: true });
  await fs.mkdir(packageRoot, { recursive: true });
  await fs.writeFile(dataFile, binary);
  await fs.writeFile(ledger, JSON.stringify({
    plugins: { studio: { version: '0.3.29', files: { 'card.bin': digest(binary) } } },
  }));
  await fs.writeFile(path.join(checkout, '.agents', 'plugins', 'marketplace.json'), JSON.stringify({
    name: 'ours', plugins: [{ name: 'studio' }],
  }));
  git(['init', '-q']);
  git(['add', 'plugin-sources.lock.json', '.agents/plugins/marketplace.json']);
  git(['-c', 'user.name=Release Test', '-c', 'user.email=release@example.test', '-c', 'commit.gpgsign=false',
    '-c', 'core.hooksPath=.git/empty-hooks', 'commit', '-qm', 'fixture']);
  const revision = git(['rev-parse', 'HEAD']);
  await fs.writeFile(receipt, JSON.stringify({ revision }));
  const audit = {
    scope: { host: 'fixture', account: 'personal', workspaceFingerprint: 'f'.repeat(64), observedAt: '2026-11-19T08:00:00Z' },
    installationCoverage: { cli: true },
    plugins: [{
      id, installation: 'INSTALLED', enabled: true, installedVersion: '0.3.29',
      published: { version: '0.3.29', source: { revision } },
    }],
  };
  return { request: { checkout, cacheRoot, revision, ids: [id] }, audit, ledger, receipt, packageRoot, dataFile, base };
}

test('release file verification reads the committed ledger and hashes binary bytes', async t => {
  const { request, audit, ledger } = await fixture(t);
  await fs.writeFile(ledger, '{}');
  const result = await verifyInstalledRelease(audit, request);
  assert.equal(result.status, 'MATCHED');
  assert.equal(result.managedReceipt, 'MATCHED');
  assert.equal(result.results[0].matchedFiles, 1);
  assert.equal(result.scope.observedAt, audit.scope.observedAt);
});

test('a registered version alone cannot conceal modified, extra or missing package files', async t => {
  const { request, audit, dataFile, packageRoot } = await fixture(t);
  await fs.writeFile(dataFile, Buffer.from([0x41, 0x0a, 0xff]));
  await fs.mkdir(path.join(packageRoot, 'node_modules'));
  await fs.writeFile(path.join(packageRoot, 'node_modules', 'unexpected'), 'extra');
  const modified = await verifyInstalledRelease(audit, request);
  assert.equal(modified.status, 'DIFFERENT');
  assert.deepEqual(modified.results[0].different, ['card.bin']);
  assert.deepEqual(modified.results[0].extra, ['node_modules/unexpected']);
  await fs.unlink(dataFile);
  assert.deepEqual((await verifyInstalledRelease(audit, request)).results[0].missing, ['card.bin']);
});

test('revision, receipt, installation and capture scope are checked independently', async t => {
  const { request, audit, receipt } = await fixture(t);
  let result = await verifyInstalledRelease(audit, { ...request, revision: 'b'.repeat(40) });
  assert.equal(result.code, 'REVISION_MISMATCH');
  audit.plugins[0].enabled = false;
  result = await verifyInstalledRelease(audit, request);
  assert.equal(result.results[0].code, 'INSTALLATION_DIFFERS');
  audit.plugins[0].published.source.revision = 'b'.repeat(40);
  result = await verifyInstalledRelease(audit, request);
  assert.equal(result.results[0].code, 'RELEASE_NOT_ATTESTED');
  await fs.writeFile(receipt, JSON.stringify({ revision: 'c'.repeat(40) }));
  result = await verifyInstalledRelease(audit, request);
  assert.equal(result.code, 'MANAGED_RECEIPT_MISMATCH');
  audit.installationCoverage.cli = false;
  result = await verifyInstalledRelease(audit, request);
  assert.equal(result.code, 'CLI_SCOPE_UNATTESTED');
});

test('ancestor repositories and linked cache paths are rejected', async t => {
  const { request, audit, base } = await fixture(t);
  const child = path.join(request.checkout, 'child');
  await fs.mkdir(child);
  assert.equal((await verifyInstalledRelease(audit, { ...request, checkout: child })).code, 'CHECKOUT_ROOT_MISMATCH');
  const alias = path.join(base, 'alias');
  await fs.symlink(request.cacheRoot, alias, process.platform === 'win32' ? 'junction' : 'dir');
  assert.equal((await verifyInstalledRelease(audit, { ...request, cacheRoot: alias })).status, 'INCOMPLETE');
});
