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
    case 'desktop-windows': case 'desktop-scope': case 'desktop-inspect':
    case 'desktop-activate': case 'desktop-capture': case 'desktop-click': case 'desktop-scroll': {
      const desktop=await import('../src/desktop/index.mjs');
      if(['desktop-activate','desktop-click','desktop-scroll'].includes(command)&&opts.out)throw Error('Live desktop actions do not accept --out; capture stdout separately and never replay a failed action automatically');
      if(opts.out){await desktop.verifyLocalDesktopPaths([path.resolve(opts.out)]);desktop.assertPrivateDesktopOutput(opts.out);}
      const action=command==='desktop-windows'?'list':command.slice(8);
      const request={action};
      if(action==='scope')request.windowHandle=Number(required(target,'observed window handle'));
      else if(action!=='list')request.scope=await desktop.readDesktopScope(required(target,'scope JSON'));
      if(action==='capture')request.directory=path.resolve(required(opts.dir,'--dir private output directory'));
      if(['activate','click','scroll'].includes(action))request.execute=opts.execute===true;
      if(['click','scroll'].includes(action)){
        request.snapshot=path.resolve(required(opts.snapshot,'--snapshot fresh receipt'));
        request.x=Number(opts.x);request.y=Number(opts.y);
        if(action==='scroll')request.delta=Number(opts.delta);
      }
      result=await desktop.desktopRequest(request);
      if(action==='scope')result=result.scope;
      break;
    }
    case 'capabilities': result=await loadRegistry(); break;
    case 'route': result=await route(required(opts._.join(' '),'request')); break;
    case 'self-check': result=await selfCheck(); if(!result.ok) process.exitCode=1; break;
    case 'skill-eval': case 'plugin-eval': {
      const engine=await import('../src/eval/index.mjs');
      const mode=opts.mode??'static';
      if(!['static','benchmark'].includes(mode)) throw new Error('mode must be static or benchmark');
      const limits={}; for(const [flag,key]of [['max-files','maxFiles'],['max-file-bytes','maxFileBytes'],['max-total-bytes','maxTotalBytes']])if(opts[flag]!==undefined)limits[key]=Number(opts[flag]);
      const evalOptions={limits,configPath:opts.config,outDir:opts.mode==='benchmark'?opts.out:undefined,timeoutMs:opts.timeout?Number(opts.timeout):undefined,codexPath:opts.codex,metricPack:opts['metric-pack']};
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
    case 'inventory-reconcile': {
      const {readBounded}=await import('../src/services/files.mjs');
      const {reconcileInstalledInventories}=await import('../src/services/installed-inventory.mjs');
      result=reconcileInstalledInventories(JSON.parse(await readBounded(path.resolve(required(target,'inventory input JSON')),8*1024*1024)));
      if(!result.complete)process.exitCode=2;
      break;
    }
    case 'inventory-versions': {
      const {readBounded}=await import('../src/services/files.mjs');
      const {auditInventoryVersions,compareHostInstallations}=await import('../src/services/inventory-versions.mjs');
      const readAudit=async file=>auditInventoryVersions(JSON.parse(await readBounded(path.resolve(file),32*1024*1024)));
      result=await readAudit(required(target,'version audit input JSON'));
      if(opts.against!==undefined){
        if(typeof opts.against!=='string')throw Error('--against requires the other host’s capture JSON');
        result.peerInstallation=compareHostInstallations(result,await readAudit(opts.against));
      }
      if(result.exitCode)process.exitCode=result.exitCode;
      break;
    }
    case 'resolve-installed': {
      const {readBounded}=await import('../src/services/files.mjs');
      const {resolveInstalledPlugin}=await import('../src/services/installed-resolver.mjs');
      result=await resolveInstalledPlugin(JSON.parse(await readBounded(path.resolve(required(target,'request JSON')),8*1024*1024)));
      if(result.status!=='RESOLVED')process.exitCode=2;
      break;
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
    default: throw new Error('Commands: capabilities, route, self-check, skill-eval, plugin-eval, benchmark-init, compare-reports, risk-scan, evidence-matrix, catalog-snapshot, catalog-search, catalog-compare, local-inventory, inventory-reconcile, inventory-versions, resolve-installed, import-preview, import-apply, gpt-import, release-checkpoint, release-advance, desktop-windows, desktop-scope, desktop-inspect, desktop-activate, desktop-capture, desktop-click, desktop-scroll. Legacy commands remain in plugin-studio.mjs and skill-studio.mjs.');
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
  main().catch(error=>{const result={ok:false,error:error.message};if(error.desktopOutcome!==undefined)result.inputSent=error.desktopOutcome;process.stderr.write(JSON.stringify(result)+'\n');process.exitCode=2;});
}
