# Plugin files: cloudstorage-portal — `scripts/`

Source: `plugins/cloudstorage-portal`. Files outside the `skills/*` folders, embedded as text.

## File: `scripts/package-boundaries.test.mjs`

```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
test('package validator detects App and MCP routing regressions', async () => {
  const temporary = await mkdtemp(path.join(tmpdir(), 'cloudstorage-boundaries-'));
  try {
    await cp(root, temporary, { recursive: true, filter: source => !['.git', 'node_modules'].includes(path.basename(source)) });
    const run = () => spawnSync(process.execPath, [path.join(temporary, 'scripts/verify-hybrid-package.mjs')], { encoding: 'utf8' });
    const baseline = run();
    assert.equal(baseline.status, 0, baseline.stderr || baseline.stdout);
    assert.ok(!baseline.stdout.includes('.git/'));
    const providerDoc = path.join(temporary, 'skills/google-docs/SKILL.md');
    const providerText = await readFile(providerDoc, 'utf8');
    await writeFile(providerDoc, providerText + '\nUnreviewed change.\n');
    assert.equal(run().status, 1, 'unreviewed provider edits must fail');
    await writeFile(providerDoc, providerText);
    const overridePath = path.join(temporary, 'skills/cloudstorage-portal/references/provider-local-overrides.json');
    const overrideText = await readFile(overridePath, 'utf8');
    const badOverride = JSON.parse(overrideText);
    badOverride[0].originalSha256 = '0'.repeat(64);
    await writeFile(overridePath, JSON.stringify(badOverride));
    assert.equal(run().status, 1, 'upstream provenance cannot be replaced by an override');
    await writeFile(overridePath, overrideText);
    const appPath = path.join(temporary, '.app.json');
    const originalApps = await readFile(appPath, 'utf8');
    const apps = JSON.parse(originalApps);
    apps.apps.onedrive.id = 'asdk_app_obsolete';
    await writeFile(appPath, JSON.stringify(apps));
    assert.equal(run().status, 1, 'obsolete OneDrive identity must fail');
    apps.apps.onedrive.id = JSON.parse(originalApps).apps.onedrive.id;
    apps.apps.duplicate = apps.apps.onedrive;
    await writeFile(appPath, JSON.stringify(apps));
    assert.equal(run().status, 1, 'extra App route must fail');
    await writeFile(appPath, originalApps);
    const mcpPath = path.join(temporary, '.mcp.json');
    await writeFile(mcpPath, JSON.stringify({ mcpServers: { duplicate: { command: 'node' } } }));
    assert.equal(run().status, 1, 'parallel MCP file must fail');
    await rm(mcpPath);
    const manifestPath = path.join(temporary, '.codex-plugin/plugin.json');
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
    manifest.mcpServers = './duplicate.json';
    await writeFile(manifestPath, JSON.stringify(manifest));
    assert.equal(run().status, 1, 'MCP manifest declaration must fail');
    delete manifest.mcpServers;
    manifest.apps = './wrong.json';
    await writeFile(manifestPath, JSON.stringify(manifest));
    assert.equal(run().status, 1, 'disconnected App manifest must fail');
  } finally {
    const resolved = path.resolve(temporary);
    assert.equal(path.dirname(resolved), path.resolve(tmpdir()));
    assert.ok(path.basename(resolved).startsWith('cloudstorage-boundaries-'));
    await rm(resolved, { recursive: true });
  }
});
```

## File: `scripts/resolve-onedrive-child.mjs`

