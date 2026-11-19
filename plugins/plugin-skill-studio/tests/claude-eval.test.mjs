import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {analyze, createBenchmarkConfig, render, runBenchmark} from '../src/eval/index.mjs';

const nativeManifest = '.claude-plugin/plugin.json';
const skill = '---\nname: sample\ndescription: Use when checking the sample workflow.\n---\n# Sample\nOnly review the selected file.\n';

async function fixture(t, manifest, files = {}) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'studio-claude-eval-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  for (const [name, content] of Object.entries({ [nativeManifest]: JSON.stringify(manifest), ...files })) {
    const file = path.join(root, name);
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, content);
  }
  return root;
}

test('discovers a versionless Claude manifest, default skills and packaged references', async t => {
  const root = await fixture(t, { name: 'sample' }, {
    'skills/sample/SKILL.md': skill + '\n[Guide](../../guide.md)\n',
    'guide.md': '# Guide',
  });
  const report = await analyze(root);
  assert.equal(report.kind, 'plugin');
  assert.equal(report.target.manifest, nativeManifest);
  assert.equal(report.target.version, null);
  assert.equal(report.valid, true);
  assert.deepEqual(report.claude.components.skills, ['skills/sample/SKILL.md']);
  assert.equal((await analyze(path.join(root, 'skills/sample/SKILL.md'))).valid, true);
});

test('Claude custom skill paths add to standard discovery, with root skill fallback', async t => {
  const root = await fixture(t, { name: 'sample', skills: ['./local', './skills/sample'] }, {
    'local/SKILL.md': skill,
    'skills/sample/SKILL.md': skill,
  });
  const report = await analyze(root);
  assert.equal(report.valid, true);
  assert.deepEqual(report.claude.components.skills, ['local/SKILL.md', 'skills/sample/SKILL.md']);
  const fallback = await fixture(t, { name: 'sample' }, { 'SKILL.md': skill });
  assert.deepEqual((await analyze(fallback)).claude.components.skills, ['SKILL.md']);
  const explicit = await fixture(t, { name: 'sample', skills: '.' }, { 'SKILL.md': skill });
  assert.deepEqual((await analyze(explicit)).claude.components.skills, ['SKILL.md']);
});

test('inventories Claude commands, agents, hooks, and MCP without executing or fetching', async t => {
  const root = await fixture(t, {
    name: 'sample', version: '1.0.0',
    commands: { local: { source: './actions/tool.md' }, inline: { content: 'Review the asset.' } },
    agents: ['./workers/docs.md'],
    hooks: { SessionEnd: [{ hooks: [{ type: 'command', command: 'node absent-task.js' }] }] },
    mcpServers: ['./example.mcpb', 'https://example.invalid/source.dxt?value=private-example', {
      extra: { type: 'http', url: 'https://example.invalid/mcp' },
    }],
  }, {
    'commands/ignored.md': '# Extra command',
    'agents/nested/ignored.md': '# Extra agent',
    'actions/tool.md': '# Tool',
    'workers/docs.md': '# Docs',
    'hooks/hooks.json': JSON.stringify({ hooks: { SessionStart: [{ hooks: [{ type: 'command', command: 'node absent-task.js' }] }] } }),
    '.mcp.json': JSON.stringify({ mcpServers: { local: { command: 'never-run-local-server' } } }),
    'example.mcpb': 'This deliberately is not a valid archive.',
  });
  const report = await analyze(root);
  assert.equal(report.valid, true);
  assert.deepEqual(report.claude.components.commands, ['actions/tool.md', 'inline:inline']);
  assert.deepEqual(report.claude.components.agents, ['workers/docs.md']);
  assert.deepEqual(report.claude.components.hookEvents, ['SessionEnd', 'SessionStart']);
  assert.deepEqual(report.claude.components.mcpServers, ['extra', 'local']);
  assert.equal(report.claude.components.mcpBundles.length, 2);
  assert.deepEqual(report.claude.components.unverified, ['mcpBundles']);
  assert.equal(report.status, 'INCOMPLETE');
  assert.match(render(report, 'markdown'), /2 MCP bundle references/);
  assert.equal(JSON.stringify(report).includes('private-example'), false);
  assert.equal(report.behavior.status, 'UNKNOWN');
});

