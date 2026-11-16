import { spawn } from 'node:child_process';
import { accessSync, constants, realpathSync } from 'node:fs';
import path from 'node:path';

// No shell and no command strings. Process output is bounded in bytes, including stderr.
export function run(executable, args, { cwd, input, timeout = 30000, limit = 4 * 1024 * 1024, env = process.env } = {}) {
  return new Promise((resolve, reject) => {
    const clean = { ...env };
    for (const name of ['BASH_ENV', 'ENV', 'NODE_OPTIONS', 'PYTHONPATH', 'PYTHONHOME', 'GIT_EXTERNAL_DIFF']) delete clean[name];
    let child;
    try { child = spawn(executable, args, { cwd, env: clean, shell: false, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] }); }
    catch (error) { reject(error); return; }
    let stdout = '', stderr = '', bytes = 0, failure;
    const timer = setTimeout(() => { failure = new Error(`Tool timed out after ${timeout} ms`); child.kill(); }, timeout);
    for (const [stream, name] of [[child.stdout, 'stdout'], [child.stderr, 'stderr']]) {
      stream.setEncoding('utf8');
      stream.on('data', chunk => {
        bytes += Buffer.byteLength(chunk);
        if (bytes > limit) { failure = new Error(`Tool output exceeded ${limit} bytes`); child.kill(); return; }
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

export function findExecutable(name, forbiddenRoot) {
  const override = process.env[`WRP_LINT_${name.toUpperCase()}`];
  const candidates = override ? [override] : (process.env.PATH || '').split(path.delimiter).filter(Boolean).flatMap(dir => {
    const extensions = process.platform === 'win32' ? ['.exe', ''] : [''];
    return extensions.map(ext => path.join(dir, name + ext));
  });
  if (!override && process.platform === 'win32' && name === 'bash') candidates.push('C:/Program Files/Git/bin/bash.exe');
  for (const candidate of candidates) {
    try {
      if (!path.isAbsolute(candidate)) continue;
      const resolved = realpathSync(candidate);
      if (forbiddenRoot && inside(forbiddenRoot, resolved)) continue;
      accessSync(resolved, constants.X_OK);
      return resolved;
    } catch { /* A missing candidate is expected during PATH discovery. */ }
  }
  return undefined;
}
