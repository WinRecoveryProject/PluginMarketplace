import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import { packageRoot } from '../src/engine.mjs';
import { run, findExecutable } from '../src/process.mjs';

const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'wrp fresh runtime æøå '));
const plugin = path.join(temporary, 'extracted native ZIP'), target = path.join(temporary, 'target project');
const checks = [];
try {
  await fs.mkdir(target);
  const python = findExecutable('python');
  assert.ok(python, 'Python >=3.11 is required for native ZIP packaging');
  const builder = path.join(packageRoot, 'scripts/package-native.py');
  let artifact;
  if (process.argv[2]) {
    const inspected = await run(python, ['-I', builder, '--inspect', path.resolve(process.argv[2])]);
    assert.equal(inspected.code, 0, inspected.stderr);
    artifact = { ...JSON.parse(inspected.stdout), archive: path.resolve(process.argv[2]) };
  } else {
    const built = await run(python, ['-I', builder]);
    assert.equal(built.code, 0, built.stderr);
    artifact = JSON.parse(built.stdout);
    artifact.archive = path.join(packageRoot, artifact.archive);
  }
  const extracted = await run(python, ['-I', builder, '--extract', artifact.archive, '--destination', plugin]);
  assert.equal(extracted.code, 0, extracted.stderr);
  const extraction = JSON.parse(extracted.stdout);
  assert.equal(extraction.sha256, artifact.sha256);
  assert.ok(extraction.files.some(item => item.path === 'package-lock.json'));
  assert.ok(extraction.files.some(item => item.path === 'npm-shrinkwrap.json'));
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
  const report = { atUtc: new Date().toISOString(), status: 'PASS', artifact: { format: artifact.format, archive: path.basename(artifact.archive), sha256: artifact.sha256, includedFileCount: artifact.includedFileCount, extractionVerified: true }, originalDependenciesBorrowed: false, targetFilesChanged: false, checks };
  await fs.mkdir(path.join(packageRoot, 'outputs'), { recursive: true });
  await fs.writeFile(path.join(packageRoot, 'outputs/fresh-runtime-smoke.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
} finally { await fs.rm(temporary, { recursive: true, force: true }); }
