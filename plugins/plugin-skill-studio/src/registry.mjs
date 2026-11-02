import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

export const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export async function loadRegistry(root=packageRoot) {
  const registry=JSON.parse(await fs.readFile(path.join(root,'references/integration-registry.json'),'utf8'));
  for (const c of registry.capabilities) {
    const full=path.resolve(root,c.entrypoint);
    if (!full.startsWith(path.resolve(root)+path.sep)) throw new Error('Registry entry escapes package');
    if (!(await fs.stat(full)).isFile()) throw new Error('Missing capability: '+c.id);
  }
  return registry;
}

const rules=[
 ['skill-eval',/skill.{0,35}(eval|vurder|test|analy[sz])|(?:eval|vurder|test|analy[sz]).{0,35}skill/i],
 ['plugin-eval',/plugin.{0,35}(eval|vurder|analy[sz])|(?:eval|vurder|analy[sz]).{0,35}plugin/i],
 ['risk-review',/risik|risk|malici|hemmelig|secret|sikkerhedsscan/i],
 ['evidence-matrix',/evidensmatrix|evidence matrix|freshwithin|kompetencebevis/i],
 ['import-gpt',/\bgpt\b|gpts/i],
 ['release-workflow',/publicer|publish|release|submission|indsend|pakning|\bzip\b/i],
 ['import-plugins',/(import|konvert|adapt).{0,25}(mappe|folder|skill|plugin)/i],
 ['catalog',/find.{0,25}(skill|plugin)|discover|katalog|catalog|radar/i],
 ['local-management',/permission|tilladelse|installed|installeret|afhængighed|dependenc/i],
 ['modern-web',/html|css|\bdom\b|accessibility|tilgængelig|web\s*ui/i],
 ['writing-plans',/\bplan\b|planlæg|specifikation/i],
 ['diagnose-systematically',/fejlsøg|debug|diagnos|failing|fejler/i],
 ['test-driven-development',/\btdd\b|test.driven|testdrevet/i],
 ['create-skill',/(opret|create|byg|build|lav).{0,25}skill/i],
 ['create-plugin',/(opret|create|byg|build|lav).{0,25}plugin/i],
 ['update-plugin',/(opdat|update|extend|udvid).{0,25}plugin/i],
];
export async function route(request,root=packageRoot) {
  if (typeof request!=='string'||!request.trim()) throw new Error('A nonempty request is required');
  const registry=await loadRegistry(root);
  const exact=registry.capabilities.find(x=>x.id===request.trim());
  const selected=exact?.id ?? rules.find(([,pattern])=>pattern.test(request))?.[0] ?? 'plugin-skill-studio';
  const capability=registry.capabilities.find(x=>x.id===selected);
  if (!capability) throw new Error('Router target missing: '+selected);
  return {schemaVersion:1,request,selected:capability.id,entrypoint:capability.entrypoint,
          reason:exact?'Exact local capability name':'Local intent routing',externalDependencies:[]};
}

export async function selfCheck(root=packageRoot) {
  const registry=await loadRegistry(root);
  const portable=JSON.parse(await fs.readFile(path.join(root,'plugin.json'),'utf8'));
  const compat=JSON.parse(await fs.readFile(path.join(root,'.codex-plugin/plugin.json'),'utf8'));
  const errors=[];
  if (portable.name!=='plugin-skill-studio'||compat.name!==portable.name||compat.version!==portable.version) errors.push('Manifest identity mismatch');
  if (JSON.stringify(portable.extensions['com.openai'].interface)!==JSON.stringify(compat.interface)) errors.push('Manifest interface mismatch');
  for (const source of registry.sources) {
    if (!source.files||!Object.keys(source.files).length) errors.push('Missing source provenance: '+source.id);
    for (const item of source.skills) {
      try { await fs.access(path.join(root,item.implementation)); }
      catch { errors.push('Unmapped source skill: '+source.id+'/'+item.sourceSkill); }
    }
  }
  for (const c of registry.capabilities) {
    const content=await fs.readFile(path.join(root,c.entrypoint),'utf8');
    if (!content.startsWith('---')||!content.includes('name: '+c.id+'\n')) errors.push('Skill identity mismatch: '+c.id);
    const links=[...content.matchAll(/\]\(([^)]+)\)/g)].map(m=>m[1]);
    for (let link of links) {
      link=link.split('#')[0];
      if (!link||/^(https?:|mailto:|plugin:|skill:)/i.test(link)) continue;
      try { await fs.access(path.resolve(path.dirname(path.join(root,c.entrypoint)),link)); }
      catch { errors.push('Broken local reference: '+c.id+' -> '+link); }
    }
  }
  return {ok:errors.length===0,package:portable.name,version:portable.version,sources:registry.sources.length,
          capabilities:registry.capabilities.length,errors,installation:'not performed',publication:'not performed'};
}
