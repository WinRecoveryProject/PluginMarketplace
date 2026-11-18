import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { createHash, randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ownRoot = fileURLToPath(new URL('../', import.meta.url));
const specs = ['typescript', '@types/node/package.json', 'undici-types/package.json', 'jsonc-parser', 'luaparse', 'markdownlint/sync', 'saxes', 'js-yaml', 'smol-toml', 'parse5', 'css-tree', 'libpg-query', 'libpg-query/wasm/libpg-query.js', 'libpg-query/wasm/libpg-query.wasm'];
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const canonical = value => JSON.stringify(value, (_, item) => item && !Array.isArray(item) && typeof item === 'object' ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b))) : item);
const inside = (root, candidate) => { const rel = path.relative(root, candidate); return !path.isAbsolute(rel) && rel !== '..' && !rel.startsWith(`..${path.sep}`); };
function localAbsolute(value) {
  if (typeof value !== 'string' || !path.isAbsolute(value) || /^(?:\\\\|\/\/)/.test(value) || value.includes('\0')) throw new Error('Runtime cache requires a local absolute path');
  if (process.platform === 'win32' && value.slice(2).includes(':')) throw new Error('Runtime cache alternate streams are forbidden');
  return path.resolve(value);
}
function physical(target, { missing = false } = {}) {
  target = localAbsolute(target);
  const root = path.parse(target).root;
  let current = root;
  for (const part of path.relative(root, target).split(path.sep).filter(Boolean)) {
    current = path.join(current, part);
    try { if (fs.lstatSync(current).isSymbolicLink()) throw new Error('Runtime paths must not contain symlinks or junctions'); }
    catch (error) { if (missing && error.code === 'ENOENT') return target; throw error; }
  }
  return target;
}
function relativeFile(root, relative) {
  if (typeof relative !== 'string' || !relative || relative.includes('\\') || relative.includes(':') || relative.split('/').some(part => !part || part === '.' || part === '..')) throw new Error('Invalid runtime receipt path');
  const target = path.resolve(root, ...relative.split('/'));
  if (!inside(root, target)) throw new Error('Runtime file escapes its root');
  physical(target);
  if (!fs.statSync(target).isFile()) throw new Error('Runtime entry is not a regular file');
  return target;
}
function json(file, limit = 1024 * 1024) {
  if (fs.statSync(file).size > limit) throw new Error('Runtime metadata exceeds its limit');
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}
function hashFile(file, kind) {
  if (fs.statSync(file).size > (kind === 'shellcheck' ? 40 : 16) * 1024 * 1024) throw new Error('Runtime entry exceeds its limit');
  return digest(fs.readFileSync(file));
}
export function defaultCacheRoot({ env = process.env, platform = process.platform, home = os.homedir() } = {}) {
  if (env.WRP_LINT_RUNTIME_CACHE) return localAbsolute(env.WRP_LINT_RUNTIME_CACHE);
  const base = platform === 'win32' ? (env.LOCALAPPDATA || path.join(home, 'AppData', 'Local')) : platform === 'darwin' ? path.join(home, 'Library', 'Caches') : (env.XDG_CACHE_HOME || path.join(home, '.cache'));
  return localAbsolute(path.join(base, 'WinRecoveryProjectLinter', 'runtimes'));
}
export function runtimeContract(packageDirectory = ownRoot) {
  const pkg = json(path.join(packageDirectory, 'package.json'));
  const lock = json(path.join(packageDirectory, 'package-lock.json'));
  if (lock.lockfileVersion !== 3 || !lock.packages?.[''] || canonical(lock.packages[''].dependencies) !== canonical(pkg.dependencies)) throw new Error('Runtime lock does not match product dependencies');
  const distribution = json(path.join(packageDirectory, 'npm-shrinkwrap.json'));
  if (canonical(lock) !== canonical(distribution)) throw new Error('Distribution and source locks disagree');
  const packages = Object.fromEntries(Object.entries(lock.packages).filter(([name]) => name));
  for (const entry of Object.values(packages)) {
    if (typeof entry.integrity !== 'string' || !/^https:\/\/registry\.npmjs\.org\//.test(entry.resolved || '')) throw new Error('Runtime dependencies must have locked public registry integrity');
  }
  for (const [name, version] of Object.entries(pkg.dependencies)) if (packages[`node_modules/${name}`]?.version !== version) throw new Error('Runtime dependency pin differs from lock');
  const graph = { lockfileVersion: 3, dependencies: pkg.dependencies, packages };
  return { fingerprint: digest(canonical(graph)), graph, pkg, lock, pins: Object.fromEntries(Object.entries(packages).filter(([name]) => !name.slice(13).includes('/node_modules/')).map(([name, entry]) => [name.slice(13), entry.version])) };
}
export function runtimeLocation(kind, { packageDirectory = ownRoot, cacheRoot = defaultCacheRoot(), pythonIdentity } = {}) {
  if (!['node', 'blinter', 'shellcheck'].includes(kind)) throw new Error('Unknown runtime kind');
  const contract = runtimeContract(packageDirectory);
  const identity = kind === 'node' ? contract.fingerprint : kind === 'blinter' ? digest(fs.readFileSync(path.join(packageDirectory, 'config/blinter-requirements.txt'))) : 'shellcheck-0.11.0-8a4e35ab0b331c85d73567b12f2a444df187f483e5079ceffa6bda1faa2e740e';
  if (kind === 'blinter' && (typeof pythonIdentity !== 'string' || !pythonIdentity)) throw new Error('Blinter requires an observed Python runtime identity');
  const key = `${kind}-${digest(canonical({ identity, platform: process.platform, arch: process.arch, nodeMajor: kind === 'node' ? process.versions.node.split('.')[0] : undefined, pythonIdentity: kind === 'blinter' ? pythonIdentity : undefined }))}`;
  const base = localAbsolute(cacheRoot);
  return { base, key, root: path.join(base, key), kind, contract };
}
function packageInfo(root, specifier, pins) {
  const req = createRequire(path.join(root, 'package.json'));
  const entry = req.resolve(specifier);
  const modules = path.join(root, 'node_modules');
  if (!inside(modules, entry)) throw new Error('Runtime resolution escaped the selected node_modules');
  physical(entry);
  const name = specifier.startsWith('@') ? specifier.split('/').slice(0, 2).join('/') : specifier.split('/')[0];
  const metadata = relativeFile(root, `node_modules/${name}/package.json`);
  const pkg = json(metadata);
  if (!pins[name] || pkg.name !== name || pkg.version !== pins[name]) throw new Error(`Runtime ${name} does not match its exact lock pin`);
  return { entry, metadata };
}
function requiredFiles(kind, root, contract) {
  if (kind === 'node') {
    const records = new Set(['package.json', 'package-lock.json', 'npm-shrinkwrap.json']);
    for (const specifier of specs) for (const file of Object.values(packageInfo(root, specifier, contract.pins))) records.add(path.relative(root, file).split(path.sep).join('/'));
    return [...records].sort();
  }
  if (kind === 'shellcheck') return ['shellcheck.exe'];
  const site = process.platform === 'win32' ? 'Lib/site-packages' : fs.readdirSync(path.join(root, 'lib')).filter(name => /^python3\.(?:1[1-5])$/.test(name)).map(name => `lib/${name}/site-packages`)[0];
  if (!site) throw new Error('Cannot locate supported Blinter site-packages');
  return [process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python', 'pyvenv.cfg', `${site}/blinter/__main__.py`, `${site}/blinter-1.1.66.dist-info/METADATA`, `${site}/charset_normalizer-3.5.2.dist-info/METADATA`];
}
function verify(location) {
  physical(location.root);
  const receipt = json(relativeFile(location.root, 'READY.json'), 128 * 1024);
  if (receipt.schemaVersion !== 1 || receipt.kind !== location.kind || receipt.key !== location.key || !receipt.files || Array.isArray(receipt.files) || Object.keys(receipt.files).length > 128) throw new Error('Runtime READY receipt does not match the selected contract');
  if (location.kind === 'node' && runtimeContract(location.root).fingerprint !== location.contract.fingerprint) throw new Error('Cached runtime dependency graph differs');
  const required = requiredFiles(location.kind, location.root, location.contract);
  if (Object.keys(receipt.files).length !== required.length || Object.keys(receipt.files).some(file => !required.includes(file))) throw new Error('Runtime receipt file set differs from the fixed capability set');
  for (const relative of required) {
    const file = relativeFile(location.root, relative);
    if (!/^[a-f0-9]{64}$/.test(receipt.files[relative] || '') || hashFile(file, location.kind) !== receipt.files[relative]) throw new Error(`Runtime integrity mismatch: ${relative}`);
  }
  return { ...location, receipt };
}
export function verifiedRuntime(kind, options) { return verify(runtimeLocation(kind, options)); }
export function resolveLibrary(specifier, { packageDirectory = ownRoot, cacheRoot = defaultCacheRoot() } = {}) {
  if (!specs.includes(specifier)) throw new Error('Library is outside the fixed linter capability set');
  const contract = runtimeContract(packageDirectory);
  try {
    const selected = verifiedRuntime('node', { packageDirectory, cacheRoot });
    return packageInfo(selected.root, specifier, contract.pins).entry;
  } catch (durableError) {
    // An explicitly prepared developer/older local installation remains a
    // compatibility fallback, never a parent/project node_modules lookup.
    try { return packageInfo(packageDirectory, specifier, contract.pins).entry; }
    catch { throw durableError; }
  }
}
const imports = new Map();
export async function importLibrary(specifier) {
  if (!imports.has(specifier)) {
    const pending = import(pathToFileURL(resolveLibrary(specifier)).href);
    imports.set(specifier, pending);
    pending.catch(() => imports.delete(specifier));
  }
  return imports.get(specifier);
}
export function localTool(relative, packageDirectory = ownRoot) {
  return relativeFile(packageDirectory, relative);
}

// Called only by explicit setup. A caller-supplied builder is product code,
// never a command string or a path from the inspected project's config.
export async function prepareRuntime(kind, builder, options = {}) {
  const location = runtimeLocation(kind, options);
  try { return { ...verify(location), reused: true }; } catch { /* Explicit setup may repair an incomplete/corrupt product cache. */ }
  physical(location.base, { missing: true });
  await fsp.mkdir(location.base, { recursive: true });
  physical(location.base);
  const lock = path.join(location.base, `${location.key}.setup-lock`);
  await fsp.mkdir(lock); // Fail clearly on another concurrent setup, never kill it.
  const stage = path.join(location.base, `.staging-${kind}-${randomUUID()}`);
  try {
    await fsp.mkdir(stage);
    await builder(stage, location.contract);
    physical(stage);
    const records = {};
    for (const relative of requiredFiles(kind, stage, location.contract)) records[relative] = hashFile(relativeFile(stage, relative), kind);
    const receipt = { schemaVersion: 1, kind, key: location.key, preparedAt: new Date().toISOString(), integrityScope: 'Exact lock graph/pins and selected entry/package metadata hashes; not every transitive source file and not an authenticity attestation.', files: records };
    await fsp.writeFile(path.join(stage, 'READY.json'), JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx' });
    verify({ ...location, root: stage });
    try {
      physical(location.root);
      await fsp.rename(location.root, path.join(location.base, `.rejected-${location.key}-${randomUUID()}`));
    } catch (error) { if (error.code !== 'ENOENT') throw error; }
    await fsp.rename(stage, location.root);
    return { ...verify(location), reused: false };
  } finally {
    if (inside(location.base, stage) && path.basename(stage).startsWith('.staging-')) { physical(stage, { missing: true }); await fsp.rm(stage, { recursive: true, force: true }); }
    physical(lock); await fsp.rmdir(lock);
  }
}
