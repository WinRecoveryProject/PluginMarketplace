import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import https from 'node:https';
import dns from 'node:dns/promises';
import net from 'node:net';
import { readBounded, walkFiles, inside } from './files.mjs';

function timestamp(value) {
  const result = value ?? new Date().toISOString();
  const parsed = Date.parse(result);
  if (!Number.isFinite(parsed)) throw new Error('asOf must be an ISO observation date/time');
  return new Date(parsed).toISOString();
}
function uiOf(manifest) { return manifest.extensions?.['com.openai']?.interface ?? manifest.interface ?? {}; }
function listingOf(manifest) {
  const ui = uiOf(manifest);
  const fields = ['displayName', 'shortDescription', 'longDescription', 'developerName', 'websiteURL', 'privacyPolicyURL', 'termsOfServiceURL', 'logo', 'composerIcon'];
  return { inspected: fields, present: fields.filter(key => typeof ui[key] === 'string' && ui[key].trim()),
    missing: fields.filter(key => !(typeof ui[key] === 'string' && ui[key].trim())), verifiedPublisher: 'UNKNOWN',
    note: 'Presence is not proof of public URL reachability, directory approval or verified publisher identity.' };
}
function classify(root) {
  const parts = root.toLowerCase().split(/[\\/]/);
  if (parts.includes('cache')) return 'cache';
  if (parts.includes('candidates')) return 'candidate';
  if (parts.includes('archive') || parts.includes('cache-archive')) return 'archive';
  return 'unknown';
}
export async function inventory(target, options = {}) {
  const scan = await walkFiles(target, options), records = [], seen = new Set();
  // A manifest is data. No scripts, app routes or package manager hooks are loaded.
  const candidates = scan.files.filter(f => path.basename(f.absolute) === 'plugin.json' && (path.basename(path.dirname(f.absolute)) === '.codex-plugin' || path.dirname(f.absolute) === scan.root || !f.relative.includes('/skills/')));
  candidates.sort((a, b) => a.absolute.includes(`${path.sep}.codex-plugin${path.sep}`) - b.absolute.includes(`${path.sep}.codex-plugin${path.sep}`));
  for (const file of candidates) {
    const root = path.basename(path.dirname(file.absolute)) === '.codex-plugin' ? path.dirname(path.dirname(file.absolute)) : path.dirname(file.absolute);
    if (seen.has(root)) continue;
    try {
      const manifest = JSON.parse(await readBounded(file.absolute, options.maxFileBytes ?? 2 * 1024 * 1024));
      if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest) || typeof manifest.name !== 'string') throw new Error('Manifest needs a package name');
      seen.add(root);
      const ui = uiOf(manifest);
      const compatiblePath = path.join(root, '.codex-plugin', 'plugin.json');
      const compat = scan.files.find(f => f.absolute === compatiblePath);
      let compatibilitySynchronized = null;
      if (compat && compat.absolute !== file.absolute) {
        const other = JSON.parse(await readBounded(compat.absolute));
        compatibilitySynchronized = manifest.name === other.name && manifest.version === other.version && JSON.stringify(ui) === JSON.stringify(uiOf(other));
      }
      const ext = manifest.extensions?.['com.openai'] ?? {};
      const relevant = scan.files.filter(f => inside(root, f.absolute));
      records.push({ name: manifest.name, version: manifest.version ?? null, displayName: ui.displayName ?? manifest.name,
        description: manifest.description ?? ui.longDescription ?? '', keywords: Array.isArray(manifest.keywords) ? manifest.keywords : [],
        root, manifestPath: file.absolute, classification: classify(root), installed: 'UNKNOWN', source: { kind: 'local-manifest', path: file.absolute },
        skills: relevant.filter(f => path.basename(f.absolute) === 'SKILL.md' && path.dirname(path.dirname(f.absolute)) === path.join(root, 'skills')).map(f => path.basename(path.dirname(f.absolute))).sort(),
        declaredPermissions: { skills: Boolean(manifest.skills), apps: Boolean(manifest.apps ?? ext.apps), mcp: Boolean(manifest.mcpServers ?? ext.mcpServers),
          hooks: Boolean(manifest.hooks ?? ext.hooks), capabilities: Array.isArray(ui.capabilities) ? ui.capabilities : [] },
        observed: { manifestPresent: true, compatibilityManifestPresent: Boolean(compat), compatibilitySynchronized,
          globalAccountPermissions: 'UNKNOWN', hostEnabled: 'UNKNOWN', oauthConnected: 'UNKNOWN' }, listing: listingOf(manifest) });
    } catch (error) { scan.errors.push({ path: file.relative, message: error.message }); }
  }
  return { kind: 'local-package-inventory', schemaVersion: 1, target: path.resolve(target), records, errors: scan.errors,
    complete: scan.errors.length === 0, limitation: 'Local files establish declarations and presence only; installation, account permissions and service access are separate evidence.' };
}

