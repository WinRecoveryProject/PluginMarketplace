import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { packageRoot } from '../src/engine.mjs';
import { findExecutable, run } from '../src/process.mjs';

const python = findExecutable('python');
const builder = path.join(packageRoot, 'scripts/package-native.py');
const roots = [];
test.after(async () => { for (const root of roots) await fs.rm(root, { recursive: true, force: true }); });

async function fixture() {
  assert.ok(python, 'Packaging requires existing Python >=3.11');
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'wrp native ZIP æøå '));
  roots.push(root);
  const profile = JSON.parse(await fs.readFile(path.join(packageRoot, 'config/native-package.json'), 'utf8'));
  for (const file of profile.entries) { await fs.mkdir(path.dirname(path.join(root, file)), { recursive: true }); await fs.copyFile(path.join(packageRoot, file), path.join(root, file)); }
  return { root, profile };
}
const build = root => run(python, ['-I', builder, '--root', root], { cwd: packageRoot });

test('Actual native ZIP deterministically includes both locks and only whitelisted files', async () => {
  const { root, profile } = await fixture();
  for (const name of ['node_modules/private.js', '.tools/private.py', 'outputs/private.txt', '.env']) { await fs.mkdir(path.dirname(path.join(root, name)), { recursive: true }); await fs.writeFile(path.join(root, name), 'UNLISTED PRIVATE DATA MUST NOT SHIP'); }
  const first = await build(root); assert.equal(first.code, 0, first.stderr);
  const a = JSON.parse(first.stdout);
  const archive = path.join(root, a.archive);
  const firstBytes = await fs.readFile(archive);
  const second = await build(root); assert.equal(second.code, 0, second.stderr);
  const b = JSON.parse(second.stdout);
  assert.equal(a.sha256, b.sha256);
  assert.deepEqual(await fs.readFile(archive), firstBytes);
  const inspected = await run(python, ['-I', builder, '--inspect', archive]);
  assert.equal(inspected.code, 0, inspected.stderr);
  const actual = JSON.parse(inspected.stdout);
  assert.equal(actual.includedFileCount, profile.entries.length);
  assert.deepEqual(actual.files.map(item => item.path).sort(), [...profile.entries].sort());
  for (const name of ['package-lock.json', 'npm-shrinkwrap.json', '.codex-plugin/plugin.json', 'bin/wrp-lint.mjs']) assert.ok(actual.files.some(item => item.path === name));
  const destination = path.join(root, 'extracted ZIP');
  const extracted = await run(python, ['-I', builder, '--extract', archive, '--destination', destination]);
  assert.equal(extracted.code, 0, extracted.stderr);
  assert.deepEqual(await fs.readFile(path.join(destination, 'package-lock.json')), await fs.readFile(path.join(destination, 'npm-shrinkwrap.json')));
  const doctor = await run(process.execPath, [path.join(destination, 'bin/wrp-lint.mjs'), 'doctor', destination, '--types', 'lua,html,css', '--format', 'json']);
  assert.equal(doctor.code, 2);
  for (const item of JSON.parse(doctor.stdout).results) assert.equal(item.available, false);
});

test('Native packaging fails closed for missing locks, lock drift and private source paths', async () => {
  const { root } = await fixture();
  const lock = path.join(root, 'package-lock.json');
  const original = await fs.readFile(lock);
  await fs.unlink(lock);
  assert.equal((await build(root)).code, 2);
  await fs.writeFile(lock, '{}\n');
  const drift = await build(root); assert.equal(drift.code, 2); assert.match(drift.stderr, /lockfiles differ/);
  await fs.writeFile(lock, original);
  await fs.appendFile(path.join(root, 'README.md'), '\n' + ['C:', 'Users', 'private-user', 'secret'].join('/') + '\n');
  const leak = await build(root); assert.equal(leak.code, 2); assert.match(leak.stderr, /Private user path/);
});

test('Native packaging rejects whitelist traversal and dependency entries', async () => {
  const { root, profile } = await fixture();
  for (const name of ['../secret.txt', 'node_modules/private.js']) {
    await fs.writeFile(path.join(root, 'config/native-package.json'), JSON.stringify({ ...profile, entries: [...profile.entries, name] }));
    const result = await build(root); assert.equal(result.code, 2); assert.match(result.stderr, /rejected/);
  }
});

test('Native packaging rejects a whitelisted directory replaced by a symlink/junction', async t => {
  const { root } = await fixture();
  const outside = await fs.mkdtemp(path.join(os.tmpdir(), 'wrp package outside ')); roots.push(outside);
  await fs.rename(path.join(root, 'scripts'), path.join(root, 'scripts-original'));
  try { await fs.symlink(outside, path.join(root, 'scripts'), process.platform === 'win32' ? 'junction' : 'dir'); }
  catch (error) { t.skip(`OS cannot create symlinks: ${error.code}`); return; }
  const result = await build(root); assert.equal(result.code, 2); assert.match(result.stderr, /Symlink\/reparse/);
});

test('Native ZIP inspector/extractor reject traversal members before writing payload files', async () => {
  const { root } = await fixture();
  const archive = path.join(root, 'malicious.zip');
  const create = await run(python, ['-I', '-c', 'import sys,zipfile; z=zipfile.ZipFile(sys.argv[1],"w"); z.writestr("../escaped.txt","must not escape"); z.close()', archive]);
  assert.equal(create.code, 0, create.stderr);
  const destination = path.join(root, 'must not exist');
  const result = await run(python, ['-I', builder, '--extract', archive, '--destination', destination]);
  assert.equal(result.code, 2); assert.match(result.stderr, /traversal/);
  await assert.rejects(fs.access(destination));
  await assert.rejects(fs.access(path.join(root, 'escaped.txt')));
});