```javascript
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const expectedKinds = new Set(['file', 'folder']);
const accountFields = ['subject', 'driveId', 'driveType'];
const isText = value => typeof value === 'string' && value.length > 0;

export function resolveOneDriveChild({ account, parentId, name, kind, pages } = {}) {
  if (!accountFields.every(field => isText(account?.[field])) || !isText(parentId) ||
      !isText(name) || /[\\/\u0000]/.test(name) || !expectedKinds.has(kind)) {
    return { status: 'INVALID_INPUT', reason: 'Provide the verified account, parent, exact child name, and expected kind.' };
  }

  if (!Array.isArray(pages) || !pages.length) {
    return { status: 'INCOMPLETE', reason: 'The direct parent listing has no completed pages.' };
  }

  const candidates = new Set();
  for (const [index, page] of pages.entries()) {
    if (page?.parentId !== parentId || !accountFields.every(field => page.account?.[field] === account[field]) ||
        !Array.isArray(page.items)) {
      return { status: 'INCOMPLETE', reason: 'A page does not match the verified account and direct parent.' };
    }

    if (page.more !== (index < pages.length - 1)) {
      return { status: 'INCOMPLETE', reason: 'The continued list has no verified terminal page or contains extra pages.' };
    }

    for (const item of page.items) {
      if (item?.parentId !== parentId || !isText(item.id) || !isText(item.name) || !isText(item.kind)) {
        return { status: 'INCOMPLETE', reason: 'A listed item has missing identity or a different parent.' };
      }
      if (item.name === name && item.kind === kind) candidates.add(item.id);
    }
  }

  if (candidates.size === 0) return { status: 'NOT_FOUND' };
  if (candidates.size > 1) return { status: 'AMBIGUOUS', distinctMatches: candidates.size };
  const [itemId] = candidates;
  return { status: 'MATCHED', itemId, parentId, name, kind };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  let report;
  try { report = resolveOneDriveChild(JSON.parse(readFileSync(0, 'utf8'))); }
  catch { report = { status: 'INVALID_INPUT', reason: 'Provide a JSON object on stdin.' }; }
  process.stdout.write(JSON.stringify(report) + '\n');
  process.exitCode = report.status === 'MATCHED' ? 0 : 1;
}
```

## File: `scripts/verify-hybrid-package.mjs`

