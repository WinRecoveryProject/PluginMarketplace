# Plugin files: winrecoveryproject-linter — `test/`

Source: `plugins/winrecoveryproject-linter`. Files outside the `skills/*` folders, embedded as text.

## File: `test/executable-discovery.test.mjs`

```javascript
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { findExecutable, inside } from '../src/process.mjs';

test('Windows discovers Bash beside the selected Git installation and keeps override precedence', {
  skip: process.platform !== 'win32',
}, t => {
  const temporaryRoot = fs.realpathSync(os.tmpdir());
  const root = fs.mkdtempSync(path.join(temporaryRoot, 'wrp-git-tool-discovery-'));
  const saved = new Map(['PATH', 'WRP_LINT_BASH', 'WRP_LINT_GIT'].map(key => [key, process.env[key]]));
  t.after(() => {
    for (const [key, value] of saved) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    const resolved = fs.realpathSync(root);
    assert.notEqual(resolved, temporaryRoot);
    assert.ok(inside(temporaryRoot, resolved));
    fs.rmSync(resolved, { recursive: true, force: true });
  });
  const gitRoot = path.join(root, 'Custom Git');
  const commandDirectory = path.join(gitRoot, 'cmd');
  const binaryDirectory = path.join(gitRoot, 'bin');
  fs.mkdirSync(commandDirectory, { recursive: true });
  fs.mkdirSync(binaryDirectory);
  fs.writeFileSync(path.join(commandDirectory, 'git.exe'), '');
  const bash = path.join(binaryDirectory, 'bash.exe');
  fs.writeFileSync(bash, '');
  process.env.PATH = commandDirectory;
  delete process.env.WRP_LINT_GIT;
  delete process.env.WRP_LINT_BASH;
  assert.equal(findExecutable('bash'), fs.realpathSync(bash));
  assert.notEqual(findExecutable('bash', gitRoot), fs.realpathSync(bash));

  const override = path.join(root, 'explicit-bash.exe');
  fs.writeFileSync(override, '');
  process.env.WRP_LINT_BASH = override;
  assert.equal(findExecutable('bash'), fs.realpathSync(override));
  process.env.WRP_LINT_BASH = path.join(root, 'missing-bash.exe');
  assert.equal(findExecutable('bash'), undefined);
});
```

## File: `test/linter.test.mjs`

```javascript
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
```

## File: `test/package.test.mjs`

```javascript
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { packageRoot } from '../src/engine.mjs';
import { findExecutable, run } from '../src/process.mjs';

const python = findExecutable('python');
const builder = path.join(packageRoot, 'scripts/package-native.py');
const roots = [];
test.after(async () => { for (const root of roots) await fs.rm(root, { recursive: true, force: true }); });

async function fixture() {
  assert.ok(python, 'Packaging requires existing Python >=3.11');
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'wrp native ZIP æøå '));
  roots.push(root);
  const profile = JSON.parse(await fs.readFile(path.join(packageRoot, 'config/native-package.json'), 'utf8'));
  for (const file of profile.entries) { await fs.mkdir(path.dirname(path.join(root, file)), { recursive: true }); await fs.copyFile(path.join(packageRoot, file), path.join(root, file)); }
  return { root, profile };
}
const build = root => run(python, ['-I', builder, '--root', root], { cwd: packageRoot });

test('Actual native ZIP deterministically includes both locks and only whitelisted files', async () => {
  const { root, profile } = await fixture();
  for (const name of ['node_modules/private.js', '.tools/private.py', 'outputs/private.txt', '.env']) { await fs.mkdir(path.dirname(path.join(root, name)), { recursive: true }); await fs.writeFile(path.join(root, name), 'UNLISTED PRIVATE DATA MUST NOT SHIP'); }
  const first = await build(root); assert.equal(first.code, 0, first.stderr);
  const a = JSON.parse(first.stdout);
  const archive = path.join(root, a.archive);
  const firstBytes = await fs.readFile(archive);
  const second = await build(root); assert.equal(second.code, 0, second.stderr);
  const b = JSON.parse(second.stdout);
  assert.equal(a.sha256, b.sha256);
  assert.deepEqual(await fs.readFile(archive), firstBytes);
  const inspected = await run(python, ['-I', builder, '--inspect', archive]);
  assert.equal(inspected.code, 0, inspected.stderr);
  const actual = JSON.parse(inspected.stdout);
  assert.equal(actual.includedFileCount, profile.entries.length);
  assert.deepEqual(actual.files.map(item => item.path).sort(), [...profile.entries].sort());
  for (const name of ['package-lock.json', 'npm-shrinkwrap.json', '.codex-plugin/plugin.json', 'bin/wrp-lint.mjs']) assert.ok(actual.files.some(item => item.path === name));
  const destination = path.join(root, 'extracted ZIP');
  const extracted = await run(python, ['-I', builder, '--extract', archive, '--destination', destination]);
  assert.equal(extracted.code, 0, extracted.stderr);
  assert.deepEqual(await fs.readFile(path.join(destination, 'package-lock.json')), await fs.readFile(path.join(destination, 'npm-shrinkwrap.json')));
  const emptyRuntimeCache = path.join(root, 'empty-runtime-cache');
  const doctor = await run(process.execPath, [path.join(destination, 'bin/wrp-lint.mjs'), 'doctor', destination, '--types', 'lua,html,css', '--format', 'json'], {
    env: { ...process.env, WRP_LINT_RUNTIME_CACHE: emptyRuntimeCache }
  });
  assert.equal(doctor.code, 2);
  for (const item of JSON.parse(doctor.stdout).results) assert.equal(item.available, false);
  await assert.rejects(fs.access(emptyRuntimeCache), { code: 'ENOENT' });
});

test('Native packaging fails closed for missing locks, lock drift and private source paths', async () => {
  const { root } = await fixture();
  const lock = path.join(root, 'package-lock.json');
  const original = await fs.readFile(lock);
  await fs.unlink(lock);
  assert.equal((await build(root)).code, 2);
  await fs.writeFile(lock, '{}\n');
  const drift = await build(root); assert.equal(drift.code, 2); assert.match(drift.stderr, /lockfiles differ/);
  await fs.writeFile(lock, original);
  await fs.appendFile(path.join(root, 'README.md'), '\n' + ['C:', 'Users', 'private-user', 'secret'].join('/') + '\n');
  const leak = await build(root); assert.equal(leak.code, 2); assert.match(leak.stderr, /Private user path/);
});

test('Native packaging rejects whitelist traversal and dependency entries', async () => {
  const { root, profile } = await fixture();
  for (const name of ['../secret.txt', 'node_modules/private.js']) {
    await fs.writeFile(path.join(root, 'config/native-package.json'), JSON.stringify({ ...profile, entries: [...profile.entries, name] }));
    const result = await build(root); assert.equal(result.code, 2); assert.match(result.stderr, /rejected/);
  }
});

test('Native packaging rejects a whitelisted directory replaced by a symlink/junction', async t => {
  const { root } = await fixture();
  const outside = await fs.mkdtemp(path.join(os.tmpdir(), 'wrp package outside ')); roots.push(outside);
  await fs.rename(path.join(root, 'scripts'), path.join(root, 'scripts-original'));
  try { await fs.symlink(outside, path.join(root, 'scripts'), process.platform === 'win32' ? 'junction' : 'dir'); }
  catch (error) { t.skip(`OS cannot create symlinks: ${error.code}`); return; }
  const result = await build(root); assert.equal(result.code, 2); assert.match(result.stderr, /Symlink\/reparse/);
});

test('Native ZIP inspector/extractor reject traversal members before writing payload files', async () => {
  const { root } = await fixture();
  const archive = path.join(root, 'malicious.zip');
  const create = await run(python, ['-I', '-c', 'import sys,zipfile; z=zipfile.ZipFile(sys.argv[1],"w"); z.writestr("../escaped.txt","must not escape"); z.close()', archive]);
  assert.equal(create.code, 0, create.stderr);
  const destination = path.join(root, 'must not exist');
  const result = await run(python, ['-I', builder, '--extract', archive, '--destination', destination]);
  assert.equal(result.code, 2); assert.match(result.stderr, /traversal/);
  await assert.rejects(fs.access(destination));
  await assert.rejects(fs.access(path.join(root, 'escaped.txt')));
});
```

