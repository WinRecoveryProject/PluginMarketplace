import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {spawnSync} from 'node:child_process';
import {packageRoot} from '../src/registry.mjs';
import {startRun,judgeExperiment,reportRun,resumeRun,treeHash} from '../src/eval/autoresearch.mjs';

const cli=path.join(packageRoot,'scripts/studio.mjs');
const SKILL='---\nname: demo-skill\ndescription: Use when demonstrating the autoresearch loop in tests.\n---\n\n# Demo\n\n1. Do the thing.\n';
async function fixture(t,prefix='editable'){
 const base=await fs.mkdtemp(path.join(os.tmpdir(),'pss-autoresearch-'));t.after(()=>fs.rm(base,{recursive:true,force:true}));
 const root=path.join(base,prefix,'demo-skill');await fs.mkdir(root,{recursive:true});await fs.writeFile(path.join(root,'SKILL.md'),SKILL);
 return {base,root};
}
const bench=passes=>async()=>({status:passes===2?'PASS':'FAIL',runs:[{status:passes>=1?'PASS':'FAIL'},{status:passes>=2?'PASS':'FAIL'}],behavior:{configFingerprint:'fp'}});

test('startRun refuses an install cache path',async t=>{
 const {base}=await fixture(t);const cached=path.join(base,'.claude','plugins','cache','x','skills','s');
 await fs.mkdir(cached,{recursive:true});await fs.writeFile(path.join(cached,'SKILL.md'),SKILL);
 await assert.rejects(()=>startRun(cached),/not an editable source: install cache/);
});

test('startRun copies candidate and kept and leaves the source untouched',async t=>{
 const {root}=await fixture(t);const before=await treeHash(root);
 const run=await startRun(root);
 assert.equal(await treeHash(run.candidateDir),before);assert.equal(await treeHash(path.join(run.runDir,'kept')),before);
 const baseline=JSON.parse(await fs.readFile(path.join(run.runDir,'baseline.json'),'utf8'));
 assert.equal(baseline.sourceHash,before);assert.equal(baseline.benchmark,null);assert.equal(baseline.static.valid,true);
 assert.equal(await treeHash(root),before);
 assert.ok(run.runDir.startsWith(path.join(path.dirname(root),'.autoresearch')));
});

test('without a benchmark config a valid change is UNKNOWN and the CLI exits 2',async t=>{
 const {root}=await fixture(t);const run=await startRun(root);
 await fs.appendFile(path.join(run.candidateDir,'SKILL.md'),'2. Verify the thing.\n');
 const r=spawnSync(process.execPath,[cli,'autoresearch-judge',run.runDir,'--description','add verify step'],{encoding:'utf8',windowsHide:true});
 assert.equal(r.status,2,r.stderr);const body=JSON.parse(r.stdout);assert.equal(body.verdict,'UNKNOWN');assert.equal(body.n,1);
 const receipt=JSON.parse(await fs.readFile(path.join(run.runDir,'receipts','001.json'),'utf8'));assert.equal(receipt.verdict,'UNKNOWN');
 assert.match(await fs.readFile(path.join(run.runDir,'receipts','001.diff'),'utf8'),/\+2\. Verify the thing\./);
});

test('a change that breaks the frontmatter is DISCARDed and rolled back byte-for-byte',async t=>{
 const {root}=await fixture(t);const run=await startRun(root);const kept=await treeHash(path.join(run.runDir,'kept'));
 await fs.writeFile(path.join(run.candidateDir,'SKILL.md'),SKILL.replace('name: demo-skill\n',''));
 await fs.writeFile(path.join(run.candidateDir,'extra.md'),'stray\n');
 const r=await judgeExperiment(run.runDir,{description:'drop name'});
 assert.equal(r.verdict,'DISCARD');assert.equal(await treeHash(run.candidateDir),kept);
});

test('benchmark decides KEEP versus DISCARD on identical fixtures',async t=>{
 const {root}=await fixture(t);const config=path.join(path.dirname(root),'bench.json');await fs.writeFile(config,'{}');
 const run=await startRun(root,{configPath:config,benchmarkRunner:bench(2)});
 await fs.appendFile(path.join(run.candidateDir,'SKILL.md'),'2. Keep me.\n');
 const keep=await judgeExperiment(run.runDir,{description:'keep',benchmarkRunner:bench(2)});
 assert.equal(keep.verdict,'KEEP');assert.equal(await treeHash(path.join(run.runDir,'kept')),await treeHash(run.candidateDir));
 const keptAfterKeep=await treeHash(path.join(run.runDir,'kept'));
 await fs.appendFile(path.join(run.candidateDir,'SKILL.md'),'3. Worse.\n');
 const worse=await judgeExperiment(run.runDir,{description:'worse',benchmarkRunner:bench(1)});
 assert.equal(worse.verdict,'DISCARD');assert.equal(await treeHash(run.candidateDir),keptAfterKeep);
 assert.deepEqual(await resumeRun(run.runDir),{lastKeptN:1,nextN:3});
});

test('resumeRun detects a kept snapshot edited after its receipt',async t=>{
 const {root}=await fixture(t);const config=path.join(path.dirname(root),'bench.json');await fs.writeFile(config,'{}');
 const run=await startRun(root,{configPath:config,benchmarkRunner:bench(2)});
 await fs.appendFile(path.join(run.candidateDir,'SKILL.md'),'2. Keep me.\n');
 await judgeExperiment(run.runDir,{description:'keep',benchmarkRunner:bench(2)});
 await fs.appendFile(path.join(run.runDir,'kept','SKILL.md'),'tampered\n');
 await assert.rejects(()=>resumeRun(run.runDir),/kept snapshot does not match receipt 001/);
});

test('reportRun writes the combined diff and never touches the source',async t=>{
 const {root}=await fixture(t);const config=path.join(path.dirname(root),'bench.json');await fs.writeFile(config,'{}');
 const run=await startRun(root,{configPath:config,benchmarkRunner:bench(2)});const before=await treeHash(root);
 await fs.appendFile(path.join(run.candidateDir,'SKILL.md'),'2. Keep me.\n');
 await judgeExperiment(run.runDir,{description:'keep',benchmarkRunner:bench(2)});
 const report=await reportRun(run.runDir);
 assert.equal(report.kept,1);assert.equal(report.experiments,1);
 assert.match(await fs.readFile(report.combinedDiffPath,'utf8'),/\+2\. Keep me\./);
 assert.equal(await treeHash(root),before);assert.deepEqual(report.warnings,[]);
});
