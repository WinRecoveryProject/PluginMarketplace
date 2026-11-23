import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {packageRoot,route} from '../src/registry.mjs';
import {checkMatrix} from '../src/consolidation/check.mjs';

const C=path.join(packageRoot,'references/consolidation');
const MODES=path.join(packageRoot,'skills/studio-debug/modes');
const readJson=async f=>JSON.parse(await fs.readFile(f,'utf8'));
const lfHash=buf=>createHash('sha256').update(buf.toString('utf8').replace(/\r\n/g,'\n')).digest('hex');
const REMOVED=['diagnose-systematically','diagnosing-bugs','triage'];
const SHARED=['diagnose.md','loop.md','triage.md',
 'diagnose/root-cause-tracing.md','diagnose/defense-in-depth.md','diagnose/condition-based-waiting.md','diagnose/scripts/find-polluter.sh',
 'loop/scripts/hitl-loop.template.sh','triage/AGENT-BRIEF.md','triage/OUT-OF-SCOPE.md'];

test('shared debug modes match the hashes pinned for Studio and DevSuite',async()=>{
 const pinned=(await readJson(path.join(C,'shared-debug-modes.json'))).files;
 for(const m of SHARED)assert.ok(m in pinned,m);
 for(const [file,hash] of Object.entries(pinned))assert.equal(lfHash(await fs.readFile(path.join(MODES,file))),hash,file);
});

test('shared debug modes carry no package links or package-only skill names',async()=>{
 for(const file of Object.keys((await readJson(path.join(C,'shared-debug-modes.json'))).files).filter(f=>f.endsWith('.md'))){
  const text=(await fs.readFile(path.join(MODES,file),'utf8')).replace(/<a id="[^"]*"><\/a>/g,'');
  assert.doesNotMatch(text,/\]\(\.\.\/\.\.\/|skills\/|studio-|policy\.md|diagnose-systematically|diagnosing-bugs|automate-ui|refactor-safely|research-systematically|setup-engineering-workflows|to-tickets/,file);
 }
});

test('debug matrix covers every capability of the merged skills',async()=>{
 const r=await checkMatrix(await readJson(path.join(C,'debug-matrix.json')),{repoRoot:packageRoot});
 assert.deepEqual(r.errors,[]);assert.equal(r.counts.unmapped,0);
 assert.deepEqual((await readJson(path.join(C,'debug-matrix.json'))).entries.filter(e=>e.status==='dropped').map(e=>e.id),[]);
});

test('every removed debug trigger routes to studio-debug and its mode',async()=>{
 const m=await readJson(path.join(C,'debug-matrix.json'));const misses=[];
 for(const e of m.entries.filter(e=>e.kind==='trigger'&&(e.target??'').includes('skills/studio-debug/SKILL.md#mode-'))){
  const want=e.target.split('#mode-')[1],r=await route(e.text);
  if(r.selected!=='studio-debug'||r.mode!==want)misses.push(`${e.id}: got ${r.selected}/${r.mode}, want studio-debug/${want}`);
 }
 assert.deepEqual(misses,[]);
});

test('common debugging requests route to studio-debug',async()=>{
 for(const [request,mode] of [['debug this failing test','loop'],['flaky CI keeps failing','loop'],['fejlsøg denne fejl','diagnose'],['find the root cause of this regression','diagnose'],['triage these issues','triage']]){
  const r=await route(request);assert.deepEqual([r.selected,r.mode],['studio-debug',mode],request);
 }
});

test('no Studio skill still refers to a removed debug skill',async()=>{
 const walk=async d=>{const out=[];for(const e of await fs.readdir(d,{withFileTypes:true})){const p=path.join(d,e.name);if(e.isDirectory())out.push(...await walk(p));else if(p.endsWith('.md'))out.push(p);}return out;};
 const hits=[];
 for(const file of await walk(path.join(packageRoot,'skills'))){
  if(file.includes(`${path.sep}studio-debug${path.sep}modes${path.sep}`))continue; // shared files: checked by the no-package-names test
  const text=(await fs.readFile(file,'utf8')).replace(/<a id="[^"]*"><\/a>/g,'');
  for(const name of REMOVED){
   // "triage" is also an ordinary word (triage labels, needs-triage); only skill-name forms count.
   const forms=[new RegExp(`(\\.\\./|skills/)${name}/`),new RegExp('`'+name+'`'),new RegExp(`\\b${name} skill\\b`),new RegExp(`(^|[^\\w-])/${name}\\b`)];
   if(name!=='triage')forms.push(new RegExp(`(?<![\\w/.#"\`-])${name}(?![\\w.:-])`));
   if(forms.some(re=>re.test(text)))hits.push(`${path.relative(packageRoot,file)}: ${name}`);
  }
 }
 assert.deepEqual(hits,[]);
});
