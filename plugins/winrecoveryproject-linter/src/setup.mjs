import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { run, findExecutable } from './process.mjs';
import { inventory, readConfig, probe, packageRoot, pythonRuntime } from './engine.mjs';
import { prepareRuntime } from './runtime-cache.mjs';

const shellcheckUrl = 'https://github.com/koalaman/shellcheck/releases/download/v0.11.0/shellcheck-v0.11.0.zip';
const shellcheckSha256 = '8a4e35ab0b331c85d73567b12f2a444df187f483e5079ceffa6bda1faa2e740e';

export async function setup(root, { detected = false, types, cacheRoot, execute = run, fetchResource = fetch } = {}) {
  if (!detected && !types?.length) throw new Error('setup requires --detected or --types <comma-separated IDs>');
  const config = await readConfig(root);
  const inv = await inventory(root, config);
  const selected = types || [...new Set(inv.files.map(file => file.type).filter(Boolean))].filter(type => !config.types || config.types.includes(type));
  const results = [];
  const prepared = {};
  if (selected.some(type => ['javascript', 'typescript', 'lua', 'json', 'markdown', 'xml', 'html', 'css', 'yaml', 'toml'].includes(type))) {
    prepared.node = await prepareRuntime('node', async (stage, contract) => {
      const npm = path.join(path.dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js');
      try { await fs.access(npm); } catch { throw new Error('Node npm-cli.js is unavailable beside Node. Install Node with npm, then rerun explicit setup.'); }
      await fs.writeFile(path.join(stage, 'package.json'), JSON.stringify({ name: contract.pkg.name, version: contract.pkg.version, private: true, dependencies: contract.pkg.dependencies }) + '\n');
      for (const name of ['package-lock.json', 'npm-shrinkwrap.json']) await fs.copyFile(path.join(packageRoot, name), path.join(stage, name));
      const install = await execute(process.execPath, [npm, 'ci', '--ignore-scripts', '--no-audit', '--no-fund', '--registry=https://registry.npmjs.org/', `--userconfig=${path.join(packageRoot, 'config/npmrc')}`, `--globalconfig=${path.join(packageRoot, 'config/global-npmrc')}`], { cwd: stage, timeout: 180000 });
      if (install.code !== 0) throw new Error(`Pinned dependency setup failed: ${install.stderr || install.stdout}`);
    }, { cacheRoot });
  }
  for (const type of selected) {
    if (type === 'batch') {
      const python = await pythonRuntime(inv.root, execute);
      prepared.batch = await prepareRuntime('blinter', async stage => {
        const venv = await execute(python.executable, ['-I', '-m', 'venv', '--copies', stage], { cwd: packageRoot, timeout: 120000 });
        if (venv.code !== 0) throw new Error(venv.stderr);
        const executable = path.join(stage, process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python');
        const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith('PIP_')));
        env.PIP_CONFIG_FILE = process.platform === 'win32' ? 'NUL' : '/dev/null';
        const install = await execute(executable, ['-I', '-m', 'pip', '--isolated', 'install', '--index-url=https://pypi.org/simple', '--disable-pip-version-check', '--no-cache-dir', '--no-input', '--only-binary=:all:', '--require-hashes', '-r', fileURLToPath(new URL('../config/blinter-requirements.txt', import.meta.url))], { cwd: packageRoot, timeout: 180000, env });
        if (install.code !== 0) throw new Error(install.stderr || install.stdout);
      }, { cacheRoot, pythonIdentity: python.identity });
    } else if (type === 'bash' && process.platform === 'win32') {
      if (!findExecutable('bash', inv.root)) { results.push({ type, action: 'manual runtime required', ...await probe(type, inv.root) }); continue; }
      const pwsh = findExecutable('pwsh', inv.root);
      if (!pwsh) throw new Error('pwsh is required to extract the verified ShellCheck archive');
      prepared.bash = await prepareRuntime('shellcheck', async destination => {
      const response = await fetchResource(shellcheckUrl, { signal: AbortSignal.timeout(60000) });
      if (!response.ok) throw new Error(`ShellCheck download HTTP ${response.status}`);
      if (Number(response.headers.get('content-length')) > 30 * 1024 * 1024) throw new Error('ShellCheck archive too large');
      const chunks = []; let length = 0;
      for await (const chunk of response.body) { length += chunk.length; if (length > 30 * 1024 * 1024) throw new Error('ShellCheck archive too large'); chunks.push(chunk); }
      const data = Buffer.concat(chunks);
      if (data.length > 30 * 1024 * 1024 || createHash('sha256').update(data).digest('hex') !== shellcheckSha256) throw new Error('ShellCheck archive SHA-256 mismatch');
      const archive = path.join(destination, 'shellcheck-v0.11.0.zip');
      await fs.writeFile(archive, data);
      const extract = await execute(pwsh, ['-NoProfile', '-NonInteractive', '-File', path.join(packageRoot, 'adapters/extract-shellcheck.ps1'), archive, destination], { cwd: packageRoot });
      if (extract.code !== 0) throw new Error(extract.stderr);
      await fs.unlink(archive);
      }, { cacheRoot });
    }
    const state = await probe(type, inv.root, execute, { cacheRoot });
    const runtime = prepared[type] || (['javascript', 'typescript', 'lua', 'json', 'markdown', 'xml', 'html', 'css', 'yaml', 'toml'].includes(type) ? prepared.node : undefined);
    results.push({ type, action: runtime ? (runtime.reused ? 'verified durable runtime reused' : 'prepared durable runtime') : (state.available ? 'already available' : 'manual runtime required'), runtimeRoot: runtime?.root, ...state });
  }
  return { selected, results, exitCode: results.some(item => !item.available) ? 2 : 0, note: 'Free public dependencies only. Explicit setup prepares a verified per-user runtime outside the plugin cache. No global configuration or target source changes.' };
}
