// Explicit local integration test: real filesystem and caller-selected existing pdftoppm.
import * as fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createNodeSlidesHost} from '../skills/google-slides/host/node-slides-host.mjs';
import {exportAndRenderSlides} from '../skills/google-slides/host/export-and-render-slides.mjs';

const renderer=process.argv[2];
assert.ok(renderer && path.isAbsolute(renderer),'Pass the absolute existing pdftoppm executable path');
function singlePagePdf(){
 const stream='BT /F1 16 Tf 20 160 Td (WinRecoveryProject Windows render test) Tj ET';
 const objects=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
  '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 320 200] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
  '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',`<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`];
 let text='%PDF-1.7\n';const offsets=[0];
 objects.forEach((body,i)=>{offsets.push(Buffer.byteLength(text));text+=`${i+1} 0 obj\n${body}\nendobj\n`;});
 const xref=Buffer.byteLength(text);
 text+=`xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map(n=>String(n).padStart(10,'0')+' 00000 n ').join('\n')}\ntrailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
 return Buffer.from(text);
}
const root=await fs.mkdtemp(path.join(os.tmpdir(),"wrp slides native's æøå "));
try {
 const pdf=singlePagePdf(),source=path.join(root,'source.pdf');await fs.writeFile(source,pdf);
 const result=await exportAndRenderSlides({presentationId:'disposable-native-fixture',workspaceRoot:root,outputDir:path.join(root,'renders'),pdftoppmPath:renderer,dpi:72,
  host:createNodeSlidesHost(),tools:{mcp__codex_apps__google_drive_fetch:async()=>({structuredContent:{file_uri:{mime_type:'application/pdf'},workspace_path:source,size:pdf.length}})}});
 assert.equal(result.pageCount,1);assert.equal(result.pdf.sha256,createHash('sha256').update(pdf).digest('hex'));
 const png=await fs.readFile(result.images[0].path);assert.equal(png.readUInt32BE(16),320);assert.equal(png.readUInt32BE(20),200);
 console.log(JSON.stringify({status:'PASS',platform:process.platform,realRenderer:true,pages:1,width:320,height:200,pdfSha256:result.pdf.sha256,cloudCalls:0,fixtureConnector:true,budgetDkk:0}));
} finally {
 assert.equal(path.dirname(root),path.resolve(os.tmpdir()));assert.ok(path.basename(root).startsWith('wrp slides native'));
 await fs.rm(root,{recursive:true,force:true});
}
