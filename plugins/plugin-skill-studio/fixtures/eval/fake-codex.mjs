// Test-only protocol fixture, not a Codex model or substitute for a live benchmark.
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
const args=process.argv.slice(2);
if(args.includes('--help')){process.stdout.write('exec --ephemeral --json --sandbox\n');process.exit(0);}
function mode(){try{return JSON.parse(fs.readFileSync(path.join(process.cwd(),'runner-mode.json'),'utf8'));}catch{return {};}}
if(args[0]==='app-server'){
 readline.createInterface({input:process.stdin}).on('line',line=>{
  const req=JSON.parse(line);if(req.id==null)return;
  let result={},m=mode();
  if(req.method==='config/read')result={config:{features:{plugins:false,apps:false},mcp_servers:{},model:'fixture-only'}};
  if(req.method==='account/read')result={account:{type:'fixture'},requiresOpenaiAuth:true};
  if(req.method==='hooks/list')result={data:[]};
  if(req.method==='skills/list'){
   const cwd=req.params.cwds[0],dir=path.join(cwd,'.agents','skills');let entries=[];
   if(fs.existsSync(dir))entries=fs.readdirSync(dir).map(name=>({name,path:path.join(dir,name,'SKILL.md'),enabled:true}));
   const globalPath=path.resolve(cwd,'..','unrelated-global','SKILL.md');
   entries.push({name:'unrelated-global',path:globalPath,enabled:m.isolationFail||!args.some(a=>a.includes(JSON.stringify(globalPath))&&a.includes('enabled=false'))});
   result={data:[{cwd,skills:entries,errors:[]}]};
  }
  process.stdout.write(JSON.stringify({id:req.id,result})+'\n');
 });
}else if(args[0]==='exec'){
 const m=mode();if(m.timeout)setTimeout(()=>{},30000);
 else{
  fs.writeFileSync('result.txt',m.wrongResult?'wrong':'expected');
  process.stdout.write(JSON.stringify({type:'turn.completed',...(m.noUsage?{}:{usage:{input_tokens:10,output_tokens:4,cached_input_tokens:2}})})+'\n');
 }
}else process.exit(2);
