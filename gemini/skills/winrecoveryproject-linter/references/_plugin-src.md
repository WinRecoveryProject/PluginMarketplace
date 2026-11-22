# Plugin files: winrecoveryproject-linter — `src/`

Source: `plugins/winrecoveryproject-linter`. Files outside the `skills/*` folders, embedded as text.

## File: `src/catalog.mjs`

```javascript
export const catalog = [
  { id: 'powershell', extensions: ['.ps1', '.psm1', '.psd1'], tool: 'PowerShell parser + PSScriptAnalyzer 1.25.0', kind: 'external', scope: 'Syntax and selected built-in safety/style rules; no target execution' },
  { id: 'javascript', extensions: ['.js', '.mjs', '.cjs', '.jsx'], tool: 'TypeScript 6.0.3', kind: 'bundled', scope: 'Compiler checkJs diagnostics, standard libraries, no executable project config' },
  { id: 'typescript', extensions: ['.ts', '.tsx', '.mts', '.cts'], tool: 'TypeScript 6.0.3', kind: 'bundled', scope: 'Compiler syntax/type diagnostics and standard libraries; fixed compiler options' },
  { id: 'batch', extensions: ['.bat', '.cmd'], tool: 'Blinter 1.1.66', kind: 'external', scope: 'Static Batch analysis, separate isolated AGPL tool; never cmd /c' },
  { id: 'bash', extensions: ['.sh', '.bash'], tool: 'Bash -n + ShellCheck 0.11.0', kind: 'external', scope: 'Syntax and ShellCheck, no sourcing/config loading' },
  { id: 'json', extensions: ['.json', '.jsonc'], tool: 'jsonc-parser 3.3.1', kind: 'bundled', scope: 'Strict JSON or JSON with comments and trailing commas for .jsonc' },
  { id: 'markdown', extensions: ['.md', '.markdown'], tool: 'markdownlint 0.40.0 / markdownlint-cli 0.48.0', kind: 'bundled', scope: 'Fixed bundled rules; custom configs, rules and inline suppression disabled' },
  { id: 'lua', extensions: ['.lua'], tool: 'luaparse 0.3.1', kind: 'bundled', scope: 'Strict Lua 5.1 grammar; no .luacheckrc execution' },
  { id: 'xml', extensions: ['.xml'], tool: 'saxes 6.0.0', kind: 'bundled', scope: 'Well-formed XML; DTDs and entity declarations rejected' },
  { id: 'html', extensions: ['.html', '.htm'], tool: 'parse5 8.0.0', kind: 'bundled', scope: 'WHATWG HTML document parse diagnostics; scripts and external resources are never loaded' },
  { id: 'css', extensions: ['.css'], tool: 'css-tree 3.1.0', kind: 'bundled', scope: 'CSS syntax diagnostics and parser recovery errors; no imports or URLs fetched' },
  { id: 'toc', extensions: ['.toc'], tool: 'WRP TOC 0.1.0', kind: 'bundled', scope: 'WoW metadata, numeric interfaces and contained paths; dynamic game/locale paths reported as deferred' },
  { id: 'yaml', extensions: ['.yaml', '.yml'], tool: 'js-yaml 4.1.1', kind: 'bundled', scope: 'YAML data parser with JSON schema; only when files detected/selected' },
  { id: 'toml', extensions: ['.toml'], tool: 'smol-toml 1.6.0', kind: 'bundled', scope: 'TOML parser; only when files detected/selected' },
  { id: 'python', extensions: ['.py', '.pyi'], tool: 'Python 3.11–3.15 ast.parse', kind: 'external', scope: 'Python syntax only; no imports, execution or bytecode writes' },
  { id: 'sql', extensions: ['.sql'], tool: 'libpg-query 18.2.4 / PostgreSQL 18 grammar', kind: 'external', scope: 'Explicit postgresql dialect; static SQL/PLpgSQL syntax in a bounded parser process, no DB or migration execution' }
];
export const byExtension = new Map(catalog.flatMap(item => item.extensions.map(extension => [extension, item.id])));
export const unsupportedSource = new Set(['.scss', '.less', '.vue', '.svelte', '.rs', '.go', '.c', '.cpp', '.h', '.cs', '.java', '.php', '.rb', '.swift', '.kt', '.bats', '.zsh', '.fish']);
```

## File: `src/engine.mjs`