## File: `test/powershell-batching.test.mjs`

```javascript
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {scan,packageRoot} from '../src/engine.mjs';
import {ToolTimeoutError} from '../src/process.mjs';

async function project(t,count=17){
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'wrp-ps-batch-'));
  t.after(()=>fs.rm(root,{recursive:true,force:true}));
  for(let i=0;i<count;i++)await fs.writeFile(path.join(root,`${String(i).padStart(2,'0')}.ps1`),'Write-Host "fixture only; never execute this source"\n');
  return root;
}
const toolProbe=async()=>({available:true,executable:'fixed-powershell-fixture'});
const warning=file=>({file,rule:'PSAvoidUsingWriteHost',message:'Synthetic analyzer diagnostic',line:1,column:1,severity:'warning'});
function adapter(args,options){
  assert.equal(args[0],'-NoLogo');assert.ok(args.includes('-NoProfile'));assert.ok(args.includes('-NonInteractive'));
  assert.equal(args.at(-1),path.join(packageRoot,'adapters/powershell.ps1'));
  assert.equal(options.timeout, 30000);
  return JSON.parse(options.input);
}

test('PowerShell scans bounded batches instead of timing out the entire family',async t=>{
  const root=await project(t),sizes=[];
  const execute=async(_executable,args,options)=>{
    const files=adapter(args,options);sizes.push(files.length);
    if(files.length>8)throw new ToolTimeoutError(30000);
    return {code:0,stdout:JSON.stringify(files.map(f=>warning(f.file))),stderr:''};
  };
  const report=await scan(root,{types:['powershell'],toolProbe,execute});
  assert.equal(report.status,'FINDINGS');assert.equal(report.findings.length,17);
  assert.equal(report.coverage[0].checkedFiles,17);assert.equal(report.coverage[0].status,'checked');
  assert.deepEqual(sizes,[8,8,1]);
});

test('PowerShell recovers all diagnostics when a timed-out batch succeeds in two halves', async t => {
  const root = await project(t, 8);
  const sizes = [];
  const execute = async (_executable, args, options) => {
    const files = adapter(args, options);
    sizes.push(files.length);
    if (files.length === 8) throw new ToolTimeoutError(30000);
    return { code: 0, stdout: JSON.stringify(files.map(file => warning(file.file))), stderr: '' };
  };
  const report = await scan(root, { types: ['powershell'], toolProbe, execute });
  assert.equal(report.status, 'FINDINGS');
  assert.equal(report.coverage[0].status, 'checked');
  assert.equal(report.coverage[0].checkedFiles, 8);
  assert.deepEqual(report.incomplete, []);
  assert.equal(new Set(report.findings.map(finding => finding.file)).size, 8);
  assert.deepEqual(sizes, [8, 4, 4]);
});

test('PowerShell reports partial coverage when one timeout half still fails', async t => {
  const root = await project(t);
  const sizes = [];
  const execute = async (_executable, args, options) => {
    const files = adapter(args, options);
    sizes.push(files.length);
    if (files[0].file === '00.ps1') throw new ToolTimeoutError(30000);
    return { code: 0, stdout: JSON.stringify(files.map(file => warning(file.file))), stderr: '' };
  };
  const report = await scan(root, { types: ['powershell'], toolProbe, execute });
  assert.equal(report.status, 'INCOMPLETE');
  assert.equal(report.coverage[0].status, 'partial');
  assert.equal(report.coverage[0].checkedFiles, 13);
  assert.deepEqual(report.incomplete.map(line => line.split(':')[0]), ['00.ps1', '01.ps1', '02.ps1', '03.ps1']);
  assert.equal(report.findings.filter(finding => finding.rule === 'PSAvoidUsingWriteHost').length, 13);
  assert.deepEqual(sizes, [8, 4, 4, 8, 1]);
});

test('PowerShell never retries a timed-out single-file batch', async t => {
  const root = await project(t, 1);
  let calls = 0;
  const execute = async () => {
    calls++;
    throw new ToolTimeoutError(30000);
  };
  const report = await scan(root, { types: ['powershell'], toolProbe, execute });
  assert.equal(report.status, 'INCOMPLETE');
  assert.equal(report.coverage[0].checkedFiles, 0);
  assert.equal(calls, 1);
});

test('PowerShell never retries malformed reports or adapter stderr that resembles a timeout', async t => {
  const root = await project(t, 2);
  for (const result of [
    { code: 0, stdout: '[{"file":"outside.ps1"}]', stderr: '' },
    { code: 1, stdout: '', stderr: 'Tool timed out after 30000 ms' }
  ]) {
    let calls = 0;
    const execute = async () => {
      calls++;
      return result;
    };
    const report = await scan(root, { types: ['powershell'], toolProbe, execute });
    assert.equal(report.status, 'INCOMPLETE');
    assert.equal(report.coverage[0].checkedFiles, 0);
    assert.equal(calls, 1);
  }
});

test('PowerShell batching targets bounded input bytes and never truncates large source snapshots',async t=>{
  const root=await project(t,3),content='#'+('x'.repeat(300*1024))+'\n';
  for(const name of await fs.readdir(root))await fs.writeFile(path.join(root,name),content);
  const sizes=[];
  const report=await scan(root,{types:['powershell'],toolProbe,execute:async(_executable,args,options)=>{
    const files=adapter(args,options);sizes.push(files.length);
    assert.equal(files[0].content,content);
    return {code:0,stdout:'[]',stderr:''};
  }});
  assert.equal(report.status,'CLEAN');assert.equal(report.coverage[0].checkedFiles,3);
  assert.deepEqual(sizes,[1,1,1]);
});
```

