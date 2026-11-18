import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { scan, probe, packageRoot } from '../src/engine.mjs';
import { run } from '../src/process.mjs';
import { resolveLibrary } from '../src/runtime-cache.mjs';
import { verifySqlAssets } from '../src/sql-process.mjs';

async function fixture(t, files, dialect = 'postgresql') {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'wrp-sql-ŝ-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  for (const [name, content] of Object.entries(files)) await fs.writeFile(path.join(root, name), content);
  if (dialect !== undefined) await fs.writeFile(path.join(root, '.wrp-lint.json'), JSON.stringify({ version: 1, sqlDialect: dialect }));
  return root;
}
const sqlScan = root => scan(root, { types: ['sql'] });

test('PostgreSQL real grammar handles migration DDL, JSONB, quoted names and multiple statements without a DB', async t => {
  const root = await fixture(t, { 'migration.sql': `BEGIN;
CREATE TYPE "Provider" AS ENUM ('ONEDRIVE', 'DROPBOX');
CREATE TABLE "Connection" ("id" TEXT PRIMARY KEY, "provider" "Provider", "scopes" JSONB, "createdAt" TIMESTAMPTZ(3), "revision" INTEGER CHECK ("revision" >= 0));
CREATE INDEX "connection_idx" ON "Connection"("provider");
INSERT INTO "Connection" ("id", "scopes") VALUES ('ŝ😀', '{"read":true}'::jsonb);
COMMIT;
` });
  const report = await sqlScan(root);
  assert.equal(report.status, 'CLEAN', JSON.stringify(report));
  assert.equal(report.coverage[0].checkedFiles, 1);
});

test('SQL requires explicit dialect and never treats SQLite or unknown dialect as PostgreSQL', async t => {
  for (const dialect of [null, 'sqlite', 'mssql', 'unknown']) {
    const root = await fixture(t, { 'main.sql': 'SELECT 1;' }, dialect ?? undefined);
    if (dialect === null) await fs.rm(path.join(root, '.wrp-lint.json'), { force: true });
    const report = await sqlScan(root);
    assert.equal(report.status, 'INCOMPLETE');
    assert.equal(report.findings.length, 0);
    assert.ok(report.incomplete.some(message => /dialect/i.test(message)));
  }
});

test('PostgreSQL errors preserve Unicode filename and code-point cursor as UTF-16 line/column', async t => {
  const root = await fixture(t, { 'ŝ😀.sql': "SELECT 'ŝ😀';\r\nSELECT FROM;" });
  const report = await sqlScan(root);
  assert.equal(report.status, 'FINDINGS', JSON.stringify(report));
  const item = report.findings.find(item => item.rule === 'SQL-postgresql-syntax');
  assert.equal(item.file, 'ŝ😀.sql');
  assert.equal(item.line, 2);
  assert.equal(item.column, 12);
  await fs.writeFile(path.join(root, 'ŝ😀.sql'), 'SELECT 1;\nSELECT\0FROM;');
  const nul = await sqlScan(root);
  assert.equal(nul.findings[0].line, 2);
  assert.equal(nul.findings[0].column, 7);
});

test('PostgreSQL routine bodies are checked with the SQL and PLpgSQL parsers; other languages remain incomplete', async t => {
  const root = await fixture(t, { 'routines.sql': `CREATE FUNCTION f() RETURNS int LANGUAGE plpgsql AS $$BEGIN RETURN 1; END;$$;
DO $$BEGIN PERFORM 1; END$$;
CREATE FUNCTION g() RETURNS int LANGUAGE sql AS $$SELECT 1;$$;
` });
  assert.equal((await sqlScan(root)).status, 'CLEAN');
  await fs.writeFile(path.join(root, 'routines.sql'), 'DO $$BEGIN IF THEN END; END$$;');
  const bad = await sqlScan(root);
  assert.equal(bad.status, 'FINDINGS', JSON.stringify(bad));
  assert.ok(bad.findings.some(item => item.rule === 'SQL-plpgsql-syntax'));
  await fs.writeFile(path.join(root, 'routines.sql'), 'CREATE FUNCTION f() RETURNS int LANGUAGE plpgsql AS $$ BEGIN IF THEN RETURN 1; END IF; END $$;');
  const expression = await sqlScan(root);
  assert.equal(expression.status, 'FINDINGS', JSON.stringify(expression));
  assert.ok(expression.findings.some(item => item.rule === 'SQL-plpgsql-syntax' && item.message.includes('missing expression')));
  await fs.writeFile(path.join(root, 'routines.sql'), 'CREATE FUNCTION f() RETURNS int LANGUAGE sql AS $$SELECT FROM;$$;');
  assert.ok((await sqlScan(root)).findings.some(item => item.rule === 'SQL-routine-syntax'));
  await fs.writeFile(path.join(root, 'routines.sql'), 'CREATE FUNCTION f() RETURNS int LANGUAGE plpython3u AS $$return 1$$;');
  const unknown = await sqlScan(root);
  assert.equal(unknown.status, 'INCOMPLETE');
  assert.ok(unknown.incomplete.some(message => message.includes('plpython3u')));
});