```javascript
import fs from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { TextDecoder } from 'node:util';
import { catalog, byExtension, unsupportedSource } from './catalog.mjs';
import { findExecutable, inside, run } from './process.mjs';
import { resolveLibrary, importLibrary, localTool, verifiedRuntime } from './runtime-cache.mjs';

const dependencies = { javascript: 'typescript', typescript: 'typescript', json: 'jsonc-parser', lua: 'luaparse', markdown: 'markdownlint', xml: 'saxes', html: 'parse5', css: 'css-tree', yaml: 'js-yaml', toml: 'smol-toml' };
function verifyPin(name, options) {
  resolveLibrary(name === '@types/node' ? '@types/node/package.json' : name === 'markdownlint' ? 'markdownlint/sync' : name, options);
}
export const packageRoot = fileURLToPath(new URL('../', import.meta.url));
export const configName = '.wrp-lint.json';
const excluded = new Set(['.git', 'node_modules', '.venv', 'venv', '.tools', 'vendor', 'build', 'dist', 'generated', 'archive', 'archives', 'coverage', '.next', '__pycache__']);
const maxBytes = 2 * 1024 * 1024;
const maxFiles = 10000;
const slash = value => value.split(path.sep).join('/');
const issue = (file, rule, message, line = 1, column = 1, severity = 'error') => ({ file, line, column, severity, rule, message });
const errorText = error => error instanceof Error ? error.message : String(error);

export async function readConfig(root) {
  root = await fs.realpath(root);
  let text;
  const target = path.join(root, configName);
  try {
    const stat = await fs.lstat(target);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 65536) throw new Error(`${configName} must be a regular JSON file <=64 KiB`);
    text = (await safeBytes(target, root, 65536)).toString('utf8');
  } catch (error) { if (error.code === 'ENOENT') return {}; throw error; }
  const value = JSON.parse(text);
  if (!value || Array.isArray(value) || typeof value !== 'object') throw new Error('Config must be an object');
  for (const key of Object.keys(value)) if (!['version', 'types', 'exclude', 'sqlDialect'].includes(key)) throw new Error(`Unknown config key: ${key}`);
  if (value.version !== 1) throw new Error('Config version must be 1');
  if (value.sqlDialect !== undefined && (typeof value.sqlDialect !== 'string' || !/^[a-z][a-z0-9-]{0,31}$/.test(value.sqlDialect))) throw new Error('sqlDialect must be a plain lowercase dialect name; currently supported: postgresql');
  if (value.types !== undefined && (!Array.isArray(value.types) || value.types.some(type => !catalog.some(item => item.id === type)))) throw new Error('Config types must contain known linter IDs');
  if (value.exclude !== undefined && (!Array.isArray(value.exclude) || value.exclude.some(item => typeof item !== 'string' || !item || item.includes('\\') || item.includes('..') || path.isAbsolute(item) || /[*?\[\]]/.test(item)))) throw new Error('Config exclude must contain plain relative paths without glob patterns or traversal');
  return value;
}

export async function inventory(root, config = {}) {
  root = await fs.realpath(root);
  const files = [], notices = [], incomplete = [];
  const skip = relative => relative.split('/').some(part => excluded.has(part.toLowerCase()) || /^old[_-]/i.test(part)) || (config.exclude || []).some(item => relative === item || relative.startsWith(item.replace(/\/$/, '') + '/'));
  const add = async relative => {
    relative = slash(relative);
    if (!relative || skip(relative)) return;
    const absolute = path.resolve(root, relative);
    if (!inside(root, absolute)) { incomplete.push(`Outside-root candidate rejected: ${relative}`); return; }
    // Reject every symlink/reparse ancestor, even when its final target stays inside.
    let current = root;
    for (const part of relative.split('/')) {
      current = path.join(current, part);
      const stat = await fs.lstat(current);
      if (stat.isSymbolicLink()) { notices.push(`Symlink skipped: ${relative}`); return; }
    }
    const stat = await fs.lstat(absolute);
    if (!stat.isFile()) return;
    const resolved = await fs.realpath(absolute);
    if (!inside(root, resolved)) { incomplete.push(`Resolved path escaped root: ${relative}`); return; }
    const extension = path.extname(relative).toLowerCase();
    const type = byExtension.get(extension);
    if (type || unsupportedSource.has(extension) || (!extension && /^(?:#!.*\b(?:bash|sh)\b)/.test((await safeBytes(absolute, root, 200, true)).toString('utf8')))) {
      files.push({ file: relative, absolute, type: type || (!extension ? 'bash' : undefined), size: stat.size });
      if (files.length > maxFiles) throw new Error(`Inventory exceeds ${maxFiles} source files; narrow the root or exclusions`);
    }
  };
  let gitPaths;
  const git = findExecutable('git', root);
  if (git) {
    const result = await run(git, ['-c', 'core.fsmonitor=false', '-c', 'core.untrackedCache=false', '-C', root, 'ls-files', '--cached', '--others', '--exclude-standard', '-z'], { cwd: packageRoot });
    if (result.code === 0) gitPaths = [...new Set(result.stdout.split('\0').filter(Boolean))];
  }
  if (gitPaths) {
    for (const relative of gitPaths) {
      try { await add(relative); } catch (error) { if (error.code !== 'ENOENT') incomplete.push(`${relative}: ${errorText(error)}`); }
    }
  } else {
    const walk = async (directory, relative = '') => {
      for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
        const name = relative ? `${relative}/${entry.name}` : entry.name;
        if (skip(name)) continue;
        if (entry.isSymbolicLink()) { notices.push(`Symlink skipped: ${name}`); continue; }
        if (entry.isDirectory()) await walk(path.join(directory, entry.name), name);
        else { try { await add(name); } catch (error) { incomplete.push(`${name}: ${errorText(error)}`); } }
      }
    };
    await walk(root);
  }
  files.sort((a, b) => a.file.localeCompare(b.file, 'en'));
  return { root, files, notices, incomplete, discovery: gitPaths ? 'git tracked + nonignored untracked' : 'safe filesystem walk (no Git index)' };
}

async function safeBytes(absolute, root, limit, prefix = false) {
  const relative = path.relative(root, absolute);
  if (!inside(root, absolute)) throw new Error('Read path escapes scan root');
  let current = root;
  for (const part of relative.split(path.sep)) { current = path.join(current, part); if ((await fs.lstat(current)).isSymbolicLink()) throw new Error('Read path changed into a symlink'); }
  const before = await fs.lstat(absolute);
  if (!before.isFile() || before.isSymbolicLink()) throw new Error('Source is no longer a regular file');
  if (!prefix && before.size > limit) throw new Error(`Source exceeds ${limit} bytes`);
  const handle = await fs.open(absolute, constants.O_RDONLY | (constants.O_NOFOLLOW || 0));
  try {
    const opened = await handle.stat();
    if (opened.ino !== before.ino || opened.dev !== before.dev) throw new Error('Source changed while opening');
    if (!inside(root, await fs.realpath(absolute))) throw new Error('Opened path escaped scan root');
    const buffer = Buffer.alloc(Math.min(opened.size, limit) + (prefix ? 0 : 1));
    let length = 0;
    while (length < buffer.length) { const { bytesRead } = await handle.read(buffer, length, buffer.length - length, length); if (!bytesRead) break; length += bytesRead; }
    if (!prefix && length > limit) throw new Error(`Source grew above ${limit} bytes`);
    const after = await handle.stat();
    const pathAfter = await fs.lstat(absolute);
    if (after.size !== opened.size || after.mtimeMs !== opened.mtimeMs || pathAfter.ino !== opened.ino || pathAfter.dev !== opened.dev || pathAfter.isSymbolicLink()) throw new Error('Source changed during read');
    return buffer.subarray(0, length);
  } finally { await handle.close(); }
}

async function snapshot(item, root) {
  if (item.size > maxBytes) throw new Error(`${item.file} exceeds ${maxBytes} bytes`);
  const buffer = await safeBytes(item.absolute, root, maxBytes);
  // Windows scripts frequently use UTF-16LE with BOM. Other text is strict UTF-8.
  if (buffer[0] === 0xff && buffer[1] === 0xfe) return new TextDecoder('utf-16le', { fatal: true }).decode(buffer);
  if (buffer[0] === 0xfe && buffer[1] === 0xff) return new TextDecoder('utf-16be', { fatal: true }).decode(buffer);
  return new TextDecoder('utf-8', { fatal: true }).decode(buffer);
}

async function compiler(files) {
  if (!files.length) return [];
  const { default: ts } = await importLibrary('typescript');
  const findings = [];
  const sources = new Map(files.map(file => [path.normalize(file.absolute), file]));
  const libRoot = path.dirname(resolveLibrary('typescript'));
  const nodeTypes = path.dirname(resolveLibrary('@types/node/package.json'));
  const trustedRoots = [libRoot, nodeTypes, path.dirname(resolveLibrary('undici-types/package.json'))];
  const options = { noEmit: true, allowJs: true, checkJs: true, strict: true, skipLibCheck: true, target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler, jsx: ts.JsxEmit.Preserve, types: ['node'], typeRoots: [path.dirname(nodeTypes)], noResolve: false, allowImportingTsExtensions: true };
  const host = ts.createCompilerHost(options);
  const originalRead = host.readFile.bind(host);
  const allowedLib = file => trustedRoots.some(directory => inside(directory, path.normalize(file))) && (file.endsWith('.d.ts') || trustedRoots.some(directory => path.normalize(file) === path.join(directory, 'package.json')));
  host.readFile = file => sources.get(path.normalize(file))?.content ?? (allowedLib(file) ? originalRead(file) : undefined);
  host.fileExists = file => sources.has(path.normalize(file)) || (allowedLib(file) && ts.sys.fileExists(file));
  host.directoryExists = directory => [...sources.keys()].some(file => inside(directory, file)) || trustedRoots.some(trusted => inside(trusted, directory) || inside(directory, trusted));
  host.getSourceFile = (file, languageVersion) => { const text = host.readFile(file); return text === undefined ? undefined : ts.createSourceFile(file, text, languageVersion, true); };
  const program = ts.createProgram([...sources.keys()], options, host);
  for (const diagnostic of ts.getPreEmitDiagnostics(program)) {
    const source = diagnostic.file && sources.get(path.normalize(diagnostic.file.fileName));
    const position = diagnostic.file && diagnostic.start !== undefined ? diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start) : { line: 0, character: 0 };
    findings.push(issue(source?.file || '<compiler>', `TS${diagnostic.code}`, ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'), position.line + 1, position.character + 1));
  }
  for (const source of program.getSourceFiles()) {
    const item = sources.get(path.normalize(source.fileName));
    if (!item) continue;
    const visit = node => {
      const rule = ts.isDebuggerStatement(node) ? 'WRP-no-debugger' : ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'eval' ? 'WRP-no-eval' : undefined;
      if (rule) { const pos = source.getLineAndCharacterOfPosition(node.getStart(source)); findings.push(issue(item.file, rule, rule === 'WRP-no-eval' ? 'Avoid direct eval.' : 'Remove debugger statement.', pos.line + 1, pos.character + 1, 'warning')); }
      ts.forEachChild(node, visit);
    };
    visit(source);
  }
  return findings;
}

async function internal(item, root, notices) {
  const text = item.content, findings = [];
  const add = (rule, message, line, column) => findings.push(issue(item.file, rule, message, line, column));
  if (item.type === 'json') {
    const { parse: parseJson, printParseErrorCode } = await importLibrary('jsonc-parser');
    const errors = [];
    parseJson(text, errors, { disallowComments: path.extname(item.file).toLowerCase() !== '.jsonc', allowTrailingComma: path.extname(item.file).toLowerCase() === '.jsonc' });
    for (const error of errors) { const before = text.slice(0, error.offset).split('\n'); add(`JSON-${printParseErrorCode(error.error)}`, printParseErrorCode(error.error), before.length, before.at(-1).length + 1); }
  } else if (item.type === 'lua') {
    const { default: luaparse } = await importLibrary('luaparse');
    try { luaparse.parse(text, { luaVersion: '5.1', locations: true, comments: false, encodingMode: 'none' }); }
    catch (error) { add('LUA51-syntax', error.message, error.line, (error.column ?? 0) + 1); }
  } else if (item.type === 'markdown') {
    const { lint: lintMarkdown } = await importLibrary('markdownlint/sync');
    const result = lintMarkdown({ strings: { [item.file]: text }, config: { default: true, MD013: false, MD024: { siblings_only: true } }, noInlineConfig: true });
    for (const error of result[item.file]) add(error.ruleNames[0], `${error.ruleDescription}${error.errorDetail ? ': ' + error.errorDetail : ''}`, error.lineNumber, error.errorRange?.[0] || 1);
  } else if (item.type === 'xml') {
    const { SaxesParser } = await importLibrary('saxes');
    const parser = new SaxesParser({ xmlns: true, position: true });
    parser.on('doctype', () => { add('XML-no-DTD', 'DOCTYPE declarations are disabled; external entities are never resolved.', parser.line, parser.column); });
    parser.on('error', error => { add('XML-syntax', error.message, parser.line, parser.column); });
    try { parser.write(text).close(); } catch (error) { add('XML-syntax', errorText(error), parser.line, parser.column); }
  } else if (item.type === 'yaml') {
    const { default: yaml } = await importLibrary('js-yaml');
    try { yaml.loadAll(text, undefined, { schema: yaml.JSON_SCHEMA, filename: item.file }); }
    catch (error) { add('YAML-syntax', error.message, (error.mark?.line ?? 0) + 1, (error.mark?.column ?? 0) + 1); }
  } else if (item.type === 'toml') {
    const { parse: parseToml } = await importLibrary('smol-toml');
    try { parseToml(text); } catch (error) { add('TOML-syntax', error.message, error.line || 1, error.column || 1); }
  } else if (item.type === 'html') {
    const { parse } = await importLibrary('parse5');
    parse(text, { sourceCodeLocationInfo: true, scriptingEnabled: false, onParseError: error => {
      add(`HTML-${error.code}`, error.code.replaceAll('-', ' '), error.startLine || 1, error.startCol || 1);
    } });
  } else if (item.type === 'css') {
    const { parse } = await importLibrary('css-tree');
    try {
      parse(text, { positions: true, filename: item.file, parseValue: true, parseCustomProperty: true, onParseError: error => {
        add('CSS-syntax', error.message, error.line || 1, error.column || 1);
      } });
    } catch (error) { add('CSS-syntax', error.message, error.line || 1, error.column || 1); }
  } else if (item.type === 'toc') {
    let interfaceSeen = false, titleSeen = false;
    const lines = text.split(/\r?\n/);
    for (const [index, raw] of lines.entries()) {
      const line = raw.trim();
      if (!line || line.startsWith('#@') || (line.startsWith('#') && !line.startsWith('##'))) continue;
      if (line.startsWith('##')) {
        const match = /^##\s*([^:]+):\s*(.*)$/.exec(line);
        if (!match) { add('TOC-metadata', 'Expected ## Key: value.', index + 1, 1); continue; }
        if (/^Interface(?:[-_]\w+)?$/i.test(match[1].trim())) {
          interfaceSeen = true;
          if (!/^\d+(?:\s*,\s*\d+)*$/.test(match[2].trim())) add('TOC-interface', 'Interface values must be comma-separated numeric versions.', index + 1, 1);
        }
        if (/^Title(?:-\w+)?$/i.test(match[1].trim())) titleSeen = true;
        continue;
      }
      // Flavor attributes are packager data, not part of the filename.
      const target = line.replace(/\s+\[AllowLoad(?:GameType|TextLocale)\s+[^\]]+\]\s*$/i, '').replaceAll('\\', '/');
      const absolute = path.resolve(path.dirname(item.absolute), target);
      const unsafePath = path.isAbsolute(target) || /^[A-Za-z]:/.test(target) || !inside(root, absolute);
      const tokens = target.match(/\[[^\]]+\]/g) || [];
      const unsupportedToken = tokens.some(token => !/^\[(?:Game|TextLocale)\]$/i.test(token));
      if (unsafePath) add('TOC-path', `Path escapes scan root: ${target}`, index + 1, 1);
      if (unsupportedToken) add('TOC-token', `Unsupported dynamic token: ${target}`, index + 1, 1);
      if (unsafePath || unsupportedToken) continue;
      if (tokens.length) { notices.push(`${item.file}:${index + 1}: dynamic TOC path deferred: ${target}`); continue; }
      try {
        const relative = path.relative(root, absolute); let current = root;
        for (const part of relative.split(path.sep)) { current = path.join(current, part); if ((await fs.lstat(current)).isSymbolicLink()) throw new Error('symlink path'); }
        if (!(await fs.stat(absolute)).isFile()) throw new Error('not a file');
      } catch (error) { add('TOC-missing-file', `Missing or unsafe referenced file: ${target} (${error.code || error.message})`, index + 1, 1); }
    }
    if (!interfaceSeen) add('TOC-interface', 'Missing Interface metadata.', 1, 1);
    if (!titleSeen) add('TOC-title', 'Missing Title metadata.', 1, 1);
  }
  return findings;
}

export async function pythonRuntime(root, execute = run) {
  const executable = findExecutable('python', root);
  if (!executable) throw new Error('Python 3.11–3.15 is required for isolated Blinter');
  const result = await execute(executable, ['-I', '-c', 'import sys,json,sysconfig; print(json.dumps({"version":list(sys.version_info[:3]),"prefix":sys.base_prefix,"implementation":sys.implementation.name,"cacheTag":sys.implementation.cache_tag,"soabi":sysconfig.get_config_var("SOABI"),"freeThreaded":bool(sysconfig.get_config_var("Py_GIL_DISABLED"))}))'], { cwd: packageRoot });
  if (result.code !== 0) throw new Error(result.stderr || 'Python runtime identity is unavailable');
  const info = JSON.parse(result.stdout);
  if (!Array.isArray(info.version) || info.version.length !== 3 || !info.version.every(Number.isInteger) || info.version[0] !== 3 || info.version[1] < 11 || info.version[1] > 15 || typeof info.prefix !== 'string' || typeof info.implementation !== 'string' || (info.cacheTag !== null && typeof info.cacheTag !== 'string') || (info.soabi !== null && typeof info.soabi !== 'string') || typeof info.freeThreaded !== 'boolean') throw new Error('Python 3.11–3.15 with an observed runtime ABI is required for isolated Blinter');
  return { executable, identity: JSON.stringify([executable, info.version, info.prefix, info.implementation, info.cacheTag, info.soabi, info.freeThreaded]) };
}
export async function batchPython(root, execute = run, { cacheRoot } = {}) {
  try {
    const python = await pythonRuntime(root, execute);
    const runtime = verifiedRuntime('blinter', { cacheRoot, pythonIdentity: python.identity });
    return path.join(runtime.root, process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python');
  } catch { /* A missing durable runtime may use an explicitly prepared legacy venv. */ }
  return localTool(`.tools/blinter/${process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python'}`);
}

