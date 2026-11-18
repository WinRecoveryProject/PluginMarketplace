import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { prepareRuntime, verifiedRuntime, resolveLibrary, runtimeContract, runtimeLocation, defaultCacheRoot } from '../src/runtime-cache.mjs';
import { setup } from '../src/setup.mjs';
import { probe, pythonRuntime } from '../src/engine.mjs';

const source = fileURLToPath(new URL('../', import.meta.url));
async function fixture(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'wrp durable runtime æøå '));
  t.after(async () => { assert.ok(path.basename(root).startsWith('wrp durable runtime ')); await fs.rm(root, { recursive: true, force: true }); });
  const packageDirectory = path.join(root, 'first plugin path'), cacheRoot = path.join(root, 'per-user cache');
  await fs.mkdir(path.join(packageDirectory, 'config'), { recursive: true });
  for (const name of ['package.json', 'package-lock.json', 'npm-shrinkwrap.json', 'config/blinter-requirements.txt']) await fs.copyFile(path.join(source, name), path.join(packageDirectory, name));
  const build = async (stage, contract) => {
    for (const name of ['package.json', 'package-lock.json', 'npm-shrinkwrap.json']) await fs.copyFile(path.join(packageDirectory, name), path.join(stage, name));
    for (const name of ['typescript', '@types/node', 'undici-types', 'jsonc-parser', 'luaparse', 'markdownlint', 'saxes', 'js-yaml', 'smol-toml', 'parse5', 'css-tree', 'libpg-query']) {
      const folder = path.join(stage, 'node_modules', name);
      await fs.mkdir(folder, { recursive: true });
      await fs.writeFile(path.join(folder, 'package.json'), JSON.stringify({ name, version: contract.pins[name], main: 'index.cjs', ...(name === 'markdownlint' ? { exports: { './sync': './index.cjs' } } : {}) }));
      await fs.writeFile(path.join(folder, 'index.cjs'), 'throw new Error("Fixture modules must never execute");\n');
      if (name === 'libpg-query') {
        await fs.mkdir(path.join(folder, 'wasm'));
        for (const file of ['libpg-query.js', 'libpg-query.wasm']) await fs.writeFile(path.join(folder, 'wasm', file), 'Fixture asset; must never execute');
      }
    }
  };
  return { root, packageDirectory, cacheRoot, build };
}

test('Fresh runtime lookup is read-only and never falls back to an uninstalled higher cache', async t => {
  const ctx = await fixture(t);
  await assert.rejects(fs.access(ctx.cacheRoot), { code: 'ENOENT' });
  assert.throws(() => resolveLibrary('luaparse', ctx));
  await assert.rejects(fs.access(ctx.cacheRoot), { code: 'ENOENT' });
  await fs.mkdir(path.join(ctx.cacheRoot, 'node-highest-999'), { recursive: true });
  assert.throws(() => resolveLibrary('luaparse', ctx));
  assert.deepEqual(await fs.readdir(ctx.cacheRoot), ['node-highest-999']);
});

test('ShellCheck accepts the official Windows binary size while oversized tool receipts remain bounded', async t => {
  const ctx = await fixture(t);
  const ready = await prepareRuntime('shellcheck', async stage => {
    await fs.writeFile(path.join(stage, 'shellcheck.exe'), Buffer.alloc(34778624));
  }, ctx);
  assert.equal(verifiedRuntime('shellcheck', ctx).key, ready.key);
  await fs.truncate(path.join(ready.root, 'shellcheck.exe'), 40 * 1024 * 1024 + 1);
  assert.throws(() => verifiedRuntime('shellcheck', ctx), /exceeds its limit/);
});

test('The ShellCheck exception does not raise the ordinary Node runtime entry limit', async t => {
  const ctx = await fixture(t);
  await assert.rejects(prepareRuntime('node', async (stage, contract) => {
    await ctx.build(stage, contract);
    await fs.writeFile(path.join(stage, 'node_modules/luaparse/index.cjs'), Buffer.alloc(16 * 1024 * 1024 + 1));
  }, ctx), /exceeds its limit/);
  assert.deepEqual(await fs.readdir(ctx.cacheRoot), []);
});

