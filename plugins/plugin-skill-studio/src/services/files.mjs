import fs from 'node:fs/promises';
import path from 'node:path';

export const ignored = new Set(['.git', '.hg', '.svn', 'node_modules', '.venv', '__pycache__']);
export function inside(root, file) {
  const relative = path.relative(root, file);
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
}
export async function walkFiles(input, options = {}) {
  const supplied = path.resolve(input);
  const errors = [], files = [];
  const maximum = options.maxFiles ?? 10000;
  if (!Number.isSafeInteger(maximum) || maximum < 1) throw new Error('maxFiles must be positive');
  let start;
  try { start = await fs.lstat(supplied); }
  catch (error) { return { root: supplied, files: [], errors: [{ path: '.', message: `Target unavailable: ${error.code ?? error.message}` }] }; }
  const root = start.isDirectory() ? supplied : path.dirname(supplied);
  const realRoot = await fs.realpath(root);
  let stopped = false;
  async function visit(file) {
    if (stopped) return;
    let stat, real;
    try {
      stat = await fs.lstat(file);
      real = await fs.realpath(file);
      if (stat.isSymbolicLink() || !inside(realRoot, real)) throw new Error('symbolic link or reparse escape is not accepted');
      if (stat.isDirectory()) {
        const members = await fs.readdir(file, { withFileTypes: true });
        for (const member of members.sort((a,b) => a.name.localeCompare(b.name))) {
          if (member.isDirectory() && ignored.has(member.name)) continue;
          await visit(path.join(file, member.name));
        }
      } else if (stat.isFile()) {
        if (files.length >= maximum) { stopped = true; throw new Error('file count limit reached'); }
        files.push({ absolute: file, relative: path.relative(root, file).split(path.sep).join('/'), stat });
      } else throw new Error('special files are not accepted');
    } catch (error) { errors.push({ path: path.relative(root, file).split(path.sep).join('/'), message: error.message }); }
  }
  await visit(supplied);
  return { root, files, errors };
}

export async function readBounded(file, maxBytes = 2 * 1024 * 1024) {
  const before = await fs.lstat(file);
  if (!before.isFile() || before.isSymbolicLink()) throw new Error('not a regular file');
  if (before.size > maxBytes) throw new Error('file size limit exceeded');
  const handle = await fs.open(file, 'r');
  try {
    const opened = await handle.stat();
    if (opened.dev !== before.dev || opened.ino !== before.ino) throw new Error('file changed while opening');
    const currentPath = await fs.lstat(file);
    if (currentPath.isSymbolicLink() || currentPath.dev !== before.dev || currentPath.ino !== before.ino) throw new Error('file path changed while opening');
    const buffer = Buffer.alloc(Math.min(maxBytes + 1, opened.size + 1));
    let bytesRead = 0;
    while (bytesRead < buffer.length) {
      const chunk = await handle.read(buffer, bytesRead, buffer.length - bytesRead, bytesRead);
      if (!chunk.bytesRead) break;
      bytesRead += chunk.bytesRead;
    }
    const after = await handle.stat();
    if (bytesRead > maxBytes || after.size !== before.size || after.mtimeMs !== before.mtimeMs) throw new Error('file changed while reading');
    return new TextDecoder('utf-8', { fatal: true }).decode(buffer.subarray(0, bytesRead));
  } finally { await handle.close(); }
}
