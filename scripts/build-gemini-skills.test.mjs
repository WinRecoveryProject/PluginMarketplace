import assert from 'node:assert/strict';
import test from 'node:test';
import {mkdtempSync, mkdirSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join, dirname, extname} from 'node:path';
import {parseFrontmatter, kebab, rewriteLinks, slug, describeSource, demoteHeadings, unsafeOutputDir, collectPackages, buildOutputs, validateOutputs, ALLOWED_UPLOAD_EXT, HUB_NAME} from './build-gemini-skills.mjs';

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
  put('plugins/demo-plugin/skills/other/SKILL.md', '---\nname: other\ndescription: Other.\n---\n\nSee [do thing](../do-thing/SKILL.md#steps), [notes](../do-thing/references/notes.md), [policy](../../references/policy.md), [web](https://example.com) and [missing](../nope.md).\n\n```md\n[kept](../do-thing/SKILL.md)\n```\n');
  put('plugins/demo-plugin/references/policy.md', '# Policy\n');
  put('plugins/demo-plugin/skills/other/fixtures/sample/skills/fake/SKILL.md', '---\nname: fake\ndescription: Fixture.\n---\n');
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

  assert.match(files.get(`${HUB_NAME}/SKILL.md`), /1 plugins, 2 skills/);
  assert.match(files.get(`${HUB_NAME}/references/catalog.csv`), /^plugin,plugin_version,installed_version,installs_from,skill/);
});

test('rejects folders Gemini cannot load', () => {
  const problems = validateOutputs(new Map([['Bad_Name/SKILL.md', '---\nname: other\n---\n'], ['ok/run.ps1', '']]));
  assert.ok(problems.some(p => p.includes('not kebab-case')));
  assert.ok(problems.some(p => p.includes('does not match folder')));
  assert.ok(problems.some(p => p.includes('ok: missing SKILL.md')));
  assert.ok(problems.some(p => p.includes('not accepted by Gemini upload')));
});

test('only <skills root>/<name>/SKILL.md are skills; nested fixtures stay supporting files', () => {
  const [pkg] = collectPackages(fixture());
  assert.deepEqual(pkg.skills.map(s => s.name).sort(), ['do-thing', 'other']);
  const other = buildOutputs([pkg]).get('demo-plugin/references/other.md');
  assert.match(other, /File: `fixtures\/sample\/skills\/fake\/SKILL\.md`/);
});

test('rewrites relative links to exported references, leaving code, URLs and unknown targets alone', () => {
  const other = buildOutputs(collectPackages(fixture())).get('demo-plugin/references/other.md');
  assert.match(other, /\[do thing\]\(do-thing\.md#steps\)/);
  assert.match(other, new RegExp('\\[notes\\]\\(do-thing\\.md#' + slug('File: `references/notes.md`') + '\\)'));
  assert.match(other, /\[policy\]\(_plugin-references\.md#file-referencespolicymd\)/);
  assert.match(other, /\[web\]\(https:\/\/example\.com\)/);
  assert.match(other, /\[missing\]\(\.\.\/nope\.md\)/);
  assert.match(other, /\[kept\]\(\.\.\/do-thing\/SKILL\.md\)/);
  assert.equal(rewriteLinks('[a](b.md)', '/x/y.md', null), '[a](b.md)');
});

test('marks plugins the Marketplace installs from upstream', () => {
  assert.deepEqual(describeSource('./plugins/x', 'x'), {kind: 'local', label: 'plugins/x'});
  assert.deepEqual(describeSource({source: 'git-subdir', url: 'https://github.com/o/r.git', path: 'plugins/x'}, 'x'),
    {kind: 'upstream', label: 'https://github.com/o/r (plugins/x)'});
});

test('heading demotion leaves fenced templates untouched', () => {
  const md = '# Title\n\n```markdown\n# Plan header\n### Task\n```\n\n## After';
  assert.equal(demoteHeadings(md, 2), '### Title\n\n```markdown\n# Plan header\n### Task\n```\n\n#### After');
});

test('--out refuses the repository, its inputs and foreign folders', () => {
  const base = fixture();
  assert.ok(unsafeOutputDir(base, base));
  assert.ok(unsafeOutputDir(dirname(base), base));
  assert.ok(unsafeOutputDir(join(base, 'plugins'), base));
  assert.equal(unsafeOutputDir(join(base, 'gemini', 'skills'), base), null);
  const outside = mkdtempSync(join(tmpdir(), 'gemini-out-'));
  assert.equal(unsafeOutputDir(outside, base), null);
  writeFileSync(join(outside, 'notes.txt'), 'keep');
  assert.ok(unsafeOutputDir(outside, base));
});

test('each plugin gets a source path index for bare path references', () => {
  const files = buildOutputs(collectPackages(fixture()));
  const index = files.get('demo-plugin/references/_index.md');
  assert.match(index, /\| `references\/policy\.md` \| `references\/_plugin-references\.md#file-referencespolicymd` \|/);
  assert.match(index, /\| `skills\/do-thing\/references\/notes\.md` \| `references\/do-thing\.md#/);
  assert.match(files.get('demo-plugin/SKILL.md'), /references\/_index\.md/);
});
