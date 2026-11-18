import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {packageRoot} from '../src/registry.mjs';

async function fixture(t){
 const base=await fs.mkdtemp(path.join(os.tmpdir(),'studio-cache-resolve-'));
 t.after(async()=>{assert.equal(path.dirname(path.resolve(base)),path.resolve(os.tmpdir()));await fs.rm(base,{recursive:true,force:true});});
 const cacheRoot=path.join(base,'cache');await fs.mkdir(cacheRoot);
 const root=path.join(cacheRoot,'ours','workbench','0.9.0-beta.5');
 await fs.mkdir(path.join(root,'.codex-plugin'),{recursive:true});
 await fs.mkdir(path.join(root,'skills','safe-editing'),{recursive:true});
 await fs.writeFile(path.join(root,'.codex-plugin','plugin.json'),JSON.stringify({name:'workbench',version:'0.9.0-beta.5',skills:'./skills'}));
 await fs.writeFile(path.join(root,'skills','safe-editing','SKILL.md'),'---\nname: safe-editing\ndescription: Use when editing the selected project.\n---\nRead existing policy.\n');
 const request={pluginId:'workbench@ours',cacheRoot,snapshot:{kind:'codex-cli-installed',capturedAt:new Date().toISOString(),exitCode:0,data:{installed:[{pluginId:'workbench@ours',name:'workbench',marketplaceName:'ours',version:'0.9.0-beta.5',installed:true,enabled:true}]}},skill:'skills/safe-editing/SKILL.md'};
 return {base,cacheRoot,root,request};
}
async function resolve(request,options){return (await import('../src/services/installed-resolver.mjs')).resolveInstalledPlugin(request,options);}

test('CLI stale skill reference resolves only the current exact installed version',async t=>{
 const {base,cacheRoot,root,request}=await fixture(t);
 await assert.rejects(fs.readFile(path.join(cacheRoot,'ours','workbench','0.9.0-beta.4','skills','safe-editing','SKILL.md')),e=>e.code==='ENOENT');
 const file=path.join(base,'request.json');await fs.writeFile(file,JSON.stringify(request));
 const r=spawnSync(process.execPath,[path.join(packageRoot,'scripts','studio.mjs'),'resolve-installed',file],{encoding:'utf8'});
 assert.equal(r.status,0,r.stdout+r.stderr);
 const output=JSON.parse(r.stdout);assert.equal(output.status,'RESOLVED');assert.equal(output.version,'0.9.0-beta.5');
 assert.equal(output.root,await fs.realpath(root));assert.equal(output.skillPath,await fs.realpath(path.join(root,request.skill)));
 assert.equal(output.scope,'PATH_RESOLUTION_ONLY');assert.equal(output.skillEnabled,'UNKNOWN');assert.equal(output.executionAuthorized,false);
 await assert.rejects(fs.stat(path.join(cacheRoot,'ours','workbench','0.9.0-beta.4')),e=>e.code==='ENOENT');
});

test('resolver ignores poisoned higher caches and another namespace',async t=>{
 const {cacheRoot,root,request}=await fixture(t);
 await fs.mkdir(path.join(cacheRoot,'ours','workbench','999.0.0'),{recursive:true});
 await fs.mkdir(path.join(cacheRoot,'official','workbench','0.9.0-beta.5'),{recursive:true});
 const r=await resolve(request);assert.equal(r.status,'RESOLVED');assert.equal(r.root,await fs.realpath(root));
 const absent=structuredClone(request);absent.pluginId='workbench@official';assert.equal((await resolve(absent)).status,'UNAVAILABLE');
});

test('missing, disabled, uninstalled or duplicated registry identities never resolve',async t=>{
 const {request}=await fixture(t);
 for(const mutation of [r=>{r.snapshot.data.installed=[];},r=>{r.snapshot.data.installed[0].enabled=false;},r=>{r.snapshot.data.installed[0].installed=false;},r=>{r.snapshot.data.installed.push({...r.snapshot.data.installed[0]});},r=>{delete r.snapshot.data.installed[0].enabled;}]){
  const r=structuredClone(request);mutation(r);assert.equal((await resolve(r)).status,'UNAVAILABLE');
 }
});

