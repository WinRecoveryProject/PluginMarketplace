// Capability matrix for skill consolidation: seed atomic capabilities from source skills,
// then prove every one is covered, merged or explicitly approved as dropped.
import fs from 'node:fs/promises';
import path from 'node:path';
import {frontmatter} from '../eval/static.mjs';

const SKIP=new Set(['node_modules','.git']);
const toPosix=p=>p.split(path.sep).join('/');

export function slug(text){return String(text).trim().toLowerCase().replace(/[^a-z0-9 _-]/g,'').replace(/ /g,'-');}

function inside(repoRoot,rel){
 const full=path.resolve(repoRoot,rel),r=path.relative(path.resolve(repoRoot),full);
 return r===''||(!r.startsWith('..')&&!path.isAbsolute(r))?full:null;
}
async function walk(dir,base=dir){
 const out=[];
 for(const d of await fs.readdir(dir,{withFileTypes:true})){
  if(SKIP.has(d.name))continue;const full=path.join(dir,d.name);
  if(d.isDirectory())out.push(...await walk(full,base));else if(d.isFile())out.push(toPosix(path.relative(base,full)));
 }
 return out.sort();
}
async function sourceFiles(source,repoRoot){
 if(source.snapshot){const full=inside(repoRoot,source.snapshot);if(!full)throw new Error('escapes repository: '+source.id);return Object.keys(JSON.parse(await fs.readFile(full,'utf8')).files).sort();}
 const root=inside(repoRoot,source.root);if(!root)throw new Error('escapes repository: '+source.id);
 const all=await walk(root);return source.files?all.filter(f=>source.files.includes(f)):all;
}

function sentences(text){return String(text??'').replace(/\s+/g,' ').trim().split(/(?<=[.!?])\s+(?=[A-Z"'`(\[])/).filter(Boolean);}

function instructions(body,offset){
 // offset = number of file lines before the body; returned lines are 1-based file lines.
 const lines=body.split('\n'),out=[];let para=null,fence=null;
 const flush=()=>{if(para){out.push({line:para.line,text:para.parts.join(' ')});para=null;}};
 lines.forEach((raw,i)=>{
  const line=raw.trimEnd(),n=offset+i+1;
  if(fence){fence.parts.push(line);if(/^\s*(```|~~~)/.test(line)){out.push({line:fence.line,text:fence.parts.join('\n')});fence=null;}return;}
  if(/^\s*(```|~~~)/.test(line)){flush();fence={line:n,parts:[line]};return;}
  if(!line.trim()){flush();return;}
  if(/^\s*#{1,6}\s/.test(line)){flush();return;}
  if(/^\s*\|?\s*:?-{3,}/.test(line)&&line.includes('-')&&/^[\s|:-]+$/.test(line)){flush();return;}
  if(/^\s*([-*+]|\d+[.)])\s+/.test(line)||/^\s*\|/.test(line)){flush();out.push({line:n,text:line.trim()});return;}
  if(para)para.parts.push(line.trim());else para={line:n,parts:[line.trim()]};
 });
 flush();if(fence)out.push({line:fence.line,text:fence.parts.join('\n')});
 return out;
}

function yamlTopKeys(text){return [...text.replaceAll('\r\n','\n').matchAll(/^([A-Za-z_][\w-]*):/gm)].map(m=>m[1]);}

export async function seedMatrix(sources,{repoRoot}={}){
 if(!repoRoot)throw new Error('repoRoot is required');
 const entries=[];
 for(const source of sources){
  if(source.snapshot)throw new Error('snapshot sources cannot be seeded: '+source.id);
  const root=inside(repoRoot,source.root);if(!root)throw new Error('escapes repository: '+source.id);
  for(const rel of await sourceFiles(source,repoRoot)){
   const text=(await fs.readFile(path.join(root,rel),'utf8')).replaceAll('\r\n','\n');
   const at=line=>`${source.id}/${rel}${line?':'+line:''}`;
   const skillKey=rel.includes('/')?path.posix.basename(path.posix.dirname(rel)):path.basename(root);
   const add=(id,src,kind,t)=>entries.push({id,source:src,kind,text:t,target:null,status:'unmapped'});
   if(path.posix.basename(rel)==='SKILL.md'){
    const key=path.posix.dirname(rel)==='.'?path.basename(root):path.posix.basename(path.posix.dirname(rel));
    const fm=frontmatter(text);
    sentences(fm.description).forEach((s,k)=>add(`${source.id}.${key}.trigger.${k+1}`,at(3),'trigger',s));
    for(const item of instructions(fm.body,fm.headerLines))add(`${source.id}.${key}.L${item.line}`,at(item.line),'instruction',item.text);
   }else if(/(^|\/)agents\/openai\.yaml$/.test(rel)){
    for(const k of yamlTopKeys(text))add(`${source.id}.${skillKey}.policy.${k}`,at(),'policy',k);
   }else add(`${source.id}.file:${rel}`,at(),'file',rel);
  }
 }
 return {schemaVersion:1,sources:sources.map(s=>({...s})),entries};
}

async function anchors(file){
 const text=(await fs.readFile(file,'utf8')).replaceAll('\r\n','\n'),set=new Set();
 for(const m of text.matchAll(/^#{1,6}\s+(.+?)\s*#*\s*$/gm))set.add(slug(m[1]));
 for(const m of text.matchAll(/<a\s+id="([^"]+)"/g))set.add(m[1]);
 return set;
}

export async function checkMatrix(matrix,{repoRoot}={}){
 if(!repoRoot)throw new Error('repoRoot is required');
 const errors=[],counts={covered:0,merged:0,dropped:0,unmapped:0,total:matrix.entries.length};
 const byId=new Map(),cache=new Map();
 for(const e of matrix.entries){if(byId.has(e.id))errors.push('duplicate id: '+e.id);else byId.set(e.id,e);}
 for(const e of matrix.entries){
  const status=String(e.status??'unmapped');
  if(status==='covered'){
   counts.covered++;
   if(!e.target){errors.push('target missing: '+e.id+' -> (none)');continue;}
   const [file,anchor]=e.target.split('#');const full=inside(repoRoot,file);
   if(!full){errors.push('escapes repository: '+e.id);continue;}
   let stat;try{stat=await fs.stat(full);}catch{errors.push('target missing: '+e.id+' -> '+e.target);continue;}
   if(anchor){
    if(!stat.isFile()){errors.push('anchor missing: '+e.id+' -> '+e.target);continue;}
    if(!cache.has(full))cache.set(full,await anchors(full));
    if(!cache.get(full).has(anchor))errors.push('anchor missing: '+e.id+' -> '+e.target);
   }
  }else if(status.startsWith('merged-with:')){
   counts.merged++;const other=byId.get(status.slice(12));
   if(!other||other.status!=='covered')errors.push('bad merge: '+e.id+' -> '+status.slice(12));
  }else if(status==='dropped'){
   counts.dropped++;
   if(e.approved!==true||!String(e.reason??'').trim())errors.push('unapproved drop: '+e.id);
  }else{counts.unmapped++;errors.push('unmapped: '+e.id);}
 }
 for(const source of matrix.sources??[]){
  let files;try{files=await sourceFiles(source,repoRoot);}catch(error){errors.push(error.message.startsWith('escapes')?error.message:'source unreadable: '+source.id);continue;}
  for(const rel of files){
   const key=`${source.id}/${rel}`;
   if(!matrix.entries.some(e=>e.source===key||String(e.source).startsWith(key+':')))errors.push('unrepresented source file: '+key);
  }
 }
 return {ok:errors.length===0,errors,counts};
}
