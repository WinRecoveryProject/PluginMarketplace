import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs/promises';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import {main} from '../scripts/studio.mjs';
import {desktopRequest,validateDesktopRequest,assertPrivateDesktopOutput,assertLocalDesktopPath} from '../src/desktop/index.mjs';
const scope={kind:'studio-desktop-scope',windowHandle:123,processId:456,processStart:'2026-11-17T20:00:00Z',executable:'C:\\Windows\\notepad.exe',processName:'notepad'};

test('capture requests bind to an observed process lifetime and explicit private directory',async()=>{
 const calls=[];const request={action:'capture',scope,directory:path.resolve('..','private-desktop-test')};
 const result=await desktopRequest(request,{platform:'win32',worker:async r=>{calls.push(r);return {ok:true,inputSent:false};}});
 assert.equal(result.ok,true);assert.equal(calls.length,1);assert.deepEqual(calls[0],request);
});
test('live input without an explicit execute flag never reaches the worker',async()=>{
 let calls=0;
 for(const action of ['activate','click','scroll'])for(const execute of [undefined,false,'true',1]){
  await assert.rejects(desktopRequest({action,scope,execute},{platform:'win32',worker:async()=>{calls++;}}),/--execute/);
 }
 assert.equal(calls,0);
});
test('malformed, reused-type and pathless scopes are rejected before any native call',()=>{
 for(const changed of [{windowHandle:'123'},{processId:0},{processStart:'yesterday'},{executable:'notepad.exe'},{processName:[]},{kind:'other'}])
  assert.throws(()=>validateDesktopRequest({action:'inspect',scope:{...scope,...changed}}),/scope/);
});
test('click coordinates and snapshot provenance must be explicit and valid',()=>{
 const base={action:'click',scope,execute:true,snapshot:path.resolve('..','snapshot.json'),x:10,y:20};
 assert.equal(validateDesktopRequest(base),base);
 for(const change of [{x:-1},{x:1.5},{y:'2'},{snapshot:'relative.json'},{x:NaN}])assert.throws(()=>validateDesktopRequest({...base,...change}));
});
test('scroll is bounded and does not accept empty or fractional movement',()=>{
 const base={action:'scroll',scope,execute:true,snapshot:path.resolve('..','snapshot.json'),x:1,y:2};
 for(const delta of [0,721,-721,0.5,undefined])assert.throws(()=>validateDesktopRequest({...base,delta}));
 for(const delta of [-720,120])assert.equal(validateDesktopRequest({...base,delta}).delta,delta);
});
test('unknown actions, extra arguments and coercible window handles fail closed',()=>{
 for(const request of [null,[],{action:'shell'},{action:'list',command:'whoami'},{action:'scope',windowHandle:[123]},{action:'scope',windowHandle:0}])assert.throws(()=>validateDesktopRequest(request));
});
test('unsupported hosts never start a fallback or install dependencies',async()=>{
 let called=false;
 await assert.rejects(desktopRequest({action:'list'},{platform:'linux',worker:async()=>{called=true;}}),/requires Windows/);
 assert.equal(called,false);
});
test('private screenshots cannot be stored inside the distributable plugin',()=>{
 assert.throws(()=>assertPrivateDesktopOutput(fileURLToPath(new URL('../private.png',import.meta.url))),/outside/);
 assert.ok(assertPrivateDesktopOutput(path.resolve('..','private-desktop-evidence')));
});
test('outside junctions into the distributable package cannot receive private captures',async t=>{
 const temporary=await fs.mkdtemp(path.join(os.tmpdir(),'studio-desktop-output-'));
 t.after(()=>fs.rm(temporary,{recursive:true,force:true}));
 const junction=path.join(temporary,'into-plugin');
 await fs.symlink(fileURLToPath(new URL('..',import.meta.url)),junction,process.platform==='win32'?'junction':'dir');
 assert.throws(()=>assertPrivateDesktopOutput(path.join(junction,'private-evidence','new.png')),/outside/);
});
test('UNC and Windows device paths are refused before filesystem access',()=>{
 for(const value of ['\\\\server\\share\\image.png','//server/share/scope.json','\\\\?\\C:\\image.png','\\\\.\\pipe\\desktop'])assert.throws(()=>assertLocalDesktopPath(value),/local drive/);
});
test('report-file failures cannot occur after a live desktop action',async()=>{
 for(const command of ['desktop-click','desktop-scroll','desktop-activate'])
  await assert.rejects(main([command,'nonexistent-scope.json','--execute','--out','existing-output.json']),/do not accept --out/);
});
