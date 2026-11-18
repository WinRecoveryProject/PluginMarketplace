import test from 'node:test';
import assert from 'node:assert/strict';
import { ChildProcess } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { scan, probe, packageRoot, inventory } from '../src/engine.mjs';
import { run } from '../src/process.mjs';

const roots = [];
async function fixture(files) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'wrp æøå project ')); roots.push(root);
  for (const [name, content] of Object.entries(files)) { await fs.mkdir(path.dirname(path.join(root, name)), { recursive: true }); await fs.writeFile(path.join(root, name), content); }
  return root;
}
test.after(async () => { for (const root of roots) await fs.rm(root, { recursive: true, force: true }); });

test('Source and npm distribution locks agree and contain every exact runtime pin', async () => {
  const packageJson = JSON.parse(await fs.readFile(path.join(packageRoot, 'package.json'), 'utf8'));
  const source = await fs.readFile(path.join(packageRoot, 'package-lock.json'), 'utf8');
  const distribution = await fs.readFile(path.join(packageRoot, 'npm-shrinkwrap.json'), 'utf8');
  assert.equal(source, distribution, 'npm-shrinkwrap must be synchronized after dependency updates');
  const lock = JSON.parse(source);
  for (const [name, version] of Object.entries(packageJson.dependencies)) {
    assert.equal(lock.packages[''].dependencies[name], version, name);
    assert.equal(lock.packages[`node_modules/${name}`]?.version, version, name);
    assert.ok(lock.packages[`node_modules/${name}`]?.integrity, name);
  }
});

const fixtures = [
  ['json', 'data.json', '{"name":"æøå"}\r\n', '{"name":}\r\n'],
  ['json', 'data.jsonc', '// comment\r\n{"name":"æøå",}\r\n', '{"name":}\r\n'],
  ['lua', 'main.lua', 'local function value() return 1 end\r\nreturn value()\r\n', 'goto label\n::label::\n'],
  ['xml', 'data.xml', '<?xml version="1.0"?><root name="æøå"><child/></root>\r\n', '<root><child></root>\n'],
  ['html', 'index.html', '<!doctype html>\r\n<html lang="da"><head><title>æøå</title></head><body><p>Hello</p></body></html>\r\n', '<!doctype html><html><body><div id="one" id="two"></div></body></html>\n'],
  ['html', 'index.htm', '<!doctype html>\r\n<html><head><title>Hello</title></head><body><p>æøå</p></body></html>\r\n', '<!doctype html><html><body><div id="one" id="two"></div></body></html>\n'],
  ['css', 'style.css', '/* æøå */\r\nbody { color: red; margin: 0; }\r\n', 'body { color red; }\n'],
  ['markdown', 'README.md', '# Title\r\n\r\nHello, world.\r\n', '# Title\n\n### Skipped level\n'],
  ['javascript', 'main.js', 'export const value = 1;\r\n', '/** @type {number} */\nconst value = "bad";\nexport { value };\n'],
  ['javascript', 'main.mjs', 'export const value = 1;\r\n', 'export const value = ;\n'],
  ['javascript', 'main.cjs', 'const value = 1;\r\nexports.value = value;\r\n', 'const value = ;\n'],
  ['javascript', 'main.jsx', '/** @type {number} */\nconst value = 1;\nexport { value };\n', 'const view = <div>;\n'],
  ['typescript', 'main.ts', 'export const value: number = 1;\r\n', 'export const value: number = "bad";\n'],
  ['typescript', 'main.tsx', 'declare namespace JSX { interface IntrinsicElements { div: unknown } }\nconst view = <div/>;\n', 'const view = <div>;\n'],
  ['yaml', 'data.yaml', 'name: æøå\r\nvalues: [1, 2]\r\n', 'values: [1, 2\n'],
  ['toml', 'data.toml', 'name = "æøå"\r\n', 'name = [\n'],
  ['powershell', 'main.ps1', 'function Get-Value { [CmdletBinding()] param() return 1 }\r\nGet-Value\r\n', 'if (\n'],
  ['powershell', 'main.psm1', 'function Get-Value { [CmdletBinding()] param() return 1 }\r\n', 'function Get-Value {\n'],
  ['powershell', 'main.psd1', '@{ Name = "æøå"; Version = "1.0" }\r\n', '@{ Name = \n'],
  ['batch', 'main.bat', '@echo off\r\necho Hello\r\nexit /b 0\r\n', '@echo off\r\ngoto :missing_label\r\nexit /b 0\r\n'],
  ['batch', 'main.cmd', '@echo off\r\necho Hello\r\nexit /b 0\r\n', '@echo off\r\ngoto :missing_label\r\nexit /b 0\r\n'],
  ['bash', 'main.sh', '#!/usr/bin/env bash\nprintf \'%s\\n\' hello\n', '#!/usr/bin/env bash\nif then\n'],
  ['python', 'main.py', 'value = 1\r\n', 'if True\n    pass\n']
];

