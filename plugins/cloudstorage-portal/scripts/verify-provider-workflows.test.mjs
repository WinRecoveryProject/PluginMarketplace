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
