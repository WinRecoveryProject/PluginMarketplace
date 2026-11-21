import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {packageRoot,route} from '../src/registry.mjs';
import {checkMatrix} from '../src/consolidation/check.mjs';

const C=path.join(packageRoot,'references/consolidation');
const MODES=path.join(packageRoot,'skills/studio-plan/modes');
const readJson=async f=>JSON.parse(await fs.readFile(f,'utf8'));
const lfHash=buf=>createHash('sha256').update(buf.toString('utf8').replace(/\r\n/g,'\n')).digest('hex');
const REMOVED=['brainstorming','writing-plans','grill-me','grill-with-docs','grilling','to-spec','to-tickets','to-questionnaire','goal','wayfinder'];
// Literal data labels that keep an old name on purpose: tracker labels, ticket types and output file names.
const DATA_LABELS=['`wayfinder:map`','`research`, `prototype`, `grilling`, `task`','`to-questionnaire-<slug>.md`','/goal'];

test('shared plan modes match the hashes pinned for Studio and DevSuite',async()=>{
 const pinned=await readJson(path.join(C,'shared-plan-modes.json'));
 assert.deepEqual(Object.keys(pinned.files).sort(),['discover.md','goal.md','interview.md','map.md','plan-full.md','plan.md','questions.md','spec.md','tickets.md']);
 for(const [file,hash] of Object.entries(pinned.files))assert.equal(lfHash(await fs.readFile(path.join(MODES,file))),hash,file);
});

test('shared plan modes carry no package links or skill paths',async()=>{
 for(const file of Object.keys((await readJson(path.join(C,'shared-plan-modes.json'))).files)){
  const text=await fs.readFile(path.join(MODES,file),'utf8');
  assert.doesNotMatch(text,/\]\(\.\.\/|skills\/|studio-policy|policy\.md|visual-companion\.md|scripts\//,file);
 }
});

test('plan matrix covers every capability of the merged skills',async()=>{
 const r=await checkMatrix(await readJson(path.join(C,'plan-matrix.json')),{repoRoot:packageRoot});
 assert.deepEqual(r.errors,[]);assert.equal(r.counts.unmapped,0);
});

test('every removed planning trigger routes to studio-plan and its mode',async()=>{
 const m=await readJson(path.join(C,'plan-matrix.json'));const misses=[];
 for(const e of m.entries.filter(e=>e.kind==='trigger'&&/skills\/studio-plan\/SKILL\.md#mode-/.test(e.target??''))){
  const want=e.target.split('#mode-')[1],r=await route(e.text);
  if(r.selected!=='studio-plan'||r.mode!==want)misses.push(`${e.id}: got ${r.selected}/${r.mode}, want studio-plan/${want}`);
 }
 assert.deepEqual(misses,[]);
});

test('Danish planning requests still reach plan mode',async()=>{
 const r=await route('Lav en plan');assert.equal(r.selected,'studio-plan');assert.equal(r.mode,'plan');
});

export {REMOVED,DATA_LABELS};

test('no Studio skill still refers to a removed planning skill',async()=>{
 const walk=async d=>{const out=[];for(const e of await fs.readdir(d,{withFileTypes:true})){const p=path.join(d,e.name);if(e.isDirectory())out.push(...await walk(p));else if(p.endsWith('.md'))out.push(p);}return out;};
 const LABELS=[/`wayfinder:[^`]*`/g,/\(`research`[^)]*`task`\)/g,/`research`\/`prototype`\/`grilling`\/`task`/g,/`to-questionnaire-<slug>\.md`/g,/\/goal\b/g,/<a id="[^"]*"><\/a>/g];
 // brainstorming, goal and grilling are also ordinary words, so only their path, code and "skill" forms count.
 const hyphenated=['writing-plans','grill-me','grill-with-docs','to-spec','to-tickets','to-questionnaire','wayfinder'];
 const hits=[];
 for(const file of await walk(path.join(packageRoot,'skills'))){
  let text=await fs.readFile(file,'utf8');for(const re of LABELS)text=text.replace(re,'');
  for(const name of REMOVED){
   const forms=[new RegExp(`(\.\./|skills/)${name}/`),new RegExp(`\`${name}\``),new RegExp(`\b${name} skill\b`)];
   if(hyphenated.includes(name))forms.push(new RegExp(`(?<![\w/.#"\`-])${name}(?![\w.:-])`));
   if(forms.some(re=>re.test(text)))hits.push(`${path.relative(packageRoot,file)}: ${name}`);
  }
 }
 assert.deepEqual(hits,[]);
});
