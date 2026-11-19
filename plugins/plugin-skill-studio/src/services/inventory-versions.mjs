import { reconcileInstalledInventories } from './installed-inventory.mjs';

const nativeNamespaces = { personal: 'created-by-me-remote', business: 'workspace-directory' };
const nativeNames = new Set(Object.values(nativeNamespaces));
const curatedMarketplace = 'openai-curated-remote';
const namespaceOf = value => typeof value === 'string' ? value.split('@')[1] : null;

function isNativeNamespace(value) {
  const canonical = typeof value === 'string' ? value.toLowerCase() : null;
  if (!nativeNames.has(canonical)) return false;
  if (value !== canonical) throw new Error('Native catalog namespaces must use canonical lowercase');
  return true;
}

const identifier = /^[a-z0-9][a-z0-9._-]*@[a-z0-9][a-z0-9._-]*$/i;
const token = /^[a-z0-9][a-z0-9.+_-]{0,127}$/i;
const repository = /^https:\/\/github\.com\/[a-z0-9_.-]+\/[a-z0-9_.-]+$/i;
const manifestPath = /^(?:[a-z0-9_.-]+\/)*(?:\.codex-plugin\/)?plugin\.json$/i;
const semver = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9a-z-]+(?:\.[0-9a-z-]+)*))?(?:\+[0-9a-z-]+(?:\.[0-9a-z-]+)*)?$/i;

function check(value, condition, label) {
  if (!condition) throw new Error('Invalid ' + label);
  return value;
}

function id(value) {
  return check(value, typeof value === 'string' && value.length <= 240 && identifier.test(value), 'exact plugin ID');
}

function release(value) {
  return check(value, typeof value === 'string' && token.test(value), 'version');
}

function list(value, limit, label) {
  return check(value, Array.isArray(value) && value.length <= limit, label);
}

function parseVersion(value) {
  const match = semver.exec(value);
  if (!match) return null;
  const prerelease = match[4]?.split('.') ?? [];
  if (prerelease.some(part => /^0\d+$/.test(part))) return null;
  return { core: match.slice(1, 4).map(BigInt), prerelease };
}

function compareIdentifiers(a, b) {
  const leftNumeric = /^\d+$/.test(a);
  const rightNumeric = /^\d+$/.test(b);
  if (leftNumeric && rightNumeric) return BigInt(a) < BigInt(b) ? -1 : 1;
  if (leftNumeric !== rightNumeric) return leftNumeric ? -1 : 1;
  return a < b ? -1 : 1;
}

function semverOrder(a, b) {
  for (const [index, segment] of a.core.entries()) {
    if (segment !== b.core[index]) return segment < b.core[index] ? -1 : 1;
  }
  if (a.prerelease.length === 0 || b.prerelease.length === 0) {
    return Math.sign(b.prerelease.length - a.prerelease.length);
  }
  for (const [index, segment] of a.prerelease.entries()) {
    if (index === b.prerelease.length) return 1;
    if (segment !== b.prerelease[index]) return compareIdentifiers(segment, b.prerelease[index]);
  }
  return Math.sign(a.prerelease.length - b.prerelease.length);
}

export function compareVersions(observed, reference) {
  release(observed);
  release(reference);
  if (observed === reference) return 'EXACT';
  const left = parseVersion(observed);
  const right = parseVersion(reference);
  if (!left || !right) return 'UNORDERED';
  const order = semverOrder(left, right);
  return order < 0 ? 'OLDER' : order > 0 ? 'NEWER' : 'SAME_PRECEDENCE';
}

function validateSource(source) {
  const { url, revision, path } = source ?? {};
  check(url, typeof url === 'string' && url.length <= 256 && repository.test(url), 'GitHub source URL');
  check(revision, typeof revision === 'string' && /^[0-9a-f]{40}$/i.test(revision), 'Git source revision');
  check(path, typeof path === 'string' && path.length <= 300 && manifestPath.test(path) &&
    !path.split('/').some(segment => segment === '.' || segment === '..'), 'manifest path');
  return { url, revision, path };
}

