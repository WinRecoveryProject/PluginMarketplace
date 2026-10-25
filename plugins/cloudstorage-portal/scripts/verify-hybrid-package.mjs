import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const candidateRoot = path.resolve(process.argv[2] ?? path.join(scriptDirectory, '..'));
const installedRoot = process.argv[3] ? path.resolve(process.argv[3]) : null;
const sha256 = async file => createHash('sha256').update(await readFile(file)).digest('hex').toUpperCase();

async function relativeFiles(root, current = root) {
  const files = [];
  for (const entry of await readdir(current, { withFileTypes: true })) {
    if (entry.name === 'node_modules') continue;
    const absolute = path.join(current, entry.name);
    if (entry.isDirectory()) files.push(...await relativeFiles(root, absolute));
    else if (entry.isFile()) files.push(path.relative(root, absolute).replaceAll(path.sep, '/'));
  }
  return files.sort();
}

const provenancePath = path.join(candidateRoot, 'skills', 'cloudstorage-portal', 'references', 'provider-provenance.json');
const provenance = JSON.parse(await readFile(provenancePath, 'utf8'));
const providerMismatches = [];
for (const record of provenance) {
  const actual = await sha256(path.join(candidateRoot, ...record.path.split('/')));
  if (actual !== record.sha256.toUpperCase()) providerMismatches.push({ path: record.path, expected: record.sha256, actual });
}

const manifest = JSON.parse(await readFile(path.join(candidateRoot, '.codex-plugin', 'plugin.json'), 'utf8'));
const portableManifest = JSON.parse(await readFile(path.join(candidateRoot, 'plugin.json'), 'utf8'));
const apps = JSON.parse(await readFile(path.join(candidateRoot, '.app.json'), 'utf8'));
const mcp = JSON.parse(await readFile(path.join(candidateRoot, '.mcp.json'), 'utf8'));
const portableMcp = JSON.parse(await readFile(path.join(candidateRoot, 'mcp.json'), 'utf8'));
const skillRoot = path.join(candidateRoot, 'skills');
const skillNames = [];
for (const entry of await readdir(skillRoot, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  try {
    await readFile(path.join(skillRoot, entry.name, 'SKILL.md'));
    skillNames.push(entry.name);
  } catch {}
}
skillNames.sort();

const candidateFiles = await relativeFiles(candidateRoot);
const installationMismatches = [];
if (installedRoot) {
  const installedFiles = await relativeFiles(installedRoot);
  const installedSet = new Set(installedFiles);
  for (const relative of candidateFiles) {
    if (!installedSet.has(relative)) {
      installationMismatches.push({ path: relative, reason: 'missing_from_installation' });
      continue;
    }
    const candidateHash = await sha256(path.join(candidateRoot, ...relative.split('/')));
    const installedHash = await sha256(path.join(installedRoot, ...relative.split('/')));
    if (candidateHash !== installedHash) installationMismatches.push({ path: relative, reason: 'hash_mismatch', candidateHash, installedHash });
  }
  for (const relative of installedFiles) {
    if (!candidateFiles.includes(relative)) installationMismatches.push({ path: relative, reason: 'unexpected_installed_file' });
  }
}

const expectedWorkflows = [
  'clean-up-dropbox-content', 'collect-files-with-request', 'find-dropbox-content', 'inspect-dropbox-file',
  'organize-dropbox-folder', 'share-dropbox-content', 'google-docs', 'google-drive', 'google-drive-comments',
  'google-sheets', 'google-slides',
];

const result = {
  checkedAt: new Date().toISOString(),
  plugin: {
    name: manifest.name,
    version: manifest.version,
    displayName: manifest.interface?.displayName,
    portableVersion: portableManifest.version,
    identitiesSynchronized: manifest.name === portableManifest.name && manifest.version === portableManifest.version,
  },
  trackedProviderFiles: provenance.length,
  providerHashMismatches: providerMismatches,
  expectedWorkflowCount: expectedWorkflows.length,
  expectedWorkflowsPresent: expectedWorkflows.every(name => skillNames.includes(name)),
  totalSkillCount: skillNames.length,
  skillNames,
  bindings: {
    dropbox: apps.apps?.dropbox?.id ?? null,
    googleDrive: apps.apps?.['google-drive']?.id ?? null,
    preserved: apps.apps?.dropbox?.id === 'asdk_app_69b31dc2110c8191b8b47dc98fe5a052'
      && apps.apps?.['google-drive']?.id === 'connector_5f3c8c41a1e54ad7a76272c89e2554fa',
  },
  hybrid: {
    appsManifest: manifest.apps ?? null,
    mcpManifest: manifest.mcpServers ?? null,
    mcpServerNames: Object.keys(mcp.mcpServers ?? {}),
    oneDriveDeclared: Object.hasOwn(mcp.mcpServers ?? {}, 'onedrive'),
    portableMcpFile: 'mcp.json',
    portableMcpServerNames: Object.keys(portableMcp.mcpServers ?? {}),
    portableOneDriveDeclared: Object.hasOwn(portableMcp.mcpServers ?? {}, 'onedrive'),
    portableEntrypointUsesPluginRoot: portableMcp.mcpServers?.onedrive?.args?.[0] === '${PLUGIN_ROOT}/runtime/mcp.mjs'
      && portableMcp.mcpServers?.onedrive?.cwd === '${PLUGIN_ROOT}',
    portableUsesOnlyCodexSupportedStdioFields: Object.keys(portableMcp.mcpServers?.onedrive ?? {})
      .every(key => ['type', 'command', 'args', 'env', 'cwd'].includes(key))
      && portableMcp.mcpServers?.onedrive?.type === 'stdio',
  },
  installation: {
    checked: Boolean(installedRoot),
    installedRoot,
    candidateFileCountExcludingNodeModules: candidateFiles.length,
    mismatches: installationMismatches,
  },
};

console.log(JSON.stringify(result, null, 2));
if (providerMismatches.length || !result.plugin.identitiesSynchronized || !result.expectedWorkflowsPresent
  || skillNames.length !== 14 || !result.bindings.preserved || !result.hybrid.oneDriveDeclared
  || !result.hybrid.portableOneDriveDeclared || !result.hybrid.portableEntrypointUsesPluginRoot
  || !result.hybrid.portableUsesOnlyCodexSupportedStdioFields
  || installationMismatches.length) process.exitCode = 1;