function isPublic(address) {
  if (net.isIP(address) === 4) {
    const p = address.split('.').map(Number);
    return !(p[0] === 0 || p[0] === 10 || p[0] === 127 || p[0] >= 224 ||
      (p[0] === 169 && p[1] === 254) || (p[0] === 172 && p[1] >= 16 && p[1] <= 31) ||
      (p[0] === 192 && (p[1] === 168 || (p[1] === 0 && (p[2] === 0 || p[2] === 2)) || (p[1] === 88 && p[2] === 99))) || (p[0] === 100 && p[1] >= 64 && p[1] <= 127) ||
      (p[0] === 198 && (p[1] === 18 || p[1] === 19 || (p[1] === 51 && p[2] === 100))) || (p[0] === 203 && p[1] === 0 && p[2] === 113));
  }
  if (net.isIP(address) === 6) {
    const a = address.toLowerCase();
    // Global unicast only; exclude documentation space and every IPv4 mapping/translation form.
    return /^[23][0-9a-f]{0,3}:/.test(a) && !a.startsWith('2001:db8:');
  }
  return false;
}
const localhost = address => address === '127.0.0.1' || address === '::1';
async function download(urlString, options) {
  const url = new URL(urlString);
  const hostname = url.hostname.replace(/^\[|\]$/g, '');
  if (url.username || url.password) throw new Error('URL credentials are not accepted');
  if (url.protocol !== 'https:' && !(options.allowLocalhost === true && url.protocol === 'http:')) throw new Error('Public retrieval requires HTTPS');
  const timeoutMs = options.timeoutMs ?? 10000;
  if (!Number.isFinite(timeoutMs) || timeoutMs < 1 || timeoutMs > 60000) throw new Error('timeoutMs must be 1..60000');
  let dnsTimer;
  const addresses = net.isIP(hostname) ? [{ address: hostname, family: net.isIP(hostname) }] : await Promise.race([
    dns.lookup(hostname, { all: true }), new Promise((_, reject) => { dnsTimer = setTimeout(() => reject(new Error('DNS lookup timeout')), timeoutMs); }),
  ]).finally(() => clearTimeout(dnsTimer));
  if (!addresses.length || addresses.some(a => !isPublic(a.address) && !(options.allowLocalhost === true && localhost(a.address)))) throw new Error('Only public network addresses are accepted');
  const selected = addresses[0], maxBytes = options.maxBytes ?? 2 * 1024 * 1024;
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 1 || maxBytes > 20 * 1024 * 1024) throw new Error('maxBytes must be 1..20971520');
  return new Promise((resolve, reject) => {
    const transport = url.protocol === 'https:' ? https : http;
    const request = transport.get(url, { agent: false, headers: { 'User-Agent': 'Plugin-Skill-Studio/0.3.0', Accept: 'application/json,text/html,text/plain' },
      lookup(_host, opts, callback) {
        // Pin the reviewed DNS answer for this connection, preventing a second lookup.
        if (opts?.all) callback(null, [selected]); else callback(null, selected.address, selected.family);
      } }, response => {
      if (response.statusCode >= 300 && response.statusCode < 400) { response.resume(); reject(new Error(`Redirect ${response.statusCode} is not followed; request the destination explicitly`)); return; }
      if (response.statusCode !== 200) { response.resume(); reject(new Error(`HTTP ${response.statusCode}`)); return; }
      const chunks = []; let length = 0;
      response.on('data', chunk => {
        length += chunk.length;
        if (length > maxBytes) { reject(new Error('Response size limit exceeded')); response.destroy(); request.destroy(); return; }
        chunks.push(chunk);
      });
      response.on('error', reject);
      response.on('end', () => {
        try { resolve({ text: new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks)), contentType: response.headers['content-type'] ?? '', bytes: length }); }
        catch (error) { reject(new Error(`Response is not valid UTF-8: ${error.message}`)); }
      });
    });
    const timer = setTimeout(() => request.destroy(new Error('Retrieval timeout')), timeoutMs);
    request.on('error', reject);
    request.on('close', () => clearTimeout(timer));
  });
}
function textOnly(html) {
  return html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]*>/g, ' ').replace(/&amp;/gi, '&').replace(/&lt;/gi, '<').replace(/&gt;/gi, '>').replace(/&quot;/gi, '"').replace(/&#39;/g, "'").replace(/\s+/g, ' ').trim();
}
function normalizeEntries(entries, source, maximum = 1000) {
  if (!Array.isArray(entries)) throw new Error('Snapshot entries must be an array');
  if (entries.length > maximum) throw new Error('Snapshot entry limit exceeded');
  return entries.map((entry, index) => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry) || typeof entry.name !== 'string' || !entry.name.trim()) throw new Error(`Entry ${index} requires a name`);
    return { ...entry, name: entry.name, description: typeof entry.description === 'string' ? entry.description : '',
      version: typeof entry.version === 'string' ? entry.version : null, source: entry.source ?? source,
      // A numeric rank is retained only when its query and observed source are recorded.
      rank: Number.isSafeInteger(entry.rank) && entry.rank > 0 && typeof entry.query === 'string' && entry.query && entry.source ? entry.rank : null,
      rankStatus: Number.isSafeInteger(entry.rank) && entry.rank > 0 && entry.query && entry.source ? 'supplied observation' : 'UNKNOWN' };
  });
}
function fromHTML(text, source, maximum) {
  const entries = [], seen = new Set();
  const clean = text.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '');
  for (const match of clean.matchAll(/<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    const name = textOnly(match[2]);
    if (!name || match[1].startsWith('#')) continue;
    let link;
    try { link = new URL(match[1], source.url); if (!['https:', 'http:'].includes(link.protocol) || link.username || link.password) continue; } catch { continue; }
    if (seen.has(link.href)) continue;
    seen.add(link.href);
    entries.push({ name, description: '', url: link.href, source: { ...source, pageTitle: textOnly(clean.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? '') },
      extraction: 'visible link candidate; not a verified plugin listing' });
    if (entries.length >= maximum) break;
  }
  return entries;
}

