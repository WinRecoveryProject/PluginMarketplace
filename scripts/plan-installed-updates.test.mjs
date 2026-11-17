import test from 'node:test';
import assert from 'node:assert/strict';
import {planInstalledUpdates} from './plan-installed-updates.mjs';
const personal='codex-process-jobs@created-by-me-remote';
const mirror='codex-process-jobs@winrecoveryproject-digital';
const studio='plugin-skill-studio@winrecoveryproject-digital';
const record=(pluginId,enabled=true)=>({pluginId,enabled,installed:true,version:'0.1.0'});
test('catalog mirror does not replace or install beside the personal identity',()=>{
 const result=planInstalledUpdates({installed:[record(personal),record(studio)]},[mirror,studio]);
 assert.deepEqual(result.updates,[{id:studio,currentVersion:'0.1.0'}]);
 assert.equal(result.skipped[0].id,mirror);
 assert.equal(result.mutationsPerformed,false);
});
test('disabled packages remain outside update/activation commands',()=>{
 const result=planInstalledUpdates({installed:[record(studio,false)]},[studio]);
 assert.deepEqual(result.updates,[]);assert.match(result.skipped[0].reason,/disabled/);
});
test('requested and installed input records are unchanged and secrets are not projected',()=>{
 const input={installed:[{...record(studio),privateToken:'fixture-only'}]};const before=JSON.stringify(input);
 const requested=[studio,studio];const result=planInstalledUpdates(input,requested);
 assert.equal(result.updates.length,1);assert.equal(JSON.stringify(input),before);
 assert.deepEqual(requested,[studio,studio]);assert.ok(!JSON.stringify(result).includes('fixture-only'));
});
test('display labels cannot silently replace exact namespace-qualified IDs',()=>{
 assert.throws(()=>planInstalledUpdates({installed:[record(studio)]},['Plugin-Skill-Studio']),/exact/);
});
test('malformed or duplicate installed records fail closed',()=>{
 for(const installed of [[null],[record(studio),record(studio)],[{pluginId:studio,enabled:null,installed:true,version:'1'}]])
  assert.throws(()=>planInstalledUpdates({installed},[studio]));
});
test('missing registry or requested list cannot imply a successful update',()=>{
 for(const input of [null,{}, {installed:null}])assert.throws(()=>planInstalledUpdates(input,[studio]));
 assert.throws(()=>planInstalledUpdates({installed:[]},[]));
});

test('JSON arrays and other coerced installed identities are rejected',()=>{
 for(const pluginId of [[studio],{id:studio},null,42])
  assert.throws(()=>planInstalledUpdates({installed:[{...record(studio),pluginId}]},[studio]),/Malformed/);
 assert.throws(()=>planInstalledUpdates({installed:[record([studio]),record([studio])]},[studio]),/Malformed/);
});