export async function probe(type, root, execute = run, { cacheRoot, sqlDialect } = {}) {
  try {
    if (type === 'sql') {
      const dialect = sqlDialect ?? (await readConfig(root)).sqlDialect;
      if (dialect !== 'postgresql') throw new Error(dialect ? `SQL dialect ${dialect} is unsupported; only explicit postgresql is available` : 'SQL dialect is unknown; select sqlDialect: postgresql or --sql-dialect postgresql');
      const { verifySqlAssets } = await import('./sql-process.mjs');
      try { verifySqlAssets({ cacheRoot }); }
      catch (error) { throw new Error(`Pinned PostgreSQL parser/assets are missing or incorrect (${error.message}). Run wrp-lint setup --types sql --sql-dialect postgresql (explicit, free local setup).`); }
      return { available: true, executable: process.execPath, version: catalog.find(item => item.id === type).tool, sqlDialect: dialect };
    }
    if (catalog.find(item => item.id === type)?.kind === 'bundled') {
      if (dependencies[type]) {
        try { verifyPin(dependencies[type], { cacheRoot }); }
        catch (error) { throw new Error(`Pinned ${dependencies[type]} library is missing or incorrect (${error.message}). Run wrp-lint setup --detected (free, local, explicit setup).`); }
      }
      if (['javascript', 'typescript'].includes(type)) { try { verifyPin('@types/node', { cacheRoot }); resolveLibrary('undici-types/package.json', { cacheRoot }); } catch { throw new Error('Pinned Node compiler types are missing. Run wrp-lint setup --detected.'); } }
      return { available: true, version: catalog.find(item => item.id === type).tool };
    }
    if (type === 'powershell') {
      const executable = findExecutable('pwsh', root); if (!executable) throw new Error('pwsh >=7.4.6 is missing');
      const result = await execute(executable, ['-NoLogo', '-NoProfile', '-NonInteractive', '-File', path.join(packageRoot, 'adapters/powershell.ps1'), '-Doctor'], { cwd: packageRoot });
      if (result.code !== 0) throw new Error(result.stderr || 'PowerShell/PSScriptAnalyzer unavailable');
      return { available: true, executable, version: JSON.parse(result.stdout.trim()) };
    }
    if (type === 'batch') {
      const executable = await batchPython(root, execute, { cacheRoot });
      const result = await execute(executable, ['-I', '-c', 'import sys,importlib.metadata; assert (3,11) <= sys.version_info[:2] < (3,16); print(importlib.metadata.version("Blinter"))'], { cwd: packageRoot });
      if (result.code !== 0 || result.stdout.trim() !== '1.1.66') throw new Error('Blinter 1.1.66 missing from the selected isolated runtime');
      return { available: true, executable, version: '1.1.66' };
    }
    if (type === 'bash') {
      const bash = findExecutable('bash', root);
      const candidates = [];
      try { candidates.push(path.join(verifiedRuntime('shellcheck', { cacheRoot }).root, 'shellcheck.exe')); } catch { /* Explicit setup has not prepared a verified runtime. */ }
      candidates.push(findExecutable('shellcheck', root));
      try { candidates.push(localTool('.tools/shellcheck/shellcheck.exe')); } catch { /* No legacy preparation. */ }
      let shellcheck;
      for (const candidate of [...new Set(candidates.filter(Boolean))]) {
        try {
          const result = await execute(candidate, ['--version'], { cwd: packageRoot });
          if (result.code === 0 && /version:\s*0\.11\.0\b/.test(result.stdout)) { shellcheck = candidate; break; }
        } catch { /* A broken older PATH/local tool must not mask a valid candidate. */ }
      }
      if (!bash || !shellcheck) throw new Error(`Missing ${[!bash && 'bash', !shellcheck && 'ShellCheck 0.11.0'].filter(Boolean).join(' and ')}`);
      const bashVersion = await execute(bash, ['--version'], { cwd: packageRoot });
      if (bashVersion.code !== 0 || !/GNU bash/.test(bashVersion.stdout)) throw new Error('Executable is not GNU Bash');
      return { available: true, executable: bash, shellcheck, version: 'ShellCheck 0.11.0 + Bash syntax' };
    }
    if (type === 'python') {
      const executable = findExecutable('python', root); if (!executable) throw new Error('Python is missing');
      const result = await execute(executable, ['-I', '-c', 'import sys; print(".".join(map(str,sys.version_info[:3])))'], { cwd: packageRoot });
      const [major, minor] = result.stdout.trim().split('.').map(Number);
      if (result.code !== 0 || major !== 3 || minor < 11 || minor > 15) throw new Error('Python 3.11–3.15 is required');
      return { available: true, executable, version: result.stdout.trim() };
    }
    throw new Error(`Unknown adapter: ${type}`);
  } catch (error) { return { available: false, reason: errorText(error) }; }
}

