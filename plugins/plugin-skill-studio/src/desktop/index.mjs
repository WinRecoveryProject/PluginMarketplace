import fs from 'node:fs/promises';
import {realpathSync,existsSync} from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const actions=new Set(['list','scope','inspect','activate','capture','click','scroll']);
const mutations=new Set(['activate','click','scroll']);
const keys=new Set(['action','windowHandle','scope','directory','snapshot','x','y','delta','execute']);
const integer=(n)=>Number.isSafeInteger(n)&&n>0;
export function assertLocalDesktopPath(value){
  if(typeof value!=='string'||/^(?:\\\\|\/\/)/.test(value)||(process.platform==='win32'&&!/^[A-Za-z]:[\\/]/.test(value)))throw Error('Only absolute local drive paths are supported; UNC/device paths are refused');
  return value;
}
export async function verifyLocalDesktopPaths(paths){
  paths.forEach(assertLocalDesktopPath);
  if(process.platform==='win32')await runWorker({action:'validate-paths',paths});
}
export function validateDesktopRequest(request){
  if(!request||typeof request!=='object'||Array.isArray(request)||!actions.has(request.action))throw Error('Unknown desktop action');
  for(const key of Object.keys(request))if(!keys.has(key))throw Error('Unknown desktop argument: '+key);
  if(mutations.has(request.action)&&request.execute!==true)throw Error('Live input requires --execute and prior user authorization');
  if(request.action==='scope'&&!integer(request.windowHandle))throw Error('Use an observed positive integer window handle');
  if(!['list','scope'].includes(request.action)){
    const s=request.scope;
    if(!s||s.kind!=='studio-desktop-scope'||!integer(s.windowHandle)||!integer(s.processId)||typeof s.processStart!=='string'||!Number.isFinite(Date.parse(s.processStart))||typeof s.executable!=='string'||!path.win32.isAbsolute(s.executable)||typeof s.processName!=='string'||!s.processName)throw Error('Malformed desktop scope');
  }
  if(request.action==='capture'&&(typeof request.directory!=='string'||!path.isAbsolute(request.directory)))throw Error('An absolute private capture directory is required');
  if(['click','scroll'].includes(request.action)){
    if(typeof request.snapshot!=='string'||!path.isAbsolute(request.snapshot))throw Error('An absolute fresh snapshot path is required');
    for(const key of ['x','y'])if(!Number.isSafeInteger(request[key])||request[key]<0)throw Error('Use nonnegative integer window-relative coordinates');
    if(request.action==='scroll'&&(!Number.isSafeInteger(request.delta)||!request.delta||Math.abs(request.delta)>720))throw Error('Scroll delta must be a nonzero integer within +/-720');
  }
  return request;
}
export function assertPrivateDesktopOutput(destination){
  assertLocalDesktopPath(path.resolve(destination));
  let ancestor=path.resolve(destination);const suffix=[];
  while(!existsSync(ancestor)){
    const parent=path.dirname(ancestor);if(parent===ancestor)throw Error('Output has no accessible filesystem ancestor');
    suffix.unshift(path.basename(ancestor));ancestor=parent;
  }
  const resolved=path.join(realpathSync.native(ancestor),...suffix),relative=path.relative(realpathSync.native(root),resolved);
  if(!relative||(!relative.startsWith('..'+path.sep)&&relative!=='..'&&!path.isAbsolute(relative)))throw Error('Desktop evidence must be outside the distributable plugin');
  return resolved;
}
export async function readDesktopScope(file){
  await verifyLocalDesktopPaths([path.resolve(file)]);
  const stat=await fs.lstat(file);if(!stat.isFile()||stat.isSymbolicLink()||stat.size>65536)throw Error('Scope must be a regular JSON file up to 64 KiB');
  return JSON.parse((await fs.readFile(file,'utf8')).replace(/^\uFEFF/,''));
}
export async function desktopRequest(request,{platform=process.platform,worker=runWorker}={}){
  validateDesktopRequest(request);
  if(platform!=='win32')throw Error('Local desktop control requires Windows; no alternate backend started');
  const paths=[request.directory,request.snapshot].filter(Boolean);
  if(paths.length&&worker===runWorker)await verifyLocalDesktopPaths(paths);
  if(request.directory)assertPrivateDesktopOutput(request.directory);
  return worker(request);
}
function runWorker(request){
  return new Promise((resolve,reject)=>{
    const systemRoot=process.env.SystemRoot??'C:\\Windows';
    const executable=path.join(systemRoot,'System32','WindowsPowerShell','v1.0','powershell.exe');
    const child=spawn(executable,['-NoLogo','-NoProfile','-NonInteractive','-File',path.join(root,'scripts/windows-desktop.ps1')],{windowsHide:true,stdio:['pipe','pipe','pipe'],shell:false});
    let stdout='',stderr='',failed=false;
    const fail=(message,outcome='unknown')=>{if(failed)return;failed=true;child.kill();const error=Error(message);error.desktopOutcome=outcome;reject(error);};
    const timer=setTimeout(()=>fail('Desktop worker timed out; input outcome may be unknown. Reobserve; never replay automatically.'),45000);
    for(const [stream,key]of [[child.stdout,'stdout'],[child.stderr,'stderr']])stream.on('data',chunk=>{
      if(key==='stdout')stdout+=chunk.toString('utf8');else stderr+=chunk.toString('utf8');
      if(Buffer.byteLength(stdout)+Buffer.byteLength(stderr)>4*1024*1024)fail('Desktop worker exceeded output limit; reobserve before retrying');
    });
    child.on('error',error=>{clearTimeout(timer);fail('Desktop worker could not start: '+error.message,false);});
    child.on('close',code=>{
      clearTimeout(timer);if(failed)return;
      let outcome='unknown';
      try{const result=JSON.parse(stdout.replace(/^\uFEFF/,''));if(typeof result.inputSent==='boolean')outcome=result.inputSent;if(code!==0||!result.ok)throw Error(result.error??stderr??'Desktop operation failed');resolve(result);}
      catch(cause){const error=Error('Desktop '+request.action+' failed: '+cause.message);error.desktopOutcome=outcome;reject(error);}
    });
    child.stdin.on('error',()=>{});
    child.stdin.end(JSON.stringify(request));
  });
}