for (const [type, name, good, bad] of fixtures) {
  test(`${type}: ${name} real positive + negative diagnostics`, async t => {
    const root = await fixture({ [name]: good });
    const availability = await probe(type, root);
    if (!availability.available) { t.skip(`External dependency unavailable: ${availability.reason}`); return; }
    const clean = await scan(root, { types: [type] });
    // Blinter deliberately recommends .cmd over .bat even for valid Batch syntax.
    assert.equal(clean.exitCode, name.endsWith('.bat') ? 1 : 0, JSON.stringify(clean, null, 2));
    if (name.endsWith('.bat')) assert.ok(clean.findings.every(item => item.rule === 'S007'));
    await fs.writeFile(path.join(root, name), bad);
    const result = await scan(root, { types: [type] });
    assert.equal(result.exitCode, 1, JSON.stringify(result, null, 2));
    assert.ok(result.findings.some(item => item.file === name && item.line >= 1 && item.rule));
    if (name.endsWith('.bat')) assert.ok(result.findings.some(item => item.rule !== 'S007'));
  });
}

test('Lua 5.1 rejects bitwise, goto and newer operators but permits 5.1 globals', async () => {
  for (const content of ['local x = 1 & 2', 'local x = 1 // 2', 'goto label']) {
    const root = await fixture({ 'main.lua': content });
    assert.equal((await scan(root)).exitCode, 1, content);
  }
});

test('TOC validates metadata and real paths; dynamic paths are visibly deferred', async () => {
  const root = await fixture({ 'Addon.toc': '## Interface: 110000, 110002\r\n## Interface-Classic: 11500\r\n## Title: Addon\r\nmain.lua [AllowLoadGameType mainline]\r\nLocale_[TextLocale].lua\r\nGame_[Game].xml\r\n', 'main.lua': 'return 1\n' });
  const result = await scan(root, { types: ['toc'] });
  assert.equal(result.exitCode, 0, JSON.stringify(result));
  assert.equal(result.notices.filter(item => item.includes('dynamic TOC path deferred')).length, 2);
  await fs.writeFile(path.join(root, 'Addon.toc'), '## Interface: nope\n## Title: Addon\nmissing.lua\n../outside.lua\n');
  const bad = await scan(root, { types: ['toc'] });
  assert.equal(bad.exitCode, 1);
  for (const rule of ['TOC-interface', 'TOC-missing-file', 'TOC-path']) assert.ok(bad.findings.some(item => item.rule === rule));
});

test('TypeScript uses genuine standard libraries, relative modules and semantic checks', async () => {
  const root = await fixture({ 'main.ts': 'import { value } from "./other";\nconst result: number = value.toUpperCase();\nexport { result };\n', 'other.ts': 'export const value: number = 1;\n' });
  const report = await scan(root);
  assert.equal(report.exitCode, 1, JSON.stringify(report));
  assert.ok(report.findings.some(item => item.rule === 'TS2339' && item.message.includes('toUpperCase')));
  assert.ok(!report.findings.some(item => item.rule === 'TS2318' || item.rule === 'TS6053'));
});

test('XML rejects DTD and unknown entities without reading local or remote contents', async () => {
  const root = await fixture({ 'data.xml': '<!DOCTYPE root [<!ENTITY secret SYSTEM "file:///secret.txt">]><root>&secret;</root>' });
  const result = await scan(root);
  assert.equal(result.exitCode, 1);
  assert.ok(result.findings.some(item => item.rule === 'XML-no-DTD'));
});

test('Missing requested tool is INCOMPLETE, including when there are findings', async () => {
  const root = await fixture({ 'main.lua': 'goto label', 'main.sh': 'echo hello' });
  const result = await scan(root, { types: ['lua', 'bash'], toolProbe: async (type, root) => type === 'bash' ? { available: false, reason: 'test: missing ShellCheck' } : probe(type, root) });
  assert.equal(result.exitCode, 2);
  assert.ok(result.findings.length > 0);
  assert.ok(result.incomplete.some(item => item.includes('missing ShellCheck')));
});