## File: `test/practical-regressions.test.mjs`

```javascript
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { scan } from '../src/engine.mjs';

for (const types of [[], ['lua']]) {
  test(`scan cannot be CLEAN with no selected files: ${JSON.stringify(types)}`, async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'wrp-empty-selection-'));
    try {
      await fs.writeFile(path.join(root, 'bad.py'), 'def broken(:\n');
      await fs.writeFile(path.join(root, '.wrp-lint.json'), JSON.stringify({ version: 1, types }));
      const report = await scan(root, { toolProbe: async () => ({ available: true }) });
      assert.equal(report.exitCode, 2);
      assert.equal(report.status, 'INCOMPLETE');
      assert.ok(report.incomplete.length > 0);
      assert.ok(report.coverage.every(item => item.status !== 'checked'));
    } finally { await fs.rm(root, { recursive: true, force: true }); }
  });
}
```

## File: `test/python-adapter.test.mjs`

```javascript
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { packageRoot, probe, scan } from '../src/engine.mjs';
import { run } from '../src/process.mjs';

test('Python snapshot protocol uses UTF-8 bytes even when Windows stdin text decoding is cp1252', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'wrp-python-protocol-'));
  try {
    const tool = await probe('python', root);
    if (!tool.available) { t.skip(tool.reason); return; }
    const input = JSON.stringify([{ file: 'valid-ŝ-😀.py', content: 'text = "ŝ 😀 æøå"\n' }, { file: 'syntax-ŝ.py', content: 'if True\n    pass\n' }]);
    // Own fixed launcher simulates the Windows legacy pipe text wrapper; only
    // the product adapter is run. No inspected Python source is executed.
    const launcher = 'import io,runpy,sys; sys.stdin=io.TextIOWrapper(sys.stdin.buffer,encoding="cp1252",errors="surrogateescape"); runpy.run_path(sys.argv[1],run_name="__main__")';
    const result = await run(tool.executable, ['-I', '-B', '-c', launcher, path.join(packageRoot, 'adapters/python-syntax.py')], { cwd: packageRoot, input });
    assert.equal(result.code, 0, result.stderr);
    const diagnostics = JSON.parse(result.stdout);
    assert.equal(diagnostics.length, 1, result.stdout);
    assert.equal(diagnostics[0].file, 'syntax-ŝ.py');
    assert.equal(diagnostics[0].rule, 'python-syntax');
  } finally { await fs.rm(root, { recursive: true, force: true }); }
});

test('Python isolates unencodable snapshots and keeps later syntax diagnostics without execution', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'wrp-python-unicode-'));
  try {
    const tool = await probe('python', root);
    if (!tool.available) { t.skip(tool.reason); return; }
    const sentinel = path.join(root, 'must-not-exist.txt');
    const snapshots = [
      { file: 'a-invalid.py', content: '# first\r\n# bad \udc9d\n' },
      { file: 'b-syntax.py', content: 'if True\n    pass\n' },
      { file: 'c-valid.py', content: `from pathlib import Path\nPath(${JSON.stringify(sentinel)}).write_text("executed")\nemoji = "😀"\n` },
      { file: 'd-invalid.py', content: '# bad \ud800\n' },
      { file: 'e-\udc9d.py', content: 'if True\n    pass\n' }
    ];
    const input = JSON.stringify(snapshots);
    const call = () => run(tool.executable, ['-I', '-B', path.join(packageRoot, 'adapters/python-syntax.py')], { cwd: packageRoot, input });
    const result = await call();
    assert.equal(result.code, 0, result.stderr);
    const diagnostics = JSON.parse(result.stdout);
    assert.deepEqual(diagnostics.map(item => [item.file, item.rule]), [
      ['a-invalid.py', 'python-encoding'], ['b-syntax.py', 'python-syntax'], ['d-invalid.py', 'python-encoding'], ['e-\udc9d.py', 'python-syntax']
    ]);
    assert.deepEqual(diagnostics.filter(item => item.rule === 'python-encoding').map(item => [item.line, item.column, item.incomplete]), [[2, 7, true], [1, 7, true]]);
    assert.ok(diagnostics.every(item => !item.message.includes('Traceback')));
    assert.equal((await call()).stdout, result.stdout, 'Stable input must produce byte-identical diagnostics');
    await assert.rejects(fs.access(sentinel), { code: 'ENOENT' });
  } finally { await fs.rm(root, { recursive: true, force: true }); }
});

test('Python batch encoding gaps keep exact paths and syntax findings with INCOMPLETE coverage', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'wrp-python-boundary-'));
  try {
    const tool = await probe('python', root);
    if (!tool.available) { t.skip(tool.reason); return; }
    await fs.writeFile(path.join(root, 'bad-encoding.py'), '# snapshot boundary fixture\n');
    await fs.writeFile(path.join(root, 'bad-syntax.py'), 'if True\n    pass\n');
    const execute = (executable, args, options) => {
      if (args.includes(path.join(packageRoot, 'adapters/python-syntax.py'))) {
        const snapshots = JSON.parse(options.input);
        snapshots.find(item => item.file === 'bad-encoding.py').content = '# bad \udc9d\n';
        return run(executable, args, { ...options, input: JSON.stringify(snapshots) });
      }
      return run(executable, args, options);
    };
    const report = await scan(root, { types: ['python'], execute });
    assert.equal(report.status, 'INCOMPLETE');
    assert.equal(report.exitCode, 2);
    assert.ok(report.incomplete.some(item => item.startsWith('bad-encoding.py:1:7: python-encoding:')));
    assert.equal(report.coverage.find(item => item.type === 'python').status, 'partial');
    assert.equal(report.coverage.find(item => item.type === 'python').checkedFiles, 1);
    assert.ok(report.findings.some(item => item.file === 'bad-syntax.py' && item.rule === 'python-syntax'));
    assert.ok(!report.findings.some(item => item.rule === 'python-encoding'));
    const allInvalid = await scan(root, { types: ['python'], execute: (executable, args, options) => {
      if (args.includes(path.join(packageRoot, 'adapters/python-syntax.py'))) {
        const snapshots = JSON.parse(options.input).map(item => ({ ...item, content: '# bad \udc9d\n' }));
        return run(executable, args, { ...options, input: JSON.stringify(snapshots) });
      }
      return run(executable, args, options);
    } });
    assert.equal(allInvalid.status, 'INCOMPLETE');
    assert.equal(allInvalid.coverage[0].status, 'failed');
    assert.equal(allInvalid.coverage[0].checkedFiles, 0);
    assert.equal(allInvalid.findings.length, 0);
    assert.equal(allInvalid.incomplete.length, 2);
  } finally { await fs.rm(root, { recursive: true, force: true }); }
});

test('Python scan rejects invalid UTF-8 per file and still parses valid snapshots', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'wrp-python-encoding-'));
  try {
    const tool = await probe('python', root);
    if (!tool.available) { t.skip(tool.reason); return; }
    await fs.writeFile(path.join(root, 'bad-encoding.py'), Buffer.from([0x23, 0x20, 0x9d, 0x0a]));
    await fs.writeFile(path.join(root, 'bad-syntax.py'), 'if True\n    pass\n');
    const report = await scan(root, { types: ['python'] });
    assert.equal(report.status, 'INCOMPLETE');
    assert.equal(report.exitCode, 2);
    assert.ok(report.incomplete.some(item => item.startsWith('bad-encoding.py:')));
    assert.ok(report.findings.some(item => item.file === 'bad-syntax.py' && item.rule === 'python-syntax'));
    assert.ok(!report.incomplete.some(item => item.includes('Traceback')));
  } finally { await fs.rm(root, { recursive: true, force: true }); }
});
```