```javascript
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
    if (entry.name === 'node_modules' || entry.name === '.git') continue;
    const absolute = path.join(current, entry.name);
    if (entry.isDirectory()) files.push(...await relativeFiles(root, absolute));
    else if (entry.isFile()) files.push(path.relative(root, absolute).replaceAll(path.sep, '/'));
  }
  return files.sort();
}

const provenancePath = path.join(candidateRoot, 'skills', 'cloudstorage-portal', 'references', 'provider-provenance.json');
const provenance = JSON.parse(await readFile(provenancePath, 'utf8'));
const providerMismatches = [];
const overridePath = path.join(path.dirname(provenancePath), 'provider-local-overrides.json');
let overrides = [];
try { overrides = JSON.parse(await readFile(overridePath, 'utf8')); }
catch (error) { if (error.code !== 'ENOENT') throw error; }
if (!Array.isArray(overrides)) throw new Error('Provider overrides must be a reviewed array');
const seenOverrides = new Set();
for (const override of overrides) {
  const original = provenance.find(record => record.path === override.path);
  if (!original || seenOverrides.has(override.path)
    || override.originalSha256?.toUpperCase() !== original.sha256.toUpperCase()
    || !/^[0-9a-f]{64}$/i.test(override.currentSha256 ?? '')
    || typeof override.reason !== 'string' || !override.reason.trim()) {
    providerMismatches.push({ path: override.path, reason: 'invalid_reviewed_override' });
  }
  seenOverrides.add(override.path);
}
for (const record of provenance) {
  const actual = await sha256(path.join(candidateRoot, ...record.path.split('/')));
  const override = overrides.find(item => item.path === record.path);
  const expected = override?.currentSha256 ?? record.sha256;
  if (actual !== expected.toUpperCase()) providerMismatches.push({ path: record.path, expected, actual });
}

const manifest = JSON.parse(await readFile(path.join(candidateRoot, '.codex-plugin', 'plugin.json'), 'utf8'));
const portableManifest = JSON.parse(await readFile(path.join(candidateRoot, 'references', 'portable-plugin.json'), 'utf8'));
const apps = JSON.parse(await readFile(path.join(candidateRoot, '.app.json'), 'utf8'));
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
const activeRootPortableManifestAbsent = !candidateFiles.includes('plugin.json');
const activeRootPortableMcpAbsent = !candidateFiles.includes('mcp.json');
const activeLegacyMcpAbsent = !candidateFiles.includes('.mcp.json');
const declaredMcp = manifest.mcpServers != null || portableManifest.extensions?.['com.openai']?.mcpServers != null;
const portalOwnsMcpRuntime = declaredMcp || !activeRootPortableMcpAbsent || !activeLegacyMcpAbsent;
const exactAppSet = Object.keys(apps.apps ?? {}).sort().join(',') === 'dropbox,google-drive,onedrive';
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
  'organize-dropbox-folder', 'share-dropbox-content', 'upload-to-dropbox',
  'google-docs', 'google-drive', 'google-drive-comments',
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
  reviewedProviderOverrides: overrides.length,
  providerHashMismatches: providerMismatches,
  expectedWorkflowCount: expectedWorkflows.length,
  expectedWorkflowsPresent: expectedWorkflows.every(name => skillNames.includes(name)),
  totalSkillCount: skillNames.length,
  skillNames,
  bindings: {
    dropbox: apps.apps?.dropbox?.id ?? null,
    googleDrive: apps.apps?.['google-drive']?.id ?? null,
    oneDrive: apps.apps?.onedrive?.id ?? null,
    preserved: apps.apps?.dropbox?.id === 'asdk_app_69b31dc2110c8191b8b47dc98fe5a052'
      && apps.apps?.['google-drive']?.id === 'connector_5f3c8c41a1e54ad7a76272c89e2554fa'
      && apps.apps?.onedrive?.id === 'asdk_app_6ae8b541a3d08191ae893ea0925a2fe5',
  },
  hybrid: {
    codexAppRoutingFormat: 'app-references-plus-skills',
    activeManifest: '.codex-plugin/plugin.json',
    activeRootPortableManifestAbsent,
    activeRootPortableMcpAbsent,
    activeLegacyMcpAbsent,
    appsManifest: manifest.apps ?? null,
    mcpManifest: manifest.mcpServers ?? null,
    mcpServerNames: [],
    portalOwnsMcpRuntime,
    exactAppSet,
    separateRuntimePackage: null,
    portableManifestReference: 'references/portable-plugin.json',
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
  || skillNames.length !== 16 || !result.bindings.preserved || result.hybrid.portalOwnsMcpRuntime
  || !result.hybrid.activeRootPortableManifestAbsent || !result.hybrid.activeRootPortableMcpAbsent
  || !activeLegacyMcpAbsent || !exactAppSet || manifest.apps !== './.app.json'
  || installationMismatches.length) process.exitCode = 1;
```

## File: `scripts/verify-provider-workflows.mjs`

