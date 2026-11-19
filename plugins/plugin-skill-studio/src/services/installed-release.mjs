import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { promisify } from 'node:util';
import { readBounded, readBoundedBuffer, walkFiles } from './files.mjs';
import { cacheComponent, containedPath, directoryRoot } from './installed-resolver.mjs';

const runGit = promisify(execFile);
const gitEnvironment = Object.fromEntries(Object.entries(process.env).filter(([name]) => !/^GIT_/i.test(name)));
gitEnvironment.GIT_NO_REPLACE_OBJECTS = '1';
gitEnvironment.GIT_NO_LAZY_FETCH = '1';
gitEnvironment.GIT_TERMINAL_PROMPT = '0';
const revisionPattern = /^[0-9a-f]{40}$/;
const identityPattern = /^[a-z0-9][a-z0-9._-]*@[a-z0-9][a-z0-9._-]*$/;
const digestPattern = /^[0-9a-f]{64}$/;
const cacheWalkOptions = { ignoreNames: new Set(), maxFiles: 20000 };
const maxPackageBytes = 512 * 1024 * 1024;
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);

async function git(root, ...args) {
  const { stdout } = await runGit('git', ['-C', root, ...args], {
    encoding: 'utf8', timeout: 15000, maxBuffer: 8 * 1024 * 1024, windowsHide: true, env: gitEnvironment,
  });
  return stdout;
}

function publicationAttested(source, entry, published, marketplaceRevision) {
  if (entry.sourceKind !== 'reviewed-upstream-tree') return published?.revision === marketplaceRevision;
  return source?.source === 'git-subdir' && source.url === entry.repository && source.path === entry.sourceSubdir &&
    (source.sha === undefined || source.sha === entry.commit) && revisionPattern.test(entry.commit ?? '') &&
    published?.url === entry.repository && published?.revision === entry.commit &&
    published?.path === entry.sourceSubdir + '/.codex-plugin/plugin.json';
}

function hasValidWindowsHashes(entry) {
  if (entry.windowsCheckoutSha256 === undefined) return true;
  return entry.sourceKind === 'reviewed-upstream-tree' && object(entry.windowsCheckoutSha256) &&
    Object.entries(entry.windowsCheckoutSha256).every(([name, digest]) => Object.hasOwn(entry.files, name) &&
      typeof digest === 'string' && digestPattern.test(digest) && digest !== entry.files[name]);
}

async function verifyPackage(cacheRoot, name, namespace, version, locked, windowsHashes) {
  let root;
  try {
    root = await containedPath(cacheRoot, [namespace, name, version], 'directory');
  } catch (error) {
    return error.code === 'ENOENT'
      ? { status: 'DIFFERENT', code: 'CACHE_MISSING' }
      : { status: 'INCOMPLETE', code: 'CACHE_PATH_UNSAFE' };
  }
  const { files, errors } = await walkFiles(root, cacheWalkOptions);
  if (errors.length) return { status: 'INCOMPLETE', code: 'CACHE_SCAN_FAILED', errors };
  const actual = new Set(files.map(file => file.relative));
  const missing = Object.keys(locked).filter(file => !actual.has(file));
  const extra = files.filter(file => !Object.hasOwn(locked, file.relative)).map(file => file.relative);
  const different = [];
  let matchedFiles = 0;
  let windowsCheckoutMatches = 0;
  let bytesRead = 0;
  for (const file of files) {
    if (!Object.hasOwn(locked, file.relative)) continue;
    try {
      const path = await containedPath(root, file.relative.split('/'), 'file');
      const limit = Math.min(32 * 1024 * 1024, maxPackageBytes - bytesRead);
      const contents = await readBoundedBuffer(path, limit);
      bytesRead += contents.length;
      const hash = createHash('sha256').update(contents).digest('hex');
      if (hash === locked[file.relative]) {
        matchedFiles++;
      } else if (process.platform === 'win32' && Object.hasOwn(windowsHashes, file.relative) &&
                 hash === windowsHashes[file.relative]) {
        windowsCheckoutMatches++;
        matchedFiles++;
      } else {
        different.push(file.relative);
      }
    } catch (error) {
      return { status: 'INCOMPLETE', code: 'FILE_READ_FAILED', file: file.relative, reason: error.code ?? error.message };
    }
  }
  const status = missing.length || extra.length || different.length ? 'DIFFERENT' : 'MATCHED';
  if (status === 'MATCHED') {
    const after = await walkFiles(root, cacheWalkOptions);
    const attributes = new Map(files.map(({ relative, stat }) => [relative, stat]));
    if (after.errors.length || after.files.length !== files.length || after.files.some(({ relative, stat }) => {
      const before = attributes.get(relative);
      return !before || stat.dev !== before.dev || stat.ino !== before.ino ||
        stat.size !== before.size || stat.mtimeMs !== before.mtimeMs;
    })) return { status: 'INCOMPLETE', code: 'CACHE_CHANGED_DURING_CHECK' };
  }
  return { status, matchedFiles, expectedFiles: Object.keys(locked).length, missing, extra, different,
    ...(Object.keys(windowsHashes).length ? { windowsCheckoutMatches } : {}) };
}

