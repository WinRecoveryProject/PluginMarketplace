import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const catalogDirectory = new URL('.claude-plugin/', root);
const catalogFile = new URL('marketplace.json', catalogDirectory);
const portablePackages = [
  'winrecoveryproject-linter',
  'plugin-skill-studio',
  'powershell-workbench',
  'component-forge',
  'windows-dism-update-docs',
];

function pluginEntry(name) {
  const source = `./plugins/${name}`;
  const folder = new URL(`${source}/`, root);
  const manifest = JSON.parse(readFileSync(new URL('.codex-plugin/plugin.json', folder), 'utf8'));
  const integrations = ['.app.json', '.mcp.json', 'mcp.json', 'hooks/hooks.json', '.claude-plugin/plugin.json'];
  if (manifest.name !== name || manifest.apps || manifest.mcpServers || manifest.hooks ||
      integrations.some(file => existsSync(new URL(file, folder)))) {
    throw new Error(`${name} requires a separate Claude integration review.`);
  }
  if (typeof manifest.version !== 'string' || !manifest.version ||
      typeof manifest.description !== 'string' || !manifest.description ||
      !/^\.\/skills\/?$/.test(manifest.skills) || !existsSync(new URL('skills/', folder))) {
    throw new Error(`${name} is missing its canonical skill or version metadata.`);
  }
  return { name, version: manifest.version, description: manifest.description, source, strict: false };
}

try {
  const [mode, ...extra] = process.argv.slice(2);
  if (extra.length || !['--write', '--check'].includes(mode)) {
    throw new Error('Usage: node scripts/claude-marketplace.mjs --check|--write');
  }
  const marketplace = {
    name: 'winrecoveryproject-digital',
    description: 'WinRecoveryProject Digital plugins for local project and skill workflows.',
    owner: { name: 'Zilvereyes' },
    plugins: portablePackages.map(pluginEntry),
  };
  const expected = JSON.stringify(marketplace, null, 2) + '\n';
  if (mode === '--write') {
    mkdirSync(catalogDirectory, { recursive: true });
    writeFileSync(catalogFile, expected);
  }
  if (readFileSync(catalogFile, 'utf8').replace(/\r\n/g, '\n') !== expected) {
    throw new Error('Claude Marketplace metadata differs from the canonical package manifests.');
  }
  console.log(`${portablePackages.length} Claude Marketplace entries match their package manifests.`);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