```javascript
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const pluginRoot = path.resolve(process.argv[2] ?? path.join(scriptDirectory, '..'));
const catalogPath = process.argv[3] ? path.resolve(process.argv[3]) : null;

if (!catalogPath) {
  throw new Error('Usage: node verify-provider-workflows.mjs [plugin-root] <provider-tool-catalog.json>');
}

const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
const providerTools = {
  dropbox: new Set(catalog.dropbox?.tools ?? []),
  google: new Set(catalog.googleDrive?.tools ?? []),
  oneDrive: new Set(catalog.oneDrive?.tools ?? []),
};

const dropboxSkills = [
  'clean-up-dropbox-content',
  'collect-files-with-request',
  'find-dropbox-content',
  'inspect-dropbox-file',
  'organize-dropbox-folder',
  'share-dropbox-content',
  'upload-to-dropbox',
];

const googleRequirements = {
  'google-docs': [
    'batch_update_document',
    'copy_file',
    'create_file',
    'get_document',
    'get_document_text',
    'import_document',
  ],
  'google-drive': [
    'copy_file',
    'delete_file',
    'export_file',
    'fetch',
    'fetch_file_revision',
    'get_file_metadata',
    'get_profile',
    'list_file_revisions',
    'list_folder',
    'recent_documents',
    'search',
    'share_file',
    'update_file',
    'upload_file',
  ],
  'google-drive-comments': [
    'bulk_update_file_comments',
    'get_document_comments',
    'get_file_comments',
    'get_presentation_comments',
    'get_spreadsheet_comments',
  ],
  'google-sheets': [
    'batch_update_spreadsheet',
    'get_spreadsheet_cells',
    'get_spreadsheet_metadata',
    'get_spreadsheet_range',
    'import_spreadsheet',
  ],
  'google-slides': [
    'batch_update_presentation',
    'create_presentation_from_template',
    'get_presentation',
    'get_presentation_outline',
    'get_slide',
    'import_presentation',
  ],
};

const oneDriveRequirements = [
  'onedrive_account',
  'onedrive_get_drive',
  'onedrive_list_root',
  'onedrive_list_folder',
  'onedrive_search',
  'onedrive_get_item',
  'onedrive_read_text',
  'onedrive_download_file',
  'onedrive_create_folder',
  'onedrive_upload_file',
  'onedrive_update_file_content',
];

function readSkill(name) {
  const skillPath = path.join(pluginRoot, 'skills', name, 'SKILL.md');
  const content = fs.readFileSync(skillPath, 'utf8');
  const frontmatterName = content.match(/^---\s*\r?\n[\s\S]*?^name:\s*([^\r\n]+)\s*$/m)?.[1]?.trim();
  if (frontmatterName !== name) {
    throw new Error(`Skill identity mismatch for ${name}`);
  }
  return content;
}

function declaredDropboxTools(content, name) {
  const toolsSection = content.match(/^## Tools\s*\r?\n([\s\S]*?)(?=^##\s|(?![\s\S]))/m)?.[1] ?? '';
  const tools = [...toolsSection.matchAll(/^\s*-\s+`([a-z0-9_]+)`\s*$/gm)].map(match => match[1]);
  if (tools.length === 0) {
    throw new Error(`No declared Dropbox tools in ${name}`);
  }
  return tools;
}

const workflowResults = [];

for (const name of dropboxSkills) {
  const requiredTools = declaredDropboxTools(readSkill(name), name);
  const missingTools = requiredTools.filter(tool => !providerTools.dropbox.has(tool));
  workflowResults.push({ name, provider: 'dropbox', requiredTools, missingTools, available: missingTools.length === 0 });
}

for (const [name, requiredTools] of Object.entries(googleRequirements)) {
  readSkill(name);
  const missingTools = requiredTools.filter(tool => !providerTools.google.has(tool));
  workflowResults.push({ name, provider: 'google-drive', requiredTools, missingTools, available: missingTools.length === 0 });
}

readSkill('onedrive');
const missingOneDriveTools = oneDriveRequirements.filter(tool => !providerTools.oneDrive.has(tool));
const oneDriveWorkflow = {
  name: 'onedrive',
  provider: 'onedrive',
  requiredTools: oneDriveRequirements,
  missingTools: missingOneDriveTools,
  available: missingOneDriveTools.length === 0,
};

const expectedNames = [...dropboxSkills, ...Object.keys(googleRequirements)].sort();
const observedNames = workflowResults.map(result => result.name).sort();
const report = {
  verifiedAt: new Date().toISOString(),
  catalogCapturedAt: catalog.capturedAt ?? null,
  pluginRoot,
  cloudReads: false,
  cloudWrites: false,
  importedWorkflowCount: workflowResults.length,
  expectedWorkflowCount: expectedNames.length,
  exactWorkflowSet: JSON.stringify(observedNames) === JSON.stringify(expectedNames),
  providerCatalogs: {
    dropboxToolCount: providerTools.dropbox.size,
    googleDriveToolCount: providerTools.google.size,
    oneDriveToolCount: providerTools.oneDrive.size,
  },
  workflows: workflowResults,
  oneDriveWorkflow,
  passed: workflowResults.length === 12
    && workflowResults.every(result => result.available)
    && oneDriveWorkflow.available
    && JSON.stringify(observedNames) === JSON.stringify(expectedNames),
};

process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
if (!report.passed) process.exitCode = 1;
```