test('SQL source, program commands, URLs and target configs remain inert text', async t => {
  const root = await fixture(t, {
    'inert.sql': "\uFEFF-- ŝ😀\r\nCOPY t FROM PROGRAM 'create SHOULD_NOT_EXIST';\r\nSELECT pg_read_file('/must-not-read'), dblink_connect('https://must-not-fetch.invalid');\r\nDROP TABLE t;\r\n",
    '.sql-lint.cjs': 'throw Error("Target configuration must never execute");',
    'package.json': '{"scripts":{"pretest":"create SHOULD_NOT_EXIST"}}'
  });
  const before = (await fs.readdir(root)).sort();
  const report = await sqlScan(root);
  assert.equal(report.status, 'CLEAN', JSON.stringify(report));
  assert.deepEqual((await fs.readdir(root)).sort(), before);
});

test('SQL parser failures remain per-file incomplete while independent SQL checks continue', async t => {
  const root = await fixture(t, { 'a.sql': 'SELECT 1;', 'b.sql': 'SELECT 2;' });
  let calls = 0;
  const report = await scan(root, {
    types: ['sql'], toolProbe: async () => ({ available: true }),
    execute: async (_executable, args, options) => {
      calls++;
      assert.equal(options.timeout, 30000);
      assert.equal(options.limit, 256 * 1024);
      assert.equal(args.at(-1), path.join(packageRoot, 'src/sql-worker.mjs'));
      assert.ok(!args.some(arg => arg.endsWith('.sql')));
      if (calls === 1) throw Error('Synthetic parser timeout');
      return { code: 0, stdout: '{"diagnostics":[]}', stderr: '' };
    }
  });
  assert.equal(calls, 2);
  assert.equal(report.status, 'INCOMPLETE');
  assert.equal(report.coverage[0].checkedFiles, 1);
  assert.equal(report.coverage[0].status, 'partial');
});

test('SQL CLI dialect flag and generated JSON configuration agree', async t => {
  const root = await fixture(t, { 'main.sql': 'SELECT 1;' });
  await fs.rm(path.join(root, '.wrp-lint.json'));
  const bin = path.join(packageRoot, 'bin/wrp-lint.mjs');
  const initial = await run(process.execPath, [bin, 'scan', root, '--types', 'sql', '--format', 'json']);
  assert.equal(initial.code, 2);
  const checked = await run(process.execPath, [bin, 'scan', root, '--types', 'sql', '--sql-dialect', 'postgresql', '--format', 'json']);
  assert.equal(checked.code, 0, checked.stdout);
  assert.equal((await run(process.execPath, [bin, 'init', root, '--types', 'sql', '--sql-dialect', 'postgresql'])).code, 0);
  assert.equal(JSON.parse(await fs.readFile(path.join(root, '.wrp-lint.json'), 'utf8')).sqlDialect, 'postgresql');
  assert.equal((await probe('sql', root)).available, true);
});

test('PLpgSQL dynamic SQL remains incomplete rather than falsely certifying generated query text', async t => {
  const root = await fixture(t, { 'dynamic.sql': "DO $$BEGIN EXECUTE 'SELECT FROM;'; END$$;" });
  const report = await sqlScan(root);
  assert.equal(report.status, 'INCOMPLETE', JSON.stringify(report));
  assert.ok(report.incomplete.some(message => message.includes('dynamic SQL')));
});

test('Pinned PostgreSQL asset hashes reject tampered package-local WASM before loading', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'wrp-sql-assets-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  for (const file of ['package.json', 'package-lock.json', 'npm-shrinkwrap.json']) await fs.copyFile(path.join(packageRoot, file), path.join(root, file));
  await fs.mkdir(path.join(root, 'node_modules'), { recursive: true });
  const wasm = resolveLibrary('libpg-query/wasm/libpg-query.wasm');
  await fs.cp(path.dirname(path.dirname(wasm)), path.join(root, 'node_modules/libpg-query'), { recursive: true });
  const options = { packageDirectory: root, cacheRoot: path.join(root, 'empty-cache') };
  assert.ok(verifySqlAssets(options).wasm.length > 0);
  await fs.appendFile(path.join(root, 'node_modules/libpg-query/wasm/libpg-query.wasm'), 'tampered');
  assert.throws(() => verifySqlAssets(options), /asset mismatch/);
});