## File: `test/runtime-cache.test.mjs`

```javascript
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { prepareRuntime, verifiedRuntime, resolveLibrary, runtimeContract, runtimeLocation, defaultCacheRoot } from '../src/runtime-cache.mjs';
import { setup } from '../src/setup.mjs';
import { probe, pythonRuntime } from '../src/engine.mjs';

const source = fileURLToPath(new URL('../', import.meta.url));
async function fixture(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'wrp durable runtime æøå '));
  t.after(async () => { assert.ok(path.basename(root).startsWith('wrp durable runtime ')); await fs.rm(root, { recursive: true, force: true }); });
  const packageDirectory = path.join(root, 'first plugin path'), cacheRoot = path.join(root, 'per-user cache');
  await fs.mkdir(path.join(packageDirectory, 'config'), { recursive: true });
  for (const name of ['package.json', 'package-lock.json', 'npm-shrinkwrap.json', 'config/blinter-requirements.txt']) await fs.copyFile(path.join(source, name), path.join(packageDirectory, name));
  const build = async (stage, contract) => {
    for (const name of ['package.json', 'package-lock.json', 'npm-shrinkwrap.json']) await fs.copyFile(path.join(packageDirectory, name), path.join(stage, name));
    for (const name of ['typescript', '@types/node', 'undici-types', 'jsonc-parser', 'luaparse', 'markdownlint', 'saxes', 'js-yaml', 'smol-toml', 'parse5', 'css-tree', 'libpg-query']) {
      const folder = path.join(stage, 'node_modules', name);
      await fs.mkdir(folder, { recursive: true });
      await fs.writeFile(path.join(folder, 'package.json'), JSON.stringify({ name, version: contract.pins[name], main: 'index.cjs', ...(name === 'markdownlint' ? { exports: { './sync': './index.cjs' } } : {}) }));
      await fs.writeFile(path.join(folder, 'index.cjs'), 'throw new Error("Fixture modules must never execute");\n');
      if (name === 'libpg-query') {
        await fs.mkdir(path.join(folder, 'wasm'));
        for (const file of ['libpg-query.js', 'libpg-query.wasm']) await fs.writeFile(path.join(folder, 'wasm', file), 'Fixture asset; must never execute');
      }
    }
  };
  return { root, packageDirectory, cacheRoot, build };
}

test('Fresh runtime lookup is read-only and never falls back to an uninstalled higher cache', async t => {
  const ctx = await fixture(t);
  await assert.rejects(fs.access(ctx.cacheRoot), { code: 'ENOENT' });
  assert.throws(() => resolveLibrary('luaparse', ctx));
  await assert.rejects(fs.access(ctx.cacheRoot), { code: 'ENOENT' });
  await fs.mkdir(path.join(ctx.cacheRoot, 'node-highest-999'), { recursive: true });
  assert.throws(() => resolveLibrary('luaparse', ctx));
  assert.deepEqual(await fs.readdir(ctx.cacheRoot), ['node-highest-999']);
});

test('ShellCheck accepts the official Windows binary size while oversized tool receipts remain bounded', async t => {
  const ctx = await fixture(t);
  const ready = await prepareRuntime('shellcheck', async stage => {
    await fs.writeFile(path.join(stage, 'shellcheck.exe'), Buffer.alloc(34778624));
  }, ctx);
  assert.equal(verifiedRuntime('shellcheck', ctx).key, ready.key);
  await fs.truncate(path.join(ready.root, 'shellcheck.exe'), 40 * 1024 * 1024 + 1);
  assert.throws(() => verifiedRuntime('shellcheck', ctx), /exceeds its limit/);
});

test('The ShellCheck exception does not raise the ordinary Node runtime entry limit', async t => {
  const ctx = await fixture(t);
  await assert.rejects(prepareRuntime('node', async (stage, contract) => {
    await ctx.build(stage, contract);
    await fs.writeFile(path.join(stage, 'node_modules/luaparse/index.cjs'), Buffer.alloc(16 * 1024 * 1024 + 1));
  }, ctx), /exceeds its limit/);
  assert.deepEqual(await fs.readdir(ctx.cacheRoot), []);
});

test('Explicit preparation survives plugin path replacement and product-only version changes', async t => {
  const ctx = await fixture(t);
  let builds = 0;
  const ready = await prepareRuntime('node', async (...args) => { builds++; await ctx.build(...args); }, ctx);
  assert.equal(ready.reused, false);
  const entry = resolveLibrary('luaparse', ctx);
  assert.ok(entry.startsWith(ready.root + path.sep));
  const moved = path.join(ctx.root, 'replacement plugin path');
  await fs.rename(ctx.packageDirectory, moved);
  for (const name of ['package.json', 'package-lock.json', 'npm-shrinkwrap.json']) {
    const file = path.join(moved, name), data = JSON.parse(await fs.readFile(file, 'utf8'));
    data.version = '99.0.0'; if (data.packages) data.packages[''].version = '99.0.0';
    await fs.writeFile(file, JSON.stringify(data));
  }
  const next = { ...ctx, packageDirectory: moved };
  assert.equal(runtimeLocation('node', next).key, ready.key);
  assert.equal(resolveLibrary('luaparse', next), entry);
  assert.equal((await prepareRuntime('node', () => { throw new Error('No second setup required'); }, next)).reused, true);
  assert.equal(builds, 1);
});

test('Changed exact dependency graph does not reuse a previous READY runtime', async t => {
  const ctx = await fixture(t);
  const first = await prepareRuntime('node', ctx.build, ctx);
  for (const name of ['package.json', 'package-lock.json', 'npm-shrinkwrap.json']) {
    const file = path.join(ctx.packageDirectory, name), data = JSON.parse(await fs.readFile(file, 'utf8'));
    if (name === 'package.json') data.dependencies.luaparse = '0.3.2';
    else { data.packages[''].dependencies.luaparse = '0.3.2'; data.packages['node_modules/luaparse'].version = '0.3.2'; }
    await fs.writeFile(file, JSON.stringify(data));
  }
  assert.notEqual(runtimeLocation('node', ctx).key, first.key);
  assert.throws(() => resolveLibrary('luaparse', ctx));
});

test('Tampered selected module and forged receipt are unavailable; only explicit setup repairs them', async t => {
  const ctx = await fixture(t);
  const ready = await prepareRuntime('node', ctx.build, ctx);
  const entry = resolveLibrary('luaparse', ctx);
  await fs.writeFile(entry, 'throw new Error("tampered");\n');
  assert.throws(() => resolveLibrary('luaparse', ctx), /integrity mismatch/);
  const repaired = await prepareRuntime('node', ctx.build, ctx);
  assert.equal(repaired.reused, false);
  assert.equal(resolveLibrary('luaparse', ctx), entry);
  assert.ok((await fs.readdir(ctx.cacheRoot)).some(name => name.startsWith('.rejected-')));
  const file = path.join(ready.root, 'READY.json'), receipt = JSON.parse(await fs.readFile(file, 'utf8'));
  receipt.files['../outside.cjs'] = 'a'.repeat(64); await fs.writeFile(file, JSON.stringify(receipt));
  assert.throws(() => verifiedRuntime('node', ctx), /file set/);
});

test('Failed setup publishes no READY runtime, releases lock, and does not execute a partial module', async t => {
  const ctx = await fixture(t);
  await assert.rejects(prepareRuntime('node', async stage => { await fs.writeFile(path.join(stage, 'partial'), 'partial'); throw new Error('simulated installer failure'); }, ctx), /simulated installer failure/);
  assert.deepEqual(await fs.readdir(ctx.cacheRoot), []);
  assert.throws(() => resolveLibrary('luaparse', ctx));
  await prepareRuntime('node', ctx.build, ctx);
  assert.ok(resolveLibrary('luaparse', ctx));
});

test('Symlink/junction entry escape is rejected before any module is imported', async t => {
  const ctx = await fixture(t);
  const ready = await prepareRuntime('node', ctx.build, ctx);
  const folder = path.join(ready.root, 'node_modules', 'luaparse'), outside = path.join(ctx.root, 'outside package');
  await fs.rename(folder, outside);
  await fs.symlink(outside, folder, process.platform === 'win32' ? 'junction' : 'dir');
  assert.throws(() => resolveLibrary('luaparse', ctx), /symlinks|junctions/);
});

test('Invalid cache paths, missing ABI identity and unknown libraries cannot change capability scope', async t => {
  const ctx = await fixture(t);
  assert.throws(() => runtimeLocation('node', { ...ctx, cacheRoot: '\\\\server\\share\\cache' }), /local absolute/);
  assert.throws(() => runtimeLocation('blinter', ctx), /Python runtime identity/);
  assert.throws(() => resolveLibrary('../project/custom-loader.cjs', ctx), /fixed linter capability/);
  assert.throws(() => defaultCacheRoot({ env: { WRP_LINT_RUNTIME_CACHE: 'relative-path' } }), /local absolute/);
  assert.equal(runtimeContract(ctx.packageDirectory).fingerprint.length, 64);
});

test('Explicit setup uses its own locked staging root and ignores target npm config; a ready runtime needs no second installer', async t => {
  const ctx = await fixture(t);
  const target = path.join(ctx.root, 'target project');
  await fs.mkdir(target);
  await fs.writeFile(path.join(target, 'main.lua'), 'return 1\n');
  await fs.writeFile(path.join(target, '.npmrc'), 'registry=https://must-not-be-contacted.invalid/\nignore-scripts=false\n');
  const calls = [];
  const execute = async (executable, args, options) => {
    calls.push({ executable, args, cwd: options.cwd });
    assert.equal(executable, process.execPath);
    assert.equal(args[1], 'ci');
    for (const flag of ['--ignore-scripts', '--no-audit', '--no-fund', '--registry=https://registry.npmjs.org/']) assert.ok(args.includes(flag));
    assert.ok(args.some(flag => flag === `--userconfig=${path.join(source, 'config/npmrc')}`));
    assert.ok(args.some(flag => flag === `--globalconfig=${path.join(source, 'config/global-npmrc')}`));
    assert.equal(path.dirname(options.cwd), ctx.cacheRoot);
    assert.ok(path.basename(options.cwd).startsWith('.staging-node-'));
    assert.notEqual(options.cwd, target);
    await ctx.build(options.cwd, runtimeContract(source));
    return { code: 0, stdout: '', stderr: '' };
  };
  const first = await setup(target, { types: ['lua'], cacheRoot: ctx.cacheRoot, execute, fetchResource: () => { throw new Error('Unexpected download'); } });
  assert.equal(first.exitCode, 0);
  assert.equal(first.results[0].action, 'prepared durable runtime');
  const second = await setup(target, { types: ['lua'], cacheRoot: ctx.cacheRoot, execute });
  assert.equal(second.results[0].action, 'verified durable runtime reused');
  assert.equal(calls.length, 1);
  assert.deepEqual((await fs.readdir(target)).sort(), ['.npmrc', 'main.lua']);
});

test('Verified durable tools take precedence over a stale legacy candidate without changing PATH', async t => {
  const ctx = await fixture(t);
  let python;
  try { python = await pythonRuntime(ctx.root); } catch (error) { t.skip(error.message); return; }
  const identity = JSON.parse(python.identity);
  const observed = { version: identity[1], prefix: identity[2], implementation: identity[3], cacheTag: identity[4], soabi: identity[5], freeThreaded: identity[6] };
  const ready = await prepareRuntime('blinter', async stage => {
    const site = process.platform === 'win32' ? 'Lib/site-packages' : `lib/python${observed.version[0]}.${observed.version[1]}/site-packages`;
    for (const relative of [process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python', 'pyvenv.cfg', `${site}/blinter/__main__.py`, `${site}/blinter-1.1.66.dist-info/METADATA`, `${site}/charset_normalizer-3.5.2.dist-info/METADATA`]) {
      await fs.mkdir(path.dirname(path.join(stage, relative)), { recursive: true }); await fs.writeFile(path.join(stage, relative), 'fixture; never execute');
    }
  }, { ...ctx, pythonIdentity: python.identity });
  const invocations = [];
  const execute = async (executable, args) => {
    invocations.push(executable);
    if (executable === python.executable && args.includes('-c')) return { code: 0, stdout: JSON.stringify(observed), stderr: '' };
    return { code: 0, stdout: executable.startsWith(ready.root + path.sep) ? '1.1.66' : '0.0.0', stderr: '' };
  };
  const beforePath = process.env.PATH;
  const result = await probe('batch', ctx.root, execute, { cacheRoot: ctx.cacheRoot });
  assert.equal(result.available, true, JSON.stringify(result));
  assert.ok(result.executable.startsWith(ready.root + path.sep));
  assert.equal(invocations.filter(file => !file.startsWith(ready.root + path.sep)).length, 1, 'Only the observed system Python identity is read outside the durable tool');
  assert.equal(process.env.PATH, beforePath);
});
```