## File: `scripts/verify-provider-workflows.test.mjs`

```javascript
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { resolveOneDriveChild } from './resolve-onedrive-child.mjs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const verifier = path.join(root, 'scripts/verify-provider-workflows.mjs');
const existingCatalog = {
  dropbox: { tools: [
    'check_job_status', 'check_upload_file_status', 'copy', 'create_file_request',
    'create_folder', 'create_shared_link', 'delete', 'fetch', 'get_file_metadata',
    'get_file_request', 'get_shared_link_metadata', 'list_file_requests',
    'list_folder', 'list_shared_links', 'move', 'search', 'upload_file',
  ] },
  googleDrive: { tools: [
    'batch_update_document', 'batch_update_presentation', 'batch_update_spreadsheet',
    'bulk_update_file_comments', 'copy_file', 'create_file', 'create_presentation_from_template',
    'delete_file', 'export_file', 'fetch', 'fetch_file_revision', 'get_document',
    'get_document_comments', 'get_document_text', 'get_file_comments', 'get_file_metadata',
    'get_presentation', 'get_presentation_comments', 'get_presentation_outline', 'get_profile', 'get_slide',
    'get_spreadsheet_cells', 'get_spreadsheet_comments', 'get_spreadsheet_metadata',
    'get_spreadsheet_range', 'import_document', 'import_presentation', 'import_spreadsheet',
    'list_file_revisions', 'list_folder', 'recent_documents', 'search', 'share_file',
    'update_file', 'upload_file',
  ] },
};
const oneDriveTools = [
  'onedrive_account', 'onedrive_get_drive', 'onedrive_list_root', 'onedrive_list_folder', 'onedrive_search',
  'onedrive_get_item', 'onedrive_read_text', 'onedrive_download_file',
  'onedrive_create_folder', 'onedrive_upload_file', 'onedrive_update_file_content',
];

test('catalog gate requires Google profile and hosted OneDrive search, folder creation, reads and writes', () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'cloudstorage-workflow-catalog-'));
  const catalogFile = path.join(directory, 'catalog.json');
  try {
    const verify = (catalog, expectedStatus, oneDriveAvailable = expectedStatus === 0) => {
      writeFileSync(catalogFile, JSON.stringify(catalog), 'utf8');
      const run = spawnSync(process.execPath, [verifier, root, catalogFile], { encoding: 'utf8' });
      assert.ifError(run.error);
      assert.equal(run.status, expectedStatus, run.stderr);
      const report = JSON.parse(run.stdout);
      assert.equal(report.importedWorkflowCount, 12);
      assert.equal(report.exactWorkflowSet, true);
      assert.equal(report.cloudReads, false);
      assert.equal(report.cloudWrites, false);
      assert.equal(report.passed, expectedStatus === 0);
      assert.equal(report.oneDriveWorkflow.available, oneDriveAvailable);
      return report;
    };

    const complete = verify({ ...existingCatalog, oneDrive: { tools: oneDriveTools } }, 0);
    assert.deepEqual(complete.oneDriveWorkflow.missingTools, []);
    assert.equal(complete.providerCatalogs.oneDriveToolCount, 11);

    const googleDrive = { tools: existingCatalog.googleDrive.tools.filter(tool => tool !== 'get_profile') };
    const withoutProfile = verify({ ...existingCatalog, googleDrive, oneDrive: { tools: oneDriveTools } }, 1, true);
    const googleWorkflow = withoutProfile.workflows.find(workflow => workflow.name === 'google-drive');
    assert.equal(googleWorkflow.available, false);
    assert.deepEqual(googleWorkflow.missingTools, ['get_profile']);

    const absent = verify(existingCatalog, 1);
    assert.deepEqual(absent.oneDriveWorkflow.missingTools, oneDriveTools);
    assert.equal(absent.providerCatalogs.oneDriveToolCount, 0);

    for (const requiredTool of ['onedrive_search', 'onedrive_create_folder', 'onedrive_update_file_content']) {
      const oneDrive = { tools: oneDriveTools.filter(tool => tool !== requiredTool) };
      const partial = verify({ ...existingCatalog, oneDrive }, 1);
      assert.deepEqual(partial.oneDriveWorkflow.missingTools, [requiredTool]);
    }
  } finally {
    unlinkSync(catalogFile);
    rmdirSync(directory);
  }
});

test('verification guide identifies the active App route separately from historical evidence', () => {
  const guidePath = path.join(root, 'skills/cloudstorage-portal/references/workflow-verification.md');
  const guide = readFileSync(guidePath, 'utf8').replace(/\r\n/g, '\n');
  const [active, history] = guide.split('\n## Historical observations\n');
  assert.match(active, /## Current App routing/);
  assert.match(active, /Dropbox, Google Drive and OneDrive Apps in `\.app\.json`/);
  assert.match(active, /`oneDrive\.tools`/);
  assert.doesNotMatch(active, /(?:0\.7\.0-dev|0\.8\.0-dev|SharePoint fallback)/);

  const recordPath = history.match(/\[historical MCP record\]\(([^)]+)\)/)?.[1];
  assert.ok(recordPath, 'historical observations link to the archived record');
  const record = readFileSync(path.resolve(path.dirname(guidePath), recordPath), 'utf8');
  assert.match(record, /^# Historisk dokumentation/);
  assert.match(record, /\[verifikation af den aktuelle App-rute\]\(skills\/cloudstorage-portal\/references\/workflow-verification\.md\)/);
});

test('empty search fallback finds one exact child across all direct-parent pages', () => {
  const account = { subject: 'verified', driveId: 'drive', driveType: 'personal' };
  const exact = { id: 'expected', name: 'Probe.txt', kind: 'file', parentId: 'parent' };
  const page = (items, more) => ({ account, parentId: 'parent', items, more });
  const request = { account, parentId: 'parent', name: exact.name, kind: exact.kind };
  const first = page([{ ...exact, id: 'same-casefold', name: 'probe.txt' }], true);
  const last = page([exact, { ...exact, id: 'wrong-kind', kind: 'folder' }], false);
  assert.deepEqual(resolveOneDriveChild({ ...request, pages: [first, last] }), {
    status: 'MATCHED', itemId: exact.id, parentId: exact.parentId, name: exact.name, kind: exact.kind,
  });
  assert.equal(resolveOneDriveChild({ ...request, pages: [page([], false)] }).status, 'NOT_FOUND');
  const duplicate = page([{ ...exact, id: 'other-exact-id' }], true);
  assert.deepEqual(resolveOneDriveChild({ ...request, pages: [duplicate, last] }), {
    status: 'AMBIGUOUS', distinctMatches: 2,
  });
});

test('empty search fallback rejects unfinished, mixed-account and out-of-parent pages', () => {
  const account = { subject: 'verified', driveId: 'drive', driveType: 'personal' };
  const exact = { id: 'expected', name: 'Probe.txt', kind: 'file', parentId: 'parent' };
  const page = { account, parentId: exact.parentId, items: [exact], more: false };
  const check = pages => resolveOneDriveChild({ account, parentId: exact.parentId, name: exact.name, kind: exact.kind, pages });
  assert.equal(check([]).status, 'INCOMPLETE');
  assert.equal(check([{ ...page, more: true }]).status, 'INCOMPLETE');
  assert.equal(check([page, page]).status, 'INCOMPLETE');
  assert.equal(check([{ ...page, parentId: 'other-folder' }]).status, 'INCOMPLETE');
  assert.equal(check([{ ...page, account: { ...account, driveId: 'other-drive' } }]).status, 'INCOMPLETE');
  assert.equal(check([{ ...page, items: [{ ...exact, parentId: 'other-folder' }] }]).status, 'INCOMPLETE');
});
```