async function external(type, files, tool, root, execute) {
  if (type === 'sql') {
    const { analyzeSql } = await import('./sql-process.mjs');
    return analyzeSql(files, { execute, executable: process.execPath, cwd: packageRoot });
  }
  if (type === 'powershell') {
    const { analyzePowerShell } = await import('./powershell-batch.mjs');
    return analyzePowerShell(files, { execute, executable: tool.executable, adapter: path.join(packageRoot, 'adapters/powershell.ps1'), cwd: packageRoot });
  }
  if (type === 'python') {
    const args = ['-I', '-B', path.join(packageRoot, 'adapters/python-syntax.py')];
    const result = await execute(tool.executable, args, { cwd: packageRoot, input: JSON.stringify(files.map(({ file, content }) => ({ file, content }))) });
    if (result.code !== 0) throw new Error(result.stderr || `Adapter exited ${result.code}`);
    const data = JSON.parse(result.stdout.trim());
    if (!Array.isArray(data)) throw new Error('Adapter returned a non-array report');
    return data;
  }
  const findings = [];
  for (const file of files) {
    if (type === 'bash') {
      const syntax = await execute(tool.executable, ['--noprofile', '--norc', '-n'], { cwd: packageRoot, input: file.content });
      if (syntax.code > 2 || syntax.code === null) throw new Error(syntax.stderr || 'Bash failed');
      if (syntax.code !== 0) findings.push(issue(file.file, 'BASH-syntax', syntax.stderr.trim(), Number(/line (\d+)/.exec(syntax.stderr)?.[1] || 1)));
      // External source following is OFF by default; never pass -x/--external-sources.
      const result = await execute(tool.shellcheck, ['--norc', '--format=json', '--shell=bash', '-'], { cwd: packageRoot, input: file.content });
      if (![0, 1].includes(result.code)) throw new Error(result.stderr || `ShellCheck exited ${result.code}`);
      const data = JSON.parse(result.stdout);
      if (!Array.isArray(data)) throw new Error('ShellCheck returned a non-array report');
      for (const item of data) findings.push(issue(file.file, `SC${item.code}`, item.message, item.line, item.column, item.level));
    } else if (type === 'batch') {
      const result = await execute(tool.executable, ['-I', '-B', '-m', 'blinter', '--no-config', '--no-recursive', '--format', 'json', '--fail-on', 'style', file.absolute], { cwd: packageRoot });
      if (![0, 1].includes(result.code)) throw new Error(result.stderr || `Blinter exited ${result.code}`);
      const report = JSON.parse(result.stdout);
      if (!Array.isArray(report.processed_files) || !Array.isArray(report.issues) || report.blinter_version !== '1.1.66') throw new Error('Blinter returned an unknown report schema');
      for (const item of report.issues) findings.push(issue(file.file, item.code, item.explanation || item.name || item.code, item.line || 1, item.column || 1, (item.severity || 'warning').toLowerCase()));
      if (report.processed_files.length !== 1 || report.skipped_files?.length) throw new Error('Blinter did not check exactly one requested file');
    }
  }
  return findings;
}

export async function scan(root, { types, execute = run, toolProbe = probe, sqlDialect } = {}) {
  const config = await readConfig(root);
  const inv = await inventory(root, config);
  const requested = types || config.types;
  if (requested?.some(type => !catalog.some(item => item.id === type))) throw new Error('Unknown selected type');
  const findings = [], incomplete = [...inv.incomplete], notices = [...inv.notices], coverage = [];
  const detected = [...new Set(inv.files.map(file => file.type).filter(Boolean))];
  for (const file of inv.files.filter(file => !file.type)) incomplete.push(`Unsupported source format: ${file.file}`);
  const selected = requested || detected;
  if (!selected.length) incomplete.push('No source types selected; no checks executed');
  for (const type of detected.filter(type => !selected.includes(type))) notices.push(`Detected ${type} excluded by explicit type selection`);
  const snapshots = [];
  for (const item of inv.files.filter(file => selected.includes(file.type))) {
    try { snapshots.push({ ...item, content: await snapshot(item, inv.root) }); }
    catch (error) { incomplete.push(`${item.file}: ${errorText(error)}`); }
  }
  for (const type of selected) {
    const files = snapshots.filter(file => file.type === type);
    const tool = await toolProbe(type, inv.root, execute, { sqlDialect: sqlDialect ?? config.sqlDialect });
    const coverageItem = { type, files: files.length, status: tool.available ? (files.length ? 'checked' : 'no-files') : 'unavailable', tool: catalog.find(item => item.id === type).tool, detail: tool.reason };
    coverage.push(coverageItem);
    if (!tool.available) { incomplete.push(`${type}: ${tool.reason}`); continue; }
    try {
      if (['javascript', 'typescript'].includes(type)) continue;
      if (catalog.find(item => item.id === type).kind === 'external') {
        coverageItem.checkedFiles = 0;
        const diagnostics = await external(type, files, tool, inv.root, execute);
        const requestedFiles = new Set(files.map(item => item.file));
        const uncheckedFiles = new Set();
        for (const item of diagnostics) {
          if (item.incomplete === true) {
            if (typeof item.file !== 'string' || !requestedFiles.has(item.file)) throw new Error('Adapter returned an unknown incomplete file');
            uncheckedFiles.add(item.file);
            incomplete.push(`${item.file}:${item.line}:${item.column}: ${item.rule}: ${item.message}`);
          } else findings.push(item);
        }
        coverageItem.checkedFiles = files.length - uncheckedFiles.size;
        if (uncheckedFiles.size) coverageItem.status = coverageItem.checkedFiles ? 'partial' : 'failed';
      }
      else for (const item of files) findings.push(...await internal(item, inv.root, notices));
    } catch (error) { coverageItem.status = 'failed'; incomplete.push(`${type}: ${errorText(error)}`); }
  }
  if (selected.length && !snapshots.length) incomplete.push('No selected source files could be checked');
  try { findings.push(...await compiler(snapshots.filter(file => ['javascript', 'typescript'].includes(file.type) && coverage.find(entry => entry.type === file.type)?.status === 'checked'))); }
  catch (error) { incomplete.push(`compiler: ${errorText(error)}`); }
  if (!inv.files.length) incomplete.push('No supported or recognized source files found');
  findings.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line || a.column - b.column || a.rule.localeCompare(b.rule));
  const exitCode = incomplete.length ? 2 : findings.length ? 1 : 0;
  return { schemaVersion: 1, product: 'WinRecoveryProjectLinter', version: '0.1.6', root: inv.root, status: ['CLEAN', 'FINDINGS', 'INCOMPLETE'][exitCode], exitCode, discovery: inv.discovery, detected, selected, coverage, findings, incomplete, notices, limits: { maxFiles, maxBytesPerFile: maxBytes }, budget: { paidServices: false, telemetry: false } };
}
```

## File: `src/powershell-batch.mjs`

```javascript
import { ToolTimeoutError } from './process.mjs';

