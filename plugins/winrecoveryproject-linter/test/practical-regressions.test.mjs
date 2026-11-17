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