function publishedRows(input, gaps) {
  const expectedIds = list(input?.expected, 500, 'expected published identities').map(id);
  check(expectedIds, expectedIds.length > 0 && new Set(expectedIds).size === expectedIds.length, 'publication coverage');
  const expected = new Set(expectedIds);
  const published = new Map();
  for (const entry of list(input?.entries, 500, 'Git manifest observations')) {
    const key = id(entry.id);
    check(key, expected.has(key) && !published.has(key), 'unique expected publication identity');
    published.set(key, { id: key, version: release(entry.version), source: validateSource(entry.source) });
  }
  for (const key of expected) {
    if (!published.has(key)) gaps.push({ code: 'MISSING_PUBLICATION', id: key });
  }
  return { expected, published };
}

function filterInstallationSnapshot(snapshot, keep) {
  const data = snapshot.data;
  const key = data?.installed != null ? 'installed' : 'plugins';
  if (!Array.isArray(data?.[key])) return snapshot;
  const rows = data[key].filter(row => keep(namespaceOf(row.pluginId)));
  return { ...snapshot, data: { ...data, [key]: rows } };
}

function scopedInventory(inventory, namespace, attested, gaps) {
  const current = list(inventory?.current, 100, 'current inventory snapshots').map(snapshot => {
    if (snapshot.kind === 'cli') {
      return filterInstallationSnapshot(snapshot, value => !isNativeNamespace(value));
    }
    if (snapshot.kind === 'scoped-cli') {
      check(snapshot.namespace, !isNativeNamespace(snapshot.namespace), 'scoped CLI namespace');
      return snapshot;
    }
    const data = snapshot.data;
    if (snapshot.kind !== 'catalog' || !Array.isArray(data?.marketplaces)) return snapshot;
    const scoped = data.marketplaces.filter(section =>
      (section.targeted !== true || (attested && section.name === curatedMarketplace)) &&
      (!isNativeNamespace(section.name) || section.name === namespace));
    const invalidNativeState = scoped.some(section => section.name === namespace && section.plugins?.some(row =>
      namespaceOf(row?.id) === namespace && typeof row.installed !== 'boolean'));
    const marketplaceLoadErrors = invalidNativeState ? [
      ...(data.marketplaceLoadErrors ?? []), 'Invalid native installation state',
    ] : data.marketplaceLoadErrors;
    if (invalidNativeState) gaps.push({ code: 'NATIVE_INSTALLATION_STATE_INVALID', namespace });
    const nativeRowsVerified = attested && !marketplaceLoadErrors?.length;
    const marketplaces = scoped.map(section => ({
      ...section,
      plugins: section.plugins?.filter(row => {
        const observed = namespaceOf(row.id);
        if (section.targeted === true) return observed === section.name && row.installed === true;
        return !isNativeNamespace(observed) || (nativeRowsVerified && observed === section.name);
      }),
    }));
    return { ...snapshot, data: { ...data, marketplaces, marketplaceLoadErrors } };
  });
  const historical = list(inventory.historical ?? [], 100, 'historical inventory snapshots')
    .map(snapshot => filterInstallationSnapshot(snapshot, value => !isNativeNamespace(value) || value === namespace));
  return { ...inventory, current, historical };
}

function nativeCounterpartRows(sections, namespace, wanted) {
  const data = { installed: [], available: [] };
  for (const section of sections) {
    for (const row of list(section.plugins, 20000, 'native catalog records')) {
      if (!wanted.has(row?.id) || namespaceOf(row.id) !== namespace) continue;
      if (row.installed === true && row.localVersion != null) {
        data.installed.push({ pluginId: row.id, version: row.localVersion });
      }
      if (row.version != null) data.available.push({ pluginId: row.id, version: row.version });
    }
  }
  return { namespace, exitCode: 0, data };
}

