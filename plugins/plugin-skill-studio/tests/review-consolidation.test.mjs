import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {packageRoot,route} from '../src/registry.mjs';
import {checkMatrix} from '../src/consolidation/check.mjs';

const C=path.join(packageRoot,'references/consolidation');
const MODES=path.join(packageRoot,'skills/studio-review/modes');
const readJson=async f=>JSON.parse(await fs.readFile(f,'utf8'));
const lfHash=buf=>createHash('sha256').update(buf.toString('utf8').replace(/\r\n/g,'\n')).digest('hex');

test('shared review modes match the hashes pinned for Studio and DevSuite',async()=>{
 const pinned=await readJson(path.join(C,'shared-review-modes.json'));
 assert.deepEqual(Object.keys(pinned.files).sort(),['code-reviewer.md','code.md','decide.md','receive.md','request.md','verify.md']);
 for(const [file,hash] of Object.entries(pinned.files))assert.equal(lfHash(await fs.readFile(path.join(MODES,file))),hash,file);
});

test('shared review modes carry no package-specific links',async()=>{
 for(const file of Object.keys((await readJson(path.join(C,'shared-review-modes.json'))).files)){
  const text=await fs.readFile(path.join(MODES,file),'utf8');
  assert.doesNotMatch(text,/\]\(\.\.\/\.\.\/|studio-policy|policy\.md/,file);
 }
});

test('review matrix covers every capability of the merged skills',async()=>{
 const r=await checkMatrix(await readJson(path.join(C,'review-matrix.json')),{repoRoot:packageRoot});
 assert.deepEqual(r.errors,[]);assert.equal(r.counts.unmapped,0);
});

test('every removed review trigger routes to studio-review and its mode',async()=>{
 const m=await readJson(path.join(C,'review-matrix.json'));
 const misses=[];
 for(const e of m.entries.filter(e=>e.kind==='trigger'&&/skills\/studio-review\/SKILL\.md#mode-/.test(e.target??''))){
  const want=e.target.split('#mode-')[1],r=await route(e.text);
  if(r.selected!=='studio-review'||r.mode!==want)misses.push(`${e.id}: got ${r.selected}/${r.mode}, want studio-review/${want}`);
 }
 assert.deepEqual(misses,[]);
});

test('no Studio skill names a removed review skill',async()=>{
 const REMOVED=['code-review','requesting-code-review','receiving-code-review','review-decision','verification-before-completion','verify-work','risk-review'];
 const walk=async d=>(await fs.readdir(d,{withFileTypes:true})).flatMap(e=>e.isDirectory()?[]:[path.join(d,e.name)]).concat(...await Promise.all((await fs.readdir(d,{withFileTypes:true})).filter(e=>e.isDirectory()).map(e=>walk(path.join(d,e.name)))));
 const hits=[];
 for(const file of (await walk(path.join(packageRoot,'skills'))).filter(f=>f.endsWith('.md'))){
  const text=await fs.readFile(file,'utf8');
  for(const name of REMOVED)if(new RegExp(`(?<![\\w/.#"-])${name}(?![\\w.-])`).test(text.replace(/<a id="[^"]*"><\/a>/g,'')))hits.push(`${path.relative(packageRoot,file)}: ${name}`);
 }
 assert.deepEqual(hits,[]);
});

test('risk requests route to the studio-quality risk mode',async()=>{
 const r=await route('risk scan this skill');assert.equal(r.selected,'studio-quality');assert.equal(r.mode,'risk');
});
