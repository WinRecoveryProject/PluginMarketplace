// Read-only current-cache resolution. Never starts a CLI, target, installer or network client.
import fs from 'node:fs/promises';
import path from 'node:path';
import {inside,readBounded} from './files.mjs';
import {frontmatter} from '../eval/static.mjs';

const ID=/^[a-z0-9][a-z0-9._-]*@[a-z0-9][a-z0-9._-]*$/;
const COMPONENT=/^[A-Za-z0-9_.+-]{1,128}$/;
const MAX_AGE_MS=60000;
const safety={targetExecuted:false,commandsExecuted:0,settingsChanged:false,networkRequests:0};
const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
function component(value){
 return typeof value==='string'&&COMPONENT.test(value)&&!['.','..'].includes(value)&&!value.endsWith('.')&&
        !/^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(value);
}
function relative(value){
 if(typeof value!=='string'||!value||value.includes('\\')||value.includes(':')||value.startsWith('/'))throw Error('unsafe path');
 const parts=value.split('/');if(!parts.every(component))throw Error('unsafe path');return parts;
}
async function directoryRoot(supplied){
 if(typeof supplied!=='string'||!path.isAbsolute(supplied)||/^[\\/]{2}/.test(supplied)||/[\x00-\x1f]/.test(supplied))throw Error('unsafe cache root');
 const resolved=path.resolve(supplied),parsed=path.parse(resolved);
 let current=parsed.root;
 // Check parents before following them, so a junction/UNC alias is not a local-cache shortcut.
 for(const part of path.relative(parsed.root,resolved).split(path.sep).filter(Boolean)){
  current=path.join(current,part);const stat=await fs.lstat(current);
  if(stat.isSymbolicLink()||!stat.isDirectory())throw Error('unsafe cache root');
 }
 const real=await fs.realpath(resolved);if(/^[\\/]{2}/.test(real))throw Error('unsafe cache root');
 return real;
}
async function containedPath(root,parts,kind){
 let current=root;
 for(let i=0;i<parts.length;i++){
  current=path.join(current,parts[i]);const stat=await fs.lstat(current);
  if(stat.isSymbolicLink()||(i<parts.length-1?!stat.isDirectory():kind==='file'?!stat.isFile():!stat.isDirectory()))throw Error('unsafe cache path');
  const real=await fs.realpath(current);if(!inside(root,real))throw Error('cache path escapes root');
 }
 return fs.realpath(current);
}

export { directoryRoot, containedPath, component as cacheComponent };