test('Read-only scan ignores executable project config and never runs source', async () => {
  const root = await fixture({
    'main.lua': 'os.execute("touch SHOULD_NOT_EXIST"); return 1\n',
    '.markdownlint.cjs': 'throw new Error("CONFIG MUST NEVER EXECUTE");',
    'package.json': '{"scripts":{"pretest":"SHOULD NEVER RUN"}}',
    'tsconfig.json': '{"extends":"https://example.invalid"}',
    '.luacheckrc': 'error("CONFIG MUST NEVER EXECUTE")'
  });
  const before = await fs.readdir(root);
  const result = await scan(root, { types: ['lua'] });
  assert.equal(result.exitCode, 0, JSON.stringify(result));
  assert.deepEqual(await fs.readdir(root), before);
});

test('Unsupported source format is visible, exclusions avoid archives and generated code', async () => {
  const root = await fixture({ 'site.scss': 'p { color: red }', 'main.lua': 'return 1', 'archive/bad.lua': 'goto fail', 'generated/bad.lua': 'goto fail', 'old_copy/bad.lua': 'goto fail', 'node_modules/bad.lua': 'goto fail' });
  const result = await scan(root);
  assert.equal(result.exitCode, 2);
  assert.ok(result.incomplete.some(item => item.includes('site.scss')));
  assert.equal(result.findings.length, 0);
});

test('Symlink escape is skipped without following external source', async t => {
  const root = await fixture({ 'main.lua': 'return 1' });
  const outside = await fixture({ 'bad.lua': 'goto fail' });
  try { await fs.symlink(outside, path.join(root, 'escape'), process.platform === 'win32' ? 'junction' : 'dir'); }
  catch (error) { t.skip(`Symlink capability missing: ${error.code}`); return; }
  const report = await scan(root);
  assert.equal(report.exitCode, 0);
  assert.ok(report.notices.some(item => item.includes('Symlink skipped')));
});

test('Process runner limits time/output and does not interpret argument metacharacters', async () => {
  const text = 'space æøå & ; $(echo unsafe)';
  const result = await run(process.execPath, ['-e', 'process.stdout.write(process.argv[1])', text]);
  assert.equal(result.stdout, text);
  await assert.rejects(run(process.execPath, ['-e', 'setInterval(()=>{},1000)'], { timeout: 30 }), /timed out/);
  await assert.rejects(run(process.execPath, ['-e', 'process.stdout.write("x".repeat(10000))'], { limit: 100 }), /exceeded/);
});

test('Process runner preserves an output-limit failure when the timeout fires during shutdown', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const kill = ChildProcess.prototype.kill;
  let killCount = 0;
  t.mock.method(ChildProcess.prototype, 'kill', function (...args) {
    if (++killCount === 1) {
      // Hold the first kill until the runner's timeout callback also fires.
      t.mock.timers.tick(100);
      return true;
    }
    return kill.apply(this, args);
  });
  const script = 'process.stdout.write("x".repeat(100)); setInterval(() => {}, 1000)';
  await assert.rejects(run(process.execPath, ['-e', script], { timeout: 100, limit: 10 }),
    { message: 'Tool output exceeded 10 bytes' });
  assert.equal(killCount, 2);
});

test('CLI init never overwrites config; malformed config fails closed', async () => {
  const root = await fixture({ 'main.lua': 'return 1' });
  const bin = path.join(packageRoot, 'bin/wrp-lint.mjs');
  assert.equal((await run(process.execPath, [bin, 'init', root])).code, 0);
  const initial = await fs.readFile(path.join(root, '.wrp-lint.json'), 'utf8');
  assert.equal((await run(process.execPath, [bin, 'init', root])).code, 2);
  assert.equal(await fs.readFile(path.join(root, '.wrp-lint.json'), 'utf8'), initial);
  await fs.writeFile(path.join(root, '.wrp-lint.json'), '{"version":1,"execute":"bad"}');
  await assert.rejects(scan(root), /Unknown config key/);
});

