import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {createBoundedLogWriter, readLogSince} from './logs.mjs';

const marker = Buffer.from('[... earlier output truncated ...]\n');
function fixture(run) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'wrp-cpj-log-'));
  const file = path.join(root, 'fixture.log');
  try { run(file); } finally {
    const resolved = fs.realpathSync(root);
    assert.equal(path.dirname(resolved), fs.realpathSync(os.tmpdir()));
    fs.rmSync(resolved, {recursive: true, force: true});
  }
}
function withWriter(file, limit, run) {
  const writer = createBoundedLogWriter(file, limit);
  try { run(writer); } finally { writer.close(); }
}
test('append preserves existing bytes after reopen', () => fixture(file => {
  fs.writeFileSync(file, 'existing\n');
  withWriter(file, 1024, writer => writer.append('new\n'));
  withWriter(file, 1024, writer => writer.append('last\n'));
  assert.equal(fs.readFileSync(file, 'utf8'), 'existing\nnew\nlast\n');
}));
test('sequential writers see bytes appended through another handle', () => fixture(file => {
  withWriter(file, 1024, first => withWriter(file, 1024, second => {
    first.append('first\n');
    second.append('second\n');
    assert.equal(fs.readFileSync(file, 'utf8'), 'first\nsecond\n');
    first.append('z'.repeat(1500));
    second.append('last');
    assert.equal(fs.statSync(file).size, 1024);
    assert.ok(fs.readFileSync(file, 'utf8').endsWith('last'));
  }));
}));
test('rotation retains the exact newest bytes and remains bounded', () => fixture(file => {
  withWriter(file, 1024, writer => {
    writer.append('a'.repeat(800));
    const payload = Buffer.from('b'.repeat(500));
    writer.append(payload);
    const expected = Buffer.concat([marker, Buffer.from('a'.repeat(1024-marker.length-payload.length)), payload]);
    assert.deepEqual(fs.readFileSync(file), expected);
    assert.equal(writer.size, expected.length);
    writer.append('next');
    assert.ok(fs.statSync(file).size <= 1024);
    assert.ok(fs.readFileSync(file, 'utf8').endsWith('next'));
  });
}));
test('opening an oversized existing log compacts it and permits append', () => fixture(file => {
  fs.writeFileSync(file, Buffer.from('abcd'.repeat(900)));
  withWriter(file, 1024, writer => {
    assert.equal(writer.size, 1024);
    assert.ok(fs.readFileSync(file).subarray(0, marker.length).equals(marker));
    writer.append('tail');
    assert.equal(fs.statSync(file).size, 1024);
    assert.ok(fs.readFileSync(file, 'utf8').endsWith('tail'));
  });
}));
test('rotation changes generation and resets an old cursor', () => fixture(file => {
  withWriter(file, 1024, writer => {
    writer.append('a'.repeat(500));
    const before = readLogSince(file, 0);
    writer.append('b'.repeat(3000));
    const after = readLogSince(file, before.nextOffset, {generation: before.generation, maxBytes:100});
    assert.equal(after.compacted, true);
    assert.equal(after.truncated, true);
    assert.equal(after.text, 'b'.repeat(100));
    assert.notEqual(after.generation, before.generation);
  });
}));
test('large binary chunks retain their precise byte tail', () => fixture(file => {
  const payload = Buffer.from(Array.from({length:4096}, (_, i) => i % 256));
  withWriter(file, 1024, writer => {
    writer.append(payload);
    assert.deepEqual(fs.readFileSync(file), Buffer.concat([marker,payload.subarray(payload.length-(1024-marker.length))]));
  });
}));
