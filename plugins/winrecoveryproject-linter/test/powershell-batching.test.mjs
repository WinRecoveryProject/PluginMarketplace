import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {scan,packageRoot} from '../src/engine.mjs';
import {ToolTimeoutError} from '../src/process.mjs';

async function project(t,count=17){
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'wrp-ps-batch-'));
  t.after(()=>fs.rm(root,{recursive:true,force:true}));
  for(let i=0;i<count;i++)await fs.writeFile(path.join(root,`${String(i).padStart(2,'0')}.ps1`),'Write-Host "fixture only; never execute this source"\n');
  return root;
}
const toolProbe=async()=>({available:true,executable:'fixed-powershell-fixture'});
const warning=file=>({file,rule:'PSAvoidUsingWriteHost',message:'Synthetic analyzer diagnostic',line:1,column:1,severity:'warning'});
function adapter(args,options){
  assert.equal(args[0],'-NoLogo');assert.ok(args.includes('-NoProfile'));assert.ok(args.includes('-NonInteractive'));
  assert.equal(args.at(-1),path.join(packageRoot,'adapters/powershell.ps1'));
  assert.equal(options.timeout, 30000);
  return JSON.parse(options.input);
}

test('PowerShell scans bounded batches instead of timing out the entire family',async t=>{
  const root=await project(t),sizes=[];
  const execute=async(_executable,args,options)=>{
    const files=adapter(args,options);sizes.push(files.length);
    if(files.length>8)throw new ToolTimeoutError(30000);
    return {code:0,stdout:JSON.stringify(files.map(f=>warning(f.file))),stderr:''};
  };
  const report=await scan(root,{types:['powershell'],toolProbe,execute});
  assert.equal(report.status,'FINDINGS');assert.equal(report.findings.length,17);
  assert.equal(report.coverage[0].checkedFiles,17);assert.equal(report.coverage[0].status,'checked');
  assert.deepEqual(sizes,[8,8,1]);
});

test('PowerShell recovers all diagnostics when a timed-out batch succeeds in two halves', async t => {
  const root = await project(t, 8);
  const sizes = [];
  const execute = async (_executable, args, options) => {
    const files = adapter(args, options);
    sizes.push(files.length);
    if (files.length === 8) throw new ToolTimeoutError(30000);
    return { code: 0, stdout: JSON.stringify(files.map(file => warning(file.file))), stderr: '' };
  };
  const report = await scan(root, { types: ['powershell'], toolProbe, execute });
  assert.equal(report.status, 'FINDINGS');
  assert.equal(report.coverage[0].status, 'checked');
  assert.equal(report.coverage[0].checkedFiles, 8);
  assert.deepEqual(report.incomplete, []);
  assert.equal(new Set(report.findings.map(finding => finding.file)).size, 8);
  assert.deepEqual(sizes, [8, 4, 4]);
});

test('PowerShell reports partial coverage when one timeout half still fails', async t => {
  const root = await project(t);
  const sizes = [];
  const execute = async (_executable, args, options) => {
    const files = adapter(args, options);
    sizes.push(files.length);
    if (files[0].file === '00.ps1') throw new ToolTimeoutError(30000);
    return { code: 0, stdout: JSON.stringify(files.map(file => warning(file.file))), stderr: '' };
  };
  const report = await scan(root, { types: ['powershell'], toolProbe, execute });
  assert.equal(report.status, 'INCOMPLETE');
  assert.equal(report.coverage[0].status, 'partial');
  assert.equal(report.coverage[0].checkedFiles, 13);
  assert.deepEqual(report.incomplete.map(line => line.split(':')[0]), ['00.ps1', '01.ps1', '02.ps1', '03.ps1']);
  assert.equal(report.findings.filter(finding => finding.rule === 'PSAvoidUsingWriteHost').length, 13);
  assert.deepEqual(sizes, [8, 4, 4, 8, 1]);
});

test('PowerShell never retries a timed-out single-file batch', async t => {
  const root = await project(t, 1);
  let calls = 0;
  const execute = async () => {
    calls++;
    throw new ToolTimeoutError(30000);
  };
  const report = await scan(root, { types: ['powershell'], toolProbe, execute });
  assert.equal(report.status, 'INCOMPLETE');
  assert.equal(report.coverage[0].checkedFiles, 0);
  assert.equal(calls, 1);
});

test('PowerShell never retries malformed reports or adapter stderr that resembles a timeout', async t => {
  const root = await project(t, 2);
  for (const result of [
    { code: 0, stdout: '[{"file":"outside.ps1"}]', stderr: '' },
    { code: 1, stdout: '', stderr: 'Tool timed out after 30000 ms' }
  ]) {
    let calls = 0;
    const execute = async () => {
      calls++;
      return result;
    };
    const report = await scan(root, { types: ['powershell'], toolProbe, execute });
    assert.equal(report.status, 'INCOMPLETE');
    assert.equal(report.coverage[0].checkedFiles, 0);
    assert.equal(calls, 1);
  }
});

test('PowerShell batching targets bounded input bytes and never truncates large source snapshots',async t=>{
  const root=await project(t,3),content='#'+('x'.repeat(300*1024))+'\n';
  for(const name of await fs.readdir(root))await fs.writeFile(path.join(root,name),content);
  const sizes=[];
  const report=await scan(root,{types:['powershell'],toolProbe,execute:async(_executable,args,options)=>{
    const files=adapter(args,options);sizes.push(files.length);
    assert.equal(files[0].content,content);
    return {code:0,stdout:'[]',stderr:''};
  }});
  assert.equal(report.status,'CLEAN');assert.equal(report.coverage[0].checkedFiles,3);
  assert.deepEqual(sizes,[1,1,1]);
});
