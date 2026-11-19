import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {spawnSync} from 'node:child_process';
import {packageRoot} from '../src/registry.mjs';
import {seedMatrix,checkMatrix,slug} from '../src/consolidation/check.mjs';

const cli=path.join(packageRoot,'scripts/studio.mjs');
async function repo(t){
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'pss-consolidation-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));
 const skill=path.join(root,'src-plugin/skills/alpha');
 await fs.mkdir(path.join(skill,'agents'),{recursive:true});await fs.mkdir(path.join(skill,'references'),{recursive:true});
 await fs.writeFile(path.join(skill,'SKILL.md'),'---\nname: alpha\ndescription: Use when building alpha things. Also use for beta checks.\n---\n\n# Alpha\n\nFirst paragraph line one\ncontinues here.\n\n- bullet one\n- bullet two\n\n1. numbered step\n');
 await fs.writeFile(path.join(skill,'agents/openai.yaml'),'interface:\n  display_name: "Alpha"\npolicy:\n  allow_implicit_invocation: true\n');
 await fs.writeFile(path.join(skill,'references/notes.md'),'# Notes\n');
 await fs.mkdir(path.join(root,'out'),{recursive:true});
 await fs.writeFile(path.join(root,'out/target.md'),'# Target\n\n## Held-out triggers\n\n<a id="custom-anchor"></a>\n');
 return {root,sources:[{id:'src',root:'src-plugin/skills/alpha'}]};
}
function cover(matrix,target='out/target.md#target'){for(const e of matrix.entries){e.status='covered';e.target=target;}return matrix;}

test('seedMatrix splits a skill into trigger, instruction, policy and file entries',async t=>{
 const {root,sources}=await repo(t);const m=await seedMatrix(sources,{repoRoot:root});
 assert.equal(m.schemaVersion,1);assert.deepEqual(m.sources,[{id:'src',root:'src-plugin/skills/alpha'}]);
 const by=k=>m.entries.filter(e=>e.kind===k);
 assert.deepEqual(by('trigger').map(e=>e.text),['Use when building alpha things.','Also use for beta checks.']);
 assert.deepEqual(by('instruction').map(e=>e.text),['First paragraph line one continues here.','- bullet one','- bullet two','1. numbered step']);
 assert.equal(by('instruction')[0].source,'src/SKILL.md:8');assert.equal(by('instruction')[0].id,'src.alpha.L8');
 assert.deepEqual(by('policy').map(e=>e.text).sort(),['interface','policy']);
 assert.deepEqual(by('file').map(e=>e.id),['src.file:references/notes.md']);
 assert.ok(m.entries.every(e=>e.status==='unmapped'&&e.target===null));
});

test('checkMatrix passes when every entry is covered by an existing anchor',async t=>{
 const {root,sources}=await repo(t);const m=cover(await seedMatrix(sources,{repoRoot:root}));
 m.entries[0].target='out/target.md#held-out-triggers';m.entries[1].target='out/target.md#custom-anchor';m.entries[2].target='out';
 const r=await checkMatrix(m,{repoRoot:root});assert.deepEqual(r.errors,[]);assert.equal(r.ok,true);
 assert.deepEqual(r.counts,{covered:m.entries.length,merged:0,dropped:0,unmapped:0,total:m.entries.length});
});

test('checkMatrix reports every defect by entry id',async t=>{
 const {root,sources}=await repo(t);const base=()=>seedMatrix(sources,{repoRoot:root}).then(m=>cover(m));
 const cases=[
  [m=>{m.entries[0].status='unmapped';m.entries[0].target=null;},/unmapped: src\./],
  [m=>{m.entries[0].target='out/missing.md#x';},/target missing: src\./],
  [m=>{m.entries[0].target='out/target.md#nope';},/anchor missing: src\..*#nope/],
  [m=>{m.entries[0].status='dropped';m.entries[0].target=null;m.entries[0].reason='dup';},/unapproved drop: src\./],
  [m=>{m.entries[0].status='dropped';m.entries[0].target=null;m.entries[0].approved=true;m.entries[0].reason=' ';},/unapproved drop: src\./],
  [m=>{m.entries[0].status='merged-with:none';m.entries[0].target=null;},/bad merge: src\..*none/],
  [m=>{m.entries[1].status='unmapped';m.entries[0].status='merged-with:'+m.entries[1].id;m.entries[0].target=null;},/bad merge: src\./],
  [m=>{m.entries=m.entries.filter(e=>e.kind!=='file');},/unrepresented source file: src\/references\/notes\.md/],
  [m=>{m.entries.push({...m.entries[0]});},/duplicate id: src\./],
  [m=>{m.entries[0].target='../outside.md';},/escapes repository: src\./],
 ];
 for(const [mutate,pattern] of cases){const m=await base();mutate(m);const r=await checkMatrix(m,{repoRoot:root});assert.equal(r.ok,false,String(pattern));assert.ok(r.errors.some(e=>pattern.test(e)),`${pattern} not in ${r.errors.join(' | ')}`);}
});

test('checkMatrix accepts approved drops and valid merges and counts them',async t=>{
 const {root,sources}=await repo(t);const m=cover(await seedMatrix(sources,{repoRoot:root}));
 m.entries[0].status='dropped';m.entries[0].target=null;m.entries[0].approved=true;m.entries[0].reason='Superseded by stricter rule.';
 m.entries[1].status='merged-with:'+m.entries[2].id;m.entries[1].target=null;
 const r=await checkMatrix(m,{repoRoot:root});assert.equal(r.ok,true,r.errors.join('\n'));
 assert.equal(r.counts.dropped,1);assert.equal(r.counts.merged,1);assert.equal(r.counts.covered,m.entries.length-2);
});

test('slug follows GitHub heading anchors',()=>{assert.equal(slug('Held-out triggers'),'held-out-triggers');assert.equal(slug('Engine coverage (plugin-eval)'),'engine-coverage-plugin-eval');});

test('CLI consolidation-check exits 1 with JSON on a failing matrix and seed writes a matrix',async t=>{
 const {root,sources}=await repo(t);const src=path.join(root,'sources.json'),out=path.join(root,'matrix.json');
 await fs.writeFile(src,JSON.stringify(sources));
 const seeded=spawnSync(process.execPath,[cli,'consolidation-seed',src,'--repo-root',root,'--out',out],{encoding:'utf8',windowsHide:true});
 assert.equal(seeded.status,0,seeded.stderr);assert.ok(JSON.parse(await fs.readFile(out,'utf8')).entries.length>0);
 const checked=spawnSync(process.execPath,[cli,'consolidation-check',out,'--repo-root',root],{encoding:'utf8',windowsHide:true});
 assert.equal(checked.status,1,checked.stderr);const body=JSON.parse(checked.stdout);assert.equal(body.ok,false);assert.ok(body.errors.length>0);
});
