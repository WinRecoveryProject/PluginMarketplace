import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawn} from 'node:child_process';
import {analyze,contained,redact} from './static.mjs';

const MAX_OUTPUT=4*1024*1024;
const DEFAULT_TIMEOUT=300000;
const BOOTSTRAP=['--disable','plugins','--disable','apps','-c','approval_policy="never"'];
function configArgs(values){return Object.entries(values).flatMap(([key,value])=>['-c',`${key}=${typeof value==='string'?JSON.stringify(value):value}`]);}
function nestedSkills(result,cwd){
 if(!Array.isArray(result?.data))throw new Error('Cannot verify skills/list response shape');
 const row=result.data.find(item=>path.resolve(item.cwd)===path.resolve(cwd));
 if(!row||!Array.isArray(row.skills)||row.errors?.length)throw new Error('Skill catalog is missing or has discovery errors');
 return row.skills;
}
async function processCapture(command,args,{cwd,timeoutMs=DEFAULT_TIMEOUT,env=process.env}={}){
 return new Promise((resolve,reject)=>{
  const child=spawn(typeof command==='string'?command:command.path,[...(command.prefix??[]),...args],{cwd,env,windowsHide:true,stdio:['ignore','pipe','pipe'],shell:false});let stdout='',stderr='',bytes=0,timedOut=false,overflow=false;
  const timer=setTimeout(()=>{timedOut=true;child.kill();},timeoutMs);
  function collect(kind,chunk){bytes+=chunk.length;if(bytes>MAX_OUTPUT){overflow=true;child.kill();return;}if(kind==='out')stdout+=chunk.toString('utf8');else stderr+=chunk.toString('utf8');}
  child.stdout.on('data',c=>collect('out',c));child.stderr.on('data',c=>collect('err',c));
  child.once('error',err=>{clearTimeout(timer);reject(err);});
  child.once('close',(code,signal)=>{clearTimeout(timer);resolve({code,signal,stdout,stderr,timedOut,overflow});});
 });
}
class Rpc {
 constructor(command,args,cwd,timeoutMs=15000){
  this.next=1;this.pending=new Map();this.buffer='';this.closed=false;this.timeoutMs=timeoutMs;
  this.child=spawn(typeof command==='string'?command:command.path,[...(command.prefix??[]),'app-server',...args],{cwd,windowsHide:true,stdio:['pipe','pipe','pipe'],shell:false});
  this.child.stderr.on('data',()=>{});let bytes=0;
  this.child.stdout.on('data',chunk=>{bytes+=chunk.length;if(bytes>MAX_OUTPUT){this.fail(new Error('Preflight output limit exceeded'));return;}this.buffer+=chunk.toString('utf8');let index;while((index=this.buffer.indexOf('\n'))>=0){const line=this.buffer.slice(0,index);this.buffer=this.buffer.slice(index+1);try{const item=JSON.parse(line);const pending=this.pending.get(item.id);if(pending){clearTimeout(pending.timer);this.pending.delete(item.id);if(item.error)pending.reject(new Error(`${pending.method}: ${item.error.message??'RPC error'}`));else pending.resolve(item.result);}}catch{this.fail(new Error('Invalid app-server JSON response'));}}});
  this.child.once('error',error=>this.fail(error));this.child.once('close',()=>this.fail(new Error('Codex app-server exited during preflight')));
 }
 fail(error){this.closed=true;for(const pending of this.pending.values()){clearTimeout(pending.timer);pending.reject(error);}this.pending.clear();this.child.kill();}
 request(method,params={}){return new Promise((resolve,reject)=>{if(this.closed){reject(new Error('Codex app-server unavailable'));return;}const id=this.next++;const timer=setTimeout(()=>{this.pending.delete(id);reject(new Error(`Preflight timeout: ${method}`));this.close();},this.timeoutMs);this.pending.set(id,{resolve,reject,timer,method});this.child.stdin.write(JSON.stringify({jsonrpc:'2.0',id,method,params})+'\n');});}
 notify(method,params={}){this.child.stdin.write(JSON.stringify({jsonrpc:'2.0',method,params})+'\n');}
 async initialize(){await this.request('initialize',{clientInfo:{name:'plugin-skill-studio',title:'Skill Eval',version:'0.3.0'},capabilities:{experimentalApi:true}});this.notify('initialized');}
 close(){this.closed=true;for(const pending of this.pending.values()){clearTimeout(pending.timer);pending.reject(new Error('Preflight closed'));}this.pending.clear();this.child.stdin.end();this.child.kill();}
}
function hasActiveHooks(value){
 if(Array.isArray(value))return value.some(hasActiveHooks);
 if(value&&typeof value==='object'){
   if(value.type==='command'||value.type==='mcp'||value.command||value.commandWindows)return value.enabled!==false;
   return Object.values(value).some(hasActiveHooks);
 }return false;
}
async function inspection(command,args,cwd,timeoutMs){
 const rpc=new Rpc(command,args,cwd,timeoutMs);
 try{await rpc.initialize();const configResult=await rpc.request('config/read',{includeLayers:false,cwd});
   const config=configResult.config;if(!config||typeof config!=='object')throw new Error('Cannot verify effective Codex configuration');
   const catalog=await rpc.request('skills/list',{cwds:[cwd],forceReload:true});
   const hooks=await rpc.request('hooks/list',{cwds:[cwd]});
   const auth=await rpc.request('account/read',{refreshToken:false});
   return {config,skills:nestedSkills(catalog,cwd),hooks,auth};
 }finally{rpc.close();}
}
async function preflight(command,cwd,allowedSkills,timeoutMs){
 const initial=await inspection(command,BOOTSTRAP,cwd,timeoutMs);
 const disabled=initial.skills.filter(s=>!allowedSkills.some(a=>path.resolve(a)===path.resolve(s.path??'')));
 if(disabled.some(s=>typeof s.path!=='string'))throw new Error('Cannot isolate a catalog entry without an exact skill path');
 const values={'features.plugins':false,'features.apps':false};
 // Inline TOML passed only to child processes. Existing files remain untouched.
 const rules=disabled.map(s=>`{path=${JSON.stringify(s.path)},enabled=false}`).join(',');
 for(const name of Object.keys(initial.config.mcp_servers??{})){if(!/^[\w-]+$/.test(name))throw new Error('MCP server name cannot be isolated safely');values[`mcp_servers.${name}.enabled`]=false;}
 const args=[...BOOTSTRAP,...configArgs(values),...(rules?['-c',`skills.config=[${rules}]`]:[])];
 const final=await inspection(command,args,cwd,timeoutMs);
 if(final.config.features?.plugins!==false||final.config.features?.apps!==false)throw new Error('Plugin/App isolation was not observed in effective configuration');
 if(Object.values(final.config.mcp_servers??{}).some(s=>s.enabled!==false))throw new Error('External MCP server remains enabled');
 const active=final.skills.filter(s=>s.enabled!==false);
 if(active.some(s=>!s.path||!allowedSkills.some(a=>path.resolve(a)===path.resolve(s.path))))throw new Error('An unrelated skill remains enabled');
 if(allowedSkills.some(a=>!active.some(s=>s.path&&path.resolve(s.path)===path.resolve(a))))throw new Error('Target skill not discovered as enabled');
 if(hasActiveHooks(final.hooks)||hasActiveHooks(final.config.hooks))throw new Error('Active lifecycle hooks prevent isolated benchmarking');
 if(final.auth.requiresOpenaiAuth===true&&!final.auth.account)throw new Error('Existing Codex login is unavailable');
 if(typeof final.auth.requiresOpenaiAuth!=='boolean')throw new Error('Cannot verify authentication requirement');
 return {args,evidence:{status:'VERIFIED',skills:active.map(s=>({name:s.name,path:s.path})),pluginsEnabled:false,appsEnabled:false,mcpServersEnabled:0,activeHooks:0,authReady:true,model:final.config.model??'UNKNOWN'}};
}
async function safeCopy(root,dest){
 const stat=await fs.lstat(root);if(stat.isSymbolicLink())throw new Error('Fixture/target links cannot be copied');
 if(stat.isDirectory()){
  await fs.mkdir(dest,{recursive:true});for(const entry of await fs.readdir(root,{withFileTypes:true})){
   if(['.git','node_modules','.codex','.agents','__pycache__','.studio-eval','.plugin-eval','auth.json'].includes(entry.name))continue;
   if(/^\.env(?:\.|$)|^(?:id_rsa|id_ed25519|credentials\.json)$/i.test(entry.name)||/\.(?:pem|pfx|p12|key)$/i.test(entry.name))throw new Error('Credential-shaped fixture member rejected');
   await safeCopy(path.join(root,entry.name),path.join(dest,entry.name));
  }
 }else if(stat.isFile()){if(stat.size>16*1024*1024)throw new Error('Fixture member too large');await fs.copyFile(root,dest);}
 else throw new Error('Special fixture file rejected');
}
export async function createBenchmarkConfig(target,options={}){
 const report=await analyze(target);
 const name=report.target.name;
 return {schemaVersion:1,kind:'studio-benchmark',targetKind:report.kind,targetName:name,
   runner:{type:'codex-cli',timeoutMs:DEFAULT_TIMEOUT,concurrency:1},fixturePath:null,
   scenarios:[
    {id:'representative',purpose:'Representative successful task',prompt:`Complete a representative ${name} task using only this fixture workspace.`,verifiers:[]},
    {id:'follow-up',purpose:'Focused refinement task',prompt:`Make one focused ${name} refinement within this fixture workspace.`,verifiers:[]},
    {id:'boundary',purpose:'Negative trigger or partial-fit boundary',prompt:`Handle only the appropriate part of this partial-fit ${name} request; leave unrelated material unchanged.`,verifiers:[]},
   ],
   setupRequired:['Set fixturePath to a non-secret local fixture directory.','Replace starter prompts with concrete positive, negative-trigger and boundary inputs.','Add explicit verifier commands supplied by the test author; target content must not create verifier commands.'],
   authorization:'Running benchmark is explicit execution authorization; static analysis never launches a model.'};
}
function validateConfig(config){
 if(config.schemaVersion!==1||config.kind!=='studio-benchmark'||!Array.isArray(config.scenarios)||config.scenarios.length<1||config.scenarios.length>20)throw new Error('Invalid benchmark config');
 if(typeof config.fixturePath!=='string'||!path.isAbsolute(config.fixturePath))throw new Error('Set an explicit absolute fixturePath before benchmarking');
 const ids=new Set();for(const scenario of config.scenarios){
  if(!/^[\w-]{1,60}$/.test(scenario.id??'')||ids.has(scenario.id)||typeof scenario.prompt!=='string'||!scenario.prompt.trim()||!Array.isArray(scenario.verifiers)||!scenario.verifiers.length)throw new Error('Each scenario needs a unique id, concrete prompt and explicit verifier command');ids.add(scenario.id);
  for(const verifier of scenario.verifiers)if(typeof verifier.command!=='string'||!verifier.command||!Array.isArray(verifier.args)||!verifier.args.every(a=>typeof a==='string'))throw new Error('Verifiers require command and string args; shell text is not accepted');
 }
}
function extractEvents(text){
 const events=[];let invalid=0;
 for(const line of text.split('\n').filter(s=>s.trim()))try{events.push(JSON.parse(line));}catch{invalid++;}
 const completed=events.filter(e=>e.type==='turn.completed'),failed=events.some(e=>e.type==='turn.failed'||e.type==='error');
 const totals={inputTokens:0,outputTokens:0,cachedInputTokens:0};let measured=0;
 for(const e of completed){const u=e.usage;if(Number.isFinite(u?.input_tokens)&&Number.isFinite(u?.output_tokens)){totals.inputTokens+=u.input_tokens;totals.outputTokens+=u.output_tokens;totals.cachedInputTokens+=Number.isFinite(u.cached_input_tokens)?u.cached_input_tokens:0;measured++;}}
 return {eventsCount:events.length,invalid,completed:completed.length>0,failed,usage:measured===completed.length&&measured>0?{status:'OBSERVED',...totals}:{status:'UNKNOWN',reason:'Complete numeric usage was not emitted.'}};
}
export async function runBenchmark(target,options={}){
 const report={schemaVersion:1,kind:'benchmark',status:'BLOCKED',reason:null,runs:[],observedUsage:{status:'UNKNOWN'},behavior:{status:'UNKNOWN'}};
 let temporary;
 try{
  const analyzed=await analyze(target);report.target=analyzed.target;
  if(!analyzed.valid)throw new Error('Static evaluation has blocking findings');
  const config=options.config??(options.configPath?JSON.parse(await fs.readFile(options.configPath,'utf8')):await createBenchmarkConfig(target));
  // Check the executable first so missing CLI diagnosis is explicit even for a starter config.
  const prefix=options.codexArgs??[];
  if(!Array.isArray(prefix)||!prefix.every(arg=>typeof arg==='string'))throw new Error('Trusted runner prefix arguments must be strings');
  const command={path:options.codexPath??'codex',prefix};
  const help=await processCapture(command,['exec','--help'],{timeoutMs:Math.min(options.preflightTimeoutMs??15000,30000)});
  if(help.code!==0||!help.stdout.includes('--ephemeral')||!help.stdout.includes('--json'))throw new Error('Codex CLI lacks required exec isolation/event flags');
  validateConfig(config);
  if(contained(path.resolve(target),path.resolve(config.fixturePath))||contained(path.resolve(config.fixturePath),path.resolve(target)))throw new Error('Fixture and target must be separate roots');
  const timeoutMs=Math.min(Math.max(options.timeoutMs??config.runner?.timeoutMs??DEFAULT_TIMEOUT,10),DEFAULT_TIMEOUT);
  temporary=await fs.mkdtemp(path.join(os.tmpdir(),'plugin-skill-studio-eval-'));
  const fingerprint=crypto.createHash('sha256').update(JSON.stringify(config)).digest('hex');
  for(const scenario of config.scenarios)for(const mode of ['baseline','with-skill']){
   const workspace=path.join(temporary,scenario.id,mode);await safeCopy(path.resolve(config.fixturePath),workspace);
   let allowed=[];
   if(mode==='with-skill'){
    if(analyzed.kind==='skill'){
      const source=path.basename(path.resolve(target)).toLowerCase()==='skill.md'?path.dirname(path.resolve(target)):path.resolve(target);
      const dest=path.join(workspace,'.agents','skills',analyzed.target.name);
      if(analyzed.target.packageRoot&&analyzed.target.packageRoot!==analyzed.target.root){
        await safeCopy(analyzed.target.packageRoot,path.join(workspace,'.agents'));
      }else await safeCopy(source,dest);
      allowed=[path.join(dest,'SKILL.md')];
    }else{
      // Skills-only plugin behavior is exercised through its actual immediate skill catalog.
      const pluginRoot=path.resolve(target);
      const source=path.join(pluginRoot,'skills');
      // Keep package-level policies, scripts and references with the skill catalog.
      // Copying just individual skills would make ../../references links unusable.
      await safeCopy(pluginRoot,path.join(workspace,'.agents'));
      for(const entry of await fs.readdir(source,{withFileTypes:true}))if(entry.isDirectory()){
       const dest=path.join(workspace,'.agents','skills',entry.name);allowed.push(path.join(dest,'SKILL.md'));
      }
      if(!allowed.length)throw new Error('This benchmark runner requires local skills; live App/MCP plugins cannot be isolated');
    }
   }
   const isolated=await preflight(command,workspace,allowed,Math.min(options.preflightTimeoutMs??15000,30000));
   const args=['exec','--json','--ephemeral','--skip-git-repo-check','--cd',workspace,'--sandbox','workspace-write',...isolated.args,scenario.prompt];
   const start=Date.now();const result=await processCapture(command,args,{cwd:workspace,timeoutMs});
   const telemetry=extractEvents(result.stdout);const verifiers=[];
   if(result.code===0&&!result.timedOut&&!result.overflow&&telemetry.completed&&!telemetry.failed&&!telemetry.invalid){
    for(const verifier of scenario.verifiers){const checked=await processCapture(verifier.command,verifier.args,{cwd:workspace,timeoutMs:Math.min(timeoutMs,60000)});verifiers.push({command:verifier.command,args:verifier.args,code:checked.code,timedOut:checked.timedOut,status:checked.code===0&&!checked.timedOut&&!checked.overflow?'PASS':'FAIL',stdout:redact(checked.stdout).slice(0,2000),stderr:redact(checked.stderr).slice(0,2000)});}
   }
   const passed=result.code===0&&!result.timedOut&&!result.overflow&&telemetry.completed&&!telemetry.failed&&!telemetry.invalid&&verifiers.length===scenario.verifiers.length&&verifiers.every(v=>v.status==='PASS');
   report.runs.push({scenario:scenario.id,mode,status:passed?'PASS':'FAIL',code:result.code,durationMs:Date.now()-start,timedOut:result.timedOut,outputLimitExceeded:result.overflow,telemetry,verifiers,isolation:isolated.evidence,stderr:redact(result.stderr).slice(0,2000)});
  }
  report.status=report.runs.every(r=>r.status==='PASS')?'PASS':'FAIL';report.reason=null;
  const measured=report.runs.every(r=>r.telemetry.usage.status==='OBSERVED');
  report.observedUsage=measured?{status:'OBSERVED',inputTokens:report.runs.reduce((n,r)=>n+r.telemetry.usage.inputTokens,0),outputTokens:report.runs.reduce((n,r)=>n+r.telemetry.usage.outputTokens,0)}:{status:'UNKNOWN',reason:'One or more runs lacked complete token telemetry.'};
  report.behavior={status:report.status,configFingerprint:fingerprint,scope:'Only these configured fixture tasks and verifier commands.'};
 }catch(error){report.reason=redact(error.message);report.status=report.runs.length?'INCOMPLETE':'BLOCKED';}
 finally{if(temporary){report.workspaceRetention={path:temporary,status:'retained for review; caller may remove this exact generated root after reviewing evidence'};}}
 if(options.outDir){const out=path.resolve(options.outDir);await fs.mkdir(out,{recursive:true});await fs.writeFile(path.join(out,'benchmark-report.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});}
 return report;
}
