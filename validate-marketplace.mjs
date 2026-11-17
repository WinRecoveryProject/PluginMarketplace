import {readFileSync, existsSync, readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {dirname, join, resolve, relative, isAbsolute} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=dirname(fileURLToPath(import.meta.url));
const failures=[], checks=[];
function check(ok,label){(ok?checks:failures).push(label);}
function json(file){try{return JSON.parse(readFileSync(join(root,file),'utf8'));}catch(e){failures.push(`${file}: ${e.message}`);return null;}}
function contained(base,value){
  if(typeof value!=='string')return false;
  const target=resolve(base,value), rel=relative(base,target);
  return rel!== '..'&&!rel.startsWith('..\\')&&!rel.startsWith('../')&&!isAbsolute(rel)&&existsSync(target);
}
const registry=json('.agents/plugins/marketplace.json');
const lock=json('plugin-sources.lock.json');
const ownRepo='https://github.com/WinRecoveryProject/PluginMarketplace.git';
const managed=['onedrive','cloudstorage-portal','powershell-workbench','plugin-skill-studio','component-forge','windows-dism-update-docs','codex-coordinator','codex-dev-workflows','codex-engineering-guardrails','codex-process-jobs','zilvereyes-context-handoff','winrecoveryproject-linter','winrecoveryproject-devsuite','coderabbit','agentmemory-asus'];
if(registry){
  check(readFileSync(join(root,'.agents/plugins/marketplace.json'),'utf8').replaceAll('\r\n','\n')===JSON.stringify(registry,null,2)+'\n','canonical registry formatting');
  const entries=registry.plugins??[], names=entries.map(e=>e.name);
  check(new Set(names).size===names.length,'unique marketplace names');
  check(!names.includes('cloudstorage-portal-local'),'obsolete Local package is not registered');
  check(!names.includes('zilvereyes-plugin-studio'),'Studio has one canonical marketplace name');
  check(!names.includes('megalinter'),'MegaLinter is a reference, not an installable Marketplace entry');
  for(const name of managed){
    const entry=entries.find(e=>e.name===name);
    check(Boolean(entry),`${name}: registered`);
    check(entry?.source?.source==='git-subdir'&&entry?.source?.url===ownRepo&&entry?.source?.path===`plugins/${name}`,`${name}: installable snapshot in this repository`);
    check(entry?.policy?.installation==='AVAILABLE',`${name}: installation policy`);
    const base=join(root,'plugins',name), m=json(`plugins/${name}/.codex-plugin/plugin.json`);
    if(!m)continue;
    check(m.name===name,`${name}: manifest identity`);
    check(typeof m.version==='string',`${name}: version present`);
    for(const key of ['skills','apps','mcpServers','onboardingSkill'])if(m[key]!=null)check(contained(base,m[key]),`${name}: contained ${key} reference`);
    for(const key of ['logo','composerIcon'])if(m.interface?.[key])check(contained(base,m.interface[key]),`${name}: contained ${key}`);
    if(m.skills){
      const skillBase=resolve(base,m.skills);
      for(const d of readdirSync(skillBase,{withFileTypes:true}).filter(d=>d.isDirectory()))check(existsSync(join(skillBase,d.name,'SKILL.md')),`${name}: skill ${d.name}`);
    }
    if(name==='winrecoveryproject-linter'){
      const pkg=json(`plugins/${name}/package.json`);
      const packageLock=json(`plugins/${name}/package-lock.json`);
      const shrinkwrap=json(`plugins/${name}/npm-shrinkwrap.json`);
      check(Boolean(pkg)&&Boolean(packageLock)&&Boolean(shrinkwrap),'Linter: native snapshot carries both bootstrap lockfiles');
      if(pkg&&packageLock&&shrinkwrap){
        check(JSON.stringify(packageLock)===JSON.stringify(shrinkwrap),'Linter: source and distribution lock graphs agree');
        for(const [dependency,version] of Object.entries(pkg.dependencies??{})){
          check(shrinkwrap.packages?.['']?.dependencies?.[dependency]===version&&shrinkwrap.packages?.[`node_modules/${dependency}`]?.version===version,`Linter: locked root dependency ${dependency}`);
        }
      }
      check(contained(base,'bin/wrp-lint.mjs')&&contained(base,'src/setup.mjs'),'Linter: packaged CLI and explicit bootstrap entrypoints');
      check(!existsSync(join(base,'node_modules'))&&!existsSync(join(base,'.tools')),'Linter: no runtime dependencies or downloaded tools bundled');
    }
    if(name==='onedrive'){
      const portable=json('plugins/onedrive/references/portable-plugin.json'), apps=json('plugins/onedrive/.app.json');
      check(!existsSync(join(base,'plugin.json')),'OneDrive uses the runtime-tested native Desktop entrypoint');
      check(portable?.version===m.version&&portable?.name===m.name,'OneDrive portable/native identity match');
      check(portable?.extensions?.['com.openai']?.apps===m.apps,'OneDrive portable/native App declaration match');
      const ids=Object.values(apps?.apps??{}).map(a=>a.id);
      check(ids.length===1&&ids.every(id=>/^asdk_app_[a-z0-9]+$/i.test(id)),'OneDrive contains exactly one existing App identity');
      check(entry?.pluginId===`plugin_${ids[0]}`,'OneDrive registry and packaged App identity agree');
      check(m.mcpServers==null,'OneDrive uses the registered App connection without a second native OAuth route');
      for(const file of ['mcp.json','.mcp.json']){
        check(!existsSync(join(base,file)),`OneDrive ${file}: no auto-discovered duplicate connection`);
      }
      const portalApps=json('plugins/cloudstorage-portal/.app.json');
      check(Object.values(portalApps?.apps??{}).some(a=>a.id===ids[0]),'OneDrive and Portal share the existing App identity');
    }
    if(name==='coderabbit'){
      const skillRoot=join(base,'skills/coderabbit-review');
      const agent=readFileSync(join(skillRoot,'agents/openai.yaml'),'utf8');
      for(const field of ['icon_small','icon_large']){
        const value=agent.match(new RegExp(`^\\s*${field}:\\s*"([^"]+)"\\s*$`,'m'))?.[1];
        check(Boolean(value)&&!value.split(/[\\/]/).includes('..')&&contained(skillRoot,value),`CodeRabbit: ${field} is skill-local without parent traversal`);
      }
      for(const file of ['coderabbit-small.png','coderabbit.png']){
        check(createHash('sha256').update(readFileSync(join(skillRoot,'assets',file))).digest('hex')===createHash('sha256').update(readFileSync(join(base,'assets',file))).digest('hex'),`CodeRabbit: original ${file} preserved`);
      }
      const source=lock?.plugins?.[name];
      check(source?.sourceKind==='upstream-with-local-patches'&&source?.upstreamUnmodified===false&&source?.upstreamVersion==='1.1.6','CodeRabbit: adapted package declares original upstream version');
      check(m.apps==null&&m.mcpServers==null,'CodeRabbit: no provider connections added');
    }
    const source=lock?.plugins?.[name];
    if(source){
      if(['personal-installed-snapshot','maintained-personal-snapshot'].includes(source.sourceKind)){
        check(source.sourceNamespace==='created-by-me-remote'&&/^[0-9a-f]{64}$/.test(source.sourceHash),`${name}: hashed personal package provenance`);
      }else if(source.sourceKind==='owned-app-wrapper'){
        const apps=json(`plugins/${name}/.app.json`), values=Object.values(apps?.apps??{});
        check(values.length===1&&values[0].id===source.sourceAppId&&values[0].required===false,`${name}: exactly one existing optional App`);
        check(source.originalPluginId===`plugin_${source.sourceAppId}`&&entry.pluginId===source.originalPluginId,`${name}: canonical original App identity preserved`);
        check(/^[0-9a-f]{64}$/.test(source.sourceHash)&&source.licenseScope?.includes('wrapper'),`${name}: hashed owned wrapper provenance and license boundary`);
        check(m.mcpServers==null&&!existsSync(join(base,'.mcp.json'))&&!existsSync(join(base,'hooks/hooks.json')),`${name}: no added MCP or hooks`);
      }else check(/^[0-9a-f]{40}$/.test(source.commit),`${name}: immutable source commit`);
      check(source.version===m.version,`${name}: source version`);
      const actual=[];
      function walk(dir){for(const d of readdirSync(dir,{withFileTypes:true})){
        const p=join(dir,d.name);
        if(d.isSymbolicLink()){failures.push(`${name}: symlink ${p}`);continue;}
        if(d.isDirectory())walk(p);else if(d.isFile())actual.push(relative(base,p).replaceAll('\\','/'));
      }}
      walk(base);
      check(JSON.stringify(actual.sort())===JSON.stringify(Object.keys(source.files).sort()),`${name}: snapshot file set`);
      for(const [file,hash] of Object.entries(source.files))check(contained(base,file)&&createHash('sha256').update(readFileSync(join(base,file))).digest('hex')===hash,`${name}: SHA256 ${file}`);
    }else check(name==='onedrive',`${name}: source provenance present`);
  }
}
const external=json('docs/external-plugin-collection-20261116.json');
if(registry&&external){
  const expected=['sharepoint','vercel','github','google-drive','openai-developers','dropbox'];
  check(JSON.stringify(external.gitPlugins.map(p=>p.name).sort())===JSON.stringify([...expected].sort()),'six installable reviewed external Git sources');
  const reference=external.referenceOnly?.find(p=>p.name==='megalinter');
  check(reference?.repository==='https://github.com/oxsecurity/megalinter.git'&&/^[0-9a-f]{40}$/.test(reference?.observedCommit??''),'MegaLinter original source provenance retained as reference only');
  check(reference?.status==='REFERENCE_ONLY_NOT_INSTALLED_BY_THIS_CATALOG','MegaLinter reference cannot imply installation');
  for(const p of external.gitPlugins){
    const entry=registry.plugins.find(e=>e.name===p.name);
    check(entry?.source?.source==='git-subdir'&&entry.source.url===p.repository&&entry.source.path===p.path,`${p.name}: original upstream source`);
    check(p.manifest?.name===p.name&&typeof p.manifest.version==='string',`${p.name}: observed upstream manifest identity`);
    check(/^[0-9a-f]{40}$/.test(p.observedCommit),`${p.name}: observed upstream revision`);
    check(entry?.interface?.displayName===p.manifest.interface?.displayName,`${p.name}: original display name`);
    check(entry?.policy?.installation==='AVAILABLE',`${p.name}: installation policy`);
    if(p.apps){
      const ids=Object.values(p.apps.apps??{}).map(a=>a.id);
      check(p.installedAppIds.length>0&&p.installedAppIds.every(id=>ids.includes(id)),`${p.name}: existing provider App identities preserved`);
    }
  }
  const remote=['plugin-creator','cloud-environment','defense-factory','plugin-management'];
  check(JSON.stringify(external.catalogOnly.map(p=>p.name).sort())===JSON.stringify([...remote].sort()),'four original-catalog-only entries');
  for(const p of external.catalogOnly){
    check(!registry.plugins.some(e=>e.name===p.name),`${p.name}: no invented Git or remote manifest source`);
    check(p.url===`https://chatgpt.com/plugins/${p.pluginId}`&&/^plugin_connector_1p_[a-z0-9]+$/.test(p.pluginId),`${p.name}: retained official catalog identity`);
  }
  const names=[...registry.plugins.map(p=>p.name),...external.catalogOnly.map(p=>p.name)];
  check(names.length>=24&&new Set(names).size===names.length,'original supplied collection retained without duplicate names');
}
const workspace=json('docs/workspace-plugin-collection-20261116.json');
const additions=json('docs/catalog-additions-20261118.json');
if(registry&&workspace){
  for(const p of workspace.additionalGitSources){
    const e=registry.plugins.find(e=>e.name===p.name);
    check(e?.source?.source==='git-subdir'&&e.source.url===p.repository&&e.source.path===p.path,`${p.name}: verified original publisher source`);
    check(p.manifest?.name===p.name&&/^[0-9a-f]{40}$/.test(p.observedCommit),`${p.name}: upstream manifest and observed revision`);
    check(e?.interface?.displayName===p.manifest.interface?.displayName,`${p.name}: original publisher display name`);
  }
  const names=[...registry.plugins.map(p=>p.name),...workspace.catalogOnly.map(p=>p.name),...workspace.hostBundled.map(p=>p.name)];
  const added=additions?.addedEntries??[];
  check(additions?.baselineNativeMarketplaceEntries===workspace.counts.nativeMarketplaceEntries&&additions?.baselineCollectionProducts===workspace.counts.collectionProducts,'catalog additions retain the historical baseline');
  check(new Set(added.map(p=>p.name)).size===added.length&&added.every(p=>registry.plugins.some(e=>e.name===p.name&&e.pluginId===p.existingPluginId)&&p.newAppOrConnectionCreated===false&&p.installationAutomatic===false),'added catalog wrappers retain existing identities without automatic installation');
  check(new Set(names).size===names.length&&names.length===workspace.counts.collectionProducts+added.length&&names.length===additions?.currentCollectionRecords,'extended collection has one record per product');
  check(registry.plugins.length===workspace.counts.nativeMarketplaceEntries+added.length&&registry.plugins.length===additions?.currentNativeMarketplaceEntries,'native Marketplace entry count');
  check(workspace.catalogOnly.every(p=>p.url===`https://chatgpt.com/plugins/${p.pluginId}`),'original catalog links retain native identities');
  check(workspace.hostBundled.every(p=>p.status==='HOST_BUNDLED'&&!registry.plugins.some(e=>e.name===p.name)),'host runtime packages not republished as personal file paths');
  check(workspace.nativeLoaderRemoteSourceProbe.remoteEntryListed===false&&workspace.nativeLoaderRemoteSourceProbe.localControlListed===true,'remote source restriction checked with native positive control');
}
if(failures.length){console.error(JSON.stringify({ok:false,passed:checks.length,failures},null,2));process.exitCode=1;}
else console.log(JSON.stringify({ok:true,checks:checks.length,managedPlugins:managed,scope:'Package structure and exact source snapshots; not a live connection test.'},null,2));
