import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { auditInventoryVersions, compareVersions } from '../src/services/inventory-versions.mjs';

const owned = 'dropbox@winrecoveryproject-digital';
const peer = 'app-69b31dc2110c8191b8b47dc98fe5a052@openai-curated-remote';
const revision = '985fff07dcefa03e40e8664e24363d10b2bacd44';
const studio = fileURLToPath(new URL('../scripts/studio.mjs', import.meta.url));

function fixture() {
  return {
    scope: { host: 'Acer', account: 'personal', observedAt: '2026-11-18T09:30:00.000Z' },
    inventory: { current: [
      { kind: 'cli', label: 'CLI', data: { installed: [{ pluginId: owned, version: '5.0.1', enabled: true }] } },
      { kind: 'catalog', label: 'Personal', data: { marketplaces: [{ name: 'created-by-me-remote', plugins: [] }], marketplaceLoadErrors: [] } },
    ] },
    published: {
      expected: [owned],
      entries: [{ id: owned, version: '5.0.1', source: {
        url: 'https://github.com/openai/plugins.git', revision, path: 'plugins/dropbox/.codex-plugin/plugin.json',
      } }],
    },
    counterparts: [{ publishedId: owned, catalogId: peer }],
    catalogs: [{ namespace: 'openai-curated-remote', exitCode: 0, data: {
      installed: [], available: [{ pluginId: peer, installed: false, version: '6.1.0' }],
    } }],
  };
}

test('matches the installed release and compares an uninstalled explicit counterpart', () => {
  const input = fixture();
  input.catalogs[0].data.available.push({ pluginId: 'dropbox@other', version: '9.0.0' });
  const report = auditInventoryVersions(input);
  assert.equal(report.status, 'MATCHED');
  assert.equal(report.exitCode, 0);
  assert.equal(report.plugins[0].comparison, 'EXACT');
  assert.equal(report.plugins[0].published.source.revision, revision);
  assert.deepEqual(report.counterparts, [{
    publishedId: owned, catalogId: peer, installedVersion: null, availableVersion: '6.1.0',
    comparison: 'NEWER', evidence: 'AVAILABLE_RELEASE',
  }]);
});

test('a parallel catalog does not fill a missing exact installation', () => {
  const input = fixture();
  input.inventory.current[0].data.installed = [{ pluginId: peer, version: '6.1.0', enabled: true }];
  const report = auditInventoryVersions(input);
  assert.equal(report.plugins[0].installation, 'NOT_INSTALLED');
  assert.equal(report.plugins[0].installedVersion, null);
  assert.equal(report.installedPluginIdentities, 1);
});

test('history reports exact newly observed identities without merging provider aliases', () => {
  const input = fixture();
  input.inventory.historical = [{
    kind: 'historical', label: 'prior', data: { installed: [{ pluginId: peer, version: '6.0.0' }] },
  }];
  const [snapshot] = auditInventoryVersions(input).history.snapshots;
  assert.deepEqual(snapshot.newlyObserved, [owned]);
  assert.equal(snapshot.deltas[0].status, 'HISTORICAL_ID_ABSENT');
});

test('current and available versions remain separate', () => {
  const input = fixture();
  input.catalogs[0].data.installed.push({ pluginId: peer, version: '5.0.1' });
  const [row] = auditInventoryVersions(input).counterparts;
  assert.equal(row.installedVersion, '5.0.1');
  assert.equal(row.availableVersion, '6.1.0');
});

test('SemVer prereleases, build suffixes and nonstandard versions remain distinct', () => {
  assert.equal(compareVersions('0.1.13-77c10e110b37', '0.1.12'), 'NEWER');
  assert.equal(compareVersions('0.9.0-beta.6', '0.9.0-beta.11'), 'OLDER');
  assert.equal(compareVersions('0.9.0-rc.1', '0.9.0'), 'OLDER');
  assert.equal(compareVersions('0.9.0-beta.1', '0.9.0-beta'), 'NEWER');
  assert.equal(compareVersions('0.3.5+zilvereyes.1', '0.3.5'), 'SAME_PRECEDENCE');
  assert.equal(compareVersions('preview', 'preview'), 'EXACT');
  assert.equal(compareVersions('preview', '0.3.5'), 'UNORDERED');
});

test('missing publication, failed catalog and conflicting exact installation are incomplete', () => {
  const input = fixture();
  input.published.entries = [];
  input.catalogs[0].exitCode = 1;
  input.inventory.current[1].data.marketplaces[0].plugins.push({
    id: owned, installed: true, localVersion: '6.0.0', enabled: true,
  });
  const report = auditInventoryVersions(input);
  assert.equal(report.exitCode, 2);
  assert.equal(report.plugins[0].installation, 'UNCERTAIN');
  assert.equal(report.counterparts[0].comparison, 'UNKNOWN');
  assert.ok(report.gaps.some(gap => gap.code === 'MISSING_PUBLICATION'));
  assert.ok(report.gaps.some(gap => gap.code === 'CATALOG_UNAVAILABLE'));
});

test('empty or wrong-scope native catalogs never confirm absent installations', () => {
  const input = fixture();
  input.inventory.current[0].data.installed = [];
  input.scope.account = 'business';
  input.inventory.current[1].data.marketplaces = [];
  const { exitCode, gaps, plugins } = auditInventoryVersions(input);
  assert.equal(exitCode, 2);
  assert.equal(plugins[0].installation, 'UNKNOWN');
  assert.ok(gaps.some(gap => gap.code === 'NATIVE_SCOPE_MISSING'));
  input.inventory.current[1].data.marketplaces = [{ name: 'created-by-me-remote', plugins: [] }];
  assert.equal(auditInventoryVersions(input).exitCode, 2);
  input.inventory.current[1].data.marketplaces = [{ name: 'workspace-directory', plugins: [] }];
  assert.equal(auditInventoryVersions(input).exitCode, 0);
});

test('reported source data excludes private URLs and unrecognized provenance', () => {
  const input = fixture();
  input.published.entries[0].source.query = 'secret=sensitive';
  assert.equal(JSON.stringify(auditInventoryVersions(input)).includes('sensitive'), false);
  input.published.entries[0].source.url += '?token=private';
  assert.throws(() => auditInventoryVersions(input), /GitHub source URL/);
  input.published.entries[0].source.url = 'https://github.com/openai/plugins.git';
  input.published.entries[0].source.path = '../plugin.json';
  assert.throws(() => auditInventoryVersions(input), /manifest path/);
});

test('CLI distinguishes verified same-ID drift from incomplete observations', async () => {
  const folder = await mkdtemp(path.join(tmpdir(), 'studio-inventory-versions-'));
  const file = path.join(folder, 'input.json');
  try {
    const input = fixture();
    input.inventory.current[0].data.installed[0].version = '5.1.0';
    await writeFile(file, JSON.stringify(input));
    let run = spawnSync(process.execPath, [studio, 'inventory-versions', file], { encoding: 'utf8' });
    assert.equal(run.status, 1, run.stderr);
    assert.equal(JSON.parse(run.stdout).status, 'DRIFT');
    input.inventory.current.pop();
    await writeFile(file, JSON.stringify(input));
    run = spawnSync(process.execPath, [studio, 'inventory-versions', file], { encoding: 'utf8' });
    assert.equal(run.status, 2, run.stderr);
    assert.equal(JSON.parse(run.stdout).status, 'INCOMPLETE');
  } finally {
    await rm(folder, { recursive: true, force: true });
  }
});
