import { reconcileInstalledInventories } from './installed-inventory.mjs';

const nativeNamespaces = { personal: 'created-by-me-remote', business: 'workspace-directory' };
const nativeNames = new Set(Object.values(nativeNamespaces));
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
    const data = snapshot.data;
    if (snapshot.kind !== 'catalog' || !Array.isArray(data?.marketplaces)) return snapshot;
    const scoped = data.marketplaces.filter(section => !isNativeNamespace(section.name) || section.name === namespace);
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

function catalogRows(snapshots, wanted, gaps) {
  const records = new Map();
  const seenNamespaces = new Set();
  for (const snapshot of snapshots) {
    const namespace = check(snapshot.namespace, typeof snapshot.namespace === 'string' &&
      /^[a-z0-9][a-z0-9._-]{0,100}$/i.test(snapshot.namespace), 'catalog namespace');
    check(namespace, !seenNamespaces.has(namespace), 'unique catalog namespace');
    seenNamespaces.add(namespace);
    if (snapshot.exitCode !== 0 || snapshot.data?.marketplaceLoadErrors?.length || !Array.isArray(snapshot.data?.available) || !Array.isArray(snapshot.data?.installed)) {
      gaps.push({ code: 'CATALOG_UNAVAILABLE', namespace });
      continue;
    }
    for (const kind of ['installed', 'available']) {
      for (const row of list(snapshot.data[kind], 20000, 'catalog records')) {
        if (!wanted.has(row?.pluginId) || !row.pluginId.endsWith('@' + namespace)) continue;
        const versions = records.get(row.pluginId) ?? { installed: new Set(), available: new Set() };
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
  if (!observed || observed.available.size > 1 || observed.installed.size > 1 || !source) {
    gaps.push({ code: observed ? 'COUNTERPART_UNCERTAIN' : 'COUNTERPART_MISSING', id: catalogId, publishedId });
    return { publishedId, catalogId, comparison: 'UNKNOWN' };
  }
  const [installedVersion = null] = observed.installed;
  const [availableVersion = null] = observed.available;
  const installedComparison = installedVersion ? compareVersions(installedVersion, source.version) : 'UNKNOWN';
  const availableComparison = availableVersion ? compareVersions(availableVersion, source.version) : 'UNKNOWN';
  return {
    publishedId, catalogId, installedVersion, availableVersion, installedComparison, availableComparison,
    evidence: availableVersion ? 'AVAILABLE_RELEASE' : 'INSTALLED_RELEASE',
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
  } else if (nativeObserved && [...wanted].some(key => namespaceOf(key) === nativeNamespace)) {
    gaps.push({ code: 'NATIVE_SCOPE_UNATTESTED', namespace: nativeNamespace });
  }
  const catalog = catalogRows(catalogs, wanted, gaps);
  const installed = new Map(reconciled.plugins.map(row => [row.id, row]));
  const plugins = [...expected].sort().map(key => {
    const source = published.get(key) ?? null;
    const local = installed.get(key);
    let comparison = 'UNKNOWN';
    const installation = !local ? (reconciled.complete && nativeObserved ? 'NOT_INSTALLED' : 'UNKNOWN') :
      local.status === 'CONSISTENT' ? 'INSTALLED' : 'UNCERTAIN';
    const installedVersion = installation === 'INSTALLED' ? release(local.versions[0]) : null;
    if (source && installedVersion) comparison = compareVersions(installedVersion, source.version);
    return { id: key, installedVersion, installation, published: source, comparison };
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
  }));
  const history = {
    ...reconciled.historicalComparison,
    snapshots: reconciled.historicalComparison.snapshots.map(snapshot => {
      const previousIds = new Set(snapshot.deltas.map(row => row.id));
      const deltas = snapshot.deltas.map(row => !nativeAttested && row.status === 'HISTORICAL_ID_ABSENT' &&
        isNativeNamespace(namespaceOf(row.id)) ? { ...row, status: 'HISTORICAL_ID_UNVERIFIED' } : row);
      const newlyObserved = [...installed.keys()].filter(key => !previousIds.has(key) && !isNativeNamespace(namespaceOf(key)));
      return { ...snapshot, deltas, newlyObserved };
    }),
  };
  const drift = plugins.filter(row => row.comparison !== 'EXACT' && row.comparison !== 'UNKNOWN').length;
  return {
    schemaVersion: 1, status: gaps.length ? 'INCOMPLETE' : drift ? 'DRIFT' : 'MATCHED',
    exitCode: gaps.length ? 2 : drift ? 1 : 0,
    scope: { host, account, observedAt, workspaceFingerprint }, installedPluginIdentities: reconciled.installedPluginIdentities,
    publicationsExpected: expected.size, sameIdentityDrift: drift, plugins, counterparts, gaps,
    history, outsidePublication,
    limitation: 'Cross-catalog rows compare explicitly related products. They do not establish identity, replacement eligibility, account access or permission to install.',
  };
}