export async function resolveInstalledPlugin(request,{now=Date.now()}={}){
 const common={schemaVersion:1,scope:'PATH_RESOLUTION_ONLY',skillEnabled:'UNKNOWN',executionAuthorized:false,
               currentEntitlementVerified:false,safety:{...safety}};
 const unavailable=(code,reason,extra={})=>({...common,status:'UNAVAILABLE',code,reason,
  next:'Obtain a fresh successful host CLI installed snapshot and retry the same exact identity; do not restore caches, install or change account/configuration.',...extra});
 if(!object(request)||Object.keys(request).some(k=>!['pluginId','cacheRoot','snapshot','skill'].includes(k))||typeof request.pluginId!=='string'||!ID.test(request.pluginId))return unavailable('INVALID_REQUEST','Supply an exact name@namespace identity, cache root and host snapshot.');
 const [name,namespace]=request.pluginId.split('@');
 if(!component(name)||!component(namespace))return unavailable('INVALID_REQUEST','Identity contains an unsafe cache component.');
 const snapshot=request.snapshot;
 if(!object(snapshot)||snapshot.kind!=='codex-cli-installed'||!object(snapshot.data)||!Array.isArray(snapshot.data.installed)||snapshot.data.installed.length>20000||
    typeof snapshot.capturedAt!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(snapshot.capturedAt))return unavailable('SNAPSHOT_INCOMPLETE','A complete timestamped host CLI installed observation is required.');
 if(snapshot.exitCode!==0)return unavailable('LOOKUP_NOT_SUCCESSFUL','The observed host CLI lookup did not finish successfully.');
 const captured=Date.parse(snapshot.capturedAt),ageMs=now-captured;
 if(!Number.isFinite(now)||!Number.isFinite(captured)||ageMs<0||ageMs>MAX_AGE_MS)return unavailable('SNAPSHOT_STALE','The supplied observation is invalid, future-dated or older than 60 seconds.');
 const freshness={capturedAt:snapshot.capturedAt,ageMs,maxAgeMs:MAX_AGE_MS,
                  provenance:'Caller-supplied successful codex plugin list --json observation',independentlyVerified:false};
 const matches=snapshot.data.installed.filter(row=>object(row)&&row.pluginId===request.pluginId);
 if(matches.length!==1)return unavailable(matches.length?'REGISTRY_CONFLICT':'PLUGIN_NOT_INSTALLED','Exactly one matching installed identity must be observed.',{freshness});
 const row=matches[0];
 if(row.installed!==true||row.enabled!==true)return unavailable(row.enabled===false?'PLUGIN_DISABLED':'PLUGIN_NOT_INSTALLED','The exact package is not observed as both installed and enabled.',{freshness});
 if((row.name!==undefined&&row.name!==name)||(row.marketplaceName!==undefined&&row.marketplaceName!==namespace))return unavailable('REGISTRY_IDENTITY_MISMATCH','Registry name/namespace fields disagree with the exact identity.',{freshness});
 if(!component(row.version))return unavailable('UNSAFE_VERSION','The observed installed version is not a safe cache component.',{freshness});
 let cacheRoot,root,manifestPath,manifest;
 try{
  cacheRoot=await directoryRoot(request.cacheRoot);
  root=await containedPath(cacheRoot,[namespace,name,row.version],'directory');
 }catch(error){return unavailable(error.code==='ENOENT'?'CACHE_PATH_UNAVAILABLE':'UNSAFE_CACHE_PATH','The current exact cache directory is missing or unsafe.',{freshness});}
 try{
  try{manifestPath=await containedPath(root,['.codex-plugin','plugin.json'],'file');}
  catch(error){if(error.code!=='ENOENT')throw error;manifestPath=await containedPath(root,['plugin.json'],'file');}
  manifest=JSON.parse(await readBounded(manifestPath,128*1024));
  if(!object(manifest)||manifest.name!==name||manifest.version!==row.version)return unavailable('MANIFEST_IDENTITY_MISMATCH','Current manifest name/version does not match the exact installed record.',{freshness});
 }catch{return unavailable('MANIFEST_UNAVAILABLE','The current authoritative manifest is missing, malformed, oversized or unsafe.',{freshness});}
 let skillPath=null,skillName=null;
 if(request.skill!==undefined){
  try{
   const parts=relative(request.skill);if(parts.at(-1)!=='SKILL.md')throw Error('not a skill');
   if(typeof manifest.skills!=='string')throw Error('skills not declared');
   const declared=relative(manifest.skills.replace(/^\.\//,'').replace(/\/$/,''));
   if(parts.length<declared.length+2||declared.some((part,i)=>parts[i]!==part))throw Error('outside declared skills');
   skillPath=await containedPath(root,parts,'file');
   const metadata=frontmatter(await readBounded(skillPath,2*1024*1024));
   if(typeof metadata.name!=='string'||!metadata.name.trim())throw Error('skill name missing');
   skillName=metadata.name;
  }catch{return unavailable('SKILL_UNAVAILABLE','The exact requested skill is missing, undeclared, malformed or unsafe.',{freshness});}
 }
 try{
  // Detect a normal mid-lookup removal/replacement before returning a usable path.
  if(await directoryRoot(request.cacheRoot)!==cacheRoot||await containedPath(cacheRoot,[namespace,name,row.version],'directory')!==root||
     await containedPath(root,path.relative(root,manifestPath).split(path.sep),'file')!==manifestPath)throw Error('cache changed');
  const finalManifest=JSON.parse(await readBounded(manifestPath,128*1024));
  if(JSON.stringify(finalManifest)!==JSON.stringify(manifest))throw Error('manifest changed');
  if(skillPath&&await containedPath(root,relative(request.skill),'file')!==skillPath)throw Error('skill changed');
 }catch{return unavailable('CACHE_CHANGED','The selected package changed during lookup; repeat fresh host discovery.',{freshness});}
 return {...common,status:'RESOLVED',pluginId:request.pluginId,version:row.version,root,manifestPath,
         skillPath,skillName,freshness,observedInstalled:true,observedPluginEnabled:true,
         limitation:'Point-in-time path/identity resolution only. Check native per-skill activation, current account access and actual authorization separately; an injected host catalog can remain stale mid-session.'};
}
