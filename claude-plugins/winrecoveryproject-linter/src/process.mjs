import { spawn, spawnSync } from 'node:child_process';
import { accessSync, constants, realpathSync } from 'node:fs';
import path from 'node:path';

export class ToolTimeoutError extends Error {
  constructor(timeout) {
    super(`Tool timed out after ${timeout} ms`);
  }
}

// No shell and no command strings. Process output is bounded in bytes, including stderr.
export function run(executable, args, { cwd, input, timeout = 30000, limit = 4 * 1024 * 1024, env = process.env } = {}) {
  return new Promise((resolve, reject) => {
    const clean = { ...env };
    for (const name of ['BASH_ENV', 'ENV', 'NODE_OPTIONS', 'PYTHONPATH', 'PYTHONHOME', 'GIT_EXTERNAL_DIFF']) delete clean[name];
    let child;
    try { child = spawn(executable, args, { cwd, env: clean, shell: false, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] }); }
    catch (error) { reject(error); return; }
    let stdout = '', stderr = '', bytes = 0, failure;
    const timer = setTimeout(() => { failure ??= new ToolTimeoutError(timeout); child.kill(); }, timeout);
    for (const [stream, name] of [[child.stdout, 'stdout'], [child.stderr, 'stderr']]) {
      stream.setEncoding('utf8');
      stream.on('data', chunk => {
        bytes += Buffer.byteLength(chunk);
        if (bytes > limit) { failure ??= new Error(`Tool output exceeded ${limit} bytes`); child.kill(); return; }
        if (name === 'stdout') stdout += chunk; else stderr += chunk;
      });
    }
    child.on('error', error => { clearTimeout(timer); reject(error); });
    child.on('close', (code, signal) => { clearTimeout(timer); if (failure) reject(failure); else if (signal) reject(new Error(`Tool terminated: ${signal}`)); else resolve({ code, stdout, stderr }); });
    child.stdin.on('error', () => {});
    child.stdin.end(input);
  });
}

export function inside(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
}

function usableExecutable(candidate, forbiddenRoot) {
  try {
    if (!path.isAbsolute(candidate)) return undefined;
    const resolved = realpathSync(candidate);
    if (forbiddenRoot && inside(forbiddenRoot, resolved)) return undefined;
    accessSync(resolved, constants.X_OK);
    return resolved;
  } catch { /* A missing candidate is expected during discovery. */ }
}

function* executableCandidates(name, forbiddenRoot) {
  const onWindows = process.platform === 'win32';
  const extensions = onWindows ? ['.exe', ''] : [''];
  for (const directory of (process.env.PATH || '').split(path.delimiter).filter(Boolean)) {
    for (const extension of extensions) yield path.join(directory, name + extension);
  }
  if (!onWindows) return;
  if (name === 'bash') {
    const git = findExecutable('git', forbiddenRoot);
    if (git && path.basename(git).toLowerCase() === 'git.exe') {
      const directory = path.dirname(git);
      if (['cmd', 'bin'].includes(path.basename(directory).toLowerCase())) {
        const prefix = path.dirname(directory);
        const root = /^mingw(?:32|64)$/i.test(path.basename(prefix)) ? path.dirname(prefix) : prefix;
        yield path.join(root, 'bin', 'bash.exe');
      }
    }
    yield 'C:/Program Files/Git/bin/bash.exe';
  }
  if (name === 'pwsh') {
    const inbox = usableExecutable(path.join(process.env.SystemRoot || '',
      'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe'), forbiddenRoot);
    if (!inbox) return;
    // Query only the current user's registered Microsoft Store PowerShell package.
    const query = [
      "$ErrorActionPreference = 'Stop'",
      '[Console]::OutputEncoding = [Text.UTF8Encoding]::new($false)',
      "Import-Module -Name (Join-Path $PSHOME 'Modules/Appx/Appx.psd1')",
      "Appx\\Get-AppxPackage -Name Microsoft.PowerShell | Where-Object PackageFamilyName -eq 'Microsoft.PowerShell_8wekyb3d8bbwe' | ForEach-Object { $_.InstallLocation }",
    ].join('\n');
    const result = spawnSync(inbox, ['-NoLogo', '-NoProfile', '-NonInteractive', '-Command', query], {
      cwd: path.dirname(inbox), encoding: 'utf8', shell: false, windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'], timeout: 10000, maxBuffer: 64 * 1024,
    });
    if (result.status === 0) {
      for (const location of result.stdout.split(/\r?\n/).map(line => line.trim())) {
        if (path.isAbsolute(location)) yield path.join(location, 'pwsh.exe');
      }
    }
  }
}

export function findExecutable(name, forbiddenRoot) {
  const override = process.env[`WRP_LINT_${name.toUpperCase()}`];
  if (override) return usableExecutable(override, forbiddenRoot);
  for (const candidate of executableCandidates(name, forbiddenRoot)) {
    const resolved = usableExecutable(candidate, forbiddenRoot);
    if (resolved) return resolved;
  }
}
