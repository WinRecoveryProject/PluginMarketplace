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
    installedComparison: 'UNKNOWN', availableComparison: 'NEWER',
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
  assert.equal(row.installedComparison, 'EXACT');
  assert.equal(row.availableComparison, 'NEWER');
});

const personalNative = 'dev-personal@created-by-me-remote';
const businessNative = 'dev-business@workspace-directory';

function nativeFixture(account) {
  const input = fixture();
  input.scope.account = account;
  input.scope.workspaceFingerprint = 'a'.repeat(64);
  input.counterparts = [personalNative, businessNative].map(catalogId => ({ publishedId: owned, catalogId }));
  input.catalogs = [];
  input.inventory.current[1].data.marketplaces = [
    { name: 'created-by-me-remote', plugins: [{ id: personalNative, installed: true, localVersion: '4.9.0', version: '5.0.1' }] },
    { name: 'workspace-directory', plugins: [{ id: businessNative, installed: true, localVersion: '5.0.1', version: '5.1.0' }] },
  ];
  return input;
}

test('native counterparts keep both versions and use only the active account catalog', () => {
  for (const [account, active, opposite, local, available, installed, publication] of [
    ['personal', personalNative, businessNative, '4.9.0', '5.0.1', 'OLDER', 'EXACT'],
    ['business', businessNative, personalNative, '5.0.1', '5.1.0', 'EXACT', 'NEWER'],
  ]) {
    const input = nativeFixture(account);
    input.inventory.current[0].data.installed.push({ pluginId: opposite, version: '99.0.0', enabled: true });
    const report = auditInventoryVersions(input);
    assert.equal(report.exitCode, 0);
    assert.equal(report.sameIdentityDrift, 0);
    assert.deepEqual(report.outsidePublication.map(row => row.id), [active]);
    const selected = report.counterparts.find(row => row.catalogId === active);
    assert.equal(selected.installedVersion, local);
    assert.equal(selected.availableVersion, available);
    assert.equal(selected.installedComparison, installed);
    assert.equal(selected.availableComparison, publication);
    assert.deepEqual(report.counterparts.find(row => row.catalogId === opposite), {
      publishedId: owned, catalogId: opposite, comparison: 'UNKNOWN', evidence: 'OUT_OF_SCOPE',
    });
  }
});

test('failed CLI capture retains attested evidence and leaves historical absences unverified', () => {
  for (const reason of ['TIMEOUT', 'FAILED', undefined]) {
    const input = nativeFixture('business');
    input.inventory.current.shift();
    input.inventory.cliFailure = reason;
    const vendor = fixture();
    input.counterparts.push(...vendor.counterparts);
    input.catalogs = vendor.catalogs;
    input.inventory.historical = [{
      label: 'same scope prior CLI', kind: 'historical', data: { installed: [
        { pluginId: owned, version: '5.0.0' },
        { pluginId: businessNative, version: '5.0.1' },
        { pluginId: personalNative, version: '99.0.0' },
      ] },
    }];
    const report = auditInventoryVersions(input);
    assert.equal(report.status, 'INCOMPLETE');
    assert.equal(report.exitCode, 2);
    assert.deepEqual(report.gaps.find(row => row.code === 'CLI_EVIDENCE_MISSING'),
      { code: 'CLI_EVIDENCE_MISSING', reason: reason ?? 'NOT_CAPTURED' });
    assert.equal(report.plugins[0].installation, 'UNKNOWN');
    assert.equal(report.plugins[0].installedVersion, null);
    assert.equal(report.plugins[0].published.version, '5.0.1');
    assert.equal(report.plugins[0].published.source.revision, revision);
    assert.equal(report.counterparts.find(row => row.catalogId === peer).availableVersion, '6.1.0');
    const business = report.counterparts.find(row => row.catalogId === businessNative);
    assert.equal(business.installedVersion, '5.0.1');
    assert.equal(business.availableVersion, '5.1.0');
    assert.deepEqual(report.outsidePublication.map(row => row.id), [businessNative]);
    assert.deepEqual(report.counterparts.find(row => row.catalogId === personalNative),
      { publishedId: owned, catalogId: personalNative, comparison: 'UNKNOWN', evidence: 'OUT_OF_SCOPE' });
    const [history] = report.history.snapshots;
    assert.deepEqual(history.newlyObserved, []);
    assert.deepEqual(Object.fromEntries(history.deltas.map(row => [row.id, row.status])),
      { [owned]: 'HISTORICAL_ID_UNVERIFIED', [businessNative]: 'PRESENT' });
  }
});

