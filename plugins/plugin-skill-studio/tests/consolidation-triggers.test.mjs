import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {route,packageRoot} from '../src/registry.mjs';

const matrix=JSON.parse(await fs.readFile(path.join(packageRoot,'references/consolidation/lifecycle-matrix.json'),'utf8'));
const triggers=matrix.entries.filter(e=>e.kind==='trigger'&&/skills\/studio-(quality|build)\/SKILL\.md#mode-/.test(e.target??''));

for(const skill of ['studio-quality','studio-build']){
 test(`every removed ${skill} trigger routes to ${skill} and its mode`,async()=>{
  const mine=triggers.filter(e=>e.target.includes(`/${skill}/`));assert.ok(mine.length>=10);
  const misses=[];
  for(const e of mine){
   const expected=e.target.split('#mode-')[1],r=await route(e.text);
   if(r.selected!==skill||(expected!=='router'&&r.mode!==expected))misses.push(`${e.id}: got ${r.selected}/${r.mode}, want ${skill}/${expected}`);
  }
  assert.deepEqual(misses,[]);
 });
}
