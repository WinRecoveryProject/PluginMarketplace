#!/usr/bin/env node
// Builds Gemini-ready skill folders from the Marketplace packages.
//
// Gemini's "Upload skill" dialog accepts a folder with a root SKILL.md and
// supporting .md/.txt/.csv/.py/.pdf files only. This script converts every
// package under plugins/ into such a folder, embedding scripts, JSON, YAML and
// other text sources as fenced code blocks inside Markdown so nothing is lost.
//
//   node scripts/build-gemini-skills.mjs            write gemini/skills/
//   node scripts/build-gemini-skills.mjs --check    fail if gemini/skills/ is stale
//   node scripts/build-gemini-skills.mjs --out DIR  write to another folder

import {readFileSync, readdirSync, statSync, existsSync, mkdirSync, writeFileSync, rmSync} from 'node:fs';
import {dirname, join, relative, extname, basename, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const checkMode = args.includes('--check');
const outIndex = args.indexOf('--out');
const outDir = outIndex >= 0 ? resolve(args[outIndex + 1]) : join(root, 'gemini', 'skills');

export const HUB_NAME = 'plugin-marketplace';
export const MAX_EMBED_BYTES = 64 * 1024;          // larger text sources are listed, not embedded
export const MAX_DESCRIPTION = 1024;
export const ALLOWED_UPLOAD_EXT = new Set(['.md', '.txt', '.csv', '.py', '.pdf']);

const CODE_LANG = {
  '.mjs': 'javascript', '.cjs': 'javascript', '.js': 'javascript', '.ts': 'typescript',
  '.py': 'python', '.sh': 'bash', '.ps1': 'powershell', '.psm1': 'powershell', '.psd1': 'powershell',
  '.cmd': 'bat', '.bat': 'bat', '.json': 'json', '.yaml': 'yaml', '.yml': 'yaml', '.toml': 'toml',
  '.pl': 'perl', '.html': 'html', '.htm': 'html', '.xml': 'xml', '.tmpl': 'text', '.txt': 'text',
  '.cfg': 'ini', '.ini': 'ini', '.inf': 'ini', '.csv': 'csv',
};
const BINARY_EXT = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.ico', '.zip', '.exe', '.dll', '.sys', '.cat', '.pdf', '.vsix']);

// ---------- helpers ----------

const toPosix = p => p.split('\\').join('/');
const readText = file => readFileSync(file, 'utf8').replace(/^\uFEFF/, '').replaceAll('\r\n', '\n');

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir).sort()) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

export function parseFrontmatter(text) {
  const m = /^---\n([\s\S]*?)\n---\n?/.exec(text);
  if (!m) return {meta: {}, body: text};
  const meta = {};
  const lines = m[1].split('\n');
  for (let i = 0; i < lines.length; i++) {
    const kv = /^([A-Za-z0-9_-]+):\s*(.*)$/.exec(lines[i]);
    if (!kv) continue;
    let value = kv[2].trim();
    if (value === '>' || value === '|' || value === '>-' || value === '|-') {
      const block = [];
      while (i + 1 < lines.length && /^\s+/.test(lines[i + 1])) block.push(lines[++i].trim());
      value = block.join(' ');
    }
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1).replaceAll('\\"', '"');
    }
    meta[kv[1]] = value;
  }
  return {meta, body: text.slice(m[0].length)};
}

export function kebab(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 64);
}

function clip(text, max = MAX_DESCRIPTION) {
  const flat = String(text ?? '').replace(/\s+/g, ' ').trim();
  return flat.length <= max ? flat : flat.slice(0, max - 1).trimEnd() + '…';
}

function yamlString(value) {
  return JSON.stringify(value); // JSON strings are valid YAML double-quoted scalars
}

function fence(content) {
  let ticks = '```';
  while (content.includes(ticks)) ticks += '`';
  return ticks;
}

function looksBinary(buf) {
  const n = Math.min(buf.length, 4096);
  for (let i = 0; i < n; i++) if (buf[i] === 0) return true;
  return false;
}