test('Explicit preparation survives plugin path replacement and product-only version changes', async t => {
  const ctx = await fixture(t);
  let builds = 0;
  const ready = await prepareRuntime('node', async (...args) => { builds++; await ctx.build(...args); }, ctx);
  assert.equal(ready.reused, false);
  const entry = resolveLibrary('luaparse', ctx);
  assert.ok(entry.startsWith(ready.root + path.sep));
  const moved = path.join(ctx.root, 'replacement plugin path');
  await fs.rename(ctx.packageDirectory, moved);
  for (const name of ['package.json', 'package-lock.json', 'npm-shrinkwrap.json']) {
    const file = path.join(moved, name), data = JSON.parse(await fs.readFile(file, 'utf8'));
    data.version = '99.0.0'; if (data.packages) data.packages[''].version = '99.0.0';
    await fs.writeFile(file, JSON.stringify(data));
  }
  const next = { ...ctx, packageDirectory: moved };
  assert.equal(runtimeLocation('node', next).key, ready.key);
  assert.equal(resolveLibrary('luaparse', next), entry);
  assert.equal((await prepareRuntime('node', () => { throw new Error('No second setup required'); }, next)).reused, true);
  assert.equal(builds, 1);
});

test('Changed exact dependency graph does not reuse a previous READY runtime', async t => {
  const ctx = await fixture(t);
  const first = await prepareRuntime('node', ctx.build, ctx);
  for (const name of ['package.json', 'package-lock.json', 'npm-shrinkwrap.json']) {
    const file = path.join(ctx.packageDirectory, name), data = JSON.parse(await fs.readFile(file, 'utf8'));
    if (name === 'package.json') data.dependencies.luaparse = '0.3.2';
    else { data.packages[''].dependencies.luaparse = '0.3.2'; data.packages['node_modules/luaparse'].version = '0.3.2'; }
    await fs.writeFile(file, JSON.stringify(data));
  }
  assert.notEqual(runtimeLocation('node', ctx).key, first.key);
  assert.throws(() => resolveLibrary('luaparse', ctx));
});

test('Tampered selected module and forged receipt are unavailable; only explicit setup repairs them', async t => {
  const ctx = await fixture(t);
  const ready = await prepareRuntime('node', ctx.build, ctx);
  const entry = resolveLibrary('luaparse', ctx);
  await fs.writeFile(entry, 'throw new Error("tampered");\n');
  assert.throws(() => resolveLibrary('luaparse', ctx), /integrity mismatch/);
  const repaired = await prepareRuntime('node', ctx.build, ctx);
  assert.equal(repaired.reused, false);
  assert.equal(resolveLibrary('luaparse', ctx), entry);
  assert.ok((await fs.readdir(ctx.cacheRoot)).some(name => name.startsWith('.rejected-')));
  const file = path.join(ready.root, 'READY.json'), receipt = JSON.parse(await fs.readFile(file, 'utf8'));
  receipt.files['../outside.cjs'] = 'a'.repeat(64); await fs.writeFile(file, JSON.stringify(receipt));
  assert.throws(() => verifiedRuntime('node', ctx), /file set/);
});

test('Failed setup publishes no READY runtime, releases lock, and does not execute a partial module', async t => {
  const ctx = await fixture(t);
  await assert.rejects(prepareRuntime('node', async stage => { await fs.writeFile(path.join(stage, 'partial'), 'partial'); throw new Error('simulated installer failure'); }, ctx), /simulated installer failure/);
  assert.deepEqual(await fs.readdir(ctx.cacheRoot), []);
  assert.throws(() => resolveLibrary('luaparse', ctx));
  await prepareRuntime('node', ctx.build, ctx);
  assert.ok(resolveLibrary('luaparse', ctx));
});

test('Symlink/junction entry escape is rejected before any module is imported', async t => {
  const ctx = await fixture(t);
  const ready = await prepareRuntime('node', ctx.build, ctx);
  const folder = path.join(ready.root, 'node_modules', 'luaparse'), outside = path.join(ctx.root, 'outside package');
  await fs.rename(folder, outside);
  await fs.symlink(outside, folder, process.platform === 'win32' ? 'junction' : 'dir');
  assert.throws(() => resolveLibrary('luaparse', ctx), /symlinks|junctions/);
});