// Bound analyzer work per process without raising the process timeout or running source.
const MAX_FILES=8;
const TARGET_BYTES=256*1024; // A larger supported source stays whole, alone in a batch.
const MAX_INPUT_BYTES=16*1024*1024; // Covers worst-case JSON escaping of the 2 MiB source limit.
const TIMEOUT=30000;
function batches(files){
  const result=[];let current=[],bytes=2;
  for(const {file,content} of files){
    const item={file,content},size=Buffer.byteLength(JSON.stringify(item));
    if(current.length&&(current.length>=MAX_FILES||bytes+1+size>TARGET_BYTES)){result.push(current);current=[];bytes=2;}
    bytes+=(current.length?1:0)+size;current.push(item);
  }
  if(current.length)result.push(current);
  return result;
}
function checkedReport(text,files){
  const report=JSON.parse(text.trim()),allowed=new Set(files.map(f=>f.file));
  if(!Array.isArray(report))throw Error('PowerShell adapter returned a non-array report');
  return report.map(item=>{
    if(!item||typeof item!=='object'||!allowed.has(item.file)||typeof item.rule!=='string'||!item.rule||item.rule.length>256||
       typeof item.message!=='string'||item.message.length>32768||!Number.isInteger(item.line)||item.line<1||
       !Number.isInteger(item.column)||item.column<1||!['error','warning','information','info'].includes(item.severity))
      throw Error('PowerShell adapter returned an invalid or out-of-batch diagnostic');
    return {file:item.file,rule:item.rule,message:item.message,line:item.line,column:item.column,severity:item.severity};
  });
}
export async function analyzePowerShell(files, { execute, executable, adapter, cwd }) {
  const findings = [];
  const args = ['-NoLogo', '-NoProfile', '-NonInteractive', '-File', adapter];

  async function analyzeBatch(batch, allowSplit) {
    try {
      const input = JSON.stringify(batch);
      if (Buffer.byteLength(input) > MAX_INPUT_BYTES) throw Error('PowerShell batch exceeds bounded adapter input');
      const result = await execute(executable, args, { cwd, input, timeout: TIMEOUT });
      if (result.code !== 0) throw Error(result.stderr || `PowerShell adapter exited ${result.code}`);
      findings.push(...checkedReport(result.stdout, batch));
    } catch (error) {
      // Give each half one attempt under the same per-process timeout.
      if (allowSplit && batch.length > 1 && error instanceof ToolTimeoutError) {
        const midpoint = Math.floor(batch.length / 2);
        await analyzeBatch(batch.slice(0, midpoint), false);
        await analyzeBatch(batch.slice(midpoint), false);
        return;
      }
      const reason = String(error?.message ?? error).slice(0, 2048);
      for (const item of batch) findings.push({
        file: item.file, rule: 'powershell-adapter', message: `PowerShell batch incomplete: ${reason}`,
        line: 1, column: 1, severity: 'error', incomplete: true
      });
    }
  }
  for (const batch of batches(files)) await analyzeBatch(batch, true);
  return findings;
}
```

## File: `src/process.mjs`

```javascript
import { spawn, spawnSync } from 'node:child_process';
import { accessSync, constants, realpathSync } from 'node:fs';
import path from 'node:path';

export class ToolTimeoutError extends Error {
  constructor(timeout) {
    super(`Tool timed out after ${timeout} ms`);
  }
}

// No shell and no command strings. Process output is bounded in bytes, including stderr.
export function run(executable, args, { cwd, input, timeout = 30000, limit = 4 * 1024 * 1024, env = process.env } = {}) {
  return new Promise((resolve, reject) => {
    const clean = { ...env };
    for (const name of ['BASH_ENV', 'ENV', 'NODE_OPTIONS', 'PYTHONPATH', 'PYTHONHOME', 'GIT_EXTERNAL_DIFF']) delete clean[name];
    let child;
    try { child = spawn(executable, args, { cwd, env: clean, shell: false, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] }); }
    catch (error) { reject(error); return; }
    let stdout = '', stderr = '', bytes = 0, failure;
    const timer = setTimeout(() => { failure ??= new ToolTimeoutError(timeout); child.kill(); }, timeout);
    for (const [stream, name] of [[child.stdout, 'stdout'], [child.stderr, 'stderr']]) {
      stream.setEncoding('utf8');
      stream.on('data', chunk => {
        bytes += Buffer.byteLength(chunk);
        if (bytes > limit) { failure ??= new Error(`Tool output exceeded ${limit} bytes`); child.kill(); return; }
        if (name === 'stdout') stdout += chunk; else stderr += chunk;
      });
    }
    child.on('error', error => { clearTimeout(timer); reject(error); });
    child.on('close', (code, signal) => { clearTimeout(timer); if (failure) reject(failure); else if (signal) reject(new Error(`Tool terminated: ${signal}`)); else resolve({ code, stdout, stderr }); });
    child.stdin.on('error', () => {});
    child.stdin.end(input);
  });
}

export function inside(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
}

function usableExecutable(candidate, forbiddenRoot) {
  try {
    if (!path.isAbsolute(candidate)) return undefined;
    const resolved = realpathSync(candidate);
    if (forbiddenRoot && inside(forbiddenRoot, resolved)) return undefined;
    accessSync(resolved, constants.X_OK);
    return resolved;
  } catch { /* A missing candidate is expected during discovery. */ }
}

function* executableCandidates(name, forbiddenRoot) {
  const onWindows = process.platform === 'win32';
  const extensions = onWindows ? ['.exe', ''] : [''];
  for (const directory of (process.env.PATH || '').split(path.delimiter).filter(Boolean)) {
    for (const extension of extensions) yield path.join(directory, name + extension);
  }
  if (!onWindows) return;
  if (name === 'bash') {
    const git = findExecutable('git', forbiddenRoot);
    if (git && path.basename(git).toLowerCase() === 'git.exe') {
      const directory = path.dirname(git);
      if (['cmd', 'bin'].includes(path.basename(directory).toLowerCase())) {
        const prefix = path.dirname(directory);
        const root = /^mingw(?:32|64)$/i.test(path.basename(prefix)) ? path.dirname(prefix) : prefix;
        yield path.join(root, 'bin', 'bash.exe');
      }
    }
    yield 'C:/Program Files/Git/bin/bash.exe';
  }
  if (name === 'pwsh') {
    const inbox = usableExecutable(path.join(process.env.SystemRoot || '',
      'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe'), forbiddenRoot);
    if (!inbox) return;
    // Query only the current user's registered Microsoft Store PowerShell package.
    const query = [
      "$ErrorActionPreference = 'Stop'",
      '[Console]::OutputEncoding = [Text.UTF8Encoding]::new($false)',
      "Import-Module -Name (Join-Path $PSHOME 'Modules/Appx/Appx.psd1')",
      "Appx\\Get-AppxPackage -Name Microsoft.PowerShell | Where-Object PackageFamilyName -eq 'Microsoft.PowerShell_8wekyb3d8bbwe' | ForEach-Object { $_.InstallLocation }",
    ].join('\n');
    const result = spawnSync(inbox, ['-NoLogo', '-NoProfile', '-NonInteractive', '-Command', query], {
      cwd: path.dirname(inbox), encoding: 'utf8', shell: false, windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'], timeout: 10000, maxBuffer: 64 * 1024,
    });
    if (result.status === 0) {
      for (const location of result.stdout.split(/\r?\n/).map(line => line.trim())) {
        if (path.isAbsolute(location)) yield path.join(location, 'pwsh.exe');
      }
    }
  }
}