function csvCell(value) {
  const s = String(value ?? '');
  return /[",\n]/.test(s) ? '"' + s.replaceAll('"', '""') + '"' : s;
}

function readJson(file) {
  try { return JSON.parse(readText(file)); } catch { return null; }
}

// ---------- model ----------

export function collectPackages(base = root) {
  const pluginsDir = join(base, 'plugins');
  const registry = readJson(join(base, '.agents', 'plugins', 'marketplace.json'));
  const registered = new Map((registry?.plugins ?? []).map(e => [e.name, e]));
  const packages = [];
  for (const name of readdirSync(pluginsDir).sort()) {
    const dir = join(pluginsDir, name);
    if (!statSync(dir).isDirectory()) continue;
    const manifest = readJson(join(dir, '.codex-plugin', 'plugin.json')) ?? readJson(join(dir, 'plugin.json')) ?? {};
    const files = walk(dir);
    const skillFiles = files.filter(f => basename(f) === 'SKILL.md' && toPosix(relative(dir, f)).split('/').includes('skills'));
    const skills = skillFiles.map(skillFile => {
      const skillDir = dirname(skillFile);
      const {meta, body} = parseFrontmatter(readText(skillFile));
      const id = kebab(meta.name || basename(skillDir));
      return {
        id,
        name: meta.name || basename(skillDir),
        description: clip(meta.description || ''),
        dir: skillDir,
        rel: toPosix(relative(base, skillDir)),
        body,
        files: walk(skillDir).filter(f => f !== skillFile),
      };
    });
    // Disambiguate skills that share a name inside one package.
    const seen = new Map();
    for (const s of skills) {
      const n = (seen.get(s.id) ?? 0) + 1;
      seen.set(s.id, n);
      if (n > 1) s.id = `${s.id}-${n}`;
    }
    const iface = manifest.interface ?? {};
    packages.push({
      name,
      displayName: iface.displayName || manifest.name || name,
      version: manifest.version || registered.get(name)?.version || '',
      description: clip(manifest.description || iface.shortDescription || registered.get(name)?.description || ''),
      longDescription: clip(iface.longDescription || '', 2000),
      defaultPrompts: Array.isArray(iface.defaultPrompt) ? iface.defaultPrompt : [],
      registered: registered.has(name),
      dir,
      rel: toPosix(relative(base, dir)),
      skills,
      rootFiles: files.filter(f => !skillFiles.some(sf => f.startsWith(dirname(sf) + '/') || f.startsWith(dirname(sf) + '\\') || f === sf)),
    });
  }
  return packages;
}

// ---------- rendering ----------

function embedFile(file, relBase) {
  const rel = toPosix(relative(relBase, file));
  const ext = extname(file).toLowerCase();
  if (BINARY_EXT.has(ext)) return {kind: 'binary', rel};
  const buf = readFileSync(file);
  if (looksBinary(buf)) return {kind: 'binary', rel};
  if (buf.length > MAX_EMBED_BYTES) return {kind: 'large', rel, size: buf.length};
  const text = buf.toString('utf8').replace(/^\uFEFF/, '').replaceAll('\r\n', '\n');
  if (ext === '.md') return {kind: 'markdown', rel, text};
  return {kind: 'code', rel, text, lang: CODE_LANG[ext] ?? (basename(file).includes('.') ? 'text' : 'text')};
}

function renderEmbeds(embeds, headingLevel) {
  const h = '#'.repeat(headingLevel);
  const parts = [];
  const skipped = [];
  for (const e of embeds) {
    if (e.kind === 'binary') { skipped.push(`- \`${e.rel}\` (binary asset, not embedded)`); continue; }
    if (e.kind === 'large') { skipped.push(`- \`${e.rel}\` (${Math.round(e.size / 1024)} KB, too large to embed — read it in the repository)`); continue; }
    if (e.kind === 'markdown') {
      // Demote headings so they nest under the file heading.
      const demoted = e.text.replace(/^(#{1,5}) /gm, (_, hs) => '#'.repeat(Math.min(6, hs.length + headingLevel)) + ' ');
      parts.push(`${h} File: \`${e.rel}\`\n\n${demoted.trim()}\n`);
    } else {
      const f = fence(e.text);
      parts.push(`${h} File: \`${e.rel}\`\n\n${f}${e.lang}\n${e.text.trimEnd()}\n${f}\n`);
    }
  }
  if (skipped.length) parts.push(`${h} Not embedded\n\n${skipped.join('\n')}\n`);
  return parts.join('\n');
}

function renderSkillReference(pkg, skill) {
  const embeds = skill.files.map(f => embedFile(f, skill.dir));
  return [
    `# Skill: ${skill.name}`,
    '',
    `- Plugin: \`${pkg.name}\`${pkg.version ? ` (${pkg.version})` : ''}`,
    `- Source: \`${skill.rel}/SKILL.md\``,
    '',
    `> ${skill.description || '(no description)'}`,
    '',
    '## Instructions',
    '',
    skill.body.trim().replace(/^(#{1,5}) /gm, (_, hs) => '#'.repeat(Math.min(6, hs.length + 2)) + ' '),
    '',
    embeds.length ? '## Bundled files\n\n' + renderEmbeds(embeds, 3) : '',
  ].join('\n').replace(/\n{3,}/g, '\n\n').trimEnd() + '\n';
}

function renderPluginSkill(pkg, pluginRefs) {
  const description = clip(
    `${pkg.displayName}: ${pkg.description || 'WinRecoveryProject Marketplace plugin.'} ` +
    `Use when the user asks for ${pkg.skills.length ? pkg.skills.map(s => s.name).slice(0, 12).join(', ') : pkg.name} work, or names the ${pkg.name} plugin.`,
  );
  const rows = pkg.skills.map(s => `| \`${s.name}\` | ${s.description.replaceAll('|', '\\|') || '—'} | \`references/${s.id}.md\` |`);
  return [
    '---',
    `name: ${pkg.name}`,
    `description: ${yamlString(description)}`,
    '---',
    '',
    `# ${pkg.displayName}`,
    '',
    `Gemini export of the \`${pkg.name}\` plugin from WinRecoveryProject/PluginMarketplace` +
      `${pkg.version ? `, version \`${pkg.version}\`` : ''}. Source: \`${pkg.rel}\`.`,
    '',
    pkg.longDescription ? pkg.longDescription + '\n' : '',
    '## How to use this skill',
    '',
    '1. Pick the sub-skill below whose description matches the request.',
    '2. Read its reference file completely before acting; it holds the original instructions plus every bundled script, template and reference as embedded text.',
    '3. Scripts are shown for reading, adapting and explaining. Gemini cannot run them here; give the user the exact command to run locally (PowerShell/Node/Python as written in the file) and ask for the output when it matters.',
    '4. Treat the original instructions as authoritative. Where they mention Codex- or Claude-only tools, use the closest Gemini capability or tell the user what to run.',
    '5. When you propose a change to this plugin, name the original repository path (shown in each reference) so it can be applied in PluginMarketplace.',
    '',
    pkg.skills.length ? '## Sub-skills\n\n| Skill | When to use | Reference |\n| --- | --- | --- |\n' + rows.join('\n') + '\n' : '## Sub-skills\n\nThis plugin ships no skills; see `references/_plugin.md`.\n',
    pkg.defaultPrompts.length ? '## Example prompts\n\n' + pkg.defaultPrompts.map(p => `- ${p}`).join('\n') + '\n' : '',
    '## Plugin-level files\n\nManifests, hooks, top-level scripts, tests and docs (outside `skills/`):\n\n' + pluginRefs.map(r => `- \`${r}\``).join('\n'),
  ].join('\n').replace(/\n{3,}/g, '\n\n').trimEnd() + '\n';
}

export const MAX_REFERENCE_BYTES = 256 * 1024;   // split plugin-level references above this size

// Plugin-level files are grouped by their top-level folder (scripts, assets,
// tests, ...) and split into parts so no single reference is too large to read.
function renderPluginLevel(pkg) {
  const groups = new Map();
  for (const f of pkg.rootFiles) {
    const segs = toPosix(relative(pkg.dir, f)).split('/');
    const key = segs.length > 1 ? kebab(segs[0]) || 'misc' : '';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(f);
  }
  if (!groups.has('')) groups.set('', []);
  const out = new Map();
  for (const key of [...groups.keys()].sort()) {
    const base = key ? `_plugin-${key}` : '_plugin';
    const title = key ? `${pkg.name} — \`${toPosix(relative(pkg.dir, groups.get(key)[0])).split('/')[0]}/\`` : `${pkg.name} — manifests and top-level files`;
    const chunks = [];
    let current = [];
    let size = 0;
    for (const f of groups.get(key)) {
      const piece = renderEmbeds([embedFile(f, pkg.dir)], 2);
      const bytes = Buffer.byteLength(piece);
      if (current.length && size + bytes > MAX_REFERENCE_BYTES) { chunks.push(current); current = []; size = 0; }
      current.push(piece);
      size += bytes;
    }
    if (current.length || !chunks.length) chunks.push(current);
    chunks.forEach((pieces, i) => {
      const name = chunks.length > 1 ? `${base}-part${String(i + 1).padStart(2, "0")}` : base;
      const header = [`# Plugin files: ${title}${chunks.length > 1 ? ` (part ${i + 1} of ${chunks.length})` : ''}`, '',
        `Source: \`${pkg.rel}\`. Files outside the \`skills/*\` folders, embedded as text.`, ''];
      out.set(`references/${name}.md`, (header.join('\n') + '\n' + (pieces.join('\n') || '_No files._')).replace(/\n{3,}/g, '\n\n').trimEnd() + '\n');
    });
  }
  return out;
}

function renderHub(packages) {
  const skillCount = packages.reduce((n, p) => n + p.skills.length, 0);
  const rows = packages.map(p => `| \`${p.name}\` | ${p.version ? `\`${p.version}\`` : '—'} | ${p.skills.length} | ${p.description.replaceAll('|', '\\|') || '—'} |`);
  return [
    '---',
    `name: ${HUB_NAME}`,
    `description: ${yamlString(clip(
      `Entry point to WinRecoveryProject/PluginMarketplace (${packages.length} plugins, ${skillCount} skills): ` +
      packages.map(p => p.name).join(', ') +
      '. Use when the user asks what the Marketplace contains, which plugin or skill fits a task, how to install or change a plugin, or names any of these plugins.',
    ))}`,
    '---',
    '',
    '# WinRecoveryProject PluginMarketplace',
    '',
    `This skill indexes the ${packages.length} plugin packages and ${skillCount} skills in \`plugins/\` of WinRecoveryProject/PluginMarketplace. ` +
      'It is generated by `scripts/build-gemini-skills.mjs`; do not edit it by hand.',
    '',
    '## How to answer',
    '',
    '1. Find the plugin and skill in `references/catalog.md` (or filter `references/catalog.csv`).',
    `2. If the matching plugin skill (same name, e.g. \`codex-dev-workflows\`) is also uploaded to Gemini, use it for the full instructions and embedded scripts.`,
    '3. If it is not uploaded, answer from the catalog description and tell the user which Gemini skill folder to upload: `gemini/skills/<plugin>/` in the repository.',
    '4. To change a plugin, edit the original files in `plugins/<plugin>/...` in PluginMarketplace, then run `node scripts/build-gemini-skills.mjs` and `node validate-marketplace.mjs`, and re-upload the regenerated Gemini folder.',
    '5. Do not invent plugins, skills, versions or paths that are not in the catalog.',
    '',
    '## Install in Codex',
    '',
    '```powershell',
    'codex plugin marketplace add WinRecoveryProject/PluginMarketplace',
    'codex plugin add <plugin>@winrecoveryproject-digital',
    '```',
    '',
    '## Plugins',
    '',
    '| Plugin | Version | Skills | Purpose |',
    '| --- | --- | --- | --- |',
    ...rows,
  ].join('\n').trimEnd() + '\n';
}

function renderCatalog(packages) {
  const parts = ['# Catalog: every plugin and skill', ''];
  for (const p of packages) {
    parts.push(`## ${p.displayName} (\`${p.name}\`)`, '');
    parts.push(`- Version: ${p.version ? `\`${p.version}\`` : 'not stated'}`);
    parts.push(`- Source: \`${p.rel}\``);
    parts.push(`- Gemini skill folder: \`gemini/skills/${p.name}/\``);
    if (p.description) parts.push(`- Purpose: ${p.description}`);
    parts.push('');
    for (const s of p.skills) parts.push(`- **${s.name}** — ${s.description || '(no description)'}`);
    if (!p.skills.length) parts.push('- _(no skills)_');
    parts.push('');
  }
  return parts.join('\n').trimEnd() + '\n';
}

function renderCatalogCsv(packages) {
  const lines = ['plugin,plugin_version,skill,description,source_path,gemini_reference'];
  for (const p of packages) {
    for (const s of p.skills) {
      lines.push([p.name, p.version, s.name, s.description, s.rel + '/SKILL.md', `gemini/skills/${p.name}/references/${s.id}.md`].map(csvCell).join(','));
    }
  }
  return lines.join('\n') + '\n';
}

export function buildOutputs(packages) {
  const files = new Map();
  files.set(`${HUB_NAME}/SKILL.md`, renderHub(packages));
  files.set(`${HUB_NAME}/references/catalog.md`, renderCatalog(packages));
  files.set(`${HUB_NAME}/references/catalog.csv`, renderCatalogCsv(packages));
  for (const p of packages) {
    const pluginLevel = renderPluginLevel(p);
    files.set(`${p.name}/SKILL.md`, renderPluginSkill(p, [...pluginLevel.keys()]));
    for (const [rel, content] of pluginLevel) files.set(`${p.name}/${rel}`, content);
    for (const s of p.skills) files.set(`${p.name}/references/${s.id}.md`, renderSkillReference(p, s));
  }
  return files;
}

export function validateOutputs(files) {
  const problems = [];
  const folders = new Set([...files.keys()].map(k => k.split('/')[0]));
  for (const folder of folders) {
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(folder)) problems.push(`${folder}: folder is not kebab-case`);
    const skill = files.get(`${folder}/SKILL.md`);
    if (!skill) { problems.push(`${folder}: missing SKILL.md`); continue; }
    const {meta} = parseFrontmatter(skill);
    if (meta.name !== folder) problems.push(`${folder}: frontmatter name "${meta.name}" does not match folder`);
    if (!meta.description) problems.push(`${folder}: empty description`);
    if ((meta.description ?? '').length > MAX_DESCRIPTION) problems.push(`${folder}: description longer than ${MAX_DESCRIPTION}`);
  }
  for (const key of files.keys()) {
    if (!ALLOWED_UPLOAD_EXT.has(extname(key))) problems.push(`${key}: extension not accepted by Gemini upload`);
  }
  return problems;
}

// ---------- main ----------

function main() {
  const packages = collectPackages(root);
  const files = buildOutputs(packages);
  const problems = validateOutputs(files);
  if (problems.length) {
    console.error(problems.join('\n'));
    process.exit(1);
  }
  if (checkMode) {
    const stale = [];
    for (const [rel, content] of files) {
      const target = join(outDir, rel);
      if (!existsSync(target) || readText(target) !== content) stale.push(rel);
    }
    if (existsSync(outDir)) {
      for (const f of walk(outDir)) {
        const rel = toPosix(relative(outDir, f));
        if (!files.has(rel)) stale.push(`${rel} (no longer generated)`);
      }
    }
    if (stale.length) {
      console.error(`Gemini skills are stale (${stale.length} files). Run: node scripts/build-gemini-skills.mjs`);
      console.error(stale.slice(0, 20).join('\n'));
      process.exit(1);
    }
    console.log(`Gemini skills up to date: ${files.size} files in ${folderCount(files)} skill folders.`);
    return;
  }
  rmSync(outDir, {recursive: true, force: true});
  for (const [rel, content] of files) {
    const target = join(outDir, rel);
    mkdirSync(dirname(target), {recursive: true});
    writeFileSync(target, content);
  }
  const sizes = new Map();
  for (const [rel, content] of files) {
    const folder = rel.split('/')[0];
    sizes.set(folder, (sizes.get(folder) ?? 0) + Buffer.byteLength(content));
  }
  console.log(`Wrote ${files.size} files in ${sizes.size} Gemini skill folders to ${toPosix(relative(root, outDir)) || outDir}`);
  for (const [folder, size] of [...sizes].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${folder.padEnd(32)} ${(size / 1024).toFixed(0).padStart(6)} KB`);
  }
}

function folderCount(files) {
  return new Set([...files.keys()].map(k => k.split('/')[0])).size;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