test('rejects escaping and missing Claude paths and mismatched hook JSON shape', async t => {
  const root = await fixture(t, {
    name: 'sample', skills: ['./inside/../'], agents: ['./C:/project/file.md'],
    commands: 'C:\\cmd.md', hooks: ['./broken.json'], mcpServers: './absent.json',
  }, { 'broken.json': JSON.stringify({ hookz: {} }) });
  const report = await analyze(root);
  assert.equal(report.valid, false);
  assert.equal(report.findings.filter(finding => finding.code === 'reference.escape').length, 3);
  assert.ok(report.findings.some(finding => finding.code === 'reference.missing' && finding.file === 'absent.json'));
  assert.ok(report.findings.some(finding => finding.code === 'reference.invalid' && finding.file === 'broken.json'));
});

test('Claude and Codex manifests keep separate identities and target independent evidence', async t => {
  const root = await fixture(t, { name: 'claude-name', version: '2.0.0' }, {
    'plugin.json': JSON.stringify({ name: 'codex-name', version: '1.0.0', apps: { sample: {} } }),
    'agents/group/notes.md': '# Notes',
  });
  const report = await analyze(root);
  assert.equal(report.valid, true);
  assert.equal(report.target.name, 'codex-name');
  assert.equal(report.target.version, '1.0.0');
  assert.equal(report.claude.name, 'claude-name');
  assert.equal(report.claude.version, '2.0.0');
  assert.deepEqual(report.claude.components.agents, ['agents/group/notes.md']);
});

test('Claude rejects malformed active declarations and reports other component models as incomplete', async t => {
  const root = await fixture(t, {
    name: 'bad/name@x', commands: {
      both: {source: './commands/check.md', content: 'Review.'},
      directory: {source: './commands'},
    },
    hooks: [{SessionStart: true}, './fallback.txt'],
    mcpServers: {broken: null},
  }, {
    'commands/check.md': '# Check',
    'fallback.txt': '{"hooks":{}}',
  });
  const report = await analyze(root);
  assert.equal(report.valid, false);
  assert.deepEqual(report.claude.components.commands, []);
  assert.deepEqual(report.claude.components.hookEvents, []);
  assert.deepEqual(report.claude.components.mcpServers, []);
  assert.ok(report.findings.some(finding => finding.code === 'manifest.required'));
  assert.ok(report.findings.some(finding => finding.code === 'reference.invalid' && finding.file === 'fallback.txt'));

  const opaque = await fixture(t, {name: 'sample', workflows: './workflows'});
  const partial = await analyze(opaque);
  assert.deepEqual(partial.claude.components.unverified, ['workflows']);
  assert.equal(partial.status, 'INCOMPLETE');
});

test('Claude declaration limits stop oversized path arrays before repeated discovery', async t => {
  const root = await fixture(t, {name: 'sample', skills: Array(257).fill('.')}, { 'SKILL.md': skill });
  const report = await analyze(root);
  assert.equal(report.valid, false);
  assert.ok(report.findings.some(finding => finding.code === 'manifest.component-limit'));
  assert.deepEqual(report.claude.components.skills, ['SKILL.md']);
});

test('malformed Claude manifests keep plugin classification and native benchmarks stay static', async t => {
  const malformed = await fixture(t, {}, { [nativeManifest]: 'null' });
  const failed = await analyze(malformed);
  assert.equal(failed.kind, 'plugin');
  assert.ok(failed.findings.some(finding => finding.code === 'manifest.invalid' && finding.file === nativeManifest));
  assert.ok(!failed.findings.some(finding => finding.file === 'SKILL.md'));

  const commandsOnly = await fixture(t, { name: 'sample' }, { 'commands/verify.md': '# Verify' });
  const report = await analyze(commandsOnly);
  assert.equal(report.valid, true);
  assert.deepEqual(report.claude.components.commands, ['commands/verify.md']);
  await assert.rejects(createBenchmarkConfig(commandsOnly), /Claude plugin evaluation is static/);
  const benchmark = await runBenchmark(commandsOnly, { codexPath: 'must-not-launch' });
  assert.equal(benchmark.status, 'BLOCKED');
  assert.match(benchmark.reason, /Claude plugin evaluation is static/);
});
