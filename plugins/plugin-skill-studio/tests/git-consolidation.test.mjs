import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {packageRoot,route} from '../src/registry.mjs';
import {checkMatrix} from '../src/consolidation/check.mjs';

const C=path.join(packageRoot,'references/consolidation');
const MODES=path.join(packageRoot,'skills/studio-git/modes');
const readJson=async f=>JSON.parse(await fs.readFile(f,'utf8'));
const lfHash=buf=>createHash('sha256').update(buf.toString('utf8').replace(/\r\n/g,'\n')).digest('hex');
const REMOVED=['using-git-worktrees','finishing-a-development-branch','resolving-merge-conflicts','git-safety-guardrails'];

test('shared git modes match the hashes pinned for Studio and DevSuite',async()=>{
 const pinned=(await readJson(path.join(C,'shared-git-modes.json'))).files;
 for(const m of ['worktree.md','finish.md','conflicts.md','safety.md','safety/scripts/block-dangerous-git.sh','safety/scripts/classify_git_command.py'])assert.ok(m in pinned,m);
 for(const [file,hash] of Object.entries(pinned))assert.equal(lfHash(await fs.readFile(path.join(MODES,file))),hash,file);
});

test('shared git modes carry no package links or package-only skill names',async()=>{
 for(const file of Object.keys((await readJson(path.join(C,'shared-git-modes.json'))).files).filter(f=>f.endsWith('.md'))){
  const text=(await fs.readFile(path.join(MODES,file),'utf8')).replace(/<a id="[^"]*"><\/a>/g,'');
  assert.doesNotMatch(text,/\]\(\.\.\/\.\.\/|skills\/|studio-|studio-policy|policy\.md|using-git-worktrees|finishing-a-development-branch|automate-ui|diagnose-systematically|refactor-safely|research-systematically/,file);
 }
});

test('git matrix covers every capability of the merged skills',async()=>{
 const r=await checkMatrix(await readJson(path.join(C,'git-matrix.json')),{repoRoot:packageRoot});
 assert.deepEqual(r.errors,[]);assert.equal(r.counts.unmapped,0);
});

test('every removed git trigger routes to studio-git and its mode',async()=>{
 const m=await readJson(path.join(C,'git-matrix.json'));const misses=[];
 for(const e of m.entries.filter(e=>e.kind==='trigger'&&/skills\/studio-git\/SKILL\.md#mode-/.test(e.target??''))){
  const want=e.target.split('#mode-')[1],r=await route(e.text);
  if(r.selected!=='studio-git'||r.mode!==want)misses.push(`${e.id}: got ${r.selected}/${r.mode}, want studio-git/${want}`);
 }
 assert.deepEqual(misses,[]);
});

export {REMOVED};

test('no Studio skill still refers to a removed git skill',async()=>{
 const walk=async d=>{const out=[];for(const e of await fs.readdir(d,{withFileTypes:true})){const p=path.join(d,e.name);if(e.isDirectory())out.push(...await walk(p));else if(p.endsWith('.md'))out.push(p);}return out;};
 const hits=[];
 for(const file of await walk(path.join(packageRoot,'skills'))){
  if(file.includes(`${path.sep}studio-git${path.sep}modes${path.sep}`))continue; // shared files: checked by the no-package-names test
  const text=(await fs.readFile(file,'utf8')).replace(/<a id="[^"]*"><\/a>/g,'');
  for(const name of REMOVED){
   const forms=[new RegExp(`(\.\./|skills/)${name}/`),new RegExp(`\`${name}\``),new RegExp(`\b${name} skill\b`)];
   forms.push(new RegExp(`(?<![\w/.#"\`-])${name}(?![\w.:-])`));
   if(forms.some(re=>re.test(text)))hits.push(`${path.relative(packageRoot,file)}: ${name}`);
  }
 }
 assert.deepEqual(hits,[]);
});