## File: `scripts/verify-slides-native-host.mjs`

```javascript
// Explicit local integration test: real filesystem and caller-selected existing pdftoppm.
import * as fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createNodeSlidesHost} from '../skills/google-slides/host/node-slides-host.mjs';
import {exportAndRenderSlides} from '../skills/google-slides/host/export-and-render-slides.mjs';

const renderer=process.argv[2];
assert.ok(renderer && path.isAbsolute(renderer),'Pass the absolute existing pdftoppm executable path');
function singlePagePdf(){
 const stream='BT /F1 16 Tf 20 160 Td (WinRecoveryProject Windows render test) Tj ET';
 const objects=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
  '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 320 200] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
  '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',`<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`];
 let text='%PDF-1.7\n';const offsets=[0];
 objects.forEach((body,i)=>{offsets.push(Buffer.byteLength(text));text+=`${i+1} 0 obj\n${body}\nendobj\n`;});
 const xref=Buffer.byteLength(text);
 text+=`xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map(n=>String(n).padStart(10,'0')+' 00000 n ').join('\n')}\ntrailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
 return Buffer.from(text);
}
const root=await fs.mkdtemp(path.join(os.tmpdir(),"wrp slides native's æøå "));
try {
 const pdf=singlePagePdf(),source=path.join(root,'source.pdf');await fs.writeFile(source,pdf);
 const result=await exportAndRenderSlides({presentationId:'disposable-native-fixture',workspaceRoot:root,outputDir:path.join(root,'renders'),pdftoppmPath:renderer,dpi:72,
  host:createNodeSlidesHost(),tools:{mcp__codex_apps__google_drive_fetch:async()=>({structuredContent:{file_uri:{mime_type:'application/pdf'},workspace_path:source,size:pdf.length}})}});
 assert.equal(result.pageCount,1);assert.equal(result.pdf.sha256,createHash('sha256').update(pdf).digest('hex'));
 const png=await fs.readFile(result.images[0].path);assert.equal(png.readUInt32BE(16),320);assert.equal(png.readUInt32BE(20),200);
 console.log(JSON.stringify({status:'PASS',platform:process.platform,realRenderer:true,pages:1,width:320,height:200,pdfSha256:result.pdf.sha256,cloudCalls:0,fixtureConnector:true,budgetDkk:0}));
} finally {
 assert.equal(path.dirname(root),path.resolve(os.tmpdir()));assert.ok(path.basename(root).startsWith('wrp slides native'));
 await fs.rm(root,{recursive:true,force:true});
}
```

## File: `scripts/write-remote-onedrive-mcp.mjs`

```javascript
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const expectedHostSuffixes = ['.vercel.app'];
const clientIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

