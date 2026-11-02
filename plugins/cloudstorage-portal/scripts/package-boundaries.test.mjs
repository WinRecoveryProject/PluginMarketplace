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