test('freshness and successful host lookup remain observations, not entitlement',async t=>{
 const {request}=await fixture(t);const now=Date.now();request.snapshot.capturedAt=new Date(now).toISOString();
 const good=await resolve(request,{now});assert.equal(good.status,'RESOLVED');assert.equal(good.currentEntitlementVerified,false);assert.equal(good.freshness.independentlyVerified,false);
 for(const capturedAt of [undefined,'invalid',new Date(now-60001).toISOString(),new Date(now+1).toISOString()]){
  const r=structuredClone(request);r.snapshot.capturedAt=capturedAt;assert.equal((await resolve(r,{now})).status,'UNAVAILABLE');
 }
 const failed=structuredClone(request);failed.snapshot.exitCode=1;assert.equal((await resolve(failed,{now})).status,'UNAVAILABLE');
});

test('unsafe identity, version, cache and skill paths are rejected as data',async t=>{
 const {request}=await fixture(t);
 for(const pluginId of [['workbench@ours'],{toString:'workbench@ours'},null,12,true]){
  const input=structuredClone(request);input.pluginId=pluginId;
  const result=await resolve(input);assert.equal(result.status,'UNAVAILABLE');assert.equal(result.code,'INVALID_REQUEST');
 }
 const cases=[r=>{r.pluginId='../workbench@ours';},r=>{r.snapshot.data.installed[0].version='../0.9.0-beta.5';},r=>{r.cacheRoot='\\\\server\\share\\cache';},r=>{r.cacheRoot='relative/cache';},r=>{r.skill='../outside/SKILL.md';},r=>{r.skill='C:/outside/SKILL.md';},r=>{r.skill='skills/safe-editing/../safe-editing/SKILL.md';},r=>{r.skill='skills/safe-editing/SKILL.md:stream';},r=>{r.skill='LICENSE';}];
 for(const mutate of cases){const r=structuredClone(request);mutate(r);assert.equal((await resolve(r)).status,'UNAVAILABLE');}
});

test('manifest identity and missing current files never fall back to another version',async t=>{
 const {root,request}=await fixture(t);const manifest=path.join(root,'.codex-plugin','plugin.json');
 for(const data of [{name:'other',version:'0.9.0-beta.5',skills:'./skills'},{name:'workbench',version:'0.9.0-beta.4',skills:'./skills'}]){
  await fs.writeFile(manifest,JSON.stringify(data));assert.equal((await resolve(request)).status,'UNAVAILABLE');
 }
 await fs.writeFile(manifest,JSON.stringify({name:'workbench',version:'0.9.0-beta.5',skills:'./skills'}));
 await fs.unlink(path.join(root,request.skill));assert.equal((await resolve(request)).status,'UNAVAILABLE');
 const rootOnly=structuredClone(request);delete rootOnly.skill;assert.equal((await resolve(rootOnly)).status,'RESOLVED');
});

test('symlinked skills and cache roots cannot escape containment',async t=>{
 const {base,root,cacheRoot,request}=await fixture(t);const outside=path.join(base,'outside');await fs.mkdir(outside);
 await fs.writeFile(path.join(outside,'SKILL.md'),'outside');await fs.rm(path.join(root,'skills','safe-editing'),{recursive:true});
 await fs.symlink(outside,path.join(root,'skills','safe-editing'),process.platform==='win32'?'junction':'dir');
 assert.equal((await resolve(request)).status,'UNAVAILABLE');
 const alias=path.join(base,'alias');await fs.symlink(cacheRoot,alias,process.platform==='win32'?'junction':'dir');
 const r=structuredClone(request);r.cacheRoot=alias;delete r.skill;assert.equal((await resolve(r)).status,'UNAVAILABLE');
});

test('credentials, source commands and unknown snapshot fields are never executed or returned',async t=>{
 const {base,request}=await fixture(t);const marker=path.join(base,'MUST_NOT_EXIST');
 request.snapshot.data.installed[0].source={path:'outside',command:`create ${marker}`,env:{TOKEN:'private-fixture'}};
 request.snapshot.data.installed[0].access_token='private-fixture';const before=JSON.stringify(request);
 const r=await resolve(request);assert.equal(r.status,'RESOLVED');assert.equal(JSON.stringify(request),before);assert.ok(!JSON.stringify(r).includes('private-fixture'));
 await assert.rejects(fs.stat(marker),e=>e.code==='ENOENT');assert.deepEqual(r.safety,{targetExecuted:false,commandsExecuted:0,settingsChanged:false,networkRequests:0});
});
