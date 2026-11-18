import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { setup } from '../src/setup.mjs';
import { prepareRuntime, runtimeLocation } from '../src/runtime-cache.mjs';

async function fixture(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'wrp-setup-isolation-'));
  t.after(async () => { assert.ok(path.basename(root).startsWith('wrp-setup-isolation-')); await fs.rm(root, { recursive: true, force: true }); });
  const project = path.join(root, 'project'), cacheRoot = path.join(root, 'runtime-cache');
  await fs.mkdir(project);
  return { root, project, cacheRoot };
}

test('Installer staging leaves stay short while final exact contract keys remain unchanged', async t => {
  const ctx = await fixture(t);
  for (const kind of ['node', 'blinter', 'shellcheck']) {
    const options = { cacheRoot: ctx.cacheRoot, pythonIdentity: 'fixed-test-python-identity' };
    const location = runtimeLocation(kind, options);
    assert.match(location.key, new RegExp(`^${kind}-[a-f0-9]{64}$`));
    await assert.rejects(prepareRuntime(kind, async stage => {
      assert.equal(path.dirname(stage), ctx.cacheRoot);
      assert.match(path.basename(stage), new RegExp(`^\\.staging-${kind}-[a-f0-9-]{36}$`));
      assert.ok(path.basename(stage).length <= 64, 'Do not append a 64-character runtime key to a venv staging path');
      assert.notEqual(stage, location.root);
      throw new Error('STOP_BEFORE_INSTALL');
    }, options), /STOP_BEFORE_INSTALL/);
    assert.deepEqual(await fs.readdir(ctx.cacheRoot), [], 'Failed staging does not leave a runtime or setup lock');
  }
});

test('A failed Blinter preparation preserves prior rows, probes actual availability and continues later tools', async t => {
  const ctx = await fixture(t);
  const selected = ['powershell', 'batch', 'bash', 'python'], probes = [];
  let ensurepipFailed = false;
  const execute = async (_executable, args) => {
    if (args.includes('-c')) return { code: 0, stdout: JSON.stringify({ version: [3, 13, 17], prefix: 'fixed-test-prefix', implementation: 'cpython', cacheTag: 'cpython-313', soabi: 'cp313-win32', freeThreaded: false }), stderr: '' };
    if (args.includes('venv')) { ensurepipFailed = true; return { code: 1, stdout: '', stderr: '[WinError 206] simulated ensurepip path failure' }; }
    throw new Error('No real process or installer may run in this regression');
  };
  const toolProbe = async type => { probes.push(type); return { available: true, version: 'independent legacy availability evidence' }; };
  const report = await setup(ctx.project, { types: selected, cacheRoot: ctx.cacheRoot, execute, toolProbe,
    fetchResource: async () => ({ ok: false, status: 503 }) });
  assert.deepEqual(report.results.map(item => item.type), selected);
  assert.deepEqual(probes, selected);
  const failed = report.results.find(item => item.type === 'batch');
  assert.equal(failed.available, true, 'Failed durable preparation must not erase successful existing-tool availability evidence');
  assert.equal(failed.setupSucceeded, false);
  assert.equal(failed.action, 'setup failed');
  assert.match(failed.setupError, /206|Python.*required/);
  assert.equal(report.results.at(-1).type, 'python');
  assert.equal(report.results.at(-1).setupSucceeded, true);
  assert.equal(report.exitCode, 2);
  // A Python-less portable host can fail the runtime precondition instead;
  // the same independent post-failure availability probe still must run.
  assert.ok(ensurepipFailed || /Python.*required/.test(failed.setupError));
});

test('Node preparation failure reports each selected family honestly without hiding available legacy tools', async t => {
  const ctx = await fixture(t), selected = ['lua', 'json', 'powershell'], probes = [];
  const execute = async (_executable, args) => {
    assert.equal(args[1], 'ci');
    return { code: 1, stdout: '', stderr: 'simulated pinned npm preparation failure' };
  };
  const toolProbe = async type => { probes.push(type); return { available: true, version: 'independent existing runtime' }; };
  const report = await setup(ctx.project, { types: selected, cacheRoot: ctx.cacheRoot, execute, toolProbe });
  assert.deepEqual(report.results.map(item => item.type), selected);
  assert.deepEqual(probes, selected);
  for (const type of ['lua', 'json']) {
    const result = report.results.find(item => item.type === type);
    assert.equal(result.available, true);
    assert.equal(result.setupSucceeded, false);
    assert.equal(result.action, 'setup failed');
    assert.match(result.setupError, /pinned.*preparation|Pinned dependency setup failed|npm-cli/i);
  }
  assert.equal(report.results.at(-1).setupSucceeded, true);
  assert.equal(report.exitCode, 2);
});
