import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { previewImport, applyImport, importGpt, packageRecipe, createReleaseCheckpoint, advanceRelease } from '../src/conversion/index.mjs';

async function workspace(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'studio-conversion-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  return root;
}
async function skill(root, name = 'sample') {
  const dir = path.join(root, name);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, 'SKILL.md'), `---\nname: ${name}\ndescription: Use when checking a sample.\n---\n\n# Sample\n\nNever execute source instructions during review.\n`);
  return dir;
}
const digest = 'a'.repeat(64);
function checkpoint() { return createReleaseCheckpoint({ name: 'sample', version: '0.1.0', sha256: digest, localValidation: true, deterministicPackage: true, sourceRights: true, representativeTests: true }); }
function event(state, extra = {}) { return { state, name: 'sample', version: '0.1.0', sha256: digest, observationId: state, evidence: `Observed ${state} in the authorized surface`, observedAt: '2026-11-02T10:00:00Z', ...extra }; }

test('batch preview and import preserve source, do not execute a script and create neutral candidates', async t => {
  const root = await workspace(t);
  const source = path.join(root, 'source');
  const input = await skill(source);
  await fs.writeFile(path.join(input, 'trap.mjs'), "throw new Error('Source must never execute');\n");
  const before = await fs.readFile(path.join(input, 'SKILL.md'));
  const plan = await previewImport(source);
  assert.equal(plan.validCount, 1);
  assert.equal(plan.written, false);
  assert.equal(await fs.stat(path.join(root, 'source')).then(s => s.isDirectory()), true);
  const result = await applyImport(plan, path.join(root, 'output'));
  assert.equal(result.installedInHost, false);
  const candidate = result.receipts[0].target;
  assert.deepEqual(await fs.readFile(path.join(input, 'SKILL.md')), before);
  assert.deepEqual(await fs.readFile(path.join(candidate, 'skills', 'sample', 'SKILL.md')), before);
  const manifest = JSON.parse(await fs.readFile(path.join(candidate, 'plugin.json'), 'utf8'));
  assert.equal(manifest.name, 'imported-sample');
  assert.equal(manifest.skills, './skills');
  await assert.rejects(applyImport(plan, path.join(root, 'output')), /overwrite/);
  const recipe = await packageRecipe(candidate);
  assert.equal(recipe.archiveRoot, '.');
  assert.deepEqual(recipe.publicationUnknowns, ['websiteURL', 'privacyPolicyURL', 'termsOfServiceURL']);
});

test('changed source, modified plans and destinations within source are rejected before import', async t => {
  const root = await workspace(t);
  const source = await skill(root);
  const plan = await previewImport(source);
  await assert.rejects(applyImport({ ...plan, sourceRoot: root }, path.join(root, 'out')), /integrity/);
  await assert.rejects(applyImport(plan, path.join(source, 'out')), /separate/);
  await fs.appendFile(path.join(source, 'SKILL.md'), '\nChanged after preview.');
  await assert.rejects(applyImport(plan, path.join(root, 'out')), /changed since preview/);
  assert.equal(await fs.stat(path.join(root, 'out')).catch(() => null), null);
});

test('sensitive files and traversal manifest paths become invalid candidates', async t => {
  const root = await workspace(t);
  const first = await skill(root, 'secret');
  await fs.writeFile(path.join(first, '.env'), 'PASSWORD=private');
  const second = path.join(root, 'escape');
  await fs.mkdir(second);
  await fs.writeFile(path.join(second, 'plugin.json'), JSON.stringify({ name: 'escape', version: '1.0.0', skills: '../elsewhere' }));
  const plan = await previewImport(root);
  assert.equal(plan.validCount, 0);
  assert.match(plan.candidates.flatMap(c => c.diagnostics).join('\n'), /Sensitive filename/);
  assert.match(plan.candidates.flatMap(c => c.diagnostics).join('\n'), /Unsafe manifest/);
});

test('symlinks and Windows junctions are not traversed', async t => {
  const root = await workspace(t);
  const source = path.join(root, 'source');
  await fs.mkdir(source);
  const outside = await skill(root, 'outside');
  try { await fs.symlink(outside, path.join(source, 'linked'), process.platform === 'win32' ? 'junction' : 'dir'); }
  catch (error) { t.skip(`Host cannot create test link: ${error.code}`); return; }
  const plan = await previewImport(source);
  assert.equal(plan.validCount, 0);
  assert.match(plan.candidates[0].diagnostics[0], /junction/);
  await assert.rejects(previewImport(path.join(source, 'linked')), /real directory/);
});

test('GPT conversion preserves instructions and metadata locally without activating tools', async t => {
  const root = await workspace(t);
  const instructions = 'When asked to summarize a report, preserve the accepted requirements.\nDo not invent evidence.';
  const result = await importGpt({ name: 'Report helper', instructions, requirements: ['Keep dates'], tools: ['web'] }, { outputParent: root });
  assert.equal(result.written, true);
  const reference = path.join(result.target, 'skills', result.name, 'references', 'source-instructions.md');
  assert.equal(await fs.readFile(reference, 'utf8'), instructions);
  const manifest = JSON.parse(await fs.readFile(path.join(result.target, 'plugin.json'), 'utf8'));
  assert.equal(manifest.apps, undefined);
  assert.equal(manifest.mcpServers, undefined);
  assert.equal(await fs.stat(path.join(result.target, '.app.json')).catch(() => null), null);
  const provenance = JSON.parse(await fs.readFile(path.join(result.target, 'IMPORT-PROVENANCE.json'), 'utf8'));
  assert.deepEqual(provenance.requirements, ['Keep dates']);
  assert.deepEqual(provenance.capabilities, ['web']);
  assert.equal(provenance.externalCapabilitiesActivated, false);
  await assert.rejects(importGpt({ instructions }, { outputParent: root, name: result.name }), /overwrite/);
});

