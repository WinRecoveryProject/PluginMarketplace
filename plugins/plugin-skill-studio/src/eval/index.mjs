export {analyze,frontmatter,scoringVersion} from './static.mjs';
export {createBenchmarkConfig,runBenchmark} from './benchmark.mjs';

function escape(value){return String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');}
export function render(report,format='json'){
 if(format==='json')return JSON.stringify(report,null,2)+'\n';
 const lines=[`# ${report.target?.name??'Skill Eval'}`,``, `Readiness: ${report.readiness??report.status??'UNKNOWN'}`,`Static score: ${report.score??'UNKNOWN'}`,``,report.scoreMeaning??'Practical results describe only observed runs.',``, '## Fix first',...((report.findings??[]).filter(f=>f.severity==='error').map(f=>`- ${f.code} — ${f.message} (${f.file}:${f.line})`)),``, '## Findings',...(report.findings??[]).map(f=>`- [${f.severity}] ${f.code}: ${f.message} (${f.file}:${f.line})`),``, '## Budget',`Estimated tokens: ${report.budget?.estimatedTokens??'UNKNOWN'}; method: ${report.budget?.method??'UNKNOWN'}.`,`Observed usage: ${report.observedUsage?.status??'UNKNOWN'}.`,`Behavior: ${report.behavior?.status??report.status??'UNKNOWN'}.`];
 const md=lines.join('\n')+'\n';if(format==='markdown')return md;
 if(format==='html'){
   const rows=(report.findings??[]).map(f=>`<tr><th scope="row">${escape(f.id??f.code)}</th><td>${escape(f.severity)}</td><td>${escape(f.code)}</td><td>${escape(f.message)}</td><td>${escape(`${f.file}:${f.line}`)}</td><td><code>${escape(f.evidence)}</code></td></tr>`).join('');
   return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escape(report.target?.name??'Skill Eval')}</title><style>body{font-family:system-ui,sans-serif;line-height:1.5;margin:2rem;max-width:90rem}section[role=region]{overflow-x:auto}table{border-collapse:collapse;width:100%}caption{text-align:left;font-weight:bold}th,td{border:1px solid #737373;padding:.6rem;text-align:left;vertical-align:top}pre{white-space:pre-wrap;overflow-wrap:anywhere}code{overflow-wrap:anywhere}</style></head><body><main><h1>${escape(report.target?.name??'Skill Eval')}</h1><p>Readiness: ${escape(report.readiness??report.status??'UNKNOWN')}. Static score: ${escape(report.score??'UNKNOWN')}.</p><p>${escape(report.scoreMeaning??'Only observed practical cases are reported.')}</p><section role="region" tabindex="0" aria-labelledby="findings-caption"><table><caption id="findings-caption">Evaluation findings and evidence</caption><thead><tr><th scope="col">Finding</th><th scope="col">Severity</th><th scope="col">Rule</th><th scope="col">Explanation</th><th scope="col">Location</th><th scope="col">Evidence</th></tr></thead><tbody>${rows||'<tr><td colspan="6">No findings in the configured static checks.</td></tr>'}</tbody></table></section><h2>Report details</h2><pre>${escape(md)}</pre></main></body></html>\n`;
 }
 throw new Error('Format must be json, markdown or html');
}
export function compareReports(before,after){
 if(before.scoringVersion!==after.scoringVersion)throw new Error('Cannot compare different scoring versions');
 const key=f=>[f.code,f.file,f.line,f.message].join('\0');const left=new Set((before.findings??[]).map(key)),right=new Set((after.findings??[]).map(key));
 return {schemaVersion:1,scoringVersion:before.scoringVersion,before:before.target,after:after.target,scoreDelta:after.score-before.score,
   added:(after.findings??[]).filter(f=>!left.has(key(f))),resolved:(before.findings??[]).filter(f=>!right.has(key(f))),
   behaviorComparable:before.behavior?.configFingerprint!=null&&before.behavior.configFingerprint===after.behavior?.configFingerprint,
   warning:'Static score changes do not establish practical improvement.'};
}
