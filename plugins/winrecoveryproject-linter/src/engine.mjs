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
  return { schemaVersion: 1, product: 'WinRecoveryProjectLinter', version: '0.1.3', root: inv.root, status: ['CLEAN', 'FINDINGS', 'INCOMPLETE'][exitCode], exitCode, discovery: inv.discovery, detected, selected, coverage, findings, incomplete, notices, limits: { maxFiles, maxBytesPerFile: maxBytes }, budget: { paidServices: false, telemetry: false } };
}
