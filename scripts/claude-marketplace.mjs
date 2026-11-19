import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const catalogDirectory = new URL('.claude-plugin/', root);
const catalogFile = new URL('marketplace.json', catalogDirectory);
const portablePackages = [
  'plugin-skill-studio',
  'powershell-workbench',
  'component-forge',
  'windows-dism-update-docs',
  'codex-dev-workflows',
  'codex-engineering-guardrails',
  'coderabbit',
  'codex-process-jobs',
  'plugin-eval',
];
// Codex manifest descriptions that name Codex are reworded for the Claude catalog.
const claudeDescriptions = {
  'codex-dev-workflows': 'Reusable software-development workflows and platform guidance for coding agents.',
  'codex-engineering-guardrails': 'Skills-only bundle for scoped software implementation and independent code verification.',
  'coderabbit': 'AI-powered code review, powered by CodeRabbit.',
  'codex-process-jobs': 'Launch and manage durable, detached local process jobs.',
  'plugin-eval': 'Evaluate agent skills and plugins from chat with a beginner-friendly start command, local-first reports, token budget explanations, and guided benchmarking.',
};
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
  {
    name: 'skillquiver',
    manifestName: 'skillquiver',
    version: '2.2.0',
    description: 'Twenty-four Agent Skills shared by ChatGPT, Claude Code, and Codex.',
    author: { name: 'Drizzy07x' },
    repository: 'https://github.com/Drizzy07x/Skillquiver',
    license: 'MIT',
    licenseFile: 'LICENSE',
    source: {
      source: 'github',
      repo: 'Drizzy07x/Skillquiver',
      sha: '58ff9af6185ebc19980d483a02d3d74a8d1227dd',
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
  return { name, version: manifest.version, description: claudeDescriptions[name] ?? manifest.description, source, strict: false };
}

function standaloneEntry(name) {
  const source = './claude-plugins/' + name;
  const folder = new URL(source + '/', root);
  const ledger = JSON.parse(readFileSync(new URL('plugin-sources.lock.json', root), 'utf8'));
  const lock = ledger.claudePackages?.[name];
  const manifest = JSON.parse(readFileSync(new URL('.claude-plugin/plugin.json', folder), 'utf8'));
  if (manifest.name !== name || (lock?.upstreamVersion ?? lock?.version) !== ledger.plugins[name]?.version ||
      manifest.version !== lock?.version || !/^[0-9a-f]{40}$/.test(lock.commit) ||
      !lock.files || Object.keys(lock.files).length === 0) {
    throw new Error(`${name}: Claude metadata differs from its lock or Codex product version.`);
  }
  if (name === 'winrecoveryproject-devsuite' && !/^[0-9a-f]{64}$/.test(lock.zipSha256)) {
    throw new Error('DevSuite Claude release archive hash is missing.');
  }
  const checked = new Set();
  function verify(directory, prefix) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const relative = prefix + entry.name;
      const urlName = encodeURIComponent(entry.name);
      if (entry.isDirectory()) {
        verify(new URL(urlName + '/', directory), relative + '/');
      } else if (entry.isFile() && Object.hasOwn(lock.files, relative) &&
                 createHash('sha256').update(readFileSync(new URL(urlName, directory))).digest('hex') === lock.files[relative]) {
        checked.add(relative);
      } else {
        throw new Error(`${name}: Claude package member differs from the lock: ${relative}`);
      }
    }
  }
  verify(folder, '');
  if (checked.size !== Object.keys(lock.files).length) throw new Error(`${name}: Claude package members are missing.`);
  const excluded = ['.app.json', 'mcp.json', 'hooks', 'agents', '.codex-plugin', 'bin'];
  if (name !== 'winrecoveryproject-linter') excluded.push('commands');
  if (name !== 'onedrive') excluded.push('.mcp.json');
  for (const member of excluded) {
    if (existsSync(new URL(member, folder))) throw new Error(`${name}: Unexpected Claude component: ${member}`);
  }
  if (name === 'winrecoveryproject-linter') {
    const canonical = ledger.plugins[name];
    const launcher = 'scripts/wrp-lint.mjs';
    if (lock.commit !== canonical.commit || lock.files[launcher] !== canonical.files['bin/wrp-lint.mjs'] ||
        JSON.stringify(manifest.commands) !== JSON.stringify(['./commands/wrp-lint.md']) ||
        !lock.files['commands/wrp-lint.md']) {
      throw new Error('Linter: Claude must expose its locked launcher through the declared command.');
    }
    for (const file of ['skills/lint-project/SKILL.md', 'skills/setup-linters/SKILL.md']) {
      const body = readFileSync(new URL(file, folder), 'utf8');
      if (!body.includes(launcher) || body.includes('bin/wrp-lint.mjs')) {
        throw new Error('Linter: Claude skill references an invalid launcher.');
      }
    }
  }
  if (name === 'zilvereyes-context-handoff') {
    const helper = 'skills/zilvereyes-context-handoff/scripts/context_handoff.py';
    if (lock.files[helper] !== ledger.plugins[name]?.files[helper]) {
      throw new Error('Context Handoff: the packet helper differs from the Codex package.');
    }
  }
  if (name === 'onedrive') {
    const provenance = JSON.parse(readFileSync(new URL('plugins/onedrive/PROVENANCE.json', root), 'utf8'));
    const mcp = JSON.parse(readFileSync(new URL('.mcp.json', folder), 'utf8'));
    const readme = readFileSync(new URL('README.md', folder), 'utf8');
    if (Object.keys(manifest).some(key => /^privacyPolicyUrl$/i.test(key)) ||
        !readme.includes('/docs/cloudstorage-privacy.md)')) {
      throw new Error('OneDrive: link the privacy policy from the Claude README.');
    }
    const servers = mcp?.mcpServers;
    const onedrive = servers?.onedrive;
    if (Object.keys(mcp ?? {}).length !== 1 || Object.keys(servers ?? {}).length !== 1 ||
        Object.keys(onedrive ?? {}).length !== 2 || onedrive?.type !== 'http' ||
        onedrive?.url !== provenance.canonicalMcp ||
        lock.files['assets/icon.png'] !== ledger.plugins[name]?.files['assets/logo-512.png']) {
      throw new Error('OneDrive: Claude package must preserve the canonical HTTP endpoint and logo.');
    }
  }
  return { name, version: manifest.version, description: manifest.description, source };
}

