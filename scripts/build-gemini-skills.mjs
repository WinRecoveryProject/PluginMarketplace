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

import {readFileSync, readdirSync, statSync, existsSync, mkdirSync, writeFileSync, rmSync, realpathSync, lstatSync} from 'node:fs';
import {dirname, join, relative, extname, basename, resolve, isAbsolute} from 'node:path';
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

// Where `codex plugin add <name>@winrecoveryproject-digital` installs from. A
// git-subdir entry installs upstream, so plugins/<name> is only a local snapshot.
export function describeSource(source, name) {
  if (!source || source === `./plugins/${name}`) return {kind: 'local', label: `plugins/${name}`};
  if (typeof source === 'string') return {kind: 'local', label: source.replace(/^\.\//, '')};
  if (source.source === 'git-subdir') return {kind: 'upstream', label: `${source.url.replace(/\.git$/, '')} (${source.path})`};
  return {kind: 'upstream', label: JSON.stringify(source)};
}

function versionNote(p) {
  if (p.installSource?.kind !== 'upstream') return p.version ? `\`${p.version}\`` : '—';
  const installed = p.installedVersion ? `\`${p.installedVersion}\` from upstream` : 'upstream';
  return `${installed}; this export: snapshot \`${p.version || '?'}\``;
}

export function collectPackages(base = root) {
  const pluginsDir = join(base, 'plugins');
  const registry = readJson(join(base, '.agents', 'plugins', 'marketplace.json'));
  const registered = new Map((registry?.plugins ?? []).map(e => [e.name, e]));
  const readme = existsSync(join(base, 'README.md')) ? readText(join(base, 'README.md')) : '';
  const documented = new Map([...readme.matchAll(/^\|[^|]+\|\s*`([^`]+)`\s*\|\s*`codex plugin add ([a-z0-9-]+)@/gm)].map(m => [m[2], m[1]]));
  const packages = [];
  for (const name of readdirSync(pluginsDir).sort()) {
    const dir = join(pluginsDir, name);
    if (!statSync(dir).isDirectory()) continue;
    const manifest = readJson(join(dir, '.codex-plugin', 'plugin.json')) ?? readJson(join(dir, 'plugin.json')) ?? {};
    const files = walk(dir);
    // Only <skills root>/<name>/SKILL.md are skills; nested SKILL.md files (e.g. test
    // fixtures) stay supporting data of the skill or plugin that contains them.
    const skillsRoot = resolve(dir, typeof manifest.skills === 'string' ? manifest.skills : './skills');
    const skillFiles = files.filter(f => basename(f) === 'SKILL.md' && resolve(dirname(dirname(f))) === skillsRoot);
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
        file: skillFile,
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
      installSource: describeSource(registered.get(name)?.source, name),
      installedVersion: documented.get(name) || '',
      dir,
      rel: toPosix(relative(base, dir)),
      skills,
      rootFiles: files.filter(f => !skillFiles.some(sf => f.startsWith(dirname(sf) + '/') || f.startsWith(dirname(sf) + '\\') || f === sf)),
    });
  }
  return packages;
}

// ---------- links ----------

// GitHub-style heading anchor.
export function slug(heading) {
  return heading.toLowerCase().replace(/[^\p{L}\p{N} _-]/gu, '').trim().replace(/ /g, '-');
}

// Anchors are placeholders until the reference file is rendered, because GitHub
// suffixes duplicate slugs (-1, -2, …) by position: `.mcp.json` and `mcp.json`
// both slug to `file-mcpjson`. resolveAnchors() replaces them with the real slug.
const fileAnchor = rel => `#@@FILE:${rel}@@`;

function anchorFor(file, rel) {
  return fileAnchor(rel);
}