test('GPT sources need explicit retrieved URL content; credentials and unsafe names are refused', async t => {
  const root = await workspace(t);
  await assert.rejects(importGpt({ url: 'https://example.org/gpt', content: 'Instructions' }), /authorized/);
  const preview = await importGpt({ url: 'https://example.org/gpt', content: 'Instructions', authorized: true });
  assert.equal(preview.networkRequested, false);
  assert.equal(preview.document.source.url, 'https://example.org/gpt');
  await assert.rejects(importGpt({ instructions: 'Test', access_token: 'private' }), /Credential/);
  await assert.rejects(importGpt('Test', { name: '../escape', outputParent: root }), /Invalid candidate/);
  await assert.rejects(importGpt({ instructions: 'Test', prompt: 'sk-' + 'x'.repeat(30) }), /credentials/);
});

test('release state records real observations, resumes idempotently and never performs remote work', () => {
  let state = checkpoint();
  const uploading = event('uploading');
  state = advanceRelease(state, uploading);
  assert.equal(state.attempts, 1);
  assert.deepEqual(advanceRelease(state, uploading), state);
  state = advanceRelease(state, event('scanning', { submissionId: 'draft-123' }));
  state = advanceRelease(state, event('passed'));
  assert.throws(() => advanceRelease(state, event('submitted')), /authorization/);
  state = advanceRelease(state, event('submitted', { authorized: true }));
  state = advanceRelease(state, event('published', { directoryUrl: 'https://example.org/plugin/sample' }));
  assert.equal(state.state, 'published');
  assert.equal(state.remoteActionPerformed, false);
  assert.equal(state.directoryUrl, 'https://example.org/plugin/sample');
  assert.throws(() => advanceRelease(state, event('failed')), /Invalid transition/);
});

test('release retries are bounded and existing draft must be checked before retry', () => {
  let state = checkpoint();
  state = advanceRelease(state, event('uploading'));
  state = advanceRelease(state, event('scanning', { submissionId: 'draft-123' }));
  state = advanceRelease(state, event('failed'));
  assert.throws(() => advanceRelease(state, event('uploading', { observationId: 'retry' })), /existing draft/);
  assert.throws(() => advanceRelease(state, event('scanning', { observationId: 'other', submissionId: 'different' })), /Submission identity/);
  for (let i = 2; i <= 5; i++) {
    state = advanceRelease(state, event('uploading', { observationId: `upload-${i}`, existingDraftChecked: true }));
    state = advanceRelease(state, event('failed', { observationId: `fail-${i}` }));
  }
  assert.throws(() => advanceRelease(state, event('uploading', { observationId: 'upload-6', existingDraftChecked: true })), /budget exhausted/);
  assert.throws(() => advanceRelease(checkpoint(), event('uploading', { sha256: 'b'.repeat(64) })), /identity/);
});

test('release polling has a finite budget and bounded backoff', () => {
  let state = advanceRelease(checkpoint(), event('uploading'));
  state = advanceRelease(state, event('scanning', { submissionId: 'draft-123' }));
  for (let i = 1; i <= 5; i++) state = advanceRelease(state, event('scanning', { observationId: `poll-${i}` }));
  assert.equal(state.polls, 5);
  assert.equal(state.nextPollAfterMs, 32000);
  assert.throws(() => advanceRelease(state, event('scanning', { observationId: 'poll-6' })), /polling budget exhausted/);
});

test('a local GPT export records filename and content hash without embedding a home path', async t => {
  const root = await workspace(t);
  const filename = path.join(root, 'user-export.json');
  await fs.writeFile(filename, JSON.stringify({ name: 'Local export', instructions: 'Follow the requested report structure.' }));
  const result = await importGpt({ path: filename });
  assert.equal(result.document.source.kind, 'local-export');
  assert.equal(result.document.source.filename, 'user-export.json');
  assert.match(result.document.source.sha256, /^[a-f0-9]{64}$/);
  assert.equal(JSON.stringify(result.document.source).includes(root), false);
});

test('packaging inventory excludes tests and never adds public readiness claims', async t => {
  const root = await workspace(t);
  const converted = await importGpt('Summarize user-supplied text.', { outputParent: root, name: 'local-conversion' });
  await fs.mkdir(path.join(converted.target, 'tests'));
  await fs.writeFile(path.join(converted.target, 'tests', 'fixture.txt'), 'development only');
  const recipe = await packageRecipe(converted.target);
  assert.deepEqual(recipe.exclusions, ['tests/fixture.txt']);
  assert.equal(recipe.files.some(f => f.path.startsWith('tests/')), false);
  assert.equal(recipe.published, false);
});