function catalogRows(snapshots, wanted, gaps, attested) {
  const records = new Map();
  const seenNamespaces = new Set();
  for (const snapshot of snapshots) {
    const namespace = check(snapshot.namespace, typeof snapshot.namespace === 'string' &&
      /^[a-z0-9][a-z0-9._-]{0,100}$/i.test(snapshot.namespace), 'catalog namespace');
    check(namespace, !seenNamespaces.has(namespace), 'unique catalog namespace');
    seenNamespaces.add(namespace);
    const targeted = snapshot.scope === 'targeted';
    const usable = snapshot.exitCode === 0 && !snapshot.data?.marketplaceLoadErrors?.length &&
      Array.isArray(snapshot.data?.available) && Array.isArray(snapshot.data?.installed);
    if (!usable || targeted) gaps.push({ code: 'CATALOG_UNAVAILABLE', namespace });
    if (!usable || (targeted && (!attested || namespace !== curatedMarketplace))) continue;
    for (const kind of ['installed', 'available']) {
      for (const row of list(snapshot.data[kind], 20000, 'catalog records')) {
        if (!wanted.has(row?.pluginId) || !row.pluginId.endsWith('@' + namespace)) continue;
        const versions = records.get(row.pluginId) ?? { installed: new Set(), available: new Set(), targeted };
        versions[kind].add(release(row.version));
        records.set(row.pluginId, versions);
      }
    }
  }
  return records;
}

function assessCounterpart(pair, catalog, published, gaps) {
  const { publishedId, catalogId } = pair;
  const observed = catalog.get(catalogId);
  const source = published.get(publishedId);
  if (!observed || observed.available.size > 1 || observed.installed.size > 1) {
    gaps.push({ code: observed ? 'COUNTERPART_UNCERTAIN' : 'COUNTERPART_MISSING', id: catalogId, publishedId });
    return { publishedId, catalogId, comparison: 'UNKNOWN' };
  }
  if (!source) gaps.push({ code: 'COUNTERPART_UNCERTAIN', id: catalogId, publishedId });
  const [installedVersion = null] = observed.installed;
  const [availableVersion = null] = observed.available;
  const installedComparison = installedVersion && source ? compareVersions(installedVersion, source.version) : 'UNKNOWN';
  const availableComparison = availableVersion && source ? compareVersions(availableVersion, source.version) : 'UNKNOWN';
  return {
    publishedId, catalogId, installedVersion, availableVersion, installedComparison, availableComparison,
    evidence: availableVersion ? 'AVAILABLE_RELEASE' : 'INSTALLED_RELEASE',
    ...(observed.targeted ? { observationScope: 'TARGETED_VENDOR' } : {}),
    comparison: availableVersion ? availableComparison : installedComparison,
  };
}

