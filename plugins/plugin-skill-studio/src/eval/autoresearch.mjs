// Autoresearch keep/discard loop for an editable skill. The model proposes and edits
// candidate/; this module alone decides KEEP, DISCARD or UNKNOWN from eval evidence.
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {analyze,runBenchmark,compareReports} from './index.mjs';

const CACHE=[/\/\.claude\/plugins\//i,/\/appdata\/roaming\/claude\/rpm\//i,/\/plugins\/cache\//i];
const posix=p=>p.split(path.sep).join('/');

async function files(root,base=root){
 const out=[];
 for(const d of await fs.readdir(root,{withFileTypes:true})){
  const full=path.join(root,d.name);
  if(d.isDirectory())out.push(...await files(full,base));else if(d.isFile())out.push(posix(path.relative(base,full)));
 }
 return out.sort();
}
export async function treeHash(root){
 const h=createHash('sha256');
 for(const rel of await files(root)){h.update(rel+'\0');h.update(await fs.readFile(path.join(root,rel)));h.update('\0');}
 return h.digest('hex');
}
async function replaceTree(from,to){await fs.rm(to,{recursive:true,force:true});await fs.cp(from,to,{recursive:true});}
const readJson=async f=>JSON.parse(await fs.readFile(f,'utf8'));
const writeJson=(f,v)=>fs.writeFile(f,JSON.stringify(v,null,2)+'\n');
const stamp=d=>d.toISOString().replace(/[-:]/g,'').replace('T','-').slice(0,15);
const passes=r=>(r?.runs??[]).filter(x=>x.status==='PASS').length;

function lineDiff(a,b){
 // Minimal LCS line diff; large files fall back to whole-file replacement.
 const x=a.split('\n'),y=b.split('\n');
 if(x.length*y.length>4_000_000)return [...x.map(l=>'-'+l),...y.map(l=>'+'+l)];
 const dp=Array.from({length:x.length+1},()=>new Uint32Array(y.length+1));
 for(let i=x.length-1;i>=0;i--)for(let j=y.length-1;j>=0;j--)dp[i][j]=x[i]===y[j]?dp[i+1][j+1]+1:Math.max(dp[i+1][j],dp[i][j+1]);
 const out=[];let i=0,j=0;
 while(i<x.length&&j<y.length){if(x[i]===y[j]){out.push(' '+x[i]);i++;j++;}else if(dp[i+1][j]>=dp[i][j+1])out.push('-'+x[i++]);else out.push('+'+y[j++]);}
 while(i<x.length)out.push('-'+x[i++]);while(j<y.length)out.push('+'+y[j++]);
 return out;
}
async function text(file){
 try{const buf=await fs.readFile(file);const s=buf.toString('utf8');return Buffer.from(s,'utf8').equals(buf)?s.replaceAll('\r\n','\n'):null;}
 catch{return undefined;}
}
export async function treeDiff(before,after){
 const names=[...new Set([...(await files(before).catch(()=>[])),...(await files(after).catch(()=>[]))])].sort();const out=[];
 for(const rel of names){
  const a=await text(path.join(before,rel)),b=await text(path.join(after,rel));
  if(a===b&&a!==null)continue;
  if(a===null||b===null){const ha=a===undefined?null:createHash('sha256').update(await fs.readFile(path.join(before,rel))).digest('hex');
   const hb=b===undefined?null:createHash('sha256').update(await fs.readFile(path.join(after,rel))).digest('hex');
   if(ha!==hb)out.push(`--- a/${rel}\n+++ b/${rel}\nbinary changed`);continue;}
  const lines=lineDiff(a??'',b??'');const changed=lines.map((l,k)=>l[0]===' '?-1:k).filter(k=>k>=0);
  const keep=new Set();for(const k of changed)for(let d=-2;d<=2;d++)keep.add(k+d);
  const body=lines.map((l,k)=>keep.has(k)?l:null).reduce((acc,l)=>{if(l===null){if(acc.at(-1)!=='@@')acc.push('@@');}else acc.push(l);return acc;},[]);
  out.push(`--- ${a===undefined?'/dev/null':'a/'+rel}\n+++ ${b===undefined?'/dev/null':'b/'+rel}\n${body.join('\n')}`);
 }
 return out.join('\n')+(out.length?'\n':'');
}

export async function startRun(skillRoot,{configPath,runsRoot,analyzer=analyze,benchmarkRunner=runBenchmark,now=()=>new Date()}={}){
 const root=path.resolve(skillRoot),norm=posix(root)+'/';
 if(CACHE.some(r=>r.test(norm)))throw new Error('not an editable source: install cache');
 try{await fs.access(path.join(root,'SKILL.md'));}catch{throw new Error('not an editable source: SKILL.md missing');}
 const runDir=path.join(path.resolve(runsRoot??path.join(path.dirname(root),'.autoresearch')),`${stamp(now())}-${path.basename(root)}`);
 await fs.mkdir(path.dirname(runDir),{recursive:true});await fs.mkdir(runDir);
 const candidateDir=path.join(runDir,'candidate');
 await fs.cp(root,candidateDir,{recursive:true});await fs.cp(root,path.join(runDir,'kept'),{recursive:true});await fs.mkdir(path.join(runDir,'receipts'));
 const config=configPath?path.resolve(configPath):null;
 const baseline={schemaVersion:1,sourceRoot:root,sourceHash:await treeHash(root),configPath:config,
  static:await analyzer(candidateDir),benchmark:config?await benchmarkRunner(candidateDir,{configPath:config}):null};
 await writeJson(path.join(runDir,'baseline.json'),baseline);
 await writeJson(path.join(runDir,'kept.json'),{n:0,static:baseline.static,benchmark:baseline.benchmark});
 return {runDir,candidateDir,baseline};
}

export async function judgeExperiment(runDir,{description='',analyzer=analyze,benchmarkRunner=runBenchmark}={}){
 const baseline=await readJson(path.join(runDir,'baseline.json')),kept=await readJson(path.join(runDir,'kept.json'));
 const candidateDir=path.join(runDir,'candidate'),keptDir=path.join(runDir,'kept'),receipts=path.join(runDir,'receipts');
 const n=(await fs.readdir(receipts)).filter(f=>/^\d{3}\.json$/.test(f)).length+1,id=String(n).padStart(3,'0');
 const candidateStatic=await analyzer(candidateDir),staticCompare=compareReports(kept.static,candidateStatic);
 const reasons=[];
 if(candidateStatic.valid===false)reasons.push('static eval invalid');
 for(const f of staticCompare.added.filter(f=>f.severity==='error'))reasons.push(`new blocker ${f.code} (${f.file}:${f.line})`);
 let candidateBench=null,benchmarkSummary=null;
 if(baseline.configPath){
  candidateBench=await benchmarkRunner(candidateDir,{configPath:baseline.configPath});
  benchmarkSummary={keptPasses:passes(kept.benchmark),candidatePasses:passes(candidateBench),candidateStatus:candidateBench.status};
  if(['INCOMPLETE','BLOCKED'].includes(candidateBench.status))reasons.push('benchmark '+candidateBench.status);
  else if(benchmarkSummary.candidatePasses<benchmarkSummary.keptPasses)reasons.push(`benchmark worse ${benchmarkSummary.candidatePasses}<${benchmarkSummary.keptPasses}`);
 }
 const verdict=reasons.length?'DISCARD':baseline.configPath?'KEEP':'UNKNOWN';
 if(verdict==='UNKNOWN')reasons.push('no benchmark config: unverified-stack');
 const diff=await treeDiff(keptDir,candidateDir);
 if(verdict==='KEEP'){await replaceTree(candidateDir,keptDir);await writeJson(path.join(runDir,'kept.json'),{n,static:candidateStatic,benchmark:candidateBench});}
 if(verdict==='DISCARD')await replaceTree(keptDir,candidateDir);
 const receiptPath=path.join(receipts,id+'.json'),diffPath=path.join(receipts,id+'.diff');
 await fs.writeFile(diffPath,diff);
 await writeJson(receiptPath,{schemaVersion:1,n,description,verdict,reasons,staticCompare,benchmarkSummary,
  candidateHash:await treeHash(candidateDir),keptHash:await treeHash(keptDir),at:new Date().toISOString()});
 return {n,verdict,reasons,receiptPath,diffPath};
}

async function receiptsOf(runDir){
 const dir=path.join(runDir,'receipts');
 return Promise.all((await fs.readdir(dir)).filter(f=>/^\d{3}\.json$/.test(f)).sort().map(f=>readJson(path.join(dir,f))));
}
export async function resumeRun(runDir){
 const all=await receiptsOf(runDir),last=all.at(-1);
 if(last&&await treeHash(path.join(runDir,'kept'))!==last.keptHash)throw new Error(`kept snapshot does not match receipt ${String(last.n).padStart(3,'0')}`);
 return {lastKeptN:Math.max(0,...all.filter(r=>r.verdict==='KEEP').map(r=>r.n)),nextN:all.length+1};
}

export async function reportRun(runDir){
 const baseline=await readJson(path.join(runDir,'baseline.json')),kept=await readJson(path.join(runDir,'kept.json')),all=await receiptsOf(runDir);
 const warnings=[];
 let sourceNow=null;try{sourceNow=await treeHash(baseline.sourceRoot);}catch{warnings.push('source missing');}
 if(sourceNow&&sourceNow!==baseline.sourceHash)warnings.push('source changed since start');
 const keptDir=path.join(runDir,'kept'),candidateDir=path.join(runDir,'candidate');
 const combinedDiffPath=path.join(runDir,'combined.diff');await fs.writeFile(combinedDiffPath,await treeDiff(baseline.sourceRoot,keptDir));
 const pending=await treeDiff(keptDir,candidateDir);let unverifiedDiffPath=null;
 if(pending){unverifiedDiffPath=path.join(runDir,'unverified-stack.diff');await fs.writeFile(unverifiedDiffPath,pending);warnings.push('unverified-stack: candidate has UNKNOWN changes not in kept');}
 const count=v=>all.filter(r=>r.verdict===v).length;
 const report={schemaVersion:1,experiments:all.length,kept:count('KEEP'),discarded:count('DISCARD'),unknown:count('UNKNOWN'),
  combinedDiffPath,unverifiedDiffPath,before:{static:baseline.static,benchmark:baseline.benchmark},after:{static:kept.static,benchmark:kept.benchmark},
  log:all.map(r=>({n:r.n,verdict:r.verdict,description:r.description,reasons:r.reasons})),warnings,
  apply:'The source is unchanged. Apply combined.diff only after the user approves it.'};
 await writeJson(path.join(runDir,'report.json'),report);
 return report;
}
