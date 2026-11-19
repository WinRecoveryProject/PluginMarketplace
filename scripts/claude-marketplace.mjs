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
  'codex-dev-workflows',
  'codex-engineering-guardrails',
  'coderabbit',
];
const publisherPackages = [
  {
    name: 'vercel-plugin',
    manifestName: 'vercel',
    version: '0.56.0',
    description: 'Build and deploy web apps and agents',
    author: { name: 'Vercel' },
    repository: 'https://github.com/vercel/vercel-plugin',
    license: 'Apache-2.0',
    source: {
      source: 'github',
      repo: 'vercel/vercel-plugin',
      sha: 'e69e3ba0ac0d7d24033c5ba95041acc4fc656480',
    },
  },
  {
    name: 'skill-craft',
    manifestName: 'skill-craft',
    version: '1.3.0',
    description: 'Technical review, guided walkthroughs, and approval guidance for agent skills and plugins.',
    author: { name: 'Muhammad Bahaa' },
    repository: 'https://github.com/MuhammadBahaa/majarrah-marketplace',
    license: 'MIT',
    source: {
      source: 'git-subdir',
      url: 'https://github.com/MuhammadBahaa/majarrah-marketplace.git',
      path: 'plugins/skill-craft',
      sha: '4b22ec0e2645ce30059cfa7f35d37b03b60498f9',
    },
  },
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

async function publishedJson(base, path) {
  const response = await fetch(`${base}/${path}`, { redirect: 'error', signal: AbortSignal.timeout(12000) });
  if (!response.ok) throw new Error(`${path} is unavailable at ${base} (HTTP ${response.status}).`);
  const json = await response.text();
  if (Buffer.byteLength(json) > 256 * 1024) throw new Error(`${path} exceeds the metadata size limit.`);
  return JSON.parse(json);
}

async function verifyPublisher({ name, manifestName, version, author, license, source }) {
  const repo = source.repo ?? new URL(source.url).pathname.slice(1).replace(/\.git$/, '');
  const path = source.path ?? '';
  const base = `https://raw.githubusercontent.com/${repo}/${source.sha}`;
  const manifestPath = [path, '.claude-plugin/plugin.json'].filter(Boolean).join('/');
  const [catalog, manifest] = await Promise.all([
    publishedJson(base, '.claude-plugin/marketplace.json'),
    publishedJson(base, manifestPath),
  ]);
  const listing = catalog.plugins.find(entry => entry.name === name);
  if (listing?.source !== `./${path}` || (listing.version !== undefined && listing.version !== version) ||
      manifest.name !== manifestName || manifest.version !== version ||
      manifest.author?.name !== author.name || manifest.license !== license) {
    throw new Error(`${name} differs from the publisher catalog or manifest at ${source.sha}.`);
  }
}

try {
  const [mode, ...extra] = process.argv.slice(2);
  if (extra.length || !['--write', '--check', '--verify-sources'].includes(mode)) {
    throw new Error('Usage: node scripts/claude-marketplace.mjs --check|--write|--verify-sources');
  }
  const marketplace = {
    name: 'winrecoveryproject-digital',
    description: 'WinRecoveryProject Digital plugins for local project and skill workflows.',
    owner: { name: 'Zilvereyes' },
    plugins: [...portablePackages.map(pluginEntry), ...publisherPackages.map(({ manifestName, ...entry }) => entry)],
  };
  const expected = JSON.stringify(marketplace, null, 2) + '\n';
  if (mode === '--write') {
    mkdirSync(catalogDirectory, { recursive: true });
    writeFileSync(catalogFile, expected);
  }
  if (readFileSync(catalogFile, 'utf8').replace(/\r\n/g, '\n') !== expected) {
    throw new Error('Claude Marketplace metadata differs from the canonical package manifests.');
  }
  console.log(`${portablePackages.length} local packages and ${publisherPackages.length} pinned publisher references match the generated Claude catalog.`);
  if (mode === '--verify-sources') {
    await Promise.all(publisherPackages.map(verifyPublisher));
    console.log(`${publisherPackages.length} publisher catalogs and manifests match their pinned Claude references.`);
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
