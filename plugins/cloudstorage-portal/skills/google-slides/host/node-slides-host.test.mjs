import test from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {createNodeSlidesHost} from './node-slides-host.mjs';
import {exportAndRenderSlides} from './export-and-render-slides.mjs';
import {readTemplateToFile} from './read-template-to-file.mjs';

async function fixture(t){
 const root=await fs.mkdtemp(path.join(os.tmpdir(),"slides host's æøå "));
 t.after(()=>fs.rm(root,{recursive:true,force:true}));
 const pdf=Buffer.from('%PDF-1.7\nfixture\n%%EOF\n');
 const source=path.join(root,'source.pdf');await fs.writeFile(source,pdf);
 return {root,pdf,source};
}
test('Node route uses argument arrays, ordered verified PNGs and native slide IDs',async t=>{
 const {root,pdf,source}=await fixture(t),output=path.join(root,'render output');
 const calls=[];
 const host=createNodeSlidesHost({execute:async(exe,args,options)=>{
  calls.push({exe,args,options});
  await fs.writeFile(path.join(output,'slide-10.png'),Buffer.from([137,80,78,71,13,10,26,10]));
  await fs.writeFile(path.join(output,'slide-2.png'),Buffer.from([137,80,78,71,13,10,26,10]));
 }});
 const design=path.join(root,'design.json');
 const designInput={source:{presentation:{id:'deck'}},slides:[{index:1,slideId:'native-2'},{index:0,slideId:'native-1'}]};
 await fs.writeFile(design,JSON.stringify(designInput));
 const result=await exportAndRenderSlides({presentationId:'deck',workspaceRoot:root,outputDir:output,designSystemPath:design,pdftoppmPath:process.execPath,host,
  tools:{mcp__codex_apps__google_drive_fetch:async()=>({structuredContent:{file_uri:{mime_type:'application/pdf'},workspace_path:source,size:pdf.length}})}});
 assert.equal(result.pageCount,2);assert.deepEqual(result.images.map(i=>i.slideObjectId),['native-1','native-2']);
 assert.deepEqual(result.images.map(i=>path.basename(i.path)),['slide-2.png','slide-10.png']);
 assert.equal(calls[0].options.shell,false);assert.equal(calls[0].options.windowsHide,true);
 assert.deepEqual(calls[0].args,['-png','-r','120',path.join(output,'presentation.pdf'),path.join(output,'slide')]);
});
test('native template reader preserves complete connector response and omits fields',async t=>{
 const {root}=await fixture(t),output=path.join(root,'raw-template.json'),calls=[];
 const raw={structuredContent:{presentationId:'deck',slides:[{objectId:'a'}],layouts:[{objectId:'b'}]},content:[]};
 const result=await readTemplateToFile({presentationId:'deck',outputPath:output,workspaceRoot:root,host:createNodeSlidesHost(),tools:{mcp__codex_apps__google_drive_get_presentation:async args=>{calls.push(args);return raw;}}});
 assert.deepEqual(calls,[{presentation_id:'deck'}]);assert.deepEqual(JSON.parse(await fs.readFile(output,'utf8')),raw);
 assert.equal(result.status,'complete');
});
test('Node route rejects sibling-prefix escapes and relative paths',async t=>{
 const {root}=await fixture(t),host=createNodeSlidesHost();
 assert.throws(()=>host.assertWithinRoot(root+'-sibling/file.pdf',root),/trusted root/);
 assert.throws(()=>host.normalizeAbsolutePath('relative.pdf'),/absolute path/);
 if(process.platform==='win32'){
  assert.throws(()=>host.normalizeAbsolutePath('C:relative.pdf'),/absolute path/);
  assert.throws(()=>host.normalizeAbsolutePath('\\\\server\\share\\file.pdf'),/local absolute drive/);
  assert.throws(()=>host.normalizeAbsolutePath(path.join(root,'file.pdf:stream')),/alternate data streams/);
 }
});
test('Node route checks real file limit and leaves no output for an oversized source',async t=>{
 const {root,source}=await fixture(t),output=path.join(root,'renders/presentation.pdf');
 await fs.truncate(source,32*1024*1024+1);
 await assert.rejects(createNodeSlidesHost().copyMaterializedPdf({source,outputPath:output,workspaceRoot:root}),/exceeds the byte limit/);
 await assert.rejects(fs.stat(output),e=>e.code==='ENOENT');
});
test('Node route checks design-system symlinks and PNG headers',async t=>{
 const {root,source}=await fixture(t),host=createNodeSlidesHost(),linked=path.join(root,'linked.json');
 await fs.symlink(source,linked);
 await assert.rejects(host.readDesignSystem({designSystemPath:linked,workspaceRoot:root}),/must not include symlinks/);
 const output=path.join(root,'renders');await fs.mkdir(output);
 const bad=createNodeSlidesHost({execute:async()=>fs.writeFile(path.join(output,'slide-1.png'),'not a PNG')});
 await assert.rejects(bad.render({renderer:process.execPath,pdfPath:source,output,dpi:72,workspaceRoot:root}),/PNG header/);
});