export function findExecutable(name, forbiddenRoot) {
  const override = process.env[`WRP_LINT_${name.toUpperCase()}`];
  if (override) return usableExecutable(override, forbiddenRoot);
  for (const candidate of executableCandidates(name, forbiddenRoot)) {
    const resolved = usableExecutable(candidate, forbiddenRoot);
    if (resolved) return resolved;
  }
}
```

## File: `src/runtime-cache.mjs`

```javascript
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { createHash, randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ownRoot = fileURLToPath(new URL('../', import.meta.url));
const specs = ['typescript', '@types/node/package.json', 'undici-types/package.json', 'jsonc-parser', 'luaparse', 'markdownlint/sync', 'saxes', 'js-yaml', 'smol-toml', 'parse5', 'css-tree', 'libpg-query', 'libpg-query/wasm/libpg-query.js', 'libpg-query/wasm/libpg-query.wasm'];
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const canonical = value => JSON.stringify(value, (_, item) => item && !Array.isArray(item) && typeof item === 'object' ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b))) : item);
const inside = (root, candidate) => { const rel = path.relative(root, candidate); return !path.isAbsolute(rel) && rel !== '..' && !rel.startsWith(`..${path.sep}`); };
function localAbsolute(value) {
  if (typeof value !== 'string' || !path.isAbsolute(value) || /^(?:\\\\|\/\/)/.test(value) || value.includes('\0')) throw new Error('Runtime cache requires a local absolute path');
  if (process.platform === 'win32' && value.slice(2).includes(':')) throw new Error('Runtime cache alternate streams are forbidden');
  return path.resolve(value);
}
function physical(target, { missing = false } = {}) {
  target = localAbsolute(target);
  const root = path.parse(target).root;
  let current = root;
  for (const part of path.relative(root, target).split(path.sep).filter(Boolean)) {
    current = path.join(current, part);
    try { if (fs.lstatSync(current).isSymbolicLink()) throw new Error('Runtime paths must not contain symlinks or junctions'); }
    catch (error) { if (missing && error.code === 'ENOENT') return target; throw error; }
  }
  return target;
}
function relativeFile(root, relative) {
  if (typeof relative !== 'string' || !relative || relative.includes('\\') || relative.includes(':') || relative.split('/').some(part => !part || part === '.' || part === '..')) throw new Error('Invalid runtime receipt path');
  const target = path.resolve(root, ...relative.split('/'));
  if (!inside(root, target)) throw new Error('Runtime file escapes its root');
  physical(target);
  if (!fs.statSync(target).isFile()) throw new Error('Runtime entry is not a regular file');
  return target;
}
function json(file, limit = 1024 * 1024) {
  if (fs.statSync(file).size > limit) throw new Error('Runtime metadata exceeds its limit');
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}
function hashFile(file, kind) {
  if (fs.statSync(file).size > (kind === 'shellcheck' ? 40 : 16) * 1024 * 1024) throw new Error('Runtime entry exceeds its limit');
  return digest(fs.readFileSync(file));
}
export function defaultCacheRoot({ env = process.env, platform = process.platform, home = os.homedir() } = {}) {
  if (env.WRP_LINT_RUNTIME_CACHE) return localAbsolute(env.WRP_LINT_RUNTIME_CACHE);
  const base = platform === 'win32' ? (env.LOCALAPPDATA || path.join(home, 'AppData', 'Local')) : platform === 'darwin' ? path.join(home, 'Library', 'Caches') : (env.XDG_CACHE_HOME || path.join(home, '.cache'));
  return localAbsolute(path.join(base, 'WinRecoveryProjectLinter', 'runtimes'));
}
export function runtimeContract(packageDirectory = ownRoot) {
  const pkg = json(path.join(packageDirectory, 'package.json'));
  const lock = json(path.join(packageDirectory, 'package-lock.json'));
  if (lock.lockfileVersion !== 3 || !lock.packages?.[''] || canonical(lock.packages[''].dependencies) !== canonical(pkg.dependencies)) throw new Error('Runtime lock does not match product dependencies');
  const distribution = json(path.join(packageDirectory, 'npm-shrinkwrap.json'));
  if (canonical(lock) !== canonical(distribution)) throw new Error('Distribution and source locks disagree');
  const packages = Object.fromEntries(Object.entries(lock.packages).filter(([name]) => name));
  for (const entry of Object.values(packages)) {
    if (typeof entry.integrity !== 'string' || !/^https:\/\/registry\.npmjs\.org\//.test(entry.resolved || '')) throw new Error('Runtime dependencies must have locked public registry integrity');
  }
  for (const [name, version] of Object.entries(pkg.dependencies)) if (packages[`node_modules/${name}`]?.version !== version) throw new Error('Runtime dependency pin differs from lock');
  const graph = { lockfileVersion: 3, dependencies: pkg.dependencies, packages };
  return { fingerprint: digest(canonical(graph)), graph, pkg, lock, pins: Object.fromEntries(Object.entries(packages).filter(([name]) => !name.slice(13).includes('/node_modules/')).map(([name, entry]) => [name.slice(13), entry.version])) };
}
export function runtimeLocation(kind, { packageDirectory = ownRoot, cacheRoot = defaultCacheRoot(), pythonIdentity } = {}) {
  if (!['node', 'blinter', 'shellcheck'].includes(kind)) throw new Error('Unknown runtime kind');
  const contract = runtimeContract(packageDirectory);
  const identity = kind === 'node' ? contract.fingerprint : kind === 'blinter' ? digest(fs.readFileSync(path.join(packageDirectory, 'config/blinter-requirements.txt'))) : 'shellcheck-0.11.0-8a4e35ab0b331c85d73567b12f2a444df187f483e5079ceffa6bda1faa2e740e';
  if (kind === 'blinter' && (typeof pythonIdentity !== 'string' || !pythonIdentity)) throw new Error('Blinter requires an observed Python runtime identity');
  const key = `${kind}-${digest(canonical({ identity, platform: process.platform, arch: process.arch, nodeMajor: kind === 'node' ? process.versions.node.split('.')[0] : undefined, pythonIdentity: kind === 'blinter' ? pythonIdentity : undefined }))}`;
  const base = localAbsolute(cacheRoot);
  return { base, key, root: path.join(base, key), kind, contract };
}
function packageInfo(root, specifier, pins) {
  const req = createRequire(path.join(root, 'package.json'));
  const entry = req.resolve(specifier);
  const modules = path.join(root, 'node_modules');
  if (!inside(modules, entry)) throw new Error('Runtime resolution escaped the selected node_modules');
  physical(entry);
  const name = specifier.startsWith('@') ? specifier.split('/').slice(0, 2).join('/') : specifier.split('/')[0];
  const metadata = relativeFile(root, `node_modules/${name}/package.json`);
  const pkg = json(metadata);
  if (!pins[name] || pkg.name !== name || pkg.version !== pins[name]) throw new Error(`Runtime ${name} does not match its exact lock pin`);
  return { entry, metadata };
}
function requiredFiles(kind, root, contract) {
  if (kind === 'node') {
    const records = new Set(['package.json', 'package-lock.json', 'npm-shrinkwrap.json']);
    for (const specifier of specs) for (const file of Object.values(packageInfo(root, specifier, contract.pins))) records.add(path.relative(root, file).split(path.sep).join('/'));
    return [...records].sort();
  }
  if (kind === 'shellcheck') return ['shellcheck.exe'];
  const site = process.platform === 'win32' ? 'Lib/site-packages' : fs.readdirSync(path.join(root, 'lib')).filter(name => /^python3\.(?:1[1-5])$/.test(name)).map(name => `lib/${name}/site-packages`)[0];
  if (!site) throw new Error('Cannot locate supported Blinter site-packages');
  return [process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python', 'pyvenv.cfg', `${site}/blinter/__main__.py`, `${site}/blinter-1.1.66.dist-info/METADATA`, `${site}/charset_normalizer-3.5.2.dist-info/METADATA`];
}
function verify(location) {
  physical(location.root);
  const receipt = json(relativeFile(location.root, 'READY.json'), 128 * 1024);
  if (receipt.schemaVersion !== 1 || receipt.kind !== location.kind || receipt.key !== location.key || !receipt.files || Array.isArray(receipt.files) || Object.keys(receipt.files).length > 128) throw new Error('Runtime READY receipt does not match the selected contract');
  if (location.kind === 'node' && runtimeContract(location.root).fingerprint !== location.contract.fingerprint) throw new Error('Cached runtime dependency graph differs');
  const required = requiredFiles(location.kind, location.root, location.contract);
  if (Object.keys(receipt.files).length !== required.length || Object.keys(receipt.files).some(file => !required.includes(file))) throw new Error('Runtime receipt file set differs from the fixed capability set');
  for (const relative of required) {
    const file = relativeFile(location.root, relative);
    if (!/^[a-f0-9]{64}$/.test(receipt.files[relative] || '') || hashFile(file, location.kind) !== receipt.files[relative]) throw new Error(`Runtime integrity mismatch: ${relative}`);
  }
  return { ...location, receipt };
}
export function verifiedRuntime(kind, options) { return verify(runtimeLocation(kind, options)); }
export function resolveLibrary(specifier, { packageDirectory = ownRoot, cacheRoot = defaultCacheRoot() } = {}) {
  if (!specs.includes(specifier)) throw new Error('Library is outside the fixed linter capability set');
  const contract = runtimeContract(packageDirectory);
  try {
    const selected = verifiedRuntime('node', { packageDirectory, cacheRoot });
    return packageInfo(selected.root, specifier, contract.pins).entry;
  } catch (durableError) {
    // An explicitly prepared developer/older local installation remains a
    // compatibility fallback, never a parent/project node_modules lookup.
    try { return packageInfo(packageDirectory, specifier, contract.pins).entry; }
    catch { throw durableError; }
  }
}
const imports = new Map();
export async function importLibrary(specifier) {
  if (!imports.has(specifier)) {
    const pending = import(pathToFileURL(resolveLibrary(specifier)).href);
    imports.set(specifier, pending);
    pending.catch(() => imports.delete(specifier));
  }
  return imports.get(specifier);
}
export function localTool(relative, packageDirectory = ownRoot) {
  return relativeFile(packageDirectory, relative);
}

// Called only by explicit setup. A caller-supplied builder is product code,
// never a command string or a path from the inspected project's config.
export async function prepareRuntime(kind, builder, options = {}) {
  const location = runtimeLocation(kind, options);
  try { return { ...verify(location), reused: true }; } catch { /* Explicit setup may repair an incomplete/corrupt product cache. */ }
  physical(location.base, { missing: true });
  await fsp.mkdir(location.base, { recursive: true });
  physical(location.base);
  const lock = path.join(location.base, `${location.key}.setup-lock`);
  await fsp.mkdir(lock); // Fail clearly on another concurrent setup, never kill it.
  const stage = path.join(location.base, `.staging-${kind}-${randomUUID()}`);
  try {
    await fsp.mkdir(stage);
    await builder(stage, location.contract);
    physical(stage);
    const records = {};
    for (const relative of requiredFiles(kind, stage, location.contract)) records[relative] = hashFile(relativeFile(stage, relative), kind);
    const receipt = { schemaVersion: 1, kind, key: location.key, preparedAt: new Date().toISOString(), integrityScope: 'Exact lock graph/pins and selected entry/package metadata hashes; not every transitive source file and not an authenticity attestation.', files: records };
    await fsp.writeFile(path.join(stage, 'READY.json'), JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx' });
    verify({ ...location, root: stage });
    try {
      physical(location.root);
      await fsp.rename(location.root, path.join(location.base, `.rejected-${location.key}-${randomUUID()}`));
    } catch (error) { if (error.code !== 'ENOENT') throw error; }
    await fsp.rename(stage, location.root);
    return { ...verify(location), reused: false };
  } finally {
    if (inside(location.base, stage) && path.basename(stage).startsWith('.staging-')) { physical(stage, { missing: true }); await fsp.rm(stage, { recursive: true, force: true }); }
    physical(lock); await fsp.rmdir(lock);
  }
}
```

## File: `src/setup.mjs`

```javascript
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { run, findExecutable } from './process.mjs';
import { inventory, readConfig, probe, packageRoot, pythonRuntime } from './engine.mjs';
import { prepareRuntime } from './runtime-cache.mjs';

const shellcheckUrl = 'https://github.com/koalaman/shellcheck/releases/download/v0.11.0/shellcheck-v0.11.0.zip';
const shellcheckSha256 = '8a4e35ab0b331c85d73567b12f2a444df187f483e5079ceffa6bda1faa2e740e';

export async function setup(root, { detected = false, types, cacheRoot, sqlDialect, execute = run, fetchResource = fetch, toolProbe = probe } = {}) {
  if (!detected && !types?.length) throw new Error('setup requires --detected or --types <comma-separated IDs>');
  const config = await readConfig(root);
  const inv = await inventory(root, config);
  const selected = types || [...new Set(inv.files.map(file => file.type).filter(Boolean))].filter(type => !config.types || config.types.includes(type));
  const results = [];
  const prepared = {};
  const errorText = error => String(error instanceof Error ? error.message : error).slice(0, 4096);
  let nodeSetupError;
  if (selected.some(type => ['javascript', 'typescript', 'lua', 'json', 'markdown', 'xml', 'html', 'css', 'yaml', 'toml', 'sql'].includes(type))) {
    try {
    prepared.node = await prepareRuntime('node', async (stage, contract) => {
      const npm = path.join(path.dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js');
      try { await fs.access(npm); } catch { throw new Error('Node npm-cli.js is unavailable beside Node. Install Node with npm, then rerun explicit setup.'); }
      await fs.writeFile(path.join(stage, 'package.json'), JSON.stringify({ name: contract.pkg.name, version: contract.pkg.version, private: true, dependencies: contract.pkg.dependencies }) + '\n');
      for (const name of ['package-lock.json', 'npm-shrinkwrap.json']) await fs.copyFile(path.join(packageRoot, name), path.join(stage, name));
      const install = await execute(process.execPath, [npm, 'ci', '--ignore-scripts', '--no-audit', '--no-fund', '--registry=https://registry.npmjs.org/', `--userconfig=${path.join(packageRoot, 'config/npmrc')}`, `--globalconfig=${path.join(packageRoot, 'config/global-npmrc')}`], { cwd: stage, timeout: 180000 });
      if (install.code !== 0) throw new Error(`Pinned dependency setup failed: ${install.stderr || install.stdout}`);
    }, { cacheRoot });
    } catch (error) { nodeSetupError = errorText(error); }
  }
  for (const type of selected) {
    let setupError = ['javascript', 'typescript', 'lua', 'json', 'markdown', 'xml', 'html', 'css', 'yaml', 'toml', 'sql'].includes(type) ? nodeSetupError : undefined;
    try {
    if (type === 'batch') {
      const python = await pythonRuntime(inv.root, execute);
      prepared.batch = await prepareRuntime('blinter', async stage => {
        const venv = await execute(python.executable, ['-I', '-m', 'venv', '--copies', stage], { cwd: packageRoot, timeout: 120000 });
        if (venv.code !== 0) throw new Error(venv.stderr);
        const executable = path.join(stage, process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python');
        const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith('PIP_')));
        env.PIP_CONFIG_FILE = process.platform === 'win32' ? 'NUL' : '/dev/null';
        const install = await execute(executable, ['-I', '-m', 'pip', '--isolated', 'install', '--index-url=https://pypi.org/simple', '--disable-pip-version-check', '--no-cache-dir', '--no-input', '--only-binary=:all:', '--require-hashes', '-r', fileURLToPath(new URL('../config/blinter-requirements.txt', import.meta.url))], { cwd: packageRoot, timeout: 180000, env });
        if (install.code !== 0) throw new Error(install.stderr || install.stdout);
      }, { cacheRoot, pythonIdentity: python.identity });
    } else if (type === 'bash' && process.platform === 'win32') {
      if (!findExecutable('bash', inv.root)) throw new Error('Bash must already exist before explicit ShellCheck setup');
      const pwsh = findExecutable('pwsh', inv.root);
      if (!pwsh) throw new Error('pwsh is required to extract the verified ShellCheck archive');
      prepared.bash = await prepareRuntime('shellcheck', async destination => {
      const response = await fetchResource(shellcheckUrl, { signal: AbortSignal.timeout(60000) });
      if (!response.ok) throw new Error(`ShellCheck download HTTP ${response.status}`);
      if (Number(response.headers.get('content-length')) > 30 * 1024 * 1024) throw new Error('ShellCheck archive too large');
      const chunks = []; let length = 0;
      for await (const chunk of response.body) { length += chunk.length; if (length > 30 * 1024 * 1024) throw new Error('ShellCheck archive too large'); chunks.push(chunk); }
      const data = Buffer.concat(chunks);
      if (data.length > 30 * 1024 * 1024 || createHash('sha256').update(data).digest('hex') !== shellcheckSha256) throw new Error('ShellCheck archive SHA-256 mismatch');
      const archive = path.join(destination, 'shellcheck-v0.11.0.zip');
      await fs.writeFile(archive, data);
      const extract = await execute(pwsh, ['-NoProfile', '-NonInteractive', '-File', path.join(packageRoot, 'adapters/extract-shellcheck.ps1'), archive, destination], { cwd: packageRoot });
      if (extract.code !== 0) throw new Error(extract.stderr);
      await fs.unlink(archive);
      }, { cacheRoot });
    }
    } catch (error) { setupError = errorText(error); }
    let state;
    try { state = await toolProbe(type, inv.root, execute, { cacheRoot, sqlDialect: sqlDialect ?? config.sqlDialect }); }
    catch (error) { state = { available: false, reason: `Availability check failed: ${errorText(error)}` }; }
    const runtime = prepared[type] || (['javascript', 'typescript', 'lua', 'json', 'markdown', 'xml', 'html', 'css', 'yaml', 'toml', 'sql'].includes(type) ? prepared.node : undefined);
    const setupSucceeded = !setupError && state.available === true;
    const action = setupError ? 'setup failed' : runtime ? (state.available ? (runtime.reused ? 'verified durable runtime reused' : 'prepared durable runtime') : 'runtime prepared; adapter unavailable') : (state.available ? 'already available' : 'manual runtime required');
    results.push({ type, action, runtimeRoot: runtime?.root, ...state, setupSucceeded, ...(setupError ? { setupError } : {}) });
  }
  return { selected, results, exitCode: results.some(item => !item.available || !item.setupSucceeded) ? 2 : 0, note: 'Free public dependencies only. Explicit setup prepares a verified per-user runtime outside the plugin cache. Setup success and existing adapter availability are reported separately. No global configuration or target source changes.' };
}
```

## File: `src/sql-process.mjs`

```javascript
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { resolveLibrary } from './runtime-cache.mjs';

const adapter = fileURLToPath(new URL('./sql-worker.mjs', import.meta.url));
const assets = [
  ['libpg-query', 'bc7cd18b2748615eaf6f0be57f1fd91f6fdbf57494b602f2306552d445bdcd9c'],
  ['libpg-query/wasm/libpg-query.js', '0be822ba6736432b6ff197c722c9ee522285cd2baf1e9939555b4d72f4cfd811'],
  ['libpg-query/wasm/libpg-query.wasm', '355c489d8b0bf2bac28b48408f656e818852d7000e1e66a67503ad2bc7cc6062']
];
export function verifySqlAssets(options) {
  let wasm;
  for (const [specifier, expected] of assets) {
    const bytes = fs.readFileSync(resolveLibrary(specifier, options));
    if (createHash('sha256').update(bytes).digest('hex') !== expected) throw new Error(`Pinned PostgreSQL asset mismatch: ${specifier}`);
    if (specifier.endsWith('.wasm')) wasm = bytes;
  }
  return { wasm };
}
export async function analyzeSql(files, { execute, executable, cwd }) {
  const diagnostics = [];
  for (const { file, content } of files) {
    try {
      const result = await execute(executable, ['--max-old-space-size=128', adapter], {
        cwd, input: JSON.stringify({ content }), timeout: 30000, limit: 256 * 1024
      });
      if (result.code !== 0) throw new Error('PostgreSQL parser process failed');
      const data = JSON.parse(result.stdout);
      if (!Array.isArray(data.diagnostics) || data.diagnostics.length > 64) throw new Error('Invalid SQL parser report');
      for (const item of data.diagnostics) {
        if (!item || typeof item.rule !== 'string' || !/^SQL-[a-z-]+$/.test(item.rule) ||
            typeof item.message !== 'string' || item.message.length > 4096 ||
            !Number.isInteger(item.line) || item.line < 1 || !Number.isInteger(item.column) || item.column < 1 ||
            (item.incomplete !== undefined && item.incomplete !== true)) throw new Error('Invalid SQL parser diagnostic');
      }
      diagnostics.push(...data.diagnostics.map(item => ({ ...item, file, severity: 'error' })));
    } catch (error) {
      diagnostics.push({ file, rule: 'SQL-parser', message: `PostgreSQL check incomplete: ${String(error.message).slice(0, 1024)}`, line: 1, column: 1, severity: 'error', incomplete: true });
    }
  }
  return diagnostics;
}
```

## File: `src/sql-worker.mjs`

```javascript
import { importLibrary } from './runtime-cache.mjs';
import { verifySqlAssets } from './sql-process.mjs';

const diagnostics = [];
function position(text, cursor = 0) {
  const prefix = Array.from(text).slice(0, Math.max(0, cursor)).join('');
  const lines = prefix.split(/\r\n|\r|\n/);
  return { line: lines.length, column: lines.at(-1).length + 1 };
}
function add(rule, message, location = { line: 1, column: 1 }, incomplete = false) {
  if (diagnostics.length >= 63) throw new Error('SQL diagnostic limit exceeded');
  diagnostics.push({ rule, message: message.slice(0, 4096), ...location, ...(incomplete ? { incomplete: true } : {}) });
}
function hasDynamicSql(node) {
  if (!node || typeof node !== 'object') return false;
  return Object.entries(node).some(([key, value]) =>
    key === 'PLpgSQL_stmt_dynexecute' || key === 'PLpgSQL_stmt_dynfors' ||
    (key === 'dynquery' && value != null) || hasDynamicSql(value));
}
try {
  const chunks = []; let bytes = 0;
  for await (const chunk of process.stdin) {
    bytes += chunk.length;
    if (bytes > 16 * 1024 * 1024) throw new Error('SQL input protocol limit exceeded');
    chunks.push(chunk);
  }
  const request = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  if (!request || typeof request.content !== 'string' || Buffer.byteLength(request.content) > 2 * 1024 * 1024) throw new Error('Invalid SQL source snapshot');
  const text = request.content.replace(/^\uFEFF/, '');
  if (text.includes('\0')) add('SQL-postgresql-syntax', 'PostgreSQL source cannot contain a NUL character', position(text, Array.from(text.slice(0, text.indexOf('\0'))).length));
  else {
    globalThis.fetch = () => { throw new Error('Network is forbidden in SQL parsing'); };
    const { wasm } = verifySqlAssets();
    const { default: pg } = await importLibrary('libpg-query');
    await pg.loadModule({ wasm });
    let tree;
    try { tree = await pg.parse(text); }
    catch (error) {
      if (!pg.hasSqlDetails(error)) throw error;
      add('SQL-postgresql-syntax', `PostgreSQL 18 grammar: ${error.message}`, position(text, error.sqlDetails.cursorPosition));
    }
    if (tree) {
      if (tree.version !== 180004 || !Array.isArray(tree.stmts)) throw new Error('Unexpected PostgreSQL grammar version/report');
      const plpgsql = [];
      for (const statement of tree.stmts) {
        const routine = statement.stmt?.CreateFunctionStmt;
        const block = statement.stmt?.DoStmt;
        if (!routine && !block) continue;
        const options = routine?.options || block.args;
        const defs = options.map(item => item.DefElem);
        const language = defs.find(item => item.defname === 'language')?.arg?.String?.sval?.toLowerCase() || (block ? 'plpgsql' : undefined);
        // stmt_location is a UTF-8 byte offset, not a JavaScript string offset.
        const prefix = Buffer.from(text).subarray(0, statement.stmt_location || 0).toString('utf8');
        const location = position(prefix, Array.from(prefix).length);
        if (language === 'plpgsql') {
          const start = statement.stmt_location || 0;
          const fragment = Buffer.from(text).subarray(start, statement.stmt_len ? start + statement.stmt_len : undefined).toString('utf8');
          plpgsql.push({ fragment, location, charBase: Array.from(prefix).length });
        }
        else if (language === 'sql') {
          const bodies = defs.find(item => item.defname === 'as')?.arg?.List?.items || [];
          for (const body of bodies) {
            if (typeof body.String?.sval !== 'string') throw new Error('Unknown SQL routine body shape');
            try {
              const nested = await pg.parse(body.String.sval);
              if (nested.stmts.some(item => item.stmt?.CreateFunctionStmt || item.stmt?.DoStmt)) add('SQL-language', 'Nested routine bodies inside a SQL-language string require separate coverage', location, true);
            }
            catch (error) {
              if (!pg.hasSqlDetails(error)) throw error;
              const inner = position(body.String.sval, error.sqlDetails.cursorPosition);
              add('SQL-routine-syntax', `SQL-language body (${inner.line}:${inner.column}; outer statement anchor): ${error.message}`, location);
            }
          }
          if (!bodies.length && !routine?.sql_body) add('SQL-language', 'SQL routine body could not be checked', location, true);
        } else add('SQL-language', `Routine language ${language || 'unknown'} is outside PostgreSQL SQL/PLpgSQL syntax coverage`, location, true);
      }
      for (const { fragment, location, charBase } of plpgsql) {
        try {
          const parsed = await pg.parsePlPgSQL(fragment);
          if (!Array.isArray(parsed.plpgsql_funcs) || parsed.plpgsql_funcs.length !== 1) throw new Error('PL/pgSQL parser did not check the declared routine/block');
          if (hasDynamicSql(parsed)) add('SQL-dynamic', 'PL/pgSQL generates dynamic SQL; the generated query text cannot be certified by syntax-only parsing', location, true);
        } catch (error) {
          // The pinned PLpgSQL API exposes known syntax-error text as plain Error,
          // unlike parse()'s SqlError. Unknown errors/traps remain unavailable.
          const structured = pg.hasSqlDetails(error);
          if (!structured && !/^(?:syntax error(?:\s|$)|missing expression at or near(?:\s|$))/.test(error.message)) throw error;
          add('SQL-plpgsql-syntax', `PL/pgSQL grammar${structured ? '' : ' (outer statement anchor; parser supplies no cursor)'}: ${error.message}`, structured ? position(text, charBase + error.sqlDetails.cursorPosition) : location);
        }
      }
    }
  }
} catch (error) {
  add('SQL-parser', `Parser unavailable: ${String(error.message).slice(0, 1024)}`, undefined, true);
}
process.stdout.write(JSON.stringify({ diagnostics }) + '\n');
```
