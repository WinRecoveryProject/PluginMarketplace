import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {selfCheck} from '../src/registry.mjs';

for(const newline of ['\n','\r\n']){
 test(`self-check accepts ${newline==='\n'?'LF':'CRLF'} skill frontmatter`,async t=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'studio-registry-newline-'));
  t.after(()=>fs.rm(root,{recursive:true,force:true}));
  for(const dir of ['references','.codex-plugin','skills/sample'])await fs.mkdir(path.join(root,dir),{recursive:true});
  await fs.writeFile(path.join(root,'plugin.json'),JSON.stringify({name:'plugin-skill-studio',version:'1.0.0',extensions:{'com.openai':{interface:{}}}}));
  await fs.writeFile(path.join(root,'.codex-plugin/plugin.json'),JSON.stringify({name:'plugin-skill-studio',version:'1.0.0',interface:{}}));
  await fs.writeFile(path.join(root,'references/integration-registry.json'),JSON.stringify({sources:[],capabilities:[{id:'sample',entrypoint:'skills/sample/SKILL.md'}]}));
  const file=path.join(root,'skills/sample/SKILL.md');
  const bytes=['---','name: sample','description: Use when checking registry identity.','---','# Sample','Read only.',''].join(newline);
  await fs.writeFile(file,bytes);
  assert.deepEqual((await selfCheck(root)).errors,[]);
  assert.equal(await fs.readFile(file,'utf8'),bytes);
 });
}
