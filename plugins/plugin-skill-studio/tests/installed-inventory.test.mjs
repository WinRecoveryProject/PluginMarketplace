import test from 'node:test';
import assert from 'node:assert/strict';
import {reconcileInstalledInventories as reconcile} from '../src/services/installed-inventory.mjs';
import {selfCheck,packageRoot} from '../src/registry.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';

const cli=(rows)=>({label:'Full installed CLI',kind:'cli',data:{installed:rows}});
const catalog=(rows)=>({label:'Personal catalog',kind:'catalog',data:{marketplaces:[{plugins:rows}]}});
test('full installed list, personal remote packages and Apps remain separate',()=>{
 const r=reconcile({current:[cli([{pluginId:'gmail@official',version:'1',installed:true},{pluginId:'studio@ours',version:'3'}]),catalog([{id:'studio@ours',localVersion:'3',installed:true},{id:'personal@remote',localVersion:'2',installed:true},{id:'available@remote',installed:false}])],apps:{apps:[{id:'mail'},{id:'files'}]}});
 assert.equal(r.installedPluginIdentities,3);assert.equal(r.apps.installedAppIdentities,2);assert.equal(r.complete,true);
 assert.deepEqual(r.plugins.map(p=>p.id),['gmail@official','personal@remote','studio@ours']);
});
test('catalog-only or CLI-only enumeration is explicitly incomplete',()=>{
 for(const current of [[cli([])],[catalog([])]])assert.equal(reconcile({current}).complete,false);
});
test('history retains missing original identities instead of merging display-name aliases',()=>{
 const r=reconcile({current:[cli([{pluginId:'tool@ours',version:'2'}]),catalog([])],historical:[{label:'Earlier Workspace',kind:'historical',data:{plugins:[{pluginId:'tool@official',version:'1',installed:true}]}}]});
 assert.equal(r.historicalComparison.snapshots[0].deltas[0].status,'HISTORICAL_ID_ABSENT');
});
test('installed local versions take precedence over available catalog versions; conflicts stay visible',()=>{
 const r=reconcile({current:[cli([{pluginId:'a@ours',version:'1'}]),catalog([{id:'a@ours',installed:true,version:'3',localVersion:'2'}])]});
 assert.equal(r.complete,false);assert.deepEqual(r.plugins[0].versions,['1','2']);
});
test('load errors and malformed identities cannot produce a clean inventory',()=>{
 assert.throws(()=>reconcile({current:[cli([{pluginId:'same display name',version:'1'}]),catalog([])]}),/exact/);
 const c=catalog([]);c.data.marketplaceLoadErrors=['failed'];assert.equal(reconcile({current:[cli([]),c]}).complete,false);
});
test('input snapshots are unchanged and credential fields never enter the result',()=>{
 const c=cli([{pluginId:'a@ours',version:'1',access_token:'private-fixture',env:{SECRET:'fixture'}}]);const before=JSON.stringify(c);
 const r=reconcile({current:[c,catalog([])]});assert.equal(JSON.stringify(c),before);assert.ok(!JSON.stringify(r).includes('private-fixture'));
 assert.deepEqual(r.safety,{targetExecuted:false,settingsChanged:false,networkRequests:0});
});
test('live registry, manifests and package metadata describe the same installed Studio version',async()=>{
 const pkg=JSON.parse(await fs.readFile(path.join(packageRoot,'package.json'),'utf8'));
 const registry=JSON.parse(await fs.readFile(path.join(packageRoot,'references/integration-registry.json'),'utf8'));
 assert.equal(registry.version,pkg.version);
 assert.equal((await selfCheck()).ok,true);
});
