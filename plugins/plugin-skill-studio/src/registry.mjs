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

// [capability, mode|null, pattern]; the first match wins, so specific workflows precede broad ones.
const rules=[
 ['studio-git','safety',/force push|hard reset|history re-?writ|destructive|clean up git history|routine safe git/i],
 ['studio-git','conflicts',/merge conflicts?|rebase conflicts?|conflict markers|fix this merge|rebase pauses|routine rebasing without conflicts|creating new branches/i],
 ['studio-git','finish',/integration of a finished branch|merge\/pr\/keep\/discard|work needs to be integrated/i],
 ['studio-git','worktree',/isolation from current workspace|isolated workspace|git worktree/i],
 ['studio-debug','triage',/triage|incoming issues|external bug reports|out-of-scope requests|contributor tickets|tickets already produced by to-tickets/i],
 ['studio-debug','loop',/tight feedback loop|runtime exceptions|flaky ci|debug this|routine test-driven feature development/i],
 ['studio-debug','diagnose',/root causes? (through reproduction|of)|lacks a demonstrated cause/i],
 ['studio-execute','durable',/durable state file|interruption-prone|risks compaction|resume after interruption/i],
 ['studio-execute','spec-run',/full specification across task tickets|unified pr|build the whole spec|single isolated bug fixes|exploratory coding without tickets/i],
 ['studio-execute','parallel',/one subagent per independent problem|proceed concurrently|without shared state/i],
 ['studio-execute','subagent',/one subagent per task|per-task review gates|executing plans with independent tasks/i],
 ['studio-execute','execute',/inline, task by task|stopping only on blockers|subagent dispatch is unavailable|separate session/i],
 ['studio-execute','implement',/build scoped code changes|ready to implement|build or code a planned feature|initial architecture exploration|explicitly say "implement"/i],
 ['studio-plan','goal',/\/goal|goal prompt|unattended execution|overnight autonomous|autonomous goal contract|agentic mission/i],
 ['studio-plan','map',/decision tickets|multi-session|map out this massive|small, well-scoped features/i],
 ['studio-plan','questions',/questionnaire|stakeholder|what should i ask them|answer the questions themselves/i],
 ['studio-plan','tickets',/tracer-bullet|break this into tickets|tracker issues|initial requirements gathering/i],
 ['studio-plan','spec',/technical spec|write a spec|fuzzy and ungrilled/i],
 ['studio-plan','interview',/grill|interview the user|poke holes|domain modeling with doc generation|documentation trail is needed|immediate implementation/i],
 ['studio-plan','discover',/explores user intent|starting a new feature|whose requirements or design|trivial single-file changes/i],
 ['studio-plan','plan',/implementation plans?\b|needs planning/i],
 ['studio-review','verify',/about to claim|verification commands|success claims|bounded static-page capture|audits finished work|completion claim|double-check that|unsupported claims/i],
 ['studio-review','receive',/review feedback|pushes back|feedback is unclear|receiving code review/i],
 ['studio-review','request',/dispatch(es)? a bounded reviewer|read-only review before merge|request(ing)? (a )?code review/i],
 ['studio-review','decide',/review decision|require human attention|minimal, targeted or deep/i],
 ['studio-review','code',/review changed code|reviewing a branch|code review|review this (diff|branch|pr|change)|authoring new code or diagnosing/i],
 ['studio-build','lifecycle',/from scratch|full lifecycle|general software coding|pre-existing skills/i],
 ['studio-build','autopilot',/agentic repo|autopilot|repo.{0,15}(to|into).{0,20}plugin/i],
 ['studio-quality','risk',/risik|risk|malici|hemmelig|secret|sikkerhedsscan/i],
 ['studio-build','import',/\bgpt\b|gpts/i],
 ['studio-build','import',/(import|konvert|adapt).{0,25}(mappe|folder|skill|plugin)/i],
 ['studio-build','catalog',/find.{0,25}(skill|plugin)|discover|katalog|catalog|radar/i],
 ['studio-build','portfolio',/portfolio|worklist|directory of plugins/i],
 ['studio-build','install',/\binstall\b|inventory, preview/i],
 ['studio-build','update',/update an owned|git-managed plugin/i],
 ['studio-build','create-skill',/create or update a codex skill|scoped instructions/i],
 ['studio-build','create-plugin',/plugin candidate built|new local or marketplace plugin/i],
 ['studio-quality','doctor',/doctor|skillquiver|double-fire|conflicting skills|duplicate, shadow/i],
 ['studio-quality','improve',/improv|forbedr|rewrite brief|auto-?research|keep\/discard|pass count|research agents/i],
 ['studio-quality','metric-pack',/metric.?pack|verifiers and metrics|own evaluation criteria|rubric/i],
 ['studio-quality','walkthrough',/walkthrough|explaining what a skill does|forklar.{0,25}skill/i],
 ['studio-quality','review',/behavior-focused|technical review|review this skill/i],
 ['studio-quality','evidence',/evidensmatrix|evidence matrix|supplied evidence|freshwithin|kompetencebevis/i],
 ['studio-quality','eval',/skill.{0,35}(eval|vurder|test|analy[sz])|(?:eval|vurder|test|analy[sz]).{0,35}skill|plugin.{0,35}(eval|vurder|analy[sz])|(?:eval|vurder|analy[sz]).{0,35}plugin|evaluat|audit th|why did this .{0,10}score|fix first|token usage|assessing a plugin|benchmark/i],
 ['studio-build','release',/publicer|publish|release|submission|indsend|pakning|\bzip\b/i],
 ['local-management',null,/permission|tilladelse|installed|installeret|afhængighed|dependenc/i],
 ['modern-web',null,/html|css|\bdom\b|accessibility|tilgængelig|web\s*ui/i],
 ['studio-plan','plan',/\bplan\b|planlæg|specifikation/i],
 ['studio-debug','diagnose',/fejlsøg|debug|diagnos|failing|fejler/i],
 ['test-driven-development',null,/\btdd\b|test.driven|testdrevet/i],
 ['studio-build','create-skill',/(opret|create|byg|build|lav).{0,25}skill/i],
 ['studio-build','create-plugin',/(opret|create|byg|build|lav).{0,25}plugin/i],
 ['studio-build','update',/(opdat|update|extend|udvid).{0,25}plugin/i],
 ['automate-ui',null,/desktop|skærmfangst|museklik|screenshot|mouse.click/i],
];
export async function route(request,root=packageRoot) {
  if (typeof request!=='string'||!request.trim()) throw new Error('A nonempty request is required');
  const registry=await loadRegistry(root);
  const exact=registry.capabilities.find(x=>x.id===request.trim());
  const rule=exact?null:rules.find(([,,pattern])=>pattern.test(request));
  const selected=exact?.id ?? rule?.[0] ?? 'studio-build';
  const mode=rule?.[1]??null;
  const capability=registry.capabilities.find(x=>x.id===selected);
  if (!capability) throw new Error('Router target missing: '+selected);
  return {schemaVersion:1,request,selected:capability.id,entrypoint:capability.entrypoint,
          mode,reason:exact?'Exact local capability name':'Local intent routing',externalDependencies:[]};
}

export async function selfCheck(root=packageRoot) {
  const registry=await loadRegistry(root);
  const portable=JSON.parse(await fs.readFile(path.join(root,'plugin.json'),'utf8'));
  const compat=JSON.parse(await fs.readFile(path.join(root,'.codex-plugin/plugin.json'),'utf8'));
  const errors=[];
  const pkg=JSON.parse(await fs.readFile(path.join(root,'package.json'),'utf8'));
  if(pkg.version!==portable.version||registry.package!==portable.name||registry.version!==portable.version)errors.push('Package/integration registry version mismatch');
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
    const content=(await fs.readFile(path.join(root,c.entrypoint),'utf8')).replaceAll('\r\n','\n');
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