export function auditInventoryVersions(input) {
  const { host, account, observedAt, workspaceFingerprint = null } = input?.scope ?? {};
  check(host, typeof host === 'string' && /^[a-z0-9][a-z0-9._-]{0,63}$/i.test(host), 'host label');
  check(account, ['personal', 'business'].includes(account), 'account scope');
  check(observedAt, typeof observedAt === 'string' && /^\d{4}-\d{2}-\d{2}T[\d:.]+Z$/.test(observedAt) &&
    Number.isFinite(Date.parse(observedAt)), 'UTC observation time');
  check(workspaceFingerprint, workspaceFingerprint === null || (typeof workspaceFingerprint === 'string' &&
    /^[a-f0-9]{64}$/.test(workspaceFingerprint)), 'workspace fingerprint');
  const nativeNamespace = nativeNamespaces[account];
  const gaps = [];
  const inventory = scopedInventory(input.inventory, nativeNamespace, workspaceFingerprint !== null, gaps);
  const { cliFailure = null } = inventory;
  check(cliFailure, [null, 'TIMEOUT', 'FAILED'].includes(cliFailure), 'CLI failure reason');
  const cliSnapshots = inventory.current.filter(snapshot => snapshot.kind === 'cli');
  const fullCliObserved = cliSnapshots.some(snapshot => !snapshot.data?.marketplaceLoadErrors?.length);
  check(cliFailure, !cliFailure || !fullCliObserved, 'CLI failure without a successful CLI snapshot');
  if (!fullCliObserved) {
    const reason = cliFailure ?? (cliSnapshots.length ? 'FAILED' : 'NOT_CAPTURED');
    gaps.push({ code: 'CLI_EVIDENCE_MISSING', reason });
  }
  const reconciled = reconcileInstalledInventories(inventory);
  gaps.push(...reconciled.incomplete.map(message => ({ code: 'INVENTORY_INCOMPLETE', message })));
  const nativeSections = inventory.current
    .filter(snapshot => snapshot.kind === 'catalog' && !snapshot.data.marketplaceLoadErrors?.length)
    .flatMap(snapshot => snapshot.data.marketplaces.filter(section =>
      section.name === nativeNamespace && Array.isArray(section.plugins)));
  const nativeObserved = nativeSections.length > 0;
  const nativeAttested = nativeObserved && workspaceFingerprint !== null;
  if (!nativeObserved) {
    gaps.push({ code: 'NATIVE_SCOPE_MISSING', namespace: nativeNamespace });
  }
  const { expected, published } = publishedRows(input.published, gaps);
  const pairs = list(input.counterparts ?? [], 1000, 'explicit counterpart mappings').map(pair => ({
    publishedId: id(pair.publishedId), catalogId: id(pair.catalogId),
  }));
  const keys = new Set();
  for (const pair of pairs) {
    const key = pair.publishedId + '/' + pair.catalogId;
    check(key, expected.has(pair.publishedId) && pair.publishedId !== pair.catalogId && !keys.has(key), 'counterpart mapping');
    keys.add(key);
  }
  const wanted = new Set(pairs.map(row => row.catalogId));
  const catalogs = list(input.catalogs ?? [], 20, 'catalog observations')
    .filter(snapshot => !isNativeNamespace(snapshot.namespace));
  if (nativeAttested) {
    catalogs.push(nativeCounterpartRows(nativeSections, nativeNamespace, wanted));
  } else if (nativeObserved) {
    gaps.push({ code: 'NATIVE_SCOPE_UNATTESTED', namespace: nativeNamespace });
  }
  const catalog = catalogRows(catalogs, wanted, gaps, workspaceFingerprint !== null);
  const installed = new Map(reconciled.plugins.map(row => [row.id, row]));
  const plugins = [...expected].sort().map(key => {
    const source = published.get(key) ?? null;
    const local = installed.get(key);
    let comparison = 'UNKNOWN';
    const installation = !local ? (reconciled.complete && nativeObserved ? 'NOT_INSTALLED' : 'UNKNOWN') :
      local.status === 'CONSISTENT' ? 'INSTALLED' : 'UNCERTAIN';
    const installedVersion = installation === 'INSTALLED' ? release(local.versions[0]) : null;
    if (source && installedVersion) comparison = compareVersions(installedVersion, source.version);
    const enabled = installation === 'INSTALLED' ? observedEnabled(local) : null;
    return { id: key, installedVersion, installation, enabled, published: source, comparison };
  });
  const counterparts = pairs.sort((a, b) => a.publishedId.localeCompare(b.publishedId) || a.catalogId.localeCompare(b.catalogId))
    .map(pair => {
      const namespace = namespaceOf(pair.catalogId);
      if (isNativeNamespace(namespace) && namespace !== nativeNamespace) {
        return { ...pair, comparison: 'UNKNOWN', evidence: 'OUT_OF_SCOPE' };
      }
      return assessCounterpart(pair, catalog, published, gaps);
    });
  const outsidePublication = reconciled.plugins.filter(row => !expected.has(row.id)).map(row => ({
    id: row.id, versions: row.versions.map(release), status: row.status,
    enabled: row.status === 'CONSISTENT' ? observedEnabled(row) : null,
  }));
  const history = {
    ...reconciled.historicalComparison,
    snapshots: reconciled.historicalComparison.snapshots.map(snapshot => {
      const previousIds = new Set(snapshot.deltas.map(row => row.id));
      const deltas = snapshot.deltas.map(row => {
        const coverage = isNativeNamespace(namespaceOf(row.id)) ? nativeAttested : fullCliObserved;
        if (row.status === 'HISTORICAL_ID_ABSENT' || row.status === 'HISTORICAL_ID_UNVERIFIED') {
          return { ...row, status: coverage ? 'HISTORICAL_ID_ABSENT' : 'HISTORICAL_ID_UNVERIFIED' };
        }
        return row;
      });
      const newlyObserved = [...installed.keys()].filter(key => !previousIds.has(key) && !isNativeNamespace(namespaceOf(key)));
      return { ...snapshot, deltas, newlyObserved };
    }),
  };
  const drift = plugins.filter(row => row.comparison !== 'EXACT' && row.comparison !== 'UNKNOWN').length;
  const publicationInstallation = {
    installed: plugins.filter(row => row.installation === 'INSTALLED').length,
    exact: plugins.filter(row => row.comparison === 'EXACT').length,
    absent: plugins.filter(row => row.installation === 'NOT_INSTALLED').length,
    uncertain: plugins.filter(row => ['UNKNOWN', 'UNCERTAIN'].includes(row.installation)).length,
  };
  return {
    schemaVersion: 1, status: gaps.length ? 'INCOMPLETE' : drift ? 'DRIFT' : 'MATCHED',
    exitCode: gaps.length ? 2 : drift ? 1 : 0,
    scope: { host, account, observedAt, workspaceFingerprint }, installedPluginIdentities: reconciled.installedPluginIdentities,
    publicationsExpected: expected.size, sameIdentityDrift: drift, publicationInstallation, plugins, counterparts, gaps,
    installationCoverage: { cli: fullCliObserved, native: nativeAttested },
    scopedCliNamespaces: [...new Set(reconciled.sources.filter(row => row.kind === 'scoped-cli').map(row => row.namespace))],
    history, outsidePublication,
    limitation: 'Cross-catalog rows compare explicitly related products. They do not establish identity, replacement eligibility, account access or permission to install.',
  };
}

