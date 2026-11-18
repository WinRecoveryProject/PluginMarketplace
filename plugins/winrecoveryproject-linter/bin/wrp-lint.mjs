#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { catalog } from '../src/catalog.mjs';

const help = `WinRecoveryProjectLinter 0.1.2 — local, read-only scanning, 0 kr services\n\nUsage: wrp-lint <command> [root] [options]\n  init                 Create .wrp-lint.json without overwriting\n  doctor               Check only detected/selected adapter availability\n  scan                 Scan detected/selected source types\n  list-linters         Describe adapters and limits\n  setup --detected     Explicitly install only needed supported local tools\n\nOptions: --types powershell,lua,...  --format text|json  --detected\nExit: 0 CLEAN, 1 FINDINGS, 2 INCOMPLETE (takes precedence).\nNo project scripts/configuration execute. No scan downloads or source writes.\nPrepare the pinned per-user runtime explicitly: wrp-lint setup <root> --detected\n`;

function parse(args) {
  const value = { command: args.shift(), root: process.cwd(), format: 'text' };
  let rootSeen = false;
  while (args.length) {
    const item = args.shift();
    if (item === '--format') { value.format = args.shift(); if (!['json', 'text'].includes(value.format)) throw new Error('Expected --format text|json'); }
    else if (item === '--types') { const types = args.shift(); if (!types) throw new Error('--types needs a value'); value.types = [...new Set(types.split(','))]; if (value.types.some(type => !catalog.some(entry => entry.id === type))) throw new Error('Unknown type; use list-linters'); }
    else if (item === '--detected') value.detected = true;
    else if (item.startsWith('-')) throw new Error(`Unknown option: ${item}`);
    else { if (rootSeen) throw new Error('Only one root may be supplied'); value.root = path.resolve(item); rootSeen = true; }
  }
  return value;
}

function print(value, format) {
  if (format === 'json') { console.log(JSON.stringify(value, null, 2)); return; }
  if (Array.isArray(value)) { for (const item of value) console.log(`${item.id}: ${item.extensions.join(', ')} — ${item.tool}\n  ${item.scope}`); return; }
  if (value.status) console.log(`${value.status} — ${value.findings?.length || 0} findings, ${value.incomplete?.length || 0} incomplete checks`);
  for (const item of value.coverage || []) console.log(`  ${item.type}: ${item.status} (${item.files} files) — ${item.tool}${item.detail ? ': ' + item.detail : ''}`);
  for (const item of value.findings || []) console.log(`${item.file}:${item.line}:${item.column} ${item.severity} ${item.rule} ${item.message}`);
  for (const item of value.incomplete || []) console.log(`INCOMPLETE: ${item}`);
  for (const item of value.notices || []) console.log(`NOTE: ${item}`);
  if (value.results) for (const item of value.results) console.log(`${item.type}: ${item.action || (item.available ? 'available' : 'unavailable')} — ${item.reason || JSON.stringify(item.version)}`);
  if (value.message) console.log(value.message);
}

let options;
try {
  if (!process.argv[2] || ['help', '--help', '-h'].includes(process.argv[2])) { console.log(help); }
  else if (['--version', '-v'].includes(process.argv[2])) console.log('0.1.2');
  else {
    options = parse(process.argv.slice(2));
    const { command, root, types, format } = options;
    if (command === 'list-linters') print(catalog, format);
    else {
      const engine = await import('../src/engine.mjs');
      if (command === 'init') {
        const value = { version: 1, ...(types ? { types } : {}), exclude: [] };
        await fs.writeFile(path.join(root, engine.configName), JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
        print({ message: `Created ${path.join(root, engine.configName)}` }, format);
      } else if (command === 'scan') {
        const report = await engine.scan(root, { types }); print(report, format); process.exitCode = report.exitCode;
      } else if (command === 'doctor') {
        const config = await engine.readConfig(root), inv = await engine.inventory(root, config);
        const selected = types || config.types || [...new Set(inv.files.map(file => file.type).filter(Boolean))];
        const results = [];
        for (const type of selected) results.push({ type, ...await engine.probe(type, inv.root) });
        const exitCode = results.some(item => !item.available) || inv.incomplete.length || !selected.length ? 2 : 0;
        print({ results, exitCode, message: selected.length ? 'Availability only; doctor does not certify source correctness.' : 'No source types detected.' }, format); process.exitCode = exitCode;
      } else if (command === 'setup') {
        const { setup } = await import('../src/setup.mjs');
        const result = await setup(root, options); print(result, format); process.exitCode = result.exitCode;
      } else throw new Error(`Unknown command: ${command}`);
    }
  }
} catch (error) {
  const report = { status: 'INCOMPLETE', exitCode: 2, error: error.message, ...(error.code === 'ERR_MODULE_NOT_FOUND' ? { remedy: 'Verify this exact plugin package if a bundled module is missing. Use wrp-lint setup <project-root> --detected for missing pinned tools; scan never installs them.' } : {}) };
  if (options?.format === 'json') console.log(JSON.stringify(report, null, 2)); else console.error(`INCOMPLETE: ${report.error}${report.remedy ? '\n' + report.remedy : ''}`);
  process.exitCode = 2;
}
