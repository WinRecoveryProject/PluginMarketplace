import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { packageRoot, probe, scan } from '../src/engine.mjs';
import { run } from '../src/process.mjs';

test('Python snapshot protocol uses UTF-8 bytes even when Windows stdin text decoding is cp1252', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'wrp-python-protocol-'));
  try {
    const tool = await probe('python', root);
    if (!tool.available) { t.skip(tool.reason); return; }
    const input = JSON.stringify([{ file: 'valid-ŝ-😀.py', content: 'text = "ŝ 😀 æøå"\n' }, { file: 'syntax-ŝ.py', content: 'if True\n    pass\n' }]);
    // Own fixed launcher simulates the Windows legacy pipe text wrapper; only
    // the product adapter is run. No inspected Python source is executed.
    const launcher = 'import io,runpy,sys; sys.stdin=io.TextIOWrapper(sys.stdin.buffer,encoding="cp1252",errors="surrogateescape"); runpy.run_path(sys.argv[1],run_name="__main__")';
    const result = await run(tool.executable, ['-I', '-B', '-c', launcher, path.join(packageRoot, 'adapters/python-syntax.py')], { cwd: packageRoot, input });
    assert.equal(result.code, 0, result.stderr);
    const diagnostics = JSON.parse(result.stdout);
    assert.equal(diagnostics.length, 1, result.stdout);
    assert.equal(diagnostics[0].file, 'syntax-ŝ.py');
    assert.equal(diagnostics[0].rule, 'python-syntax');
  } finally { await fs.rm(root, { recursive: true, force: true }); }
});

test('Python isolates unencodable snapshots and keeps later syntax diagnostics without execution', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'wrp-python-unicode-'));
  try {
    const tool = await probe('python', root);
    if (!tool.available) { t.skip(tool.reason); return; }
    const sentinel = path.join(root, 'must-not-exist.txt');
    const snapshots = [
      { file: 'a-invalid.py', content: '# first\r\n# bad \udc9d\n' },
      { file: 'b-syntax.py', content: 'if True\n    pass\n' },
      { file: 'c-valid.py', content: `from pathlib import Path\nPath(${JSON.stringify(sentinel)}).write_text("executed")\nemoji = "😀"\n` },
      { file: 'd-invalid.py', content: '# bad \ud800\n' },
      { file: 'e-\udc9d.py', content: 'if True\n    pass\n' }
    ];
    const input = JSON.stringify(snapshots);
    const call = () => run(tool.executable, ['-I', '-B', path.join(packageRoot, 'adapters/python-syntax.py')], { cwd: packageRoot, input });
    const result = await call();
    assert.equal(result.code, 0, result.stderr);
    const diagnostics = JSON.parse(result.stdout);
    assert.deepEqual(diagnostics.map(item => [item.file, item.rule]), [
      ['a-invalid.py', 'python-encoding'], ['b-syntax.py', 'python-syntax'], ['d-invalid.py', 'python-encoding'], ['e-\udc9d.py', 'python-syntax']
    ]);
    assert.deepEqual(diagnostics.filter(item => item.rule === 'python-encoding').map(item => [item.line, item.column, item.incomplete]), [[2, 7, true], [1, 7, true]]);
    assert.ok(diagnostics.every(item => !item.message.includes('Traceback')));
    assert.equal((await call()).stdout, result.stdout, 'Stable input must produce byte-identical diagnostics');
    await assert.rejects(fs.access(sentinel), { code: 'ENOENT' });
  } finally { await fs.rm(root, { recursive: true, force: true }); }
});

test('Python batch encoding gaps keep exact paths and syntax findings with INCOMPLETE coverage', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'wrp-python-boundary-'));
  try {
    const tool = await probe('python', root);
    if (!tool.available) { t.skip(tool.reason); return; }
    await fs.writeFile(path.join(root, 'bad-encoding.py'), '# snapshot boundary fixture\n');
    await fs.writeFile(path.join(root, 'bad-syntax.py'), 'if True\n    pass\n');
    const execute = (executable, args, options) => {
      if (args.includes(path.join(packageRoot, 'adapters/python-syntax.py'))) {
        const snapshots = JSON.parse(options.input);
        snapshots.find(item => item.file === 'bad-encoding.py').content = '# bad \udc9d\n';
        return run(executable, args, { ...options, input: JSON.stringify(snapshots) });
      }
      return run(executable, args, options);
    };
    const report = await scan(root, { types: ['python'], execute });
    assert.equal(report.status, 'INCOMPLETE');
    assert.equal(report.exitCode, 2);
    assert.ok(report.incomplete.some(item => item.startsWith('bad-encoding.py:1:7: python-encoding:')));
    assert.equal(report.coverage.find(item => item.type === 'python').status, 'partial');
    assert.equal(report.coverage.find(item => item.type === 'python').checkedFiles, 1);
    assert.ok(report.findings.some(item => item.file === 'bad-syntax.py' && item.rule === 'python-syntax'));
    assert.ok(!report.findings.some(item => item.rule === 'python-encoding'));
    const allInvalid = await scan(root, { types: ['python'], execute: (executable, args, options) => {
      if (args.includes(path.join(packageRoot, 'adapters/python-syntax.py'))) {
        const snapshots = JSON.parse(options.input).map(item => ({ ...item, content: '# bad \udc9d\n' }));
        return run(executable, args, { ...options, input: JSON.stringify(snapshots) });
      }
      return run(executable, args, options);
    } });
    assert.equal(allInvalid.status, 'INCOMPLETE');
    assert.equal(allInvalid.coverage[0].status, 'failed');
    assert.equal(allInvalid.coverage[0].checkedFiles, 0);
    assert.equal(allInvalid.findings.length, 0);
    assert.equal(allInvalid.incomplete.length, 2);
  } finally { await fs.rm(root, { recursive: true, force: true }); }
});

test('Python scan rejects invalid UTF-8 per file and still parses valid snapshots', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'wrp-python-encoding-'));
  try {
    const tool = await probe('python', root);
    if (!tool.available) { t.skip(tool.reason); return; }
    await fs.writeFile(path.join(root, 'bad-encoding.py'), Buffer.from([0x23, 0x20, 0x9d, 0x0a]));
    await fs.writeFile(path.join(root, 'bad-syntax.py'), 'if True\n    pass\n');
    const report = await scan(root, { types: ['python'] });
    assert.equal(report.status, 'INCOMPLETE');
    assert.equal(report.exitCode, 2);
    assert.ok(report.incomplete.some(item => item.startsWith('bad-encoding.py:')));
    assert.ok(report.findings.some(item => item.file === 'bad-syntax.py' && item.rule === 'python-syntax'));
    assert.ok(!report.incomplete.some(item => item.includes('Traceback')));
  } finally { await fs.rm(root, { recursive: true, force: true }); }
});
