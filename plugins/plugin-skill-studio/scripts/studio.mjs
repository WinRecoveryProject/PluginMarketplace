#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import {pathToFileURL} from 'node:url';
import {loadRegistry,route,selfCheck} from '../src/registry.mjs';

function options(args) {
  const result={_ : []};
  for(let i=0;i<args.length;i++) {
    if(args[i].startsWith('--')) {
      const key=args[i].slice(2);
      result[key]=args[i+1]&&!args[i+1].startsWith('--')?args[++i]:true;
    } else result._.push(args[i]);
  }
  return result;
}
async function json(file) { return JSON.parse(await fs.readFile(file,'utf8')); }
function required(value,label) { if(!value) throw new Error(label+' is required'); return value; }
export async function main(args=process.argv.slice(2)) {
  const [command,...rest]=args, opts=options(rest), [target,...more]=opts._;
  const format=opts.format??'json';
  let result, rendered;
  switch(command) {
    case 'capabilities': result=await loadRegistry(); break;
    case 'route': result=await route(required(opts._.join(' '),'request')); break;
    case 'self-check': result=await selfCheck(); if(!result.ok) process.exitCode=1; break;
    case 'skill-eval': case 'plugin-eval': {
      const engine=await import('../src/eval/index.mjs');
      const mode=opts.mode??'static';
      if(!['static','benchmark'].includes(mode)) throw new Error('mode must be static or benchmark');
      const evalOptions={configPath:opts.config,outDir:opts.mode==='benchmark'?opts.out:undefined,timeoutMs:opts.timeout?Number(opts.timeout):undefined,codexPath:opts.codex,metricPack:opts['metric-pack']};
      result=mode==='benchmark'?await engine.runBenchmark(required(target,'target'),evalOptions):await engine.analyze(required(target,'target'),evalOptions);
      if(result.valid===false||['FAIL','BLOCKED'].includes(result.status))process.exitCode=1;
      if(result.status==='INCOMPLETE')process.exitCode=2;
      rendered=engine.render(result,format); break;
    }
    case 'benchmark-init': {
      const engine=await import('../src/eval/index.mjs');
      result=await engine.createBenchmarkConfig(required(target,'target'),{sourcePath:opts.fixture}); break;
    }
    case 'compare-reports': {
      const engine=await import('../src/eval/index.mjs');
      result=engine.compareReports(await json(required(target,'before report')),await json(required(more[0],'after report'))); break;
    }
    case 'risk-scan': {
      const service=await import('../src/services/index.mjs');
      result=await service.scanRisk(required(target,'target'),{suppressions:opts.suppressions?await json(opts.suppressions):undefined});
      process.exitCode=result.exitCode;
      rendered=service.renderRisk(result,format); break;
    }
    case 'evidence-matrix': {
      const service=await import('../src/services/index.mjs'); result=service.evidenceMatrix(await json(required(target,'input JSON'))); break;
    }
    case 'catalog-snapshot': {
      const service=await import('../src/services/index.mjs'); result=await service.catalogSnapshot(required(target,'source'),{asOf:opts['as-of']}); break;
    }
    case 'catalog-search': {
      const service=await import('../src/services/index.mjs'); result=service.searchCatalog(await json(required(target,'snapshot')),required(more.join(' '),'query')); break;
    }
    case 'catalog-compare': {
      const service=await import('../src/services/index.mjs'); result=service.compareCatalogs(await json(required(target,'before')),await json(required(more[0],'after'))); break;
    }
    case 'local-inventory': {
      const service=await import('../src/services/index.mjs'); result=await service.inventory(required(target,'root')); break;
    }
    case 'import-preview': {
      const engine=await import('../src/conversion/index.mjs'); result=await engine.previewImport(required(target,'source root')); break;
    }
    case 'import-apply': {
      const engine=await import('../src/conversion/index.mjs'); result=await engine.applyImport(await json(required(target,'plan')),required(opts.out,'--out destination')); break;
    }
    case 'gpt-import': {
      const engine=await import('../src/conversion/index.mjs');
      const text=await fs.readFile(required(target,'input file'),'utf8');
      let input; try{input=JSON.parse(text);}catch{input={instructions:text};}
      result=await engine.importGpt(input,{outputParent:required(opts.out,'--out parent directory'),name:opts.name,sourcePath:path.resolve(target)}); break;
    }
    case 'release-checkpoint': {
      const engine=await import('../src/conversion/index.mjs'); result=engine.createReleaseCheckpoint(await json(required(target,'input file'))); break;
    }
    case 'release-advance': {
      const engine=await import('../src/conversion/index.mjs'); result=engine.advanceRelease(await json(required(target,'checkpoint')),await json(required(more[0],'event'))); break;
    }
    default: throw new Error('Commands: capabilities, route, self-check, skill-eval, plugin-eval, benchmark-init, compare-reports, risk-scan, evidence-matrix, catalog-snapshot, catalog-search, catalog-compare, local-inventory, import-preview, import-apply, gpt-import, release-checkpoint, release-advance. Legacy commands remain in plugin-studio.mjs and skill-studio.mjs.');
  }
  const output=rendered??JSON.stringify(result,null,2);
  // --out is a directory for mutating workflows and benchmarks; only reports use a file path.
  if(opts.out && !['import-apply','gpt-import'].includes(command) && !(opts.mode==='benchmark')) {
    await fs.writeFile(opts.out,output+'\n',{encoding:'utf8',flag:'wx'});
  }
  process.stdout.write(output+'\n');
  return result;
}
if(import.meta.url===pathToFileURL(process.argv[1]??'').href) {
  main().catch(error=>{process.stderr.write(JSON.stringify({ok:false,error:error.message})+'\n');process.exitCode=2;});
}
