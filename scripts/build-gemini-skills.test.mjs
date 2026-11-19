import assert from 'node:assert/strict';
import test from 'node:test';
import {mkdtempSync, mkdirSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join, dirname, extname} from 'node:path';
import {parseFrontmatter, kebab, collectPackages, buildOutputs, validateOutputs, ALLOWED_UPLOAD_EXT, HUB_NAME} from './build-gemini-skills.mjs';

function fixture() {
  const base = mkdtempSync(join(tmpdir(), 'gemini-skills-'));
  const put = (rel, content) => { const f = join(base, rel); mkdirSync(dirname(f), {recursive: true}); writeFileSync(f, content); };
  put('.agents/plugins/marketplace.json', JSON.stringify({name: 'x', plugins: [{name: 'demo-plugin', version: '1.2.3'}]}));
  put('plugins/demo-plugin/.codex-plugin/plugin.json', JSON.stringify({name: 'demo-plugin', version: '1.2.3', description: 'Demo | plugin', interface: {displayName: 'Demo'}}));
  put('plugins/demo-plugin/scripts/run.ps1', 'Write-Host "```hi```"\r\n');
  put('plugins/demo-plugin/assets/icon.png', Buffer.from([0x89, 0x50, 0x00, 0x01]));
  put('plugins/demo-plugin/skills/do-thing/SKILL.md', '---\nname: do-thing\ndescription: >\n  Does the\n  thing.\n---\n\n# Do thing\n\nSteps.\n');
  put('plugins/demo-plugin/skills/do-thing/references/notes.md', '# Notes\n\nDetail.\n');
  put('plugins/demo-plugin/skills/do-thing/scripts/helper.mjs', 'console.log(1);\n');
  return base;
}

test('parses quoted and folded frontmatter', () => {
  assert.deepEqual(parseFrontmatter('---\nname: a\ndescription: "say \\"hi\\""\n---\nbody').meta, {name: 'a', description: 'say "hi"'});
  assert.equal(parseFrontmatter('---\ndescription: >\n  one\n  two\n---\n').meta.description, 'one two');
  assert.equal(kebab('Code Review!'), 'code-review');
});

test('builds upload-ready folders with embedded sources', () => {
  const files = buildOutputs(collectPackages(fixture()));
  assert.deepEqual(validateOutputs(files), []);
  for (const key of files.keys()) assert.ok(ALLOWED_UPLOAD_EXT.has(extname(key)), key);

  const skill = files.get('demo-plugin/SKILL.md');
  assert.match(skill, /^---\nname: demo-plugin\ndescription: "Demo: Demo \| plugin/);
  assert.match(skill, /references\/do-thing\.md/);

  const ref = files.get('demo-plugin/references/do-thing.md');
  assert.match(ref, /> Does the thing\./);
  assert.match(ref, /File: `references\/notes\.md`/);
  assert.match(ref, /```javascript\nconsole\.log\(1\);/);

  const pluginLevel = [...files.keys()].filter(k => k.startsWith('demo-plugin/references/_plugin'));
  const text = pluginLevel.map(k => files.get(k)).join('\n');
  assert.match(text, /````powershell\nWrite-Host "```hi```"\n````/, 'longer fence protects embedded backticks');
  assert.match(text, /assets\/icon\.png` \(binary asset, not embedded\)/);

  assert.match(files.get(`${HUB_NAME}/SKILL.md`), /1 plugins, 1 skills/);
  assert.match(files.get(`${HUB_NAME}/references/catalog.csv`), /^plugin,plugin_version,skill/);
});

test('rejects folders Gemini cannot load', () => {
  const problems = validateOutputs(new Map([['Bad_Name/SKILL.md', '---\nname: other\n---\n'], ['ok/run.ps1', '']]));
  assert.ok(problems.some(p => p.includes('not kebab-case')));
  assert.ok(problems.some(p => p.includes('does not match folder')));
  assert.ok(problems.some(p => p.includes('ok: missing SKILL.md')));
  assert.ok(problems.some(p => p.includes('not accepted by Gemini upload')));
});
