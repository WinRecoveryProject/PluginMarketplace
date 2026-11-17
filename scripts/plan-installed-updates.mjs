import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const identity=/^[a-z0-9][a-z0-9._-]*@[a-z0-9][a-z0-9._-]*$/;
export function planInstalledUpdates(inventory, requested) {
  if (!inventory || !Array.isArray(inventory.installed) || !Array.isArray(requested) || !requested.length)
    throw new Error('Supply the full installed registry and exact requested identities.');
  const installed=new Map();
  for (const row of inventory.installed) {
    if (!row || typeof row.pluginId!=='string' || !identity.test(row.pluginId) || typeof row.enabled!=='boolean' || typeof row.version!=='string' || row.installed!==true)
      throw new Error('Malformed installed record.');
    if (installed.has(row.pluginId)) throw new Error('Duplicate installed identity.');
    installed.set(row.pluginId,row);
  }
  const updates=[],skipped=[];
  for (const id of [...new Set(requested)]) {
    if (typeof id!=='string' || !identity.test(id)) throw new Error('Use exact name@marketplace identities.');
    const row=installed.get(id);
    if (!row) skipped.push({id,reason:'not-installed; catalog availability is separate'});
    else if (!row.enabled) skipped.push({id,reason:'disabled; preserve the existing state'});
    else updates.push({id,currentVersion:row.version});
  }
  return {kind:'installed-update-preview',updates,skipped,mutationsPerformed:false};
}
if (process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  try {
    const [, , file,...requested]=process.argv;
    const data=JSON.parse(fs.readFileSync(file,'utf8'));
    console.log(JSON.stringify(planInstalledUpdates(data,requested),null,2));
  } catch (error) {
    console.log(JSON.stringify({status:'ERROR',error:error.message,mutationsPerformed:false}));
    process.exitCode=1;
  }
}