export async function verifyInstalledRelease(audit, request) {
  const { checkout, cacheRoot, revision, ids } = request ?? {};
  if (typeof revision !== 'string' || !revisionPattern.test(revision) || !Array.isArray(ids) || ids.length < 1 || ids.length > 50 ||
      new Set(ids).size !== ids.length || ids.some(id => typeof id !== 'string' || !identityPattern.test(id))) {
    throw new Error('Supply a full lowercase Git SHA and 1–50 distinct exact plug-in IDs.');
  }
  const context = {
    expectedRevision: revision,
    scope: { host: audit.scope.host, account: audit.scope.account, observedAt: audit.scope.observedAt },
  };
  const incomplete = (code) => ({ ...context, status: 'INCOMPLETE', exitCode: 2, code, results: [] });
  if (!audit.scope.workspaceFingerprint || !audit.installationCoverage.cli) return incomplete('CLI_SCOPE_UNATTESTED');
  let root, cache, release, registry, managedReceipt = 'ABSENT';
  try {
    root = await directoryRoot(checkout);
    cache = await directoryRoot(cacheRoot);
    const top = (await git(root, 'rev-parse', '--show-toplevel')).trim();
    if (await directoryRoot(top) !== root) return incomplete('CHECKOUT_ROOT_MISMATCH');
    const head = (await git(root, 'rev-parse', 'HEAD')).trim();
    if (head !== revision) {
      return { ...context, observedRevision: head, status: 'DIFFERENT', exitCode: 1, code: 'REVISION_MISMATCH', results: [] };
    }
    const [releaseBlob, registryBlob] = await Promise.all([
      git(root, 'cat-file', 'blob', `${revision}:plugin-sources.lock.json`),
      git(root, 'cat-file', 'blob', `${revision}:.agents/plugins/marketplace.json`),
    ]);
    release = JSON.parse(releaseBlob);
    registry = JSON.parse(registryBlob);
    if (!object(release.plugins) || !cacheComponent(registry.name) || !Array.isArray(registry.plugins)) {
      return incomplete('RELEASE_LEDGER_INVALID');
    }
  } catch {
    return incomplete('RELEASE_OR_CACHE_UNAVAILABLE');
  }
  try {
    const file = await containedPath(root, ['.codex-marketplace-install.json'], 'file');
    const receipt = JSON.parse(await readBounded(file, 128 * 1024));
    if (!object(receipt) || typeof receipt.revision !== 'string' || !revisionPattern.test(receipt.revision)) {
      return incomplete('MANAGED_RECEIPT_INVALID');
    }
    if (receipt.revision !== revision) {
      return { ...context, observedRevision: revision, receiptRevision: receipt.revision,
        status: 'DIFFERENT', exitCode: 1, code: 'MANAGED_RECEIPT_MISMATCH', results: [] };
    }
    managedReceipt = 'MATCHED';
  } catch (error) {
    if (error.code !== 'ENOENT') return incomplete('MANAGED_RECEIPT_UNAVAILABLE');
  }
  const results = [];
  for (const id of ids) {
    const [name, namespace] = id.split('@');
    const observed = audit.plugins.find(row => row.id === id);
    const entry = release.plugins[name];
    const listing = registry.plugins.find(row => row.name === name);
    if (namespace !== registry.name || !cacheComponent(name) || !listing ||
        !cacheComponent(entry?.version) || !object(entry?.files) || !Object.keys(entry.files).length ||
        Object.values(entry.files).some(digest => typeof digest !== 'string' || !digestPattern.test(digest)) ||
        !hasValidWindowsHashes(entry) || !publicationAttested(listing.source, entry, observed?.published?.source, revision) ||
        observed?.published?.version !== entry.version) {
      results.push({ id, status: 'INCOMPLETE', code: 'RELEASE_NOT_ATTESTED' });
      continue;
    }
    const packageEvidence = { id, version: entry.version, observedVersion: observed.installedVersion, enabled: observed.enabled };
    if (observed.installation === 'UNKNOWN' || observed.installation === 'UNCERTAIN' ||
        observed.installation === 'INSTALLED' && typeof observed.enabled !== 'boolean') {
      results.push({ ...packageEvidence, status: 'INCOMPLETE', code: 'INSTALLATION_UNATTESTED' });
    } else if (observed.installation !== 'INSTALLED' || observed.installedVersion !== entry.version || !observed.enabled) {
      results.push({ ...packageEvidence, status: 'DIFFERENT', code: 'INSTALLATION_DIFFERS' });
    } else {
      results.push({ ...packageEvidence, ...await verifyPackage(cache, name, namespace, entry.version, entry.files, entry.windowsCheckoutSha256 ?? {}) });
    }
  }
  if ((await git(root, 'rev-parse', 'HEAD').catch(() => '')).trim() !== revision) return incomplete('CHECKOUT_CHANGED');
  const exitCode = results.some(row => row.status === 'INCOMPLETE') ? 2 : results.some(row => row.status === 'DIFFERENT') ? 1 : 0;
  return { ...context, observedRevision: revision, managedReceipt,
    status: ['MATCHED', 'DIFFERENT', 'INCOMPLETE'][exitCode], exitCode, results };
}