function observedEnabled(row) {
  return row.observations.find(observation => observation.enabled !== null)?.enabled ?? null;
}

function peerRecords(report) {
  const records = new Map();
  for (const row of report.plugins) {
    if (row.installation === 'INSTALLED' || row.installation === 'UNCERTAIN') {
      records.set(row.id, { version: row.installedVersion, enabled: row.enabled });
    }
  }
  for (const row of report.outsidePublication) {
    records.set(row.id, {
      version: row.status === 'CONSISTENT' ? row.versions[0] : null,
      enabled: row.enabled,
    });
  }
  return records;
}

function canVerifyAbsence(report, key) {
  return isNativeNamespace(namespaceOf(key)) ? report.installationCoverage.native : report.installationCoverage.cli;
}

export function compareHostInstallations(current, peer) {
  check(peer.scope, peer.scope.host.toLowerCase() !== current.scope.host.toLowerCase(), 'distinct hosts');
  check(peer.scope, current.scope.account === peer.scope.account && current.scope.workspaceFingerprint !== null &&
    current.scope.workspaceFingerprint === peer.scope.workspaceFingerprint, 'matching attested account scope');
  const currentRows = peerRecords(current);
  const peerRows = peerRecords(peer);
  const differences = [];
  const unverified = [];
  for (const key of [...new Set([...currentRows.keys(), ...peerRows.keys()])].sort()) {
    const a = currentRows.get(key) ?? null;
    const b = peerRows.get(key) ?? null;
    if (!a || !b) {
      const other = a ? peer : current;
      if (!canVerifyAbsence(other, key)) unverified.push({ id: key, reason: 'ABSENCE_UNVERIFIED' });
      else differences.push({ id: key, reasons: [a ? 'CURRENT_ONLY' : 'PEER_ONLY'], current: a, peer: b });
      continue;
    }
    const reasons = [];
    if (a.version === null || b.version === null) unverified.push({ id: key, reason: 'VERSION_UNVERIFIED' });
    else if (a.version !== b.version) reasons.push('VERSION_DIFFERS');
    if (a.enabled === null || b.enabled === null) unverified.push({ id: key, reason: 'ACTIVATION_UNVERIFIED' });
    else if (a.enabled !== b.enabled) reasons.push('ACTIVATION_DIFFERS');
    if (reasons.length) differences.push({ id: key, reasons, current: a, peer: b });
  }
  const coverageComplete = [current, peer].every(({ installationCoverage }) =>
    installationCoverage.cli && installationCoverage.native);
  return {
    status: !coverageComplete || unverified.length ? 'INCOMPLETE' : differences.length ? 'DIFFERENCES' : 'ALIGNED',
    currentHost: current.scope.host, peerHost: peer.scope.host,
    currentObservedAt: current.scope.observedAt, peerObservedAt: peer.scope.observedAt,
    currentInstalled: currentRows.size, peerInstalled: peerRows.size, differences, unverified,
  };
}