test('a CLI snapshot with load errors cannot prove an absent historical identity', () => {
  const input = fixture();
  input.inventory.current[0].data = { installed: [], marketplaceLoadErrors: ['incomplete'] };
  input.inventory.historical = [{
    label: 'prior', kind: 'historical', data: { installed: [{ pluginId: owned, version: '5.0.0' }] },
  }];
  const report = auditInventoryVersions(input);
  assert.equal(report.exitCode, 2);
  assert.equal(report.plugins[0].installation, 'UNKNOWN');
  assert.equal(report.history.snapshots[0].deltas[0].status, 'HISTORICAL_ID_UNVERIFIED');
  assert.deepEqual(report.gaps.find(row => row.code === 'CLI_EVIDENCE_MISSING'),
    { code: 'CLI_EVIDENCE_MISSING', reason: 'FAILED' });
});

test('an inventory cannot report a failed CLI capture alongside successful CLI evidence', () => {
  const input = fixture();
  input.inventory.cliFailure = 'TIMEOUT';
  assert.throws(() => auditInventoryVersions(input), /CLI failure without a successful CLI snapshot/);
});

test('uninstalled native releases do not imply a local installation', () => {
  const input = nativeFixture('personal');
  input.inventory.current[1].data.marketplaces[0].plugins[0].installed = false;
  const report = auditInventoryVersions(input);
  assert.equal(report.exitCode, 0);
  assert.equal(report.outsidePublication.length, 0);
  const selected = report.counterparts.find(row => row.catalogId === personalNative);
  assert.equal(selected.installedVersion, null);
  assert.equal(selected.installedComparison, 'UNKNOWN');
  assert.equal(selected.availableVersion, '5.0.1');
});

test('unavailable native scope cannot be filled from a vendor or opposite catalog', () => {
  const input = nativeFixture('business');
  input.inventory.current[1].data.marketplaces.pop();
  input.inventory.current[1].data.marketplaces[0].plugins.push({
    id: businessNative, installed: true, localVersion: '99.0.0', version: '99.0.0',
  });
  input.catalogs.push({
    namespace: 'workspace-directory', exitCode: 0,
    data: { installed: [{ pluginId: businessNative, version: '99.0.0' }], available: [] },
  });
  const report = auditInventoryVersions(input);
  assert.equal(report.exitCode, 2);
  assert.equal(report.outsidePublication.length, 0);
  assert.ok(report.gaps.some(gap => gap.code === 'NATIVE_SCOPE_MISSING'));
  assert.ok(report.gaps.some(gap => gap.code === 'COUNTERPART_MISSING' && gap.id === businessNative));
  assert.equal(report.counterparts.find(row => row.catalogId === businessNative).comparison, 'UNKNOWN');
});

test('native counterpart comparison requires an attested workspace', () => {
  const input = nativeFixture('personal');
  delete input.scope.workspaceFingerprint;
  const report = auditInventoryVersions(input);
  assert.equal(report.exitCode, 2);
  assert.equal(report.outsidePublication.length, 0);
  assert.ok(report.gaps.some(gap => gap.code === 'NATIVE_SCOPE_UNATTESTED'));
  assert.equal(report.counterparts.find(row => row.catalogId === personalNative).comparison, 'UNKNOWN');
});

