import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import { packageRoot } from '../src/engine.mjs';
import { run } from '../src/process.mjs';

const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'wrp fresh runtime æøå '));
const plugin = path.join(temporary, 'plugin copy'), target = path.join(temporary, 'target project');
const checks = [];
try {
  await fs.mkdir(plugin); await fs.mkdir(target);
  for (const name of ['bin', 'src', 'adapters', 'config']) await fs.cp(path.join(packageRoot, name), path.join(plugin, name), { recursive: true });
  for (const name of ['package.json', 'package-lock.json', 'npm-shrinkwrap.json']) await fs.copyFile(path.join(packageRoot, name), path.join(plugin, name));
  await fs.writeFile(path.join(target, 'main.lua'), 'local message = "æøå"\r\nreturn message\r\n');
  await fs.writeFile(path.join(target, 'index.html'), '<!doctype html><html lang="da"><head><title>æøå</title></head><body><p>Test</p></body></html>\r\n');
  await fs.writeFile(path.join(target, 'style.css'), 'body { color: red; }\r\n');
  await fs.writeFile(path.join(target, '.npmrc'), 'registry=https://must-not-be-contacted.invalid/\nignore-scripts=false\n');
  const cli = path.join(plugin, 'bin/wrp-lint.mjs');
  const step = async (name, args, expected) => {
    const result = await run(process.execPath, [cli, ...args, '--format', 'json'], { cwd: target, timeout: 180000 });
    assert.equal(result.code, expected, `${name}: ${result.stdout}\n${result.stderr}`);
    const report = JSON.parse(result.stdout);
    checks.push({ name, exitCode: result.code, status: report.status || (result.code === 0 ? 'AVAILABLE' : 'UNAVAILABLE'), results: report.results?.map(({ type, action, available }) => ({ type, action, available })) });
    return report;
  };
  const missingDoctor = await step('fresh doctor missing dependency', ['doctor', target, '--types', 'lua,html,css'], 2);
  for (const type of ['lua', 'html', 'css']) assert.equal(missingDoctor.results.find(item => item.type === type)?.available, false);
  await step('fresh scan incomplete', ['scan', target, '--types', 'lua,html,css'], 2);
  await step('explicit isolated bootstrap', ['setup', target, '--types', 'lua,html,css'], 0);
  await step('bootstrapped doctor', ['doctor', target, '--types', 'lua,html,css'], 0);
  const scanned = await step('bootstrapped scan', ['scan', target, '--types', 'lua,html,css'], 0);
  for (const type of ['lua', 'html', 'css']) assert.equal(scanned.coverage.find(item => item.type === type)?.status, 'checked');
  assert.deepEqual((await fs.readdir(target)).sort(), ['.npmrc', 'index.html', 'main.lua', 'style.css']);
  const report = { atUtc: new Date().toISOString(), status: 'PASS', originalDependenciesBorrowed: false, targetFilesChanged: false, checks };
  await fs.mkdir(path.join(packageRoot, 'outputs'), { recursive: true });
  await fs.writeFile(path.join(packageRoot, 'outputs/fresh-runtime-smoke.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
} finally { await fs.rm(temporary, { recursive: true, force: true }); }
