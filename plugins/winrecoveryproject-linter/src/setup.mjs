import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { run, findExecutable } from './process.mjs';
import { inventory, readConfig, probe, packageRoot, batchPython } from './engine.mjs';

const shellcheckUrl = 'https://github.com/koalaman/shellcheck/releases/download/v0.11.0/shellcheck-v0.11.0.zip';
const shellcheckSha256 = '8a4e35ab0b331c85d73567b12f2a444df187f483e5079ceffa6bda1faa2e740e';

async function localDirectory(relative) {
  let directory = packageRoot;
  for (const part of relative.split('/')) {
    directory = path.join(directory, part);
    try { const stat = await fs.lstat(directory); if (stat.isSymbolicLink() || !stat.isDirectory()) throw new Error(`Unsafe setup directory: ${directory}`); }
    catch (error) { if (error.code !== 'ENOENT') throw error; await fs.mkdir(directory); }
  }
  return directory;
}

export async function setup(root, { detected = false, types } = {}) {
  if (!detected && !types?.length) throw new Error('setup requires --detected or --types <comma-separated IDs>');
  const config = await readConfig(root);
  const inv = await inventory(root, config);
  const selected = types || [...new Set(inv.files.map(file => file.type).filter(Boolean))].filter(type => !config.types || config.types.includes(type));
  const results = [];
  const needCore = [];
  for (const type of selected) if (!(await probe(type, inv.root)).available && ['javascript', 'typescript', 'lua', 'json', 'markdown', 'xml', 'html', 'css', 'yaml', 'toml'].includes(type)) needCore.push(type);
  if (needCore.length) {
    const npm = path.join(path.dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js');
    try { await fs.access(npm); } catch { throw new Error('Node npm-cli.js is unavailable beside Node. Install Node with npm, then rerun explicit setup.'); }
    const install = await run(process.execPath, [npm, 'ci', '--ignore-scripts', '--no-audit', '--no-fund', '--registry=https://registry.npmjs.org/', `--userconfig=${path.join(packageRoot, 'config/npmrc')}`, `--globalconfig=${path.join(packageRoot, 'config/global-npmrc')}`], { cwd: packageRoot, timeout: 180000 });
    if (install.code !== 0) throw new Error(`Pinned dependency setup failed: ${install.stderr || install.stdout}`);
  }
  for (const type of selected) {
    let state = await probe(type, inv.root);
    if (state.available) { results.push({ type, action: 'already available', ...state }); continue; }
    if (type === 'batch') {
      const python = findExecutable('python', inv.root);
      if (!python) throw new Error('Python 3.11–3.15 is required to set up isolated Blinter');
      const version = await run(python, ['-I', '-c', 'import sys; assert (3,11) <= sys.version_info[:2] < (3,16), "Python 3.11–3.15 required"'], { cwd: packageRoot });
      if (version.code !== 0) throw new Error(version.stderr);
      const destination = await localDirectory('.tools/blinter');
      const venv = await run(python, ['-I', '-m', 'venv', destination], { cwd: packageRoot, timeout: 120000 });
      if (venv.code !== 0) throw new Error(venv.stderr);
      const install = await run(batchPython(), ['-I', '-m', 'pip', 'install', '--disable-pip-version-check', '--no-input', '--only-binary=:all:', '--require-hashes', '-r', fileURLToPath(new URL('../config/blinter-requirements.txt', import.meta.url))], { cwd: packageRoot, timeout: 180000 });
      if (install.code !== 0) throw new Error(install.stderr || install.stdout);
    } else if (type === 'bash' && process.platform === 'win32') {
      if (!findExecutable('bash', inv.root)) { results.push({ type, action: 'manual runtime required', ...state }); continue; }
      const pwsh = findExecutable('pwsh', inv.root);
      if (!pwsh) throw new Error('pwsh is required to extract the verified ShellCheck archive');
      const response = await fetch(shellcheckUrl, { signal: AbortSignal.timeout(60000) });
      if (!response.ok) throw new Error(`ShellCheck download HTTP ${response.status}`);
      if (Number(response.headers.get('content-length')) > 30 * 1024 * 1024) throw new Error('ShellCheck archive too large');
      const chunks = []; let length = 0;
      for await (const chunk of response.body) { length += chunk.length; if (length > 30 * 1024 * 1024) throw new Error('ShellCheck archive too large'); chunks.push(chunk); }
      const data = Buffer.concat(chunks);
      if (data.length > 30 * 1024 * 1024 || createHash('sha256').update(data).digest('hex') !== shellcheckSha256) throw new Error('ShellCheck archive SHA-256 mismatch');
      const destination = await localDirectory('.tools/shellcheck');
      const archive = path.join(destination, 'shellcheck-v0.11.0.zip');
      await fs.writeFile(archive, data);
      const extract = await run(pwsh, ['-NoProfile', '-NonInteractive', '-File', path.join(packageRoot, 'adapters/extract-shellcheck.ps1'), archive, destination], { cwd: packageRoot });
      if (extract.code !== 0) throw new Error(extract.stderr);
      await fs.unlink(archive);
    } else {
      results.push({ type, action: 'manual runtime required', ...state }); continue;
    }
    state = await probe(type, inv.root);
    results.push({ type, action: state.available ? 'installed locally' : 'setup failed', ...state });
  }
  return { selected, results, exitCode: results.some(item => !item.available) ? 2 : 0, note: 'Free public dependencies only. No global configuration or target source changes.' };
}