## File: `test/setup-failure-isolation.test.mjs`

```javascript
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { setup } from '../src/setup.mjs';
import { prepareRuntime, runtimeLocation } from '../src/runtime-cache.mjs';

async function fixture(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'wrp-setup-isolation-'));
  t.after(async () => { assert.ok(path.basename(root).startsWith('wrp-setup-isolation-')); await fs.rm(root, { recursive: true, force: true }); });
  const project = path.join(root, 'project'), cacheRoot = path.join(root, 'runtime-cache');
  await fs.mkdir(project);
  return { root, project, cacheRoot };
}

test('Installer staging leaves stay short while final exact contract keys remain unchanged', async t => {
  const ctx = await fixture(t);
  for (const kind of ['node', 'blinter', 'shellcheck']) {
    const options = { cacheRoot: ctx.cacheRoot, pythonIdentity: 'fixed-test-python-identity' };
    const location = runtimeLocation(kind, options);
    assert.match(location.key, new RegExp(`^${kind}-[a-f0-9]{64}$`));
    await assert.rejects(prepareRuntime(kind, async stage => {
      assert.equal(path.dirname(stage), ctx.cacheRoot);
      assert.match(path.basename(stage), new RegExp(`^\\.staging-${kind}-[a-f0-9-]{36}$`));
      assert.ok(path.basename(stage).length <= 64, 'Do not append a 64-character runtime key to a venv staging path');
      assert.notEqual(stage, location.root);
      throw new Error('STOP_BEFORE_INSTALL');
    }, options), /STOP_BEFORE_INSTALL/);
    assert.deepEqual(await fs.readdir(ctx.cacheRoot), [], 'Failed staging does not leave a runtime or setup lock');
  }
});

test('A failed Blinter preparation preserves prior rows, probes actual availability and continues later tools', async t => {
  const ctx = await fixture(t);
  const selected = ['powershell', 'batch', 'bash', 'python'], probes = [];
  let ensurepipFailed = false;
  const execute = async (_executable, args) => {
    if (args.includes('-c')) return { code: 0, stdout: JSON.stringify({ version: [3, 13, 17], prefix: 'fixed-test-prefix', implementation: 'cpython', cacheTag: 'cpython-313', soabi: 'cp313-win32', freeThreaded: false }), stderr: '' };
    if (args.includes('venv')) { ensurepipFailed = true; return { code: 1, stdout: '', stderr: '[WinError 206] simulated ensurepip path failure' }; }
    throw new Error('No real process or installer may run in this regression');
  };
  const toolProbe = async type => { probes.push(type); return { available: true, version: 'independent legacy availability evidence' }; };
  const report = await setup(ctx.project, { types: selected, cacheRoot: ctx.cacheRoot, execute, toolProbe,
    fetchResource: async () => ({ ok: false, status: 503 }) });
  assert.deepEqual(report.results.map(item => item.type), selected);
  assert.deepEqual(probes, selected);
  const failed = report.results.find(item => item.type === 'batch');
  assert.equal(failed.available, true, 'Failed durable preparation must not erase successful existing-tool availability evidence');
  assert.equal(failed.setupSucceeded, false);
  assert.equal(failed.action, 'setup failed');
  assert.match(failed.setupError, /206|Python.*required/);
  assert.equal(report.results.at(-1).type, 'python');
  assert.equal(report.results.at(-1).setupSucceeded, true);
  assert.equal(report.exitCode, 2);
  // A Python-less portable host can fail the runtime precondition instead;
  // the same independent post-failure availability probe still must run.
  assert.ok(ensurepipFailed || /Python.*required/.test(failed.setupError));
});

test('Node preparation failure reports each selected family honestly without hiding available legacy tools', async t => {
  const ctx = await fixture(t), selected = ['lua', 'json', 'powershell'], probes = [];
  const execute = async (_executable, args) => {
    assert.equal(args[1], 'ci');
    return { code: 1, stdout: '', stderr: 'simulated pinned npm preparation failure' };
  };
  const toolProbe = async type => { probes.push(type); return { available: true, version: 'independent existing runtime' }; };
  const report = await setup(ctx.project, { types: selected, cacheRoot: ctx.cacheRoot, execute, toolProbe });
  assert.deepEqual(report.results.map(item => item.type), selected);
  assert.deepEqual(probes, selected);
  for (const type of ['lua', 'json']) {
    const result = report.results.find(item => item.type === type);
    assert.equal(result.available, true);
    assert.equal(result.setupSucceeded, false);
    assert.equal(result.action, 'setup failed');
    assert.match(result.setupError, /pinned.*preparation|Pinned dependency setup failed|npm-cli/i);
  }
  assert.equal(report.results.at(-1).setupSucceeded, true);
  assert.equal(report.exitCode, 2);
});
```