test('native catalogue errors and nonboolean installed state cannot source installation evidence', () => {
  for (const invalidState of [true, false]) {
    const input = nativeFixture('personal');
    const data = input.inventory.current[1].data;
    if (invalidState) data.marketplaces[0].plugins[0].installed = 'true';
    else data.marketplaceLoadErrors = ['Failed to read the native catalogue'];
    const report = auditInventoryVersions(input);
    assert.equal(report.exitCode, 2);
    assert.equal(report.outsidePublication.length, 0);
    assert.equal(report.counterparts.find(row => row.catalogId === personalNative).comparison, 'UNKNOWN');
    assert.ok(report.gaps.some(gap => gap.code === 'NATIVE_SCOPE_MISSING'));
    assert.ok(report.gaps.some(gap => gap.code === (invalidState ? 'NATIVE_INSTALLATION_STATE_INVALID' : 'INVENTORY_INCOMPLETE')));
  }
});

test('CLI history cannot prove native changes across scopes or a missing catalogue', () => {
  const input = nativeFixture('personal');
  const prior = {
    label: 'prior', kind: 'historical', data: { installed: [
      { pluginId: owned, version: '5.0.1' }, { pluginId: businessNative, version: '5.0.1' },
    ] },
  };
  input.inventory.historical = [prior];
  const [present] = auditInventoryVersions(input).history.snapshots;
  assert.deepEqual(present.deltas.map(row => row.id), [owned]);
  assert.deepEqual(present.newlyObserved, []);
  prior.data.installed.push({ pluginId: personalNative, version: '4.9.0' });
  input.inventory.current[1].data.marketplaceLoadErrors = ['Cannot verify the current native catalogue'];
  const [unknown] = auditInventoryVersions(input).history.snapshots;
  assert.deepEqual(unknown.deltas.map(row => [row.id, row.status]), [
    [owned, 'PRESENT'], [personalNative, 'HISTORICAL_ID_UNVERIFIED'],
  ]);
});

test('noncanonical spelling of either native namespace is invalid evidence', () => {
  const input = nativeFixture('personal');
  input.counterparts[1].catalogId = 'dev-business@WORKSPACE-DIRECTORY';
  assert.throws(() => auditInventoryVersions(input), /Native catalog namespaces must use canonical lowercase/);
  input.counterparts[1].catalogId = businessNative;
  input.inventory.current[1].data.marketplaces[1].name = 'WORKSPACE-DIRECTORY';
  assert.throws(() => auditInventoryVersions(input), /Native catalog namespaces must use canonical lowercase/);
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


test('scoped CLI evidence retains a version match without claiming a full inventory', () => {
  const input = fixture();
  const namespace = 'winrecoveryproject-digital';
  const missing = 'unobserved@' + namespace;
  input.inventory.current[0] = { ...input.inventory.current[0], kind: 'scoped-cli', namespace };
  input.inventory.cliFailure = 'TIMEOUT';
  input.inventory.historical = [{ kind: 'historical', label: 'previous', data: {
    installed: [{ pluginId: missing, version: '1.0.0' }, { pluginId: peer, version: '6.0.0' }],
  } }];
  input.published.expected.push(missing);
  input.published.entries.push({ ...input.published.entries[0], id: missing });
  const report = auditInventoryVersions(input);
  assert.equal(report.status, 'INCOMPLETE');
  assert.equal(report.exitCode, 2);
  assert.deepEqual(report.scopedCliNamespaces, [namespace]);
  assert.equal(report.plugins.find(row => row.id === owned).comparison, 'EXACT');
  assert.equal(report.plugins.find(row => row.id === missing).installation, 'UNKNOWN');
  assert.deepEqual(report.history.snapshots[0].deltas.map(row => row.status),
    ['HISTORICAL_ID_UNVERIFIED', 'HISTORICAL_ID_UNVERIFIED']);
});

test('scoped CLI snapshots reject a record from a different namespace', () => {
  const input = fixture();
  input.inventory.current[0] = { ...input.inventory.current[0], kind: 'scoped-cli',
    namespace: 'winrecoveryproject-digital', data: { installed: [{ pluginId: peer, version: '6.1.0' }] } };
  assert.throws(() => auditInventoryVersions(input), /scoped CLI namespace/);
});