// GitHub-style heading anchors for one Markdown file, outside fenced code, with
// -1/-2 suffixes for repeated slugs. Returns heading text → first anchor per text.
export function headingAnchors(markdown) {
  const counts = new Map();
  const byText = new Map();
  let inFence = null;
  for (const line of markdown.split('\n')) {
    const f = /^\s*(`{3,}|~{3,})/.exec(line);
    if (f) {
      if (!inFence) inFence = f[1];
      else if (f[1][0] === inFence[0] && f[1].length >= inFence.length) inFence = null;
      continue;
    }
    if (inFence) continue;
    const h = /^#{1,6} (.*)$/.exec(line);
    if (!h) continue;
    const base = slug(h[1]);
    const n = counts.get(base) ?? 0;
    counts.set(base, n + 1);
    if (!byText.has(h[1])) byText.set(h[1], n ? `${base}-${n}` : base);
  }
  return byText;
}

// Replace `<ref>#@@FILE:<rel>@@` placeholders in one plugin's outputs with the
// anchor the file heading really gets in <ref>.
function resolveAnchors(outputs) {
  const anchors = new Map();
  for (const [name, content] of outputs) anchors.set(name.split('/').pop(), headingAnchors(content));
  const out = new Map();
  for (const [name, content] of outputs) {
    out.set(name, content.replace(/([A-Za-z0-9_.-]+\.md)#@@FILE:(.+?)@@/g, (all, ref, rel) => {
      const a = anchors.get(ref)?.get(`File: \`${rel}\``);
      return a ? `${ref}#${a}` : ref;
    }));
  }
  return out;
}

// Rewrites relative Markdown links (outside fenced code) that point at files the
// export embeds, so they resolve inside the uploaded Gemini folder. Links to
// anything else are left unchanged; embedded file headings keep the original paths.
export function rewriteLinks(markdown, sourceFile, linkMap) {
  if (!linkMap) return markdown;
  let inFence = null;
  return markdown.split('\n').map(line => {
    const m = /^\s*(`{3,}|~{3,})/.exec(line);
    if (m) {
      if (!inFence) inFence = m[1];
      else if (m[1].startsWith(inFence[0]) && m[1].length >= inFence.length) inFence = null;
      return line;
    }
    if (inFence) return line;
    return line.replace(/(\]\()(<?)([^)\s>]+)(>?)((?:\s+"[^"]*")?\))/g, (all, open, lt, target, gt, close) => {
      if (/^[a-z][a-z0-9+.-]*:/i.test(target) || target.startsWith('#') || target.startsWith('/')) return all;
      const hash = target.indexOf('#');
      const path = hash >= 0 ? target.slice(0, hash) : target;
      const fragment = hash >= 0 ? target.slice(hash) : '';
      let decoded;
      try { decoded = decodeURI(path); } catch { decoded = path; }
      const hit = linkMap.get(resolve(dirname(sourceFile), decoded));
      if (!hit) return all;
      const anchor = fragment && hit.markdown ? fragment : hit.anchor;
      return `${open}${lt}${hit.ref}${anchor}${gt}${close}`;
    });
  }).join('\n');
}

// ---------- rendering ----------

// Shift Markdown headings down by `levels`, leaving fenced code (templates,
// examples) byte-for-byte unchanged.
export function demoteHeadings(markdown, levels) {
  let inFence = null;
  return markdown.split('\n').map(line => {
    const m = /^\s*(`{3,}|~{3,})/.exec(line);
    if (m) {
      if (!inFence) inFence = m[1];
      else if (m[1][0] === inFence[0] && m[1].length >= inFence.length) inFence = null;
      return line;
    }
    if (inFence) return line;
    return line.replace(/^(#{1,5}) /, (_, hs) => '#'.repeat(Math.min(6, hs.length + levels)) + ' ');
  }).join('\n');
}

function embedFile(file, relBase) {
  const abs = resolve(file);
  const rel = toPosix(relative(relBase, file));
  const ext = extname(file).toLowerCase();
  if (BINARY_EXT.has(ext)) return {kind: 'binary', rel};
  const buf = readFileSync(file);
  if (looksBinary(buf)) return {kind: 'binary', rel};
  if (buf.length > MAX_EMBED_BYTES) return {kind: 'large', rel, size: buf.length};
  const text = buf.toString('utf8').replace(/^\uFEFF/, '').replaceAll('\r\n', '\n');
  if (ext === '.md') return {kind: 'markdown', rel, text, abs};
  return {kind: 'code', rel, text, lang: CODE_LANG[ext] ?? (basename(file).includes('.') ? 'text' : 'text')};
}

function renderEmbeds(embeds, headingLevel, linkMap) {
  const h = '#'.repeat(headingLevel);
  const parts = [];
  const skipped = [];
  for (const e of embeds) {
    if (e.kind === 'binary') { parts.push(`${h} File: \`${e.rel}\`\n\n_Binary asset, not embedded._\n`); continue; }
    if (e.kind === 'large') { parts.push(`${h} File: \`${e.rel}\`\n\n_${Math.round(e.size / 1024)} KB, too large to embed. Read it in the repository._\n`); continue; }
    if (e.kind === 'markdown') {
      // Demote headings so they nest under the file heading.
      const demoted = demoteHeadings(rewriteLinks(e.text, e.abs, linkMap), headingLevel);
      parts.push(`${h} File: \`${e.rel}\`\n\n${demoted.trim()}\n`);
    } else {
      const f = fence(e.text);
      parts.push(`${h} File: \`${e.rel}\`\n\n${f}${e.lang}\n${e.text.trimEnd()}\n${f}\n`);
    }
  }
  if (skipped.length) parts.push(`${h} Not embedded\n\n${skipped.join('\n')}\n`);
  return parts.join('\n');
}

function renderSkillReference(pkg, skill, linkMap) {
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
    demoteHeadings(rewriteLinks(skill.body.trim(), skill.file, linkMap), 2),
    '',
    embeds.length ? '## Bundled files\n\n' + renderEmbeds(embeds, 3, linkMap) : '',
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
      `${pkg.version ? `, version \`${pkg.version}\`` : ''}. Source: \`${pkg.rel}\`.` +
      (pkg.installSource?.kind === 'upstream'
        ? `\n\n> Installing this plugin from the Marketplace gets the upstream package ${pkg.installedVersion ? `\`${pkg.installedVersion}\` ` : ''}from ${pkg.installSource.label}, not this local snapshot. Mention that difference when version-specific behaviour matters.`
        : ''),
    '',
    pkg.longDescription ? pkg.longDescription + '\n' : '',
    '## How to use this skill',
    '',
    '1. Pick the sub-skill below whose description matches the request.',
    '2. Read its reference file completely before acting; it holds the original instructions plus every bundled script, template and reference as embedded text.',
    '3. Scripts are shown for reading, adapting and explaining. Gemini cannot run them here; give the user the exact command to run locally (PowerShell/Node/Python as written in the file) and ask for the output when it matters.',
    '4. Treat the original instructions as authoritative. Where they mention Codex- or Claude-only tools, use the closest Gemini capability or tell the user what to run.',
    '5. When you propose a change to this plugin, name the original repository path (shown in each reference) so it can be applied in PluginMarketplace.',
    '6. Instructions sometimes name another file by its original path (for example `../../shared/x.md` or `references/y.md`). Those paths do not exist in this upload: resolve them against the `Source:`/`File:` path of the text you are reading and look them up in `references/_index.md`, which says which reference file and section holds the content.',
    '',
    pkg.skills.length ? '## Sub-skills\n\n| Skill | When to use | Reference |\n| --- | --- | --- |\n' + rows.join('\n') + '\n' : '## Sub-skills\n\nThis plugin ships no skills; see `references/_plugin.md`.\n',
    pkg.defaultPrompts.length ? '## Example prompts\n\n' + pkg.defaultPrompts.map(p => `- ${p}`).join('\n') + '\n' : '',
    '## Plugin-level files\n\nManifests, hooks, top-level scripts, tests and docs (outside `skills/`):\n\n' + pluginRefs.map(r => `- \`${r}\``).join('\n'),
  ].join('\n').replace(/\n{3,}/g, '\n\n').trimEnd() + '\n';
}

export const MAX_REFERENCE_BYTES = 256 * 1024;   // split plugin-level references above this size

// Plugin-level files are grouped by their top-level folder (scripts, assets,
// tests, ...) and split into parts so no single reference is too large to read.
// Planning uses the unrewritten sizes so link targets are known before rendering.
function planPluginLevel(pkg) {
  const groups = new Map();
  for (const f of pkg.rootFiles) {
    const segs = toPosix(relative(pkg.dir, f)).split('/');
    const key = segs.length > 1 ? kebab(segs[0]) || 'misc' : '';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(f);
  }
  if (!groups.has('')) groups.set('', []);
  const plan = [];
  for (const key of [...groups.keys()].sort()) {
    const base = key ? `_plugin-${key}` : '_plugin';
    const title = key ? `${pkg.name} — \`${toPosix(relative(pkg.dir, groups.get(key)[0])).split('/')[0]}/\`` : `${pkg.name} — manifests and top-level files`;
    const chunks = [];
    let current = [];
    let size = 0;
    for (const f of groups.get(key)) {
      const bytes = Buffer.byteLength(renderEmbeds([embedFile(f, pkg.dir)], 2));
      if (current.length && size + bytes > MAX_REFERENCE_BYTES) { chunks.push(current); current = []; size = 0; }
      current.push(f);
      size += bytes;
    }
    if (current.length || !chunks.length) chunks.push(current);
    chunks.forEach((files, i) => {
      const name = chunks.length > 1 ? `${base}-part${String(i + 1).padStart(2, "0")}` : base;
      plan.push({name, title: `${title}${chunks.length > 1 ? ` (part ${i + 1} of ${chunks.length})` : ''}`, files});
    });
  }
  return plan;
}

function renderPluginLevel(pkg, plan, linkMap) {
  const out = new Map();
  for (const {name, title, files} of plan) {
    const pieces = files.map(f => renderEmbeds([embedFile(f, pkg.dir)], 2, linkMap));
    const header = [`# Plugin files: ${title}`, '',
      `Source: \`${pkg.rel}\`. Files outside the \`skills/*\` folders, embedded as text.`, ''];
    out.set(`references/${name}.md`, (header.join('\n') + '\n' + (pieces.join('\n') || '_No files._')).replace(/\n{3,}/g, '\n\n').trimEnd() + '\n');
  }
  return out;
}

// Source-path lookup: instructions often name files as bare paths or inline code
// (`../../shared/x.md`) that no longer exist in the upload. This table maps every
// plugin-relative source path to the exported reference and section that holds it.
function renderPathIndex(pkg, linkMap) {
  const rows = [];
  for (const [abs, hit] of linkMap) {
    const rel = toPosix(relative(pkg.dir, abs));
    if (!rel || rel.startsWith('..')) continue;
    rows.push([rel, `${hit.ref}${hit.anchor}`]);
  }
  rows.sort((a, b) => a[0].localeCompare(b[0]));
  return [
    `# Source path index: ${pkg.name}`,
    '',
    `Every file and skill folder of \`${pkg.rel}\` and where its content lives in this upload. When an instruction tells you to read a path such as \`../../shared/x.md\` or \`references/y.md\`, resolve it against the \`Source:\` or \`File:\` path of the text you are reading, then look the result up here (paths are relative to the plugin root).`,
    '',
    '| Source path | Read in this upload |',
    '| --- | --- |',
    ...rows.map(([rel, target]) => `| \`${rel}\` | \`references/${target}\` |`),
  ].join('\n') + '\n';
}

// Maps every embedded source file (absolute path) to its exported reference and anchor.
function buildLinkMap(pkg, plan) {
  const map = new Map();
  for (const s of pkg.skills) {
    const ref = `${s.id}.md`;
    map.set(resolve(s.dir), {ref, anchor: '', markdown: true});
    map.set(resolve(s.file), {ref, anchor: '', markdown: true});
    for (const f of s.files) {
      const rel = toPosix(relative(s.dir, f));
      map.set(resolve(f), {ref, anchor: anchorFor(f, rel), markdown: false});
    }
  }
  for (const {name, files} of plan) {
    for (const f of files) {
      map.set(resolve(f), {ref: `${name}.md`, anchor: anchorFor(f, toPosix(relative(pkg.dir, f))), markdown: false});
    }
  }
  return map;
}

function renderHub(packages) {
  const skillCount = packages.reduce((n, p) => n + p.skills.length, 0);
  const rows = packages.map(p => `| \`${p.name}\` | ${versionNote(p)} | ${p.skills.length} | ${p.description.replaceAll('|', '\\|') || '—'} |`);
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
    parts.push(`- Version: ${versionNote(p)}`);
    parts.push(`- Installs from: ${p.installSource?.kind === 'upstream' ? p.installSource.label : `\`${p.rel}\` (this repository)`}`);
    parts.push(`- Exported from: \`${p.rel}\``);
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
  const lines = ['plugin,plugin_version,installed_version,installs_from,skill,description,source_path,gemini_reference'];
  for (const p of packages) {
    for (const s of p.skills) {
      lines.push([p.name, p.version, p.installedVersion || p.version, p.installSource?.kind === 'upstream' ? p.installSource.label : 'local', s.name, s.description, s.rel + '/SKILL.md', `gemini/skills/${p.name}/references/${s.id}.md`].map(csvCell).join(','));
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
    const plan = planPluginLevel(p);
    const linkMap = buildLinkMap(p, plan);
    const pluginLevel = renderPluginLevel(p, plan, linkMap);
    pluginLevel.set('references/_index.md', renderPathIndex(p, linkMap));
    const own = new Map();
    own.set('SKILL.md', renderPluginSkill(p, [...pluginLevel.keys()]));
    for (const [rel, content] of pluginLevel) own.set(rel, content);
    for (const s of p.skills) own.set(`references/${s.id}.md`, renderSkillReference(p, s, linkMap));
    for (const [rel, content] of resolveAnchors(own)) files.set(`${p.name}/${rel}`, content);
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
  const problem = unsafeOutputDir(outDir, root);
  if (problem) {
    console.error(`Refusing to write to ${outDir}: ${problem}`);
    process.exit(2);
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

// The output folder is deleted and rewritten, so it must be generated output:
// missing, empty, or only skill folders that each hold a SKILL.md. It may never be
// the repository, one of its parents, or a folder inside it outside gemini/.
// Physical path: realpath of the deepest existing ancestor plus the components that
// do not exist yet, so a symlink or junction cannot hide that `dir` is in the repo.
export function physicalPath(p) {
  let current = resolve(p);
  const rest = [];
  while (!existsSync(current)) {
    const parent = dirname(current);
    if (parent === current) break;
    rest.unshift(basename(current));
    current = parent;
  }
  return join(realpathSync.native(current), ...rest);
}

export function unsafeOutputDir(dir, repoRoot) {
  const out = physicalPath(dir), base = physicalPath(repoRoot);
  const rel = relative(out, base);
  if (out === base || (rel && !rel.startsWith('..') && !isAbsolute(rel))) return 'it is the repository or contains it';
  const inside = relative(base, out);
  if (!inside.startsWith('..') && !isAbsolute(inside) && toPosix(inside).split('/')[0] !== 'gemini') {
    return 'inside the repository it must be under gemini/';
  }
  if (!existsSync(out)) return null;
  if (!statSync(out).isDirectory()) return 'it is a file';
  for (const name of readdirSync(out)) {
    const entry = join(out, name);
    if (lstatSync(entry).isSymbolicLink() || !statSync(entry).isDirectory() || !existsSync(join(entry, 'SKILL.md'))) {
      return `it contains ${name}, which is not a generated skill folder`;
    }
  }
  return null;
}

function folderCount(files) {
  return new Set([...files.keys()].map(k => k.split('/')[0])).size;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