## File: `test/sql.test.mjs`

```javascript
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { scan, probe, packageRoot } from '../src/engine.mjs';
import { run } from '../src/process.mjs';
import { resolveLibrary } from '../src/runtime-cache.mjs';
import { verifySqlAssets } from '../src/sql-process.mjs';

async function fixture(t, files, dialect = 'postgresql') {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'wrp-sql-ŝ-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  for (const [name, content] of Object.entries(files)) await fs.writeFile(path.join(root, name), content);
  if (dialect !== undefined) await fs.writeFile(path.join(root, '.wrp-lint.json'), JSON.stringify({ version: 1, sqlDialect: dialect }));
  return root;
}
const sqlScan = root => scan(root, { types: ['sql'] });

test('PostgreSQL real grammar handles migration DDL, JSONB, quoted names and multiple statements without a DB', async t => {
  const root = await fixture(t, { 'migration.sql': `BEGIN;
CREATE TYPE "Provider" AS ENUM ('ONEDRIVE', 'DROPBOX');
CREATE TABLE "Connection" ("id" TEXT PRIMARY KEY, "provider" "Provider", "scopes" JSONB, "createdAt" TIMESTAMPTZ(3), "revision" INTEGER CHECK ("revision" >= 0));
CREATE INDEX "connection_idx" ON "Connection"("provider");
INSERT INTO "Connection" ("id", "scopes") VALUES ('ŝ😀', '{"read":true}'::jsonb);
COMMIT;
` });
  const report = await sqlScan(root);
  assert.equal(report.status, 'CLEAN', JSON.stringify(report));
  assert.equal(report.coverage[0].checkedFiles, 1);
});

test('SQL requires explicit dialect and never treats SQLite or unknown dialect as PostgreSQL', async t => {
  for (const dialect of [null, 'sqlite', 'mssql', 'unknown']) {
    const root = await fixture(t, { 'main.sql': 'SELECT 1;' }, dialect ?? undefined);
    if (dialect === null) await fs.rm(path.join(root, '.wrp-lint.json'), { force: true });
    const report = await sqlScan(root);
    assert.equal(report.status, 'INCOMPLETE');
    assert.equal(report.findings.length, 0);
    assert.ok(report.incomplete.some(message => /dialect/i.test(message)));
  }
});

test('PostgreSQL errors preserve Unicode filename and code-point cursor as UTF-16 line/column', async t => {
  const root = await fixture(t, { 'ŝ😀.sql': "SELECT 'ŝ😀';\r\nSELECT FROM;" });
  const report = await sqlScan(root);
  assert.equal(report.status, 'FINDINGS', JSON.stringify(report));
  const item = report.findings.find(item => item.rule === 'SQL-postgresql-syntax');
  assert.equal(item.file, 'ŝ😀.sql');
  assert.equal(item.line, 2);
  assert.equal(item.column, 12);
  await fs.writeFile(path.join(root, 'ŝ😀.sql'), 'SELECT 1;\nSELECT\0FROM;');
  const nul = await sqlScan(root);
  assert.equal(nul.findings[0].line, 2);
  assert.equal(nul.findings[0].column, 7);
});

test('PostgreSQL routine bodies are checked with the SQL and PLpgSQL parsers; other languages remain incomplete', async t => {
  const root = await fixture(t, { 'routines.sql': `CREATE FUNCTION f() RETURNS int LANGUAGE plpgsql AS $$BEGIN RETURN 1; END;$$;
