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
};

const dropboxSkills = [
  'clean-up-dropbox-content',
  'collect-files-with-request',
  'find-dropbox-content',
  'inspect-dropbox-file',
  'organize-dropbox-folder',
  'share-dropbox-content',
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
  },
  workflows: workflowResults,
  passed: workflowResults.length === 11
    && workflowResults.every(result => result.available)
    && JSON.stringify(observedNames) === JSON.stringify(expectedNames),
};

process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
if (!report.passed) process.exitCode = 1;

