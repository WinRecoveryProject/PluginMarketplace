import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { findExecutable, inside } from '../src/process.mjs';

test('Windows discovers Bash beside the selected Git installation and keeps override precedence', {
  skip: process.platform !== 'win32',
}, t => {
  const temporaryRoot = fs.realpathSync(os.tmpdir());
  const root = fs.mkdtempSync(path.join(temporaryRoot, 'wrp-git-tool-discovery-'));
  const saved = new Map(['PATH', 'WRP_LINT_BASH', 'WRP_LINT_GIT'].map(key => [key, process.env[key]]));
  t.after(() => {
    for (const [key, value] of saved) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    const resolved = fs.realpathSync(root);
    assert.notEqual(resolved, temporaryRoot);
    assert.ok(inside(temporaryRoot, resolved));
    fs.rmSync(resolved, { recursive: true, force: true });
  });
  const gitRoot = path.join(root, 'Custom Git');
  const commandDirectory = path.join(gitRoot, 'cmd');
  const binaryDirectory = path.join(gitRoot, 'bin');
  fs.mkdirSync(commandDirectory, { recursive: true });
  fs.mkdirSync(binaryDirectory);
  fs.writeFileSync(path.join(commandDirectory, 'git.exe'), '');
  const bash = path.join(binaryDirectory, 'bash.exe');
  fs.writeFileSync(bash, '');
  process.env.PATH = commandDirectory;
  delete process.env.WRP_LINT_GIT;
  delete process.env.WRP_LINT_BASH;
  assert.equal(findExecutable('bash'), fs.realpathSync(bash));
  assert.notEqual(findExecutable('bash', gitRoot), fs.realpathSync(bash));

  const override = path.join(root, 'explicit-bash.exe');
  fs.writeFileSync(override, '');
  process.env.WRP_LINT_BASH = override;
  assert.equal(findExecutable('bash'), fs.realpathSync(override));
  process.env.WRP_LINT_BASH = path.join(root, 'missing-bash.exe');
  assert.equal(findExecutable('bash'), undefined);
});