DO $$BEGIN PERFORM 1; END$$;
CREATE FUNCTION g() RETURNS int LANGUAGE sql AS $$SELECT 1;$$;
` });
  assert.equal((await sqlScan(root)).status, 'CLEAN');
  await fs.writeFile(path.join(root, 'routines.sql'), 'DO $$BEGIN IF THEN END; END$$;');
  const bad = await sqlScan(root);
  assert.equal(bad.status, 'FINDINGS', JSON.stringify(bad));
  assert.ok(bad.findings.some(item => item.rule === 'SQL-plpgsql-syntax'));
  await fs.writeFile(path.join(root, 'routines.sql'), 'CREATE FUNCTION f() RETURNS int LANGUAGE plpgsql AS $$ BEGIN IF THEN RETURN 1; END IF; END $$;');
  const expression = await sqlScan(root);
  assert.equal(expression.status, 'FINDINGS', JSON.stringify(expression));
  assert.ok(expression.findings.some(item => item.rule === 'SQL-plpgsql-syntax' && item.message.includes('missing expression')));
  await fs.writeFile(path.join(root, 'routines.sql'), 'CREATE FUNCTION f() RETURNS int LANGUAGE sql AS $$SELECT FROM;$$;');
  assert.ok((await sqlScan(root)).findings.some(item => item.rule === 'SQL-routine-syntax'));
  await fs.writeFile(path.join(root, 'routines.sql'), 'CREATE FUNCTION f() RETURNS int LANGUAGE plpython3u AS $$return 1$$;');
  const unknown = await sqlScan(root);
  assert.equal(unknown.status, 'INCOMPLETE');
  assert.ok(unknown.incomplete.some(message => message.includes('plpython3u')));
});

test('SQL source, program commands, URLs and target configs remain inert text', async t => {
  const root = await fixture(t, {
    'inert.sql': "\uFEFF-- ŝ😀\r\nCOPY t FROM PROGRAM 'create SHOULD_NOT_EXIST';\r\nSELECT pg_read_file('/must-not-read'), dblink_connect('https://must-not-fetch.invalid');\r\nDROP TABLE t;\r\n",
    '.sql-lint.cjs': 'throw Error("Target configuration must never execute");',
    'package.json': '{"scripts":{"pretest":"create SHOULD_NOT_EXIST"}}'
  });
  const before = (await fs.readdir(root)).sort();
  const report = await sqlScan(root);
  assert.equal(report.status, 'CLEAN', JSON.stringify(report));
  assert.deepEqual((await fs.readdir(root)).sort(), before);
});

test('SQL parser failures remain per-file incomplete while independent SQL checks continue', async t => {
  const root = await fixture(t, { 'a.sql': 'SELECT 1;', 'b.sql': 'SELECT 2;' });
  let calls = 0;
  const report = await scan(root, {
    types: ['sql'], toolProbe: async () => ({ available: true }),
    execute: async (_executable, args, options) => {
      calls++;
      assert.equal(options.timeout, 30000);
      assert.equal(options.limit, 256 * 1024);
      assert.equal(args.at(-1), path.join(packageRoot, 'src/sql-worker.mjs'));
      assert.ok(!args.some(arg => arg.endsWith('.sql')));
      if (calls === 1) throw Error('Synthetic parser timeout');
      return { code: 0, stdout: '{"diagnostics":[]}', stderr: '' };
    }
  });
  assert.equal(calls, 2);
  assert.equal(report.status, 'INCOMPLETE');
  assert.equal(report.coverage[0].checkedFiles, 1);
  assert.equal(report.coverage[0].status, 'partial');
});

test('SQL CLI dialect flag and generated JSON configuration agree', async t => {
  const root = await fixture(t, { 'main.sql': 'SELECT 1;' });
  await fs.rm(path.join(root, '.wrp-lint.json'));
  const bin = path.join(packageRoot, 'bin/wrp-lint.mjs');
  const initial = await run(process.execPath, [bin, 'scan', root, '--types', 'sql', '--format', 'json']);
  assert.equal(initial.code, 2);
  const checked = await run(process.execPath, [bin, 'scan', root, '--types', 'sql', '--sql-dialect', 'postgresql', '--format', 'json']);
  assert.equal(checked.code, 0, checked.stdout);
  assert.equal((await run(process.execPath, [bin, 'init', root, '--types', 'sql', '--sql-dialect', 'postgresql'])).code, 0);
  assert.equal(JSON.parse(await fs.readFile(path.join(root, '.wrp-lint.json'), 'utf8')).sqlDialect, 'postgresql');
  assert.equal((await probe('sql', root)).available, true);
});

test('PLpgSQL dynamic SQL remains incomplete rather than falsely certifying generated query text', async t => {
  const root = await fixture(t, { 'dynamic.sql': "DO $$BEGIN EXECUTE 'SELECT FROM;'; END$$;" });
  const report = await sqlScan(root);
  assert.equal(report.status, 'INCOMPLETE', JSON.stringify(report));
  assert.ok(report.incomplete.some(message => message.includes('dynamic SQL')));
});

test('Pinned PostgreSQL asset hashes reject tampered package-local WASM before loading', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'wrp-sql-assets-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  for (const file of ['package.json', 'package-lock.json', 'npm-shrinkwrap.json']) await fs.copyFile(path.join(packageRoot, file), path.join(root, file));
  await fs.mkdir(path.join(root, 'node_modules'), { recursive: true });
  const wasm = resolveLibrary('libpg-query/wasm/libpg-query.wasm');
  await fs.cp(path.dirname(path.dirname(wasm)), path.join(root, 'node_modules/libpg-query'), { recursive: true });
  const options = { packageDirectory: root, cacheRoot: path.join(root, 'empty-cache') };
  assert.ok(verifySqlAssets(options).wasm.length > 0);
  await fs.appendFile(path.join(root, 'node_modules/libpg-query/wasm/libpg-query.wasm'), 'tampered');
  assert.throws(() => verifySqlAssets(options), /asset mismatch/);
});
```

