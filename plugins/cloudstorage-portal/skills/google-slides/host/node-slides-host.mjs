// Local host adapter. Provider credentials remain in the supplied connector tools.
import * as fs from 'node:fs/promises';
import {constants} from 'node:fs';
import path from 'node:path';
import {createHash, randomUUID} from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';

const executeFile = promisify(execFile);
const MAX_PDF_BYTES = 32 * 1024 * 1024;
const PNG_HEADER = Buffer.from([137,80,78,71,13,10,26,10]);

function requireValue(ok, message) { if (!ok) throw new Error(message); }
function absolute(value, label='path') {
  requireValue(typeof value === 'string' && path.isAbsolute(value) && !/[\0\r\n]/.test(value), `${label} must be an absolute path`);
  if (process.platform === 'win32') {
    requireValue(/^[a-z]:[\\/]/i.test(value), `${label} must use a local absolute drive path`);
    requireValue(!value.slice(2).includes(':'),`${label} must not use alternate data streams`);
  }
  return path.normalize(value);
}
function contains(value, root) {
  const relative=path.relative(absolute(root), absolute(value));
  return relative==='' || (!path.isAbsolute(relative) && relative!=='..' && !relative.startsWith('..'+path.sep));
}
function within(value, root, label='path') {
  const result=absolute(value,label);
  requireValue(contains(result,root), `${label} must stay within its trusted root`);
  return result;
}
async function exists(value) {
  try { await fs.lstat(value); return true; } catch(error) { if(error.code==='ENOENT') return false; throw error; }
}
async function realDirectory(directory,label) {
  const stat=await fs.lstat(directory);
  requireValue(!stat.isSymbolicLink(),`${label} must not include symlinks`);
  requireValue(stat.isDirectory(),`${label} component must be a directory`);
}
async function inspectTree(root, target, label, createDirectories=false) {
  root=absolute(root);target=within(target,root,label);
  await realDirectory(root,label+' root');
  let cursor=root;
  for(const part of path.relative(root,target).split(path.sep).filter(Boolean)) {
    cursor=path.join(cursor,part);
    if(createDirectories) {
      try { await fs.mkdir(cursor,{mode:0o700}); } catch(error) { if(error.code!=='EEXIST') throw error; }
    }
    const stat=await fs.lstat(cursor);
    requireValue(!stat.isSymbolicLink(),`${label} must not include symlinks`);
    if(cursor!==target || createDirectories) requireValue(stat.isDirectory(),`${label} component must be a directory`);
  }
  const canonicalRoot=await fs.realpath(root),canonicalTarget=await fs.realpath(target);
  requireValue(contains(canonicalTarget,canonicalRoot),`${label} must stay within its trusted root`);
}
async function boundedRead(file, root, limit, label) {
  file=within(file,root,label);
  await inspectTree(root,file,label);
  const before=await fs.lstat(file,{bigint:true});
  requireValue(before.isFile(),`${label} must be a regular file`);
  requireValue(before.size<=BigInt(limit),`${label} exceeds the byte limit`);
  const handle=await fs.open(file,constants.O_RDONLY|(constants.O_NOFOLLOW??0));
  try {
    const opened=await handle.stat({bigint:true});
    requireValue(opened.isFile() && opened.ino===before.ino && opened.dev===before.dev,`${label} changed before reading`);
    const chunks=[];let bytes=0;
    while(true) {
      const chunk=Buffer.alloc(Math.min(65536,limit+1-bytes));
      const {bytesRead}=await handle.read(chunk,0,chunk.length,null);
      if(!bytesRead) break;
      bytes+=bytesRead;requireValue(bytes<=limit,`${label} exceeds the byte limit`);
      chunks.push(chunk.subarray(0,bytesRead));
    }
    const after=await handle.stat({bigint:true});
    requireValue(BigInt(bytes)===before.size && after.size===before.size && after.mtimeNs===before.mtimeNs && after.ctimeNs===before.ctimeNs,`${label} changed while it was being read`);
    await inspectTree(root,file,label);
    return Buffer.concat(chunks,bytes);
  } finally { await handle.close(); }
}
async function publishBytes(bytes, outputPath, workspaceRoot, label) {
  const output=within(outputPath,workspaceRoot,'output path');
  await inspectTree(workspaceRoot,path.dirname(output),label,true);
  requireValue(!await exists(output),'refusing to overwrite an existing PDF');
  const temporary=output+'.stream-'+randomUUID()+'.tmp';
  let owned=false;
  try {
    const handle=await fs.open(temporary,'wx',0o600);owned=true;
    try { await handle.writeFile(bytes); await handle.sync(); } finally { await handle.close(); }
    await inspectTree(workspaceRoot,path.dirname(output),label);
    await fs.link(temporary,output); // atomic publication with no replacement
  } catch(error) {
    if(error.code==='EEXIST') throw new Error('refusing to overwrite an existing PDF');
    throw error;
  } finally { if(owned) await fs.unlink(temporary); }
  return {path:output,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')};
}
function validatePdf(bytes, declaredBytes) {
  requireValue(bytes.length>=5 && bytes.subarray(0,5).toString()==='%PDF-','materialized file does not contain a PDF header');
  requireValue(bytes.length<=MAX_PDF_BYTES,'materialized PDF exceeds the byte limit');
  if(declaredBytes!==undefined && declaredBytes!==null) requireValue(bytes.length===declaredBytes,'materialized PDF does not match its declared byte length');
}

export function createNodeSlidesHost({execute=executeFile,connectorResultsRoot=null}={}) {
  if(connectorResultsRoot!==null) connectorResultsRoot=absolute(connectorResultsRoot,'connectorResultsRoot');
  return {
    normalizeAbsolutePath:absolute, assertWithinRoot:within, contains, connectorResultsRoot,
    async copyMaterializedPdf({source,declaredBytes,outputPath,workspaceRoot}) {
      const root=contains(source,workspaceRoot)?workspaceRoot:connectorResultsRoot;
      requireValue(root!==null && contains(source,root),'Materialized PDF workspace_path must stay within the task workspace or connector tool results');
      const bytes=await boundedRead(source,root,MAX_PDF_BYTES,'materialized PDF path');
      validatePdf(bytes,declaredBytes);
      return publishBytes(bytes,outputPath,workspaceRoot,'output path');
    },
    async writeBase64({base64,bytes,outputPath,workspaceRoot}) {
      requireValue(typeof base64==='string' && base64.length%4===0 && /^[A-Za-z0-9+/]*={0,2}$/.test(base64),'PDF export contains invalid base64');
      requireValue(base64.length<=Math.ceil(MAX_PDF_BYTES/3)*4,'PDF export exceeds the byte limit');
      const content=Buffer.from(base64,'base64');validatePdf(content,bytes);
      return publishBytes(content,outputPath,workspaceRoot,'legacy PDF output path');
    },
    async readDesignSystem({designSystemPath,workspaceRoot}) {
      const design=JSON.parse((await boundedRead(designSystemPath,workspaceRoot,8*1024*1024,'design system path')).toString('utf8'));
      requireValue(Array.isArray(design.slides),'Design system did not contain an ordered slides array');
      return {presentationId:design.source?.presentation?.id,slides:design.slides.map(slide=>({
        slideIndex:slide.index,slideObjectId:slide.slideId,titlePreview:slide.titlePreview??null,
        layoutId:slide.layoutId??null,isSkipped:slide.isSkipped===true,
      })).sort((left,right)=>left.slideIndex-right.slideIndex)};
    },
    async render({renderer,pdfPath,output,dpi,workspaceRoot}) {
      await inspectTree(workspaceRoot,output,'output path');
      await execute(absolute(renderer,'pdftoppmPath'),['-png','-r',String(dpi),within(pdfPath,workspaceRoot),path.join(output,'slide')],{
        cwd:output,shell:false,windowsHide:true,timeout:60000,maxBuffer:1024*1024,
      });
      const images=[];
      for(const entry of await fs.readdir(output,{withFileTypes:true})) {
        if(!/^slide-\d+\.png$/.test(entry.name)) continue;
        requireValue(entry.isFile() && !entry.isSymbolicLink(),'Rendered slide must be a regular PNG file');
        const file=path.join(output,entry.name);
        await inspectTree(workspaceRoot,file,'rendered slide path');
        const handle=await fs.open(file,'r');
        try {
          const header=Buffer.alloc(8);const {bytesRead}=await handle.read(header,0,8,0);
          requireValue(bytesRead===8 && header.equals(PNG_HEADER),'Rendered slide does not contain a PNG header');
        } finally { await handle.close(); }
        images.push(file);
      }
      return images;
    },
    async saveTemplate({raw,outputPath,workspaceRoot}) {
      const bytes=Buffer.from(JSON.stringify(raw),'utf8');
      requireValue(bytes.length<=64*1024*1024,'Template response exceeds the 64 MiB limit');
      return publishBytes(bytes,outputPath,workspaceRoot,'template output path');
    },
  };
}
