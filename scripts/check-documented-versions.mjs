import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export function checkDocumentedVersions(readme, report) {
  if (report?.schemaVersion !== 1 || !Array.isArray(report.plugins) ||
      !report.plugins.length || report.plugins.length !== report.publicationsExpected) {
    throw new Error('Supply a Studio inventory-versions report with its full publication list.');
  }

  const prefix = '@winrecoveryproject-digital';
  const published = new Map();
  for (const { id, published: source } of report.plugins) {
    if (typeof id !== 'string' || !id.endsWith(prefix) || published.has(id)) {
      throw new Error('The report must list each WinRecoveryProject Digital identity once.');
    }
    if (source?.id !== id || typeof source.version !== 'string' || !source.version) {
      throw new Error(`${id}: published Git version is unverified.`);
    }
    published.set(id, source.version);
  }

  const rowPattern = /^\|[^|]+\|\s*`([^`]+)`\s*\|\s*`codex plugin add (\S+@winrecoveryproject-digital)`\s*\|\s*$/;
  const documented = new Set();
  const problems = [];
  for (const line of readme.split(/\r?\n/)) {
    const row = line.match(rowPattern);
    if (!row) continue;
    const [, version, id] = row;
    if (documented.has(id)) problems.push(`${id}: duplicate README row.`);
    documented.add(id);
    if (!published.has(id)) problems.push(`${id}: README row has no published Git entry.`);
    else if (version !== published.get(id)) {
      problems.push(`${id}: README ${version}, published Git ${published.get(id)}.`);
    }
  }
  for (const id of published.keys()) {
    if (!documented.has(id)) problems.push(`${id}: missing README row.`);
  }
  return { checked: published.size, problems };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const [reportPath, readmePath = fileURLToPath(new URL('../README.md', import.meta.url))] = process.argv.slice(2);
    if (!reportPath) throw new Error('Usage: node scripts/check-documented-versions.mjs <studio-report.json> [README.md]');
    const report = JSON.parse(readFileSync(reportPath, 'utf8'));
    const result = checkDocumentedVersions(readFileSync(readmePath, 'utf8'), report);
    if (result.problems.length) {
      console.error(result.problems.join('\n'));
      process.exitCode = 1;
    } else {
      console.log(`${result.checked} README versions match the observed published Git manifests.`);
    }
  } catch (error) {
    console.error(error.message);
    process.exitCode = 2;
  }
}
