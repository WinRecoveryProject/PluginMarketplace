import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const MAX_FILES=5000, MAX_FILE=2*1024*1024, MAX_TOTAL=32*1024*1024;
const TEXT=/\.(md|txt|json|ya?ml|m?js|cjs|ts|tsx|py|ps1|cmd|bat|sh|toml|xml|svg)$/i;
const IGNORED=new Set(['.git','node_modules','__pycache__','.plugin-eval','.studio-eval']);
export const scoringVersion='pss-eval-2';
export function contained(root,file){const rel=path.relative(root,file);return rel===''||(!rel.startsWith('..'+path.sep)&&rel!=='..'&&!path.isAbsolute(rel));}
export function redact(text){return String(text).replace(/\b(?:sk-[A-Za-z0-9_-]{12,}|gh[pousr]_[A-Za-z0-9]{12,}|github_pat_[A-Za-z0-9_]{12,})\b/g,'[REDACTED]').replace(/\bBearer\s+[A-Za-z0-9._~+/=-]{12,}/gi,'Bearer [REDACTED]');}
export async function safeText(root,file){
  if(!contained(root,file))throw new Error('Path escapes target root');
  const parts=path.relative(root,file).split(path.sep).filter(Boolean); let current=root;
  for(const part of parts){current=path.join(current,part);const stat=await fs.lstat(current);if(stat.isSymbolicLink())throw new Error('Symbolic link or junction rejected');}
  const before=await fs.lstat(file);if(!before.isFile()||before.size>MAX_FILE)throw new Error('Expected bounded regular text file');
  const handle=await fs.open(file,'r');
  try{const opened=await handle.stat();if(opened.ino!==before.ino||opened.dev!==before.dev)throw new Error('File changed while opening');
    const text=await handle.readFile('utf8');const after=await fs.lstat(file);if(after.isSymbolicLink()||after.ino!==before.ino||after.dev!==before.dev||after.size!==before.size||after.mtimeMs!==before.mtimeMs)throw new Error('File changed while reading');return text;
  }finally{await handle.close();}
}
function add(findings,severity,code,message,file,line=1,evidence=''){findings.push({id:`F${findings.length+1}`,severity,code,message,file,line,evidence:redact(evidence).slice(0,300),remediation:remediation(code)});}
function remediation(code){
 if(code.startsWith('reference'))return 'Use a contained existing package-relative reference.';
 if(code.startsWith('frontmatter'))return 'Provide unambiguous YAML frontmatter with non-empty string name and description.';
 if(code.startsWith('risk'))return 'Remove the unsafe behavior or state and enforce its authorized boundary.';
 if(code.startsWith('path'))return 'Use real contained files; do not follow symbolic links or junctions.';
 if(code.startsWith('budget'))return 'Move supporting detail into locally referenced files and keep the entrypoint focused.';
 return 'Correct the evidenced issue and rerun evaluation.';
}
function scalar(value){
 value=value.trim();
 if(value.startsWith('"')){try{return JSON.parse(value);}catch{throw new Error('Malformed quoted scalar');}}
 if(value.startsWith("'")){if(!/^'(?:[^']|'')*'$/.test(value))throw new Error('Malformed quoted scalar');return value.slice(1,-1).replaceAll("''", "'");}
 if(/^(?:true|false|null|~|[-+]?\d+(?:\.\d+)?)$/i.test(value))return null;
 if(/^[\[\]{}!&*]|\t|:\s/.test(value))throw new Error('Unsupported or ambiguous YAML scalar');
 return value.replace(/\s+#.*$/,'').trim();
}
export function frontmatter(text){
 text=text.replaceAll('\r\n','\n');const match=text.match(/^---\n([\s\S]*?)\n---(?:\n|$)/);if(!match)throw new Error('Missing or unclosed YAML frontmatter');
 const result={},lines=match[1].split('\n');const seen=new Set();
 for(let i=0;i<lines.length;i++){
   const line=lines[i];if(!line.trim()||/^\s*#/.test(line))continue;
   if(line.includes('\t'))throw new Error('YAML tabs are not supported');
   const m=line.match(/^([A-Za-z_][\w-]*):(?:\s+(.*))?$/);
   if(!m){if(/^\s+/.test(line))continue;throw new Error(`Malformed YAML mapping at line ${i+2}`);}
   if(seen.has(m[1]))throw new Error(`Duplicate YAML key: ${m[1]}`);seen.add(m[1]);
   const value=m[2]??'';
   if(/^[!&*]/.test(value))throw new Error('YAML tags, anchors and aliases are not supported');
   if(m[1]==='name'||m[1]==='description'){
     if(/^[>|][-+]?\s*$/.test(value)){let block=[];while(i+1<lines.length&&/^\s+/.test(lines[i+1]))block.push(lines[++i].trim());result[m[1]]=block.join(value[0]==='>'?' ':'\n');}
     else result[m[1]]=scalar(value);
   }else if(value&&/^[\[{]/.test(value)){
     // Unknown nested metadata remains opaque, but malformed delimiters cannot pass.
     const open=value[0],close=open==='['?']':'}';if(!value.endsWith(close))throw new Error('Unclosed YAML flow collection');
   }
 }
 return {...result,body:text.slice(match[0].length),headerLines:match[0].split('\n').length-1};
}
async function walk(root,findings){
 const files=[];let bytes=0;
 async function visit(current){
   for(const entry of await fs.readdir(current,{withFileTypes:true})){
     if(IGNORED.has(entry.name))continue;const file=path.join(current,entry.name),rel=path.relative(root,file).split(path.sep).join('/');
     const stat=await fs.lstat(file);
     if(stat.isSymbolicLink()){add(findings,'error','path.link','Symbolic links and junctions are not evaluated.',rel);continue;}
     if(stat.isDirectory())await visit(file);
     else if(stat.isFile()){
       bytes+=stat.size;if(files.length>=MAX_FILES||bytes>MAX_TOTAL)throw new Error('Target exceeds bounded evaluation limits');
       files.push({file,rel,bytes:stat.size});
       if(stat.size>MAX_FILE&&TEXT.test(entry.name))add(findings,'error','file.limit','Text member exceeds 2 MiB evaluation limit.',rel);
     }else add(findings,'error','path.special','Special files are not evaluated.',rel);
   }
 }
 await visit(root);return files;
}
function markdownProse(text){
 let fence=null;
 return text.replaceAll('\r\n','\n').split('\n').map(line=>{
   const marker=line.match(/^ {0,3}(`{3,}|~{3,})(.*)$/);
   if(fence){if(marker&&marker[1][0]===fence.char&&marker[1].length>=fence.length&&!marker[2].trim())fence=null;return ' '.repeat(line.length);}
   if(marker){fence={char:marker[1][0],length:marker[1].length};return ' '.repeat(line.length);}
   return line.replace(/(`+)(.*?)\1/g,m=>' '.repeat(m.length));
 }).join('\n');
}
async function inspectSkill(root,file,findings,records){
 const rel=path.relative(root,file).split(path.sep).join('/');let text;
 try{text=await safeText(root,file);}catch(err){add(findings,'error','path.read',err.message,rel);return;}
 let meta;
 try{meta=frontmatter(text);}catch(err){add(findings,'error','frontmatter.invalid',err.message,rel);return;}
 if(typeof meta.name!=='string'||!meta.name.trim()||!/^[-a-z0-9]+$/.test(meta.name)||meta.name.length>64)add(findings,'error','frontmatter.name','Skill name must be a non-empty portable string of at most 64 characters.',rel,2,String(meta.name));
 if(typeof meta.description!=='string'||!meta.description.trim())add(findings,'error','frontmatter.description','Skill description must be a non-empty string.',rel,3,String(meta.description));
 else if(meta.description.length>1024)add(findings,'warning','budget.description','Description is longer than 1024 characters.',rel,3,meta.description);
 const lines=text.replaceAll('\r\n','\n').split('\n');
 if(lines.length>500)add(findings,'warning','budget.entrypoint','Entrypoint exceeds 500 lines; use progressive disclosure.',rel);
 if(!/^#\s+\S/m.test(meta.body))add(findings,'warning','structure.title','No clear Markdown title was found.',rel);
 if(!/\b(use when|when|if|for)\b/i.test(meta.description??''))add(findings,'warning','discovery.trigger','Description does not make a triggering condition explicit.',rel,3,meta.description);
 if(!/\b(do not|never|not for|out.of.scope|only|reject|refuse)\b/i.test(meta.body))add(findings,'info','behavior.boundary','No explicit scope or refusal boundary was found.',rel);
 const proseLines=markdownProse('\n'.repeat(meta.headerLines)+meta.body).split('\n');
 for(let i=0;i<proseLines.length;i++){
   const line=proseLines[i];
   for(const m of line.matchAll(/\]\(([^)]+)\)/g)){
     let link=m[1].replace(/^<|>$/g,'').split('#')[0];if(!link||/^(https?:|mailto:)/i.test(link))continue;
     if(/^(?:plugin|app|codex):\/\//i.test(link)){add(findings,'info','reference.host','Host capability reference; availability is not established by local file analysis.',rel,i+1,link);continue;}
     try{link=decodeURIComponent(link);}catch{add(findings,'error','reference.invalid','Invalid encoded reference.',rel,i+1,m[1]);continue;}
     const target=path.resolve(path.dirname(file),link);
     if(path.isAbsolute(link)||/^[A-Za-z]:|^[a-z]+:/i.test(link)||!contained(root,target)){add(findings,'error','reference.escape','Reference escapes the evaluated package.',rel,i+1,m[1]);continue;}
     try{await safeText(root,target);}catch(err){add(findings,'error',err.code==='ENOENT'?'reference.missing':'reference.unsafe',`Reference cannot be read safely: ${err.message}`,rel,i+1,m[1]);}
   }
 }
 records.push({name:meta.name??null,file:rel,description:meta.description??null,lineCount:lines.length,estimatedTokens:Math.ceil(text.length/4)});
}
function riskLines(file,text,findings){
 const rules=[
 ['risk.instruction-override',/ignore (?:all |any )?(?:previous|system|developer) instructions|hide (?:this|these|it) from (?:the )?user/i],
 ['risk.execution',/(?:curl|wget|Invoke-WebRequest)\b[^\n]*(?:\|\s*(?:sh|bash|iex|Invoke-Expression))/i],
 ['risk.credential',/\b(?:sk-[A-Za-z0-9_-]{16,}|ghp_[A-Za-z0-9]{16,}|github_pat_[A-Za-z0-9_]{16,})\b/],
 ];
 for(const [i,line]of text.replaceAll('\r\n','\n').split('\n').entries())for(const[code,regex]of rules){
   if(regex.test(line)&&!(code!=='risk.credential'&&/\b(do not|never|reject|detect|flag|must not)\b/i.test(line))){
     // Preserve evidence from examples; do not equate literal fixture data or
     // scanner definitions with an active instruction. This is not an allowlist
     // for test directories: executable commands and Markdown remain blocking.
     const script=/\.[cm]?[jt]s$/i.test(file);
     const fixture=script&&/(?:^|\/)(?:tests?|fixtures?)\/|\.(?:test|spec)\.[cm]?[jt]s$/i.test(file)
       && /(?:\b(?:const|let|var)\s+\w+\s*=\s*['"`]|\b(?:fixture|writeFile|writeFileSync|res\.end)\s*\()/u.test(line);
     const ruleLiteral=script&&/(?:\[\s*['"]risk\.[\w.-]+['"]\s*,\s*\/|\brule\(\s*['"][A-Z_]+['"]\s*,\s*['"][a-z]+['"]\s*,\s*\/)/u.test(line);
     const context=ruleLiteral?'rule-definition':fixture?'test-fixture':'active-or-unclassified';
     add(findings,fixture||ruleLiteral?'warning':'error',code,'Review this concrete instruction or credential pattern; context is not proof of runtime safety or malicious intent.',file,i+1,line);
     findings.at(-1).context=context;
   }
 }
}
async function declaredCapability(root,manifest,findings){
 const ext=manifest.extensions?.['com.openai']??{};
 let found=false;
 for(const [kind,value]of [['apps',manifest.apps??ext.apps],['mcpServers',manifest.mcpServers??manifest.mcp??ext.mcpServers],['hooks',manifest.hooks]]){
   if(!value)continue;
   if(typeof value==='object'){found ||= Object.keys(value).length>0;continue;}
   if(typeof value!=='string')continue;
   const target=path.resolve(root,value);
   if(path.isAbsolute(value)||!contained(root,target)){add(findings,'error','reference.escape','Capability manifest escapes the package.',value);continue;}
   try{
     const data=JSON.parse(await safeText(root,target));
     const entries=kind==='apps'?data.apps:kind==='mcpServers'?data.mcpServers:data.hooks??data;
     found ||= Boolean(entries&&typeof entries==='object'&&Object.keys(entries).length);
   }catch(error){add(findings,'error','reference.missing','Capability manifest cannot be read: '+error.message,value);}
 }
 return found;
}
export async function analyze(target,options={}){
 let root=path.resolve(target),specific=null;const supplied=await fs.lstat(root);
 if(supplied.isSymbolicLink())throw new Error('Target symlink or junction rejected');
 if(supplied.isFile()){if(path.basename(root).toLowerCase()!=='skill.md')throw new Error('Supply a plugin root, skill root or SKILL.md');specific=root;root=path.dirname(root);}
 if(!supplied.isDirectory()&&!specific)throw new Error('Target must be a real directory');
 // A skill installed as an immediate child of a real plugin may reference its
 // own package's shared policy/resources. It may never cross that package root.
 let contextRoot=root;
 if(path.basename(path.dirname(root))==='skills'){
   const parent=path.dirname(path.dirname(root));
   for(const rel of ['plugin.json','.codex-plugin/plugin.json']){
     try{const candidate=path.join(parent,rel);await safeText(parent,candidate);contextRoot=parent;break;}
     catch(error){if(error.code!=='ENOENT')throw error;}
   }
 }
 const findings=[],skills=[],files=await walk(root,findings);let manifest=null;const contentHashes=[];
 for(const candidate of ['plugin.json','.codex-plugin/plugin.json'])try{const file=path.join(root,candidate);const text=await safeText(root,file);const value=JSON.parse(text);if(!manifest)manifest=value;else if(value.name!==manifest.name||value.version!==manifest.version)add(findings,'error','manifest.identity','Portable and compatibility identities differ.',candidate);}catch(err){if(err.code!=='ENOENT')add(findings,'error','manifest.invalid',err.message,candidate);}
 const kind=manifest?'plugin':'skill';
 const entrypoints=kind==='skill'?[specific??path.join(root,'SKILL.md')]:files.filter(f=>/^skills\/[^/]+\/SKILL\.md$/i.test(f.rel)).map(f=>f.file);
 if(kind==='plugin'){
   if(!manifest.name||!manifest.version)add(findings,'error','manifest.required','Manifest name and version are required.','plugin.json');
   const declared=await declaredCapability(root,manifest,findings);
   if(!entrypoints.length&&!declared)add(findings,'error','manifest.capability','No discoverable skills, App, MCP or hook capability.','plugin.json');
 }
 for(const file of entrypoints)await inspectSkill(contextRoot,file,findings,skills);
 for(const f of files)if(TEXT.test(f.rel)&&f.bytes<=MAX_FILE){try{const text=await safeText(root,f.file);contentHashes.push([f.rel,crypto.createHash('sha256').update(text).digest('hex')]);riskLines(f.rel,text,findings);}catch(err){add(findings,'error','path.read',err.message,f.rel);}}
 const metrics=[];
 if(options.metricPack){
   const pack=typeof options.metricPack==='string'?JSON.parse(await fs.readFile(options.metricPack,'utf8')):options.metricPack;
   if(pack.version!==1||!Array.isArray(pack.metrics)||pack.metrics.length>100)throw new Error('Metric pack requires version 1 and at most 100 data-only metrics');
   for(const item of pack.metrics){
     if(typeof item.id!=='string'||typeof item.pattern!=='string'||item.pattern.length>500||typeof item.file!=='string'||typeof item.expected!=='boolean')throw new Error('Invalid metric definition');
     const file=path.resolve(root,item.file);if(path.isAbsolute(item.file)||!contained(root,file))throw new Error('Metric file escapes target root');
     const regex=new RegExp(item.pattern,item.flags??'');const text=await safeText(root,file);if(text.length>200000)throw new Error('Metric text exceeds bounded regex input');
     const passed=regex.test(text)===item.expected;metrics.push({id:item.id,status:passed?'PASS':'FAIL',file:item.file});
     if(!passed)add(findings,'error','metric.failed',`Metric failed: ${item.id}`,item.file);
   }
 }
 const errors=findings.filter(f=>f.severity==='error'),warnings=findings.filter(f=>f.severity==='warning');
 const score=Math.max(0,100-errors.length*14-warnings.length*6);
 const staticTokens=skills.reduce((sum,s)=>sum+s.estimatedTokens,0);
 const report={schemaVersion:1,scoringVersion,kind,mode:'static',target:{root,packageRoot:contextRoot,name:manifest?.name??skills[0]?.name??path.basename(root),version:manifest?.version??null},
   valid:errors.length===0,readiness:errors.length?'BLOCKED':'STATIC_READY',score,scoreMeaning:'Static readiness only. This score does not establish task success, safety certification, installation or publication.',
   counts:{errors:errors.length,warnings:warnings.length,info:findings.filter(f=>f.severity==='info').length},findings,skills,metrics,
   budget:{estimatedTokens:staticTokens,method:'characters/4',scope:'SKILL.md entrypoints',descriptionTokens:Math.ceil(skills.reduce((n,s)=>n+(s.description?.length??0),0)/4)},
   observedUsage:{status:'UNKNOWN',reason:'No actual Codex usage events supplied.'},behavior:{status:'UNKNOWN',reason:'No practical benchmark has been executed.'},
   fingerprint:crypto.createHash('sha256').update(JSON.stringify({members:files.map(f=>[f.rel,f.bytes]),content:contentHashes})).digest('hex'),
   improvementBrief:{fixFirst:errors.slice(0,10),then:warnings.slice(0,10),nextAction:errors.length?'Correct blocking findings and repeat static evaluation.':'Prepare representative cases and run an explicit isolated benchmark.'},
   dimensions:[['identity',errors.some(f=>f.code.startsWith('manifest')||f.code.startsWith('frontmatter'))],['references',errors.some(f=>f.code.startsWith('reference'))],['risk',errors.some(f=>f.code.startsWith('risk')||f.code.startsWith('path'))]].map(([name,fail])=>({name,status:fail?'FAIL':'PASS'}))};
 return report;
}