async function publishedText(base, path) {
  const response = await fetch(`${base}/${path}`, { redirect: 'error', signal: AbortSignal.timeout(12000) });
  if (!response.ok) throw new Error(`${path} is unavailable at ${base} (HTTP ${response.status}).`);
  const json = await response.text();
  if (Buffer.byteLength(json) > 256 * 1024) throw new Error(`${path} exceeds the metadata size limit.`);
  return json;
}

async function verifyPublisher({ name, manifestName, version, author, license, licenseFile, source }) {
  const repo = source.repo ?? new URL(source.url).pathname.slice(1).replace(/\.git$/, '');
  const path = source.path ?? '';
  const base = `https://raw.githubusercontent.com/${repo}/${source.sha}`;
  const manifestPath = [path, '.claude-plugin/plugin.json'].filter(Boolean).join('/');
  const [catalogText, manifestText, publisherLicense] = await Promise.all([
    publishedText(base, '.claude-plugin/marketplace.json'),
    publishedText(base, manifestPath),
    licenseFile ? publishedText(base, licenseFile) : undefined,
  ]);
  const catalog = JSON.parse(catalogText);
  const manifest = JSON.parse(manifestText);
  const matchesLicense = manifest.license === license || manifest.license === undefined &&
    license === 'MIT' && publisherLicense?.startsWith('MIT License') &&
    publisherLicense.includes(author.name) && publisherLicense.includes('Permission is hereby granted');
  const listing = catalog.plugins.find(entry => entry.name === name);
  if (listing?.source !== `./${path}` || (listing.version !== undefined && listing.version !== version) ||
      manifest.name !== manifestName || manifest.version !== version ||
      manifest.author?.name !== author.name || !matchesLicense) {
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
    plugins: [
      standaloneEntry('winrecoveryproject-linter'),
      ...portablePackages.map(pluginEntry),
      ...['winrecoveryproject-devsuite', 'zilvereyes-context-handoff', 'onedrive'].map(standaloneEntry),
      ...publisherPackages.map(({ manifestName, licenseFile, ...entry }) => entry),
    ],
  };
  const expected = JSON.stringify(marketplace, null, 2) + '\n';
  if (mode === '--write') {
    mkdirSync(catalogDirectory, { recursive: true });
    writeFileSync(catalogFile, expected);
  }
  if (readFileSync(catalogFile, 'utf8').replace(/\r\n/g, '\n') !== expected) {
    throw new Error('Claude Marketplace metadata differs from the canonical package manifests.');
  }
  console.log(`${marketplace.plugins.length} entries match the generated Claude catalog.`);
  if (mode === '--verify-sources') {
    await Promise.all(publisherPackages.map(verifyPublisher));
    console.log(`${publisherPackages.length} publisher catalogs and manifests match their pinned Claude references.`);
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