test('Fresh extraction works without original dependencies and reports missing libraries', async () => {
  const root = await fixture({ 'main.lua': 'return 1' });
  const copy = await fixture({});
  for (const name of ['bin', 'src', 'adapters', 'config']) await fs.cp(path.join(packageRoot, name), path.join(copy, name), { recursive: true });
  for (const name of ['package.json', 'package-lock.json', 'npm-shrinkwrap.json']) await fs.copyFile(path.join(packageRoot, name), path.join(copy, name));
  const bin = path.join(copy, 'bin/wrp-lint.mjs');
  const emptyRuntimeCache = path.join(copy, 'empty-runtime-cache');
  const options = { env: { ...process.env, WRP_LINT_RUNTIME_CACHE: emptyRuntimeCache } };
  assert.equal((await run(process.execPath, [bin, 'list-linters'], options)).code, 0);
  assert.equal((await run(process.execPath, [bin, 'init', root], options)).code, 0);
  const doctor = await run(process.execPath, [bin, 'doctor', root, '--types', 'lua', '--format', 'json'], options);
  assert.equal(doctor.code, 2);
  assert.match(doctor.stdout, /library is missing/);
  const result = await run(process.execPath, [bin, 'scan', root, '--types', 'lua', '--format', 'json'], options);
  assert.equal(result.code, 2);
  assert.equal(JSON.parse(result.stdout).status, 'INCOMPLETE');
  assert.ok(!result.stderr.includes('ERR_MODULE_NOT_FOUND'));
  await assert.rejects(fs.access(emptyRuntimeCache), { code: 'ENOENT' });
});

test('Compiler handles Node builtins and blocks arbitrary external imports/config', async () => {
  const outside = await fixture({ 'outside.ts': 'export const value = 1;' });
  const root = await fixture({ 'main.ts': `import fs from 'node:fs';\nimport { value } from ${JSON.stringify(path.join(outside, 'outside.ts').replaceAll('\\', '/'))};\nexport const exists: boolean = fs.existsSync('x');\nexport { value };\n`, 'tsconfig.json': '{"extends":"../outside.json"}' });
  const report = await scan(root, { types: ['typescript'] });
  assert.equal(report.exitCode, 1, JSON.stringify(report));
  assert.ok(report.findings.some(item => item.rule === 'TS2307' && item.message.includes('outside.ts')));
  assert.ok(!report.findings.some(item => item.message.includes("'node:fs'")));
});

test('Oversized sources fail explicitly while large extensionless files are only sniffed', async () => {
  const root = await fixture({ 'big.lua': ' '.repeat(2 * 1024 * 1024 + 1), 'bigdata': ' '.repeat(4 * 1024 * 1024), 'main.lua': 'return 1' });
  const report = await scan(root);
  assert.equal(report.exitCode, 2);
  assert.ok(report.incomplete.some(item => item.includes('big.lua') && item.includes('exceeds')));
});

test('Process environment cannot load Bash or Node startup configuration', async () => {
  const result = await run(process.execPath, ['-e', 'process.stdout.write(JSON.stringify([process.env.BASH_ENV,process.env.ENV,process.env.NODE_OPTIONS,process.env.PYTHONPATH]))'], { env: { ...process.env, BASH_ENV: 'evil', ENV: 'evil', NODE_OPTIONS: '--require evil', PYTHONPATH: 'evil' } });
  assert.equal(result.stdout, '[null,null,null,null]');
});

test('HTML/CSS preserve script, URL and import text without running code or loading project config', async () => {
  const root = await fixture({
    'index.html': '<!doctype html><html><head><title>Safe parse</title><script src="https://must-not-fetch.invalid/code.js"></script></head><body><script>throw new Error("must not execute");</script></body></html>',
    'style.css': '@import url("https://must-not-fetch.invalid/style.css");\nbody { background-image: url("file:///must-not-read"); color: red; }\n',
    '.stylelintrc.cjs': 'throw new Error("must not execute");',
    '.htmlvalidate.js': 'throw new Error("must not execute");'
  });
  const before = await fs.readdir(root);
  const originalFetch = globalThis.fetch;
  globalThis.fetch = () => { throw new Error('Parser must never fetch resources'); };
  try {
    const report = await scan(root, { types: ['html', 'css'] });
    assert.equal(report.exitCode, 0, JSON.stringify(report));
    assert.equal(report.coverage.filter(item => item.status === 'checked').length, 2);
  } finally { globalThis.fetch = originalFetch; }
  assert.deepEqual(await fs.readdir(root), before);
});