test('Invalid cache paths, missing ABI identity and unknown libraries cannot change capability scope', async t => {
  const ctx = await fixture(t);
  assert.throws(() => runtimeLocation('node', { ...ctx, cacheRoot: '\\\\server\\share\\cache' }), /local absolute/);
  assert.throws(() => runtimeLocation('blinter', ctx), /Python runtime identity/);
  assert.throws(() => resolveLibrary('../project/custom-loader.cjs', ctx), /fixed linter capability/);
  assert.throws(() => defaultCacheRoot({ env: { WRP_LINT_RUNTIME_CACHE: 'relative-path' } }), /local absolute/);
  assert.equal(runtimeContract(ctx.packageDirectory).fingerprint.length, 64);
});

test('Explicit setup uses its own locked staging root and ignores target npm config; a ready runtime needs no second installer', async t => {
  const ctx = await fixture(t);
  const target = path.join(ctx.root, 'target project');
  await fs.mkdir(target);
  await fs.writeFile(path.join(target, 'main.lua'), 'return 1\n');
  await fs.writeFile(path.join(target, '.npmrc'), 'registry=https://must-not-be-contacted.invalid/\nignore-scripts=false\n');
  const calls = [];
  const execute = async (executable, args, options) => {
    calls.push({ executable, args, cwd: options.cwd });
    assert.equal(executable, process.execPath);
    assert.equal(args[1], 'ci');
    for (const flag of ['--ignore-scripts', '--no-audit', '--no-fund', '--registry=https://registry.npmjs.org/']) assert.ok(args.includes(flag));
    assert.ok(args.some(flag => flag === `--userconfig=${path.join(source, 'config/npmrc')}`));
    assert.ok(args.some(flag => flag === `--globalconfig=${path.join(source, 'config/global-npmrc')}`));
    assert.equal(path.dirname(options.cwd), ctx.cacheRoot);
    assert.ok(path.basename(options.cwd).startsWith('.staging-node-'));
    assert.notEqual(options.cwd, target);
    await ctx.build(options.cwd, runtimeContract(source));
    return { code: 0, stdout: '', stderr: '' };
  };
  const first = await setup(target, { types: ['lua'], cacheRoot: ctx.cacheRoot, execute, fetchResource: () => { throw new Error('Unexpected download'); } });
  assert.equal(first.exitCode, 0);
  assert.equal(first.results[0].action, 'prepared durable runtime');
  const second = await setup(target, { types: ['lua'], cacheRoot: ctx.cacheRoot, execute });
  assert.equal(second.results[0].action, 'verified durable runtime reused');
  assert.equal(calls.length, 1);
  assert.deepEqual((await fs.readdir(target)).sort(), ['.npmrc', 'main.lua']);
});

test('Verified durable tools take precedence over a stale legacy candidate without changing PATH', async t => {
  const ctx = await fixture(t);
  let python;
  try { python = await pythonRuntime(ctx.root); } catch (error) { t.skip(error.message); return; }
  const identity = JSON.parse(python.identity);
  const observed = { version: identity[1], prefix: identity[2], implementation: identity[3], cacheTag: identity[4], soabi: identity[5], freeThreaded: identity[6] };
  const ready = await prepareRuntime('blinter', async stage => {
    const site = process.platform === 'win32' ? 'Lib/site-packages' : `lib/python${observed.version[0]}.${observed.version[1]}/site-packages`;
    for (const relative of [process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python', 'pyvenv.cfg', `${site}/blinter/__main__.py`, `${site}/blinter-1.1.66.dist-info/METADATA`, `${site}/charset_normalizer-3.5.2.dist-info/METADATA`]) {
      await fs.mkdir(path.dirname(path.join(stage, relative)), { recursive: true }); await fs.writeFile(path.join(stage, relative), 'fixture; never execute');
    }
  }, { ...ctx, pythonIdentity: python.identity });
  const invocations = [];
  const execute = async (executable, args) => {
    invocations.push(executable);
    if (executable === python.executable && args.includes('-c')) return { code: 0, stdout: JSON.stringify(observed), stderr: '' };
    return { code: 0, stdout: executable.startsWith(ready.root + path.sep) ? '1.1.66' : '0.0.0', stderr: '' };
  };
  const beforePath = process.env.PATH;
  const result = await probe('batch', ctx.root, execute, { cacheRoot: ctx.cacheRoot });
  assert.equal(result.available, true, JSON.stringify(result));
  assert.ok(result.executable.startsWith(ready.root + path.sep));
  assert.equal(invocations.filter(file => !file.startsWith(ready.root + path.sep)).length, 1, 'Only the observed system Python identity is read outside the durable tool');
  assert.equal(process.env.PATH, beforePath);
});