function parseArguments(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key?.startsWith('--') || !value) throw new Error('Use --url <https-url> --api-client-id <id> --host-client-id <id> --output <path>');
    options[key.slice(2)] = value;
  }
  if (Object.keys(options).some(key => !['url', 'api-client-id', 'host-client-id', 'output'].includes(key))) throw new Error('Unknown option');
  if (!options.url || !options['api-client-id'] || !options['host-client-id'] || !options.output) {
    throw new Error('Use --url <https-url> --api-client-id <id> --host-client-id <id> --output <path>');
  }
  return options;
}

function verifiedClientIds(apiClientId, hostClientId) {
  if (!clientIdPattern.test(apiClientId)) throw new Error('API client ID must be a valid application ID');
  if (!clientIdPattern.test(hostClientId)) throw new Error('Host client ID must be a valid application ID');
  if (apiClientId.toLowerCase() === hostClientId.toLowerCase()) throw new Error('API and host client registrations must be separate');
  return { apiClientId, hostClientId };
}

function verifiedMcpUrl(value) {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password || url.port || url.search || url.hash || url.pathname !== '/mcp') {
    throw new Error('OneDrive MCP URL must be an exact HTTPS /mcp endpoint');
  }
  if (!expectedHostSuffixes.some(suffix => url.hostname.endsWith(suffix))) throw new Error('OneDrive MCP host is not an approved deployment domain');
  return url.href;
}