## File: `test/toc-regressions.test.mjs`

```javascript
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { scan } from '../src/engine.mjs';

async function scanReferences(t, references) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'wrp-toc-boundaries-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  await fs.writeFile(path.join(root, 'Addon.toc'), [
    '## Interface: 110000', '## Title: Synthetic TOC fixture', ...references
  ].join('\n'));
  return scan(root, { types: ['toc'] });
}

test('TOC known tokens do not hide unsupported tokens in either order', async t => {
  const references = [
    'file_[Game]_[Family].lua',
    'file_[Family]_[Game].lua',
    'Locale_[TextLocale]_[Family].xml',
    'file_[gAmE]_[Family].lua',
    'file_[Family].lua'
  ];
  const report = await scanReferences(t, references);
  assert.equal(report.status, 'FINDINGS');
  for (const [index, reference] of references.entries()) {
    assert.ok(report.findings.some(item => item.rule === 'TOC-token' && item.line === index + 3 && item.message.includes(reference)));
  }
  assert.equal(report.notices.filter(item => item.includes('dynamic TOC path deferred')).length, 0);
  assert.ok(!report.findings.some(item => item.rule === 'TOC-missing-file'));
});

test('TOC known-token paths still reject static absolute and outside-root paths', async t => {
  const references = [
    'C:/outside/Game_[Game].lua',
    'C:\\outside\\Locale_[TextLocale].lua',
    '/outside/Game_[Game].lua',
    '//host/share/Game_[Game].lua',
    '../outside/Locale_[TextLocale].lua',
    '..\\outside\\Game_[Game].lua'
  ];
  const report = await scanReferences(t, references);
  assert.equal(report.status, 'FINDINGS');
  for (const [index] of references.entries()) {
    assert.ok(report.findings.some(item => item.rule === 'TOC-path' && item.line === index + 3));
  }
  assert.equal(report.notices.filter(item => item.includes('dynamic TOC path deferred')).length, 0);
  assert.ok(!report.findings.some(item => item.rule === 'TOC-missing-file'));
});

test('TOC reports both lexical path and unsupported-token failures before deferral', async t => {
  const report = await scanReferences(t, ['../outside/Game_[Game]_[Family].lua']);
  assert.equal(report.status, 'FINDINGS');
  for (const rule of ['TOC-path', 'TOC-token']) {
    assert.ok(report.findings.some(item => item.rule === rule && item.line === 3));
  }
  assert.equal(report.notices.filter(item => item.includes('dynamic TOC path deferred')).length, 0);
});

test('TOC bounded recognized-only tokens remain deferred without inventing target files', async t => {
  const references = [
    'Game_[Game].lua',
    'Locale_[TextLocale].xml',
    'nested/Game_[gAmE]_[TextLocale].lua [AllowLoadGameType mainline]',
    'nested/../Locale_[TextLocale].lua'
  ];
  const report = await scanReferences(t, references);
  assert.equal(report.status, 'CLEAN', JSON.stringify(report));
  assert.equal(report.notices.filter(item => item.includes('dynamic TOC path deferred')).length, references.length);
  assert.equal(report.findings.length, 0);
});
```
