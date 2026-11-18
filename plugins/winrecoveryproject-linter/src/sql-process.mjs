import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { resolveLibrary } from './runtime-cache.mjs';

const adapter = fileURLToPath(new URL('./sql-worker.mjs', import.meta.url));
const assets = [
  ['libpg-query', 'bc7cd18b2748615eaf6f0be57f1fd91f6fdbf57494b602f2306552d445bdcd9c'],
  ['libpg-query/wasm/libpg-query.js', '0be822ba6736432b6ff197c722c9ee522285cd2baf1e9939555b4d72f4cfd811'],
  ['libpg-query/wasm/libpg-query.wasm', '355c489d8b0bf2bac28b48408f656e818852d7000e1e66a67503ad2bc7cc6062']
];
export function verifySqlAssets(options) {
  let wasm;
  for (const [specifier, expected] of assets) {
    const bytes = fs.readFileSync(resolveLibrary(specifier, options));
    if (createHash('sha256').update(bytes).digest('hex') !== expected) throw new Error(`Pinned PostgreSQL asset mismatch: ${specifier}`);
    if (specifier.endsWith('.wasm')) wasm = bytes;
  }
  return { wasm };
}
export async function analyzeSql(files, { execute, executable, cwd }) {
  const diagnostics = [];
  for (const { file, content } of files) {
    try {
      const result = await execute(executable, ['--max-old-space-size=128', adapter], {
        cwd, input: JSON.stringify({ content }), timeout: 30000, limit: 256 * 1024
      });
      if (result.code !== 0) throw new Error('PostgreSQL parser process failed');
      const data = JSON.parse(result.stdout);
      if (!Array.isArray(data.diagnostics) || data.diagnostics.length > 64) throw new Error('Invalid SQL parser report');
      for (const item of data.diagnostics) {
        if (!item || typeof item.rule !== 'string' || !/^SQL-[a-z-]+$/.test(item.rule) ||
            typeof item.message !== 'string' || item.message.length > 4096 ||
            !Number.isInteger(item.line) || item.line < 1 || !Number.isInteger(item.column) || item.column < 1 ||
            (item.incomplete !== undefined && item.incomplete !== true)) throw new Error('Invalid SQL parser diagnostic');
      }
      diagnostics.push(...data.diagnostics.map(item => ({ ...item, file, severity: 'error' })));
    } catch (error) {
      diagnostics.push({ file, rule: 'SQL-parser', message: `PostgreSQL check incomplete: ${String(error.message).slice(0, 1024)}`, line: 1, column: 1, severity: 'error', incomplete: true });
    }
  }
  return diagnostics;
}