export function remoteMcpManifest(url, apiClientId, hostClientId) {
  const verified = verifiedClientIds(apiClientId, hostClientId);
  return {
    $schema: 'https://agent-plugins.org/schemas/1.0.0/mcp.schema.json',
    mcpServers: {
      onedrive: {
        type: 'streamable-http',
        url: verifiedMcpUrl(url),
        extensions: {
          'com.openai': {
            auth: {
              type: 'oauth',
              client: {
                mode: 'provided',
                clientId: verified.hostClientId,
                tokenEndpointAuthMethod: 'none',
              },
              baseScopes: [`api://${verified.apiClientId}/access_as_user`, 'offline_access'],
              defaultScopes: [`api://${verified.apiClientId}/access_as_user`, 'offline_access'],
            },
          },
        },
      },
    },
  };
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  const options = parseArguments(process.argv.slice(2));
  const outputPath = resolve(options.output);
  const manifest = remoteMcpManifest(options.url, options['api-client-id'], options['host-client-id']);
  await writeFile(outputPath, `${JSON.stringify(manifest, null, 2)}\n`, { encoding: 'utf8', flag: 'wx' });
  const written = JSON.parse(await readFile(outputPath, 'utf8'));
  if (written.mcpServers.onedrive.url !== manifest.mcpServers.onedrive.url) throw new Error('Manifest verification failed');
  process.stdout.write(`${outputPath}\n`);
}
```

## File: `scripts/write-remote-onedrive-mcp.test.mjs`

```javascript
import assert from 'node:assert/strict';
import test from 'node:test';
import { remoteMcpManifest } from './write-remote-onedrive-mcp.mjs';

const apiClientId = '611e57ce-a334-46da-b172-98d03bf2bb9b';
const hostClientId = '22222222-3333-4444-8555-666666666666';

test('remote OneDrive manifest preserves provider identity and exact OAuth client', () => {
  const manifest = remoteMcpManifest('https://cloudstorage-onedrive-mcp.vercel.app/mcp', apiClientId, hostClientId);
  assert.deepEqual(Object.keys(manifest.mcpServers), ['onedrive']);
  const server = manifest.mcpServers.onedrive;
  assert.equal(server.type, 'streamable-http');
  assert.equal(server.extensions['com.openai'].auth.type, 'oauth');
  assert.equal(server.extensions['com.openai'].auth.client.clientId, hostClientId);
  assert.equal(server.extensions['com.openai'].auth.client.tokenEndpointAuthMethod, 'none');
  assert.deepEqual(server.extensions['com.openai'].auth.baseScopes, [`api://${apiClientId}/access_as_user`, 'offline_access']);
});

test('remote OneDrive manifest rejects placeholders, credentials and wrong paths', () => {
  for (const url of [
    'http://cloudstorage-onedrive-mcp.vercel.app/mcp',
    'https://user:pass@cloudstorage-onedrive-mcp.vercel.app/mcp',
    'https://cloudstorage-onedrive-mcp.vercel.app/',
    'https://cloudstorage-onedrive-mcp.vercel.app/mcp?token=no',
    'https://example.invalid/mcp',
  ]) assert.throws(() => remoteMcpManifest(url, apiClientId, hostClientId));
});

test('remote OneDrive manifest requires separate exact API and host registrations', () => {
  const url = 'https://cloudstorage-onedrive-mcp.vercel.app/mcp';
  assert.throws(() => remoteMcpManifest(url, 'not-a-guid', hostClientId), /API client ID/u);
  assert.throws(() => remoteMcpManifest(url, apiClientId, 'not-a-guid'), /Host client ID/u);
  assert.throws(() => remoteMcpManifest(url, apiClientId, apiClientId), /must be separate/u);
});
```
