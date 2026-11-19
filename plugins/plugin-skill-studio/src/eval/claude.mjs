export const claudeManifestPath = '.claude-plugin/plugin.json';

const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const entries = value => value === undefined ? [] : Array.isArray(value) ? value : [value];
const immediate = name => !name.includes('/');
const markdown = name => /\.md$/i.test(name);
const bundle = name => /\.(?:mcpb|dxt)$/i.test(name);
const MAX_DECLARATIONS = 256;

function relativePath(value, allowRoot = false) {
  if (allowRoot && (value === '.' || value === './')) return '';
  if (typeof value !== 'string' || !value.startsWith('./') || /[\\:\p{Cc}]/u.test(value)) return null;
  const inner = value.slice(2).replace(/\/$/, '');
  return inner && inner.split('/').every(part => part && part !== '.' && part !== '..') ? inner : null;
}

export async function inspectClaude(manifest, { files, directories, readText, issue }) {
  const members = new Set(files.map(file => file.rel));
  const skills = new Set();
  const commands = new Set();
  const agents = new Set();
  const hookEvents = new Set();
  const mcpServers = new Set();
  const mcpBundles = new Set();
  const remoteBundles = new Set();
  const readConfigs = new Set();
  const unverified = new Set();

  function bounded(values, kind) {
    if (values.length > MAX_DECLARATIONS) issue('manifest.component-limit', `Claude ${kind} exceeds ${MAX_DECLARATIONS} declarations.`);
    return new Set(values.slice(0, MAX_DECLARATIONS));
  }

  function addSkills(directory) {
    const prefix = directory ? directory + '/' : '';
    let found = false;
    for (const file of members) {
      if (!file.startsWith(prefix) || !/^(?:[^/]+\/)?SKILL\.md$/.test(file.slice(prefix.length))) continue;
      skills.add(file);
      found = true;
    }
    return found;
  }

  function addDocument(kind, value, result, allowDirectory = kind === 'commands') {
    const relative = relativePath(value);
    if (relative === null) {
      issue('reference.escape', `Claude ${kind} requires a contained ./ path.`);
    } else if (members.has(relative) && markdown(relative)) {
      result.add(relative);
    } else if (allowDirectory && directories.has(relative)) {
      const paths = files.filter(file => file.rel.startsWith(relative + '/') &&
        immediate(file.rel.slice(relative.length + 1)) && markdown(file.rel));
      for (const file of paths) result.add(file.rel);
      if (!paths.length) issue('reference.missing', 'Claude command directory contains no Markdown commands.', relative);
    } else {
      issue('reference.missing', `Claude ${kind} reference is missing or is not a Markdown file.`, relative);
    }
  }

  function addMapping(kind, mapping, relative) {
    const output = kind === 'hooks' ? hookEvents : mcpServers;
    for (const [name, value] of bounded(Object.entries(mapping), kind)) {
      if (kind === 'hooks') {
        if (!Array.isArray(value) || value.some(group => !object(group) || !Array.isArray(group.hooks) ||
          group.hooks.some(handler => !object(handler) || typeof handler.type !== 'string' || !handler.type.trim()))) {
          issue('manifest.component', 'Claude hook events require matcher groups and typed handlers.', relative);
        } else if (value.some(group => group.hooks.length)) output.add(name);
      } else if (!object(value) || !Object.keys(value).length) {
        issue('manifest.component', 'Claude MCP servers require a non-empty configuration object.', relative);
      } else {
        output.add(name);
      }
    }
  }

  async function addConfig(kind, declaration, implicit = false) {
    if (object(declaration)) {
      addMapping(kind, declaration);
      return;
    }
    if (typeof declaration === 'string' && kind === 'mcpServers' && /^https:\/\//i.test(declaration)) {
      let url;
      try { url = new URL(declaration); } catch { /* Report the invalid value below. */ }
      if (url && !url.username && !url.password && bundle(url.pathname)) {
        // Keep only a countable reference. URLs may carry credentials in query strings.
        remoteBundles.add(url.href);
        unverified.add('mcpBundles');
        return;
      }
    }
    const relative = implicit ? declaration : relativePath(declaration);
    if (relative === null) {
      issue('reference.escape', `Claude ${kind} requires a contained ./ path or a supported declaration.`);
      return;
    }
    const key = kind + '/' + relative;
    if (readConfigs.has(key)) return;
    readConfigs.add(key);
    if (!members.has(relative)) {
      issue('reference.missing', `Claude ${kind} configuration is missing.`, relative);
      return;
    }
    if (kind === 'mcpServers' && bundle(relative)) {
      mcpBundles.add(relative);
      unverified.add('mcpBundles');
      return;
    }
    if (!/\.json$/i.test(relative)) {
      issue('reference.invalid', `Claude ${kind} configuration requires a JSON file.`, relative);
      return;
    }
    try {
      const data = JSON.parse(await readText(relative));
      if (!object(data?.[kind])) throw new Error(`Expected the ${kind} mapping.`);
      addMapping(kind, data[kind], relative);
    } catch {
      issue('reference.invalid', `Claude ${kind} configuration requires a readable JSON ${kind} mapping.`, relative);
    }
  }

  if (directories.has('skills')) addSkills('skills');
  else if (manifest.skills === undefined && members.has('SKILL.md')) skills.add('SKILL.md');
  for (const value of bounded(entries(manifest.skills), 'skills')) {
    const relative = relativePath(value, true);
    if (relative === null) issue('reference.escape', 'Claude skills require a contained ./ directory.');
    else if (!addSkills(relative)) issue('reference.missing', 'Claude skill directory contains no SKILL.md entries.', relative);
  }
  for (const [kind, output] of [['commands', commands], ['agents', agents]]) {
    const value = manifest[kind];
    if (value === undefined) {
      for (const file of members) {
        if (file.startsWith(kind + '/') && markdown(file) && (kind === 'agents' || immediate(file.slice(kind.length + 1)))) {
          output.add(file);
        }
      }
    } else if (kind === 'commands' && object(value)) {
      for (const [name, command] of bounded(Object.entries(value), 'commands')) {
        if (object(command) && command.content === undefined && typeof command.source === 'string') {
          addDocument(kind, command.source, output, false);
        } else if (object(command) && command.source === undefined && typeof command.content === 'string' && command.content.trim()) {
          output.add(`inline:${name}`);
        } else issue('manifest.component', 'Claude named commands require exactly one source or inline content.');
      }
    } else {
      for (const declaration of bounded(entries(value), kind)) addDocument(kind, declaration, output);
    }
  }
  if (members.has('hooks/hooks.json')) await addConfig('hooks', 'hooks/hooks.json', true);
  if (members.has('.mcp.json')) await addConfig('mcpServers', '.mcp.json', true);
  for (const kind of ['hooks', 'mcpServers']) {
    for (const declaration of bounded(entries(manifest[kind]), kind)) await addConfig(kind, declaration);
  }

  const opaque = [
    ['outputStyles', 'output-styles'], ['lspServers', '.lsp.json'], ['settings', 'settings.json'],
    ['themes', 'themes'], ['workflows', 'workflows'], ['monitors', 'monitors'],
  ];
  for (const [field, conventional] of opaque) {
    if (manifest[field] !== undefined || directories.has(conventional) || members.has(conventional)) unverified.add(field);
  }
  for (let i = 0; i < remoteBundles.size; i++) mcpBundles.add(`remote:${i + 1}`);
  const inventories = { skills, commands, agents, hookEvents, mcpServers, mcpBundles, unverified };
  return Object.fromEntries(Object.entries(inventories).map(([kind, values]) => [kind, [...values].sort()]));
}
