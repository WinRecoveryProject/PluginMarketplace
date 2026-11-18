import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {scan,packageRoot} from '../src/engine.mjs';

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
  return JSON.parse(options.input);
}

test('PowerShell scans bounded batches instead of timing out the entire family',async t=>{
  const root=await project(t),sizes=[];
  const execute=async(_executable,args,options)=>{
    const files=adapter(args,options);sizes.push(files.length);
    if(files.length>8)throw Error('Tool timed out after 30000 ms');
    return {code:0,stdout:JSON.stringify(files.map(f=>warning(f.file))),stderr:''};
  };
  const report=await scan(root,{types:['powershell'],toolProbe,execute});
  assert.equal(report.status,'FINDINGS');assert.equal(report.findings.length,17);
  assert.equal(report.coverage[0].checkedFiles,17);assert.equal(report.coverage[0].status,'checked');
  assert.deepEqual(sizes,[8,8,1]);
});

test('PowerShell failed batch preserves the completed batches with honest partial coverage',async t=>{
  const root=await project(t);let calls=0;
  const execute=async(_executable,args,options)=>{
    const files=adapter(args,options);calls++;
    if(calls===1)throw Error('Tool timed out after 30000 ms');
    return {code:0,stdout:JSON.stringify(files.map(f=>warning(f.file))),stderr:''};
  };
  const report=await scan(root,{types:['powershell'],toolProbe,execute});
  assert.equal(report.status,'INCOMPLETE');assert.equal(report.coverage[0].status,'partial');
  assert.equal(report.coverage[0].checkedFiles,9);assert.equal(report.incomplete.length,8);
  assert.equal(report.findings.filter(f=>f.rule==='PSAvoidUsingWriteHost').length,9);
  assert.equal(calls,3);
});

test('PowerShell malformed reports cannot certify a batch as checked',async t=>{
  const root=await project(t,2);
  const report=await scan(root,{types:['powershell'],toolProbe,execute:async()=>({code:0,stdout:'[{"file":"outside.ps1"}]',stderr:''})});
  assert.equal(report.status,'INCOMPLETE');assert.equal(report.coverage[0].checkedFiles,0);
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
