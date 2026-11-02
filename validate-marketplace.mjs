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
const managed=['onedrive','cloudstorage-portal','powershell-workbench','plugin-skill-studio','component-forge','windows-dism-update-docs'];
if(registry){
  check(readFileSync(join(root,'.agents/plugins/marketplace.json'),'utf8').replaceAll('\r\n','\n')===JSON.stringify(registry,null,2)+'\n','canonical registry formatting');
  const entries=registry.plugins??[], names=entries.map(e=>e.name);
  check(new Set(names).size===names.length,'unique marketplace names');
  check(!names.includes('cloudstorage-portal-local'),'obsolete Local package is not registered');
  check(!names.includes('zilvereyes-plugin-studio'),'Studio has one canonical marketplace name');
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
    if(name==='onedrive'){
      const portable=json('plugins/onedrive/references/portable-plugin.json'), apps=json('plugins/onedrive/.app.json');
      check(!existsSync(join(base,'plugin.json')),'OneDrive uses the runtime-tested native Desktop entrypoint');
      check(portable?.version===m.version&&portable?.name===m.name,'OneDrive portable/native identity match');
      check(portable?.extensions?.['com.openai']?.apps===m.apps,'OneDrive portable/native App declaration match');
      const ids=Object.values(apps?.apps??{}).map(a=>a.id);
      check(ids.length===1&&ids.every(id=>/^asdk_app_[a-z0-9]+$/i.test(id)),'OneDrive contains exactly one existing App identity');
      check(entry?.pluginId===`plugin_${ids[0]}`,'OneDrive registry and packaged App identity agree');
      for(const file of ['mcp.json','.mcp.json']){
        const servers=json(`plugins/onedrive/${file}`)?.mcpServers??{};
        check(Object.keys(servers).join(',')==='onedrive',`OneDrive ${file}: one server`);
        const server=servers.onedrive, auth=server?.extensions?.['com.openai']?.auth;
        check(server?.url==='https://cloudstorage-onedrive-mcp.vercel.app/mcp',`OneDrive ${file}: canonical endpoint`);
        check(auth?.client?.mode==='dcr',`OneDrive ${file}: DCR`);
        check(JSON.stringify(auth?.defaultScopes)===JSON.stringify(['onedrive.read','onedrive.write']),`OneDrive ${file}: read/write scopes`);
      }
    }
    const source=lock?.plugins?.[name];
    if(source){
      check(/^[0-9a-f]{40}$/.test(source.commit),`${name}: immutable source commit`);
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
if(failures.length){console.error(JSON.stringify({ok:false,passed:checks.length,failures},null,2));process.exitCode=1;}
else console.log(JSON.stringify({ok:true,checks:checks.length,managedPlugins:managed,scope:'Package structure and exact source snapshots; not a live connection test.'},null,2));
