// Pure data reconciliation: never runs a host command, changes settings or loads a target.
const ID=/^[a-z0-9][a-z0-9._-]*@[a-z0-9][a-z0-9._-]*$/i;
function text(value,label){if(typeof value!=='string'||!value.trim()||value.length>256)throw Error('Invalid '+label);return value;}
function records(snapshot){
 const {kind,data}=snapshot;
 if(kind==='cli'||kind==='scoped-cli'||kind==='historical'){
  const list=data?.installed??data?.plugins;
  if(!Array.isArray(list))throw Error('Expected an installed plugin list');
  return list.filter(p=>p.installed!==false).map(p=>({id:p.pluginId,version:p.version,enabled:p.enabled}));
 }
 if(kind==='catalog'){
  if(!Array.isArray(data?.marketplaces))throw Error('Expected a native catalog snapshot');
  return data.marketplaces.flatMap(m=>m.plugins??[]).filter(p=>p.installed===true).map(p=>({id:p.id,version:p.localVersion??null,enabled:p.enabled}));
 }
 throw Error('Unknown inventory kind');
}
function normalize(snapshot){
 text(snapshot.label,'snapshot label');
 const scoped=snapshot.kind==='scoped-cli';
 if(scoped&&(!snapshot.namespace||typeof snapshot.namespace!=='string'||!/^[a-z0-9][a-z0-9._-]{0,100}$/i.test(snapshot.namespace)))throw Error('Invalid scoped CLI namespace');
 return records(snapshot).map(r=>{
  if(scoped&&!(typeof r.id==='string'&&r.id.endsWith('@'+snapshot.namespace)))throw Error('Record outside scoped CLI namespace');
  if(typeof r.id!=='string'||!ID.test(r.id))throw Error('Expected an exact name@marketplace plugin identity');
  if(r.version!=null)text(r.version,'installed version');
  if(r.enabled!=null&&typeof r.enabled!=='boolean')throw Error('Invalid enabled state');
  return {id:r.id,version:r.version??null,enabled:r.enabled??null};
 });
}
export function reconcileInstalledInventories(input){
 if(!Array.isArray(input?.current)||!input.current.length||input.current.length>100)throw Error('Provide 1–100 current inventory snapshots');
 const current=new Map(),sources=[],incomplete=[];
 let hasCli=false,hasCatalog=false;
 for(const snapshot of input.current){
  if(!['cli','scoped-cli','catalog'].includes(snapshot.kind))throw Error('Current snapshots must be cli, scoped-cli or catalog');
  hasCli ||= snapshot.kind==='cli';hasCatalog ||= snapshot.kind==='catalog';
  const rows=normalize(snapshot);if(rows.length>20000)throw Error('Inventory member limit exceeded');
  if(snapshot.data.marketplaceLoadErrors?.length)incomplete.push('Catalog load errors: '+snapshot.label);
  const unique=new Set();
  for(const row of rows){
   unique.add(row.id);if(!current.has(row.id))current.set(row.id,{id:row.id,observations:[]});
   current.get(row.id).observations.push({source:snapshot.label,kind:snapshot.kind,...row});
  }
  sources.push({label:snapshot.label,kind:snapshot.kind,installedIdentities:unique.size,
    ...(snapshot.kind==='scoped-cli'?{namespace:snapshot.namespace}:{})});
 }
 if(!hasCli)incomplete.push('Full CLI installed list missing; catalog slices alone are incomplete');
 if(!hasCatalog)incomplete.push('Native remote installed catalog missing; CLI alone can omit personal remote packages');
 const plugins=[...current.values()].sort((a,b)=>a.id.localeCompare(b.id)).map(p=>{
  const versions=[...new Set(p.observations.map(o=>o.version).filter(v=>v!==null))];
  const enabled=[...new Set(p.observations.map(o=>o.enabled).filter(v=>v!==null))];
  const status=versions.length>1||enabled.length>1?'CONFLICT':versions.length===0?'VERSION_UNKNOWN':'CONSISTENT';
  if(status!=='CONSISTENT')incomplete.push(status+': '+p.id);
  return {...p,versions,status};
 });
 const historical=input.historical??[];
 if(!Array.isArray(historical)||historical.length>100)throw Error('Invalid historical inventories');
 const absentStatus=!hasCli&&input.current.some(snapshot=>snapshot.kind==='scoped-cli')?'HISTORICAL_ID_UNVERIFIED':'HISTORICAL_ID_ABSENT';
 const comparisons=historical.map(snapshot=>{
  if(snapshot.kind!=='historical')throw Error('History must be explicitly identified');
  const rows=normalize(snapshot),unique=new Map(rows.map(r=>[r.id,r]));
  const deltas=[...unique.values()].map(r=>({id:r.id,previousVersion:r.version,status:!current.has(r.id)?absentStatus:current.get(r.id).observations.some(o=>o.version===r.version)?'PRESENT':'PRESENT_VERSION_CHANGED'}));
  return {label:snapshot.label,previousInstalledIdentities:unique.size,deltas};
 });
 const appIds=input.apps?.apps?.map(a=>text(a.id,'App identity'))??null;
 return {schemaVersion:1,status:incomplete.length?'INCOMPLETE':'RECONCILED',complete:incomplete.length===0,
  installedPluginIdentities:plugins.length,identityMeaning:'Exact name@marketplace records; aliases are not automatically merged into one product.',
  apps:appIds?{installedAppIdentities:new Set(appIds).size,separateFromPluginCount:true}:null,
  sources,plugins,incomplete,historicalComparison:{status:comparisons.length?'COMPARED':'NOT_PROVIDED',snapshots:comparisons},
  safety:{targetExecuted:false,settingsChanged:false,networkRequests:0},
  limitation:'An absent historical identity does not prove lost functionality or authorize reinstalling a replacement. Record explicit source/account and adaptation evidence; do not infer aliases from display names.'};
}