export async function catalogSnapshot(input, options = {}) {
  const observedAt = timestamp(options.asOf);
  let entries, source, errors = [], warnings = [];
  const maximum = options.maxEntries ?? 1000;
  if (!Number.isSafeInteger(maximum) || maximum < 1 || maximum > 10000) throw new Error('maxEntries must be 1..10000');
  if (typeof input === 'string' && /^https?:\/\//i.test(input)) {
    const retries = options.retries ?? 1;
    if (!Number.isSafeInteger(retries) || retries < 0 || retries > 3) throw new Error('retries must be 0..3');
    let downloaded;
    for (let attempt = 0; attempt <= retries; attempt++) {
      try { downloaded = await download(input, options); break; }
      catch (error) { if (attempt === retries || /Redirect|public|HTTPS|credentials|limit/.test(error.message)) throw error;
        await new Promise(resolve => setTimeout(resolve, Math.min(1000, 100 * (2 ** attempt)))); }
    }
    source = { kind: 'direct-public-retrieval', url: input, observedAt, bytes: downloaded.bytes };
    if (/json/i.test(downloaded.contentType) || /^[\s]*[\[{]/.test(downloaded.text)) {
      const value = JSON.parse(downloaded.text);
      entries = Array.isArray(value) ? value : value.entries;
    } else {
      entries = fromHTML(downloaded.text, source, maximum);
      warnings.push('HTML links are candidates only; page order does not establish directory search rank. No links were followed.');
    }
  } else if (typeof input === 'string') {
    const resolved = path.resolve(input), stat = await fs.lstat(resolved);
    if (stat.isSymbolicLink()) throw new Error('Linked snapshot sources are not accepted');
    if (stat.isFile() && path.extname(resolved).toLowerCase() === '.json' && path.basename(resolved) !== 'plugin.json') {
      const value = JSON.parse(await readBounded(resolved, options.maxBytes ?? 2 * 1024 * 1024));
      entries = Array.isArray(value) ? value : value.entries;
      source = { kind: 'imported-snapshot', path: resolved, originalObservation: value.observedAt ?? null };
    } else {
      const local = await inventory(resolved, options);
      entries = local.records;
      source = { kind: 'local-package-inventory', path: resolved };
      errors = local.errors;
    }
  } else if (input && typeof input === 'object') {
    entries = Array.isArray(input) ? input : input.entries;
    source = { kind: 'supplied-snapshot', originalObservation: input.observedAt ?? null };
  } else throw new Error('Provide a local package path, snapshot object or explicit public URL');
  return { kind: 'studio-catalog-snapshot', schemaVersion: 1, observedAt, source,
    entries: normalizeEntries(entries, source, maximum), complete: errors.length === 0, errors, warnings,
    limitations: ['Only observations in this snapshot are represented.', 'Search rank and historical visibility are UNKNOWN unless explicitly supplied with provenance.',
      'Popularity, stars and installation counts do not establish quality or safety.'] };
}
export function searchCatalog(snapshot, query) {
  if (!snapshot || !Array.isArray(snapshot.entries) || typeof query !== 'string') throw new Error('Search requires a snapshot and text query');
  const words = query.toLocaleLowerCase('en').split(/\s+/).filter(Boolean);
  return snapshot.entries.filter(entry => {
    const haystack = [entry.name, entry.displayName, entry.description, ...(Array.isArray(entry.keywords) ? entry.keywords : [])].filter(Boolean).join(' ').toLocaleLowerCase('en');
    return words.every(word => haystack.includes(word));
  });
}
function identity(entry) { return entry.url ?? entry.name; }
function substantive(entry) {
  const { source, observedAt, root, manifestPath, ...values } = entry;
  return JSON.stringify(Object.fromEntries(Object.entries(values).sort(([a], [b]) => a.localeCompare(b))));
}
export function compareCatalogs(before, after) {
  if (!before || !after || !Array.isArray(before.entries) || !Array.isArray(after.entries)) throw new Error('Comparison requires two snapshots');
  if (Date.parse(before.observedAt) > Date.parse(after.observedAt)) throw new Error('Before snapshot must not be newer than after snapshot');
  const old = new Map(before.entries.map(e => [identity(e), e])), next = new Map(after.entries.map(e => [identity(e), e]));
  if (old.size !== before.entries.length || next.size !== after.entries.length) throw new Error('Snapshot has ambiguous duplicate entry identities');
  return { kind: 'catalog-comparison', schemaVersion: 1, before: { observedAt: before.observedAt, source: before.source }, after: { observedAt: after.observedAt, source: after.source },
    added: [...next].filter(([key]) => !old.has(key)).map(([, e]) => e), removed: [...old].filter(([key]) => !next.has(key)).map(([, e]) => e),
    changed: [...next].filter(([key, entry]) => old.has(key) && substantive(old.get(key)) !== substantive(entry)).map(([key, entry]) => ({ identity: key, before: old.get(key), after: entry })),
    historyBeforeFirstSnapshot: 'UNKNOWN', limitation: 'Absence from a snapshot is not proof of removal from a directory; compare source coverage before interpreting changes.' };
}
