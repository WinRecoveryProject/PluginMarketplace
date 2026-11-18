// Bound analyzer work per process without raising the process timeout or running source.
const MAX_FILES=8;
const TARGET_BYTES=256*1024; // A larger supported source stays whole, alone in a batch.
const MAX_INPUT_BYTES=16*1024*1024; // Covers worst-case JSON escaping of the 2 MiB source limit.
const TIMEOUT=30000;
function batches(files){
  const result=[];let current=[],bytes=2;
  for(const {file,content} of files){
    const item={file,content},size=Buffer.byteLength(JSON.stringify(item));
    if(current.length&&(current.length>=MAX_FILES||bytes+1+size>TARGET_BYTES)){result.push(current);current=[];bytes=2;}
    bytes+=(current.length?1:0)+size;current.push(item);
  }
  if(current.length)result.push(current);
  return result;
}
function checkedReport(text,files){
  const report=JSON.parse(text.trim()),allowed=new Set(files.map(f=>f.file));
  if(!Array.isArray(report))throw Error('PowerShell adapter returned a non-array report');
  return report.map(item=>{
    if(!item||typeof item!=='object'||!allowed.has(item.file)||typeof item.rule!=='string'||!item.rule||item.rule.length>256||
       typeof item.message!=='string'||item.message.length>32768||!Number.isInteger(item.line)||item.line<1||
       !Number.isInteger(item.column)||item.column<1||!['error','warning','information','info'].includes(item.severity))
      throw Error('PowerShell adapter returned an invalid or out-of-batch diagnostic');
    return {file:item.file,rule:item.rule,message:item.message,line:item.line,column:item.column,severity:item.severity};
  });
}
export async function analyzePowerShell(files,{execute,executable,adapter,cwd}){
  const findings=[];
  for(const batch of batches(files)){
    try{
      const input=JSON.stringify(batch);
      if(Buffer.byteLength(input)>MAX_INPUT_BYTES)throw Error('PowerShell batch exceeds bounded adapter input');
      const result=await execute(executable,['-NoLogo','-NoProfile','-NonInteractive','-File',adapter],
        {cwd,input,timeout:TIMEOUT});
      if(result.code!==0)throw Error(result.stderr||`PowerShell adapter exited ${result.code}`);
      findings.push(...checkedReport(result.stdout,batch));
    }catch(error){
      // The failed process is terminal. Continue independent batches, never mark this one checked.
      const reason=String(error?.message??error).slice(0,2048);
      for(const item of batch)findings.push({file:item.file,rule:'powershell-adapter',message:`PowerShell batch incomplete: ${reason}`,
        line:1,column:1,severity:'error',incomplete:true});
    }
  }
  return findings;
}
